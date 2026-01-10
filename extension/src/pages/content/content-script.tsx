/* @refresh reload */
// @ts-ignore
import { isOnBlockedUrl } from "@src/util/isOnBlockedUrl";
import {
  countOpeningAttempt,
  getSyncData,
} from "@src/dataInterface/commonSyncDataInterface";
import { ContentScriptMain } from "@src/pages/content/ContentScriptMain";
// @ts-ignore
import styleAsString from "./content-script.scss?inline";
import { render, delegateEvents } from "solid-js/web";
import { isShowFullMinder } from "@src/util/isShowFullMinder";
import { isRestOfDayActive } from "@src/util/isRestOfDayActive";

const CURRENT_URL = window.location.href;

(function init() {
  getSyncData().then((syncData) => {
    // Rest-of-day mode: hide everything, don't inject anything
    if (isRestOfDayActive(syncData)) {
      return;
    }

    // console.log('isOnBlocked', isOnBlockedUrl(CURRENT_URL, syncData), syncData);
    if (isOnBlockedUrl(CURRENT_URL, syncData)) {
      countOpeningAttempt();

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
        const hasActiveSession =
          syncData.activeTimer && syncData.activeTimer.endTS > Date.now();

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

        // Teardown function removes the entire shadow host
        const teardownShadow = () => {
          hostEl.remove();
        };

        render(
          () => (
            <ContentScriptMain
              isShowFullMinderInitially={
                !hasActiveSession && isShowFullMinder(CURRENT_URL, syncData)
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
