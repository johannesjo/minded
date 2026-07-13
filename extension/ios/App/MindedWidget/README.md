# MindedWidget - the iOS companion sun (WidgetKit)

This is the iOS implementation of the home-screen **companion sun** - "option 1"
from `docs/ios-platform-fit.md` and the WidgetKit twin of the Android App Widget
(`android/.../widget/MyAppWidget.kt`). It is **presence and invitation, never an
interrupt**: it never detects, blocks, or fires on its own. Tapping it opens the app
and runs the _same_ interaction overlay as tapping the in-app dashboard sun.

Two faces, one widget (mirroring Android's responsive faces):

- **`systemSmall`** - the wordless floating sun: warm by day, the cool moon by night.
- **`systemMedium`** - the prompt card: a miniature still of the in-app intervention
  screen (the app's time-of-day sky, one quiet serif line stepping every 15 minutes
  through the waking day, the sun beneath it). At night the moon carries the card
  alone. Tapping lands on the exact interaction whose line is showing.

See `docs/sun-companion-widget.md` for the full spec and the shared architecture,
and `docs/widget-prompts-concept.md` for the card's rationale and guardrails.

## How it works

```
[home-screen sun widget]  --tap (minded://sun)-->  app opens
        (this folder)                                   |
   AppDelegate.application(open:) posts "OPEN_SUN"       |
                                                         v
   MainViewController sets WebView hash = "/?sun=open"   |
                                                         v
        [MainWrapper reads ?sun=open]  → setIsShowQuestionOverlay(true)
              (shared web, already built - RouteCmp.tsx)
```

The web side already consumes `?sun=open` and `&widgetLine=…` (both ship on Android
today), so the only iOS-specific parts are: this SwiftUI widget, the `minded://` URL
scheme (already registered in `App/Info.plist`), and the small native edits in
`App/AppDelegate.swift` + `App/MainViewController.swift`.

The prompt card carries the exact line it is showing as `minded://sun?line=…`.
`AppDelegate.encodedWidgetLine` re-encodes it to alphanumerics+`%` (the iOS twin of
Android's intent-extra allow-list: `minded://` is open to any app and the hash is set
via a JS string literal, so nothing that could break out of it may pass), and the
shell appends it to the hash as `&widgetLine=…` on both the cold (user script) and
warm (notification) paths. The exact-pool match stays on the web (`matchWidgetLine`);
an unknown line falls through to the normal open.

## Files in this folder

- `MindedWidget.swift` - the `@main` widget bundle, `StaticConfiguration`, timeline
  provider (every face change pre-placed as an entry with `.atEnd`: quarter-hour
  prompt steps by day, one wordless entry spanning the night), the two faces
  (`SunOnly`, `PromptCard`), and the `minded://sun` `widgetURL`.
- `CompanionSun.swift` - the SwiftUI sun/moon. The day sun is drawn with radial
  gradients ported 1:1 from the Android day vector (`ic_sun_widget_day.xml`); the
  night moon is the `MoonWidget` image (below). It renders whichever it's told via
  `isNight`.
- `SunWidgetPhase.swift` - the pure, clock-driven day/night decision (the Swift twin
  of the Android `SunWidgetPhase.kt`): the sun by day, the moon by night, by the real
  local hour - **not** the system colour scheme.
- `WidgetSky.swift` - the card's time-of-day sky for a local hour (the Swift twin of
  `WidgetSky.kt`), stepping through the app's ambient keyframes on whole hours.
- `WidgetPrompts.swift` - the curated waking-hours prompt pool and the deterministic
  15-minute-slot rotation (the Swift twin of `WidgetPrompts.kt`; the jest parity test
  `widgetPromptsMirror.test.ts` pins both to the TS pools and to each other).
- `Assets.xcassets` - the six card-sized sky renders, generated (dithered at target
  size, same colours as the app and Android) by `android/tools/gen_loading_sky.py`.
- `Media.xcassets` - the `MoonWidget` image set: the night moon, the *same* lunar
  photo the Android widget and in-app `.moon` use, re-encoded from
  `android/.../ic_sun_widget_night.webp` to PNG (@1x/@2x/@3x) so the two platforms'
  moons are identical rather than a gradient approximation.
- `Info.plist` - the WidgetKit extension Info.plist.

The day sun is drawn with SwiftUI gradients; the night moon and card skies ship as
images. Both asset catalogs are bundled into the `.appex` - no App Group, so this is
still not shared *app data*, just resources compiled into the widget.

The three PNG scales are a mechanical re-encode of the Android source, so "identical
to Android" is reproducible, not a one-off. To regenerate them if
`ic_sun_widget_night.webp` ever changes (from the repo root):

```sh
python3 - <<'PY'
from PIL import Image
src = "android/app/src/main/res/drawable-nodpi/ic_sun_widget_night.webp"  # 360×360
out = "extension/ios/App/MindedWidget/Media.xcassets/MoonWidget.imageset"
moon = Image.open(src).convert("RGBA")
moon.save(f"{out}/moon@3x.png")                            # pixel-identical decode
moon.resize((240, 240), Image.LANCZOS).save(f"{out}/moon@2x.png")
moon.resize((120, 120), Image.LANCZOS).save(f"{out}/moon@1x.png")
PY
```

## Adding the target

**CI already does this.** The _iOS TestFlight_ workflow runs
`scripts/add_widget_target.rb` (Option A below) before `pod install`, so every
TestFlight archive embeds the widget - no action needed to ship it. The sections
below are for wiring it into a checked-in `project.pbxproj` (run the script once
locally and commit the diff) or for doing it by hand in Xcode.

