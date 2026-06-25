import { For, JSX } from "solid-js";

// @ts-ignore — side-effect-free css module import
import styles from "./styleguide.module.scss";
import { SUN_WIDGET_PREVIEWS } from "./generated/sunWidgetPreviews";

/**
 * The two time-of-day phases of the Android home-screen companion sun widget —
 * the warm sun by day, the cool moon by night — built from the real widget
 * assets by scripts/generate-widget-previews.mjs (single source of truth,
 * regenerated on every styleguide build): the day sun is the vector drawable
 * converted to SVG; the night moon is the actual lunar photo + baked glow
 * (drawable-nodpi/ic_sun_widget_night.webp) embedded as-is. Toggle the
 * styleguide's dark mode to preview the discs on a dark wallpaper. Indicative of
 * palette and proportion, not a pixel-exact device render.
 */
const SunWidgetGallery = (): JSX.Element => (
  <div class={styles.widgetGrid}>
    <For each={SUN_WIDGET_PREVIEWS}>
      {(phase) => (
        <figure class={styles.widgetCard}>
          {/* Render as an <img> data-URI: the figcaption names each disc, so the
              image itself is decorative (alt=""). */}
          <img
            class={styles.widgetDisc}
            src={`data:image/svg+xml,${encodeURIComponent(phase.svg)}`}
            alt=""
            width={108}
            height={108}
          />
          <figcaption>
            {phase.label} <span class={styles.muted}>{phase.hours}</span>
          </figcaption>
        </figure>
      )}
    </For>
  </div>
);

export default SunWidgetGallery;
