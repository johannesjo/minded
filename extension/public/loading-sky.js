// Loading-screen sky: pick light/dark before the JS/CSS bundle loads.
//
// Runs synchronously from <head> (a classic, render-blocking script) before
// first paint, so the gradient is correct on the very first frame — no
// light->dark pop when the app mounts.
//
// Why an external file instead of an inline <script>: this page is the
// extension's new-tab override, so it inherits the MV3 extension-pages CSP
// (`script-src 'self'`), which forbids inline scripts — no 'unsafe-inline',
// hashes or nonces are permitted there. Living in public/ means it's copied
// verbatim and served from the extension origin ('self'), so CSP allows it.
//
// Keep the clock rule in sync with isDarkModeNow() (src/shared/addWrapperClasses.ts).
var h = new Date().getHours();
if (h >= 19 || h < 6) {
  document.documentElement.className += " minded-loading-dark";
}
