# minded – Browser Extensions

## Screenshots

From the repository root or `extension/`, run `npm run screenshots:install` once
if Playwright's Chromium browser is not installed yet. Then run
`npm run screenshots` to regenerate the product screenshots in
`extension/screenshots/` and mirror them into `landing-page/public/`.

The same command also creates Google Play phone screenshots in
`extension/screenshots/google-play/phone/`. These are 1080px by 1920px
portrait PNGs and are intentionally ignored by git.
