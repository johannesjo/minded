# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

minded is a multi-platform mindfulness and productivity application designed to help users fight social media addiction, doom-scrolling, and procrastination. It runs on:
- Browser Extension (Chrome/Firefox with Manifest V3)
- Android App (Native Kotlin + WebView)
- iOS App (Native Swift + Capacitor) - **deliberately a minimal, widget-only variant**, not a port of the Android app. The reasoning: iOS *can* technically block apps (the Screen Time API - `FamilyControls`/`ManagedSettings`/`DeviceActivity` - the way one sec/Opal do), so "iOS can't intervene" is false. The real blocker is conceptual: that primitive is a parental-controls *wall*, and iOS gives no way to deliver the sun *as* the interrupt. The only effective interrupt (a shield) is the wrong shape for minded's soft, never-forced approach. So iOS does **not** attempt the forced intervention/overlay at all. Instead it ships only the on-philosophy "option 1" from `docs/ios-platform-fit.md`: the **companion sun** as a Home Screen WidgetKit widget (`extension/ios/App/MindedWidget/`) - presence + invitation, never an interrupt. Tapping it opens the shared WebView pause. New *intervention* features still target Browser Extension and Android only; on iOS, keep scope to the companion widget + WebView shell and don't reintroduce shields/overlays. iOS builds + TestFlight ship from a macOS CI runner with no local Mac (`.github/workflows/ios-testflight.yml`, see `RELEASING.md`). Full reasoning: `docs/ios-platform-fit.md`.

Platform scoping beyond iOS: **sleep wind-down is deliberately Android-only.**
The phone in bed is where evening doom-scrolling actually happens, so Android is
where the feature earns its keep - and it's still half-experimental, so the
extra desktop effort isn't warranted while the extension has almost no users.
The view itself is shared code (`src/shared/components/sleepWindDown/`); only
the trigger, settings entry, and dashboard card are Android-gated, so widening
later stays cheap. Don't port it to the extension or iOS without an explicit
product decision.

## Conceptual Fundamentals

These are the load-bearing ideas behind the product. They shape almost every
feature decision - read them before proposing changes to interventions.

- **Mindfulness app first, not a productivity tracker.** The goal is *awareness
  without judgment*, not "be more efficient" or "scroll less and prove it."
  Anything that reintroduces striving betrays the premise. Deliberately avoid:
  streaks, "days clean", "minutes saved", efficiency scores, success/failure
  tallies, daily goals, trend-up graphs, social comparison - and anything that
  manufactures scarcity, urgency, or guilt (e.g. "you've used up your budget").

- **The sun is the central mechanic and *is* the pause.** When an intervention
  fires, a draggable animated sun appears; tapping/flinging it is the universal,
  always-available escape hatch. Tapping it opens a calm pause - but the everyday
  *soft/companion* sun does **not** "breathe" on its own. A repeating breathing
  swell belongs only to *guided* breath pauses - guided meditations (e.g.
  urge-surfing) and the deliberate strong-friction breath pause
  (`StrongFrictionBreathPause`, which guides breathe-in / hold / out). The
  ambient/companion sun and the everyday soft interaction never carry an unguided
  repeating breath; their calm is carried by the sun's quiet presence and its soft
  morph into place, never a separate ambient "take a breath" UI. The sun rests on
  the dashboard bottom bar as a companion; drag up → intervention, drag down →
  optional grounding offer.

- **The sun always *morphs*, and there is only ever one.** Across screens and
  states the sun is a single continuous object that glides/scales from one
  surface to the next - it must never hard-cut, vanish, or appear in two places
  at once. Where the architecture can't currently morph (e.g. a native overlay
  handing off to a WebView surface), the job is to *make* it morph, not to
  accept the cut.

- **Interrupt → reflect → redirect, gently and never forced.** Grounding and
  similar offers are invitations ("Stay a while?"), auto-dismiss if ignored, and
  never block. Match this tone in any new surface.

- **Intervention routing is already context-driven, not random.**
  `getInteractionMode.ts` branches on a rich present-moment read
  (`interactionContext.ts`: friction level, mood/energy freshness, evening,
  recent returns, usage, expired intent, alternatives) *before* any probability
  is rolled; the randomness mostly adds variety among already-eligible options.
  Friction levels are `soft` / `normal` / `strong` (`getFrictionLevel`).

