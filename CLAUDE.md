# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

minded is a multi-platform mindfulness and productivity application designed to help users fight social media addiction, doom-scrolling, and procrastination. It runs on:
- Browser Extension (Chrome/Firefox with Manifest V3)
- Android App (Native Kotlin + WebView)
- iOS App (Native Swift + Capacitor) — **not actively developed**: iOS *can* technically block apps (the Screen Time API — `FamilyControls`/`ManagedSettings`/`DeviceActivity` — the way one sec/Opal do), so "iOS can't intervene" is false. The real blocker is conceptual: that primitive is a parental-controls *wall*, and iOS gives no way to deliver the sun *as* the interrupt. The only effective interrupt (a shield) is the wrong shape for minded's soft, never-forced approach; the only on-philosophy alternative (a dismissible notification) is too weak to interrupt a doom-scroll. So new features target Browser Extension and Android only. Don't spend effort updating iOS code paths unless explicitly asked. Full reasoning: `docs/ios-platform-fit.md`.

## Conceptual Fundamentals

These are the load-bearing ideas behind the product. They shape almost every
feature decision — read them before proposing changes to interventions.

- **Mindfulness app first, not a productivity tracker.** The goal is *awareness
  without judgment*, not "be more efficient" or "scroll less and prove it."
  Anything that reintroduces striving betrays the premise. Deliberately avoid:
  streaks, "days clean", "minutes saved", efficiency scores, success/failure
  tallies, daily goals, trend-up graphs, social comparison — and anything that
  manufactures scarcity, urgency, or guilt (e.g. "you've used up your budget").

- **The sun is the central mechanic and *is* the pause.** When an intervention
  fires, a draggable animated sun appears; tapping/flinging it is the universal,
  always-available escape hatch. Tapping it opens a calm pause — but the everyday
  sun does **not** "breathe": the slow in/out breathing swell is reserved for
  guided meditations only (e.g. urge-surfing). Outside meditations the pause is
  carried by the sun's quiet presence and its soft morph into place, never a
  separate "take a breath" UI and never a repeating breath. The sun rests on the
  dashboard bottom bar as a companion; drag up → intervention, drag down →
  optional grounding offer.

- **The sun always *morphs*, and there is only ever one.** Across screens and
  states the sun is a single continuous object that glides/scales from one
  surface to the next — it must never hard-cut, vanish, or appear in two places
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

- **Minimalism is the default design principle — for both UX and UI.** Always
  prefer the simplest thing that works. Fewer screens, fewer options, fewer
  words, fewer controls, less visual chrome. Every element must earn its place;
  when in doubt, leave it out. This reinforces the calm, never-striving premise:
  a quiet, uncluttered surface lowers cognitive load, and added complexity is a
  cost paid by the user. Remove before you add.

## Essential Commands

All npm scripts live in `extension/package.json` — run them from the `extension/` directory.

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
- Buttons: use the `<Btn>` component (`src/shared/components/ui/Btn.tsx`) — never write raw `<button class="btn…">`. It has three typed bases and a curated, type-checked set of modifiers, so screens can't sprout one-off button looks:
  - `<Btn>` (text, default) with `outline` / `big`
  - `<Btn variant="icon">` with `small` / `plain`
  - `<Btn variant="toggle">` with `small` / `selected`
  - `href` renders a link (router `<A>` for internal routes, plain `<a>` for external/mailto)
  - The underlying `btnTxt` / `btnIco` / `btnToggleSelect` SCSS classes (in `src/styles/`) are an implementation detail of `<Btn>`
- Typography: `h2`, `h3`, `txtBig`
- Global styles are in `src/styles/componentsShared/` and `src/styles/mixins/`
- Only create component-specific SCSS modules for layout, not for recreating existing button/input styles

**Transitions — always soft, never hard cuts:**
- As a rule, *all* transitions should aim for softness. Anything that changes
  on screen — a surface, a state, a value, a piece of motion — should ease in
  and out rather than snap. Softness is the default; a hard cut needs a reason.
- Every overlay and page transition (open, close, decline, "Not now", success)
  must fade — never snap in or out. Calmness is the product; an abrupt cut reads
  as a jolt and betrays the premise. Reuse the existing fade helpers
  (`fadeOut` in `src/util/animation.ts`, `ANIMATION_TIMING`) and the established
  patterns (e.g. `InteractionOverlay`'s `handleHideWithFade`) rather than
  unmounting straight to the next surface.

**Minimalism — remove before you add:**
- Default to the simplest UI that works: less visual chrome, fewer controls,
  fewer words. Every element must earn its place; when in doubt, leave it out.
- This is the UI expression of the minimalism principle in *Conceptual
  Fundamentals* — a quiet, uncluttered surface keeps cognitive load low and
  upholds the calm, never-striving premise.
