# Plan: Optimized Content Script Injection with Shadow DOM

## Current State Analysis

### How the Content Script Currently Works

1. **Entry Point**: `extension/src/pages/content/content-script.tsx`
   - Runs at `document_start` (manifest.ts:29)
   - Immediately calls `getSyncData()` to check if current URL is blocked
   - If blocked: creates a wrapper div `#minded-6622`, appends styles to `<head>`, and renders the SolidJS app

2. **Current DOM Injection**:
   ```tsx
   const wrapperEl = document.createElement("div");
   wrapperEl.id = "minded-6622";
   document.body.appendChild(wrapperEl);
   const styleTag = document.createElement("style");
   styleTag.textContent = styleAsString;  // ~large CSS bundle
   document.head.appendChild(styleTag);
   ```

3. **Problems with Current Approach**:
   - **CSS Pollution**: All styles injected into the main document's `<head>` (~155 lines of SCSS compiled)
   - **Style Bleeding**: Uses `!important` and very high `z-index` values to fight host page styles
   - **Namespace Collisions**: Relies on `#minded-6622` prefix for everything, but could still conflict
   - **Memory Footprint**: All CSS parsed and applied even when LittleSun (minimal UI) is shown
   - **No Lazy Loading**: Full interaction UI styles loaded even when only showing the small sun indicator

---

## Proposed Implementation Plan

### Phase 1: Shadow DOM Encapsulation

**Goal**: Completely isolate minded's UI from host page styles.

#### 1.1 Create Shadow Root Host
Replace direct DOM injection with Shadow DOM:

```tsx
// content-script.tsx
const hostEl = document.createElement("minded-app");
hostEl.id = "minded-6622-host";
document.body.appendChild(hostEl);

const shadow = hostEl.attachShadow({ mode: "closed" });

// Styles now scoped to shadow
const styleTag = document.createElement("style");
styleTag.textContent = styleAsString;
shadow.appendChild(styleTag);

// Render SolidJS into shadow root
const wrapperEl = document.createElement("div");
wrapperEl.id = "minded-6622";
shadow.appendChild(wrapperEl);

render(() => <ContentScriptMain ... />, wrapperEl);
```

#### 1.2 Update SCSS for Shadow DOM
- Remove excessive `!important` flags (no longer fighting host styles)
- Simplify selectors (no need for `#minded-6622` prefix on everything)
- Keep CSS custom properties for theming (they pierce shadow boundaries)

#### 1.3 Handle Font Inheritance
Shadow DOM doesn't inherit fonts. Add explicit font-face declarations or use `adoptedStyleSheets` for shared fonts.

**Files to modify**:
- `extension/src/pages/content/content-script.tsx`
- `extension/src/pages/content/content-script.scss`
- `extension/src/styles/_sharedAll.scss` (remove `!important` flags)

---

### Phase 2: Lazy Style Loading (Optional Optimization)

**Goal**: Only load heavy interaction styles when needed.

#### 2.1 Split Styles into Tiers

**Tier 1 - Always Loaded** (tiny footprint):
- Host element positioning
- LittleSun component only

**Tier 2 - Loaded on Demand**:
- Full interaction UI (question, sun, background transitions)
- Only injected when `isShowFullMinder` becomes true

#### 2.2 Implementation Approach

```tsx
// LittleSun styles loaded immediately (small)
import littleSunStyles from "./little-sun-only.scss?inline";

// Full interaction styles loaded lazily
const loadFullStyles = () => import("./interaction-full.scss?inline");

// In component:
if (isShowFullMinder) {
  const fullStyles = await loadFullStyles();
  injectStyles(shadow, fullStyles.default);
}
```

**Files to modify/create**:
- Create `extension/src/pages/content/styles/little-sun-only.scss`
- Create `extension/src/pages/content/styles/interaction-full.scss`
- Update `extension/src/pages/content/ContentScriptMain.tsx` to handle lazy loading

---

### Phase 3: Minimize Initial Memory Footprint

**Goal**: Reduce memory usage on pages where minded is not triggered.

#### 3.1 Defer All Work Until Needed
The current script already only injects when `isOnBlockedUrl()` returns true, which is good.

#### 3.2 Use Closed Shadow DOM
Using `{ mode: "closed" }` prevents external JavaScript from accessing the shadow root, providing additional isolation.

#### 3.3 Clean Up on Teardown
Ensure complete cleanup when the user dismisses minded:
```tsx
props.teardown = () => {
  hostEl.remove(); // Removes shadow root and all contents
};
```

---

## Implementation Order

1. **Phase 1.1-1.3**: Shadow DOM encapsulation (core change)
2. **Phase 3**: Cleanup improvements
3. **Phase 2** (optional): Lazy style loading

---

## Testing Checklist

- [ ] Content script loads correctly in shadow DOM
- [ ] Styles don't bleed from host page into minded UI
- [ ] Styles don't bleed from minded UI into host page
- [ ] Dark mode theming still works (CSS variables pierce shadow)
- [ ] LittleSun renders and animates correctly
- [ ] Full interaction renders and animates correctly
- [ ] Teardown removes all elements cleanly
- [ ] Works on YouTube, Twitter, Reddit (known complex pages)
- [ ] No console errors about undefined shadow root
- [ ] `stopAllVideos()` utility still works (queries host page, not shadow)

---

## Considerations

### Why Closed Shadow DOM?
- Prevents host page scripts from manipulating minded's UI
- Better encapsulation guarantees
- No debugging via `element.shadowRoot` in production (tradeoff)

### CSS Custom Properties
CSS variables defined on `:host` or inherited from document still work with shadow DOM. The existing theming approach using `--c-fg`, `--c-bg`, etc. will continue to work.

### Event Handling
Events bubble across shadow boundaries via `composed: true`. The existing event handling should work unchanged.

### Fonts
May need to explicitly import web fonts inside shadow DOM or use `@font-face` with absolute URLs.
