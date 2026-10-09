// Envelope editor row parsing and validation against device limits
//
// (c) Copyright 2026 Liminal HQ, Scott Morris
// SPDX-License-Identifier: Apache-2.0

import type { Capabilities, EnvelopeWaveform } from '@liminal-hq/plugin-haptics';

export type EnvelopeRow = { amplitude: number; frequencyHz: number; durationMs: number };

export const defaultEnvelopeRows = (): EnvelopeRow[] => [
	{ amplitude: 0.2, frequencyHz: 150, durationMs: 100 },
	{ amplitude: 1, frequencyHz: 200, durationMs: 200 },
	{ amplitude: 0, frequencyHz: 150, durationMs: 100 },
];

export type EnvelopeBuildResult =
	| { ok: true; effect: EnvelopeWaveform }
	| { ok: false; errors: string[] };

/** Converts editor rows to a payload, validating against reported device limits when known. */
export function buildEnvelope(
	rows: EnvelopeRow[],
	initialFrequencyHz: number | null,
	info?: Capabilities['envelopeInfo'],
): EnvelopeBuildResult {
	const errors: string[] = [];
	if (rows.length === 0) errors.push('Add at least one control point');
	if (info && rows.length > info.maxSize) {
		errors.push(`Too many points (device max ${info.maxSize})`);
	}

	const range = info?.frequencyProfile;
	const checkFreq = (hz: number, label: string) => {
		if (!(hz > 0)) errors.push(`${label}: frequency must be positive`);
		else if (range && (hz < range.minHz || hz > range.maxHz)) {
			errors.push(`${label}: frequency must be within ${range.minHz}–${range.maxHz} Hz`);
		}
	};

	let total = 0;
	const controlPoints = rows.map((r, i) => {
		const label = `Point ${i + 1}`;
		const { amplitude, frequencyHz, durationMs } = r;
		if (!(amplitude >= 0 && amplitude <= 1)) {
			errors.push(`${label}: amplitude must be within 0–1`);
		}
		checkFreq(frequencyHz, label);
		if (!Number.isInteger(durationMs) || durationMs <= 0) {
			errors.push(`${label}: duration must be a positive whole number`);
		} else if (
			info &&
			(durationMs < info.minControlPointDurationMs || durationMs > info.maxControlPointDurationMs)
		) {
			errors.push(
				`${label}: duration must be within ${info.minControlPointDurationMs}–${info.maxControlPointDurationMs} ms`,
			);
		}
		total += durationMs || 0;
		return { amplitude, frequencyHz, durationMs };
	});

	if (info && total > info.maxDurationMs) {
		errors.push(`Total ${total} ms exceeds device max ${info.maxDurationMs} ms`);
	}

	let initial: number | undefined;
	if (initialFrequencyHz !== null) {
		initial = initialFrequencyHz;
		checkFreq(initial, 'Initial frequency');
	}

	if (errors.length > 0) return { ok: false, errors };
	const effect: EnvelopeWaveform = { type: 'envelopeWaveform', controlPoints };
	if (initial !== undefined) effect.initialFrequencyHz = initial;
	return { ok: true, effect };
}
