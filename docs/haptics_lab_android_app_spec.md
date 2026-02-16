# Haptics Lab (Android)

A small, focused Android app for exploring, authoring, and replaying haptic “patterns” on a modern phone. It’s a playground that lets you prototype sensations (clicks, thuds, ramps, textures) using Android’s haptics APIs and compare how they feel across devices.

## Goals

- Let a developer design and test haptic effects quickly on-device.
- Support multiple authoring modes that map to Android’s haptics tiers:
  - Waveform (timings + amplitudes)
  - Composition primitives (device-tuned)
  - Envelope (intensity + sharpness) when supported
- Provide capability introspection so the UI only shows what the hardware/OS can actually render.
- Make it easy to save/share presets (JSON) and export “code snippets” for Kotlin.

## Non-goals

- Not a game engine or realtime haptic streaming system.
- Not a controller haptics tester for external gamepads (could be a later module).
- Not a full design tool like a DAW; keep it compact and purpose-built.

## Target platforms

- Minimum SDK: 26 (Android 8.0) for `VibrationEffect` waveforms.
- Recommended features:
  - SDK 30+ (Android 11): `VibrationEffect.Composition` primitives.
  - SDK 31+ (Android 12): `VibratorManager`.
  - SDK 36+ (Android 16): envelope effects + frequency profile features.

## Core user experience

The app is essentially a “lab bench” with:

1. A **Preset Library** (list)
2. A **Designer** (editor + preview)
3. A **Player** (transport controls + looping)
4. A **Device Inspector** (capabilities + notes)

The default landing screen is the Preset Library with a prominent “New Pattern” button.

## Information architecture

### Screens

1. **Library**
   - Preset cards (name, tags, duration, authoring type)
   - Search + filter by type (Waveform / Composition / Envelope)
   - “Favourites” pinning
   - Import / Export

2. **Designer** (tabbed by authoring mode)
   - Waveform Editor
   - Composition Editor
   - Envelope Editor (only if supported)

3. **Player** (can be a bottom sheet persistent across Designer)
   - Play / Stop / Loop
   - Intensity scaling (global multiplier)
   - Rate scaling (time stretch)
   - “A/B compare” slot

4. **Device Inspector**
   - OS version
   - Has vibrator
   - Has amplitude control
   - Supported primitives
   - Envelope effects supported
   - Frequency profile (if available)
   - Notes on limitations

5. **Settings**
   - Haptic feedback for UI controls (on/off)
   - Safety limits (max duration, max loop time)
   - Export format settings

## Authoring modes

### A) Waveform editor (timings + amplitudes)

**Purpose:** Build classic Android waveforms: a series of segments over time.

**UI:** Timeline / step editor

- A vertical list of segments, each segment has:
  - Duration (ms)
  - Amplitude (0–255) with “Off” shortcut
  - Segment label (optional)
- Add / duplicate / delete / reorder
- Quick tools:
  - Smooth ramp generator (start amp → end amp over N steps)
  - Texture generator (pulse train)
  - “Fade in/out” (auto-insert end-at-zero segment)
- Validation:
  - `timings.size == amplitudes.size`
  - Duration > 0
  - Encourage starting and ending with amplitude 0 (optional warning)
- Playback:
  - If `hasAmplitudeControl=false`, show a warning and fallback preview behaviour.

**Data model:**

- `WaveformEffect(timings: LongArray, amplitudes: IntArray, repeatIndex: Int)`

### B) Composition editor (primitives)

**Purpose:** Author “HD-ish” effects using device-tuned primitives.

**UI:** Track list

- A list of steps, each step:
  - Primitive type (dropdown)
  - Scale (0.0–1.0)
  - Delay after step (ms)
- “Supported primitives” list comes from device capability.
- Helpful macros:
  - “Click + Thud”
  - “Double click”
  - “Spin-up engine” (slow rise + buzz)

**Validation:**

- If a primitive isn’t supported, disable selection or mark as incompatible.

