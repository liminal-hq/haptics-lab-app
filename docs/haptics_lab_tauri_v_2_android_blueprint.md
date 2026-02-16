# Purpose

This document is the “single source of truth” for building a complete repo that contains:

- A **Tauri v2** application called **Haptics Lab**
- A native **Android haptics** plugin (**tauri-plugin-haptics**) implemented with:
  - Rust (Tauri plugin + command surface)
  - Kotlin (Android implementation)
  - TypeScript (JS guest bindings)
- A Material Design (MUI) React UI using **Material You** colours via:
  - `tauri-plugin-material-you` (Rust)
  - `@liminal-hq/plugin-material-you` (JS)
- Tests (TS + Rust + Kotlin)
- GitHub Actions CI workflows
- A devcontainer (derived from the provided Threshold devcontainer/Dockerfile)
- READMEs and agent-ready build instructions

This is designed so an autonomous AI can take the repo from empty → fully working.

# Repo layout

Single repo, with pnpm workspaces and a small Rust workspace:

```
.
├─ .devcontainer/
│  ├─ devcontainer.json
│  └─ Dockerfile
├─ .github/
│  └─ workflows/
│     ├─ ci.yml
│     └─ android.yml
├─ packages/
│  └─ tauri-plugin-haptics/
│     ├─ Cargo.toml
│     ├─ README.md
│     ├─ permissions/
│     ├─ src/
│     ├─ android/
│     └─ guest-js/
│        ├─ package.json
│        └─ src/
├─ docs/
│  ├─ ARCHITECTURE.md
│  ├─ DECISIONS.md
│  └─ TESTING.md
├─ src/
│  ├─ app/
│  ├─ components/
│  ├─ theme/
│  └─ main.tsx
├─ src-tauri/
│  ├─ Cargo.toml
│  ├─ tauri.conf.json
│  └─ src/
│     └─ lib.rs
├─ .editorconfig
├─ .gitignore
├─ AGENTS.md
├─ README.md
├─ package.json
├─ pnpm-lock.yaml
├─ pnpm-workspace.yaml
├─ tsconfig.json
├─ vite.config.ts
└─ vitest.config.ts
```

Notes:

- `plugin/tauri-plugin-haptics` contains the full plugin: Rust core, Android Kotlin implementation, and the JS guest bindings consumed by the React UI.
- The app lives under `app/haptic-lab/` (with `app/haptic-lab/src/` and `app/haptic-lab/src-tauri/`) so the repo can host other apps later..

# Build phases (the order the AI should execute)

## Phase 0 — Bootstrap

1. Create repo skeleton and initialise pnpm workspace
2. Generate Tauri v2 React template app
3. Commit a “hello world” build that runs on desktop

## Phase 1 — Material You theming

1. Add `tauri-plugin-material-you` to `src-tauri`
2. Add `@liminal-hq/plugin-material-you` to UI
3. Build a theme bridge: Material You → MUI theme
4. Verify theme changes update UI live (or on app start)

## Phase 2 — Haptics plugin MVP

1. Add `tauri-plugin-haptics` (including its `guest-js` bindings)
2. Implement `capabilities`, `play(oneshot)`, `stop`
3. Add a minimal UI “Play Click / Stop”
4. Verify on Android device

## Phase 3 — Waveform editor

1. Implement waveform payload in plugin
2. Add waveform editor UI (list of segments)
3. Add “hold to play” interaction
4. Add import/export JSON

## Phase 4 — Composition primitives

1. Implement composition support + primitives capability
2. Add composition editor UI + primitive presets

## Phase 5 — Envelope editor (optional / guarded)

1. Implement envelope support in plugin (API/device gated)
2. Add envelope editor UI (list first, graph later)

## Phase 6 — Tests + CI + devcontainer

1. Add TS unit tests (validators + presets)
2. Add Rust unit tests (request clamping/validation)
3. Add Kotlin unit tests (effect builder mapping)
4. Add CI workflows
5. Add devcontainer + documentation

