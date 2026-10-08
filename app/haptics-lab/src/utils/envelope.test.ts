// Unit tests for envelope row validation and payload building
//
// (c) Copyright 2026 Liminal HQ, Scott Morris
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import { buildEnvelope, defaultEnvelopeRows } from './envelope';

const info = {
	maxSize: 4,
	minControlPointDurationMs: 10,
	maxControlPointDurationMs: 500,
	maxDurationMs: 600,
	frequencyProfile: { minHz: 50, maxHz: 300 },
};

describe('buildEnvelope', () => {
	it('builds a payload from valid rows', () => {
		const r = buildEnvelope(defaultEnvelopeRows(), '120', info);
		expect(r).toEqual({
			ok: true,
			effect: {
				type: 'envelopeWaveform',
				initialFrequencyHz: 120,
				controlPoints: [
					{ amplitude: 0.2, frequencyHz: 150, durationMs: 100 },
					{ amplitude: 1, frequencyHz: 200, durationMs: 200 },
					{ amplitude: 0, frequencyHz: 150, durationMs: 100 },
				],
			},
		});
	});

	it('omits initial frequency when blank and works without device info', () => {
		const r = buildEnvelope(defaultEnvelopeRows(), '');
		expect(r.ok && 'initialFrequencyHz' in r.effect).toBe(false);
	});

	it('reports amplitude, frequency and duration errors', () => {
		const r = buildEnvelope([{ amplitude: '2', frequencyHz: '10', durationMs: '5' }], '', info);
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.errors).toHaveLength(3);
	});

	it('rejects too many points and excessive total duration', () => {
		const rows = Array.from({ length: 5 }, () => ({
			amplitude: '1',
			frequencyHz: '100',
			durationMs: '200',
		}));
		const r = buildEnvelope(rows, '', info);
		expect(r.ok).toBe(false);
		if (!r.ok) {
			expect(r.errors.join()).toMatch(/Too many points/);
			expect(r.errors.join()).toMatch(/Total 1000 ms/);
		}
	});

	it('rejects an empty envelope', () => {
		expect(buildEnvelope([], '').ok).toBe(false);
	});
});
