// Unit and golden tests for the pattern compiler
//
// (c) Copyright 2026 Liminal HQ, Scott Morris
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import { compilePattern } from './compile';
import {
	fixtures,
	envelopeDevice,
	midRange,
	onOffOnly,
	pixel8Pro,
	desktop,
} from './__fixtures__/capabilities';
import { seedCues } from './__fixtures__/cues';
import { PATTERN_FORMAT } from './types';
import type { Pattern } from './types';
import type { Tier } from '../types';

const tiers: Tier[] = [4, 3, 2, 1, 0];

describe('golden reports', () => {
	for (const [cueName, pattern] of Object.entries(seedCues)) {
		for (const [deviceName, caps] of Object.entries(fixtures)) {
			for (const tier of tiers) {
				if (tier > caps.topTier) continue;
				it(`${cueName} on ${deviceName} at tier ${tier}`, () => {
					expect(compilePattern(pattern, caps, { tier })).toMatchSnapshot();
				});
			}
		}
	}
});

const click: Pattern = {
	format: PATTERN_FORMAT,
	events: [{ type: 'transient', at: 0, intensity: 0.8, sharpness: 0.8 }],
};

describe('target tier', () => {
	it('never exceeds the device top tier', () => {
		expect(compilePattern(click, pixel8Pro, { tier: 4 }).tier).toBe(3);
		expect(compilePattern(click, envelopeDevice).tier).toBe(4);
	});

	it('honours the requested and app-wide tier caps', () => {
		expect(compilePattern(click, envelopeDevice, { tier: 2 }).tier).toBe(2);
		expect(compilePattern(click, envelopeDevice, { maxTier: 1 }).tier).toBe(1);
		expect(compilePattern(click, envelopeDevice, { maxTier: null }).tier).toBe(4);
	});

	it('is deterministic', () => {
		const a = compilePattern(seedCues.hurt, midRange, { scale: 0.7 });
		const b = compilePattern(seedCues.hurt, midRange, { scale: 0.7 });
		expect(a).toEqual(b);
	});

	it('resolves at tier 0 with no steps on a device with no vibrator', () => {
		const r = compilePattern(click, desktop);
		expect(r.tier).toBe(0);
		expect(r.steps).toEqual([]);
		expect(r.request).toBeNull();
		expect(r.estimatedMs).toBe(0);
		expect(r.notes[0]).toContain('No vibrator');
	});
});