**Data model:**

- `CompositionEffect(steps: List<PrimitiveStep>)`

### C) Envelope editor (intensity + sharpness)

**Shown only if supported**.

**Purpose:** Define control points over time for intensity + sharpness.

**UI:** Graph editor

- Two curves over time:
  - Intensity (0–1)
  - Sharpness (0–1)
- Users place control points:
  - Each point has (intensity, sharpness, durationToNextMs)
- Tools:
  - “Attack/Decay” templates
  - “Rumble bed” (low sharpness) vs “Crisp” (high sharpness)
  - Clamp + smoothing
- Validation:
  - Must end with intensity 0
  - Durations > 0

**Data model:**

- `EnvelopeEffect(points: List<EnvelopePoint>, initialSharpness: Float)`

## Playback and transport

Transport is consistent across modes.

Controls:

- Play
- Stop
- Loop toggle
- Loop range (optional: loop last N ms)
- Global intensity multiplier
- Global time stretch (0.5× to 2×)

Behaviour:

- Looping effects must be cancellable immediately.
- Use a foreground UX assumption: if app goes background, stop playback (configurable, default on).
- Provide a “Hold to play” button for quick tactile iteration.

## Presets

A preset contains:

- `id`
- `name`
- `type` (waveform | composition | envelope)
- `tags` (click, thud, texture, ramp, alert, subtle, etc.)
- `durationMs` (computed)
- `payload` (type-specific)
- `createdAt`, `updatedAt`

Built-in sample presets:

- Minimal click
- Strong thud
- Double-tap
- Engine idle (loop)
- Ramp up then cut
- Texture “gritty”
- Texture “rain”

## Import / Export

### JSON format (internal)

- `haptics-lab/v1` envelope
- Deterministic ordering so diffs are clean

### Exports

- “Share JSON”
- “Copy Kotlin snippet” for the current preset
- “Copy pseudo-code” (for docs)

## Device Inspector (capabilities)

Display:

- `Build.VERSION.SDK_INT`
- `vibrator.hasVibrator()`
- `vibrator.hasAmplitudeControl()`
- Supported primitives (from vibrator/composition support)
- Envelope effects supported
- Frequency profile summary (min/max supported, notes)

Also include a “What this means” section with plain language:

- If amplitude control is missing: waveforms become on/off.
- If envelopes unsupported: you’ll rely on primitives and waveforms.

## Implementation outline

### Tech stack

- Kotlin
- Jetpack Compose UI
- Room (or DataStore + JSON) for preset persistence
- Coroutines for playback control

### Haptics engine layer

Create a small abstraction:

- `HapticPreset`
- `HapticEffectRenderer`
  - `renderToVibrationEffect(preset): VibrationEffect`
  - Handles capability-based fallbacks

Playback service object:

- `HapticsPlayer`
  - `play(preset, options)`
  - `stop()`

### Capability detection

- Prefer `VibratorManager` on 31+
- Compute a `DeviceHapticsCaps` struct at app start

### Safety

- Hard cap any single-shot total duration (e.g., 10s by default)
- Hard cap loop runtime unless user enables “Unlimited loop”
- Stop vibrations on `onStop()` by default

## UX details that matter

- Every time the user adjusts a slider (intensity/sharpness/amplitude), offer an optional “preview tick” so they can iterate quickly.
- Keep the app quiet: no sound, no extra animations; it’s about feel.
- Make “Stop” big and always available.

## Future extensions

- External controller haptics module (DualSense/Joy-Con connected to Android), showing detected vibrators per `InputDevice`.
- Compare devices: export a “test suite” of patterns and score them subjectively.
- Add a “pattern recorder” that logs what was played and when (for experiments).

## Open questions (to decide early)

- Do you want a single-screen “lab bench” layout (library left, editor right) for tablets?
- Should presets be stored as pure JSON in Room (simple) or as typed tables (more structured)?
- Do you want to support API < 26 at all, or keep minSdk 26 and simplify?
