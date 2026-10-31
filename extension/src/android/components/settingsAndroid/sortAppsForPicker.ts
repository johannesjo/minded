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
 * here for. Lift the installed feed apps to the top; both groups keep the
 * native alphabetical order.
 */
export const sortAppsForPicker = <T extends PickerApp>(apps: T[]): T[] => [
  ...apps.filter((a) => FEED_APP_PACKAGES.has(a.packageName)),
  ...apps.filter((a) => !FEED_APP_PACKAGES.has(a.packageName)),
];