describe('tier 3 primitives', () => {
	it('picks click for a sharp, strong transient', () => {
		const r = compilePattern(click, pixel8Pro);
		expect(r.request?.effect).toEqual({
			type: 'composition',
			steps: [{ kind: 'primitive', primitive: 'click', scale: 0.8, delayMs: 0 }],
		});
	});

	it('maps the sharpness and intensity corners to tick, low_tick and thud', () => {
		const pick = (intensity: number, sharpness: number) => {
			const p: Pattern = {
				format: PATTERN_FORMAT,
				events: [{ type: 'transient', at: 0, intensity, sharpness }],
			};
			const effect = compilePattern(p, pixel8Pro).request?.effect;
			return effect?.type === 'composition' ? effect.steps[0] : null;
		};
		expect(pick(0.2, 0.9)).toMatchObject({ primitive: 'tick' });
		expect(pick(0.2, 0.2)).toMatchObject({ primitive: 'low_tick' });
		expect(pick(0.9, 0.2)).toMatchObject({ primitive: 'thud' });
		expect(pick(0.9, 0.5)).toMatchObject({ primitive: 'click' });
	});

	it('uses quick_rise, slow_rise and spin for continuous events', () => {
		const hum = (duration: number, a: number, b: number): Pattern => ({
			format: PATTERN_FORMAT,
			events: [
				{
					type: 'continuous',
					at: 0,
					duration,
					intensity: [
						{ t: 0, v: a },
						{ t: 1, v: b },
					],
					sharpness: 0.5,
				},
			],
		});
		const first = (p: Pattern) => {
			const effect = compilePattern(p, pixel8Pro).request?.effect;
			return effect?.type === 'composition'
				? effect.steps[0].kind === 'primitive' && effect.steps[0].primitive
				: null;
		};
		expect(first(hum(100, 0.1, 0.9))).toBe('quick_rise');
		expect(first(hum(300, 0.1, 0.9))).toBe('slow_rise');
		expect(first(hum(300, 0.9, 0.1))).toBe('spin');
		expect(first(hum(300, 0.5, 0.52))).toBe('spin');
	});

	it('swaps a missing primitive for its neighbour and says so', () => {
		const lowTick: Pattern = {
			format: PATTERN_FORMAT,
			events: [{ type: 'transient', at: 0, intensity: 0.2, sharpness: 0.2 }],
		};
		const r = compilePattern(lowTick, midRange);
		expect(r.notes).toContain('low_tick missing on this motor → tick');
		expect(r.mixed).toBe(false);
		expect(r.request?.effect).toMatchObject({ steps: [{ primitive: 'tick' }] });
	});

	it('steps one event to tier 2 when no neighbour exists, and schedules a step list', () => {
		// spin has only quick_rise as a neighbour; remove it too.
		const caps = {
			...midRange,
			primitives: { ...midRange.primitives, quick_rise: { supported: false, durationMs: null } },
		};
		const mixed: Pattern = {
			format: PATTERN_FORMAT,
			events: [
				{ type: 'transient', at: 0, intensity: 0.8, sharpness: 0.8 },
				{ type: 'continuous', at: 100, duration: 120, intensity: 0.6, sharpness: 0.5 },
			],
		};
		const r = compilePattern(mixed, caps);
		expect(r.tier).toBe(3);
		expect(r.mixed).toBe(true);
		expect(r.request).toBeNull();
		expect(r.steps).toHaveLength(2);
		expect(r.steps[1].atMs).toBe(100);
		expect(r.steps[1].request.effect.type).toBe('waveform');
		expect(r.notes.some((n) => n.startsWith('No spin or neighbour'))).toBe(true);
	});

	it('uses measured primitive durations to keep delays on the beat', () => {
		const two: Pattern = {
			format: PATTERN_FORMAT,
			events: [
				{ type: 'transient', at: 0, intensity: 0.8, sharpness: 0.8 },
				{ type: 'transient', at: 100, intensity: 0.8, sharpness: 0.8 },
			],
		};
		const effect = compilePattern(two, pixel8Pro).request?.effect;
		expect(effect).toMatchObject({ steps: [{ delayMs: 0 }, { delayMs: 85 }] });
	});

	it('applies the effective scale', () => {
		const effect = compilePattern(click, pixel8Pro, { scale: 0.5 }).request?.effect;
		expect(effect).toMatchObject({ steps: [{ scale: 0.4 }] });
	});
});

describe('tier 2 and tier 1', () => {
	it('emits one waveform with a ceiling-scaled one-shot per transient', () => {
		const r = compilePattern(click, pixel8Pro, { tier: 2 });
		expect(r.request?.effect).toEqual({
			type: 'waveform',
			timingsMs: [0, 15],
			amplitudes: [0, 160],
			repeat: -1,
		});
	});

	it('clamps amplitudes to the plugin limit', () => {
		const caps = { ...pixel8Pro, limits: { ...pixel8Pro.limits, maxAmplitude: 100 } };
		const effect = compilePattern(click, caps, { tier: 2 }).request?.effect;
		expect(effect).toMatchObject({ amplitudes: [0, 100] });
	});

	it('truncates to the plugin duration cap and says so', () => {
		const long: Pattern = {
			format: PATTERN_FORMAT,
			events: [{ type: 'continuous', at: 0, duration: 400, intensity: 0.5, sharpness: 0.5 }],
		};
		const caps = { ...pixel8Pro, limits: { ...pixel8Pro.limits, maxDurationMs: 100 } };
		const r = compilePattern(long, caps, { tier: 2 });
		expect(r.estimatedMs).toBeLessThanOrEqual(100);
		expect(r.notes).toContain('Truncated to 100 ms');
	});

	it('samples a curve and merges neighbouring amplitudes', () => {
		const flat: Pattern = {
			format: PATTERN_FORMAT,
			events: [{ type: 'continuous', at: 0, duration: 100, intensity: 0.5, sharpness: 0.8 }],
		};
		const effect = compilePattern(flat, pixel8Pro, { tier: 2 }).request?.effect;
		expect(effect).toEqual({
			type: 'waveform',
			timingsMs: [0, 100],
			amplitudes: [0, 128],
			repeat: -1,
		});
	});

	it('duty-cycles at tier 1 and drops quiet segments', () => {
		const quiet: Pattern = {
			format: PATTERN_FORMAT,
			events: [
				{ type: 'transient', at: 0, intensity: 0.1, sharpness: 0.8 },
				{ type: 'continuous', at: 50, duration: 60, intensity: 1, sharpness: 0.8 },
			],
		};
		const r = compilePattern(quiet, onOffOnly);
		expect(r.tier).toBe(1);
		expect(r.notes).toContain('1 quiet segment under amplitude 40 dropped');
		const effect = r.request?.effect;
		expect(effect?.type === 'waveform' && effect.amplitudes).toBeFalsy();
		expect(effect?.type === 'waveform' && effect.timingsMs.length).toBeGreaterThan(2);
	});
});

