# Haptics Lab

<p align="center">
  <img src="assets/hero.svg" alt="Haptics Lab — explore, author, and replay haptic patterns on Android" width="100%">
</p>

A Tauri v2 application for exploring, authoring, and replaying haptic patterns on Android devices.

## Quickstart

This repo is configured as a Bun monorepo.

### Prerequisites

- Node.js 20+
- Bun 1.3+
- Rust stable
- Android SDK + NDK + JDK 17
- Tauri system dependencies (webkit2gtk, etc.)

Alternatively, use the provided Devcontainer which has everything pre-installed.

### Commands

| Command                 | Description                                                   |
| :---------------------- | :------------------------------------------------------------ |
| `bun install`           | Install dependencies for all packages.                        |
| `bun run tauri:dev`     | Run the desktop development server.                           |
| `bun run android:init`  | Regenerate the tracked Android project (Tauri upgrades only). |
| `bun run android:dev`   | Run the app on an Android device/emulator.                    |
| `bun run android:build` | Build the Android APK/AAB.                                    |
| `bun run icons`         | Regenerate app icons from `assets/icon`.                      |
| `bun run validate`      | Run linting, typechecking, and tests.                         |

## Plugin

The haptics plugin source code is located in `plugin/tauri-plugin-haptics`.
It includes:

- Rust core logic
- Android Kotlin implementation
- TypeScript guest bindings

### Patterns

Author a feeling once as a portable pattern, register it, and trigger it by id. The plugin compiles it for the device it is running on and reports what it actually did.

```ts
import * as haptics from '@liminal-hq/plugin-haptics';

await haptics.register('hurt', {
	format: 'haptics-lab/pattern@1',
	policy: 'interrupt',
	events: [
		{ type: 'transient', at: 0, intensity: 1, sharpness: 0.6 },
		{
			type: 'continuous',
			at: 20,
			duration: 120,
			intensity: [
				{ t: 0, v: 0.9 },
				{ t: 0.5, v: 0.45 },
				{ t: 1, v: 0 },
			],
			sharpness: 0.1,
		},
	],
});

const result = await haptics.trigger('hurt', { scale: 0.8 });
// { ok: true, tier: 3, estimatedMs: 110, downgraded: false, policy: 'played', … }
```

`intensity` and `sharpness` run from 0 to 1 and times are in milliseconds, the same units as Core Haptics. `haptics.ui('confirm')` plays system-style feedback that follows the touch-feedback setting, and `haptics.play(request)` is the raw escape hatch.

### Tiers

Every device sits on a five-tier ladder, reported as `topTier` in `capabilities()`. A pattern compiles to the highest tier the device supports and steps down by fixed rules, so the same pattern plays everywhere:

| Tier | Name       | Needs                                  | How a pattern plays                                                       |
| ---- | ---------- | -------------------------------------- | ------------------------------------------------------------------------- |
| 4    | Envelope   | Android 16 and an actuator that has it | Control points with amplitude and frequency                               |
| 3    | Primitives | Android 11 and at least one primitive  | `click`, `tick`, `thud` and the rest, swapped for neighbours when missing |
| 2    | Amplitude  | Amplitude control                      | One waveform of one-shots sampled from the curves                         |
| 1    | On / off   | Any vibrator                           | Duty-cycled on and off at 20 ms                                           |
| 0    | Off        | Nothing                                | Resolves `ok` at tier 0 and never throws                                  |

An event with no usable primitive or neighbour steps down to tier 2 on its own (`mixed: true`), and a tier-4 pattern that has too many control points or runs too long compiles at tier 3 with a note. `setMaxTier(n)` caps the tier to preview a weaker phone, and `compile(pattern, { tier })` shows what each tier would do without playing.

The pure TypeScript in `guest-js/src/pattern/` (types, validation, the compiler and the scheduler) has no Tauri imports and is meant to move into its own package once a second backend exists. On iOS, Core Haptics takes these patterns almost directly, so tier 4 would be native there.

## Testing

Run all checks locally:

```bash
bun run validate
```
