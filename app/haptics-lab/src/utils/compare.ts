// Compare tab helpers: the tier ladder, the strength ladder and the policy simulation
//
// (c) Copyright 2026 Liminal HQ, Scott Morris
// SPDX-License-Identifier: Apache-2.0

import { AMPLITUDE_CEILING, PRIMITIVE_IDS, compilePattern } from '@liminal-hq/plugin-haptics';
import type {
	Capabilities,
	CompileReport,
	EffectRequest,
	Pattern,
	Policy,
	PrimitiveId,
	Tier,
} from '@liminal-hq/plugin-haptics';
import { TIERS } from '../utils/tiers';

// ── tier ladder ───────────────────────────────────────────────────────────────────────────────

export type LadderRow = {
	tier: Tier;
	reachable: boolean;
	/** Why the tier can't play on this device, when it can't. */
	reason: string | null;
	report: CompileReport | null;
};

function unreachableReason(caps: Capabilities, tier: Tier): string | null {
	if (tier === 0 || tier <= caps.topTier) return null;
	if (tier === 4) {
		return (caps.sdkInt ?? 0) < 36
			? 'Needs Android 16 (API 36) and an actuator with envelope support'
			: 'This actuator has no envelope support';
	}
	if (tier === 3) return 'No composition primitives on this device';
	if (tier === 2) return 'No amplitude control on this device';
	return 'No vibrator on this device';
}

/** The pattern compiled at every tier from 4 down to 0; tiers above the device's carry a reason. */
export function tierLadder(pattern: Pattern, caps: Capabilities, scale = 1): LadderRow[] {
	return TIERS.map((tier) => {
		const reason = unreachableReason(caps, tier);
		return {
			tier,
			reachable: reason === null,
			reason,
			report: reason === null ? compilePattern(pattern, caps, { tier, scale }) : null,
		};
	});
}

/** The tiers a "Down the ladder" sweep plays, from the top the device reaches down to Off. */
export function sweepTiers(caps: Capabilities): Tier[] {
	return TIERS.filter((t) => t <= caps.topTier);
}

// ── strength ladder ───────────────────────────────────────────────────────────────────────────

export const RUNGS = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];

/** Primitives the device supports; the strength ladder only offers these. */
export function ladderPrimitives(caps: Capabilities): PrimitiveId[] {
	return PRIMITIVE_IDS.filter((id) => caps.primitives[id]?.supported);
}

/** The request for one rung, at the tier the device reaches: a primitive, a one-shot, or on-time. */
export function strengthRequest(
	caps: Capabilities,
	primitive: PrimitiveId,
	strength: number,
	tier: Tier,
): EffectRequest | null {
	const ms = caps.primitives[primitive]?.durationMs ?? 20;
	if (tier >= 3 && caps.primitives[primitive]?.supported) {
		return {
			usage: 'touch',
			effect: { type: 'composition', steps: [{ kind: 'primitive', primitive, scale: strength }] },
		};
	}
	if (tier === 2) {
		return {
			usage: 'touch',
			effect: {
				type: 'oneshot',
				durationMs: ms,
				amplitude: Math.max(1, Math.round(strength * AMPLITUDE_CEILING[primitive])),
			},
		};
	}
	if (tier === 1 || tier >= 3) {
		// On/off motors can't vary strength, so the rung changes how long the motor is on.
		return {
			usage: 'touch',
			effect: { type: 'oneshot', durationMs: Math.max(6, Math.round(strength * 20)) },
		};
	}
	return null;
}

export function strengthCaveat(tier: Tier): string {
	if (tier === 1) {
		return 'On/off motor: every rung plays at full strength and only the on-time changes. Thresholds here are about duration, not force.';
	}
	if (tier === 0) return 'Nothing to feel at tier 0.';
	if (tier === 2)
		return 'No primitives: each rung is a one-shot at the primitive ceiling times the strength.';
	return '';
}

