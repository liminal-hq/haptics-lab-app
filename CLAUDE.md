# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Haptics Lab is a Tauri v2 app for exploring, authoring and replaying haptic patterns on Android, built on its own `tauri-plugin-haptics` (Rust core, Android Kotlin, TypeScript guest bindings). See `AGENTS.md` for the authoritative contributor conventions — most importantly: **Canadian English** spelling everywhere; **Conventional Commits** for commit messages but human-readable, prefix-free **PR titles**; Apache-2.0 licence headers on new source files; and never pushing unless asked.

## Status

Early development. The plugin plays one-shot, waveform, predefined, composition and envelope (API 36+) effects and reports capabilities. The app has a capabilities readout, one-shot and click buttons, a waveform editor with repeat, and an envelope editor. Composition editing, a pattern library and import/export are not built yet. Kotlin changes are only verifiable under JDK 17 and on a device — say so in PR test plans when you couldn't.

## Layout

pnpm workspace plus Cargo workspace; `AGENTS.md`'s [Repository Layout](AGENTS.md#repository-layout) is authoritative.

- `app/haptics-lab/` — the Tauri app (React + MUI in `src/`, Rust shell and capabilities in `src-tauri/`).
- `plugin/tauri-plugin-haptics/` — the plugin: `src/` Rust, `android/` Kotlin (`HapticsPlugin.kt`), `guest-js/` TypeScript, `permissions/`.
- `plugin/tauri-plugin-material-you/` — vendored theme plugin.
- `SPEC.md`, `docs/` — contract, blueprint, testing strategy.

## Commands

- `pnpm install` — install workspace dependencies.
- `pnpm tauri:dev` — run the desktop shell (no vibrator; haptics downgrade or no-op).
- `pnpm android:dev` / `pnpm android:build` — run or build on an Android device or emulator (needs JDK 17, SDK and NDK).
- `pnpm ci` — the local gate that mirrors CI: `format:check`, `lint`, `typecheck`, `test`, `rust:fmt`, `rust:clippy`, `rust:test`. Must pass before opening or updating a PR.
- `pnpm format` — Prettier write. `pnpm test` — Vitest.
- `cd app/haptics-lab/src-tauri/gen/android && ./gradlew :tauri-plugin-haptics:compileDebugKotlin` — compile the plugin's Kotlin (JDK 17).

## Architecture — the key things to understand

- **One contract, three languages.** A request shape lives in `guest-js/src/types.ts`, `src/models.rs` and the Kotlin parser in `HapticsPlugin.kt`. Change all three together, plus `SPEC.md` and tests.
- **Capability-gated, never silent.** Unsupported features return `downgraded` and `downgradeReason`; `capabilities()` exposes limits (including `envelopeInfo`) so the UI validates before playing. See `AGENTS.md` → Haptics Plugin Rules.
- **Safety defaults.** Repeating waveforms are opt-in via config, duration and amplitude are capped, and Stop is always wired.
- **Envelope amplitude is 0–1** (unlike waveform amplitude, 0–255), with frequencies bounded by the device frequency profile.
- **Pure logic out of components.** Validation and payload building live in `src/utils/` with unit tests.
- **Capabilities ACL.** New plugin commands need `permissions/default.toml` entries and a grant in `src-tauri/capabilities/`, or `invoke()` silently fails.

## Conventions (from AGENTS.md)

- **PR titles**: human-readable, imperative, sentence case, ~70 chars, **no Conventional Commit prefix**. Descriptions use `## Summary` + `## Test plan` (checklists, concrete commands, explicit gaps). Every PR gets a category label (`enhancement`, `bug`, `documentation`, …) plus scope labels (`android`, `tauri`, …). PRs open ready for review, not as drafts. Stacked PRs say what they're stacked on.
- **Commits**: Conventional Commits with markdown bodies (what/why, `test:` for test-only changes); backtick every code-level reference; hard-wrap bodies; write bodies to a file and `git commit -F` when they contain backticks.
- **Licence headers** on new `.ts`/`.tsx`/`.js`/`.rs`/`.kt` files: one-line summary + `(c) Copyright 2026 Liminal HQ, Scott Morris` + `SPDX-License-Identifier: Apache-2.0`.
- **Docs sync**: contract or behaviour changes update `SPEC.md`, `README.md` and the relevant `docs/` page in the same change.
- **No hard wrapping**: one line per markdown paragraph or list item; commit bodies are the exception.
- **Em dashes**: use a real `—`, never `--` as a substitute (not for CLI flags).
- **Authoring voice**: write comments, docs and PR text as the author of the artifact — no "this PR", reviewer names or commit SHAs. Commit messages are the exception.
- **No barrel files**: import from the defining file.
- **Git**: never push (especially force-push), push tags or dispatch workflows unless explicitly asked; prefer the `gh` CLI. Don't commit scratch files (`*.log`, `DEVCONTAINER_NEXT_PLAN.md`, `sample-error-images/`).

Keep this file and `AGENTS.md` in sync: when a convention changes there, update the summary here in the same PR.
