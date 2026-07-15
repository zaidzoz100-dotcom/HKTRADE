---
name: Clerk Expo Android native module crash
description: "@clerk/expo versions >=3.4.0 crash on Android in Expo Go with 'Cannot find native module ClerkExpo' — how to diagnose and the safe fix."
---

## Symptom

Android (via Expo Go, not the web preview) crashes at app load with:

```
Cannot find native module 'ClerkExpo'
```

The web/browser preview does NOT reproduce this — it only affects native (iOS/Android) runtimes, and in practice only Android has been confirmed broken this way.

## Root cause

Starting at `@clerk/expo@3.4.0`, the package ships a per-platform native module spec. The Android variant (`dist/specs/NativeClerkModule.android.js`) calls `expo.requireNativeModule("ClerkExpo")` — the *enforcing* loader, which throws synchronously at import time if the native module isn't compiled in. Since Expo Go only bundles Expo's own first-party native modules, any third-party native module (including this one) is always unavailable there, and the throw happens at module-load time, outside any try/catch in the caller (`utils/native-module.js` wraps the *access*, not the top-level `require`).

Versions `3.0.0`–`3.3.1` have no Android-specific spec file at all, so Android falls back to the generic spec that uses `requireOptionalNativeModule` (safe, returns `null` on failure) — these versions do not crash under Expo Go.

## Fix

Pin `@clerk/expo` to `3.3.1` (last version before the Android enforcing-require regression) in the Expo app's `package.json`, then `pnpm install`. This stays on the Core v3 SDK API (no breaking changes vs. 3.7.x), so no app code changes are needed — only the version pin.

**Why 3.3.1 specifically:** verified by downloading and inspecting the `dist/specs/NativeClerkModule.android.js` file across the 3.x version range — 3.3.1 is the newest version without the file, 3.4.0 is the first version with it.

**How to apply:** if `@clerk/expo` is later bumped (e.g. by a dependency update or the clerk-auth skill's install command omitting a version pin), re-check whether the crash resurfaces on native and re-pin, or verify upstream has fixed the Android spec to use the optional loader before unpinning.
