import { Accessor, createSignal, onCleanup, onMount } from "solid-js";
import { IS_MOUSE_PRIMARY, IS_TOUCH_PRIMARY } from "@src/util/touch";
import { prefersReducedMotion } from "@src/util/prefersReducedMotion";
import { IS_APP, IS_WEB_EXT } from "@src/dataInterface/commonSyncDataInterface";
import {
  daySkyAt,
  duskTargetGradient,
  hexToRgbChannels,
  parseSkyHourParam,
} from "@src/shared/skyTimeline";
import {
  clockSkyMoment,
  skyMomentAt,
  type SkyMoment,
} from "@src/shared/sky/solarSky";
import {
  currentTimeZone,
  locationForTimeZone,
} from "@src/shared/sky/timeZoneLocation";
import { nightStarsLayerAt } from "@src/shared/sky/nightStarField";
import { moonShadowLayerFor } from "@src/shared/sky/moonShadow";
import { writeSkyNightCache } from "@src/shared/sky/skyNightCache";
import {
  SKY_TURN_EASING,
  SKY_TURN_MS,
  skyTurnDirectionFor,
  skyTurnFaceDelayMs,
  skyTurnMaskFrames,
  skyTurnOldSkyFilters,
} from "@src/shared/sky/skyTurn";

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
  // only in the entry) so the whole shell agrees - addWrapperClasses' class, the
  // companion's moon/sun variant and the interaction sky all read this. Inert in
  // the extension/app, where no such query param is ever present.
  if (typeof window !== "undefined" && window.location?.search) {
    const theme = new URLSearchParams(window.location.search).get("theme");
    if (theme === "dark") return true;
    if (theme === "light") return false;
  }

  return getSkyMomentNow().isNight;
};

/**
 * The fractional *palette* hour pinned by the `?skyHour=` dev override
 * (styleguide / dashboard simulation), else null. Like `?theme=`, a content
 * script reads the *host page's* URL here, so a page carrying the param could
 * pin the overlay's sky - accepted as vanishingly unlikely, same as the
 * existing pattern.
 */
const getSkyHourOverride = (): number | null =>
  typeof window !== "undefined" && window.location?.search
    ? parseSkyHourParam(window.location.search)
    : null;

/** Any dev sky override - a simulated sky must not leave real night windows. */
const hasSkyOverride = (): boolean =>
  ["skyHour", "skyAt", "skyZone", "theme"].some(
    (name) => getSearchParam(name) !== null,
  );

const getSearchParam = (name: string): string | null =>
  typeof window !== "undefined" && window.location?.search
    ? new URLSearchParams(window.location.search).get(name)
    : null;

/**
 * The moment the sky is drawn for - normally now. Dev overrides for the
 * styleguide / dashboard simulation: `?skyAt=` any Date-parseable instant,
 * `?skyZone=` an IANA zone whose location stands in for the runtime's own.
 * A zoneless `?skyAt=` ("2026-06-21T21:30") is read in the *runtime's* zone,
 * not `?skyZone=`'s - pair them with an explicit offset ("...T21:30+02:00").
 */
