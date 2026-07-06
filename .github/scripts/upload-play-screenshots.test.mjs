import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeLanguage,
  publishPhoneScreenshots,
} from "./upload-play-screenshots.mjs";

const createFakePublisher = ({ failOn } = {}) => {
  const state = {
    committed: false,
    images: ["old-screenshot.png"],
  };

  return {
    publisher: {
      edits: {
        insert: async () => ({ data: { id: "edit-1" } }),
        images: {
          deleteall: async () => {
            state.images = [];
          },
          upload: async ({ media }) => {
            if (media.body === failOn) throw new Error("upload failed");
            state.images.push(media.body);
          },
        },
        commit: async () => {
          state.committed = true;
        },
      },
    },
    state,
  };
};

test("replaces phone screenshots in order and commits the Play edit", async () => {
  const { publisher, state } = createFakePublisher();

  await publishPhoneScreenshots({
    androidpublisher: publisher,
    packageName: "com.minded.minded",
    language: "en-US",
    screenshotPaths: ["dashboard.png", "intent.png", "duration.png"],
    createMediaBody: (path) => path,
  });

  assert.deepEqual(state.images, [
    "dashboard.png",
    "intent.png",
    "duration.png",
  ]);
  assert.equal(state.committed, true);
});

test("does not commit a partial edit when an image upload fails", async () => {
  const { publisher, state } = createFakePublisher({ failOn: "intent.png" });

  await assert.rejects(
    publishPhoneScreenshots({
      androidpublisher: publisher,
      packageName: "com.minded.minded",
      language: "en-US",
      screenshotPaths: ["dashboard.png", "intent.png", "duration.png"],
      createMediaBody: (path) => path,
    }),
    /upload failed/,
  );

  assert.equal(state.committed, false);
});

test("rejects an empty screenshot set before opening a Play edit", async () => {
  const { publisher, state } = createFakePublisher();

  await assert.rejects(
    publishPhoneScreenshots({
      androidpublisher: publisher,
      packageName: "com.minded.minded",
      language: "en-US",
      screenshotPaths: [],
    }),
    /No screenshots/,
  );

  assert.deepEqual(state.images, ["old-screenshot.png"]);
  assert.equal(state.committed, false);
});

test("validates and canonicalizes the Play listing language", () => {
  assert.equal(normalizeLanguage("de-de"), "de-DE");
  assert.throws(() => normalizeLanguage("en-US/../../"), /Invalid language/);
});
