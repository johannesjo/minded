# Release Automation — What's Left For You

Pipeline code is committed (`791fd41c`). Phase 0 setup is manual and cannot be automated. Do these in order — each step has dependencies on the previous one.

Full procedures and troubleshooting: see [`RELEASING.md`](RELEASING.md).

---

## 1. Verify Gradle signing locally (~10 min)

Proves the `build.gradle.kts` change works before you invest in credentials.

```bash
keytool -genkey -v -keystore /tmp/test-upload.jks -alias test -keyalg RSA \
  -keysize 2048 -validity 1 -storepass test123 -keypass test123 \
  -dname "CN=Test, O=Test, C=US"

cd android
./gradlew tasks                  # should succeed (no keystore needed)
./gradlew bundleRelease 2>&1 | tail -5
# Expected: "Keystore file '.../missing.jks' not found for signing config 'release'"

ANDROID_KEYSTORE_PATH=/tmp/test-upload.jks \
ANDROID_KEYSTORE_PASSWORD=test123 \
ANDROID_KEY_ALIAS=test \
ANDROID_KEY_PASSWORD=test123 \
./gradlew bundleRelease

jarsigner -verify app/build/outputs/bundle/release/app-release.aab
# Expected: "jar verified."

rm /tmp/test-upload.jks
```

- [ ] Step 1 complete

## 2. Merge and push the branch (~2 min)

Once gradle verify passes. Push gives GitHub a chance to validate the workflow YAML (visible on the Actions tab even though no tag triggered it yet).

```bash
# from this worktree:
git push -u origin task/how-complicated-would-it-be-to-automate-0baef9
# then on GitHub: open PR → merge to main
```

- [ ] PR merged to main

## 3. GitHub repo settings (~10 min)

All under https://github.com/johannesjo/minded/settings

- [ ] Actions → General → Workflow permissions → **Read repository contents** (default for new repos; verify)
- [ ] Rules → New ruleset → name "Release tags" → target tags matching `v*` → restrict creation/update/deletion to repo admins
- [ ] Environments → New environment → name `production` → required reviewers = yourself

## 4. Chrome Web Store credentials (~30 min)

- [ ] Google Cloud Console → Create OAuth 2.0 client ID (Desktop type) with Chrome Web Store API enabled
- [ ] Generate refresh token: `npx chrome-webstore-upload-keys` and follow the prompts
- [ ] Add 5 secrets to the `production` environment (Settings → Environments → production → Add secret):
  - [ ] `CWS_CLIENT_ID`
  - [ ] `CWS_CLIENT_SECRET`
  - [ ] `CWS_REFRESH_TOKEN`
  - [ ] `CWS_EXTENSION_ID` (from CWS dashboard → item ID)
  - [ ] `CWS_PUBLISHER_ID` (from CWS dashboard → publisher ID)

## 5. Play Store credentials (~1–2 h)

The slowest step. Mostly waiting on Google Cloud + Play Console UI.

- [ ] Play Console → Setup → API access → link a Google Cloud project
- [ ] Create a service account in that GCP project with no roles
- [ ] Back in Play Console → grant the service account **Release Manager** role, scoped to this app only (not org-wide)
- [ ] Download the service account JSON key
- [ ] Confirm enrollment in **Play App Signing** (Play Console → Setup → App integrity). Almost certainly already on. If not, enroll now — without it, losing the keystore kills the app permanently.
- [ ] Locate (or generate) the upload keystore — this is the irreversible decision. If you already have `upload.jks`, use it. If not, generate fresh with `keytool` (Play App Signing means you can reset it once if needed).
- [ ] Base64-encode the keystore: `base64 -w0 upload.jks > upload.jks.b64`
- [ ] Add 5 secrets to the `production` environment:
  - [ ] `PLAY_SERVICE_ACCOUNT_JSON` (paste the full JSON)
  - [ ] `ANDROID_KEYSTORE_BASE64` (paste the contents of `upload.jks.b64`)
  - [ ] `ANDROID_KEYSTORE_PASSWORD`
  - [ ] `ANDROID_KEY_ALIAS`
  - [ ] `ANDROID_KEY_PASSWORD`
- [ ] Delete `upload.jks.b64` from your machine

## 6. First-ever Play upload (manual, one-time) (~15 min)

The internal track won't accept automated uploads until a production release exists.

- [ ] Build a signed AAB locally (same command as Step 1, but with your real keystore env vars)
- [ ] Play Console → Internal testing → Create new release → upload the AAB → roll out
- [ ] Promote internal → production via Play Console (or wait — promoting later also works)

## 7. First end-to-end dry-run (~20 min)

- [ ] Cut a real release: `cd extension && npm version patch`
- [ ] `git push --follow-tags`
- [ ] Watch GitHub Actions → Release workflow
- [ ] When both `release-chrome` and `release-play` pause for review, **read the logs carefully before approving**
- [ ] Approve `release-chrome` → check Chrome Web Store dashboard for the new draft
- [ ] Approve `release-play` → check Play Console internal track for the new AAB
- [ ] Submit Chrome draft for review (manual, in CWS dashboard)
- [ ] Promote Play internal → production (manual, in Play Console)

## After first successful release

- [ ] Consider whether to flip `isMinifyEnabled = true` in `android/app/build.gradle.kts` (smaller AAB, harder reverse-engineering, requires uploading `mapping.txt` to Play — add `mappingFile:` to `release-play` step)
- [ ] Consider rotating to GitHub OIDC + GCP Workload Identity Federation to drop the long-lived `PLAY_SERVICE_ACCOUNT_JSON` secret
- [ ] Schedule quarterly secret rotation reminder
