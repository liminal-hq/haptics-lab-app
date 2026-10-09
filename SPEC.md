# Haptics Lab Build Specification

## Overview and Goals

**Haptics Lab** is a Tauri v2 application designed for exploring, authoring, and replaying haptic patterns on Android devices. It serves as a "lab bench" for developers to prototype haptic sensations using native Android APIs.

The primary goals are:

- Build a cross-platform Tauri v2 app (React + MUI).
- Implement a native Android haptics plugin (`tauri-plugin-haptics`) using Rust and Kotlin, with honest capabilities and a five-tier ladder from envelope effects down to nothing.
- Let apps author a feeling once as a portable pattern, register it and trigger it by id; the plugin plays it as well as the device allows and reports what it did and why.
- Provide a five-tab lab (Bench, Cues, Compare, Raw, Device) for testing capabilities, authoring patterns and comparing tiers.
- Ensure the app is theme-aware using Material You (dynamic colours).

## Repo Layout

The repository is a Bun workspace monorepo with the following structure:

```
.
├── .devcontainer/              # Devcontainer configuration
├── .github/workflows/          # CI/CD workflows
├── app/
│   └── haptics-lab/             # The main Tauri application (React UI + src-tauri)
├── docs/                       # Project documentation
├── plugin/
│   ├── tauri-plugin-haptics/   # The haptics plugin (Rust + Android + Guest JS)
│   │   ├── android/            # Native Android implementation (Kotlin)
│   │   ├── guest-js/           # TypeScript bindings (@liminal-hq/plugin-haptics)
│   │   │   └── src/pattern/    # Pure TypeScript: pattern types, validation, compiler, scheduler
│   │   └── src/                # Rust core logic
│   └── tauri-plugin-material-you/  # Vendored theme plugin
├── AGENTS.md                   # Rules for autonomous agents
├── SPEC.md                     # This specification file
├── bun.lock                    # Dependency lockfile
└── package.json                # Root package configuration and workspaces
```

## Plugin API Surface

The plugin exposes a TypeScript API via `@liminal-hq/plugin-haptics`. Apps use portable patterns (`register`, `trigger`); `EffectRequest` is the raw escape hatch the compiler also targets.

### Tiers

| Tier | Name       | Needs                              | How a pattern plays                                                                 |
| ---- | ---------- | ---------------------------------- | ----------------------------------------------------------------------------------- |
| 4    | Envelope   | API 36 and an actuator that has it | Control points with amplitude and frequency                                         |
| 3    | Primitives | API 30 and at least one primitive  | Primitives per event, swapped for neighbours when missing                           |
| 2    | Amplitude  | Amplitude control                  | One waveform of one-shots sampled from the curves (10 ms, 12 ms for soft sharpness) |
| 1    | On / off   | Any vibrator                       | Duty-cycled on a 20 ms period; segments quieter than amplitude 40 are dropped       |
| 0    | Off        | Nothing                            | Resolves `ok` at tier 0 and never throws                                            |

A tier-4 pattern with too many control points or too long compiles at tier 3 with a note. An event with no primitive or neighbour steps down to tier 2 on its own, and a pattern with such events runs as a scheduled step list (`mixed`). Plugin duration and amplitude limits apply to every tier and truncation is reported.

### Types