const getSkyDateNow = (): Date => {
  const at = getSearchParam("skyAt");
  if (at) {
    const d = new Date(at);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
};

const getSkyZoneNow = (): string | null =>
  getSearchParam("skyZone") ?? currentTimeZone();

/**
 * The present sky: timed to the real sun for the zone's approximate location
 * (sky/solarSky.ts), or the fixed clock when the zone gives none. `?skyHour=`
 * pins the palette clock directly (the pre-solar preview behaviour).
 */
export const getSkyMomentNow = (): SkyMoment => {
  const date = getSkyDateNow();
  const pinnedHour = getSkyHourOverride();
  if (pinnedHour !== null) return clockSkyMoment(pinnedHour, date);
  return skyMomentAt(date, locationForTimeZone(getSkyZoneNow()));
};

/**
 * What to call the companion in copy. The disc already morphs sun↔moon with the
 * time of day (see RouteCmp's sunVariant), so text that names it should agree:
 * "moon" at night, "sun" by day. Lowercase - callers supply any leading capital.
 */
export const companionWord = (): "sun" | "moon" =>
  isDarkModeNow() ? "moon" : "sun";

/**
 * `companionWord()` for copy that stays on screen long enough to go stale.
 *
 * A one-shot read is fine for a surface the user passes through (onboarding
 * steps, an intervention). It is not fine for a line that can sit mounted for
 * hours - the dashboard's empty sky - because the `.minded-6622-dark` class
 * *can* flip without a reload: an Android/iOS background→resume across the
 * day/night threshold re-runs `setIsDarkModeIfApplies`, and the companion disc
 * follows it (RouteCmp mirrors the same class onto the sun↔moon variant). Copy
 * naming the disc has to follow too, or the text says "sun" under a moon.
 *
 * So mirror the class itself - the single source of truth - rather than
 * re-reading the clock: seeded for the first paint, then kept in step by a
 * MutationObserver, exactly as RouteCmp does for the disc.
 */
export const createCompanionWord = (): Accessor<"sun" | "moon"> => {
  const [getWord, setWord] = createSignal<"sun" | "moon">(companionWord());

  onMount(() => {
    const el = getWrapperEl();
    if (!el) return;
    const sync = () =>
      setWord(el.classList.contains("minded-6622-dark") ? "moon" : "sun");
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(el, { attributes: true, attributeFilter: ["class"] });
    onCleanup(() => observer.disconnect());
  });

  return getWord;
};

// Wrappers whose theme has been applied at least once. Only a *later* change
// is a day↔night flip worth animating; the first application is the initial
// paint and must land instantly.
const themedWrappers = new WeakSet<HTMLElement>();

type ViewTransition = {
  ready: Promise<void>;
  finished: Promise<void>;
};

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => ViewTransition;
};

// The sun's own capture group during a turn. One name per disc on screen (a
// view-transition-name must be unique, and the styleguide shows several).
const SKY_TURN_SUN_NAME = "minded-sky-turn-sun";

// A tap during the turn lands on the transition, not the page - so instead of
// eating it, hurry the rest of the turn to a close on this short beat, and the
// next touch reaches the sun.
const SKY_TURN_HURRY_MS = 280;

// The turn in flight, so a newer one can tell an older one's cleanup to keep
// its hands off the discs it has just claimed (starting a view transition
// skips the running one, whose `finished` then settles a beat later).
let currentSkyTurn = 0;

/** The running animations of the view transition's pseudo-elements. */
const viewTransitionAnimations = (root: HTMLElement): Animation[] =>
  root
    .getAnimations({ subtree: true })
    .filter((animation) =>
      (animation.effect as KeyframeEffect | null)?.pseudoElement?.startsWith(
        "::view-transition",
      ),
    );

/** Speed `animation` up so it lands within `ms`, wherever it is now. */
const hurryAnimation = (animation: Animation, ms: number) => {
  const end = Number(animation.effect?.getComputedTiming().endTime ?? 0);
  const remaining = end - Number(animation.currentTime ?? 0);
  if (remaining > ms) {
    animation.updatePlaybackRate((remaining / ms) * animation.playbackRate);
  }
};

/**
 * Night falls / day breaks over the page instead of the page cutting over (see
 * sky/skyTurn.ts for the shape of each). A View Transition holds the old sky
 * as a snapshot and reveals the new one through a moving soft-edged mask - the
 * one way to animate a whole-page gradient, which CSS can't transition. Ahead
 * of the front the old sky is already going: it dims toward the night (or
 * lifts toward the day), so the light left on screen reads as dusk deepening,
 * not a still picture waiting to be wiped.
 *
 * Each sun on screen is lifted out of the sweep into its own live layer, so it
 * stays one disc turning sun ↔ moon on its own faces (Sun.scss) instead of
 * being wiped across by the front; its turn is delayed to the moment the front
 * crosses it (--sky-turn-delay).
 *
 * Falls back to a plain update where View Transitions aren't available (older
 * WebViews), when the page is hidden (a resume lands on the new sky - nobody
 * was watching), or under reduced motion.
 */
