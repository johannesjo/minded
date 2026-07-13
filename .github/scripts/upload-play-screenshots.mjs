#!/usr/bin/env node
// @ts-nocheck

import { createReadStream, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { google } from "googleapis";

export const PHONE_SCREENSHOT_FILES = [
  "dashboard.png",
  "question-looking-forward.png",
  "draggable-sun.png",
  "intent-selection.png",
  "duration-selection.png",
  "draggable-moon-dark.png",
  "intent-selection-dark.png",
  "duration-selection-dark.png",
];

export function normalizeLanguage(language) {
  try {
    const [canonical] = Intl.getCanonicalLocales(language);
    if (canonical) return canonical;
  } catch {
    // Fall through to the stable error below.
  }
  throw new Error(`Invalid language tag: ${language}`);
}

// Releasing binaries and editing the store listing are gated by *different*
// Play permissions, so the release service account can commit AABs yet still be
// rejected here. Play defers that check to commit time, so the raw error is an
// opaque "The caller does not have permission" - this points at the real fix.
export const PERMISSION_HINT =
  'Play rejected the store-listing edit as unauthorized. This service account ' +
  'can release app binaries but appears to lack the "Manage store presence" ' +
  "permission required to edit the store listing (screenshots, graphics, " +
  "text). Grant it in Play Console -> Users & permissions for this app, then " +
  "re-run.";

export function isPermissionError(error) {
  if (!error) return false;
  // Check every field a googleapis/gaxios version might carry the status on
  // (a real 403 lands on `status`, code is left undefined) instead of a `??`
  // chain, so a non-numeric `code` can't short-circuit past a 403 `status`.
  const codes = [error.code, error.status, error.response?.status];
  if (codes.some((value) => Number(value) === 403)) return true;
  return /does not have permission/i.test(String(error.message ?? ""));
}

export async function publishPhoneScreenshots({
  androidpublisher,
  packageName,
  language,
  screenshotPaths,
  createMediaBody = createReadStream,
}) {
  if (!screenshotPaths.length) {
    throw new Error("No screenshots were provided.");
  }

  const edit = await androidpublisher.edits.insert({ packageName });
  const editId = edit.data.id;
  const imageParams = {
    packageName,
    editId,
    language,
    imageType: "phoneScreenshots",
  };

  await androidpublisher.edits.images.deleteall(imageParams);

  for (const screenshotPath of screenshotPaths) {
    await androidpublisher.edits.images.upload({
      ...imageParams,
      media: {
        mimeType: "image/png",
        body: createMediaBody(screenshotPath),
      },
    });
  }

  await androidpublisher.edits.commit({ packageName, editId });
  return { editId, uploaded: screenshotPaths.length };
}

async function main() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const defaultScreenshotDir = path.resolve(
    scriptDir,
    "../../extension/screenshots/google-play/phone",
  );
  const {
    SERVICE_ACCOUNT_JSON,
    PACKAGE_NAME = "com.minded.minded",
    LANGUAGE = "en-US",
    SCREENSHOT_DIR = defaultScreenshotDir,
  } = process.env;

  if (!SERVICE_ACCOUNT_JSON) {
    throw new Error("Missing required env: SERVICE_ACCOUNT_JSON");
  }
  const language = normalizeLanguage(LANGUAGE);

  const screenshotPaths = PHONE_SCREENSHOT_FILES.map((file) =>
    path.resolve(SCREENSHOT_DIR, file),
  );
  const missing = screenshotPaths.filter((file) => !existsSync(file));
  if (missing.length) {
    throw new Error(`Missing screenshots:\n${missing.join("\n")}`);
  }

  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(SERVICE_ACCOUNT_JSON),
    scopes: ["https://www.googleapis.com/auth/androidpublisher"],
  });
  const authClient = await auth.getClient();
  const androidpublisher = google.androidpublisher({
    version: "v3",
    auth: authClient,
  });

  console.log(
    `Replacing ${screenshotPaths.length} ${language} phone screenshots for ${PACKAGE_NAME}...`,
  );
  const result = await publishPhoneScreenshots({
    androidpublisher,
    packageName: PACKAGE_NAME,
    language,
    screenshotPaths,
  });
  console.log(`Committed Play edit ${result.editId}.`);
}

const entryPoint = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : undefined;
if (import.meta.url === entryPoint) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack : error);
    if (isPermissionError(error)) {
      console.error(`\n${PERMISSION_HINT}`);
    }
    process.exitCode = 1;
  });
}