```typescript
export type EffectRequest = {
	id?: string;
	usage?: 'touch' | 'notification' | 'alarm' | 'media';
	respectSystemSettings?: boolean;
	stopBeforePlay?: boolean;
	effect: OneShot | Waveform | Composition | Predefined | EnvelopeWaveform;
};

export type OneShot = {
	type: 'oneshot';
	durationMs: number;
	amplitude?: number; // 1-255
};

export type Waveform = {
	type: 'waveform';
	timingsMs: number[];
	amplitudes?: number[]; // 0-255
	repeat?: number;
};

export type PrimitiveId =
	| 'tick'
	| 'low_tick'
	| 'click'
	| 'thud'
	| 'spin'
	| 'quick_rise'
	| 'slow_rise';
export type PredefinedEffectId = 'click' | 'double_click' | 'tick' | 'heavy_click';
export type UiKind = 'confirm' | 'reject' | 'tick' | 'toggle-on' | 'toggle-off' | 'drag-start';
export type Tier = 0 | 1 | 2 | 3 | 4;

export type Composition = {
	type: 'composition';
	steps: Array<{ kind: 'primitive'; primitive: PrimitiveId; scale?: number; delayMs?: number }>;
};

export type PlayResult = {
	ok: true; // invalid input rejects; hardware limits never make this false
	tier: Tier; // the tier that played
	target: 'phone';
	estimatedMs: number;
	downgraded: boolean;
	reason?: string; // one sentence; several are joined with ' · '
	policy?: 'played' | 'queued' | 'dropped' | 'coalesced';
	downgradeReason?: string; // deprecated alias of `reason`
};

export type CompiledStep = { atMs: number; request: EffectRequest };

export type Capabilities = {
	platform: 'android' | 'ios' | 'desktop' | 'web';
	sdkInt?: number; // Android only
	hasVibrator: boolean;
	hasAmplitudeControl: boolean;
	topTier: 0 | 1 | 2 | 3 | 4; // 4 envelope, 3 primitives, 2 amplitude, 1 on/off, 0 none

	compositionSupported: boolean; // API 30+ and at least one primitive
	primitives: Record<PrimitiveId, { supported: boolean; durationMs: number | null }>;
	effects: Record<'click' | 'double_click' | 'tick' | 'heavy_click', 'yes' | 'no' | 'unknown'>;

	envelopeSupported: boolean;
	envelopeInfo?: EnvelopeInfo; // present when envelopeSupported
	resonantHz?: number; // API 31
	qFactor?: number; // API 31

	touchFeedbackEnabled: boolean | null; // null when unreadable
	hapticFeedbackEnabled?: boolean; // deprecated alias, kept for one release

	limits: { maxDurationMs: number; maxAmplitude: number; allowRepeatingWaveforms: boolean };
	device: { manufacturer: string; model: string; release: string };
};
```

### Pattern format

```typescript
export type Pattern = {
	format: 'haptics-lab/pattern@1';
	id?: string;
	usage?: 'touch' | 'notification' | 'alarm' | 'media'; // default 'media'
	policy?: 'interrupt' | 'queue' | 'drop-if-busy' | { coalesce: number }; // default 'interrupt'
	events: Array<
		| { type: 'transient'; at: number; intensity: number; sharpness: number }
		| {
				type: 'continuous';
				at: number;
				duration: number;
				intensity: number | { t: number; v: number }[];
				sharpness: number | { t: number; v: number }[];
		  }
	>;
};
```

Times are in milliseconds; `intensity` and `sharpness` run from 0 to 1, the same units as Core Haptics. Validation reports every problem at once with a path and a fix (for example `events[2].intensity: 1.4 is above 1. Use 0..1.`).

### Methods

