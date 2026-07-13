import { androidInterface } from "@src/dataInterface/android/androidInterface";
import { safeJsonParse } from "@src/util/safeJsonParse";

interface AndroidInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Mirrors the iOS `setupUpdateInsets` for Android: writes the system-bar +
 * display-cutout insets reported by the host into `--safe-area-inset-*`
 * CSS variables on the app root, so existing CSS that references those
 * variables (BottomBar padding, RouteCmp top margin, .pageWrapper, etc.)
 * works the same on both platforms.
 *
 * Subsequent updates are pushed by the native side directly via
 * `evaluateJavascript` (see WebViewSafeAreaBridge.kt) - this function only
 * covers the boot-race where the OS dispatches insets before the page is
 * parsed. The native side keeps a holder we read once on init.
 */
export const setupAndroidInsets = (appEl: HTMLElement) => {
  const json = androidInterface.getSafeAreaInsets();
  const insets = safeJsonParse<AndroidInsets | null>(json, null);
  if (!insets) return;
  appEl.style.setProperty(`--safe-area-inset-top`, `${insets.top}px`);
  appEl.style.setProperty(`--safe-area-inset-right`, `${insets.right}px`);
  appEl.style.setProperty(`--safe-area-inset-bottom`, `${insets.bottom}px`);
  appEl.style.setProperty(`--safe-area-inset-left`, `${insets.left}px`);
};