/** One sentence on where the user first felt the motor, from the rungs they marked. */
export function thresholdSentence(felt: Record<string, boolean>): string {
	const marked = RUNGS.filter((r) => felt[String(r)]);
	if (marked.length === 0) return 'Mark each rung you can feel to find your threshold.';
	const first = marked[0];
	if (marked.length === RUNGS.length) {
		return 'You felt every rung from the lowest. This motor is sensitive at low strengths.';
	}
	if (first === RUNGS[0]) {
		return 'You felt the lowest rung, so this motor is sensitive at low strengths.';
	}
	return `You first felt it at ${first.toFixed(1)}. Anything below that is lost, so keep important cues above it.`;
}

// ── policy simulation ─────────────────────────────────────────────────────────────────────────

export type SimKind = 'played' | 'queued' | 'dropped' | 'merged';

export type SimOutput = { at: number; dur: number; kind: SimKind; cut?: boolean; merges?: number };

export type Simulation = {
	triggers: number[];
	outputs: SimOutput[];
	summary: string;
};

const MAX_QUEUE = 4;
const MAX_MERGES = 3;

/** Plays `count` triggers `gapMs` apart through a policy, mirroring the runtime scheduler. */
export function simulatePolicy(
	policy: Policy,
	count: number,
	gapMs: number,
	estimatedMs: number,
): Simulation {
	const est = Math.max(estimatedMs, 20);
	const triggers: number[] = [];
	const outputs: SimOutput[] = [];
	let busyUntil = 0;
	let queueEnd = 0;
	let waiting: number[] = []; // start times of triggers still waiting in the queue
	let group: SimOutput | null = null;
	let groupStart = 0; // when the first trigger of the open group arrived
	const window = typeof policy === 'object' ? policy.coalesce : 0;

	for (let i = 0; i < count; i++) {
		const t = i * gapMs;
		triggers.push(t);
		if (policy === 'interrupt') {
			const last = outputs[outputs.length - 1];
			if (last && last.at + last.dur > t) {
				last.dur = t - last.at;
				last.cut = true;
			}
			outputs.push({ at: t, dur: est, kind: 'played' });
		} else if (policy === 'queue') {
			waiting = waiting.filter((start) => start > t);
			if (t < queueEnd && waiting.length >= MAX_QUEUE) {
				outputs.push({ at: t, dur: 0, kind: 'dropped' });
				continue;
			}
			const at = Math.max(t, queueEnd);
			if (at > t) waiting.push(at);
			outputs.push({ at, dur: est, kind: at > t ? 'queued' : 'played' });
			queueEnd = at + est;
		} else if (policy === 'drop-if-busy') {
			if (t < busyUntil) {
				outputs.push({ at: t, dur: 0, kind: 'dropped' });
			} else {
				outputs.push({ at: t, dur: est, kind: 'played' });
				busyUntil = t + est;
			}
		} else if (group && t - groupStart <= window) {
			group.merges = Math.min(MAX_MERGES, (group.merges ?? 0) + 1);
			outputs.push({ at: t, dur: 0, kind: 'merged' });
		} else {
			// The runtime holds the first trigger for the window so later ones can merge into it.
			groupStart = t;
			group = { at: t + window, dur: est, kind: 'played', merges: 0 };
			outputs.push(group);
		}
	}

	return { triggers, outputs, summary: summarise(policy, outputs, count, queueEnd) };
}

function summarise(policy: Policy, outputs: SimOutput[], count: number, queueEnd: number): string {
	const n = (kind: SimKind) => outputs.filter((o) => o.kind === kind).length;
	if (policy === 'interrupt') {
		return `${count} plays; ${outputs.filter((o) => o.cut).length} cut short by the next trigger.`;
	}
	if (policy === 'queue') {
		return `${n('played') + n('queued')} plays, ${n('queued')} waited for the previous one to end (${Math.round(queueEnd)} ms total), ${n('dropped')} dropped over the limit of four.`;
	}
	if (policy === 'drop-if-busy') {
		return `${n('played')} played, ${n('dropped')} dropped while the motor was busy.`;
	}
	return `${n('played')} played, ${n('merged')} merged into a stronger hit (three merges at most, +0.15 each).`;
}