- **The bar for anything we *say* to the user: ~90% sure it helps.** We can't
  measure helpfulness (all data is local; no telemetry, no A/B). So hold the line
  structurally: state **observed behaviour, never inferred feeling**; the
  **present moment, never a stale timestamp**; never induce anxiety; keep it rare
  and dismissible. A single wrong guess makes the whole app feel like it doesn't
  know the user. See `docs/reflective-companion-concept.md` for the worked
  example (and the cut list of ideas that failed this bar).

- **Minimalism is the default design principle - for both UX and UI.** Always
  prefer the simplest thing that works. Fewer screens, fewer options, fewer
  words, fewer controls, less visual chrome. Every element must earn its place;
  when in doubt, leave it out. This reinforces the calm, never-striving premise:
  a quiet, uncluttered surface lowers cognitive load, and added complexity is a
  cost paid by the user. Remove before you add.

## Essential Commands

All npm scripts live in `extension/package.json` - run them from the `extension/` directory.

**Development:**
```bash
cd extension
npm start          # Browser extension development (watches files)
npm run startDroid # Android development build (watches files)
npm run startIOS   # iOS development build (watches files)
```

**Production Builds:**
```bash
npm run build      # Browser extension (creates dist/ and minded.zip)
npm run buildDroid # Android build to /android/app/src/main/assets/web/
npm run buildIOS   # iOS build
```

**Testing & Code Quality:**
```bash
npm test           # Run Jest tests
npm run lint       # ESLint with auto-fix
```

**Running a Single Test:**
```bash
npx jest path/to/test.spec.ts
```

## Architecture

### Platform-Specific Code

The codebase uses a **DataInterface pattern** for platform abstraction:
- `@dataInterface` alias resolves to different directories based on build mode
- Common interface in `src/dataInterface/commonSyncDataInterface.ts`
- Platform implementations in `src/dataInterface/{extension|android|ios}/`

### Key Entry Points

**Browser Extension:**
- Content Script: `src/pages/content/content-script.tsx` (injected into web pages)
- Background Script: `src/pages/background/background.ts` (service worker)
- Popup: `src/pages/popup/Popup.tsx` (extension popup)

**Mobile Apps:**
- Android: `src/android/main/indexMainAndroid.tsx`
- iOS: `src/ios/main/indexMainIOS.tsx`

### Shared Components

All platform-agnostic UI lives in `src/shared/`:
- `components/ui/` - Reusable UI elements
- `components/interaction/` - Mindfulness interactions
- `components/dashboard/` - Main dashboard
- `data/` - Static data (questions, quotes, advice)

### State Management

- Local state: SolidJS signals (`createSignal`)
- Global state: Platform storage via dataInterface (`getSyncData()`, `setSyncData()`)
- Updates: Event-driven using custom events (e.g., `REFRESH_DASHBOARD_EV`)

### Build Configuration

Vite handles multi-platform builds:
- Default mode: Browser extension with CRXJS plugin
- Android mode: Builds to Android assets with file:// base URL
- iOS mode: Single entry point with post-build copying

Path aliases change based on build mode to load platform-specific code.

## Development Tips

1. **Platform Detection**: Use `IS_ANDROID`, `IS_IOS`, `IS_WEB_EXT` flags
2. **File References**: Use format `file_path:line_number` when discussing code
3. **Testing Platform Code**: Mock the dataInterface when testing shared components
4. **Chrome APIs**: Available globally in extension context, use `chrome.runtime`, `chrome.storage`, etc.
5. **Cross-Platform Events**: Use browser CustomEvent for component communication

## Common Patterns

**Adding a New Feature:**
1. Create shared component in `src/shared/components/`
2. Add platform-specific data handling in `src/dataInterface/{platform}/`
3. Update routing in `RouteCmp.tsx` if needed
4. Test on all platforms using respective start commands

**Modifying Interactions:**
- Main logic in `src/shared/components/interaction/InteractionCommon.tsx`
- Platform-specific overlays in `InteractionOverlay{Platform}.tsx`

**Data Storage:**
- Always use dataInterface methods, never direct browser/platform APIs
- Handle quota limits (especially for browser extension storage)

## Styling Guidelines

**Always use existing global styles for consistency:**
- Buttons: use the `<Btn>` component (`src/shared/components/ui/Btn.tsx`) - never write raw `<button class="btn…">`. It has three typed bases and a curated, type-checked set of modifiers, so screens can't sprout one-off button looks:
  - `<Btn>` (text, default) with `outline` / `soft` / `plain` / `big`; add `voice` only for genuinely mindful invitations
  - `<Btn variant="icon">` with `small` / `plain`
  - `<Btn variant="toggle">` with `small` / `selected`
  - `href` renders a link (router `<A>` for internal routes, plain `<a>` for external/mailto)
  - The underlying `btnTxt` / `btnIco` / `btnToggleSelect` SCSS classes (in `src/styles/`) are an implementation detail of `<Btn>`
