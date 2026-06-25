#!/usr/bin/env node
// @ts-nocheck

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

const required = { SERVICE_ACCOUNT_JSON, PACKAGE_NAME, AAB_PATH };
const missing = Object.entries(required)
  .filter(([, v]) => !v)
  .map(([k]) => k);
if (missing.length) {
  console.error(`Missing required env: ${missing.join(', ')}`);
  for (const [k, v] of Object.entries(required)) {
    console.error(`  ${k}: ${v ? `set (${v.length} chars)` : 'EMPTY'}`);
  }
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

// Network-level hiccups and 5xx/429 responses from the Google APIs are
// transient — the token endpoint in particular likes to drop the connection
// mid-response (ERR_STREAM_PREMATURE_CLOSE), which would otherwise fail an
// entire release. Genuine errors (auth, duplicate version code, bad request)
// are not retried so they still surface fast.
const RETRYABLE_CODES = new Set([
  'ERR_STREAM_PREMATURE_CLOSE',
  'ECONNRESET',
  'ETIMEDOUT',
  'ECONNREFUSED',
  'ENOTFOUND',
  'EAI_AGAIN',
  'EPIPE',
]);
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);

function isRetryable(err) {
  if (err?.code && RETRYABLE_CODES.has(err.code)) return true;
  const status = err?.response?.status ?? (typeof err?.code === 'number' ? err.code : undefined);
  return status !== undefined && RETRYABLE_STATUS.has(status);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// The Google token endpoint can stay flaky for tens of seconds, so spread the
// retries across a wide window rather than giving up in ~14s: 6 attempts with
// exponential backoff capped at 30s spans ~70s of real outage. Full jitter
// keeps a fleet of release jobs from retrying in lockstep.
const MAX_DELAY_MS = 30_000;

async function withRetry(label, fn, attempts = 6) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= attempts || !isRetryable(err)) throw err;
      const backoff = Math.min(2000 * 2 ** (attempt - 1), MAX_DELAY_MS);
      const delayMs = Math.round(backoff / 2 + Math.random() * (backoff / 2));
      console.warn(
        `  ${label} failed (attempt ${attempt}/${attempts}): ${err.message || err.code}. Retrying in ${(delayMs / 1000).toFixed(1)}s...`,
      );
      await sleep(delayMs);
    }
  }
}

async function main() {
  console.log('\n[1/4] Creating edit...');
  const edit = await withRetry('Create edit', () =>
    androidpublisher.edits.insert({ packageName: PACKAGE_NAME }),
  );
  const editId = edit.data.id;
  console.log(`  editId=${editId}`);

  console.log('[2/4] Uploading bundle...');
  // Recreate the read stream on each attempt — a consumed stream can't replay.
  const upload = await withRetry('Upload bundle', () =>
    androidpublisher.edits.bundles.upload({
      packageName: PACKAGE_NAME,
      editId,
      media: {
        mimeType: 'application/octet-stream',
        body: createReadStream(AAB_PATH),
      },
    }),
  );
  const versionCode = upload.data.versionCode;
  console.log(`  versionCode=${versionCode} sha1=${upload.data.sha1}`);

  console.log(`[3/4] Assigning versionCode ${versionCode} to ${TRACK}...`);
  await withRetry('Assign track', () =>
    androidpublisher.edits.tracks.update({
      packageName: PACKAGE_NAME,
      editId,
      track: TRACK,
      requestBody: {
        track: TRACK,
        releases: [{ status: STATUS, versionCodes: [String(versionCode)] }],
      },
    }),
  );

  // Not retried: commit is the one non-idempotent step. A connection drop
  // *after* the server commits would leave a retry calling commit on a now-
  // consumed editId, which fails with editNotFound and masks the successful
  // publish. A single attempt fails honestly instead.
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