- `capabilities(): Promise<Capabilities>` — reports each primitive and predefined effect separately, with measured primitive durations where Android provides them. `topTier` is 0 with no vibrator, 4 with envelope support, 3 with any supported primitive, 2 with amplitude control and 1 otherwise. Desktop reports `platform: 'desktop'`, tier 0 and every primitive and effect as unsupported.
- `play(req: EffectRequest): Promise<PlayResult>` — resolves with the `tier` that played (4 envelope, 3 composition, 2 amplitude, 1 on/off, 0 nothing), `target: 'phone'`, `estimatedMs`, `downgraded` and a one-sentence `reason` (several are joined with `·`); `downgradeReason` is a deprecated alias. Invalid input rejects with `INVALID_EFFECT`; hardware limits never reject, and a device with no vibrator resolves at tier 0. Unknown predefined ids are rejected (`thud` and `pop` are not predefined effects; use the `thud` primitive). Compositions are primitives only: a primitive the motor lacks is swapped for its nearest neighbour (`low_tick → tick → click`, `tick → click`, `thud → click`, `spin → quick_rise`, `slow_rise → quick_rise`), dropped when it has none, and each change is reported in `reason`.
- `register(id, pattern, opts?)`, `registerAll(table)`, `unregister(id)` and `trigger(id, opts?)` — the portable pattern API. `register` validates the pattern (rejecting with `INVALID_EFFECT` and every problem listed) and returns the `CompileReport` for this device; `trigger` compiles at the master scale, applies the pattern's policy (`interrupt`, `queue`, `drop-if-busy` or `{ coalesce: ms }`) and resolves with `policy` set to `played`, `queued`, `dropped` or `coalesced`. An unknown id rejects with `UNKNOWN_PATTERN`. A coalesced group holds its first trigger for the window and plays once, +0.15 scale per merge, three merges at most.
- `compile(pattern, { tier? })` — synchronous and pure; needs the capabilities loaded. `setMasterScale(v)` multiplies every intensity, `setMaxTier(t)` caps the tier (raw requests above the cap resolve at tier 0 with `reason: "Capped at tier N by setMaxTier"`), and `stop()` also clears every queue and timer.
- `capabilities({ refresh })` caches the first read and re-reads on request and when the app becomes visible again.
- `playSteps(steps: CompiledStep[]): Promise<PlayResult>` — plays `{ atMs, request }` steps scheduled natively from one start time so they stay tight (used for compiled patterns that mix tiers). Every step is validated before any plays and an invalid step rejects the whole call with its index. `stop()` cancels the schedule. The result carries the highest tier among the steps, the reasons from every step and an estimate that ends with the last step.
- `ui(kind): Promise<PlayResult>` — the UI lane. `kind` is `confirm`, `reject`, `tick`, `toggle-on`, `toggle-off` or `drag-start`. Android plays them with `View.performHapticFeedback` on the web view (`CONFIRM` and `REJECT` from API 30, `TOGGLE_ON`, `TOGGLE_OFF` and `DRAG_START` from API 34, `CLOCK_TICK` for the rest), falling back to `CLOCK_TICK` or `CONTEXT_CLICK` below the needed API and saying so in `reason`. It always follows the system touch-feedback setting: when that is off it resolves at tier 0 with `reason: "Touch feedback is off in system settings"`. Strength is up to the OS, so it ignores `maxAmplitude`; the reported tier is `min(topTier, 3)`.
- `stop(): Promise<void>`

### System touch-feedback setting and usage

- The system touch-feedback setting only gates `usage: 'touch'` (and the UI lane). `respectSystemSettings` defaults to `usage === 'touch'`, so `media`, `notification` and `alarm` haptics still play when touch feedback is off. A request can set `respectSystemSettings` explicitly to override this, and the `respectSystemHapticsSetting` config key now means "respect it for touch usage". When it silences a request, `play()` resolves at tier 0 with `reason: "Touch feedback is off in system settings"`.
- On Android 13 (API 33) and later the usage is sent as `VibrationAttributes` (`USAGE_TOUCH`, `USAGE_NOTIFICATION`, `USAGE_ALARM`, `USAGE_MEDIA`); older releases use the nearest `AudioAttributes` usage.
- `allowRepeatingWaveforms` stays off by default in the lab's `tauri.conf.json`; a repeating waveform plays once and `reason` says the repeat was ignored.

## Material You Theming Approach

The UI uses Material UI (MUI) and integrates with Android's Material You dynamic colours.

1.  **Plugin**: `tauri-plugin-material-you` (Rust) and `@liminal-hq/plugin-material-you` (JS) provide the system palette.
2.  **Theme Adapter**: A `MaterialYouThemeProvider` in the React app reads the palette and generates an MUI theme.
3.  **Fallback**: A default theme is provided for desktop or non-supported environments.

