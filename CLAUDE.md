# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

minded is a multi-platform mindfulness and productivity application designed to help users fight social media addiction, doom-scrolling, and procrastination. It runs on:
- Browser Extension (Chrome/Firefox with Manifest V3)
- Android App (Native Kotlin + WebView)
- iOS App (Native Swift + Capacitor) — **not actively developed**: iOS cannot deliver real interventions due to platform restrictions on inspecting/blocking other apps, so new features should target Browser Extension and Android only. Don't spend effort updating iOS code paths unless explicitly asked.

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
- Button bases: `btnTxt`, `btnIco`, `btnToggleSelect`
- Button modifiers (compose onto a base): `isOutline`, `isBig`, `isPlain`, `isSmall`, `isSelected` (e.g., `btnTxt isOutline`, `btnIco isPlain`, `btnToggleSelect isSmall isSelected`)
- Typography: `h2`, `h3`, `txtBig`
- Global styles are in `src/styles/componentsShared/` and `src/styles/mixins/`
- Only create component-specific SCSS modules for layout, not for recreating existing button/input styles
