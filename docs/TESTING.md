# Testing Strategy

## Unit Tests

### JavaScript / TypeScript

Run Vitest for frontend and guest binding logic:

```bash
pnpm test
```

### Rust

Run cargo tests for the plugin backend:

```bash
pnpm rust:test
```

## Manual Verification

1. **Desktop**: Run `pnpm tauri:dev` to verify the UI loads and falls back gracefully (haptics will error or no-op).
2. **Android**:
   - Connect a device.
   - Run `pnpm android:dev`.
   - Watch the launch splash: the icon animates and the phone vibrates in time with its shake (about 480 ms, then still), then the home screen appears. Tapping the splash skips it and stops the vibration. On a device with envelope support the vibration is an envelope, otherwise a waveform.
   - Verify capabilities are detected.
   - Test "Play Click", "One Shot", and "Waveform" buttons.
   - Verify "Stop" cancels vibration immediately.