# Toolchain and prerequisites

The devcontainer provides most of this automatically.

- Node 20 + pnpm
- Rust stable + clippy/rustfmt
- Android SDK + NDK
- JDK 17
- Tauri v2 CLI via `@tauri-apps/cli` (preferred) and/or `cargo tauri`

# Workspace configuration

## `pnpm-workspace.yaml`

```yaml
packages:
  - "plugin/*"
```

## Root `package.json` (scripts)

```json
{
  "name": "haptics-lab",
  "private": true,
  "packageManager": "pnpm@10.29.3",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",

    "tauri": "tauri",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build",

    "android:init": "tauri android init",
    "android:dev": "tauri android dev",
    "android:build": "tauri android build",

    "lint": "eslint .",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run",

    "rust:fmt": "cargo fmt --all --check",
    "rust:clippy": "cargo clippy --workspace --all-targets --all-features -- -D warnings",
    "rust:test": "cargo test --workspace",

    "ci": "pnpm lint && pnpm typecheck && pnpm test && pnpm rust:fmt && pnpm rust:clippy && pnpm rust:test"
  },
  "dependencies": {
    "@mui/material": "^6.0.0",
    "@emotion/react": "^11.0.0",
    "@emotion/styled": "^11.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",

    "@liminal-hq/plugin-haptics": "workspace:*",
    "@liminal-hq/plugin-material-you": "^0.0.0"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2.0.0",
    "@tauri-apps/api": "^2.0.0",

    "typescript": "^5.0.0",
    "vite": "^6.0.0",
    "vitest": "^2.0.0",
    "eslint": "^9.0.0",
    "@eslint/js": "^9.0.0",
    "globals": "^15.0.0",
    "typescript-eslint": "^8.0.0"
  }
}
```

Notes:

- Pin versions in real repo once you generate it; the exact numbers above are placeholders.
- `@liminal-hq/plugin-material-you` version depends on where you publish it; you can also use a git dependency.

# Tauri configuration

## `src-tauri/tauri.conf.json`

```json
{
  "$schema": "../node_modules/@tauri-apps/cli/schema.json",
  "productName": "Haptics Lab",
  "identifier": "ca.liminalhq.hapticslab",
  "build": {
    "beforeDevCommand": "pnpm dev",
    "beforeBuildCommand": "pnpm build",
    "devUrl": "http://localhost:5173",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "title": "Haptics Lab",
        "width": 1000,
        "height": 720
      }
    ]
  },
  "plugins": {
    "materialYou": {
      "cssVariablesPrefix": "m3"
    },
    "haptics": {
      "defaultUsage": "touch",
      "respectSystemHapticsSetting": true,
      "stopBeforePlay": true,
      "maxDurationMs": 10000,
      "maxAmplitude": 255,
      "allowRepeatingWaveforms": false
    }
  }
}
```

# Rust workspace

Create a root `Cargo.toml` workspace so CI can run `cargo test --workspace`:

## `Cargo.toml` (repo root)

```toml
[workspace]
resolver = "2"
members = [
  "src-tauri",
  "plugin/tauri-plugin-haptics"
]
```

# `src-tauri` wiring

## `src-tauri/Cargo.toml`

```toml
[package]
name = "haptics-lab"
version = "0.1.0"
edition = "2021"

[dependencies]
ta u r i = { version = "2" }

# Local plugin
 ta u r i-plugin-haptics = { path = "../plugin/tauri-plugin-haptics" }

# Material You plugin (choose one):
# A) crates.io
# tauri-plugin-material-you = "x.y.z"
# B) git
# tauri-plugin-material-you = { git = "...", rev = "..." }
```

## `src-tauri/src/lib.rs`

```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_haptics::init())
    .plugin(tauri_plugin_material_you::init())
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
```

# Haptics plugin (package)

Implement the plugin per the “tauri-plugin-haptics” canvas spec:

