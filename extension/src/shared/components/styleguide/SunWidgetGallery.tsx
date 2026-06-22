import { For, JSX } from "solid-js";

// @ts-ignore — side-effect-free css module import
import styles from "./styleguide.module.scss";
import { SUN_WIDGET_PREVIEWS } from "./generated/sunWidgetPreviews";

/**
 * The four time-of-day phases of the Android home-screen companion sun widget,
 * rendered from the real `ic_sun_widget_*.xml` drawables (converted to SVG by
 * scripts/generate-widget-previews.mjs — single source of truth, regenerated on
 * every styleguide build). Toggle the styleguide's dark mode to preview the
 * discs on a dark wallpaper. SVG is close to, but not pixel-identical with,
 * Android's gradient rendering — good for palette and drift, not a device check.
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
