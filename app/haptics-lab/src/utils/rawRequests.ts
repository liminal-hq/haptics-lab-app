// Request building and capability notes for the Raw tab editors
//
// (c) Copyright 2026 Liminal HQ, Scott Morris
// SPDX-License-Identifier: Apache-2.0

import { resolvePrimitive } from '@liminal-hq/plugin-haptics';
import type {
	Capabilities,
	Composition,
	EffectRequest,
	OneShot,
	PredefinedEffectId,
	PrimitiveId,
	UiKind,
	Waveform,
} from '@liminal-hq/plugin-haptics';

export type Note = { severity: 'info' | 'warning'; text: string };

// ── one-shot ──────────────────────────────────────────────────────────────────────────────────

export type OneShotValues = { durationMs: number; amplitude: number };

export function oneShotEffect(v: OneShotValues): OneShot {
	return { type: 'oneshot', durationMs: v.durationMs, amplitude: v.amplitude };
}

export function oneShotNotes(caps: Capabilities | null): Note[] {
	if (caps && caps.hasVibrator && !caps.hasAmplitudeControl) {
		return [
			{
				severity: 'warning',
				text: 'No amplitude control on this device. The one-shot plays at default strength.',
			},
		];
	}
	return [];
}

// ── predefined ────────────────────────────────────────────────────────────────────────────────

export const PREDEFINED_IDS: PredefinedEffectId[] = [
	'click',
	'double_click',
	'tick',
	'heavy_click',
];

export function predefinedLabel(id: PredefinedEffectId): string {
	return id.replace('_', ' ');
}

/** What the device reports for a predefined effect, as a short tag. */
export function predefinedTag(caps: Capabilities | null, id: PredefinedEffectId): string {
	const support = caps?.effects[id];
	if (support === 'yes') return 'Supported';
	if (support === 'no') return 'Not supported';
	return 'Unconfirmed';
}

// ── waveform ──────────────────────────────────────────────────────────────────────────────────

export type WaveSegment = { ms: number; amplitude: number }; // amplitude 0..255, 0 is off

export type WaveformValues = { segments: WaveSegment[]; repeat: number };

export const WAVEFORM_PRESETS: Record<string, WaveSegment[]> = {
	'Double tap': [
		{ ms: 0, amplitude: 0 },
		{ ms: 40, amplitude: 255 },
		{ ms: 60, amplitude: 0 },
		{ ms: 40, amplitude: 255 },
	],
	Heartbeat: [
		{ ms: 0, amplitude: 0 },
		{ ms: 60, amplitude: 255 },
		{ ms: 80, amplitude: 0 },
		{ ms: 90, amplitude: 160 },
		{ ms: 400, amplitude: 0 },
	],
	'Ramp up': [
		{ ms: 0, amplitude: 0 },
		{ ms: 50, amplitude: 60 },
		{ ms: 50, amplitude: 120 },
		{ ms: 50, amplitude: 190 },
		{ ms: 50, amplitude: 255 },
	],
	Buzz: [
		{ ms: 0, amplitude: 0 },
		{ ms: 150, amplitude: 255 },
	],
};

export const DEFAULT_WAVEFORM: WaveSegment[] = [
	{ ms: 0, amplitude: 0 },
	{ ms: 50, amplitude: 128 },
	{ ms: 50, amplitude: 0 },
	{ ms: 100, amplitude: 255 },
];

export function waveformEffect(v: WaveformValues): Waveform {
	return {
		type: 'waveform',
		timingsMs: v.segments.map((s) => s.ms),
		amplitudes: v.segments.map((s) => s.amplitude),
		repeat: v.repeat,
	};
}

export function waveformLength(segments: WaveSegment[]): number {
	return segments.reduce((sum, s) => sum + s.ms, 0);
}

/** Everything the user should know before playing a waveform on this device. */
export function waveformNotes(v: WaveformValues, caps: Capabilities | null): Note[] {
	const notes: Note[] = [];
	if (!v.segments.some((s) => s.ms > 0)) {
		notes.push({
			severity: 'warning',
			text: 'Every segment is 0 ms. Give at least one segment a length.',
		});
	}
	if (caps?.hasVibrator && !caps.hasAmplitudeControl) {
		notes.push({
			severity: 'warning',
			text: 'No amplitude control. Segments above 0 play as full on, and strength becomes on-time.',
		});
	}
	if (v.repeat >= 0 && caps && !caps.limits.allowRepeatingWaveforms) {
		notes.push({
			severity: 'warning',
			text: 'Repeat will be ignored: allowRepeatingWaveforms is false in the plugin config.',
		});
	}
	if (caps && waveformLength(v.segments) > caps.limits.maxDurationMs) {
		notes.push({
			severity: 'warning',
			text: `This runs for ${waveformLength(v.segments)} ms. It is cut at ${caps.limits.maxDurationMs} ms.`,
		});
	}
	return notes;
}

