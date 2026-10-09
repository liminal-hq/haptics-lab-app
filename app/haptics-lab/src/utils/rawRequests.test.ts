// Unit tests for the Raw tab request builders and capability notes
//
// (c) Copyright 2026 Liminal HQ, Scott Morris
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import type { Capabilities } from '@liminal-hq/plugin-haptics';
import {
	DEFAULT_COMPOSITION,
	DEFAULT_WAVEFORM,
	compositionEffect,
	compositionHints,
	compositionNotes,
	envelopeNotes,
	oneShotEffect,
	oneShotNotes,
	predefinedTag,
	uiTiles,
	waveformEffect,
	waveformLength,
	waveformNotes,
} from './rawRequests';

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
	effects: { click: 'yes', double_click: 'no', tick: 'unknown', heavy_click: 'yes' },
	envelopeSupported: false,
	touchFeedbackEnabled: true,
	limits: { maxDurationMs: 1000, maxAmplitude: 255, allowRepeatingWaveforms: false },
	device: { manufacturer: 'Test', model: 'Phone', release: '13' },
};

describe('one-shot', () => {
	it('builds the payload and warns without amplitude control', () => {
		expect(oneShotEffect({ durationMs: 50, amplitude: 200 })).toEqual({
			type: 'oneshot',
			durationMs: 50,
			amplitude: 200,
		});
		expect(oneShotNotes(caps)).toEqual([]);
		expect(oneShotNotes({ ...caps, hasAmplitudeControl: false })[0].text).toContain(
			'default strength',
		);
	});
});

describe('predefined', () => {
	it('tags each effect with what the device reports', () => {
		expect(predefinedTag(caps, 'click')).toBe('Supported');
		expect(predefinedTag(caps, 'double_click')).toBe('Not supported');
		expect(predefinedTag(caps, 'tick')).toBe('Unconfirmed');
		expect(predefinedTag(null, 'click')).toBe('Unconfirmed');
	});
});

describe('waveform', () => {
	const values = { segments: DEFAULT_WAVEFORM, repeat: -1 };

	it('builds parallel timings and amplitudes', () => {
		expect(waveformEffect(values)).toEqual({
			type: 'waveform',
			timingsMs: [0, 50, 50, 100],
			amplitudes: [0, 128, 0, 255],
			repeat: -1,
		});
		expect(waveformLength(DEFAULT_WAVEFORM)).toBe(200);
	});

	it('has no notes for a plain waveform', () => {
		expect(waveformNotes(values, caps)).toEqual([]);
	});

	it('warns that a repeat will be ignored', () => {
		const text = waveformNotes({ ...values, repeat: 1 }, caps)[0].text;
		expect(text).toBe(
			'Repeat will be ignored: allowRepeatingWaveforms is false in the plugin config.',
		);
	});

	it('warns about a waveform that is too long, empty, or on a motor without amplitude control', () => {
		const long = { segments: [{ ms: 2000, amplitude: 255 }], repeat: -1 };
		expect(waveformNotes(long, caps)[0].text).toContain('cut at 1000 ms');
		expect(
			waveformNotes({ segments: [{ ms: 0, amplitude: 0 }], repeat: -1 }, caps)[0].text,
		).toContain('Every segment is 0 ms');
		expect(waveformNotes(values, { ...caps, hasAmplitudeControl: false })[0].text).toContain(
			'No amplitude control',
		);
	});
});

describe('composition', () => {
	it('builds primitive steps', () => {
		expect(compositionEffect(DEFAULT_COMPOSITION).steps[1]).toEqual({
			kind: 'primitive',
			primitive: 'thud',
			scale: 1,
			delayMs: 60,
		});
	});

	it('marks a missing primitive and names its neighbour', () => {
		const hints = compositionHints(caps, [
			{ primitive: 'click', scale: 1, delayMs: 0 },
			{ primitive: 'low_tick', scale: 1, delayMs: 0 },
			{ primitive: 'spin', scale: 1, delayMs: 0 },
		]);
		expect(hints[0]).toMatchObject({ supported: true, playsAs: 'click', text: '' });
		expect(hints[1]).toMatchObject({ supported: false, playsAs: 'tick' });
		expect(hints[1].text).toBe('low_tick is missing on this motor, so tick plays instead.');
		expect(hints[2]).toMatchObject({ supported: false, playsAs: 'quick_rise' });
	});

	it('drops a step with no neighbour', () => {
		const none = { ...caps, primitives: { ...caps.primitives, click: prim(null) } };
		const [hint] = compositionHints(none, [{ primitive: 'click', scale: 1, delayMs: 0 }]);
		expect(hint.playsAs).toBeNull();
		expect(hint.text).toContain('dropped');
	});

	it('warns when there are no primitives at all', () => {
		expect(compositionNotes({ ...caps, compositionSupported: false })).toHaveLength(1);
		expect(compositionNotes(caps)).toEqual([]);
	});
});

describe('envelope notes', () => {
	it('explains why envelopes are unavailable', () => {
		expect(envelopeNotes(caps)[0].text).toContain('Android 16 (API 36)');
		expect(envelopeNotes({ ...caps, sdkInt: 37 })[0].text).toContain(
			'This actuator has no envelope support',
		);
		expect(envelopeNotes({ ...caps, envelopeSupported: true })).toEqual([]);
	});
});

describe('uiTiles', () => {
	it('tags each kind by API level on this device', () => {
		const tags = Object.fromEntries(uiTiles(caps).map((t) => [t.kind, t.tag]));
		expect(tags.tick).toBe('Native');
		expect(tags.confirm).toBe('Native');
		expect(tags['toggle-on']).toBe('API 34 · fallback');
	});

	it('marks every tile silent when touch feedback is off or there is no vibrator', () => {
		expect(
			uiTiles({ ...caps, touchFeedbackEnabled: false }).every(
				(t) => t.silent && t.tag === 'Silent',
			),
		).toBe(true);
		expect(uiTiles({ ...caps, hasVibrator: false }).every((t) => t.tag === 'No vibrator')).toBe(
			true,
		);
	});
});
