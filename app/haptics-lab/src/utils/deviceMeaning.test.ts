// Unit tests for the Device tab's generated sentences and rows
//
// (c) Copyright 2026 Liminal HQ, Scott Morris
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import type { Capabilities } from '@liminal-hq/plugin-haptics';
import { capabilityRows, meanings, primitiveBars, primitiveFootnote } from './deviceMeaning';

const none = { supported: false, durationMs: null };

const pixel: Capabilities = {
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
	effects: { click: 'yes', double_click: 'yes', tick: 'yes', heavy_click: 'unknown' },
	envelopeSupported: false,
	resonantHz: 146.5,
	touchFeedbackEnabled: true,
	limits: { maxDurationMs: 10000, maxAmplitude: 255, allowRepeatingWaveforms: false },
	device: { manufacturer: 'Google', model: 'Pixel 8 Pro', release: '17' },
};

describe('meanings', () => {
	it('explains an Android 16+ phone without envelope hardware', () => {
		const m = meanings(pixel);
		expect(m[0].tone).toBe('info');
		expect(m[0].text).toBe(
			'Android 17 supports envelopes, but this actuator does not. Patterns compile down to tier 3.',
		);
		expect(m).toHaveLength(1);
	});

	it('says envelopes play natively at tier 4', () => {
		expect(meanings({ ...pixel, topTier: 4, envelopeSupported: true })[0].tone).toBe('ok');
	});

	it('names the OS when the SDK is below 36', () => {
		const old = { ...pixel, sdkInt: 33, device: { ...pixel.device, release: '13' } };
		expect(meanings(old)[0].text).toBe(
			'No envelopes on Android 13. Patterns compile down to tier 3.',
		);
	});

	it('lists missing primitives and what happens to their events', () => {
		const caps = { ...pixel, primitives: { ...pixel.primitives, low_tick: none, spin: none } };
		const warn = meanings(caps).find((x) => x.tone === 'warn');
		expect(warn?.text).toBe(
			'low_tick and spin are missing. Events that want them use the nearest neighbour, or drop to tier 2 alone.',
		);
	});

	it('warns about missing amplitude control and a disabled touch setting', () => {
		const texts = meanings({
			...pixel,
			hasAmplitudeControl: false,
			touchFeedbackEnabled: false,
		}).map((x) => x.text);
		expect(texts.some((t) => t.startsWith('No amplitude control'))).toBe(true);
		expect(texts.some((t) => t.startsWith('System touch feedback is off'))).toBe(true);
	});

	it('explains tier 0', () => {
		const m = meanings({ ...pixel, hasVibrator: false, topTier: 0 });
		expect(m).toHaveLength(1);
		expect(m[0].tone).toBe('off');
	});
});

describe('capabilityRows', () => {
	const rows = (caps = pixel) => Object.fromEntries(capabilityRows(caps).map((r) => [r.label, r]));

	it('shows the OS, API level and the Android API behind each row', () => {
		expect(rows().Android.value).toBe('Android 17 · API 37');
		expect(rows()['Envelope effects'].api).toBe('areEnvelopeEffectsSupported()');
	});

	it('reports what is missing in words', () => {
		expect(rows()['Envelope effects'].value).toBe('Not on this actuator');
		expect(rows({ ...pixel, sdkInt: 33 })['Envelope effects'].value).toBe('Needs API 36');
		expect(rows()['Q factor'].value).toBe('Not reported');
		expect(rows()['Resonant frequency'].value).toBe('146.5 Hz');
	});

	it('counts confirmed predefined effects', () => {
		expect(rows()['Predefined effects'].value).toBe('3 of 4 confirmed');
	});

	it('flags a disabled touch setting', () => {
		const r = rows({ ...pixel, touchFeedbackEnabled: false })['Touch feedback'];
		expect(r.value).toBe('Off');
		expect(r.tone).toBe('warn');
		expect(rows({ ...pixel, touchFeedbackEnabled: null })['Touch feedback'].value).toBe('Unknown');
	});

	it('describes a device with the envelope profile', () => {
		const caps: Capabilities = {
			...pixel,
			topTier: 4,
			envelopeSupported: true,
			envelopeInfo: {
				maxSize: 16,
				minControlPointDurationMs: 20,
				maxControlPointDurationMs: 1000,
				maxDurationMs: 5000,
				frequencyProfile: { minHz: 60, maxHz: 300 },
			},
		};
		expect(rows(caps)['Envelope effects'].value).toBe('16 pts · 20–1000 ms');
		expect(rows(caps)['Frequency profile'].value).toBe('60–300 Hz');
	});
});

describe('primitiveBars', () => {
	it('scales bars by measured duration and leaves missing primitives empty', () => {
		const caps = { ...pixel, primitives: { ...pixel.primitives, spin: none } };
		const bars = Object.fromEntries(primitiveBars(caps).map((b) => [b.id, b]));
		expect(bars.slow_rise.value).toBe('150 ms');
		expect(bars.slow_rise.width).toBeCloseTo(93.75);
		expect(bars.spin).toMatchObject({ value: '—', width: 0, supported: false });
	});

	it('picks the footnote from the tier', () => {
		expect(primitiveFootnote(pixel)).toContain('getPrimitiveDurations');
		expect(primitiveFootnote({ ...pixel, topTier: 2 })).toContain('built-in duration table');
	});
});
