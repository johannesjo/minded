import { IS_MOUSE_PRIMARY, IS_TOUCH_PRIMARY } from "@src/util/touch";
import { IS_APP, IS_WEB_EXT } from "@src/dataInterface/commonSyncDataInterface";
import {
  ambientSkyColorsAt,
  duskTargetGradientAt,
  NIGHT_END_HOUR,
  NIGHT_START_HOUR,
  parseSkyHourParam,
  zenithTargetColorsAt,
} from "@src/shared/skyTimeline";

const getWrapperEl = (shadowRoot?: ShadowRoot): HTMLElement | null =>
  shadowRoot
    ? shadowRoot.getElementById("minded-6622")
    : document.getElementById("minded-6622");

export const addWrapperClasses = (shadowRoot?: ShadowRoot) => {
  const el = getWrapperEl(shadowRoot);

  if (!el) {
    console.error("minded-6622 wrapper element not found");
    return;
  }

  setIsDarkModeIfApplies(el);
  applySkyForNow(shadowRoot);
  ensureSkyTicker(shadowRoot);

  if (IS_APP) {
    el.classList.add("minded-6622-mobile-app");
  }
  if (IS_WEB_EXT) {
    el.classList.add("minded-6622-web-extension");
  }
  if (IS_TOUCH_PRIMARY) {
    el.classList.add("minded-6622-touch-primary");
  }
  if (IS_MOUSE_PRIMARY) {
    el.classList.add("minded-6622-mouse-primary");
  }
};

export const isDarkModeNow = (): boolean => {
  // Dev/preview override: the standalone styleguide + dashboard simulation are
  // served at a real URL with no OS theme hook, so `?theme=dark` / `?theme=light`
  // forces the mode for testing at any time of day. Honoured here (rather than
  // only in the entry) so the whole shell agrees — addWrapperClasses' class, the
  // companion's moon/sun variant and the interaction sky all read this. Inert in
  // the extension/app, where no such query param is ever present.
  if (typeof window !== "undefined" && window.location?.search) {
    const theme = new URLSearchParams(window.location.search).get("theme");
    if (theme === "dark") return true;
    if (theme === "light") return false;
  }

  const hour = getEffectiveHourNow();
  return hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR;
};

/**
 * The fractional local hour driving every time-of-day surface (dark-mode
 * class, ambient sky, drag-target skies). Honours the `?skyHour=` dev
 * override the same way isDarkModeNow honours `?theme=` — meant for the
 * styleguide / dashboard simulation. Like `?theme=`, a content script reads
 * the *host page's* URL here, so a page carrying the param could pin the
 * overlay's sky — accepted as vanishingly unlikely, same as the existing
 * pattern.
 */
export const getEffectiveHourNow = (): number => {
  if (typeof window !== "undefined" && window.location?.search) {
    const override = parseSkyHourParam(window.location.search);
    if (override !== null) return override;
  }
  const now = new Date();
  return now.getHours() + now.getMinutes() / 60;
};

/**
 * What to call the companion in copy. The disc already morphs sun↔moon with the
 * time of day (see RouteCmp's sunVariant), so text that names it should agree:
 * "moon" at night, "sun" by day. Lowercase — callers supply any leading capital.
 */
export const companionWord = (): "sun" | "moon" =>
  isDarkModeNow() ? "moon" : "sun";

export const setIsDarkModeIfApplies = (
  el: HTMLElement | null = document.getElementById("minded-6622"),
) => {
  if (!el) {
    console.error("Element not found for dark mode application");
    return;
  }

  if (isDarkModeNow()) {
    el.classList.add("minded-6622-dark");
  } else {
    el.classList.remove("minded-6622-dark");
  }
  // el.classList.add("minded-6622-dark");
};

// Everything the living sky overrides inline (see skyTimeline.ts). The
// ambient stops recompose --background-gradient via _variables.scss; the
// composed sunset gradient keeps the drag reveal and the grounding stage
// pixel-identical (both read the same var); the bluesky pair feeds the
// up-drag layer at its use site, so route-local overrides (SleepWindDown)
// still win over this wrapper-level value.
const SKY_VAR_NAMES = [
  "--c-gradient-1",
  "--c-gradient-2",
  "--c-gradient-3",
  "--c-gradient-4",
  "--background-sunset-gradient",
  "--bg-transition-bluesky-top",
  "--bg-transition-bluesky-bottom",
] as const;

/**
 * Point-in-time application of the living sky for a given hour: sets the
 * ambient gradient stops and the drag-target skies as inline var overrides
 * on the wrapper. Keyed off the wrapper's *class*, not the clock: in dark
 * mode the overrides are cleared so the dark theme's own sky (two-orb
 * background, deep-night reveal) applies untouched — an inline value would
 * beat the .minded-6622-dark stylesheet overrides.
 */
export const applySkyAtHour = (
  hour: number,
  el: HTMLElement | null = getWrapperEl(),
) => {
  if (!el) return;
  if (el.classList.contains("minded-6622-dark")) {
    for (const name of SKY_VAR_NAMES) {
      el.style.removeProperty(name);
    }
    return;
  }
  const ambient = ambientSkyColorsAt(hour);
  ambient.forEach((color, i) => {
    el.style.setProperty(`--c-gradient-${i + 1}`, color);
  });
  el.style.setProperty(
    "--background-sunset-gradient",
    duskTargetGradientAt(hour),
  );
  const [zenithTop, zenithBottom] = zenithTargetColorsAt(hour);
  el.style.setProperty("--bg-transition-bluesky-top", zenithTop);
  el.style.setProperty("--bg-transition-bluesky-bottom", zenithBottom);
};

export const applySkyForNow = (shadowRoot?: ShadowRoot) =>
  applySkyAtHour(getEffectiveHourNow(), getWrapperEl(shadowRoot));

// One interval per JS context, re-resolving the wrapper each tick.
// Per-minute steps are sub-perceptual by design — the sky is ambient state,
// not animation.
let isSkyTickerStarted = false;
const ensureSkyTicker = (shadowRoot?: ShadowRoot) => {
  if (isSkyTickerStarted) return;
  isSkyTickerStarted = true;
  const intervalId = setInterval(() => {
    const el = getWrapperEl(shadowRoot);
    // A torn-down content-script overlay leaves the wrapper inside a detached
    // shadow tree: stop ticking so the interval doesn't retain that tree
    // forever, and let a future addWrapperClasses start a fresh ticker.
    if (el && !el.isConnected) {
      clearInterval(intervalId);
      isSkyTickerStarted = false;
      return;
    }
    applySkyAtHour(getEffectiveHourNow(), el);
  }, 60_000);
};
