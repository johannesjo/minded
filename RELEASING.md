# Releasing

minded ships to stores via tag-triggered CI: the Chrome Web Store (browser extension) and the Google Play Store (Android app), both in `.github/workflows/release.yml`. The iOS **widget-only variant** ships separately to TestFlight via `.github/workflows/ios-testflight.yml` — see [iOS / TestFlight](#ios--testflight) below. **You do not need a Mac**: iOS is built and signed on a GitHub-hosted macOS runner.

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
npm version patch    # or minor / major
```

This:
- bumps `package.json`, `android/app/build.gradle.kts` (`versionName` + `versionCode`), and `extension/ios/App/App.xcodeproj/project.pbxproj`
- creates `chore(release): bump version to X.Y.Z` commit and `vX.Y.Z` tag

Builds run in CI on tag push — no local build is required.

Then:

```bash
git push --follow-tags
```

The tag triggers `.github/workflows/release.yml`. Steps:

1. `verify-version` — passes automatically (no approval needed).
2. `release-chrome` and `release-play` — **both wait for your approval** in the Actions UI (Environments → `production` → review).
3. Once approved, each job builds and uploads:
   - Chrome: extension is uploaded **and auto-submitted for review**. Google's review queue typically clears in minutes to days. No further action in the CWS dashboard.
   - Play: AAB is uploaded to the **internal** track. Visit Play Console → Internal testing → Promote → Production when ready.
4. `github-release` creates a GitHub Release with auto-generated notes from commit messages.

Total wall time: ~6–10 min once approved.

## Continuous internal test builds (every push to main)

`.github/workflows/play-internal.yml` publishes a signed AAB to the Play
**internal testing** track on every push to `main`. Internal-track installs
**auto-update through the Play Store** like any normal app — once you've opted
in and installed, your phone stays on the latest `main` with no sideloading.
This is independent of the tag-triggered production pipeline.

### Version codes (why this doesn't break the release scheme)

Play requires every `versionCode` to be globally unique and never reused, so
internal builds **must not** draw from the same low integer line as releases.
They don't: `build.gradle.kts` keeps its literal `versionCode` for production
(bumped by `npm version`), and the internal workflow overrides it *only at
build time* with `1_000_000_000 + github.run_number`. That high band can never
collide with the semver-linked production codes (`23, 24, …`) and is always
higher, so internal testers never get a downgrade. `versionName` is unchanged
(`6.2.0`), so testers still see a normal version string. (Trade-off: you can't
*promote* an internal build to production through the Play UI — production
ships its own AAB from the tag pipeline. The two lines are intentionally
decoupled.)

### One-time setup

1. **Create an `internal` environment** (Settings → Environments → New) with
   **no required reviewers** — the gate would defeat auto-publishing. Add the
   same secrets used by production: `ANDROID_KEYSTORE_BASE64`,
   `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`,
   `PLAY_SERVICE_ACCOUNT_JSON` (same values). Environment secrets aren't
   inherited from the `production` environment, so they must be re-added here
   (or promote them to repo-level secrets and drop the `environment:` line).
2. **First Play upload must still be manual** (see *First-ever Play upload*
   above) — the internal-track API only accepts uploads once the app exists in
   the Console. Already satisfied if you've shipped before.
3. **Opt your phone into internal testing:** Play Console → Testing → Internal
   testing → Testers → copy the **opt-in URL**, open it on your phone, accept,
   then install from the link (or from the Play Store once joined). After that,
   updates arrive automatically (usually within an hour; force a check in the
   Play Store app under *Manage apps → Updates available* if impatient).

### Cost / churn note

Every push to `main` triggers a build + upload (~6–10 min). `concurrency`
cancels superseded in-flight runs so rapid pushes don't pile up. If the churn
gets noisy, add a `paths:` filter (e.g. only `extension/**` and `android/**`)
or switch the trigger to `workflow_dispatch`.

## Chrome Web Store source-code submission

CWS review may require source code for minified bundles. When prompted:

- Provide the tagged commit URL: `https://github.com/johannesjo/minded/tree/vX.Y.Z`
- Build command: `cd extension && npm ci && npm run build`
- Output: `extension/minded.zip`
- Node version: see `NODE_VERSION` in `.github/workflows/release.yml`

## iOS / TestFlight

iOS is the **widget-only variant** (the companion sun — see `docs/ios-platform-fit.md`). It builds, signs, and uploads to **TestFlight** entirely on a GitHub-hosted macOS runner — **no Mac of your own required**. Signing is *cloud-managed*: the runner authenticates with an App Store Connect API key and `xcodebuild -allowProvisioningUpdates` creates/downloads the distribution certificate and provisioning profile on the fly, so no `.p12` or `.mobileprovision` is stored in CI.

Workflow: `.github/workflows/ios-testflight.yml`. Triggers on a `vX.Y.Z` tag (alongside the store releases) **and** on manual dispatch (Actions → *iOS TestFlight* → *Run workflow*) so you can push a beta build any time without cutting a public release.

### Why "no Mac" still isn't "no Apple"

There is no pure-Linux iOS build — `xcodebuild`/archive/sign only run on macOS. "Without a Mac" means *without owning one*: you rent Apple's hosted macOS runner per build. You still need a paid **Apple Developer Program** membership ($99/yr) for any signing or distribution.

### One-time setup

1. **Apple Developer Program** membership (Team ID `363FAFK383`).
2. **Register the app** in App Store Connect once: bundle id `com.minded.app`, then create the app record. TestFlight uploads fail until the record exists. (Note: the iOS bundle id `com.minded.app` is intentionally *not* the same as `capacitor.config.ts`'s `appId` / the Android `applicationId`, which are both `com.minded.minded`. The iOS Xcode project — `project.pbxproj` — is the source of truth for iOS; `cap sync` does not change it.)
3. **App Store Connect API key**: Users and Access → Integrations → App Store Connect API → generate a key with **Admin** access. (App Manager is usually enough to manage profiles, but cloud signing via `-allowProvisioningUpdates` may also need to *create the distribution certificate* — Admin avoids a mid-build "not authorized to manage certificates" failure.) Download the `.p8` **once** (you can't re-download it). Note its **Key ID** and the team **Issuer ID**.
4. **Add the secrets** (scope to the `production` environment, same as the store secrets):

   | Secret | Source |
   |---|---|
   | `APP_STORE_CONNECT_KEY_ID` | the API key's Key ID |
   | `APP_STORE_CONNECT_ISSUER_ID` | the Issuer ID (top of the API keys page) |
   | `APP_STORE_CONNECT_PRIVATE_KEY_BASE64` | `base64 -w0 AuthKey_XXXXXX.p8` of the downloaded key |

5. **Wire up the widget target (the one step that wants Xcode once).** The `MindedWidget` Swift sources exist (`extension/ios/App/MindedWidget/`) but the WidgetKit **extension target is not yet in `App.xcodeproj`**. Until it is, TestFlight builds ship the WebView shell *without* the companion sun widget. Add it once via Xcode's GUI (File → New → Target → Widget Extension; see that folder's `README.md`) or programmatically with the `xcodeproj` Ruby gem / xcodegen (those can run on Linux). After it's committed, every build includes the widget — no Mac needed again.

> **Caveats for the first build.** (a) Apple caps distribution certificates per team — if cloud signing fails with "certificate limit reached", revoke an unused one in the Developer portal. (b) This iOS app has never been compiled; treat the first run as real verification, especially that the WebView loads the `distIOS` bundle (asset paths use base `/`). (c) `altool --upload-app` is deprecated though still functional on Xcode 16 — see the comment in the workflow for the migration path if a future Xcode drops it.

### Testing on a specific person's phone (e.g. a friend's), no public release

Yes — this is exactly what TestFlight is for. A TestFlight build is **not** a public App Store release; only invited testers see it.

1. Run the *iOS TestFlight* workflow (manual dispatch is fine). It uploads the build to App Store Connect → TestFlight.
2. In **App Store Connect → TestFlight**, add the tester:
   - **Internal testers** (up to 100) get builds **immediately, no review** — but each must be added as a user on your App Store Connect team.
   - **External testers** (just their email, no team access) are simpler for a friend/partner: create a tester group, add their email, and submit the build for **Beta App Review** (a light, usually-fast review — much quicker than App Store review). Once approved, they install the **TestFlight** app from the App Store and accept the invite.
3. They install via the **TestFlight** app on their iPhone. Builds expire after 90 days.

**Export compliance** (would otherwise block external testing on *every* build): minded sets `ITSAppUsesNonExemptEncryption = false` in `extension/ios/App/App/Info.plist` (it uses only standard HTTPS/system crypto, which is exempt), so builds skip the "Missing Compliance" prompt automatically. If you ever add non-exempt encryption, remove that key and answer the question in App Store Connect instead. External testers also need a one-line **Beta App Description** and a **feedback email** in the TestFlight *Test Information* tab.

Ad-hoc distribution (register the device UDID, install an `.ipa` directly) also works without a release but is clunkier and capped at the devices you register — TestFlight is the recommended path.

### Versioning

The workflow sets `MARKETING_VERSION` from `extension/package.json` and `CURRENT_PROJECT_VERSION` from the CI run number, so every upload has a strictly increasing build number (TestFlight rejects duplicates). No manual `project.pbxproj` bump is needed for a TestFlight build.

## Rollback

Neither store supports true rollback. The fix is always **fix-forward** with a higher version number.

### Play Store

- Play Console → Production → "Halt managed publishing rollout" to pause distribution while you ship a fix.
- Cut a new version (`npm version patch`), let the pipeline ship the fix to internal, promote to production.

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
