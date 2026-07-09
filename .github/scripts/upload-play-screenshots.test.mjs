import assert from "node:assert/strict";
import test from "node:test";

import {
  isPermissionError,
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

test("flags the Play permission rejection so the CLI can hint at the fix", () => {
  assert.equal(
    isPermissionError(new Error("The caller does not have permission")),
    true,
  );
  assert.equal(isPermissionError({ code: 403, message: "Forbidden" }), true);
  // The real gaxios shape: numeric `status`, `code` left undefined.
  assert.equal(isPermissionError({ status: 403 }), true);
  // A stringly-typed status must not slip past the numeric check.
  assert.equal(isPermissionError({ code: "403", message: "x" }), true);
  assert.equal(isPermissionError({ response: { status: 403 } }), true);
  assert.equal(isPermissionError({ response: { status: 500 } }), false);
  assert.equal(isPermissionError(new Error("upload failed")), false);
  assert.equal(isPermissionError(null), false);
});
