// Loading-screen sky: pick light/dark before the JS/CSS bundle loads.
//
// Runs synchronously from <head> (a classic, render-blocking script) before
// first paint, so the gradient is correct on the very first frame - no
// light->dark pop when the app mounts.
//
// Why an external file instead of an inline <script>: this page is the
// extension's new-tab override, so it inherits the MV3 extension-pages CSP
// (`script-src 'self'`), which forbids inline scripts - no 'unsafe-inline',
// hashes or nonces are permitted there. Living in public/ means it's copied
// verbatim and served from the extension origin ('self'), so CSP allows it.
//
// Keep the rule in sync with isDarkModeNow() (src/shared/addWrapperClasses.ts).
var h = new Date().getHours();
// The real sun's night windows, left by the app (src/shared/sky/skyNightCache.ts);
// the fixed 19:00/06:00 clock when they're missing or stale.
var t = Date.now();
var night = h >= 19 || h < 6;
try {
  var c = JSON.parse(localStorage.getItem("minded-sky-night") || "null");
  if (c && t >= c.from && t < c.to) {
    night = false;
    for (var i = 0; i < c.nights.length; i++) {
      if (t >= c.nights[i][0] && t < c.nights[i][1]) night = true;
    }
  }
} catch (e) {
  /* no storage: keep the clock */
}
if (night) {
  document.documentElement.className += " minded-loading-dark";
}
