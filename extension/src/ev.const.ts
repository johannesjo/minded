export enum EV {}

export const REFRESH_DASHBOARD_EV = "refreshDashboardData";
export const ON_SHOW_INTERACTION_OVERLAY_EV = "showInterActionOverlay";

// "You've just arrived at (or returned to) the dashboard." Distinct from
// REFRESH_DASHBOARD_EV (a data refresh that deliberately preserves the current
// arrangement): this one re-rolls the greeting tile so each arrival surfaces a
// fresh one. Fired on app resume and when an interaction overlay closes — the
// moments the user lands back on the dashboard without the view remounting.
export const RE_GREET_DASHBOARD_EV = "reGreetDashboard";
