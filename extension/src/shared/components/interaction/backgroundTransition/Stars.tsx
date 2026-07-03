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
  // Hold the field to FIELD_MAX_OPACITY so it stays *behind* translucent UI
  // rather than bleeding through it. Only the dashboard/interaction background
  // (stars behind cards + buttons) passes this; the full-screen success night
  // sky — the grounding sit, the goodnight — keeps the stars at full brightness,
  // since there is no card or button there to compete with them.
  dimmed?: boolean;
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

// Cap for the *dimmed* field only (see the `dimmed` prop). The night-mode cards
// and buttons rest at a barely-there fill (`--btn-bg` 0.12, `--btn-bg-not-selected`
// 0.06 white), so a field of pure-white pinpoints twinkling up to full opacity
// behind them bled straight through and sat behind the text — the stars, buttons
// and cards all competed and none read cleanly. Where stars back that UI we hold
// the field to a fraction of the drag intensity so it stays behind the cards
// rather than through them. The full-screen success night sky is left at full
// brightness (dimmed omitted) — nothing sits over it to lose legibility.
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
      // with it. When `dimmed`, it is held to FIELD_MAX_OPACITY so the field
      // stays legibly behind the translucent night-mode cards/buttons rather
      // than bleeding through them; the success night sky leaves it at full.
      // `active` only switches on the shooting-star flourish once any star is
      // showing — it no longer controls the fade (that's the inline opacity now).
      classList={{
        active: props.intensity > 0,
      }}
      style={{
        opacity: props.intensity * (props.dimmed ? FIELD_MAX_OPACITY : 1),
      }}
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
