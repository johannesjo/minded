/* @refresh reload */
// @ts-ignore
import { isOnBlockedUrl } from "@src/util/isOnBlockedUrl";
import {
  countOpeningAttempt,
  getSyncData,
} from "@src/dataInterface/commonSyncDataInterface";
// @ts-ignore
import { loadDataForHost } from "@dataInterface/localDataInterface";
import { ContentScriptMain } from "@src/pages/content/ContentScriptMain";
// @ts-ignore
import styleAsString from "./content-script.scss?inline";
import { render, delegateEvents } from "solid-js/web";
import { isShowFullMinder } from "@src/util/isShowFullMinder";
import { isRestOfDayActive } from "@src/util/isRestOfDayActive";
import { getHostFromUrl } from "@src/util/getHostFromUrl";
import {
  getWebHostSessionTarget,
  hasActiveWebHostTimer,
} from "@src/util/activeTimerScope";
import { getEffectiveSessionDurationS } from "@src/util/sessionDuration";
import { startUsageTimeTracking } from "@src/pages/content/usageTimeTracker";

const CURRENT_URL = window.location.href;

// The content-script stylesheet is injected into a shadow DOM that lives on the
// *host* page, so any root-relative `url(/assets/…)` in it resolves against the
// host origin (https://host/assets/…) → 404. The night moon is a CSS background
// image (Sun.scss `.moon`), and its `background` shorthand leaves the disc's
// background-color transparent, so that 404 renders the moon as a see-through
// hole rather than the lunar photo (the "dark-mode sun is semi-transparent"
// bug). Repoint image URLs at the extension origin instead - the same trick
// sunAudio.getAudioUrl uses for the completion sounds. The moon is already in
// web_accessible_resources (CRXJS auto-exposes content-script-referenced
// assets), so the host page is allowed to fetch it once the URL is correct.
// Fonts (assets/woff2) are deliberately left alone: they already fall back
// cleanly to the system stack, so keep this scoped to the visible image bug.
const withExtensionAssetUrls = (css: string): string => {
  if (typeof chrome === "undefined" || !chrome.runtime?.getURL) return css;
  const base = chrome.runtime.getURL("/assets/webp/");
  return css.replace(/url\((['"]?)\/assets\/webp\//g, `url($1${base}`);
};

(function init() {
  getSyncData().then(async (initialSyncData) => {
    // console.log('isOnBlocked', isOnBlockedUrl(CURRENT_URL, syncData), syncData);
    if (isOnBlockedUrl(CURRENT_URL, initialSyncData)) {
      const currentHost = getHostFromUrl(CURRENT_URL);
      const currentTarget = getWebHostSessionTarget(currentHost);

      // Measure real foreground time on this blocked host for the present-moment
      // usage observation. Runs for the page's lifetime regardless of whether an
      // overlay shows (so rest-of-day visits are counted too).
      startUsageTimeTracking(currentHost);

      // Rest-of-day mode: hide everything for the current host.
      if (isRestOfDayActive(initialSyncData, currentTarget, "web")) {
        return;
      }

      try {
        await countOpeningAttempt();
      } catch (error) {
        console.error("Failed to count opening attempt", error);
      }

      const [syncData, dataForHost] = await Promise.all([
        getSyncData(),
        loadDataForHost(currentHost),
      ]);
      const sessionDurationS = getEffectiveSessionDurationS(
        dataForHost,
        Date.now(),
      );

      if (isRestOfDayActive(syncData, currentTarget, "web")) {
        return;
      }

      async function innerInit() {
        if (!document.body) {
          self.setTimeout(() => {
            innerInit();
          }, 100);
          return;
        }

        // Prevent duplicate injection
        if (document.getElementById("minded-6622-host")) {
          return;
        }

        // Check for active session using global timer
        const hasActiveSession = hasActiveWebHostTimer(
          syncData,
          currentHost,
          Date.now(),
        );

        // Create Shadow DOM host element for complete style isolation
        const hostEl = document.createElement("minded-app");
        hostEl.id = "minded-6622-host";
        // Host pages skip their single-key shortcuts (e.g. x.com "n" → New Post)
        // while the user is typing in a field. Keystrokes into minded's own inputs
        // are composed events that retarget to this host element when they reach the
        // page's document/activeElement, so the page reads a non-editable target and
        // fires its shortcut on every character (and preventDefaults it, so the char
        // never lands in minded's input either). Marking the host editable makes the
        // page's guard recognise that a field has focus - true: minded's field does.
        // Covers guards that consult contenteditable/isContentEditable, in either
        // capture or bubble, on document or window, by target or activeElement - where
        // stopPropagation from inside the shadow cannot (it runs too late for capture).
        // Shortcut: won't help a guard that checks element type only (INPUT/TEXTAREA,
        // never isContentEditable); upgrade path would re-dispatch into a real field.
        // tabindex=-1 keeps it out of the tab order while staying isContentEditable.
        // See issue #101.
        hostEl.setAttribute("contenteditable", "");
        hostEl.setAttribute("tabindex", "-1");
        // Apply critical styles inline to prevent host page CSS from hiding the element
        // (e.g., Reddit sets visibility:hidden on elements which overrides :host styles).
        // The host now matches [contenteditable] selectors, so neutralise any paint a
        // host page hangs on that selector - this is a full-viewport, max-z-index box.
        hostEl.style.cssText = `
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          height: 100% !important;
          z-index: 2147483647 !important;
          pointer-events: none !important;
          visibility: visible !important;
          display: block !important;
          opacity: 1 !important;
          background: transparent !important;
          border: 0 !important;
          outline: 0 !important;
          caret-color: transparent !important;
        `;
        document.body.appendChild(hostEl);

        // Use closed shadow DOM for style isolation from host page.
        // Note: Closed mode prevents element.shadowRoot access but does not
        // provide security boundaries - it's primarily for encapsulation.
        const shadow = hostEl.attachShadow({ mode: "closed" });

        // Inject styles into shadow DOM (completely isolated from host page)
        const styleTag = document.createElement("style");
        styleTag.textContent = withExtensionAssetUrls(styleAsString);
        shadow.appendChild(styleTag);

        // Create wrapper inside shadow DOM
        const wrapperEl = document.createElement("div");
        wrapperEl.id = "minded-6622";
        shadow.appendChild(wrapperEl);

        // Manually delegate events to shadow root instead of document
        // SolidJS's delegateEvents accepts a second parameter for the delegation root
        delegateEvents(
          [
            "click",
            "dblclick",
            "input",
            "change",
            "focusin",
            "focusout",
            "keydown",
            "keyup",
            "mousedown",
            "mouseup",
            "mousemove",
            "mouseenter",
            "mouseleave",
            "touchstart",
            "touchmove",
            "touchend",
            "pointerdown",
            "pointerup",
            "pointermove",
          ],
          shadow as unknown as Document,
        );

        let dispose: (() => void) | undefined;
        let isTornDown = false;

        // Teardown function disposes Solid state/listeners, then removes the host
        const teardownShadow = () => {
          if (isTornDown) return;
          isTornDown = true;
          dispose?.();
          hostEl.remove();
        };

        dispose = render(
          () => (
            <ContentScriptMain
              isShowFullMinderInitially={
                !hasActiveSession &&
                isShowFullMinder(CURRENT_URL, syncData, sessionDurationS)
              }
              shadowRoot={shadow}
              onTeardownShadow={teardownShadow}
            />
          ),
          wrapperEl,
        );
      }

      innerInit();
    }
  });
})();
