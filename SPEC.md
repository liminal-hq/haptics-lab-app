# Haptics Lab Build Specification

## Overview and Goals

**Haptics Lab** is a Tauri v2 application designed for exploring, authoring, and replaying haptic patterns on Android devices. It serves as a "lab bench" for developers to prototype haptic sensations using native Android APIs.

The primary goals are:

- Build a cross-platform Tauri v2 app (React + MUI).
- Implement a native Android haptics plugin (`tauri-plugin-haptics`) using Rust and Kotlin.
- Provide a UI for testing capabilities, playing one-shot effects, and designing waveforms.
- Ensure the app is theme-aware using Material You (dynamic colours).

## Repo Layout

The repository is a `pnpm` workspace monorepo with the following structure:

```
.
├── .devcontainer/              # Devcontainer configuration
├── .github/workflows/          # CI/CD workflows
├── app/
│   └── haptics-lab/             # The main Tauri application (React UI + src-tauri)
├── docs/                       # Project documentation
├── packages/
│   └── tauri-plugin-haptics/   # The haptics plugin (Rust + Android + Guest JS)
│       ├── android/            # Native Android implementation (Kotlin)
│       ├── guest-js/           # TypeScript bindings (@liminal-hq/plugin-haptics)
│       └── src/                # Rust core logic
├── AGENTS.md                   # Rules for autonomous agents
├── SPEC.md                     # This specification file
├── pnpm-workspace.yaml         # Workspace definition
└── package.json                # Root package configuration
```

## Plugin API Surface

The plugin exposes a TypeScript API via `@liminal-hq/plugin-haptics`. The core contract revolves around `EffectRequest`.

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

export type Capabilities = {
	hasVibrator: boolean;
	hasAmplitudeControl: boolean;
	compositionSupported: boolean;
	envelopeSupported: boolean;
	// ... other details
};
```

### Methods

- `capabilities(): Promise<Capabilities>`
- `play(req: EffectRequest): Promise<PlayResult>`
- `stop(): Promise<void>`

## Material You Theming Approach

The UI uses Material UI (MUI) and integrates with Android's Material You dynamic colours.

1.  **Plugin**: `tauri-plugin-material-you` (Rust) and `@liminal-hq/plugin-material-you` (JS) provide the system palette.
2.  **Theme Adapter**: A `MaterialYouThemeProvider` in the React app reads the palette and generates an MUI theme.
3.  **Fallback**: A default theme is provided for desktop or non-supported environments.

## Build Commands

| Command              | Description                                 |
| :------------------- | :------------------------------------------ |
| `pnpm install`       | Install dependencies for all packages.      |
| `pnpm tauri:dev`     | Run the desktop development server.         |
| `pnpm android:init`  | Initialize the Android project (first run). |
| `pnpm android:dev`   | Run the app on an Android device/emulator.  |
| `pnpm android:build` | Build the Android APK/AAB.                  |
| `pnpm ci`            | Run linting, typechecking, and tests.       |
| `pnpm rust:test`     | Run Rust unit tests.                        |

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
- **Desktop**: The haptics plugin is a no-op on desktop (returns unsupported or mock data).

## Roadmap

1.  **Phase 0 (Bootstrap)**: Repo setup, skeleton app, desktop build.
2.  **Phase 1 (Theming)**: Material You integration.
3.  **Phase 2 (MVP)**: Basic haptics plugin (`play`, `stop`, `capabilities`).
4.  **Phase 3 (Waveform)**: Waveform editor and playback.
5.  **Phase 4 (Composition)**: Composition primitives support (API 30+).
6.  **Phase 5 (Envelope)**: Envelope effects (API 36+).
7.  **Phase 6 (Hardening)**: Tests, CI, and documentation polish.
