import { Component, createSignal, For, onMount, Show } from "solid-js";

interface StarsProps {
  // 0 = no stars, 1 = full night sky. Driven by the sun's drag progress so the
  // stars come out gradually as the sun is pulled down (and recede as it is
  // pulled back up or springs home), rather than snapping on at completion. The
  // caller already gates this to dark mode (0 by day), so the field never shows
  // over a daytime sky.
  intensity: number;
  // The corner-to-corner shooting-star flourish. On by default (the dashboard's
  // down-drag sky). Calm always-on surfaces — the grounding sit — pass false: a
  // streaking meteor reads as a jolt behind a settling meditation.
  shootingStars?: boolean;
}

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  animationDelay: number;
  twinkleDuration: number;
  // The dim end of this star's twinkle (the bright end is always 1). Varied per
  // star so the field shimmers softly with a sense of depth rather than every
  // star blinking fully on/off in lockstep — see the `twinkle` keyframe.
  minOpacity: number;
}

// Cap on the whole field's brightness. The night-mode cards and buttons rest at
// a barely-there fill (`--btn-bg` 0.12, `--btn-bg-not-selected` 0.06 white), so
// a field of pure-white pinpoints twinkling up to full opacity behind them bled
// straight through and sat behind the text — the stars, buttons and cards all
// competed and none read cleanly. Holding the field to a fraction of the drag
// intensity keeps the night sky present and magical on the near-empty surfaces
// (goodnight, the grounding sit) while dimming it enough that it stays *behind*
// the UI rather than through it. One lever, applied uniformly to every star and
// shooting star, so nothing has to know where the cards happen to sit.
const FIELD_MAX_OPACITY = 0.55;

const Stars: Component<StarsProps> = (props) => {
  const [stars, setStars] = createSignal<Star[]>([]);
  let containerEl: HTMLDivElement;

  const generateStars = () => {
    const starCount = 230; // Number of stars
    const newStars: Star[] = [];

    for (let i = 0; i < starCount; i++) {
      newStars.push({
        id: i,
        x: Math.random() * 100, // Random position 0-100%
        y: Math.random() * 100,
        size: Math.random() * 2 + 1, // Size between 1-3px
        animationDelay: Math.random() * 6, // Random delay 0-6s
        // 3-6s cycles — a lively shimmer without tipping into a harsh flicker.
        twinkleDuration: Math.random() * 3 + 3,
        // Dip to 0.3-0.75 then back to full: enough contrast to sparkle, but
        // never blinking fully off.
        minOpacity: Math.random() * 0.45 + 0.3,
      });
    }

    setStars(newStars);
  };

  onMount(() => {
    generateStars();
  });

  return (
    <div
      ref={containerEl!}
      class="stars-container"
      // Opacity tracks the drag directly so the reveal is gradual and reverses
      // with it, but capped at FIELD_MAX_OPACITY so the field stays legibly
      // behind the translucent night-mode cards/buttons rather than bleeding
      // through them. `active` only switches on the shooting-star flourish once
      // any star is showing — it no longer controls the fade (that's the inline
      // opacity now).
      classList={{
        active: props.intensity > 0,
      }}
      style={{ opacity: props.intensity * FIELD_MAX_OPACITY }}
    >
      <For each={stars()}>
        {(star) => (
          <div
            class="star"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              "animation-delay": `${star.animationDelay}s`,
              "animation-duration": `${star.twinkleDuration}s`,
              // Per-star dim level for the twinkle (and the static brightness when
              // motion is reduced) — see `--twinkle-min` in Stars.scss.
              "--twinkle-min": `${star.minOpacity}`,
            }}
          />
        )}
      </For>

      {/* Add some shooting stars for extra magic */}
      <Show when={props.shootingStars ?? true}>
        <div class="shooting-star shooting-star-1" />
        <div class="shooting-star shooting-star-2" />
        <div class="shooting-star shooting-star-3" />
      </Show>
    </div>
  );
};

export default Stars;
