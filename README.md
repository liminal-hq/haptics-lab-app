# Haptics Lab

A Tauri v2 application for exploring, authoring, and replaying haptic patterns on Android devices.

## Quickstart

This repo is configured as a `pnpm` monorepo.

### Prerequisites

- Node.js 20+
- pnpm 10+
- Rust stable
- Android SDK + NDK + JDK 17
- Tauri system dependencies (webkit2gtk, etc.)

Alternatively, use the provided Devcontainer which has everything pre-installed.

### Commands

| Command | Description |
| :--- | :--- |
| `pnpm install` | Install dependencies for all packages. |
| `pnpm tauri:dev` | Run the desktop development server. |
| `pnpm android:init` | Initialize the Android project (first run). |
| `pnpm android:dev` | Run the app on an Android device/emulator. |
| `pnpm android:build` | Build the Android APK/AAB. |
| `pnpm ci` | Run linting, typechecking, and tests. |

## Plugin

The haptics plugin source code is located in `packages/tauri-plugin-haptics`.
It includes:
- Rust core logic
- Android Kotlin implementation
- TypeScript guest bindings

## Testing

Run all checks locally:

```bash
pnpm ci
```
