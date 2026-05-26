# Releasing

minded ships to two stores via tag-triggered CI: the Chrome Web Store (browser extension) and the Google Play Store (Android app). iOS is not actively maintained — skip.

See [`docs/release-automation-plan.md`](docs/release-automation-plan.md) for the design rationale and `.github/workflows/release.yml` for the pipeline definition.

## One-time setup

Before the first automated release, complete these manual steps. They cannot be automated.

### GitHub repo settings

- **Settings → Actions → General → Workflow permissions** → "Read repository contents". Per-job `permissions:` in the workflow grants `contents: write` only to the GitHub-release job.
- **Settings → Rules → New tag ruleset** → pattern `v*`, restrict creation/update/deletion to repo admins. Without this, any committer can ship to the stores.
- **Settings → Environments → `production`** → require reviewer = yourself. Both publish jobs reference this environment; secrets only mount after you click approve in the Actions UI.

### Secrets (scope all to the `production` environment)

| Secret | Source |
|---|---|
| `CWS_CLIENT_ID` | Google Cloud Console → OAuth 2.0 client ID (Desktop type) for Chrome Web Store API |
| `CWS_CLIENT_SECRET` | same OAuth client |
| `CWS_REFRESH_TOKEN` | Generate locally with [chrome-webstore-upload-keys](https://github.com/fregante/chrome-webstore-upload-keys) |
| `CWS_EXTENSION_ID` | Chrome Web Store dashboard → item ID |
| `CWS_PUBLISHER_ID` | Chrome Web Store dashboard → publisher ID |
| `PLAY_SERVICE_ACCOUNT_JSON` | Play Console → API access → service account JSON (Release Manager role, scoped to this app only) |
| `ANDROID_KEYSTORE_BASE64` | `base64 -w0 upload.jks` of the upload keystore |
| `ANDROID_KEYSTORE_PASSWORD` | keystore store password |
| `ANDROID_KEY_ALIAS` | key alias inside the keystore |
| `ANDROID_KEY_PASSWORD` | key password (often same as store password) |

### Enroll in Play App Signing

Likely already enrolled (default for apps created after 2021). Without it, the upload key is the app signing key — lose it and the app is dead forever. With it, you can reset the upload key once via the Play Console.

### First-ever Play upload

Must be done manually via Play Console (Internal testing → Create release → upload AAB). Automated uploads to the internal track require a prior production release to exist. After the first manual upload, CI takes over.

## Cutting a release

```bash
cd extension
npm run version patch    # or minor / major
```

This:
- bumps `package.json`, `android/app/build.gradle.kts` (`versionName` + `versionCode`), and `extension/ios/App/App.xcodeproj/project.pbxproj`
- runs local builds as a pre-flight smoke test (catch breakage before CI)
- creates `chore(release): bump version to X.Y.Z` commit and `vX.Y.Z` tag

Then:

```bash
git push --follow-tags
```

The tag triggers `.github/workflows/release.yml`. Steps:

1. `verify-version` — passes automatically (no approval needed).
2. `release-chrome` and `release-play` — **both wait for your approval** in the Actions UI (Environments → `production` → review).
3. Once approved, each job builds and uploads:
   - Chrome: extension is uploaded as a **draft**. Visit the Chrome Web Store dashboard → Submit for review.
   - Play: AAB is uploaded to the **internal** track. Visit Play Console → Internal testing → Promote → Production when ready.
4. `github-release` creates a GitHub Release with auto-generated notes from commit messages.

Total wall time: ~6–10 min once approved.

## Chrome Web Store source-code submission

CWS review may require source code for minified bundles. When prompted:

- Provide the tagged commit URL: `https://github.com/johannesjo/minded/tree/vX.Y.Z`
- Build command: `cd extension && npm ci && npm run build`
- Output: `extension/minded.zip`
- Node version: see `NODE_VERSION` in `.github/workflows/release.yml`

## Rollback

Neither store supports true rollback. The fix is always **fix-forward** with a higher version number.

### Play Store

- Play Console → Production → "Halt managed publishing rollout" to pause distribution while you ship a fix.
- Cut a new version (`npm run version patch`), let the pipeline ship the fix to internal, promote to production.

### Chrome Web Store

- Dashboard → Unpublish item (removes the listing while you ship a fix).
- Cut a new version, re-submit.

## Secret rotation

Do this quarterly, or immediately on any suspicion of compromise.

- **CWS refresh token:** regenerate via `chrome-webstore-upload-keys`. Update `CWS_REFRESH_TOKEN`.
- **Play service account:** Play Console → API access → rotate key. Update `PLAY_SERVICE_ACCOUNT_JSON`.
- **Keystore:** if compromise is suspected, generate a new upload key. Play App Signing supports one upload-key reset via Play Console. Without Play App Signing, the app is dead — you cannot rotate.

## Lost keystore

- With Play App Signing enrolled (recommended): Play Console → request upload key reset (one-time-ish — do not lose the new one).
- Without Play App Signing: app cannot be updated. Period. Publish a new app under a new package name.

## Troubleshooting

| Symptom | Cause |
|---|---|
| `verify-version` fails on version mismatch | Tag created without `npm run version` — files weren't bumped. Re-run the version script. |
| `verify-version` fails on ancestry | Tag was created on a non-main branch. Merge to main first, then re-tag from the merge commit. |
| Play upload rejected: "versionCode already exists" | Manual upload happened in parallel, or a previous run partially succeeded. Bump `versionCode` again. |
| CWS upload rejected: "package size too large" | Bundle exceeds 50MB recommended. Investigate large assets. (Hard limit is 2GB.) |
| Gradle: "keystore file not found" | Workflow secrets missing or wrong base64. Re-encode with `base64 -w0`. |
| Both publish jobs hang in "Waiting" | You forgot to approve the `production` environment in the Actions UI. |