describe('tier 4 envelope', () => {
	it('builds control points within the device limits and ends at zero', () => {
		const r = compilePattern(seedCues.hurt, envelopeDevice);
		expect(r.tier).toBe(4);
		const effect = r.request?.effect;
		if (effect?.type !== 'envelopeWaveform') throw new Error('expected an envelope');
		expect(effect.controlPoints.length).toBeLessThanOrEqual(16);
		for (const p of effect.controlPoints) {
			expect(p.amplitude).toBeGreaterThanOrEqual(0);
			expect(p.amplitude).toBeLessThanOrEqual(1);
			expect(p.frequencyHz).toBeGreaterThanOrEqual(60);
			expect(p.frequencyHz).toBeLessThanOrEqual(300);
			expect(p.durationMs).toBeGreaterThanOrEqual(20);
			expect(p.durationMs).toBeLessThanOrEqual(1000);
		}
		expect(effect.controlPoints[effect.controlPoints.length - 1].amplitude).toBe(0);
	});

	it('maps sharpness linearly onto the frequency profile', () => {
		const sharp: Pattern = {
			format: PATTERN_FORMAT,
			events: [{ type: 'transient', at: 0, intensity: 1, sharpness: 1 }],
		};
		const effect = compilePattern(sharp, envelopeDevice).request?.effect;
		expect(effect).toMatchObject({ initialFrequencyHz: 300 });
	});

	it('falls back to resonance ± 40 Hz without a frequency profile', () => {
		const caps = {
			...envelopeDevice,
			envelopeInfo: { ...envelopeDevice.envelopeInfo!, frequencyProfile: undefined },
		};
		const sharp: Pattern = {
			format: PATTERN_FORMAT,
			events: [{ type: 'transient', at: 0, intensity: 1, sharpness: 1 }],
		};
		expect(compilePattern(sharp, caps).request?.effect).toMatchObject({ initialFrequencyHz: 200 });
	});

	it('compiles at tier 3 with a note when there are too many control points', () => {
		const busy: Pattern = {
			format: PATTERN_FORMAT,
			events: Array.from({ length: 12 }, (_, i) => ({
				type: 'transient' as const,
				at: i * 100,
				intensity: 0.8,
				sharpness: 0.8,
			})),
		};
		const r = compilePattern(busy, envelopeDevice);
		expect(r.tier).toBe(3);
		expect(r.notes[0]).toContain('over the device limit of 16');
	});

	it('compiles at tier 3 with a note when the envelope runs too long', () => {
		const long: Pattern = {
			format: PATTERN_FORMAT,
			events: [{ type: 'continuous', at: 0, duration: 6000, intensity: 0.5, sharpness: 0.5 }],
		};
		const r = compilePattern(long, envelopeDevice);
		expect(r.tier).toBe(3);
		expect(r.notes[0]).toContain('over the envelope limit of 5000 ms');
	});
});

describe('request details', () => {
	it('defaults the usage to media and carries the pattern id', () => {
		const r = compilePattern({ ...click, id: 'jump' }, pixel8Pro);
		expect(r.request).toMatchObject({ id: 'jump', usage: 'media' });
		expect(r.id).toBe('jump');
	});

	it('lets the call override usage and respectSystemSettings', () => {
		const r = compilePattern(click, pixel8Pro, { usage: 'touch', respectSystemSettings: false });
		expect(r.request).toMatchObject({ usage: 'touch', respectSystemSettings: false });
	});

	it('sorts events by time', () => {
		const out: Pattern = {
			format: PATTERN_FORMAT,
			events: [
				{ type: 'transient', at: 100, intensity: 0.8, sharpness: 0.8 },
				{ type: 'transient', at: 0, intensity: 0.8, sharpness: 0.8 },
			],
		};
		const effect = compilePattern(out, pixel8Pro).request?.effect;
		expect(effect).toMatchObject({ steps: [{ delayMs: 0 }, { delayMs: 85 }] });
	});
});
