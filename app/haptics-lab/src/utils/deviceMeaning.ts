// Plain-language readouts of the device capabilities for the Device tab
//
// (c) Copyright 2026 Liminal HQ, Scott Morris
// SPDX-License-Identifier: Apache-2.0

import { PRIMITIVE_IDS } from '@liminal-hq/plugin-haptics';
import type { Capabilities, PrimitiveId } from '@liminal-hq/plugin-haptics';

export type MeaningTone = 'ok' | 'info' | 'warn' | 'off';

export type Meaning = { tone: MeaningTone; text: string };

function osName(caps: Capabilities): string {
	if (caps.platform === 'android')
		return caps.device.release ? `Android ${caps.device.release}` : 'Android';
	return caps.device.model || caps.platform;
}

function list(items: string[]): string {
	return items.length > 1
		? `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
		: items[0];
}

/** The "what this means" sentences, generated from the capabilities. */
export function meanings(caps: Capabilities): Meaning[] {
	if (!caps.hasVibrator) {
		return [
			{
				tone: 'off',
				text: 'No vibrator. Every play resolves at tier 0 without errors, so you can still author, compile and export.',
			},
		];
	}

	const out: Meaning[] = [];
	if (caps.topTier === 4) {
		out.push({
			tone: 'ok',
			text: 'Envelopes play natively: intensity and sharpness curves land as authored.',
		});
	} else if ((caps.sdkInt ?? 0) < 36) {
		out.push({
			tone: 'info',
			text: `No envelopes on ${osName(caps)}. Patterns compile down to tier ${caps.topTier}.`,
		});
	} else {
		out.push({
			tone: 'info',
			text: `${osName(caps)} supports envelopes, but this actuator does not. Patterns compile down to tier ${caps.topTier}.`,
		});
	}

	const missing = PRIMITIVE_IDS.filter((id) => !caps.primitives[id]?.supported);
	if (caps.topTier >= 3 && missing.length) {
		const them = missing.length > 1 ? 'them' : 'it';
		out.push({
			tone: 'warn',
			text: `${list(missing)} ${missing.length > 1 ? 'are' : 'is'} missing. Events that want ${them} use the nearest neighbour, or drop to tier 2 alone.`,
		});
	}
	if (!caps.hasAmplitudeControl) {
		out.push({
			tone: 'warn',
			text: 'No amplitude control. Waveforms become on/off and every strength knob turns into on-time.',
		});
	}
	if (caps.touchFeedbackEnabled === false) {
		out.push({
			tone: 'warn',
			text: 'System touch feedback is off: touch usage and the UI lane stay quiet. Media usage ignores it.',
		});
	}
	return out;
}

export type RowTone = 'yes' | 'no' | 'warn' | 'plain';

export type CapabilityRow = {
	label: string;
	/** The Android API this row reads, shown under the label. */
	api: string;
	value: string;
	tone: RowTone;
};

/** One row per capability, with the Android API it comes from. */
export function capabilityRows(caps: Capabilities): CapabilityRow[] {
	const env = caps.envelopeInfo;
	const confirmed = Object.values(caps.effects).filter((v) => v === 'yes').length;
	const sdk = caps.sdkInt;

	return [
		{
			label: 'Android',
			api: 'Build.VERSION.SDK_INT',
			value: sdk ? `${osName(caps)} · API ${sdk}` : osName(caps),
			tone: 'plain',
		},
		{
			label: 'Vibrator',
			api: 'hasVibrator()',
			value: caps.hasVibrator ? 'Yes' : 'No',
			tone: caps.hasVibrator ? 'yes' : 'no',
		},
		{
			label: 'Amplitude control',
			api: 'hasAmplitudeControl()',
			value: caps.hasAmplitudeControl ? '1–255' : 'On/off only',
			tone: caps.hasAmplitudeControl ? 'yes' : 'warn',
		},
		{
			label: 'Envelope effects',
			api: 'areEnvelopeEffectsSupported()',
			value: env
				? `${env.maxSize} pts · ${env.minControlPointDurationMs}–${env.maxControlPointDurationMs} ms`
				: (sdk ?? 0) >= 36
					? 'Not on this actuator'
					: 'Needs API 36',
			tone: env ? 'yes' : 'warn',
		},
		{
			label: 'Frequency profile',
			api: 'frequencyProfile',
			value: env?.frequencyProfile
				? `${env.frequencyProfile.minHz}–${env.frequencyProfile.maxHz} Hz`
				: 'Not reported',
			tone: env?.frequencyProfile ? 'yes' : 'no',
		},
		{
			label: 'Resonant frequency',
			api: 'resonantFrequency · API 31',
			value: caps.resonantHz ? `${caps.resonantHz} Hz` : 'Not reported',
			tone: caps.resonantHz ? 'yes' : 'no',
		},
		{
			label: 'Q factor',
			api: 'qFactor · API 31',
			value: caps.qFactor ? String(caps.qFactor) : 'Not reported',
			tone: caps.qFactor ? 'yes' : 'no',
		},
		{
			label: 'Predefined effects',
			api: 'areEffectsSupported · API 30',
			value: caps.hasVibrator
				? `${confirmed} of ${Object.keys(caps.effects).length} confirmed`
				: 'None',
			tone: 'plain',
		},
		{
			label: 'Touch feedback',
			api: 'HAPTIC_FEEDBACK_ENABLED',
			value:
				caps.touchFeedbackEnabled === null ? 'Unknown' : caps.touchFeedbackEnabled ? 'On' : 'Off',
			tone: caps.touchFeedbackEnabled === false ? 'warn' : caps.touchFeedbackEnabled ? 'yes' : 'no',
		},
	];
}

export type PrimitiveBar = {
	id: PrimitiveId;
	value: string;
	/** Bar length, 0 to 100. */
	width: number;
	supported: boolean;
};

const LONGEST_MS = 160;

/** Measured primitive durations as bars; unsupported primitives have no bar. */
export function primitiveBars(caps: Capabilities): PrimitiveBar[] {
	return PRIMITIVE_IDS.map((id) => {
		const p = caps.primitives[id];
		const ms = p?.supported ? p.durationMs : null;
		return {
			id,
			supported: p?.supported === true,
			value: ms ? `${ms} ms` : p?.supported ? 'Supported' : '—',
			width: ms ? Math.min(100, (ms / LONGEST_MS) * 100) : p?.supported ? 8 : 0,
		};
	});
}

/** The footnote under the primitive bars. */
export function primitiveFootnote(caps: Capabilities): string {
	return caps.topTier >= 3
		? 'Measured with getPrimitiveDurations. The compiler uses these to keep rhythms on beat.'
		: 'No primitives reported, so the compiler works from its built-in duration table.';
}
