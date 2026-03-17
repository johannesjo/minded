# Styling Reference

## Core Rule

All visual styling (colors, typography, spacing, borders, shadows) must come from **CSS variables**, **global classes**, or **UI components**. Component `.module.scss` files should only handle **positioning and layout** (flexbox/grid, margins, widths). Never hardcode colors, font sizes, or radii in component styles.

## CSS Variables (`src/styles/_variables.scss`)

| Category | Variables |
|----------|-----------|
| **Font sizes** | `--fz-xxl` (40px), `--fz-xl` (32px), `--fz-l` (24px), `--fz-m` (19px), `--fz-s` (14px) |
| **Colors** | `--c-fg` (text), `--c-fg-full-emphasis` (bold text), `--c-link-color` (links) |
| **Buttons** | `--btn-height` (56px), `--btn-height-bigger` (64px), `--btn-small` (40px), `--btn-bg`, `--btn-bg-selected`, `--btn-bg-not-selected` |
| **Forms** | `--form-inputs-bg`, `--form-inputs-height`, `--form-inputs-height-smaller` (40px) |
| **Cards** | `--dashboard-card-bg`, `--dashboard-card-bg-hover`, `--dashboard-card-border-radius` (24px) |
| **Layout** | `--border-radius` (8px), `--bottom-bar-height`, `--safe-area-inset-*` |
| **Gradient** | `--c-gradient-1/2/3`, `--background-gradient` |

Dark mode is handled automatically — variables are redefined under `.minded-6622-dark`.

## Global Classes

**Buttons** (`src/styles/componentsShared/btn.scss`):
- `btnTxt` — Standard text button
- `btnTxtOutline` — Outlined text button
- `btnIco` — Icon button with background
- `btnIcoOnly` — Icon button, background appears on hover
- `btnToggleSelect` — Toggle button, add `isSelected` for active state (scales to 1.1)
- `btnToggleSelectSmall` — Smaller toggle variant (36px)

**Typography** (`src/styles/mixins/allTypo.scss`):
- `h2` — Light weight (200), `--fz-xxl`, lowercase
- `h3` — Bold (700), `--fz-l`
- `txtBig` — `--fz-xl`
- `txtSlightlyBigger` — `--fz-l`
- `txtSmaller` — `--fz-m`
- `fatTxt` — `--fz-xl`, medium weight (500)
- `dashboardHeading` / `dashboardContent` — Dashboard-specific sizing

**Cards** (`src/styles/componentsMainOnly/card.scss`):
- `card` — Semi-transparent background, rounded corners
- `cardDashboard` — Dashboard card variant

**State classes**: `isSelected`, `isDisabled`, `isVisible`, `isChecked`, `active`, `done`

## UI Components (`src/shared/components/ui/`)

Use these instead of styling raw elements:
- **TextInput** — Text input with focus animation
- **TimeInput** — Fixed-width time input
- **Checkbox** — Custom styled checkbox
- **Toggle** — On/off switch
- **Stepper** — Multi-step progress indicator
- **Toast** — Bottom notification bar
- **Rating** — Star/image rating
- **Ico** — Icon wrapper (auto-inverts in dark mode)
- **ButtonWrapper** — Button composition helper
- **TglBtns** — Toggle button group
- **SaveBtn** — Save action button

## Mixins (`src/styles/mixins/`)

**Responsive & platform** (`util.scss`):
- `@include onSmallScreens()` — max-width 599px
- `@include onNonMobileScreens()` — min-width 650px
- `@include onWebExtension()` / `onMobileApp()` — Platform-scoped styles
- `@include inDarkMode()` — Dark mode overrides
- `@include onTouchPrimary()` / `onMousePrimary()` — Input-type scoping

**Animation** (`_ani.scss`):
- `@include standardPageTransitionIn()` — 1000ms fade-in

Use button/form mixins (`btn.scss`, `form.scss`) only when creating new global classes, not in component modules.

## Do / Don't Quick Reference

| Need | Do this | Don't do this |
|------|---------|---------------|
| Style a button | Use `btnTxt`, `btnToggleSelect`, etc. | Write custom button styles in `.module.scss` |
| Set font size | Use typography class (`h3`, `txtBig`) or `var(--fz-*)` | Hardcode `font-size: 24px` |
| Set colors | Use `var(--c-fg)`, `var(--btn-bg)`, etc. | Hardcode `color: rgba(0,0,0,0.85)` |
| Handle dark mode | Rely on CSS variables or `@include inDarkMode()` | Duplicate color definitions |
| Style an input | Use `TextInput` / `TimeInput` component | Apply `formInput` mixin in a component module |
| Position elements | Use `.module.scss` with flexbox/grid | — (this is correct) |
| Add a card | Use `card` / `cardDashboard` class | Recreate card background/border-radius |
