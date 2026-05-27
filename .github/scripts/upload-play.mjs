#!/usr/bin/env node

/**
 * Upload an AAB to the Google Play Developer API.
 *
 * Replaces r0adkll/upload-google-play, whose error handler reports every
 * API failure as "Unknown error occurred" — it reads err.message, but the
 * Play API attaches the real message to err.errors[0].message and
 * err.response.data.error. We surface both so CI failures are debuggable.
 *
 * Env:
 *   SERVICE_ACCOUNT_JSON  raw JSON of the service account key
 *   PACKAGE_NAME          e.g. com.minded.minded
 *   AAB_PATH              path to the signed AAB
 *   TRACK                 internal | alpha | beta | production (default: internal)
 *   STATUS                draft | inProgress | halted | completed (default: completed)
 */

import { google } from 'googleapis';
import { createReadStream, statSync } from 'fs';

const {
  SERVICE_ACCOUNT_JSON,
  PACKAGE_NAME,
  AAB_PATH,
  TRACK = 'internal',
  STATUS = 'completed',
} = process.env;

if (!SERVICE_ACCOUNT_JSON || !PACKAGE_NAME || !AAB_PATH) {
  console.error('Missing required env: SERVICE_ACCOUNT_JSON, PACKAGE_NAME, AAB_PATH');
  process.exit(1);
}

const credentials = JSON.parse(SERVICE_ACCOUNT_JSON);
console.log(`Service account: ${credentials.client_email}`);
console.log(`Project: ${credentials.project_id}`);
console.log(`Package: ${PACKAGE_NAME}`);
console.log(`AAB: ${AAB_PATH} (${statSync(AAB_PATH).size} bytes)`);
console.log(`Track: ${TRACK} (status=${STATUS})`);

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/androidpublisher'],
});

const androidpublisher = google.androidpublisher({ version: 'v3', auth });

async function main() {
  console.log('\n[1/4] Creating edit...');
  const edit = await androidpublisher.edits.insert({ packageName: PACKAGE_NAME });
  const editId = edit.data.id;
  console.log(`  editId=${editId}`);

  console.log('[2/4] Uploading bundle...');
  const upload = await androidpublisher.edits.bundles.upload({
    packageName: PACKAGE_NAME,
    editId,
    media: {
      mimeType: 'application/octet-stream',
      body: createReadStream(AAB_PATH),
    },
  });
  const versionCode = upload.data.versionCode;
  console.log(`  versionCode=${versionCode} sha1=${upload.data.sha1}`);

  console.log(`[3/4] Assigning versionCode ${versionCode} to ${TRACK}...`);
  await androidpublisher.edits.tracks.update({
    packageName: PACKAGE_NAME,
    editId,
    track: TRACK,
    requestBody: {
      track: TRACK,
      releases: [{ status: STATUS, versionCodes: [String(versionCode)] }],
    },
  });

  console.log('[4/4] Committing edit...');
  await androidpublisher.edits.commit({ packageName: PACKAGE_NAME, editId });

  console.log(`\nDone: ${PACKAGE_NAME} versionCode ${versionCode} -> ${TRACK}`);
}

main().catch((err) => {
  console.error('\nUpload failed.');
  console.error(`Top-level message: ${err.message || '(none)'}`);
  if (err.code) console.error(`HTTP code: ${err.code}`);
  if (err.errors) {
    console.error('err.errors:');
    console.error(JSON.stringify(err.errors, null, 2));
  }
  if (err.response?.data) {
    console.error('err.response.data:');
    console.error(JSON.stringify(err.response.data, null, 2));
  }
  process.exit(1);
});
