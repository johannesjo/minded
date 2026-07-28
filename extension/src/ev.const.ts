export enum EV {}

export const REFRESH_DASHBOARD_EV = "refreshDashboardData";
export const ON_SHOW_INTERACTION_OVERLAY_EV = "showInterActionOverlay";

// "Re-roll the greeting tile so the next look surfaces a fresh one." Distinct
// from REFRESH_DASHBOARD_EV (a data refresh that deliberately preserves the
// current arrangement): this one re-picks the greeting. It is *only ever* fired
// while the dashboard is hidden from the user, so the swap is never watched:
//   - behind a fading-out interaction overlay (an interaction closing), or
//   - while the app itself is backgrounded (Android pause), so the fresh tile is
//     already in place by the time the user returns.
// The greeting is swapped *instantly* - no in-view cross-fade - because nothing
// is on screen to jar: you never land on the old tile and then watch it change;
// there is only ever the one fresh card. Changing a card in front of the user is
// deliberately avoided (calm is the product); a card only ever changes offscreen.
// This is also the *only* thing that changes it: a plain return to the dashboard
// holds the tile the user left (greetingMemory). So the event has two listeners -
// the dashboard re-rolls on the spot when it's mounted, and the always-mounted
// shell records the request for when it isn't (an interaction closing over
// another page, or the app backgrounded from one), which is the common case.
export const RE_GREET_DASHBOARD_HIDDEN_EV = "reGreetDashboardHidden";
