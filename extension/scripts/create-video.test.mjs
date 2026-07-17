import assert from "node:assert/strict";
import test from "node:test";

import {
  VIDEO_SCENES,
  createVideoUrl,
  getDownwardDragPath,
  installTransitionCurtain,
} from "./create-video.mjs";

test("the product video tells the pause, choose, continue story", () => {
  assert.deepEqual(
    VIDEO_SCENES.map((scene) => scene.target),
    [
      "dashboard",
      "draggable-sun",
      "intent-selection",
      "duration-selection",
      "q-something-i-am-looking-forward-to",
    ],
  );
});

test("video scenes use the real animated marketing surface", () => {
  const url = createVideoUrl("http://127.0.0.1:5175/", {
    target: "draggable-sun",
    theme: "dark",
  });

  assert.equal(
    url,
    "http://127.0.0.1:5175/?target=draggable-sun&theme=dark&platform=web-extension&skyHour=9",
  );
});

test("the sun gesture travels straight down past the completion threshold", () => {
  const path = getDownwardDragPath({ x: 100, y: 200, width: 120, height: 120 });

  assert.deepEqual(path[0], { x: 160, y: 260 });
  assert.deepEqual(path.at(-1), { x: 160, y: 430 });
  assert.equal(path.length, 13);
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
