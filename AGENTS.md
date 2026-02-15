# AGENTS.md

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
- `app/haptics-lab/` contains the Tauri application.
- `packages/tauri-plugin-haptics/` contains the plugin (Rust + Android Kotlin + JS guest bindings).
- `docs/` contains repo-level documentation.

### Best practices

- **No barrel files**: do not create `index.ts` files that re-export modules. Import directly from specific files.
- Prefer existing helpers over re-implementing logic. Create shared helpers when a pattern repeats.
- Keep builds green: every phase must compile and tests must pass before moving on.
- Safety-first defaults:
  - Never enable repeating haptics by default.
  - Always keep an immediate “Stop” path wired through UI → plugin.

### UI project structure (React + MUI)

Within `app/haptics-lab/src/`:

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
  - Define capabilities in `app/haptics-lab/src-tauri/capabilities/`.
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
