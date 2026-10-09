// Bench pattern editing: pure helpers for building, editing and describing a pattern
//
// (c) Copyright 2026 Liminal HQ, Scott Morris
// SPDX-License-Identifier: Apache-2.0

import { PATTERN_FORMAT, pickPrimitive, resolvePrimitive } from '@liminal-hq/plugin-haptics';
import type {
	Capabilities,
	CurvePoint,
	HapticsUsage,
	Pattern,
	PatternEvent,
	Policy,
	PrimitiveId,
} from '@liminal-hq/plugin-haptics';

export type BenchState = {
	name: string;
	events: PatternEvent[];
	usage: HapticsUsage;
	policy: Policy;
};

const curve = (a: number, b: number, c: number): CurvePoint[] => [
	{ t: 0, v: a },
	{ t: 0.5, v: b },
	{ t: 1, v: c },
];

/** The "Hurt" cue: a hard transient followed by a falling hum. */
export const DEFAULT_BENCH: BenchState = {
	name: 'Hurt',
	usage: 'media',
	policy: 'interrupt',
	events: [
		{ type: 'transient', at: 0, intensity: 1, sharpness: 0.6 },
		{ type: 'continuous', at: 20, duration: 120, intensity: curve(0.9, 0.45, 0), sharpness: 0.1 },
	],
};

export function buildPattern(state: BenchState): Pattern {
	return {
		format: PATTERN_FORMAT,
		id: state.name.trim() || 'bench',
		usage: state.usage,
		policy: state.policy,
		events: state.events,
	};
}

export function eventEnd(ev: PatternEvent): number {
	return ev.type === 'continuous' ? ev.at + ev.duration : ev.at;
}

export function patternLength(events: PatternEvent[]): number {
	return events.reduce((m, ev) => Math.max(m, eventEnd(ev)), 0);
}

export function addTransient(events: PatternEvent[]): PatternEvent[] {
	const at = events.length ? patternLength(events) + 40 : 0;
	return [...events, { type: 'transient', at, intensity: 0.7, sharpness: 0.7 }];
}

export function addHum(events: PatternEvent[]): PatternEvent[] {
	const at = events.length ? patternLength(events) + 40 : 0;
	return [
		...events,
		{ type: 'continuous', at, duration: 120, intensity: curve(0.2, 0.7, 0.2), sharpness: 0.5 },
	];
}

export function duplicateEvent(events: PatternEvent[], i: number): PatternEvent[] {
	const ev = events[i];
	if (!ev) return events;
	const copy = structuredClone(ev);
	copy.at = eventEnd(ev) + 40;
	return [...events.slice(0, i + 1), copy, ...events.slice(i + 1)];
}

/** Removes an event, always leaving at least one so the pattern stays valid. */
export function deleteEvent(events: PatternEvent[], i: number): PatternEvent[] {
	return events.length <= 1 ? events : events.filter((_, k) => k !== i);
}

export function updateEvent(
	events: PatternEvent[],
	i: number,
	patch: Partial<{ at: number; intensity: number; sharpness: number; duration: number }>,
): PatternEvent[] {
	return events.map((ev, k) => {
		if (k !== i) return ev;
		if (ev.type === 'transient') {
			return {
				...ev,
				at: patch.at ?? ev.at,
				intensity: patch.intensity ?? ev.intensity,
				sharpness: patch.sharpness ?? ev.sharpness,
			};
		}
		return {
			...ev,
			at: patch.at ?? ev.at,
			duration: patch.duration ?? ev.duration,
			// A flat sharpness is edited as a single value; a curve keeps its shape.
			sharpness: patch.sharpness ?? ev.sharpness,
		};
	});
}

/** A continuous event's intensity as three editable points (start, middle, end). */
export function curvePoints(ev: PatternEvent): [number, number, number] | null {
	if (ev.type !== 'continuous') return null;
	if (typeof ev.intensity === 'number') return [ev.intensity, ev.intensity, ev.intensity];
	const at = (t: number) => {
		const pts = ev.intensity as CurvePoint[];
		for (let k = 1; k < pts.length; k++) {
			if (t <= pts[k].t) {
				const a = pts[k - 1];
				const b = pts[k];
				return a.v + (b.v - a.v) * ((t - a.t) / (b.t - a.t || 1));
			}
		}
		return pts[pts.length - 1].v;
	};
	return [at(0), at(0.5), at(1)];
}

export function setCurvePoint(
	events: PatternEvent[],
	i: number,
	point: 0 | 1 | 2,
	v: number,
): PatternEvent[] {
	return events.map((ev, k) => {
		if (k !== i || ev.type !== 'continuous') return ev;
		const pts = curvePoints(ev) ?? [0, 0, 0];
		const next = [...pts] as [number, number, number];
		next[point] = v;
		return { ...ev, intensity: curve(next[0], next[1], next[2]) };
	});
}

/** The mean sharpness of an event, whether it is flat or a curve. */
export function sharpnessOf(ev: PatternEvent): number {
	if (typeof ev.sharpness === 'number') return ev.sharpness;
	return ev.sharpness.reduce((s, p) => s + p.v, 0) / ev.sharpness.length;
}

export type MapsTo = { primitive: PrimitiveId; playsAs: PrimitiveId | null; text: string };

/** "Maps to" hint under an event: the primitive tier 3 would pick and what plays if it is missing. */
export function mapsTo(caps: Capabilities | null, ev: PatternEvent): MapsTo {
	const primitive = pickPrimitive(ev);
	if (!caps || caps.primitives[primitive]?.supported) {
		return { primitive, playsAs: primitive, text: `Maps to ${primitive} at tier 3` };
	}
	const resolved = resolvePrimitive(caps, primitive);
	return resolved
		? {
				primitive,
				playsAs: resolved.id,
				text: `Maps to ${primitive}, missing here, so ${resolved.id} plays`,
			}
		: {
				primitive,
				playsAs: null,
				text: `Maps to ${primitive}, missing here with no neighbour, so this event drops to tier 2`,
			};
}

// ── policy ────────────────────────────────────────────────────────────────────────────────────

export type PolicyChoice = 'interrupt' | 'queue' | 'drop-if-busy' | 'coalesce';

export const POLICY_CHOICES: { id: PolicyChoice; label: string }[] = [
	{ id: 'interrupt', label: 'Interrupt' },
	{ id: 'queue', label: 'Queue' },
	{ id: 'drop-if-busy', label: 'Drop if busy' },
	{ id: 'coalesce', label: 'Coalesce' },
];

export const DEFAULT_COALESCE_MS = 40;

export function policyChoice(policy: Policy): PolicyChoice {
	return typeof policy === 'string' ? policy : 'coalesce';
}

export function policyFromChoice(choice: PolicyChoice, coalesceMs = DEFAULT_COALESCE_MS): Policy {
	return choice === 'coalesce' ? { coalesce: coalesceMs } : choice;
}

export function policyLabel(policy: Policy): string {
	return typeof policy === 'string' ? policy : `coalesce ${policy.coalesce} ms`;
}

/** A short summary of a pattern's events for lists, such as "1 transient + 1 hum". */
export function eventSummary(events: PatternEvent[]): string {
	const transients = events.filter((e) => e.type === 'transient').length;
	const hums = events.length - transients;
	const parts = [];
	if (transients) parts.push(`${transients} transient${transients > 1 ? 's' : ''}`);
	if (hums) parts.push(`${hums} hum${hums > 1 ? 's' : ''}`);
	return parts.join(' + ');
}

export function exportJson(state: BenchState): string {
	return JSON.stringify(buildPattern(state), null, 2);
}
