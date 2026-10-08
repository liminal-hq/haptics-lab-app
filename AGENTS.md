# AGENTS.md

This repository is built largely by autonomous coding agents. The rules below are mandatory and are the project's operating system. They follow the Liminal HQ house conventions shared with Cadence, Waypoint, Flicker and the org `.github` repo, tailored to this repo.

## Table of Contents

- [Project Status](#project-status)
- [Localization and Spelling](#localization-and-spelling)
- [Markdown Formatting](#markdown-formatting)
- [Authoring Voice](#authoring-voice)
- [Commit Messages](#commit-messages)
- [Pull Request Titles](#pull-request-titles)
- [Pull Request Content](#pull-request-content)
- [Pull Request Labels](#pull-request-labels)
- [Git Workflow](#git-workflow)
- [Local Tooling](#local-tooling)
- [Logging](#logging)
- [CI and Android Builds](#ci-and-android-builds)
- [Frontend Code Conventions](#frontend-code-conventions)
- [Documentation](#documentation)
- [Repository Layout](#repository-layout)
- [Licence and Copyright](#licence-and-copyright)
- [Tauri v2](#tauri-v2)
- [Haptics Plugin Rules](#haptics-plugin-rules)
- [Implementation Strategy](#implementation-strategy)

## Project Status

Haptics Lab is an early-stage Tauri v2 app for exploring, authoring and replaying haptic patterns on Android, built on a purpose-written `tauri-plugin-haptics`. The plugin plays one-shot, waveform, predefined, composition and (Android 16 / API 36+) envelope effects, and reports device capabilities. The app opens on a short splash (the animated app icon with a matching vibration) and then shows a small UI: capabilities readout, one-shot and click buttons, a waveform editor and an envelope editor. Composition editing, a pattern library and import/export are still to come. See `SPEC.md` and `docs/` for the plan.

## Localization and Spelling

**REQUIREMENT:** All UI strings, code identifiers, comments, commit messages, pull request descriptions and documentation MUST use **Canadian English** spelling, unless exact external spelling is required by a tool, API, platform interface or published identifier (for example Android's `VibrationEffect`, CSS `color`, or `tauri.conf.json` keys).

- `colour`, `centre`, `neighbour`, `behaviour`, `cancelled`
- `licence` (noun) and `license` (verb)

## Markdown Formatting

**REQUIREMENT:** Do not hard-wrap markdown prose. Write each paragraph or bullet as a single unwrapped line and let the renderer reflow it. This applies to PR descriptions, `docs/`, README files and `SPEC.md`. Commit message bodies are the exception — hard-wrap those (see [Commit Messages](#commit-messages)). Code comments are not markdown and may wrap normally.

**Em dashes:** use a real em dash (`—`) in prose, never `--` as a substitute. This does not apply to a genuine double hyphen such as a CLI flag.

## Authoring Voice

**REQUIREMENT:** Ship the result, not how the conversation arrived at it. Write code comments, identifier names, docs and PR descriptions as the author of the artifact, for the reader who will meet it later.

- Do not reference "this PR", "the review", a reviewer's name or a commit SHA in code comments or PR prose. State the fact or reasoning directly.
- When a comment is edited more than once, rewrite it as one clean explanation.
- Commit messages are the exception: they are the right place to record _why_ a change happened, including review feedback or debugging context.

## Commit Messages

**Format:** Conventional Commits — `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`, `ci:`, `build:`.

- Use `test:` for test-only changes, including fixes to tests themselves. Use `fix:` only for fixes to application code.
- Use `ci:` or `build:` when the primary change is workflow or build behaviour.

**Body requirements:**

- Explain what and why, not how.
- Use markdown: **bold**, _italics_, `code`, flat bullets.
- **Backtick every code-level reference** — identifiers, file paths, package and crate names, config keys, CLI flags. User-facing UI strings use quotes instead.
- **No markdown headings** in commit bodies. Use **bold labels** if sections help.
- Hard-wrap paragraphs at roughly 72–100 characters.
- Each commit reflects the specific change in that commit, not the whole branch history.

**Shell interpolation safety:**

- Do not pass markdown-heavy bodies through `git commit -m "..."` when they contain backticks, `$()` or other shell-sensitive characters.
- Write the message to a file with a single-quoted heredoc and commit with `git commit -F <file>`.
- Verify with `git log -1 --pretty=fuller` and amend immediately if interpolation altered the message.

## Pull Request Titles

**REQUIREMENT:** PR titles are human-readable summaries of the change.

- Start with a capital letter, write in the imperative mood, and keep to roughly 70 characters.
- **No Conventional Commit prefixes** (`feat:`, `fix:`, `chore:`).
- Describe the outcome or behaviour change, not internal process.
- Keep title style consistent across every open PR in the same stack, and update the rest of the stack when one title changes.
- Do not rename merged PRs unless asked.

## Pull Request Content

**REQUIREMENT:** PR titles and descriptions must not mention internal workflow artefacts such as local planning files, scratch notes or agent queue labels. Use outcome-focused language.

- Open PRs ready for review. Draft only when the user asks, or when a clearly communicated blocker requires it.
- Use `## Summary` and `## Test plan`.
- Under `## Summary`, use `###` subsections only when they separate materially different kinds of change. Good defaults: `### User-facing changes`, `### Plugin`, `### Android`, `### Documentation`, `### Known limitations`.
- Under each section, use flat bullets with **bold lead-ins**.
- Keep the summary on behaviour and contract changes, not commit chronology.
- Under `## Test plan`, use checklist bullets (`- [x]` / `- [ ]`) with the concrete commands run. State plainly what was **not** verified — for this repo that usually means Kotlin compilation (needs JDK 17) and on-device playback.
- For stacked PRs, say which PR the branch is stacked on, and retarget to `main` once the base merges.

## Pull Request Labels

**REQUIREMENT:** Every PR carries at least one primary category label, plus scope labels where useful.

- Primary: `enhancement`, `bug`, `documentation`, `testing`, `ci`, `build`, `chore`.
- Shared operational: `infrastructure`, `internal`, `release`, `blocked`, `epic`, `skip-changelog`.
- Scope labels that exist in this repo: `android`, `tauri`, `devcontainer`. Create further scope labels (for example `plugin`, `frontend`, `rust`) when they would help, rather than overloading an existing one.
- Use GitHub categories like `enhancement` and `bug`, not `feat` or `fix`.
- Keep labels accurate as scope changes.

## Git Workflow

- **Do not push** (especially force-push), push tags, or dispatch workflows unless the user explicitly asks. Approval to push one branch does not extend to others.
- Keep changes small and reviewable; prefer incremental, PR-sized commits. Split implementation, validation and docs into separate contextual commits when natural.
- Branch names: `feat/<short-description>`, `docs/<short-description>`, `chore/<short-description>`; for fixes, `fix/issue-<number>-<short-description>`.
- **Updating a PR branch is always a rebase.** Bring a branch up to date with `git rebase origin/main`; never merge `main` (or any other branch) into a feature branch. Pushing the rewritten branch needs `git push --force-with-lease`, which is fine on your own open PR branches once the user has asked for the push — never plain `--force`, and never force-push `main`.
- **Stacked PRs:** record the base branch's tip before rebasing it, then move the next branch with `git rebase --onto <new-base> <old-base-tip> <branch>`. When the base PR merges, retarget the next PR to `main` and rebase it; git drops commits that are already in `main`.
- **Landing a PR is always a merge commit** (`gh pr merge <number> --merge`), only when the user asks. Merge stacked PRs from the bottom up.
- Prefer the `gh` CLI for repository, PR, label, review and Actions work.
- Do not commit local planning or scratch files (for example `DEVCONTAINER_NEXT_PLAN.md`, `sample-error-images/`, `*.log`) unless asked.

## Local Tooling

- **Package manager:** `pnpm` workspaces. Node 20+, pnpm 10+, Rust stable, and the Android SDK, NDK and **JDK 17** for Android builds. Gradle 8.x does not run on newer JDKs; if only a newer JDK is installed, use the devcontainer or the shared `ghcr.io/liminal-hq/tauri-dev-mobile:latest` image.
- **Formatting:** Prettier (`.prettierrc`: tabs, single quotes, 100 columns, trailing commas). `.editorconfig` is authoritative.
- **Validation gate:** `pnpm ci` (format check, ESLint, `tsc -b`, Vitest, `cargo fmt`, `cargo clippy -D warnings`, `cargo test`) must pass before opening or updating a PR. Run it, and report anything it could not run.
- **Android plugin changes:** also compile the Kotlin (`./gradlew :tauri-plugin-haptics:compileDebugKotlin` in `app/haptics-lab/src-tauri/gen/android`) and, where hardware allows, test on a device. If you cannot, say so in the PR test plan.
- **Agent automation:** use `pnpm tauri:dev` to drive the desktop shell with the Tauri MCP tooling. Desktop has no vibrator, so haptics calls resolve with downgrade or no-op behaviour — real playback needs `pnpm android:dev` on a device.

## Logging

Native and webview output share one `tauri-plugin-log` stream, configured in `src-tauri/src/lib.rs` (`Trace` in debug builds, `Info` in release; each line has a timestamp, level and target). `src/services/logger.ts` redirects every webview `console.*` call into it, and `main.tsx` calls `initLogger('main')` once at startup. On Android the stream is visible in `adb logcat`.

- `initLogger(windowLabel)` is a no-op outside a Tauri webview, is safe to call twice, prefixes each message with the window label, tags it with the real caller file and line, and never lets a failing bridge call surface as an unhandled rejection. `console.log` forwards as `info`.
- Every window entry calls `initLogger(label)` once; a new window kind must too.
- Use `log::{trace,debug,info,warn,error}!` in Rust, `Log.*` in Kotlin and `console.*` in the front end. Do not add a second logging path.
- Never log secrets, credentials or full file contents.
- Each window must be granted `log:default`, which `capabilities/logging.json` does; add new windows to its `windows` list, or forwarding fails silently.

## CI and Android Builds

CI follows the Liminal HQ house pipeline and runs in the shared images (`ghcr.io/liminal-hq/tauri-ci-desktop` and `tauri-ci-mobile`), which keep `RUSTUP_HOME` and `CARGO_HOME` under `/usr/local` so `cargo` works in GitHub container jobs.

- **`ci.yml`** runs lint, typecheck, tests, `cargo fmt`, `cargo clippy` and `cargo test` on every PR and push to `main`.
- **`android.yml`** compiles a release build on every PR and uploads the unsigned APK. It proves the Android build works; the file cannot be installed as is.
- **`android-apk.yml`** is the installable build. It is manual: `gh workflow run android-apk.yml --ref <branch>` builds an arm64 debug APK and uploads it as the `haptics-lab-debug-apk` artifact for 14 days. Add `-f publish_draft_release=true` to also attach it to a draft pre-release for a direct phone download. The workflow file must exist on `main` for `workflow_dispatch` to find it.
- **Stable debug key:** the `ANDROID_DEBUG_KEYSTORE_BASE64` repository secret holds the debug keystore, restored into `ANDROID_USER_HOME` so every CI build is signed with the same key and installs over the previous one. The job summary prints the signing certificate's SHA-256 digest to check against. Without the secret each build gets a throwaway key and the previous install must be removed first.
- **Installing:** `gh run download <run-id> -n haptics-lab-debug-apk`, then `adb install -r <file>.apk`.
- Android launcher icons are generated into the git-ignored `gen/android` project, so builds run `pnpm icons` after `android:init`.

## Frontend Code Conventions

- **No barrel files.** Do not create an `index.ts` that only re-exports siblings. Import directly from the file that defines the thing. (The plugin's `guest-js/src/index.ts` is the package entry point and holds the real command wrappers, so it is not a barrel.)
- Prefer existing helpers over re-implementing logic, and extract shared helpers when a pattern repeats.
- Keep logic that can be pure out of components (see `utils/envelope.ts`) so it is unit-testable without rendering.
- Within `app/haptics-lab/src/`: `components/` reusable UI, `screens/` full-page views, `hooks/` custom hooks, `services/` business logic and singletons, `theme/` MUI theme and Material You integration, `context/` providers, `utils/` pure helpers.
- Keep builds green: every change must compile and pass tests before moving on.

## Documentation

- Update `README.md`, `SPEC.md` and the relevant `docs/` page in the same change when behaviour, the plugin contract or platform requirements change.
- Keep `docs/TESTING.md` aligned with how the app is actually verified.
- Keep `CLAUDE.md` in sync: when a convention changes here, update its summary in the same PR.
- No hard wrapping — see [Markdown Formatting](#markdown-formatting).

## Repository Layout

pnpm workspace monorepo plus a Cargo workspace.

- `app/haptics-lab/` — the Tauri app: React and MUI frontend in `src/`, Rust shell in `src-tauri/`, capabilities in `src-tauri/capabilities/`.
- `plugin/tauri-plugin-haptics/` — the haptics plugin: Rust core (`src/`), Android Kotlin (`android/`), TypeScript guest bindings (`guest-js/`) and permissions (`permissions/`).
- `plugin/tauri-plugin-material-you/` — vendored Material You palette plugin.
- `docs/` — specs, blueprint and testing strategy. `SPEC.md` at the root is the plugin and app contract summary.
- `assets/` — authored visual assets such as `hero.svg`.
- `docker/` — CI and devcontainer image definitions.

## Licence and Copyright

The repository is licensed under Apache-2.0 (`LICENSE`).

**REQUIREMENT:** New authored source files (`.ts`, `.tsx`, `.js`, `.rs`, `.kt`) include a header as the first content in the file:

```text
// Brief one-line summary of what this file does.
//
// (c) Copyright 2026 Liminal HQ, Scott Morris
// SPDX-License-Identifier: Apache-2.0
```

- The first line is a concise one-sentence summary with no trailing period.
- Place the header before any `package`, `use` or `import` statement, followed by one blank line.
- Do not add headers to generated files, config (`.toml`, `.json`, `.yml`), markdown or lockfiles.
- Existing files without headers get one when they are substantially touched, not in drive-by edits.

## Tauri v2

Use Tauri v2 APIs and patterns. Avoid v1 patterns.

- **Platform detection:** use `@tauri-apps/plugin-os` `platform()`, which is synchronous and decided at compile time.
- Prefer Tauri plugins over browser Web APIs where available. Most Tauri v2 APIs are async.
- **v1 pitfalls:** `tauri` config key → `app`; `build.distDir` → `frontendDist`; `build.devPath` → `devUrl`; `allowlist` is removed. `@tauri-apps/api` exports only `core`, `path`, `event` and `window`; the rest moved to `@tauri-apps/plugin-*`.
- **Capabilities are required.** Define them in `app/haptics-lab/src-tauri/capabilities/`. Installing a plugin is not enough — permissions must be granted. Every plugin command needs a matching entry in the plugin's `permissions/default.toml`, or `invoke()` silently fails the ACL check even though the Rust command exists.
- **Mobile plugin args:** Android plugin commands receive their arguments as a JSON payload, and Rust models use `camelCase` serde renames. Keep the Rust model, the TypeScript type and the Kotlin parser in agreement, and accept both camelCase and snake_case keys in Kotlin where the existing parser does.

## Haptics Plugin Rules

- **Public JS contract stays stable.** `capabilities()`, `play(req)` and `stop()` are the core contract. Changes to request or response shapes update `SPEC.md`, the TypeScript and Rust models, the Kotlin parser, docs and tests together.
- **Safety first.** Never enable repeating haptics by default (`allowRepeatingWaveforms` stays opt-in), keep duration and amplitude caps enforced in the plugin, and always keep an immediate **Stop** path wired UI → plugin.
- **Capability-gated and honest.** If a feature is unsupported on the device or SDK (amplitude control, composition primitives, envelopes), degrade gracefully and return `downgraded` with a `downgradeReason`. Never silently substitute a different effect. Surface capability limits through `capabilities()` so the UI can pre-validate.
- **Validate at the boundary.** Reject malformed requests with `INVALID_EFFECT` and a message naming the offending field or index.
- **Android permissions are owned by the plugin.** Inject them at build time with `tauri_plugin::mobile::update_android_manifest()` from `build.rs`, using the block identifier `tauri-plugin-haptics.permissions`. Never require app developers to edit Android manifests by hand.
- **API-level gating.** The plugin compiles against `compileSdk = 36`, `minSdk = 24`. Guard newer APIs behind `Build.VERSION.SDK_INT` checks and never reference them from code that runs on older devices.
- **Desktop is a stub.** `desktop.rs` reports no support; keep it accurate when capabilities change.

## Implementation Strategy

- Build in phases (see `SPEC.md` and `docs/haptics_lab_tauri_v_2_android_blueprint.md`).
- Each phase includes a user-visible demo affordance in the UI, tests for new logic (TypeScript and Rust; Kotlin where practical) and documentation updates.
- Stack dependent work as separate PRs, each reviewable on its own.
