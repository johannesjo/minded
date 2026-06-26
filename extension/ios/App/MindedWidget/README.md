# MindedWidget — the iOS companion sun (WidgetKit)

This is the iOS implementation of the home-/lock-screen **companion sun** — "option 1"
from `docs/ios-platform-fit.md` and the WidgetKit twin of the Android App Widget
(`android/.../widget/MyAppWidget.kt`). It is **presence and invitation, never an
interrupt**: it never detects, blocks, or fires on its own. Tapping it opens the app
and runs the _same_ interaction overlay as tapping the in-app dashboard sun.

See `docs/sun-companion-widget.md` for the full spec and the shared architecture.

## How it works

```
[home-screen sun widget]  --tap (minded://sun)-->  app opens
        (this folder)                                   |
   AppDelegate.application(open:) posts "OPEN_SUN"       |
                                                         v
   MainViewController sets WebView hash = "/?sun=open"   |
                                                         v
        [MainWrapper reads ?sun=open]  → setIsShowQuestionOverlay(true)
              (shared web, already built — RouteCmp.tsx)
```

The web side already consumes `?sun=open` (it ships on Android today), so the only
iOS-specific parts are: this SwiftUI widget, the `minded://` URL scheme (already
registered in `App/Info.plist`), and the two small native edits in
`App/AppDelegate.swift` + `App/MainViewController.swift`.

## Files in this folder

- `MindedWidget.swift` — the `@main` widget bundle, `StaticConfiguration`, timeline
  provider (one static entry, `.never` refresh), the entry view, and the
  `minded://sun` `widgetURL`.
- `CompanionSun.swift` — the SwiftUI sun/moon, colours ported 1:1 from the Android
  `ic_sun_widget` vectors. Day/night follows the system colour scheme.
- `Info.plist` — the WidgetKit extension Info.plist.

No image asset is needed — the sun is drawn with SwiftUI gradients.

## Adding the target

The source files are ready, but a **new app-extension target** must be created that
builds and embeds them. Two equivalent one-time paths — pick one:

### Option A — programmatic (`xcodeproj` gem, works on Linux/CI)

```bash
gem install xcodeproj            # one-time
ruby scripts/add_widget_target.rb   # from extension/ios/App/
```

`scripts/add_widget_target.rb` adds the `MindedWidget` app-extension target with the
settings below, embeds it into `App`, and is idempotent (a no-op once the target
exists). This is the path RELEASING.md endorses for wiring it in without a Mac.
Like the widget Swift, the script was written without a macOS/Xcode build available,
so **treat the first `xcodebuild`/Xcode build as the real verification** — review the
resulting `project.pbxproj` diff before committing.

### Option B — Xcode GUI

Editing `project.pbxproj` by hand is error-prone, so use the GUI rather than a manual
edit. One-time setup:

1. **File ▸ New ▸ Target… ▸ Widget Extension.**
   - Product name: `MindedWidget`
   - Uncheck **Include Live Activity** and **Include Configuration App Intent**
     (we use a plain `StaticConfiguration`).
   - Embed in the `App` target when prompted.
2. Xcode generates placeholder `MindedWidget.swift`/`Info.plist` and asset files in a
   new group. **Delete the generated `.swift` and `Info.plist`** and instead **Add
   Files…** the three files in this folder (`MindedWidget.swift`, `CompanionSun.swift`,
   `Info.plist`), with **Target Membership = MindedWidget**.
3. Target settings for `MindedWidget`:
   - **Bundle Identifier:** `com.minded.app.widget` (must be the app id +
     `.something`; the app is `com.minded.app`).
   - **Deployment Target:** iOS 16.0 (matches the app).
   - **Signing:** same team as the app (`363FAFK383`).
4. Build & run the **App** scheme on a device/simulator.

No special entitlement and no App Group is required — the widget only carries a deep
link, it shares no data with the app.

## Verify

1. `cd extension && npm run buildIOS` then `npx cap sync ios` (bundles the shared web
   shell into the iOS app).
2. Run the app once so the widget extension installs.
3. Long-press the Home Screen ▸ **+** ▸ search "minded" ▸ add the sun. (Home
   Screen only for v1 — see the Lock Screen note below.)
4. **Tap the widget** → the app opens and the sun interaction begins, exactly like
   tapping the in-app dashboard sun. Tap again while the app is already open (warm
   start) → it should re-open the overlay too.
5. Toggle system Dark Mode and re-check the widget → the moon variant.

You can validate the _shared_ trigger with zero native build in the browser
extension: `npm start`, then load `#/?sun=open`.

## Lock Screen (deferred)

v1 ships `systemSmall` (Home Screen) only. A Lock Screen `accessoryCircular`
variant was deliberately left out: accessory widgets render in the system's
_vibrant_ mode, which discards colour and rebuilds the view from its **alpha
channel**. Our near-opaque white disc + low-alpha bloom would collapse to a flat
tinted blob, not a sun. A good Lock Screen sun needs a purpose-built alpha glyph
designed for vibrant mode — worth doing later, not worth shipping looking broken.

## Known caveat (cold start timing)

On a **cold** launch the `OPEN_SUN` notification can arrive before the WebView has a
live document. `MainViewController.applyPendingOpenSun()` handles this by holding the
flag and retrying on the next lifecycle beats (`willEnterForeground` /
`didBecomeActive`), clearing it only once the JS runs. In practice the overlay opens a
moment after launch (same as the Android warm path). If you ever want the
_synchronous_ first-paint open (overlay in the very first render), inject the hash
into the WebView's initial URL instead of setting it post-load.

> Note: these native files were written without a macOS/Xcode build available, so they
> have not been compiled or run. Treat the first Xcode build as the real verification.
