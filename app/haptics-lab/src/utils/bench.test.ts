// Unit tests for the Bench pattern helpers
//
// (c) Copyright 2026 Liminal HQ, Scott Morris
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import { validatePattern } from '@liminal-hq/plugin-haptics';
import type { Capabilities, PatternEvent } from '@liminal-hq/plugin-haptics';
import {
	DEFAULT_BENCH,
	addHum,
	addTransient,
	buildPattern,
	curvePoints,
	deleteEvent,
	duplicateEvent,
	eventSummary,
	exportJson,
	mapsTo,
	patternLength,
	policyChoice,
	policyFromChoice,
	policyLabel,
	setCurvePoint,
	sharpnessOf,
	updateEvent,
} from './bench';

const prim = (ok: boolean) => ({ supported: ok, durationMs: ok ? 20 : null });
const caps = {
	primitives: {
		tick: prim(true),
		low_tick: prim(false),
		click: prim(true),
		thud: prim(true),
		spin: prim(false),
		quick_rise: prim(false),
		slow_rise: prim(true),
	},
} as unknown as Capabilities;

describe('default pattern', () => {
	it('is a valid pattern', () => {
		expect(validatePattern(buildPattern(DEFAULT_BENCH))).toEqual([]);
	});

	it('uses the name as the id and falls back when it is blank', () => {
		expect(buildPattern(DEFAULT_BENCH).id).toBe('Hurt');
		expect(buildPattern({ ...DEFAULT_BENCH, name: '  ' }).id).toBe('bench');
	});

	it('measures its length to the end of the last event', () => {
		expect(patternLength(DEFAULT_BENCH.events)).toBe(140);
	});
});

describe('editing events', () => {
	const events = DEFAULT_BENCH.events;

	it('adds events after the end of the pattern, and stays valid', () => {
		const more = addHum(addTransient(events));
		expect(more).toHaveLength(4);
		expect(more[2].at).toBe(180);
		expect(more[3].at).toBe(220);
		expect(validatePattern(buildPattern({ ...DEFAULT_BENCH, events: more }))).toEqual([]);
	});

	it('starts at 0 when adding to an empty pattern', () => {
		expect(addTransient([])[0].at).toBe(0);
	});

	it('duplicates after the source without sharing its curve', () => {
		const copy = duplicateEvent(events, 1);
		expect(copy).toHaveLength(3);
		expect(copy[2].at).toBe(180);
		const hum = copy[2];
		if (hum.type === 'continuous' && typeof hum.intensity !== 'number') hum.intensity[0].v = 0;
		expect(curvePoints(events[1])?.[0]).toBe(0.9);
	});

	it('never deletes the last event', () => {
		expect(deleteEvent(events, 0)).toHaveLength(1);
		expect(deleteEvent([events[0]], 0)).toHaveLength(1);
	});

	it('updates one event and leaves the others', () => {
		const next = updateEvent(events, 0, { at: 5, intensity: 0.4 });
		expect(next[0]).toMatchObject({ at: 5, intensity: 0.4, sharpness: 0.6 });
		expect(next[1]).toBe(events[1]);
		const hum = updateEvent(events, 1, { duration: 200 })[1];
		expect(hum).toMatchObject({ type: 'continuous', duration: 200 });
	});

	it('edits the three curve points and keeps t at 0, 0.5 and 1', () => {
		expect(curvePoints(events[0])).toBeNull();
		expect(curvePoints(events[1])).toEqual([0.9, 0.45, 0]);
		const next = setCurvePoint(events, 1, 1, 0.8);
		expect(curvePoints(next[1])).toEqual([0.9, 0.8, 0]);
		expect(validatePattern(buildPattern({ ...DEFAULT_BENCH, events: next }))).toEqual([]);
	});

	it('turns a flat intensity into three equal points', () => {
		const flat: PatternEvent = {
			type: 'continuous',
			at: 0,
			duration: 50,
			intensity: 0.5,
			sharpness: 0.5,
		};
		expect(curvePoints(flat)).toEqual([0.5, 0.5, 0.5]);
	});

	it('averages a sharpness curve', () => {
		const ev: PatternEvent = {
			type: 'continuous',
			at: 0,
			duration: 50,
			intensity: 0.5,
			sharpness: [
				{ t: 0, v: 0 },
				{ t: 1, v: 1 },
			],
		};
		expect(sharpnessOf(ev)).toBe(0.5);
		expect(sharpnessOf(events[0])).toBe(0.6);
	});
});

describe('mapsTo', () => {
	const at = (intensity: number, sharpness: number): PatternEvent => ({
		type: 'transient',
		at: 0,
		intensity,
		sharpness,
	});

	it('names the primitive tier 3 would use', () => {
		expect(mapsTo(caps, at(0.8, 0.8)).text).toBe('Maps to click at tier 3');
	});

	it('names the neighbour when the primitive is missing', () => {
		const hint = mapsTo(caps, at(0.2, 0.2));
		expect(hint).toMatchObject({ primitive: 'low_tick', playsAs: 'tick' });
		expect(hint.text).toBe('Maps to low_tick, missing here, so tick plays');
	});

	it('says when an event drops to tier 2', () => {
		const hum: PatternEvent = {
			type: 'continuous',
			at: 0,
			duration: 100,
			intensity: [
				{ t: 0, v: 0.1 },
				{ t: 1, v: 0.9 },
			],
			sharpness: 0.5,
		};
		const none = { ...caps, primitives: { ...caps.primitives, quick_rise: prim(false) } };
		expect(mapsTo(none, hum).playsAs).toBeNull();
	});

	it('assumes support when capabilities are not loaded', () => {
		expect(mapsTo(null, at(0.8, 0.8)).playsAs).toBe('click');
	});
});

describe('policy and summary', () => {
	it('converts between a choice and a policy', () => {
		expect(policyChoice('queue')).toBe('queue');
		expect(policyChoice({ coalesce: 60 })).toBe('coalesce');
		expect(policyFromChoice('coalesce')).toEqual({ coalesce: 40 });
		expect(policyFromChoice('coalesce', 60)).toEqual({ coalesce: 60 });
		expect(policyFromChoice('drop-if-busy')).toBe('drop-if-busy');
		expect(policyLabel({ coalesce: 60 })).toBe('coalesce 60 ms');
	});

	it('summarises events', () => {
		expect(eventSummary(DEFAULT_BENCH.events)).toBe('1 transient + 1 hum');
		expect(eventSummary(addTransient(DEFAULT_BENCH.events))).toBe('2 transients + 1 hum');
	});

	it('exports the pattern as JSON', () => {
		expect(JSON.parse(exportJson(DEFAULT_BENCH)).format).toBe('haptics-lab/pattern@1');
	});
});
