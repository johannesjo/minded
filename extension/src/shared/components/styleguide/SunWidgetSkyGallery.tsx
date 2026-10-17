import { For, JSX } from "solid-js";

// @ts-ignore - side-effect-free css module import
import styles from "./styleguide.module.scss";
import {
  AMBIENT_SKY_KEYFRAMES,
  ambientSkyGradient,
} from "@src/shared/skyTimeline";
import { SUN_WIDGET_PREVIEWS } from "./generated/sunWidgetPreviews";

/**
 * The card face of the Android widget across the day - a still of
 * MyAppWidget.PromptCard: the time-of-day sky with a serif line resting above
 * the sun (at night the moon carries it alone, wordless). The disc gallery next
 * to this shows the sun/moon art; this shows the sky that steps behind it.
 *
 * The five day skies are the app's ambient keyframes (skyTimeline.ts) - the same
 * data gen_loading_sky.py bakes into the widget_sky_* PNGs, and the same
 * per-hour choice WidgetSky.forHour makes - so this preview can't silently drift
 * from what ships. Indicative of palette and layout, not a pixel-exact device
 * render (the device sky is a dithered PNG; this is a CSS gradient).
 */

// The widget steps the sky on whole hours (WidgetSky.forHour): these ranges
// mirror those boundaries. The colours come from the ambient keyframe of the
// same name, so only the ranges live here.
const WIDGET_SKY_HOURS: Record<string, string> = {
  dawn: "06–09",
  morning: "09–13",
  midday: "13–17",
  afternoon: "17–18",
  dusk: "18–19",
};

// The card's night sky, mirroring gen_loading_sky.py's DARK_STOPS (baked to
// widget_sky_dark). It has no JS twin, so this preview-only copy carries a sync
// note rather than a shared constant. Like the baked PNG it is the plain base
// gradient - the deep night, once the sunset's afterglow has drained.
const WIDGET_NIGHT_SKY =
  "linear-gradient(to bottom, #02091f 0%, #041238 28%, #0a2860 68%, #123262 82%, #233053 92%, #2b3a63 100%)";

// The night's first stretch (widget_sky_nightfall): the same sky with the
// night composite's warm layers (_variables.scss) at gen_loading_sky.py's
// NIGHTFALL_AFTERGLOW_LEVEL, 0.65. The generator sizes the glow in the card's
// own vmin (its height); in this ~3:2 preview that is ~77% of the width.
const WIDGET_NIGHTFALL_SKY =
  "radial-gradient(ellipse 77% 32% at 50% 112%, rgba(117, 54, 44, 0.221) 0%, rgba(76, 43, 58, 0.13) 46%, transparent 78%), " +
  "linear-gradient(to bottom, transparent 88%, rgba(93, 43, 32, 0.39) 100%), " +
  WIDGET_NIGHT_SKY;

// One real WAKING_PROMPTS line (WidgetPrompts), shown on every day card so the
// sky is the only thing that varies across them.
const SAMPLE_LINE = "Feel both feet on the floor.";

const discSvg = (key: "day" | "night"): string =>
  SUN_WIDGET_PREVIEWS.find((p) => p.key === key)?.svg ?? "";

type SkyCard = {
  label: string;
  hours: string;
  gradient: string;
  isNight: boolean;
};

const SKY_CARDS: SkyCard[] = [
  ...AMBIENT_SKY_KEYFRAMES.map((kf) => ({
    label: kf.label,
    hours: WIDGET_SKY_HOURS[kf.label] ?? "",
    gradient: ambientSkyGradient(kf.colors),
    isNight: false,
  })),
  // On the fixed clock; with a place both ride the real sun (WidgetSky).
  {
    label: "nightfall",
    hours: "19–20",
    gradient: WIDGET_NIGHTFALL_SKY,
    isNight: true,
  },
  { label: "night", hours: "20–06", gradient: WIDGET_NIGHT_SKY, isNight: true },
];

const SunWidgetSkyGallery = (): JSX.Element => (
  <div class={styles.widgetGrid}>
    <For each={SKY_CARDS}>
      {(sky) => (
        <figure class={styles.widgetSkyCard}>
          <div
            class={styles.widgetSkyFace}
            style={{ background: sky.gradient }}
          >
            {/* Day carries a serif line above the sun; night is the moon alone -
                a line at 2 a.m. reads as a nudge (WidgetPrompts). */}
            {!sky.isNight && <p class={styles.widgetSkyLine}>{SAMPLE_LINE}</p>}
            <img
              class={styles.widgetSkyDisc}
              src={`data:image/svg+xml,${encodeURIComponent(
                discSvg(sky.isNight ? "night" : "day"),
              )}`}
              alt=""
              width={40}
              height={40}
            />
          </div>
          <figcaption>
            {sky.label} <span class={styles.muted}>{sky.hours}</span>
          </figcaption>
        </figure>
      )}
    </For>
  </div>
);

export default SunWidgetSkyGallery;
