import { For, JSX } from "solid-js";

// @ts-ignore - side-effect-free css module import
import styles from "./styleguide.module.scss";

/**
 * The three moon faces - the pre-#92 gradient original (`.legacy-moon`), the
 * lunar photo that ships today, and the proposed abstract face
 * (`.minded-moon-abstract`) - crossed against the sizes the disc actually
 * renders. Both alternatives live in Sun.scss behind ancestor classes only this
 * page sets.
 *
 * Laid out as a matrix, faces across and sizes down, so the comparison that
 * matters reads along a single row: three faces at one real size, side by side.
 * Three separate cards can't do that - the styleguide caps at 1100px, so they
 * wrap and you end up comparing 120px against 42px a screen apart.
 *
 * Real pixel sizes, never scaled previews - a moon judged at 512px is not the
 * moon anyone sees, and the whole question here is what survives at 42px. The
 * backdrop is a fixed night sky in either theme: the halo is white and only
 * reads against a dark sky.
 */

/** From getSunSize() (sunAnimationUtils.ts) and the companion settle's scale. */
const SIZES: ReadonlyArray<{ px: number; where: string }> = [
  { px: 120, where: "intervention, desktop" },
  { px: 80, where: "intervention, phone" },
  { px: 42, where: "companion at rest" },
];

/**
 * The control comes first on purpose. The gradient moon is what the photo
 * replaced, and reading left to right the page argues its own case: the thing
 * that lost, the thing that shipped, the thing being proposed.
 */
const FACES: ReadonlyArray<{ label: string; note: string; scope?: string }> = [
  {
    label: "gradient (pre-#92)",
    note: "the original - replaced, and rejected again in #95",
    scope: "legacy-moon",
  },
  { label: "photo", note: "shipped today" },
  {
    label: "abstract",
    note: "proposed - bigger, asymmetric maria",
    scope: "minded-moon-abstract",
  },
];

/**
 * The disc's resting halo is JS-driven in the live app (Sun.tsx floors
 * --glow-intensity at MOON_REST_GLOW), so a static preview has to set it by hand
 * or both faces would show up haloless and neither would look like the moon.
 */
const MOON_REST_GLOW = "1.1";

const MoonFaceGallery = (): JSX.Element => (
  <div class={styles.moonFaceMatrix}>
    {/* Header row: an empty corner for the size-label column, then the faces. */}
    <div />
    <For each={FACES}>
      {(face) => (
        <div class={styles.moonFaceHead}>
          {face.label}
          <span class={styles.moonFaceNote}>{face.note}</span>
        </div>
      )}
    </For>

    <For each={SIZES}>
      {(size) => (
        <>
          <div class={styles.moonFaceSizeLabel}>
            {size.px}px
            <span class={styles.moonFaceNote}>{size.where}</span>
          </div>
          <For each={FACES}>
            {(face) => (
              // The scope class has to sit on an ancestor of .minded-sun, so it
              // goes on the cell rather than the disc itself.
              <div
                class={styles.moonFaceCell}
                classList={face.scope ? { [face.scope]: true } : {}}
              >
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
              </div>
            )}
          </For>
        </>
      )}
    </For>
  </div>
);

export default MoonFaceGallery;
