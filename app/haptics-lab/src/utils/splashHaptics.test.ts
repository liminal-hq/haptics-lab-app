// Unit tests for the splash screen haptic pattern selection
//
// (c) Copyright 2026 Liminal HQ, Scott Morris
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import type { Capabilities } from '@liminal-hq/plugin-haptics';
import { SPLASH_LOOP_MS, splashEffect, splashEnvelope, splashWaveform } from './splashHaptics';

const baseCaps: Capabilities = {
	platform: 'android',
	sdkInt: 37,
	hasVibrator: true,
	hasAmplitudeControl: true,
	topTier: 3,
	compositionSupported: true,
	primitives: {
		tick: { supported: true, durationMs: 10 },
		low_tick: { supported: true, durationMs: 12 },
		click: { supported: true, durationMs: 15 },
		thud: { supported: true, durationMs: 30 },
		spin: { supported: true, durationMs: 90 },
		quick_rise: { supported: true, durationMs: 60 },
		slow_rise: { supported: true, durationMs: 150 },
	},
	effects: { click: 'yes', double_click: 'yes', tick: 'yes', heavy_click: 'yes' },
	envelopeSupported: false,
	touchFeedbackEnabled: true,
	limits: { maxDurationMs: 10000, maxAmplitude: 255, allowRepeatingWaveforms: false },
	device: { manufacturer: 'Google', model: 'Pixel 8 Pro', release: '17' },
};

const envelopeInfo = {
	maxSize: 16,
	minControlPointDurationMs: 10,
	maxControlPointDurationMs: 1000,
	maxDurationMs: 5000,
	frequencyProfile: { minHz: 50, maxHz: 300 },
};

describe('splash haptics', () => {
	it('shakes for 480 ms, inside one icon loop', () => {
		const wf = splashWaveform();
		expect(wf.timingsMs.reduce((a, b) => a + b, 0)).toBe(480);
		expect(wf.timingsMs.length).toBe(wf.amplitudes?.length);
		expect(480).toBeLessThan(SPLASH_LOOP_MS);
	});

	it('never repeats, so the splash stops by itself', () => {
		expect(splashWaveform().repeat).toBe(-1);
	});

	it('uses the waveform when envelopes are unsupported', () => {
		expect(splashEffect(null).type).toBe('waveform');
		expect(splashEffect(baseCaps).type).toBe('waveform');
	});

	it('uses the envelope when the device supports it and the limits fit', () => {
		const caps = { ...baseCaps, envelopeSupported: true, envelopeInfo };
		const effect = splashEffect(caps);
		expect(effect.type).toBe('envelopeWaveform');
		if (effect.type === 'envelopeWaveform') {
			expect(effect.controlPoints).toHaveLength(10);
			expect(effect.controlPoints[0].amplitude).toBe(1);
		}
	});

	it('falls back to the waveform when envelope limits are not reported', () => {
		const caps = { ...baseCaps, envelopeSupported: true };
		expect(splashEffect(caps).type).toBe('waveform');
	});

	it('falls back to the waveform when the device limits reject the envelope', () => {
		const tooShort = { ...envelopeInfo, minControlPointDurationMs: 100 };
		expect(splashEnvelope(tooShort)).toBeNull();
		const caps = { ...baseCaps, envelopeSupported: true, envelopeInfo: tooShort };
		expect(splashEffect(caps).type).toBe('waveform');
	});
});