const turnTheSky = (el: HTMLElement, isDark: boolean, update: () => void) => {
  const doc = document as ViewTransitionDocument;
  // A view transition snapshots the whole document - only use it when the
  // wrapper *is* the page (the apps), never for the content script's shadow
  // overlay, where it would sweep the host page too.
  if (
    typeof doc.startViewTransition !== "function" ||
    el.getRootNode() !== document ||
    document.visibilityState !== "visible" ||
    prefersReducedMotion()
  ) {
    update();
    return;
  }

  const turn = ++currentSkyTurn;
  const direction = skyTurnDirectionFor(isDark);
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  const suns = Array.from(el.querySelectorAll<HTMLElement>(".minded-sun"))
    // Only discs that are actually rendered get a capture of their own.
    .filter((sun) => sun.getClientRects().length > 0);
  suns.forEach((sun, i) => {
    const rect = sun.getBoundingClientRect();
    const yFraction = (rect.top + rect.height / 2) / (viewportH || 1);
    sun.style.setProperty(
      "--sky-turn-delay",
      `${skyTurnFaceDelayMs(direction, yFraction, viewportW, viewportH)}ms`,
    );
    sun.style.setProperty("view-transition-name", `${SKY_TURN_SUN_NAME}-${i}`);
  });
  const release = () => {
    // A newer turn has re-claimed these discs (same names, its own delays).
    if (turn !== currentSkyTurn) return;
    for (const sun of suns) {
      sun.style.removeProperty("view-transition-name");
      sun.style.removeProperty("--sky-turn-delay");
    }
  };

  const transition = doc.startViewTransition.call(doc, update);
  const root = document.documentElement;
  const hurry = () => {
    for (const animation of viewTransitionAnimations(root)) {
      hurryAnimation(animation, SKY_TURN_HURRY_MS);
    }
    // The discs' own turn too - their faces and halo are plain CSS
    // transitions, still waiting out --sky-turn-delay - or the sky would land
    // on night while the disc it ends on is still the sun.
    for (const sun of suns) {
      for (const animation of sun.getAnimations({ subtree: true })) {
        hurryAnimation(animation, SKY_TURN_HURRY_MS);
      }
    }
  };
  transition.ready
    .then(() => {
      // Replace the UA's whole-page dissolve: the old sky stays fully there,
      // the new one is revealed over it by the mask alone (and plainly
      // composited - the dissolve's plus-lighter would bleach the overlap).
      for (const animation of viewTransitionAnimations(root)) {
        animation.cancel();
      }
      const timing: KeyframeAnimationOptions = {
        duration: SKY_TURN_MS,
        easing: SKY_TURN_EASING,
        fill: "both",
      };
      const [from, to] = skyTurnMaskFrames(direction, viewportW, viewportH);
      root.animate(
        [
          { ...from, mixBlendMode: "normal" },
          { ...to, mixBlendMode: "normal" },
        ],
        { ...timing, pseudoElement: "::view-transition-new(root)" },
      );
      const [lightFrom, lightTo] = skyTurnOldSkyFilters(direction);
      root.animate(
        [
          { filter: lightFrom, mixBlendMode: "normal" },
          { filter: lightTo, mixBlendMode: "normal" },
        ],
        { ...timing, pseudoElement: "::view-transition-old(root)" },
      );
      // Each sun shows only its live self, turning on its own faces; its
      // snapshot of the old disc is never seen. Nothing to move - the disc
      // stays where it is.
      suns.forEach((_, i) => {
        const name = `${SKY_TURN_SUN_NAME}-${i}`;
        root.animate([{ opacity: 0 }, { opacity: 0 }], {
          ...timing,
          pseudoElement: `::view-transition-old(${name})`,
        });
        root.animate(
          [
            { opacity: 1, mixBlendMode: "normal" },
            { opacity: 1, mixBlendMode: "normal" },
          ],
          { ...timing, pseudoElement: `::view-transition-new(${name})` },
        );
      });
      document.addEventListener("pointerdown", hurry, {
        capture: true,
        once: true,
      });
    })
    // A skipped transition (e.g. the page hid mid-turn) already applied the
    // update; nothing left to soften.
    .catch(() => undefined);
  transition.finished
    .catch(() => undefined)
    .then(() => {
      document.removeEventListener("pointerdown", hurry, { capture: true });
      // The faces' own turn may still be finishing - their transition already
      // started with its delay, which clearing the var doesn't touch.
      release();
    });
};

