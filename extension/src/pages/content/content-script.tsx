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
        // Apply critical styles inline to prevent host page CSS from hiding the element
        // (e.g., Reddit sets visibility:hidden on elements which overrides :host styles)
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
        `;
        document.body.appendChild(hostEl);

        // Use closed shadow DOM for style isolation from host page.
        // Note: Closed mode prevents element.shadowRoot access but does not
        // provide security boundaries - it's primarily for encapsulation.
        const shadow = hostEl.attachShadow({ mode: "closed" });

        // Inject styles into shadow DOM (completely isolated from host page)
        const styleTag = document.createElement("style");
        styleTag.textContent = styleAsString;
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
