# Spec: the sun companion widget (Home/Lock Screen)

Status: **Android in progress; iOS implemented (pending first Xcode build).**
The iOS WidgetKit widget + deep-link plumbing now live in
`extension/ios/App/MindedWidget/` (see its README); they were written without a
macOS build available, so the first Xcode build is the real verification. This is
"option 1" from
`docs/ios-platform-fit.md` — the always-present, invitation-only sun, moved off
the dashboard bottom bar and onto the device home screen. It is the
entitlement-free, on-philosophy first step toward an iOS presence, and it is a
genuinely nice addition to Android in its own right.

## What it is

A calm sun sits on the home screen as an ambient companion — no numbers, no
streaks, no badge, nothing to grade. It is *living*: it tracks the day's natural
light, glowing as a soft dawn sun, the bright midday sun, a golden dusk, and the
moon at night. That is the whole of what it "shows" — where you actually are in
the day, reflected back as warmth and colour, never a metric. **Tapping it does
exactly what tapping the in-app dashboard sun does**: it opens the app's existing
interaction overlay, and the existing flow handles the exit the same way too. The
widget is just that companion, relocated to the home screen.

### Living time-of-day sun (the anchor)

Glancing at the phone is the moment a doom-scroll begins; a sun that quietly
reflects the real hour turns that glance into a tiny re-grounding in the present.
It passes the product's bar cleanly: it states the **present moment, never a
stale timestamp** (it reads the live local hour), it reflects an **observed fact,
never an inferred feeling** (the time of day, not "you seem tired"), and it
carries no count, streak, or budget. The phase is decided from the local hour in
`SunWidgetPhase` (dawn 5–9, day 9–17, dusk 17–21, moon otherwise); the receiver
arms one inexact alarm at each boundary (≈4 wakeups a day) to refresh it.

It is **presence and invitation**, never an interrupt. It does not detect
anything, block anything, or fire on its own. You reach for it; it never reaches
for you. That is exactly why it fits the product's soft approach where the iOS
*shield* primitive does not (see `docs/ios-platform-fit.md`).

## Why this shape

- **Reuse the in-app sun, invent nothing.** The widget does not get its own
  bespoke screen or pause. It launches the app and triggers the *same*
  `setIsShowQuestionOverlay(true)` that the dashboard companion's tap-target
  fires (`RouteCmp.tsx` / `MainWrapper`). Same experience, same exit, one code
  path — and no new surface to keep in sync (the concept doc warns against
  duplicating surfaces).
- **One shared trigger, two native shells.** The only platform-specific part is
  the widget itself + how it tells the web shell to open the sun. That signal is
  a launch flag (`?sun=open`) the shared shell already consumes, so the same
  mechanism serves the Android App Widget today and the iOS WidgetKit widget
  later.
- **No new permissions, no entitlement.** App Widgets (Android) and WidgetKit
  (iOS) need neither the accessibility/overlay stack nor Apple's Family Controls
  entitlement. This is the cheapest possible way to put minded on a home screen.

## Architecture

```
[home-screen sun widget]  --tap-->  launch app, dashboard + "?sun=open"
        (native)                          |
                                          v
                       [MainWrapper effect reads ?sun=open]  (shared web)
                                          |
                       setIsShowQuestionOverlay(true)  ← same as companion tap
                                          |
                            existing interaction flow + exit
```

### Shared web (the trigger, used everywhere)

- **`?sun=open` launch flag** (`RouteCmp.tsx`, `MainWrapper`): a reactive
  `createEffect` on `useSearchParams()` opens the interaction overlay when the
  flag is present, but only while the sun is resting as the `"companion"` (never
  cutting into an interaction already in flight), then clears the flag so a
  resume/re-render can't reopen it. Being reactive, it covers a **cold start**
  (flag in the initial hash) and a **warm re-tap** (native sets the hash on the
  live page) with one code path.
- No new route, no new component — it routes into the existing dashboard +
  overlay.

### Android (this change)

- **Widget** (`widget/MyAppWidget.kt`, Jetpack Glance — already a dependency):
  a single centered sun `Image` on a transparent background,
  `clickable(actionStartActivity(...))` launching `MainActivity` with
  `EXTRA_LAUNCH_ROUTE = OPEN_SUN_HASH` (`"/?sun=open"`). The drawable is chosen
  per render from `SunWidgetPhase.forHour(...)`.
- **Phase logic** (`widget/SunWidgetPhase.kt`): pure, R-free, JVM-unit-tested
  (`SunWidgetPhaseTest`). Maps the local hour to a phase and computes the minutes
  to the next boundary.
