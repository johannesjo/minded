export enum EV {}

export const REFRESH_DASHBOARD_EV = "refreshDashboardData";
export const ON_SHOW_INTERACTION_OVERLAY_EV = "showInterActionOverlay";

// "You've just arrived at (or returned to) the dashboard." Distinct from
// REFRESH_DASHBOARD_EV (a data refresh that deliberately preserves the current
// arrangement): this one re-rolls the greeting tile so each arrival surfaces a
// fresh one. Fired on app resume — a moment the user lands back on the dashboard,
// in view, without the view remounting, so the swap is a calm in-view cross-fade.
export const RE_GREET_DASHBOARD_EV = "reGreetDashboard";

// The system safe-area insets changed (rotation, gesture-nav swap, multi-window,
// or the boot-race where the host reports them after first paint). Both mobile
// hosts deliver inset changes out-of-band from `resize`: Android's native bridge
// fires `androidSafeAreaChanged` (see WebViewSafeAreaBridge.kt), iOS dispatches
// this event from setupUpdateInsets. Anything whose layout is JS-derived from an
// inset (the companion sun's bottom-bar anchor) must re-sync on it — the CSS that
// reads `--safe-area-inset-*` reacts on its own, but a JS-pinned position won't,
// so the two would drift apart by exactly the inset.
export const SAFE_AREA_INSETS_CHANGED_EV = "safeAreaInsetsChanged";

// Like RE_GREET_DASHBOARD_EV, but fired while the dashboard is still hidden behind
// a fading-out overlay (an interaction closing). The greeting is swapped
// *instantly* — no in-view cross-fade — so the fresh tile is already in place,
// gently easing in, when the overlay reveals it. You never land on the old tile
// and then watch it change; there is only ever the one fresh card.
export const RE_GREET_DASHBOARD_HIDDEN_EV = "reGreetDashboardHidden";
