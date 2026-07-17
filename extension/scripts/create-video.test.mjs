import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  VIDEO_SCENES,
  VIDEO_COPY,
  VIDEO_SITES,
  VIDEO_TIMING,
  createVideoUrl,
  getDownwardDragPath,
  getPointerApproachPath,
  installTransitionCurtain,
  loadScene,
} from "./create-video.mjs";

const screenshotsSource = await readFile(
  new URL("../src/pages/screenshots/Screenshots.tsx", import.meta.url),
  "utf8",
);
const screenshotsStyles = await readFile(
  new URL("../src/pages/screenshots/screenshots.module.scss", import.meta.url),
  "utf8",
);
const videoSource = await readFile(
  new URL("./create-video.mjs", import.meta.url),
  "utf8",
);

test("the product video enters the real question-first intervention flow", () => {
  assert.deepEqual(
    VIDEO_SCENES.map((scene) => scene.target),
    ["browser-social", "browser-intervention"],
  );
});

test("the opening makes the social-media loop tangible", () => {
  assert.deepEqual(VIDEO_SITES, [
    "youtube",
    "reddit",
    "x",
    "tiktok",
    "instagram",
  ]);
});

test("visited social sites remain visible in a literal page pile", () => {
  assert.match(screenshotsSource, /styles\.isYoutubePile/);
  assert.match(screenshotsSource, /styles\.isRedditPile/);
  assert.match(screenshotsSource, /styles\.isXPile/);
  assert.match(screenshotsSource, /styles\.isTiktokPile/);
  assert.match(screenshotsSource, /styles\.isInstagramPile/);
  assert.match(
    screenshotsStyles,
    /\.isInstagramPile[\s\S]*\.youtubePage[\s\S]*\.redditPage[\s\S]*\.xPage[\s\S]*\.tiktokPage[\s\S]*\.instagramPage/,
  );
});

test("the pile names the loop once the first new page lands", () => {
  assert.match(screenshotsSource, /Stuck in a loop\?/);
  assert.match(screenshotsSource, /styles\.loopCaption/);
  assert.match(screenshotsSource, /props\.site !== "youtube"/);
  assert.match(
    screenshotsStyles,
    /\.loopCaption[\s\S]*\.isVisible[\s\S]*opacity: 1/,
  );
});

test("video scenes use the real animated marketing surface", () => {
  const url = createVideoUrl("http://127.0.0.1:5175/", {
    target: "draggable-sun",
    theme: "dark",
  });

  assert.equal(
    url,
    "http://127.0.0.1:5175/?target=draggable-sun&theme=dark&platform=web-extension&skyHour=9&browser=1",
  );
});

test("the sun gesture eases smoothly down past the completion threshold", () => {
  const path = getDownwardDragPath({ x: 100, y: 200, width: 120, height: 120 });

  assert.deepEqual(path[0], { x: 160, y: 260 });
  assert.deepEqual(path.at(-1), { x: 160, y: 430 });
  assert.equal(path.length, 33);

  const firstStep = path[1].y - path[0].y;
  const middleStep = path[12].y - path[11].y;
  const lastStep = path.at(-1).y - path.at(-2).y;
  assert.ok(firstStep < middleStep);
  assert.ok(lastStep < middleStep);
});

test("the instructions linger before the drag begins", () => {
  assert.ok(VIDEO_TIMING.instructionsMs >= 2200);
});

test("the story chooses an alternative and makes the outcome explicit", () => {
  assert.deepEqual(VIDEO_COPY, {
    choice: "take a short walk",
    endTitle: "A pause\nbefore the scroll.",
    endSubtitle: "You decide what happens next.",
  });
  assert.ok(VIDEO_TIMING.tabCloseMs >= 1000);
});

test("the final message eases in after its backdrop starts softening", () => {
  assert.ok(VIDEO_TIMING.endBackdropLeadMs >= 250);
  assert.ok(VIDEO_TIMING.endHoldMs >= 2200);
  assert.match(videoSource, /minded-video-card-content/);
  assert.match(videoSource, /is-backdrop-visible[\s\S]*is-content-visible/);
});

test("quick-answer interventions do not reserve hidden input space in the video", () => {
  assert.match(screenshotsSource, /class=\{styles\.browserIntervention\}/);
  assert.match(
    screenshotsStyles,
    /\.browserIntervention[\s\S]*:has\(\.question-chips\)[\s\S]*\.question-body[\s\S]*display: none;/,
  );
});

test("the visible pointer approaches the sun before dragging it", () => {
  const path = getPointerApproachPath({ x: 160, y: 260 });

  assert.deepEqual(path[0], { x: 250, y: 190 });
  assert.deepEqual(path.at(-1), { x: 160, y: 260 });
  assert.equal(path.length, 9);
});

test("the transition curtain waits for the document root", () => {
  const originalDocument = global.document;
  let onDocumentReady;
  let appendedStyle;

  global.document = {
    documentElement: null,
    createElement: () => ({}),
    addEventListener: (name, listener) => {
      assert.equal(name, "DOMContentLoaded");
      onDocumentReady = listener;
    },
  };

  try {
    installTransitionCurtain();
    assert.equal(typeof onDocumentReady, "function");

    global.document.documentElement = {
      appendChild: (element) => {
        appendedStyle = element;
      },
    };
    onDocumentReady();

    assert.match(appendedStyle.textContent, /minded-video-revealed/);
  } finally {
    global.document = originalDocument;
  }
});

test("the intervention switches in place so the browser frame never blanks", async () => {
  const calls = [];
  const page = {
    goto: async (...args) => calls.push(["goto", ...args]),
    evaluate: async (_callback, value) => calls.push(["evaluate", value]),
  };
  const scene = { target: "browser-intervention", theme: "light" };

  await loadScene(page, scene, "http://127.0.0.1:5175/", false);

  assert.deepEqual(calls, [
    [
      "evaluate",
      {
        target: "browser-intervention",
        url: "http://127.0.0.1:5175/?target=browser-intervention&theme=light&platform=web-extension&skyHour=9&browser=1",
      },
    ],
  ]);
});
