# Spec: the sun companion widget (Home/Lock Screen)

Status: **Android in progress; iOS implemented (pending first Xcode build).**
Update: the widget has since grown a second, larger face on both platforms - a
miniature of the in-app intervention screen carrying one quiet prompt line
(`WidgetPrompts.kt` on Android; `WidgetPrompts.swift` + the `systemMedium`
card on iOS). The 1×1 sun described here is unchanged and remains the
small-size fallback; the card's rationale and guardrails live in
`docs/widget-prompts-concept.md`.
The iOS WidgetKit widget + deep-link plumbing now live in
`extension/ios/App/MindedWidget/` (see its README); they were written without a
macOS build available, so the first Xcode build is the real verification. This is
"option 1" from
`docs/ios-platform-fit.md` - the always-present, invitation-only sun, moved off
the dashboard bottom bar and onto the device home screen. It is the
entitlement-free, on-philosophy first step toward an iOS presence, and it is a
genuinely nice addition to Android in its own right.

## What it is

A calm sun sits on the home screen as an ambient companion - no numbers, no
streaks, no badge, nothing to grade. It is *living*: it tracks the day's natural
light, glowing as the warm sun by day and the cool moon by night. That is the
whole of what it "shows" - where you actually are in the day, reflected back as
warmth and colour, never a metric. **Tapping it does
exactly what tapping the in-app dashboard sun does**: it opens the app's existing
interaction overlay, and the existing flow handles the exit the same way too. The
widget is just that companion, relocated to the home screen.

### Living time-of-day sun (the anchor)

Glancing at the phone is the moment a doom-scroll begins; a sun that quietly
reflects the real hour turns that glance into a tiny re-grounding in the present.
It passes the product's bar cleanly: it states the **present moment, never a
stale timestamp** (it reads the live local hour), it reflects an **observed fact,
never an inferred feeling** (the time of day, not "you seem tired"), and it
carries no count, streak, or budget. The phase follows the **real sun**, exactly
as the app's does: `WidgetSun` (Kotlin and Swift) ports the app's `solarSky.ts`, so
night - the moon, the dark sky, the wordless card - begins when the sun is 4° below
the horizon at the time zone's principal place (the same generated table the app
reads, `WidgetTimeZones`), and the card's sky steps along the same sun-timed
palette clock. Night opens on a **nightfall** face rather than straight on
deep night: the dark sky still holding the sunset's warm horizon, baked from
the app's own afterglow layers, while the real afterglow (ported with the sun)
is ≥ 0.35 - about the first hour after dusk - so the card goes dusk → moon over
the last warm light → deep night, as the app's sky does. There is only one sun, so the widget and the app can't disagree
about whether it's up - a Berlin June evening is still day at 21:00 on both. A
zone with no place (UTC, Etc/…) falls back to the fixed 06–19 clock, again like the
app. The shared receiver refreshes with one inexact, non-wake alarm: the next
15-minute line step by day, or the real dusk/dawn if that comes first, and at
night the end of nightfall, then the dawn (`docs/widget-prompts-concept.md`); a sun-only placement rides along and only ever
repaints while the screen is already on.

### Tonight's moon, not a full one

The app's night companion is tonight's moon - a crescent or a gibbous, its night
side veiled by earthshine (`lunarPhase.ts`, `moonShadow.ts`). The widget used to
draw a full moon every night, which made it a second, different moon. `WidgetMoon`
(Kotlin and Swift) ports the phase and the terminator - the lit lune's outline,
everything else on the disc in the same `#141e3d @ .7` earthshine under the same
σ=3 blur, mirrored for the southern sky - so the home screen shows the app's moon.
Android rasterises it over the moon vector at the size it's shown
(`WidgetMoonBitmap`; at full moon the plain vector stays); iOS overlays it in
`CompanionSun`. The glyph faces (Lock Screen, tinted) stay a plain hollow disc.

### The tap is the sun's morph, not a cut

The widget's sun and the app's sun are the same sun, so a tap hands one to the
other. On Android the tile is marked `appWidgetBackground()`, so the launcher
expands *that tile* into the app (API 31+), and the widget records where its sun
sits in the tile (`WidgetSunSpot`); `MainActivity` pairs that with the launcher's
`Intent.sourceBounds` and passes the sun's on-screen centre and size as
`&sunFrom=x,y,d`. On a cold start the shell disc's first paint is *on the widget's
sun* (`widgetArrival.ts` → an arriving settle, white halo - it's arriving onto our
own sky), and the rise into the interaction glides from there at the slow
arrival pace. A warm re-tap, or any malformed value, rises from the bottom bar as
before. iOS gives the app no source rect, so there the system's own widget
launch zoom carries the hand-off.

It is **presence and invitation**, never an interrupt. It does not detect
anything, block anything, or fire on its own. You reach for it; it never reaches
for you. That is exactly why it fits the product's soft approach where the iOS
*shield* primitive does not (see `docs/ios-platform-fit.md`).

## Why this shape

