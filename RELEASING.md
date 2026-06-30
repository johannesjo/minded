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

Must be done manually via Play Console (create a release on any track → upload AAB) — the Play API only takes over once the app has an initial release on file. After that first manual upload, CI handles everything: tagged releases go to **production**, pushes to `main` go to **internal** testing.

## Cutting a release

```bash
cd extension
npm version patch    # or minor / major
```

This:
- bumps `package.json`, `android/app/build.gradle.kts` (`versionName`; the `versionCode` literal is also bumped but is now only a local-build fallback — CI derives the real one, see [Version codes](#version-codes-the-cross-track-constraint)), and `extension/ios/App/App.xcodeproj/project.pbxproj`
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
   - Play: AAB is uploaded straight to the **production** track and published live (`STATUS: completed`) — no manual promotion step. (Continuous internal-test builds are a separate pipeline; see below.)
4. `github-release` creates a GitHub Release with auto-generated notes from commit messages.

Total wall time: ~6–10 min once approved.

## Continuous internal test builds (push to main)

`.github/workflows/play-internal.yml` publishes a signed AAB to the Play
**internal testing** track on every push to `main` that touches the app (a
`paths:` filter limits it to `extension/**`, `android/**`, and the pipeline's
own files). Internal-track installs **auto-update through the Play Store** like
any normal app — once you've opted in and installed, your phone stays on the
latest `main` with no sideloading. This shares the production app listing but a
different track.

### Version codes (the cross-track constraint)

Play assigns each device the **highest** `versionCode` across every track it's
eligible for, and **rejects** a release that would be shadowed by a higher code
already active on another track (`multiApkShadowedActiveApk`). Internal testers
are also production-eligible, so a naive "give internal a permanently higher
code" scheme would block the next production release. (It would also globally
*consume* those codes — a `versionCode` can never be reused.)

So both pipelines derive `versionCode` from the **same** source: seconds since
2020-01-01 UTC, computed at build time (`$(date +%s) - 1577836800`). Whichever
builds later has the higher code. Internal builds on each push; a production
release builds at release time ("now"), so production is always **at or above**
the latest internal build and stays publishable. `build.gradle.kts`'s literal
`versionCode` is now only a local-build fallback — CI always overrides it.
`versionName` is untouched (`npm version` still owns the user-facing semver, and
`verify-version` only checks `versionName`), so nothing user-visible changes;
only the invisible integer moves from `23` to a ~2e8 timestamp. It grows
~3.2e7/yr against the 2.1e9 ceiling (decades of headroom).

> Tiny residual race: if an internal build starts *between* a production build
> and its upload, it could grab a higher code and shadow that production
> release. The window is minutes and it self-heals on the next release (just
> re-run). If you want production fully isolated from this, the alternative is a
> separate dev app id (`com.minded.minded.dev` via a Gradle flavor) — more setup
> (a second Play listing) but production version codes never interact at all.

### One-time setup

1. **Environment / secrets.** The workflow currently reuses the existing
   **`production`** environment (`environment: production`), so **no new secrets
   are needed** — it already has the signing + Play keys. The catch: the
   `production` environment has a required reviewer, so **each push to `main`
   waits for a one-click approval** in the Actions UI before it ships to
   internal. To make it fully hands-off, create a separate **`internal`**
   environment (Settings → Environments → New) with **no required reviewers**,
   re-add the same five values (`ANDROID_KEYSTORE_BASE64`,
   `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`,
   `PLAY_SERVICE_ACCOUNT_JSON` — environment secrets aren't inherited, so they
   must be re-entered or promoted to repo-level), and switch `environment:` in
   `play-internal.yml` to `internal`. Don't just remove the reviewer from
   `production` — that would un-gate real production releases too.
2. **No manual AAB upload needed** (for minded). A manual first upload is only
   required for a brand-new app with zero releases; minded already ships to
   production, so the API can upload to the internal track directly. You do need
   to **set up the internal testing track and add your phone as a tester** once
   in the Console — that's track config, not a build upload (step 3).
3. **Opt your phone into internal testing:** Play Console → Testing → Internal
   testing → Testers → copy the **opt-in URL**, open it on your phone, accept,
   then install from the link (or from the Play Store once joined). After that,
   updates arrive automatically (often within a few hours; force a check in the
   Play Store app under *Manage apps → Updates available* if impatient).

### Cost / churn note

Each qualifying push triggers a build + upload (~6–10 min). `concurrency`
cancels superseded in-flight runs so rapid pushes don't pile up (a cancelled
run just skips a disposable timestamp code). The `paths:` filter already keeps
docs-only and unrelated commits from building; tighten it further or switch the
trigger to `workflow_dispatch` if it's still noisier than you want.

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

5. **Widget target — wired in automatically by CI.** The `MindedWidget` Swift sources live in `extension/ios/App/MindedWidget/`, but the WidgetKit **extension target is not stored in `App.xcodeproj`**. The TestFlight workflow adds it on the fly: a *Wire in the widget extension target* step runs `extension/ios/App/scripts/add_widget_target.rb` (via the `xcodeproj` gem) before `pod install`, so every archive embeds the companion sun. The script is idempotent and the archive step is the real verification — a malformed project fails CI rather than silently shipping the WebView shell without the sun. Nothing to do here; to wire it into a checked-in project instead, run that script once locally and commit the `project.pbxproj` diff (see that folder's `README.md`).

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
- Cut a new version (`npm version patch`) and push the tag — the release pipeline ships the fix straight to production.

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
| Play upload rejected: "versionCode already exists" / `multiApkShadowedActiveApk` | Two builds landed in the same second, or an internal push minted a higher code mid-release and shadowed it. versionCode is time-derived, so don't edit it — just **re-run the workflow** to mint a fresh timestamp code. |
| CWS upload rejected: "package size too large" | Bundle exceeds 50MB recommended. Investigate large assets. (Hard limit is 2GB.) |
| Gradle: "keystore file not found" | Workflow secrets missing or wrong base64. Re-encode with `base64 -w0`. |
| Both publish jobs hang in "Waiting" | You forgot to approve the `production` environment in the Actions UI. |
