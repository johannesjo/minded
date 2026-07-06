# Publishing product screenshots

This runbook updates the screenshots used by the repository README,
minded.today, Google Play, and the Chrome Web Store.

## 1. Generate the canonical screenshots

From the app repository:

```bash
cd extension
npm ci
npm run screenshots:install # required only when Playwright Chromium is missing
MINDED_LANDING_PAGE_DIR="$HOME/www/minded-landing-page" npm run screenshots
```

The generator uses real app components, pins the marketing sky to 09:00, waits
for fonts, and completes animations before capture, so re-running it should
leave the tracked files unchanged unless the UI itself changed. Always review
the screenshot diff before committing — an unexpected change means the UI moved.

| Destination       | Generated files                                | Tracked by Git                |
| ----------------- | ---------------------------------------------- | ----------------------------- |
| Repository README | `docs/screenshots/`                            | Yes, in `minded`              |
| minded.today      | `$MINDED_LANDING_PAGE_DIR/public/screenshots/` | Yes, in `minded-landing-page` |
| Google Play       | `extension/screenshots/google-play/phone/`     | No                            |
| Chrome Web Store  | `extension/screenshots/chrome-web-store/`      | No                            |

The Google Play set contains eight 1080×1920 phone screenshots. The Chrome Web
Store set contains five ordered 1280×800 screenshots.

## 2. Review before publishing

- Check every light and dark screenshot visually.
- Confirm that headings, buttons, the sun/moon, and mobile safe areas are not
  clipped.
- Confirm that removed features do not remain in any screenshot.
- Run `git diff --check` in both repositories.
- Do not commit unrelated changes from either working tree.

## 3. Publish the README screenshots

The README images are regular tracked files. Commit the generated files to the
app feature branch, push it, and merge the pull request:

```bash
git add README.md docs/screenshots extension/scripts/create-screenshots.mjs
git commit -m "chore: refresh README screenshots"
git push
```

The new images appear on GitHub when the commit reaches the default branch.

## 4. Publish minded.today

Review and commit only the landing-page screenshot directory:

```bash
cd "$HOME/www/minded-landing-page"
git status --short
npm run build
git add public/screenshots
git commit -m "chore: refresh product screenshots"
git push origin main
npm run deploy
```

After deployment, open <https://minded.today> and check the hero plus each
feature screenshot in light and dark system themes.

## 5. Publish Google Play screenshots

The upload workflow must first exist on the repository's default branch.

1. Open GitHub Actions in the `minded` repository.
2. Select **Update store screenshots**.
3. Select the `main` branch.
4. Set the listing language, normally `en-US`.
5. Enable **Replace the live Google Play phone screenshots**.
6. Run the workflow.
7. Approve the `production` environment when requested.
8. Verify the phone screenshots and their order in Play Console.

The workflow deletes and uploads the phone screenshots inside one Google Play
edit, then commits the edit only after every upload succeeds. A failed upload
therefore does not publish a partial set. Repeat the workflow for another
listing language only when the English screenshots are appropriate for that
localization.

Google API reference: <https://developers.google.com/android-publisher/api-ref/rest/v3/edits.images/upload>

## 6. Publish Chrome Web Store screenshots

Chrome Web Store listing images are uploaded manually. In the Chrome Web Store
Developer Dashboard, open minded's **Store listing** and replace the screenshots
with these files in numeric order:

1. `extension/screenshots/chrome-web-store/01-dashboard.png`
2. `extension/screenshots/chrome-web-store/02-intent-selection.png`
3. `extension/screenshots/chrome-web-store/03-duration-selection.png`
4. `extension/screenshots/chrome-web-store/04-grounding-pause.png`
5. `extension/screenshots/chrome-web-store/05-reflection-question.png`

Submit the listing changes for review, then verify the public listing after
approval.

Chrome listing documentation: <https://developer.chrome.com/docs/webstore/cws-dashboard-listing>

## 7. iOS App Store

No iOS screenshots are currently published because minded's iOS build is a
TestFlight-only widget variant. Do not reuse the Google Play screenshots for a
future public App Store listing: generate screenshots at Apple's accepted iPhone
sizes and review the public product page separately.

Apple screenshot documentation: <https://developer.apple.com/help/app-store-connect/manage-app-information/upload-app-previews-and-screenshots/>

## Rollback

- README: revert the screenshot commit and merge the revert.
- minded.today: revert the landing-page screenshot commit, then run
  `npm run deploy` again.
- Google Play: regenerate or restore the previous eight images and run the
  workflow again. Google Play listing edits do not provide an automatic image
  rollback.
- Chrome Web Store: re-upload the previous five images in the dashboard and
  submit the listing again.