- **Reuse the in-app sun, invent nothing.** The widget does not get its own
  bespoke screen or pause. It launches the app and triggers the *same*
  `setIsShowQuestionOverlay(true)` that the dashboard companion's tap-target
  fires (`RouteCmp.tsx` / `MainWrapper`). Same experience, same exit, one code
  path - and no new surface to keep in sync (the concept doc warns against
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
- No new route, no new component - it routes into the existing dashboard +
  overlay.

### Android (this change)

- **Widget** (`widget/MyAppWidget.kt`, Jetpack Glance - already a dependency):
  a single centered sun `Image` on a transparent background,
  `clickable(actionStartActivity(...))` launching `MainActivity` with
  `EXTRA_LAUNCH_ROUTE = OPEN_SUN_HASH` (`"/?sun=open"`). The drawable is chosen
  per render from `SunWidgetPhase.forHour(...)`.
- **Phase logic** (`widget/SunWidgetPhase.kt`): pure, R-free, JVM-unit-tested
  (`SunWidgetPhaseTest`). Maps the local hour to a phase and computes the minutes
  to the next boundary.
- **Assets**: the day sun is a vector disc - a white disc warming to a faint gold
  rim - in two twins that differ only in the bloom's colour:
  `res/drawable/ic_sun_widget_day.xml` (amber) for the bare sun on the user's
  wallpaper, and `ic_sun_widget_day_on_sky.xml` (white) for the prompt card,
  which paints the app's own sky and so follows the in-app halo rule. See
  `docs/sun-halo.md`. The night
  moon is a vector too (`res/drawable/ic_sun_widget_night.xml`) - the same
  shaded body + soft maria + cool halo as the in-app `.moon`, ported by mapping
  Sun.scss's percentages onto the disc box. Each mare is a circular gradient
  squashed by its group's `scaleX`, because a VectorDrawable radial gradient is
  always circular. Both were a lunar photograph until the in-app moon stopped
  being one; there is only ever one moon, so the widget followed the same day.
  We deliberately stop at two:
  the old dawn/dusk discs wore saturated amber/coral that read as a *signal*
  ("caution") on a surface that must never grade the user, whereas sun-vs-moon is
  the one shift everyone reads as the world, not a message. Selection is by clock
  in code, **not** by the `drawable-night` qualifier - so the moon shows at actual
  night, not whenever the system theme happens to be dark.
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

### iOS (implemented - `extension/ios/App/MindedWidget/`)

Mirrors the Android shape; only the shell differs. See the folder's `README.md`
for the one manual Xcode step (creating the Widget Extension target) and how to
verify.

- **WidgetKit widget** (SwiftUI), Home Screen + Lock Screen. `systemSmall` is the pure sun,
  whose day face is drawn with SwiftUI radial gradients (`CompanionSun.swift`),
  colours ported 1:1 from the Android day vector; its night face is the **same
  drawn moon as Android and the in-app `.moon`**
  (`CompanionSun.swift`, the same numbers as `ic_sun_widget_night.xml`), so the
  three moons are one object rather than three lookalikes. `systemMedium` is the
  prompt card (sky + quiet
  line + the same sun or moon, but passed `onOwnSky: true` so its bloom is white
  - the card paints the app's own sky, so the in-app halo rule applies; see
  `docs/sun-halo.md` and `docs/widget-prompts-concept.md`). Day/night
  follows the **real sun** (`WidgetSun.swift`, the twin of the Android port),
  with the timeline pre-placing every face change so the card steps and the sun
  or moon flips on time - not the system colour scheme. Entries cross-fade
  (iOS 17+). The day↔night change is the app's one-disc turn, not a swap:
  `CompanionSun` always draws both faces, the moon fades in over a sun disc
  that stays opaque until it is covered, and the halos ease across on the same
  1.6 s beat. Android widgets can't animate a repaint at all (RemoteViews have
  no animation), so there the flip is a plain step. The card's line is set in
  the app's own Newsreader, bundled as a static Regular.
  `.widgetURL(URL("minded://sun"))` is the tap target (the card appends
  `?line=…`). No special entitlement, no App Group - the widget only carries a
  deep link.
  - **Lock Screen (`accessoryCircular`) and tinted/clear Home Screens:** these
    render in *vibrant*/*accented* mode, which discards colour and rebuilds the
    view from its alpha channel - the colour sun's near-opaque disc + soft bloom
    would collapse to a flat tinted blob. So they draw `SunGlyph`, a purpose-built
    alpha glyph: a solid disc in a faint ring by day, a hollow one at night.
- **Deep link → `?sun=open`.** The `minded://` URL scheme is already registered
  (`App/Info.plist`). On a **warm** re-tap `AppDelegate.application(open:)`
  intercepts `minded://sun`, posts an `OPEN_SUN` notification, and
  `MainViewController` sets the live WebView's hash to `/?sun=open` (the exact same
  flag the shared shell already consumes), retrying across lifecycle beats. On a
  **cold** launch the app delegate flags it from the launch options and
  `capacitorDidLoad` injects an `.atDocumentStart` user script that sets the hash
  *before* the bundle runs (guarded by a `sessionStorage` flag so a later WebView
  reload can't re-force the pause open) - so the pause is in the first paint, no
  dashboard frame first. The cold launch also **fades** the brand launch screen out
  softly rather than hard-cutting it: a still of the `Splash` image is held over the
  loading WebView and faded once the web posts `mindedSunReady` (the sun has painted).
- Below the deep link the interaction itself is already shared; the iOS-specific code
  is the SwiftUI widget, the URL plumbing, and a small native launch fade
  (`installLaunchFade` - a `Splash` overlay faded out on the web's paint signal).

## Deliberately out of scope (v1)

Keeping it honest and small, per the product's bar:

- **No metrics on the widget** - no clock readout, no streak, no count, no usage.
  Reflecting the time of day as *warmth and colour* is ambience, not a number; it
  is a sun, not a scoreboard. (Still absolute - the later prompt card added
  words, never numbers; see `docs/widget-prompts-concept.md`.)
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
   time across the boundary (e.g. to 12:00, then 23:00) and check the sun gives
   way to the moon and back (day → night → day). System dark mode no longer
   drives it.

Run the phase logic unit tests with
`./gradlew :app:testDebugUnitTest --tests "com.minded.minded.widget.SunWidgetPhaseTest"`.

The shared trigger is also testable in the browser extension (`npm start`, then
load `#/?sun=open`) without any native build.
