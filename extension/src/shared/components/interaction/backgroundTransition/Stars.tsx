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

const Stars: Component<StarsProps> = (props) => {
  const [stars, setStars] = createSignal<Star[]>([]);
  let containerEl: HTMLDivElement;

  const generateStars = () => {
    const starCount = 150; // Number of stars
    const newStars: Star[] = [];

    for (let i = 0; i < starCount; i++) {
      newStars.push({
        id: i,
        x: Math.random() * 100, // Random position 0-100%
        y: Math.random() * 100,
        size: Math.random() * 2 + 1, // Size between 1-3px
        animationDelay: Math.random() * 6, // Random delay 0-6s
        // Longer, gentler cycles (4-7s) so the field breathes calmly instead of
        // flickering.
        twinkleDuration: Math.random() * 3 + 4,
        // Stay between fairly bright (0.5-0.85) and full, never blinking off.
        minOpacity: Math.random() * 0.35 + 0.5,
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
      // with it. `active` only switches on the shooting-star flourish once any
      // star is showing — it no longer controls the fade (that's the inline
      // opacity now).
      classList={{
        active: props.intensity > 0,
      }}
      style={{ opacity: props.intensity }}
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
