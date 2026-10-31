/**
 * Endless-feed apps - the usual places a doom-scroll happens. Only the picker's
 * ORDER uses this: nothing is preselected or badged, the user still chooses.
 * Messengers are deliberately left out; they're for people, not feeds.
 *
 * shortcut: a hand-kept package list - a missing feed app just sorts A-Z with
 * the rest. Upgrade path: Android's app category (ApplicationInfo.category
 * SOCIAL/VIDEO) from the native getAllApps, if the list goes stale.
 */
const FEED_APP_PACKAGES = new Set([
  "com.instagram.android",
  "com.instagram.lite",
  "com.instagram.barcelona", // Threads
  "com.zhiliaoapp.musically", // TikTok
  "com.ss.android.ugc.trill", // TikTok
  "com.ss.android.ugc.aweme", // TikTok (China)
  "com.google.android.youtube",
  "com.facebook.katana",
  "com.facebook.lite",
  "com.twitter.android",
  "com.twitter.android.lite",
  "com.reddit.frontpage",
  "com.snapchat.android",
  "com.pinterest",
  "com.tumblr",
  "com.linkedin.android",
  "tv.twitch.android.app",
  "xyz.blueskyweb.app",
  "org.joinmastodon.android",
  "com.ninegag.android.app",
]);

type PickerApp = { packageName: string; name: string };

/**
 * Real phones list 60-150 apps A-Z, which buries the handful most people came
 * here for. Order: the apps already chosen (so the current choice is visible
 * without scrolling), then the installed feed apps, then the rest. Each group
 * keeps the native alphabetical order.
 *
 * Call it once per open, with the choice as it stood then - re-sorting on
 * every toggle would make the row the user just tapped jump away.
 */
export const sortAppsForPicker = <T extends PickerApp>(
  apps: T[],
  chosen: readonly string[] = [],
): T[] => {
  const isChosen = (a: T) => chosen.includes(a.packageName);
  const isFeed = (a: T) => !isChosen(a) && FEED_APP_PACKAGES.has(a.packageName);
  return [
    ...apps.filter(isChosen),
    ...apps.filter(isFeed),
    ...apps.filter((a) => !isChosen(a) && !isFeed(a)),
  ];
};

/** Below this many apps a filter field is chrome that hasn't earned its place. */
export const APP_FILTER_MIN_APPS = 20;

/** Case-insensitive name match; an empty query keeps every app. */
export const filterAppsForPicker = <T extends PickerApp>(
  apps: T[],
  query: string,
): T[] => {
  const q = query.trim().toLocaleLowerCase();
  return q ? apps.filter((a) => a.name.toLocaleLowerCase().includes(q)) : apps;
};
