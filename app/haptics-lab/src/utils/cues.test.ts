// Unit tests for cue import and the cue table rows
//
// (c) Copyright 2026 Liminal HQ, Scott Morris
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import { validatePattern } from '@liminal-hq/plugin-haptics';
import type { Capabilities } from '@liminal-hq/plugin-haptics';
import { cueRows, mergeCues, parseImport } from './cues';
import { SEED_CUES } from './seedCues';

const prim = (ms: number | null) => ({ supported: ms !== null, durationMs: ms });
const caps: Capabilities = {
	platform: 'android',
	sdkInt: 33,
	hasVibrator: true,
	hasAmplitudeControl: true,
	topTier: 3,
	compositionSupported: true,
	primitives: {
		tick: prim(10),
		low_tick: prim(12),
		click: prim(15),
		thud: prim(30),
		spin: prim(90),
		quick_rise: prim(60),
		slow_rise: prim(150),
	},
	effects: { click: 'yes', double_click: 'yes', tick: 'yes', heavy_click: 'yes' },
	envelopeSupported: false,
	touchFeedbackEnabled: true,
	limits: { maxDurationMs: 10000, maxAmplitude: 255, allowRepeatingWaveforms: false },
	device: { manufacturer: 'Test', model: 'Phone', release: '13' },
};

const pattern = {
	format: 'haptics-lab/pattern@1',
	events: [{ type: 'transient', at: 0, intensity: 0.5, sharpness: 0.5 }],
};

describe('seed cues', () => {
	it('has eleven rows: nine patterns and two UI-lane rows', () => {
		expect(SEED_CUES).toHaveLength(11);
		expect(SEED_CUES.filter((c) => c.ui)).toHaveLength(2);
	});

	it('are all valid patterns with unique ids', () => {
		for (const c of SEED_CUES.filter((x) => x.pattern)) {
			expect(validatePattern(c.pattern)).toEqual([]);
		}
		expect(new Set(SEED_CUES.map((c) => c.id)).size).toBe(SEED_CUES.length);
	});
});

describe('parseImport', () => {
	it('reads a single pattern, using its id', () => {
		const r = parseImport(JSON.stringify({ ...pattern, id: 'zap' }));
		expect(r.ok && r.cues.map((c) => [c.id, c.name])).toEqual([['zap', 'Zap']]);
	});

	it('names a pattern without an id "imported"', () => {
		const r = parseImport(JSON.stringify(pattern));
		expect(r.ok && r.cues[0].id).toBe('imported');
	});

	it('reads a table keyed by id and sets each pattern id from the key', () => {
		const r = parseImport(JSON.stringify({ 'big-hit': pattern, tap: pattern }));
		expect(r.ok && r.cues.map((c) => [c.id, c.name, c.pattern?.id])).toEqual([
			['big-hit', 'Big hit', 'big-hit'],
			['tap', 'Tap', 'tap'],
		]);
	});

	it('lists every problem with the id it belongs to', () => {
		const bad = {
			...pattern,
			events: [{ type: 'transient', at: 0, intensity: 2, sharpness: 0.5 }],
		};
		const r = parseImport(JSON.stringify({ ok: pattern, bad }));
		expect(r).toEqual({
			ok: false,
			errors: ['bad: events[0].intensity: 2 is above 1. Use 0..1.'],
		});
	});

	it('rejects text that is not JSON, not an object, or empty', () => {
		expect(parseImport('{nope').ok).toBe(false);
		expect(parseImport('[1,2]')).toMatchObject({ ok: false });
		expect(parseImport('{}')).toEqual({ ok: false, errors: ['No patterns found.'] });
	});

	it('applies the duration limit', () => {
		const long = {
			...pattern,
			events: [{ type: 'continuous', at: 0, duration: 5000, intensity: 1, sharpness: 1 }],
		};
		expect(parseImport(JSON.stringify(long), 1000).ok).toBe(false);
	});
});

describe('mergeCues', () => {
	it('replaces cues with the same id and keeps the rest', () => {
		const next = mergeCues(SEED_CUES, [
			{ id: 'jump', name: 'Jump v2', pattern: SEED_CUES[0].pattern },
		]);
		expect(next).toHaveLength(SEED_CUES.length);
		expect(next.find((c) => c.id === 'jump')?.name).toBe('Jump v2');
	});
});

describe('cueRows', () => {
	const rows = cueRows(SEED_CUES, caps, { maxTier: null, scale: 1 });

	it('compiles each pattern for this device', () => {
		const hurt = rows.find((r) => r.cue.id === 'hurt');
		expect(hurt?.tier).toBe(3);
		expect(hurt?.estimatedMs).toBeGreaterThan(0);
	});

	it('gives UI rows the lane tier', () => {
		const ui = rows.filter((r) => r.cue.ui);
		expect(ui.every((r) => r.tier === 3 && r.report === null)).toBe(true);
		const off = cueRows(
			SEED_CUES,
			{ ...caps, touchFeedbackEnabled: false },
			{ maxTier: null, scale: 1 },
		);
		expect(off.filter((r) => r.cue.ui).every((r) => r.tier === 0)).toBe(true);
	});

	it('respects the tier cap', () => {
		const capped = cueRows(SEED_CUES, caps, { maxTier: 2, scale: 1 });
		expect(capped.find((r) => r.cue.id === 'hurt')?.tier).toBe(2);
	});
});
