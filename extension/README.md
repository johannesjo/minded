# minded – Browser Extensions

## Screenshots

From `extension/`, run `npm run screenshots:install` once
if Playwright's Chromium browser is not installed yet. Then run
`npm run screenshots` to regenerate the product screenshots in
`extension/screenshots/` and update the screenshots used by the root README.

To update the separate landing-page repository in the same run, point the
generator at its checkout:

```sh
MINDED_LANDING_PAGE_DIR="$HOME/www/minded-landing-page" npm run screenshots
```

Desktop screenshots are copied to `<landing page>/public/screenshots/`.

The same command also creates Google Play phone screenshots in
`extension/screenshots/google-play/phone/`. These are 1080px by 1920px
portrait PNGs and are intentionally ignored by git. Upload them with the
manual `Update store screenshots` GitHub Actions workflow.

Five ordered 1280px by 800px Chrome Web Store images are written to
`extension/screenshots/chrome-web-store/`. Upload these manually in the
Chrome Web Store developer dashboard; the publishing API does not manage
store-listing images.

## Product video

Run `npm run video` to record the short product introduction with the same
deterministic Playwright surface. The shareable MP4 is written to
`output/playwright/minded-intro.mp4` at the repository root. Chromium and
`ffmpeg` must be available locally.

Run `npm run video:dark` for the dark-mode variant. It writes
`output/playwright/minded-intro-dark.mp4`.

Run `npm run video:mobile` for the 720px by 1280px portrait cut. It writes
`output/playwright/minded-intro-mobile.mp4`.