- Typography: `h2`, `h3`, `txtBig`
- Global styles are in `src/styles/componentsShared/` and `src/styles/mixins/`
- Only create component-specific SCSS modules for layout, not for recreating existing button/input styles

**Transitions - always soft, never hard cuts:**
- As a rule, *all* transitions should aim for softness. Anything that changes
  on screen - a surface, a state, a value, a piece of motion - should ease in
  and out rather than snap. Softness is the default; a hard cut needs a reason.
- Every overlay and page transition (open, close, decline, "Not now", success)
  must fade - never snap in or out. Calmness is the product; an abrupt cut reads
  as a jolt and betrays the premise. Reuse the existing fade helpers
  (`fadeOut` in `src/util/animation.ts`, `ANIMATION_TIMING`) and the established
  patterns (e.g. `InteractionOverlay`'s `handleHideWithFade`) rather than
  unmounting straight to the next surface.

**Typography - serif is the voice we speak in, sans is chrome:**
- Two typefaces, one rule: **Inter (sans)** is the app's chrome - buttons,
  toggles, dashboard labels, data, anything functional. **Newsreader (serif),
  via the `displayVoice()` mixin** (`src/styles/mixins/allTypo.scss`), is
  reserved for *the words the app speaks to you gently* - intervention prompts,
  breath labels, the success overlay, mindful opt-in headings, and the sun-drag
  hints on the intervention surface. The split isn't "functional vs. mindful"
  by screen; it's chrome vs. mindful copy. Soft, second-person, invitational
  lines ("to let go", "to stay a while") are the voice - render them serif even
  when they sit at hint size - so no sans/serif seam appears next to a serif
  prompt on the app's most central surface.
- Add the voice with `@include displayVoice;`, don't hand-set `font-family`;
  layer it onto the existing size/wrap class (e.g. keep `.txtSmaller` for size,
  add the mixin for voice) rather than swapping the class. `displayVoice()` is
  weight 400 - safe against Android subpixel hairline thinning even at small
  sizes.

**The sun's halo - the body may be warm, the light it casts is white:**
- Amber is **not** a day/night signal and **not** a role badge. On every one of
  minded's own surfaces - companion rest, intervention, breath, urge-surfing,
  the intent/time choices, the daily questions and their closing bloom - the
  sun's halo is white (`warmth` omitted on the settle). The warm, sunlit read
  comes from the disc *itself*: the `--minded-sun-face-edge` rim and the thin
  `--sun-shadow` edge ring.
- The test is **what the sun stands on**, not which process draws it. Amber is
  for the sun on a background we *don't* control - the Little Sun overlay (over
  arbitrary app content) and the small home-screen widget (transparent on the
  user's wallpaper) - where it must announce itself or read as a pale blob. A
  widget that paints the app's **own sky** behind the sun (the prompt card, both
  platforms) is our surface like any other, so the sun glows white there too.
- The departing hand-off warms to that amber *as it becomes* the Little Sun. The
  warming is the hand-off, not a state the in-app sun ever holds.
- The **arriving** hand-off - the same morph run the other way, when an
  intervention is re-shown after a session timer - does **not** warm. The halo
  answers to the surface the sun is moving *onto*: out to someone else's app it
  warms, home onto our own sky it stays white the whole glide. So an intervention
  never opens on amber, on any platform.
- Why: colour that changes with role turns the one continuous sun into a set of
  differently-coloured suns, and it made the everyday companion→intervention
  lift a colour change nobody asked for. White both ways keeps that morph pure
  size and position. The cool half of the glow axis is untouched - that still
  carries the up-drag/let-go read, and the moon never warms at all.
- Full reasoning and the guard tests: the `THE HALO RULE` block at the top of
  `src/shared/components/interaction/sun/sunSettle.ts`. `docs/sun-halo.md` maps
  what the sun looks like on *every* surface (day, night, and the Little
  Sun/widgets outside the app) - read it before changing any sun's appearance.

**Minimalism - remove before you add:**
- Default to the simplest UI that works: less visual chrome, fewer controls,
  fewer words. Every element must earn its place; when in doubt, leave it out.
- This is the UI expression of the minimalism principle in *Conceptual
  Fundamentals* - a quiet, uncluttered surface keeps cognitive load low and
  upholds the calm, never-striving premise.
