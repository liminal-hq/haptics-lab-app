// Unit tests for the Compare tab helpers
//
// (c) Copyright 2026 Liminal HQ, Scott Morris
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import type { Capabilities, Pattern } from '@liminal-hq/plugin-haptics';
import {
	RUNGS,
	ladderPrimitives,
	simulatePolicy,
	strengthCaveat,
	strengthRequest,
	sweepTiers,
	thresholdSentence,
	tierLadder,
} from './compare';

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
		low_tick: prim(null),
		click: prim(15),
		thud: prim(30),
		spin: prim(null),
		quick_rise: prim(60),
		slow_rise: prim(150),
	},
	effects: { click: 'yes', double_click: 'yes', tick: 'yes', heavy_click: 'yes' },
	envelopeSupported: false,
	touchFeedbackEnabled: true,
	limits: { maxDurationMs: 10000, maxAmplitude: 255, allowRepeatingWaveforms: false },
	device: { manufacturer: 'Test', model: 'Phone', release: '13' },
};

const pattern: Pattern = {
	format: 'haptics-lab/pattern@1',
	events: [{ type: 'transient', at: 0, intensity: 0.8, sharpness: 0.8 }],
};

describe('tierLadder', () => {
	const rows = tierLadder(pattern, caps);

	it('lists every tier from 4 down to 0', () => {
		expect(rows.map((r) => r.tier)).toEqual([4, 3, 2, 1, 0]);
	});

	it('compiles the reachable tiers and explains the others', () => {
		expect(rows[0]).toMatchObject({ tier: 4, reachable: false, report: null });
		expect(rows[0].reason).toContain('Android 16');
		expect(rows[1].report?.tier).toBe(3);
		expect(rows[2].report?.tier).toBe(2);
		expect(rows[4].report?.tier).toBe(0);
	});

	it('says why a tier is out of reach', () => {
		expect(tierLadder(pattern, { ...caps, sdkInt: 37 })[0].reason).toBe(
			'This actuator has no envelope support',
		);
		const budget = tierLadder(pattern, { ...caps, topTier: 2 });
		expect(budget[1].reason).toBe('No composition primitives on this device');
		const onOff = tierLadder(pattern, { ...caps, topTier: 1 });
		expect(onOff[2].reason).toBe('No amplitude control on this device');
		expect(tierLadder(pattern, { ...caps, topTier: 0 })[3].reason).toBe(
			'No vibrator on this device',
		);
	});

	it('sweeps from the top reachable tier down to off', () => {
		expect(sweepTiers(caps)).toEqual([3, 2, 1, 0]);
		expect(sweepTiers({ ...caps, topTier: 0 })).toEqual([0]);
	});
});

describe('strength ladder', () => {
	it('has ten rungs from 0.1 to 1.0', () => {
		expect(RUNGS).toHaveLength(10);
		expect(RUNGS[0]).toBe(0.1);
		expect(RUNGS[9]).toBe(1);
	});

	it('only offers supported primitives', () => {
		expect(ladderPrimitives(caps)).toEqual(['tick', 'click', 'thud', 'quick_rise', 'slow_rise']);
	});

	it('plays a primitive at tier 3', () => {
		expect(strengthRequest(caps, 'click', 0.5, 3)?.effect).toEqual({
			type: 'composition',
			steps: [{ kind: 'primitive', primitive: 'click', scale: 0.5 }],
		});
	});

	it('uses a ceiling-scaled one-shot at tier 2 and on-time at tier 1', () => {
		expect(strengthRequest(caps, 'click', 0.5, 2)?.effect).toEqual({
			type: 'oneshot',
			durationMs: 15,
			amplitude: 100,
		});
		expect(strengthRequest(caps, 'click', 0.5, 1)?.effect).toEqual({
			type: 'oneshot',
			durationMs: 10,
		});
		expect(strengthRequest(caps, 'click', 0.1, 1)?.effect).toEqual({
			type: 'oneshot',
			durationMs: 6,
		});
	});

	it('plays nothing at tier 0', () => {
		expect(strengthRequest(caps, 'click', 1, 0)).toBeNull();
	});

	it('explains the on/off caveat', () => {
		expect(strengthCaveat(1)).toContain('only the on-time changes');
		expect(strengthCaveat(0)).toBe('Nothing to feel at tier 0.');
		expect(strengthCaveat(3)).toBe('');
	});

	it('finds the threshold from the marked rungs', () => {
		expect(thresholdSentence({})).toBe('Mark each rung you can feel to find your threshold.');
		expect(thresholdSentence({ '0.3': true, '0.4': true })).toContain('first felt it at 0.3');
		expect(thresholdSentence({ '0.1': true })).toBe(
			'You felt the lowest rung, so this motor is sensitive at low strengths.',
		);
		const all = Object.fromEntries(RUNGS.map((r) => [String(r), true]));
		expect(thresholdSentence(all)).toContain('every rung');
	});
});

describe('simulatePolicy', () => {
	const sim = (policy: Parameters<typeof simulatePolicy>[0], count = 5, gap = 25, est = 100) =>
		simulatePolicy(policy, count, gap, est);

	it('cuts each interrupted play short by the next trigger', () => {
		const s = sim('interrupt');
		expect(s.outputs.map((o) => o.kind)).toEqual(Array(5).fill('played'));
		expect(s.outputs.filter((o) => o.cut)).toHaveLength(4);
		expect(s.outputs[0].dur).toBe(25);
		expect(s.summary).toBe('5 plays; 4 cut short by the next trigger.');
	});

	it('queues behind the previous play and drops past four waiting', () => {
		const s = sim('queue', 7, 5);
		expect(s.outputs.map((o) => o.kind)).toEqual([
			'played',
			'queued',
			'queued',
			'queued',
			'queued',
			'dropped',
			'dropped',
		]);
		expect(s.outputs[1].at).toBe(100);
		expect(s.summary).toContain('5 plays, 4 waited');
	});

	it('frees a queue slot as each queued play starts', () => {
		// 60 ms plays, a trigger every 25 ms: the queue never holds more than four at once.
		const s = sim('queue', 8, 25, 60);
		expect(s.outputs.filter((o) => o.kind === 'dropped')).toHaveLength(1);
		expect(s.outputs.map((o) => o.kind).slice(0, 6)).toEqual([
			'played',
			'queued',
			'queued',
			'queued',
			'queued',
			'queued',
		]);
	});

	it('drops triggers while the motor is busy', () => {
		const s = sim('drop-if-busy');
		expect(s.outputs.map((o) => o.kind)).toEqual([
			'played',
			'dropped',
			'dropped',
			'dropped',
			'played',
		]);
		expect(s.summary).toBe('2 played, 3 dropped while the motor was busy.');
	});

	it('merges triggers inside the window and caps the merges at three', () => {
		const s = sim({ coalesce: 100 }, 6, 10);
		expect(s.outputs.map((o) => o.kind)).toEqual([
			'played',
			'merged',
			'merged',
			'merged',
			'merged',
			'merged',
		]);
		expect(s.outputs[0].merges).toBe(3);
		expect(s.outputs[0].at).toBe(100);
		expect(s.summary).toContain('1 played, 5 merged');
	});

	it('starts a new group after the window', () => {
		const s = sim({ coalesce: 20 }, 4, 25);
		expect(s.outputs.map((o) => o.kind)).toEqual(['played', 'played', 'played', 'played']);
	});

	it('records when each trigger fires', () => {
		expect(sim('interrupt', 3, 40).triggers).toEqual([0, 40, 80]);
	});
});
