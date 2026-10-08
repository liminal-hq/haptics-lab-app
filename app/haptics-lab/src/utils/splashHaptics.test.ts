// Unit tests for the splash screen haptic pattern selection
//
// (c) Copyright 2026 Liminal HQ, Scott Morris
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import type { Capabilities } from '@liminal-hq/plugin-haptics';
import { SPLASH_LOOP_MS, splashEffect, splashEnvelope, splashWaveform } from './splashHaptics';

const baseCaps: Capabilities = {
	hasVibrator: true,
	hasAmplitudeControl: true,
	compositionSupported: true,
	envelopeSupported: false,
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

	it('falls back to the waveform when the device limits reject the envelope', () => {
		const tooShort = { ...envelopeInfo, minControlPointDurationMs: 100 };
		expect(splashEnvelope(tooShort)).toBeNull();
		const caps = { ...baseCaps, envelopeSupported: true, envelopeInfo: tooShort };
		expect(splashEffect(caps).type).toBe('waveform');
	});
});