- Rust plugin exposes: `capabilities`, `play`, `stop`
- Kotlin Android implementation uses `Vibrator` + `VibrationEffect`
- JS guest bindings provide a nice TS interface

Key decisions for MVP:

- Only require Android API 26+.
- Implement oneshot + waveform first.
- Composition + envelope are gated by capability checks.

# JS guest bindings (package)

The JS guest bindings live inside the plugin at `plugin/tauri-plugin-haptics/guest-js` and should publish as `@liminal-hq/plugin-haptics`.

Minimal `guest-js/package.json`:

```json
{
  "name": "@liminal-hq/plugin-haptics",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "lint": "eslint ."
  },
  "dependencies": {
    "@tauri-apps/api": "^2.0.0"
  }
}
```

# React UI (MUI + Material You)

## UI screens

Match the earlier Haptics Lab spec (library, designer, player, device inspector). MVP is:

- Single page with:
  - Capabilities panel
  - “Play Click”
  - “Stop”
  - “Play Waveform” using a built-in preset

## Theming strategy

- Treat Material You as the source of truth.
- Keep a fallback theme so desktop builds look good.

Implementation approach:

- Create a `MaterialYouThemeProvider` that:
  - Reads initial palette from `@liminal-hq/plugin-material-you`
  - Subscribes to palette changes (if supported)
  - Converts to MUI `createTheme({ palette })`

### `src/theme/materialYou.ts`

Responsibilities:

- `getMaterialYouPalette(): Promise<PaletteLike>`
- `subscribeMaterialYouPalette(cb)`
- `toMuiTheme(paletteLike)`

### `src/main.tsx`

Wrap the app:

- `<MaterialYouThemeProvider><App /></MaterialYouThemeProvider>`

# Validation and safety rules (must exist in both UI and plugin)

- Clamp durations and amplitudes.
- Reject obviously invalid payloads (mismatched arrays, empty patterns).
- Repeat/looping is opt-in.
- Provide an always-available “Stop”.

# Tests

## TypeScript (Vitest)

- Validate waveform: sizes match, non-negative durations, total duration clamped
- Validate composition: primitives exist (based on caps)
- Preset serialization: round-trip JSON stable

Suggested folders:

- `src/app/haptics/__tests__/validate.test.ts`
- `src/app/haptics/__tests__/presets.test.ts`

## Rust

- Unit tests in `plugin/tauri-plugin-haptics/src/`:
  - `validate_and_clamp(req, cfg)` behaviour
  - repeat safety
  - amplitude clamping

## Kotlin

- Unit tests in plugin Android module:
  - `mapPrimitive()` mapping
  - `mapPredefinedEffect()` mapping
  - waveform downgrade behaviour when amplitude control is missing (tested via a small abstraction)

# GitHub workflows

## `.github/workflows/ci.yml`

Runs fast checks on PRs:

- pnpm install + cache
- lint + typecheck + vitest
- cargo fmt/clippy/test

Pseudo-contents:

- Use `actions/setup-node` + `pnpm/action-setup`
- Cache pnpm store
- Use `dtolnay/rust-toolchain` to install rust stable + components

## `.github/workflows/android.yml`

Runs Android build:

- Setup JDK 17
- Setup Android SDK + NDK
- Install Rust android targets
- `pnpm android:build`
- Upload APK/AAB artifacts

# Devcontainer

Start from the provided Threshold devcontainer and tweak:

- Rename the container.
- Keep the Android + Rust toolchain.
- Prefer the JS `@tauri-apps/cli` for `pnpm tauri ...`.
- Add Rust Android targets in `postCreateCommand`.

## `.devcontainer/devcontainer.json`

```json
{
  "name": "Haptics Lab Dev",
  "dockerFile": "Dockerfile",
  "forwardPorts": [5173, 1420],
  "customizations": {
    "vscode": {
      "extensions": [
        "rust-lang.rust-analyzer",
        "esbenp.prettier-vscode",
        "dbaeumer.vscode-eslint",
        "tauri-apps.tauri-vscode",
        "ms-vscode.vscode-typescript-next",
        "streetsidesoftware.code-spell-checker"
      ]
    }
  },
  "postCreateCommand": "pnpm install && rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android"
}
```

