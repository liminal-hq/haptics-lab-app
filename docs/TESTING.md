# Testing Strategy

## Unit Tests

### JavaScript / TypeScript

Run Vitest for frontend and guest binding logic:

```bash
bun run test
```

### Rust

Run cargo tests for the plugin backend:

```bash
bun run rust:test
```

## Manual Verification

1. **Desktop**: Run `bun run tauri:dev` to verify the UI loads. Every play resolves at tier 0 with the reason "No vibrator on this platform" and nothing errors.
2. **Android**:
   - Connect a device.
   - Run `bun run android:dev`.
   - Watch the launch splash: the icon animates and the phone vibrates in time with its shake (about 480 ms, then still), then the home screen appears. Tapping the splash skips it and stops the vibration. On a device with envelope support the vibration is an envelope, otherwise a waveform.
   - Verify capabilities are detected.
   - Test "Play Click", "One Shot", and "Waveform" buttons.
   - Verify "Stop" cancels vibration immediately.

### On-device checklist

Run on the test phone (a Pixel 8 Pro: primitives and amplitude control, no envelope hardware) after installing the CI debug APK. Keep the phone awake and unlocked, because touch-usage vibrations are ignored when the screen is off.

- **Device tab**: the tier ladder highlights tier 3; envelope effects read "Not on this actuator"; every primitive shows a measured duration; resonant frequency is reported; "Preview a weaker phone" greys out tier 4 with the reason.
- **Capabilities**: `topTier` is 3 and `touchFeedbackEnabled` matches Settings → Sound & vibration → Touch feedback.
- **Raw**: every mode plays and none throws. The predefined tiles show what the device confirms. A composition with a missing primitive names the neighbour. Envelope is greyed with a banner, and Play falls back to a tick and the transport says so.
- **Touch feedback off**: a `touch` play and the UI lane tiles stay silent and the transport says "Touch feedback is off in system settings"; a `media` pattern still plays.
- **Bench**: the hurt cue compiles at tier 3, tier 2 and tier 1 and each feels different; Stop ends playback immediately.
- **Cues**: "Every cue at every tier" runs without errors and Stop ends it.
- **Compare**: the strength ladder finds a felt threshold; the policy bench Fire button shows the played, queued and dropped results in Results.
- **Theme**: the lab follows the wallpaper colours.
- **Splash**: the icon animates and the phone vibrates in time.

Older Android versions (API 33 and below) and devices with a different feature set can't be tested on the Pixel 8 Pro, so those fallbacks rely on unit tests.
