// Haptic pattern for the splash screen, matching the shake of the animated app icon
//
// (c) Copyright 2026 Liminal HQ, Scott Morris
// SPDX-License-Identifier: Apache-2.0

import type {
	Capabilities,
	EffectRequest,
	EnvelopeWaveform,
	Waveform,
} from '@liminal-hq/plugin-haptics';
import { buildEnvelope, type EnvelopeRow } from './envelope';

/** One loop of the animated icon: the phone shakes for the first 480 ms, then settles. */
export const SPLASH_LOOP_MS = 1600;

/** Length of each jolt. The icon changes direction every 96 ms; each jolt is a strong beat plus a settle. */
const SEGMENT_MS = 48;

/** Strong beats and settles that fade out with the icon's shake. */
const SHAKE_AMPLITUDES = [255, 90, 255, 90, 220, 70, 200, 60, 160, 40];

/** Waveform for devices without envelope support: ten 48 ms segments, 480 ms in total. */
export function splashWaveform(): Waveform {
	return {
		type: 'waveform',
		timingsMs: SHAKE_AMPLITUDES.map(() => SEGMENT_MS),
		amplitudes: [...SHAKE_AMPLITUDES],
		repeat: -1,
	};
}

/** The same shape as an envelope: amplitude 0–1 with the frequency swinging between two values. */
function splashEnvelopeRows(): EnvelopeRow[] {
	return SHAKE_AMPLITUDES.map((amplitude, i) => ({
		amplitude: Number((amplitude / 255).toFixed(2)),
		frequencyHz: i % 2 === 0 ? 180 : 140,
		durationMs: SEGMENT_MS,
	}));
}

/** Envelope for the splash, or null when the device's limits do not allow it. */
export function splashEnvelope(info: Capabilities['envelopeInfo']): EnvelopeWaveform | null {
	const built = buildEnvelope(splashEnvelopeRows(), null, info);
	return built.ok ? built.effect : null;
}

/** Picks the richest effect the device supports, falling back to the plain waveform. */
export function splashEffect(caps: Capabilities | null): EffectRequest['effect'] {
	// Without the device's limits the envelope cannot be validated, so use the waveform.
	if (caps?.envelopeSupported && caps.envelopeInfo) {
		const envelope = splashEnvelope(caps.envelopeInfo);
		if (envelope) return envelope;
	}
	return splashWaveform();
}