export const setIsDarkModeIfApplies = (
  el: HTMLElement | null = document.getElementById("minded-6622"),
) => {
  if (!el) {
    console.error("Element not found for dark mode application");
    return;
  }

  const isDark = isDarkModeNow();
  const apply = () => {
    el.classList.toggle("minded-6622-dark", isDark);
    // The living sky's inline vars are theme-keyed (applySkyMoment): re-apply
    // them with the class, or a flip (or a resume across dusk) keeps the old
    // theme's overrides - the day reveal over the night, every star, no
    // afterglow - until the next minute's tick jumps the sky a second time.
    applySkyMoment(getSkyMomentNow(), el);
  };
  const isFlip =
    themedWrappers.has(el) &&
    el.classList.contains("minded-6622-dark") !== isDark;
  themedWrappers.add(el);
  if (isFlip) {
    turnTheSky(el, isDark, apply);
  } else {
    apply();
  }
};

// Everything the living *day* sky overrides inline (see skyTimeline.ts), and
// so everything cleared again when the theme flips to dark. The ambient stops
// recompose --background-gradient via _variables.scss; the composed sunset
// gradient keeps the drag reveal and the grounding stage pixel-identical (both
// read the same var); the bluesky pair feeds the up-drag layer at its use
// site, so route-local overrides (SleepWindDown) still win over this
// wrapper-level value. Night's live values (NIGHT_VAR_NAMES) are deliberately
// not in this list: they are set in the dark branch and cleared in the light
// one, the mirror image of these.
const SKY_VAR_NAMES = [
  "--c-gradient-1",
  "--c-gradient-2",
  "--c-gradient-3",
  "--c-gradient-4",
  "--day-zenith-rgb",
  "--day-horizon-glow-rgb",
  "--background-sunset-gradient",
  "--bg-transition-bluesky-top",
  "--bg-transition-bluesky-bottom",
] as const;

// Night's live values, set in the dark branch and cleared in the light one -
// the mirror image of SKY_VAR_NAMES. Each falls back to the stylesheet's
// static night when absent: no afterglow, the full star field.
const NIGHT_VAR_NAMES = ["--night-afterglow", "--night-stars"] as const;

/** Set an inline var only when it changes - the star/moon layers are SVGs. */
const setVar = (el: HTMLElement, name: string, value: string | null) => {
  if (value === null) {
    el.style.removeProperty(name);
  } else if (el.style.getPropertyValue(name) !== value) {
    el.style.setProperty(name, value);
  }
};

/**
 * Point-in-time application of the living sky for a moment: sets the ambient
 * gradient stops and the drag-target skies as inline var overrides on the
 * wrapper. Keyed off the wrapper's *class*, not the clock: in dark mode the
 * day overrides are cleared so the dark theme's own sky (deep-night gradient,
 * deep-night reveal) applies untouched - an inline value would beat the
 * .minded-6622-dark stylesheet overrides. Night gets its own live values: the
 * fading sunset afterglow and the stars coming out with the twilight. The
 * moon's phase (--moon-shadow) is set in both, so a mid-flight theme flip
 * morphs into the right moon.
 */
