// Seed cue table: the Lieutenant Fizz cues, each a portable pattern or a UI-lane kind
//
// (c) Copyright 2026 Liminal HQ, Scott Morris
// SPDX-License-Identifier: Apache-2.0

import { PATTERN_FORMAT } from '@liminal-hq/plugin-haptics';
import type { CurvePoint, Pattern, PatternEvent, Policy, UiKind } from '@liminal-hq/plugin-haptics';

/** A row in the cue table: either a pattern, or a UI-lane kind. */
export type Cue = {
	id: string;
	name: string;
	pattern?: Pattern;
	ui?: UiKind;
	/** The policy shown for a UI row, which ignores policies. */
	uiNote?: string;
};

const curve = (a: number, b: number, c: number): CurvePoint[] => [
	{ t: 0, v: a },
	{ t: 0.5, v: b },
	{ t: 1, v: c },
];

const hit = (at: number, intensity: number, sharpness: number): PatternEvent => ({
	type: 'transient',
	at,
	intensity,
	sharpness,
});

const hum = (
	at: number,
	duration: number,
	intensity: CurvePoint[],
	sharpness: number,
): PatternEvent => ({
	type: 'continuous',
	at,
	duration,
	intensity,
	sharpness,
});

const cue = (id: string, name: string, policy: Policy, events: PatternEvent[]): Cue => ({
	id,
	name,
	pattern: { format: PATTERN_FORMAT, id, usage: 'media', policy, events },
});

export const SEED_CUES: Cue[] = [
	cue('jump', 'Jump', 'interrupt', [hit(0, 0.5, 0.7)]),
	cue('fizz-fired', 'Fizz fired', 'drop-if-busy', [hit(0, 0.35, 0.9)]),
	cue('stomp', 'Stomp', 'interrupt', [hit(0, 0.7, 0.2)]),
	cue('hurt', 'Hurt', 'interrupt', [hit(0, 1, 0.6), hum(20, 120, curve(0.9, 0.45, 0), 0.1)]),
	cue('snack', 'Snack', { coalesce: 60 }, [hit(0, 0.3, 0.9)]),
	cue('cream-soda', 'Cream soda', 'queue', [
		hit(0, 0.3, 0.6),
		hit(30, 0.5, 0.6),
		hit(60, 0.7, 0.6),
	]),
	cue('extra-life', 'Extra life', 'queue', [hum(0, 180, curve(0.3, 0.7, 0.3), 0.5)]),
	cue('level-cleared', 'Level cleared', 'interrupt', [
		hum(0, 120, curve(0.1, 0.5, 0.9), 0.5),
		hit(130, 0.8, 0.7),
	]),
	cue('boss-slam', 'Boss slam', 'interrupt', [hum(0, 220, curve(1, 0.65, 0.3), 0.05)]),
	{ id: 'menu-move', name: 'Menu move, select, back', ui: 'tick', uiNote: 'UI lane' },
	{ id: 'layout-drag', name: 'Layout pick up, drop', ui: 'drag-start', uiNote: 'UI lane' },
];