## `.devcontainer/Dockerfile`

Derive from your provided one with small tweaks:

- Keep Ubuntu 24.04 base
- Keep Tauri system deps + JDK 17 + Android SDK/NDK

```dockerfile
FROM mcr.microsoft.com/devcontainers/base:ubuntu-24.04

# Set Timezone to America/Toronto
ENV TZ="America/Toronto"
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Install Tauri system dependencies and build tools
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    build-essential \
    curl \
    wget \
    file \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev \
    libwebkit2gtk-4.1-dev \
    patchelf \
    xdg-utils \
    gstreamer1.0-plugins-base \
    gstreamer1.0-plugins-bad \
    fonts-noto-color-emoji \
    pkg-config \
    unzip \
    xvfb \
    vim\
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Android build dependencies
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    openjdk-17-jdk \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Node.js 20.x
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g pnpm

# Switch to non-root user 'vscode' (provided by base image)
USER vscode
ENV HOME=/home/vscode
ENV EDITOR=vim

# Configure pnpm global bin path
ENV PNPM_HOME=$HOME/.local/share/pnpm

# Configure Rust paths
ENV RUSTUP_HOME=$HOME/.rustup
ENV CARGO_HOME=$HOME/.cargo

# Set JAVA_HOME for Android builds
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64

# Configure Android SDK paths
ENV ANDROID_HOME=$HOME/Android/Sdk
ENV ANDROID_SDK_ROOT=$ANDROID_HOME

# Update PATH to include pnpm, cargo, Java, and Android tools
ENV PATH=$PNPM_HOME:$CARGO_HOME/bin:$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/build-tools/36.0.0:$PATH

# Install Android SDK Command Line Tools
RUN mkdir -p $ANDROID_HOME/cmdline-tools && \
    cd $ANDROID_HOME/cmdline-tools && \
    wget -q https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip && \
    unzip -q commandlinetools-linux-11076708_latest.zip && \
    rm commandlinetools-linux-11076708_latest.zip && \
    mv cmdline-tools latest

# Accept Android SDK licenses and install required SDK components for building
# Using --channel=0 for parallel downloads (faster installation)
RUN yes | sdkmanager --licenses && \
    sdkmanager --channel=0 --install \
    "platform-tools" \
    "platforms;android-36" \
    "build-tools;36.0.0" \
    "ndk;28.2.13676358"

# Install Rust toolchain (stable)
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable \
    && rustup component add clippy rustfmt

# Install experimental Tauri CLI for portable AppImage builds
RUN cargo install tauri-cli \
    --git https://github.com/tauri-apps/tauri \
    --branch feat/truly-portable-appimage \
    --force

# Default to portable AppImage format to avoid EGL issues on modern distros
ENV TAURI_BUNDLER_NEW_APPIMAGE_FORMAT=true

# Create pnpm home directory to ensure permissions are correct
RUN mkdir -p $PNPM_HOME
```

# Readmes and agent instructions

## Root `README.md`

Must include:

- What the repo is
- Prereqs (or “use the devcontainer”)
- Commands:
  - `pnpm install`
  - `pnpm tauri:dev`
  - `pnpm android:init`
  - `pnpm android:dev -- --open`
  - `pnpm android:build`
- Where the plugin lives
- How to run tests: `pnpm ci`

## `plugin/tauri-plugin-haptics/README.md`

Must include:

- API contract (commands + EffectRequest examples)
- Capability gating rules
- Android minimum versions
- Safety clamps

## `AGENTS.md`

This repo is intended to be built by an autonomous coding agent. The following rules are mandatory and should be treated as the project’s operating system.

### Localization and spelling