export const applySkyMoment = (
  moment: SkyMoment,
  el: HTMLElement | null = getWrapperEl(),
) => {
  if (!el) return;
  setVar(
    el,
    "--moon-shadow",
    moonShadowLayerFor(moment.moon, moment.isSouthernHemisphere),
  );
  if (el.classList.contains("minded-6622-dark")) {
    for (const name of SKY_VAR_NAMES) {
      el.style.removeProperty(name);
    }
    setVar(
      el,
      "--night-afterglow",
      String(Math.round(moment.afterglow * 1000) / 1000),
    );
    setVar(
      el,
      "--night-stars",
      moment.starDepth >= 1 ? null : nightStarsLayerAt(moment.starDepth),
    );
    return;
  }
  for (const name of NIGHT_VAR_NAMES) {
    el.style.removeProperty(name);
  }
  const sky = daySkyAt(moment.hour, moment.blend);
  sky.colors.forEach((color, i) => {
    el.style.setProperty(`--c-gradient-${i + 1}`, color);
  });
  el.style.setProperty(
    "--day-zenith-rgb",
    hexToRgbChannels(sky.accents.zenith),
  );
  el.style.setProperty(
    "--day-horizon-glow-rgb",
    hexToRgbChannels(sky.accents.horizonGlow),
  );
  el.style.setProperty(
    "--background-sunset-gradient",
    duskTargetGradient(sky.dusk),
  );
  el.style.setProperty("--bg-transition-bluesky-top", sky.zenith[0]);
  el.style.setProperty("--bg-transition-bluesky-bottom", sky.zenith[1]);
};

/**
 * The sky at a fixed *palette* hour (the fixed-clock look) - the styleguide's
 * scrubber previews the keyframes through this.
 */
export const applySkyAtHour = (
  hour: number,
  el: HTMLElement | null = getWrapperEl(),
) => applySkyMoment(clockSkyMoment(hour, getSkyDateNow()), el);

const applySkyNow = (el: HTMLElement | null, shadowRoot?: ShadowRoot) => {
  applySkyMoment(getSkyMomentNow(), el);
  // Only the app's own pages (never a content script - that would be the host
  // page's storage) leave the loading pages their night windows.
  if (!shadowRoot && el && !hasSkyOverride()) {
    writeSkyNightCache(getSkyDateNow(), locationForTimeZone(getSkyZoneNow()));
  }
};

export const applySkyForNow = (shadowRoot?: ShadowRoot) =>
  applySkyNow(getWrapperEl(shadowRoot), shadowRoot);

/**
 * Opt the page's own wrapper into turning day↔night *live*: when the minute
 * tick finds the real dusk (or dawn) has arrived under an open page, night
 * falls (or day breaks) right there, through the same sky turn a resume plays
 * - instead of the old theme staying put until the next resume or reload.
 *
 * Only the shell opts in (RouteCmp, which mirrors the class onto its sun), and
 * only while `isReady` says so: the interaction surfaces read parts of the
 * theme once when they open, so turning the sky under a pause would leave it
 * half in the old theme. The turn simply waits for the tick after it closes.
 * Never a content script - its shadow overlay has no live sky to turn.
 */
let canTurnLive: (() => boolean) | null = null;
export const followDayNight = (isReady: () => boolean = () => true) => {
  canTurnLive = isReady;
};

const isThemeStale = (el: HTMLElement): boolean =>
  themedWrappers.has(el) &&
  el.classList.contains("minded-6622-dark") !== isDarkModeNow();

// One interval per JS context, re-resolving the wrapper each tick.
// Per-minute steps are sub-perceptual by design - the sky is ambient state,
// not animation. The one exception is the day↔night turn itself (see
// followDayNight), which is an event, so it gets its moment.
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
    if (canTurnLive?.() && !shadowRoot && el && isThemeStale(el)) {
      // setIsDarkModeIfApplies applies this minute's sky inside the turn; the
      // night-window cache simply catches up on the next tick.
      setIsDarkModeIfApplies(el);
      return;
    }
    applySkyNow(el, shadowRoot);
  }, 60_000);
};
