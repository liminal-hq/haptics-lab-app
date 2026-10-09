// Cue table helpers: importing cues and reading each row's compiled state
//
// (c) Copyright 2026 Liminal HQ, Scott Morris
// SPDX-License-Identifier: Apache-2.0

import { compilePattern, formatIssues, validatePattern } from '@liminal-hq/plugin-haptics';
import type { Capabilities, CompileReport, Pattern, Tier } from '@liminal-hq/plugin-haptics';
import type { Cue } from './seedCues';

export type ImportResult = { ok: true; cues: Cue[] } | { ok: false; errors: string[] };

function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function titleCase(id: string): string {
	const spaced = id.replace(/[-_]+/g, ' ').trim();
	return spaced ? spaced[0].toUpperCase() + spaced.slice(1) : id;
}

/**
 * Reads pasted JSON as one pattern or a table of patterns keyed by id. Every problem is listed so
 * the user can fix the whole file in one go.
 */
export function parseImport(text: string, maxDurationMs?: number): ImportResult {
	let data: unknown;
	try {
		data = JSON.parse(text);
	} catch (e) {
		return { ok: false, errors: [`Not valid JSON: ${e instanceof Error ? e.message : String(e)}`] };
	}
	if (!isRecord(data)) {
		return { ok: false, errors: ['Expected a pattern object or a table of patterns.'] };
	}

	const table: Record<string, unknown> =
		'format' in data ? { [String(data.id ?? 'imported')]: data } : data;
	const errors: string[] = [];
	const cues: Cue[] = [];

	for (const [id, value] of Object.entries(table)) {
		const issues = validatePattern(value, { maxDurationMs });
		if (issues.length) {
			errors.push(
				...formatIssues(issues)
					.split('\n')
					.map((line) => `${id}: ${line}`),
			);
			continue;
		}
		const pattern = { ...(value as Pattern), id };
		cues.push({ id, name: titleCase(id), pattern });
	}
	if (cues.length === 0 && errors.length === 0) errors.push('No patterns found.');
	return errors.length ? { ok: false, errors } : { ok: true, cues };
}

/** Adds imported cues to the table, replacing any with the same id. */
export function mergeCues(existing: Cue[], incoming: Cue[]): Cue[] {
	const ids = new Set(incoming.map((c) => c.id));
	return [...existing.filter((c) => !ids.has(c.id)), ...incoming];
}

export type CueRow = {
	cue: Cue;
	report: CompileReport | null;
	/** The tier badge to show: the compiled tier, or the UI lane's tier for a UI row. */
	tier: Tier;
	mixed: boolean;
	estimatedMs: number;
};

/** Compiles each cue for this device; UI rows report the lane's tier, `min(topTier, 3)`. */
export function cueRows(
	cues: Cue[],
	caps: Capabilities,
	opts: { maxTier: Tier | null; scale: number },
): CueRow[] {
	return cues.map((cue) => {
		if (cue.pattern) {
			const report = compilePattern(cue.pattern, caps, opts);
			return {
				cue,
				report,
				tier: report.tier,
				mixed: report.mixed,
				estimatedMs: report.estimatedMs,
			};
		}
		return {
			cue,
			report: null,
			tier: caps.touchFeedbackEnabled === false ? 0 : (Math.min(caps.topTier, 3) as Tier),
			mixed: false,
			estimatedMs: 20,
		};
	});
}
