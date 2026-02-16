export type HapticsUsage =
	| 'touch' // foreground UI interactions
	| 'notification' // attentional
	| 'alarm' // background-allowed style
	| 'media';

export type EffectRequest = {
	id?: string; // for lab UI: track what you played
	usage?: HapticsUsage; // default from plugin config
	respectSystemSettings?: boolean; // default true
	stopBeforePlay?: boolean; // default true

	// one of:
	effect: OneShot | Waveform | Composition | Predefined | EnvelopeWaveform;
};

export type OneShot = {
	type: 'oneshot';
	durationMs: number;
	amplitude?: number; // 1..255, omit for default
};

export type Waveform = {
	type: 'waveform';
	timingsMs: number[]; // alternates off/on durations; often start with 0
	amplitudes?: number[]; // 0..255; if omitted, becomes on/off waveform
	repeat?: number; // -1 no repeat, else index into timings
};

export type Composition = {
	type: 'composition';
	steps: Array<
		| { kind: 'primitive'; primitive: PrimitiveId; scale?: number; delayMs?: number }
		| { kind: 'effect'; effect: PredefinedEffectId; delayMs?: number }
	>;
};

export type Predefined = {
	type: 'predefined';
	effectId: PredefinedEffectId;
};

// Android 16+ (API 36) only when supported.
export type EnvelopeWaveform = {
	type: 'envelopeWaveform';
	initialFrequencyHz?: number;
	controlPoints: Array<{ amplitude: number; frequencyHz: number; durationMs: number }>;
};

export type Capabilities = {
	hasVibrator: boolean;
	hasAmplitudeControl: boolean;
	effectsSupport?: Record<PredefinedEffectId, 'yes' | 'no' | 'unknown'>;

	// Composition primitives
	compositionSupported: boolean;
	primitives?: Record<PrimitiveId, boolean>;

	// Envelope effects (API 36)
	envelopeSupported: boolean;
	envelopeInfo?: {
		maxSize: number;
		minControlPointDurationMs: number;
		maxControlPointDurationMs: number;
		maxDurationMs: number;
		frequencyProfile?: {
			minHz: number;
			maxHz: number;
		};
	};

	// System toggles
	hapticFeedbackEnabled?: boolean;
};

export type PlayResult = {
	ok: boolean;
	downgraded?: boolean;
	downgradeReason?: string;
};

export type PrimitiveId = 'tick' | 'click' | 'thud' | 'spin' | 'quick_rise' | 'slow_rise';

export type PredefinedEffectId = 'click' | 'double_click' | 'tick' | 'thud' | 'pop' | 'heavy_click';
