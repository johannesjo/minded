# Release Automation Plan

Automates releases to the Chrome Web Store and Google Play Store, triggered by `vX.Y.Z` git tags produced by `extension/scripts/version.mjs`. iOS is out of scope (per `CLAUDE.md` it is not actively developed).

This is the V2 plan, hardened against multi-agent review feedback (concurrency, least-privilege secrets, supply-chain pinning, environment-gated approval, simpler Gradle signing, no signed-AAB-as-artifact).

## Phase 0 — Credentials & GitHub settings (one-time, manual)

**GitHub repo settings (do these FIRST, before any workflow runs):**

- Settings → Actions → General → **Workflow permissions** → "Read repository contents" (so the workflow can't escalate). Per-job `permissions:` will grant more where needed.
- Settings → Rules → New tag ruleset → pattern `v*`, restrict creation/update/deletion to repo admins only. This is the only real defense against an unauthorized release.
- Settings → Environments → create `production` → require reviewer = yourself. Both publish jobs reference this environment, so secrets only mount when you click approve.
- `.github/dependabot.yml` with `package-ecosystem: github-actions` so SHA bumps come as reviewable PRs.

**Chrome Web Store secrets (scoped to the `production` environment):**

- `CWS_CLIENT_ID`
- `CWS_CLIENT_SECRET`
- `CWS_REFRESH_TOKEN`
- `CWS_EXTENSION_ID`
- `CWS_PUBLISHER_ID` — required by `chrome-webstore-upload-cli`

**Play Store secrets (scoped to `production`):**

- `PLAY_SERVICE_ACCOUNT_JSON` (raw JSON; service account scoped as narrowly as Play permits — minimum "Release manager", grant only the app)
- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

**First-ever Play upload must be manual.** The internal track requires a prior production listing to accept automated uploads cleanly. Do the first AAB via Play Console, then CI takes over.

**Enroll in Play App Signing** if not already (likely auto-enrolled for new apps since 2021). Without it, your upload key is the app signing key — lose it and the app is dead forever.

## Phase 1 — Gradle release signing

Edit `android/app/build.gradle.kts`:

```kotlin
signingConfigs {
    create("release") {
        storeFile = file(System.getenv("ANDROID_KEYSTORE_PATH") ?: "missing.jks")
        storePassword = System.getenv("ANDROID_KEYSTORE_PASSWORD")
        keyAlias = System.getenv("ANDROID_KEY_ALIAS")
        keyPassword = System.getenv("ANDROID_KEY_PASSWORD")
    }
}
buildTypes {
    release {
        signingConfig = signingConfigs.getByName("release")
        // existing minify/proguard lines stay
    }
}
```

`?: "missing.jks"` lets Gradle configure for non-release tasks (no NPE during `./gradlew tasks`), and `bundleRelease` fails loudly with "keystore file not found" if env isn't set. Debug builds use the auto-generated debug config — untouched.

Verify locally with a throwaway test keystore:

```bash
keytool -genkey -v -keystore /tmp/test.jks -alias test -keyalg RSA -keysize 2048 -validity 1 \
  -storepass test123 -keypass test123 -dname "CN=Test"
ANDROID_KEYSTORE_PATH=/tmp/test.jks ANDROID_KEYSTORE_PASSWORD=test123 \
  ANDROID_KEY_ALIAS=test ANDROID_KEY_PASSWORD=test123 \
  ./gradlew -p android bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`.

## Phase 2 — Release workflow

`.github/workflows/release.yml`, triggered on `v[0-9]+.[0-9]+.[0-9]+` tags. Four jobs:

1. `verify-version` — ancestry check (tag reachable from `main`) + tag matches `package.json` + Gradle `versionName`.
2. `release-chrome` — build extension, upload to CWS as draft.
3. `release-play` — build signed AAB, upload to Play internal track.
4. `github-release` — create GitHub Release with auto-generated notes.

Both publish jobs use `environment: production` (required reviewer approval). All third-party actions pinned by SHA. `concurrency: { group: release }` serializes runs.

Chrome upload uses `chrome-webstore-upload-cli` invoked directly via `npx` (no GitHub-action wrapper between secrets and Google API).

## Phase 3 — Runbook (`RELEASING.md`)

Concrete procedures, not hand-waving:

1. **Cutting a release.** `cd extension && npm version patch|minor|major` → review diff → `git push --follow-tags` → approve both `production` env runs in the Actions UI → Chrome auto-submits for review → promote Play internal → production in Play Console.
2. **CWS source-code submission.** When prompted by review, provide tagged commit URL; note build command is `npm ci && npm run build` from `extension/`.
3. **Rollback.** Neither store rolls back — fix-forward by publishing a higher version. Play: halt managed publishing rollout while diagnosing. Chrome: unpublish from dashboard.
4. **Secret rotation (quarterly + on suspicion).** Rotate CWS refresh token, Play service account key, keystore base64.
5. **Lost keystore.** Play App Signing → reset upload key once via Play Console. Without Play App Signing, the app is dead.

## Release commit + tag

`npm version` would normally handle the version commit and tag itself, between the `version` and `postversion` hooks. We disable that and do it ourselves in `scripts/postversion.mjs`.

**Why:** in this repo, npm v10's `npm version` silently skipped its commit + tag step — `postversion` ran but no commit existed and no tag was created. Likely cause: our `version` hook (`sync-platforms.mjs`) modifies files outside the package directory (`android/app/build.gradle.kts`, `extension/ios/App/App.xcodeproj/project.pbxproj`), and npm's commit logic appears to bail without an error when that happens. We chose not to dig into npm internals — the failure mode (half-bumped working tree, no tag) is bad enough that swapping to a predictable script is the better engineering call.

**How it works now:** `.npmrc` sets `git-tag-version=false`, which disables npm's built-in commit + tag. `postversion.mjs` reads the new version from `package.json`, stages the four bumped files (package.json, package-lock.json, build.gradle.kts, project.pbxproj), creates a `chore(release): bump version to X.Y.Z` commit, and tags `vX.Y.Z`. The `npm version patch` user interface is unchanged.

**Trade-off:** we lose npm's automatic `--message` handling and any future improvements to its lifecycle, in exchange for predictable behavior today. Worth revisiting if npm fixes the underlying issue or if our version hook ever stops touching files outside the package.

## Future-proofing (not in scope today)

- **Firefox add-on.** Sibling `release-firefox` job using `npx web-ext sign` or AMO upload action. Same environment-gated pattern.
- **R8/Proguard.** If `isMinifyEnabled = true` is flipped on, add `mappingFile: android/app/build/outputs/mapping/release/mapping.txt` to the Play upload step.
- **OIDC → Workload Identity Federation** to replace `PLAY_SERVICE_ACCOUNT_JSON`. Worth it once the pipeline is otherwise stable.

## Deliberately NOT in V2

- ~~Have `version.mjs` skip its local build.~~ Local build is a pre-flight smoke test; keeping it means broken releases are caught immediately, not 10 min later in CI.
- ~~`workflow_dispatch` with `dry_run` input.~~ Dead code — never wired.
- ~~Artifact upload/download between build and publish jobs.~~ Per-platform jobs build+publish together so signed AAB never becomes a downloadable artifact.
- ~~`wdzeng/chrome-extension` wrapper action.~~ Replaced by direct CLI.

## Effort

- Phase 0: ~1.5h (mostly waiting on Google)
- Phase 1: ~30 min including local verify
- Phase 2: ~2h with dry-run against draft/internal
- Phase 3: ~30 min

Total: ~1 working day.

## Implementation order

1. `docs/release-automation-plan.md` (this file)
2. `android/app/build.gradle.kts` — release signing
3. `.github/workflows/release.yml` — pinned SHAs
4. `RELEASING.md` — runbook
5. `.github/dependabot.yml` — keep SHAs fresh

Phase 0 (credentials + GitHub settings) is manual and cannot be automated by Claude. Implementation above prepares the repo so that Phase 0 + first tag push activates the pipeline.
