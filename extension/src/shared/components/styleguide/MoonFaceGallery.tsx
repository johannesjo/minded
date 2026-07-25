import { For, JSX } from "solid-js";

// @ts-ignore - side-effect-free css module import
import styles from "./styleguide.module.scss";

/**
 * Side-by-side of the two moon faces: the shipped lunar photo
 * (`assets/img/moon.webp`) and the abstract, gradient-only face
 * (`.minded-moon-abstract` in Sun.scss), at the sizes the disc actually renders.
 *
 * The comparison only means anything at real size - a moon judged at 512px is
 * not the moon anyone sees - so the discs are drawn at the exact pixel sizes the
 * app uses, not scaled previews. Both sit on a night backdrop in either theme:
 * the moon's halo is white and only reads against a dark sky.
 */

/** From getSunSize() (sunAnimationUtils.ts) and the companion settle's scale. */
const SIZES: ReadonlyArray<{ px: number; where: string }> = [
  { px: 120, where: "intervention, desktop" },
  { px: 80, where: "intervention, phone" },
  { px: 42, where: "companion at rest" },
];

const FACES: ReadonlyArray<{ label: string; isAbstract: boolean }> = [
  { label: "photo (shipped)", isAbstract: false },
  { label: "abstract (proposed)", isAbstract: true },
];

/**
 * The disc's resting halo is JS-driven in the live app (Sun.tsx floors
 * --glow-intensity at MOON_REST_GLOW), so a static preview has to set it by hand
 * or both faces would show up haloless and neither would look like the moon.
 */
const MOON_REST_GLOW = "1.1";

const MoonFaceGallery = (): JSX.Element => (
  <div class={styles.moonFaceGrid}>
    <For each={FACES}>
      {(face) => (
        <figure
          class={styles.moonFaceCard}
          classList={{ "minded-moon-abstract": face.isAbstract }}
        >
          <div class={styles.moonFaceRow}>
            <For each={SIZES}>
              {(size) => (
                <div class={styles.moonFaceSlot}>
                  {/* The same markup the display-only BreathSun renders: the
                      global .minded-sun disc plus its crossfading face pair. */}
                  <span
                    class="minded-sun moon"
                    style={{
                      width: `${size.px}px`,
                      height: `${size.px}px`,
                      "--glow-intensity": MOON_REST_GLOW,
                    }}
                    aria-hidden="true"
                  >
                    <span class="sun-face" />
                    <span class="moon-face" />
                  </span>
                  <span>
                    {size.px}px <span class={styles.muted}>{size.where}</span>
                  </span>
                </div>
              )}
            </For>
          </div>
          <figcaption>{face.label}</figcaption>
        </figure>
      )}
    </For>
  </div>
);

export default MoonFaceGallery;
