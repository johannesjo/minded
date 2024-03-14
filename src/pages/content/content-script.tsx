/* @refresh reload */
// @ts-ignore
import { isOnBlockedUrl } from "@src/util/isOnBlockedUrl";
import {
  countOpeningAttempt,
  getSyncData,
} from "@src/shared/data/dataInterface";
import { ContentScriptMain } from "@src/pages/content/ContentScriptMain";
// @ts-ignore
import styleAsString from "./content-script.scss?inline";
import { render } from "solid-js/web";
import { isShowMinder } from "@src/util/isShowMinder";

const CURRENT_URL = window.location.href;

(function init() {
  getSyncData().then((syncData) => {
    // console.log('isOnBlocked', isOnBlockedUrl(CURRENT_URL, syncData), syncData);
    if (isOnBlockedUrl(CURRENT_URL, syncData)) {
      countOpeningAttempt();

      if (isShowMinder(CURRENT_URL, syncData)) {
        async function innerInit() {
          if (!document.body) {
            self.setTimeout(() => {
              innerInit();
            }, 100);
            return;
          }

          // If we ever decide to go back to 2 files
          // const src = bro.runtime.getURL("js/content-script-inner.js");
          // const contentMain = await import(src);
          // console.log(contentMain);

          const wrapperEl = document.createElement("div");
          wrapperEl.id = "minded-6622";
          document.body.appendChild(wrapperEl);
          const styleTag = document.createElement("style");
          styleTag.textContent = styleAsString;
          document.head.appendChild(styleTag);

          render(() => (<ContentScriptMain />) as any, wrapperEl);
        }

        innerInit();
      }
    }
  });
})();