## Build Commands

| Command                 | Description                                                   |
| :---------------------- | :------------------------------------------------------------ |
| `bun install`           | Install dependencies for all packages.                        |
| `bun run tauri:dev`     | Run the desktop development server.                           |
| `bun run android:init`  | Regenerate the tracked Android project (Tauri upgrades only). |
| `bun run android:dev`   | Run the app on an Android device/emulator.                    |
| `bun run android:build` | Build the Android APK/AAB.                                    |
| `bun run validate`      | Run linting, typechecking, and tests.                         |
| `bun run rust:test`     | Run Rust unit tests.                                          |

## Testing Strategy

- **TypeScript (Vitest)**: Unit tests for request validation, preset serialization, and UI logic.
- **Rust (`cargo test`)**: Unit tests for the plugin core, focusing on validation and clamping logic.
- **Kotlin**: Unit tests for mapping and builder logic where practical.
- **Manual Verification**: On-device testing for haptic feedback feel.

## CI Workflow Summary

- **JS Checks**: Linting, Typechecking, Vitest.
- **Rust Checks**: `fmt`, `clippy`, `test`.
- **Android Build**: A workflow to build the Android artifact and upload it.

## Known Limitations / Fallbacks

- **Amplitude Control**: If unsupported by the device, amplitudes are ignored (on/off behavior) or downgraded.
- **Composition/Envelopes**: These features are gated by Android SDK version and device support. The app checks capabilities before enabling these features.
- **Desktop**: The haptics plugin resolves every call at tier 0 with `reason: "No vibrator on this platform"`; it never errors, so the lab runs and compiles patterns on desktop.
- **Coalesce latency**: A `coalesce` pattern holds its first trigger for the window so later triggers can merge into one stronger hit.
- **Test phone**: The Pixel 8 Pro supports primitives and amplitude control but has no envelope hardware, so tier 4 can't be verified on it.

## The Lab

The app opens on a splash (the animated icon with a matching vibration) and then shows five tabs under a top bar with a tier chip, with a transport bar (last result, why, and Stop) always visible.

| Tab     | What it does                                                                                                                                      |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bench   | Author a pattern on a timeline, see what it compiles to at each tier, set usage, policy and scales, trigger it and export its JSON.               |
| Cues    | A game's cue table (seeded with Lieutenant Fizz) compiled for this device, with play all, every cue at every tier, and import.                    |
| Compare | The bench pattern across tiers, a strength ladder to find the felt threshold, and a policy bench.                                                 |
| Raw     | One editor per `EffectRequest` type plus the UI lane, with banners for anything the device will degrade and the exact request JSON.               |
| Device  | The tier ladder, generated "what this means" sentences, a "Preview a weaker phone" cap, capability rows with the Android API, and primitive bars. |

Nothing the device can't do is a dead button: it is disabled with a visible reason, or it plays and the transport bar says what was substituted. `setMaxTier` is one app-wide value shared by Bench and Device.

## Roadmap

1.  **Phase 0 (Bootstrap)**: Repo setup, skeleton app, desktop build.
2.  **Phase 1 (Theming)**: Material You integration.
3.  **Phase 2 (MVP)**: Basic haptics plugin (`play`, `stop`, `capabilities`).
4.  **Phase 3 (Waveform)**: Waveform editor and playback.
5.  **Phase 4 (Composition)**: Composition primitives support (API 30+).
6.  **Phase 5 (Envelope)**: Envelope effects (API 36+).
7.  **Phase 6 (Hardening)**: Tests, CI, and documentation polish.
8.  **Phase 7 (v2 plugin and lab)**: Honest capabilities, the tier ladder, portable patterns and the five-tab lab.
9.  **Next**: Move the plugin into `tauri-plugins-workspace`; an iOS backend on Core Haptics; gamepad rumble as a separate plugin.