- **Assets** (`res/drawable/ic_sun_widget_{dawn,day,dusk,night}.xml`): four vector
  discs on the app's warm ramp (`#FFE281` → `#FFAE52` → `#EF6F52`) plus the cool
  moon (`#dfe8ff` → `#a9b8dc`). Selection is by clock in code, **not** by the
  `drawable-night` qualifier — so the moon shows at actual night, not whenever the
  system theme happens to be dark.
- **`MyAppWidgetReceiver.kt`**: the Glance receiver, plus a per-phase refresh. It
  arms one inexact `setAndAllowWhileIdle` alarm at the next boundary and re-arms
  when it fires (a self-targeted `ACTION_REFRESH_SUN` broadcast → `updateAll`);
  it also re-arms on `onUpdate` (add / host request / reboot) and on `TIME_SET` /
  `TIMEZONE_CHANGED` (manual clock set, DST, travel), and cancels on `onDisabled`.
  No exact-alarm or boot permission needed; a few minutes of drift is invisible on
  a sun that changes warmth, not time.
- **`app_widget_info.xml`**: a 1×1 home-screen widget with a sun preview;
  `updatePeriodMillis=0` (the alarm drives refreshes, not the host poll).
- **`MainActivity.kt`**: reads `EXTRA_LAUNCH_ROUTE` (allow-listed to the sun
  hash). Cold start loads the WebView at `…/index.html#/?sun=open`; warm start
  (`singleTask` → `onNewIntent`) sets `window.location.hash`. The existing
  resume → `maybeTriggerSleepWindDown` only redirects from root, so it won't
  clobber the flag.
- **`AndroidManifest.xml`**: uncomment + wire the `MyAppWidgetReceiver`.

### iOS (implemented — `extension/ios/App/MindedWidget/`)

Mirrors the Android shape; only the shell differs. See the folder's `README.md`
for the one manual Xcode step (creating the Widget Extension target) and how to
verify.

- **WidgetKit widget** (SwiftUI), Home Screen (`systemSmall`). The sun is drawn
  with SwiftUI radial gradients (`CompanionSun.swift`), colours ported 1:1 from
  the Android `ic_sun_widget` vectors; day/night follows the system colour
  scheme. `.widgetURL(URL("minded://sun"))` is the tap target. No special
  entitlement, no App Group — the widget only carries a deep link.
  - **Lock Screen (`accessoryCircular`) deferred:** accessory widgets render in
    the system's *vibrant* mode, which discards colour and rebuilds the view from
    its alpha channel — the near-opaque disc + soft bloom collapse to a flat tinted
    blob. A Lock Screen variant needs a purpose-built alpha glyph, not the colour
    sun; left for later rather than shipped looking broken.
- **Deep link → `?sun=open`.** The `minded://` URL scheme is already registered
  (`App/Info.plist`). `AppDelegate.application(open:)` intercepts `minded://sun`
  and posts an `OPEN_SUN` notification; `MainViewController` sets the Capacitor
  WebView's hash to `/?sun=open` — the exact same flag the shared shell already
  consumes — retrying across lifecycle beats to cover the cold-start race.
- Everything below the deep link (the interaction itself) is already shared, so
  the iOS code is just the SwiftUI widget + URL plumbing.

## Deliberately out of scope (v1)

Keeping it honest and small, per the product's bar:

- **No metrics on the widget** — no clock readout, no streak, no count, no usage.
  Reflecting the time of day as *warmth and colour* is ambience, not a number; it
  is a sun, not a scoreboard.
- **No bespoke widget-only experience.** Tapping reuses the in-app sun exactly;
  if that flow changes, the widget follows for free. No separate pause/route to
  drift.
- **No widget animation.** App Widgets / WidgetKit render static snapshots; the
  time-of-day sun *picks* the right snapshot for the hour, it does not animate.
  The living, breathing sun is in the app, one tap away. The widget is the calm
  doorway, not the experience.
- **No iOS shield / blocking.** That is the separate, entitlement-gated, more
  fraught path discussed in `docs/ios-platform-fit.md`. This spec is only the
  invitation-only companion.

## Testing (Android)

1. `cd extension && npm run buildDroid` (bundles the shared shell into the
   Android assets).
2. Build/run the Android app in Android Studio.
3. Long-press the home screen → Widgets → minded → drop the sun.
4. Tap it: the app opens and the sun interaction begins, exactly as tapping the
   dashboard sun. Tapping while the app is already open should also work
   (warm-start path).
5. Confirm the phase tracks the clock, not the system theme: change the device
   time across a boundary (e.g. to 06:00, 12:00, 18:00, 23:00) and check the sun
   warms/cools accordingly (dawn → day → dusk → moon). System dark mode no longer
   drives it.

Run the phase logic unit tests with
`./gradlew :app:testDebugUnitTest --tests "com.minded.minded.widget.SunWidgetPhaseTest"`.

The shared trigger is also testable in the browser extension (`npm start`, then
load `#/?sun=open`) without any native build.