The source files are ready, but a **new app-extension target** must be created that
builds and embeds them. Two equivalent one-time paths - pick one:

### Option A - programmatic (`xcodeproj` gem, works on Linux/CI)

```bash
gem install xcodeproj            # one-time
ruby scripts/add_widget_target.rb   # from extension/ios/App/
```

`scripts/add_widget_target.rb` adds the `MindedWidget` app-extension target with the
settings below, embeds it into `App`, and is idempotent (a no-op once the target
exists). This is the path RELEASING.md endorses for wiring it in without a Mac.
Like the widget Swift, the script was written without a macOS/Xcode build available,
so **treat the first `xcodebuild`/Xcode build as the real verification** - review the
resulting `project.pbxproj` diff before committing.

### Option B - Xcode GUI

Editing `project.pbxproj` by hand is error-prone, so use the GUI rather than a manual
edit. One-time setup:

1. **File ▸ New ▸ Target… ▸ Widget Extension.**
   - Product name: `MindedWidget`
   - Uncheck **Include Live Activity** and **Include Configuration App Intent**
     (we use a plain `StaticConfiguration`).
   - Embed in the `App` target when prompted.
2. Xcode generates placeholder `MindedWidget.swift`/`Info.plist` and asset files in a
   new group. **Delete the generated files** and instead **Add Files…** everything in
   this folder (the five `.swift` files, `Assets.xcassets`, `Media.xcassets`, and
   `Info.plist`), with **Target Membership = MindedWidget**. Both `.xcassets`
   catalogs must be in the target's **Copy Bundle Resources** phase (Xcode does this
   automatically for asset catalogs).
3. Target settings for `MindedWidget`:
   - **Bundle Identifier:** `com.minded.app.widget` (must be the app id +
     `.something`; the app is `com.minded.app`).
   - **Deployment Target:** iOS 16.0 (matches the app).
   - **Signing:** same team as the app (`363FAFK383`).
4. Build & run the **App** scheme on a device/simulator.

No special entitlement and no App Group is required - the widget only carries a deep
link, it shares no data with the app.

## Verify

1. `cd extension && npm run buildIOS` then `npx cap sync ios` (bundles the shared web
   shell into the iOS app).
2. Run the app once so the widget extension installs.
3. Long-press the Home Screen ▸ **+** ▸ search "minded" ▸ add the small sun and the
   medium card. (Home Screen only - see the Lock Screen note below.)
4. **Tap the sun** → the app opens and the sun interaction begins, exactly like
   tapping the in-app dashboard sun. Tap again while the app is already open (warm
   start) → it should re-open the overlay too.
5. **Tap the card** → the interaction opens on the exact line the card was showing
   (a NOTICE cue → that NOTICE screen, a "How about…" line → that ACTION_ADVICE),
   on both cold and warm starts.
6. Confirm day/night tracks the **clock, not the theme**: set the device time past a
   boundary (e.g. 12:00 → 23:00) and check the sun gives way to the moon and back -
   and that the card's sky steps with the hour and goes wordless at night.
   Toggling system Dark Mode alone must _not_ change any of it.
7. On iOS 18+, check the card under a **tinted/dark Home Screen** (long-press ▸
   Edit ▸ Customize): the system re-renders widgets in those modes and may darken
   the container - make sure the near-black line doesn't land on a darkened sky.

You can validate the _shared_ trigger with zero native build in the browser
extension: `npm start`, then load `#/?sun=open`.

## Lock Screen (deferred)

The widget ships Home Screen families only (`systemSmall`, `systemMedium`). A
Lock Screen `accessoryCircular` variant was deliberately left out: accessory widgets render in the system's
_vibrant_ mode, which discards colour and rebuilds the view from its **alpha
channel**. Our near-opaque white disc + low-alpha bloom would collapse to a flat
tinted blob, not a sun. A good Lock Screen sun needs a purpose-built alpha glyph
designed for vibrant mode - worth doing later, not worth shipping looking broken.

## Cold-start open + the launch fade

A **cold** widget launch opens the sun **synchronously, in the first render**. The
app delegate flags the launch (`minded://sun` in the launch options →
`AppDelegate.launchedFromSunWidget`), and `MainViewController.capacitorDidLoad()`
injects an `.atDocumentStart` user script that sets the `?sun=open` hash _before_ the
web bundle evaluates - so `RouteCmp` reads it at mount and the interaction overlay is
in the very first paint, with no dashboard frame flashing past first. The older
`handleOpenSun`/`applyPendingOpenSun` retry (holding the flag across
`willEnterForeground` / `didBecomeActive`) remains as the path for **warm re-taps**
(app already running) and as a backstop if the launch flag is ever missed.

On top of that, a widget cold-launch **fades** the launch screen out softly rather
than hard-cutting it: a still copy of the brand launch image (`Splash` - the brand
mark, _not_ the companion sun) is held over the loading WebView and faded out once
the interaction sun has actually painted (`installLaunchFade`), so the system launch
screen eases into the app instead of cutting to a blank frame before the bundle
renders. The fade triggers on the real first paint: the web posts a `mindedSunReady`
message once the sun has mounted (see `RouteCmp`), which is accurate where page-load
progress is not (it only signals resources finished, not render). A hard timeout
always clears the overlay, so a stalled or silent load can never strand the launch
screen on top. It is widget-launch only. The fade timing wants one pass on a device.

> Note: these native files were written without a macOS/Xcode build available, so they
> have not been compiled or run. Treat the first Xcode build as the real verification.