// ── composition ───────────────────────────────────────────────────────────────────────────────

export type CompositionStepValue = { primitive: PrimitiveId; scale: number; delayMs: number };

export const DEFAULT_COMPOSITION: CompositionStepValue[] = [
	{ primitive: 'click', scale: 0.8, delayMs: 0 },
	{ primitive: 'thud', scale: 1, delayMs: 60 },
];

export function compositionEffect(steps: CompositionStepValue[]): Composition {
	return {
		type: 'composition',
		steps: steps.map((s) => ({
			kind: 'primitive' as const,
			primitive: s.primitive,
			scale: s.scale,
			delayMs: s.delayMs,
		})),
	};
}

export type StepHint = {
	/** The primitive that will actually play, or null when the step is dropped. */
	playsAs: PrimitiveId | null;
	supported: boolean;
	text: string;
};

/** Says what each step does on this device: plays, swaps for a neighbour, or is dropped. */
export function compositionHints(
	caps: Capabilities | null,
	steps: CompositionStepValue[],
): StepHint[] {
	return steps.map((s) => {
		if (!caps) return { playsAs: s.primitive, supported: true, text: '' };
		if (caps.primitives[s.primitive]?.supported) {
			return { playsAs: s.primitive, supported: true, text: '' };
		}
		const resolved = resolvePrimitive(caps, s.primitive);
		return resolved
			? {
					playsAs: resolved.id,
					supported: false,
					text: `${s.primitive} is missing on this motor, so ${resolved.id} plays instead.`,
				}
			: {
					playsAs: null,
					supported: false,
					text: `${s.primitive} is missing and has no neighbour, so this step is dropped.`,
				};
	});
}

export function compositionNotes(caps: Capabilities | null): Note[] {
	if (caps && !caps.compositionSupported) {
		return [
			{
				severity: 'warning',
				text: 'No composition primitives on this device. The composition plays as a single click.',
			},
		];
	}
	return [];
}

// ── envelope notes ────────────────────────────────────────────────────────────────────────────

export function envelopeNotes(caps: Capabilities | null): Note[] {
	if (caps && !caps.envelopeSupported) {
		const why =
			(caps.sdkInt ?? 0) < 36
				? 'Envelopes need Android 16 (API 36).'
				: 'This actuator has no envelope support.';
		return [
			{
				severity: 'warning',
				text: `${why} Play falls back to a tick and the transport says so.`,
			},
		];
	}
	return [];
}

// ── UI lane ───────────────────────────────────────────────────────────────────────────────────

export type UiTile = { kind: UiKind; code: string; api: number; tag: string; silent: boolean };

const UI_KINDS: { kind: UiKind; code: string; api: number }[] = [
	{ kind: 'confirm', code: 'HapticFeedbackConstants.CONFIRM', api: 30 },
	{ kind: 'reject', code: 'HapticFeedbackConstants.REJECT', api: 30 },
	{ kind: 'tick', code: 'HapticFeedbackConstants.CLOCK_TICK', api: 21 },
	{ kind: 'toggle-on', code: 'HapticFeedbackConstants.TOGGLE_ON', api: 34 },
	{ kind: 'toggle-off', code: 'HapticFeedbackConstants.TOGGLE_OFF', api: 34 },
	{ kind: 'drag-start', code: 'HapticFeedbackConstants.DRAG_START', api: 34 },
];

/** The UI lane buttons, each tagged with how it will play on this device. */
export function uiTiles(caps: Capabilities | null): UiTile[] {
	return UI_KINDS.map((k) => {
		let tag = 'Native';
		let silent = false;
		if (caps && !caps.hasVibrator) {
			tag = 'No vibrator';
			silent = true;
		} else if (caps && caps.touchFeedbackEnabled === false) {
			tag = 'Silent';
			silent = true;
		} else if (caps && (caps.sdkInt ?? 0) < k.api) {
			tag = `API ${k.api} · fallback`;
		}
		return { ...k, tag, silent };
	});
}

export function uiNotes(caps: Capabilities | null): Note[] {
	if (caps && caps.touchFeedbackEnabled === false) {
		return [
			{
				severity: 'warning',
				text: 'Touch feedback is off in system settings. The UI lane stays silent and says so.',
			},
		];
	}
	return [];
}

/** The request preview shown under each editor. */
export function previewJson(req: EffectRequest): string {
	return JSON.stringify(req, null, 2);
}