- All UI strings, code identifiers, comments, commit messages, pull request descriptions, and documentation MUST use **Canadian English** spelling.
  - Examples: `colour`, `centre`, `neighbour`, `cancelled`, `licence` (noun) / `license` (verb).

### Commit messages

- Use **Conventional Commits**: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`.
- Use `test:` for test-only changes (including fixing tests).
- Commit bodies:
  - Explain the changes
  - Use markdown for emphasis and lists.
  - **No markdown headings** in commit bodies. Use **bold labels** if you need sections.
- Commits must reflect the specific change in that commit (no “mega recaps”).

### Git workflow

- **Do not push** to the remote (including force-push) unless explicitly requested by the user.
- Keep changes small and reviewable; prefer incremental PR-sized commits.

### Code organisation

- This is a `pnpm` workspace monorepo.
- `app/haptic-lab/` contains the Tauri application.
- `plugin/tauri-plugin-haptics/` contains the plugin (Rust + Android Kotlin + JS guest bindings).
- `docs/` contains repo-level documentation.

### Best practices

- **No barrel files**: do not create `index.ts` files that re-export modules. Import directly from specific files.
- Prefer existing helpers over re-implementing logic. Create shared helpers when a pattern repeats.
- Keep builds green: every phase must compile and tests must pass before moving on.
- Safety-first defaults:
  - Never enable repeating haptics by default.
  - Always keep an immediate “Stop” path wired through UI → plugin.

### UI project structure (React + MUI)

Within `app/haptic-lab/src/`:

- `components/` reusable, mostly “dumb” UI components.
- `screens/` full-page views.
- `hooks/` custom hooks.
- `services/` business logic / singletons.
- `theme/` MUI theme + Material You integration.
- `context/` React providers.

### Tauri v2 rules

- Use Tauri v2 APIs. Avoid v1 patterns.
- Platform detection:
  - Use `@tauri-apps/plugin-os` `platform()` for compile-time platform detection.
- Prefer Tauri plugins over browser Web APIs where available.
- **Capabilities system is required**:
  - v1 `allowlist` does not exist.
  - Define capabilities in `app/haptic-lab/src-tauri/capabilities/`.
  - Ensure plugin commands are explicitly allowed.

### Plugin development rules (Android)

- Plugins must own Android permissions via build-time injection.
  - Use `tauri_plugin::mobile::update_android_manifest()` from `build.rs`.
  - Use a permissions manifest block identifier like `tauri-plugin-haptics.permissions`.
  - Permissions go in the injected block; keep components in the library manifest.
  - Never require app developers to manually edit Android manifests.
- Kotlin implementation must be capability-gated:
  - If a feature is unsupported on the device/SDK (amplitude control, composition primitives, envelopes), degrade gracefully and return `downgraded` info.

### Implementation strategy for autonomous agents

- Build in phases (see “Build phases” in this document).
- Each phase must include:
  - A user-visible demo affordance in the UI (button/preview).
  - Tests for new logic (TS and/or Rust; Kotlin where practical).
  - Documentation updates (README and relevant docs).
- Keep the public JS contract stable:
  - `capabilities()`, `play(req)`, `stop()` are the core contract.
  - Changes to request/response shapes require updating docs + tests.

# Step-by-step (human quickstart)

1. Open in devcontainer
2. Install deps:
   - `pnpm install`
3. Desktop dev:
   - `pnpm tauri:dev`
4. Add Android target:
   - `pnpm android:init`
5. Android dev:
   - `pnpm android:dev -- --open`
6. Build Android:
   - `pnpm android:build`

# Definition of Done

Repo is “done” when:

- Desktop dev works
- Android dev works on a physical device
- UI can:
  - show capabilities
  - play oneshot
  - play waveform
  - stop haptics instantly
- CI passes on PRs
- Android workflow produces build artifacts
- Devcontainer builds and `postCreateCommand` succeeds
- Docs are sufficient for an autonomous agent to build and iterate

