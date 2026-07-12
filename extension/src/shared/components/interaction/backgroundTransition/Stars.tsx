import { Component, createEffect, createSignal, For, Show } from "solid-js";

interface StarsProps {
  // 0 = no field, 1 = full sky. Driven by the sun's drag progress so the field
  // comes out gradually as the sun is pulled down (and recedes as it is pulled
  // back up or springs home), rather than snapping on at completion.
  intensity: number;
  // The corner-to-corner shooting-star flourish (night only). On by default
  // (the dashboard's down-drag sky). Calm always-on surfaces — the grounding
  // sit — pass false: a streaking meteor reads as a jolt behind a settling
  // meditation.
  shootingStars?: boolean;
  // Hold the field to FIELD_MAX_OPACITY so it stays *behind* translucent UI
  // rather than bleeding through it. Only the dashboard/interaction background
  // (stars behind cards + buttons) passes this; the full-screen success night
  // sky — the grounding sit, the goodnight — keeps the stars at full brightness,
  // since there is no card or button there to compete with them.
  dimmed?: boolean;
  // "night" (default) is the twinkling star field. "day" is its daylight
  // counterpart over the revealed golden sky: fewer, larger, warm motes of
  // light adrift in the low sun — the dust-in-a-sunbeam image. They glint and
  // drift slowly instead of streaking (see the shooting-star note above: fast
  // motion reads as a jolt, so by day the slow drift *is* the magic). The
  // field regenerates if this flips (BackgroundTransition resolves dark mode a
  // beat after mount) — always while intensity is 0, so the swap never shows.
  variant?: "night" | "day";
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
  // Day motes only: how far this mote wanders over one cycle (px, set as
  // --drift-x/--drift-y for the `moteDrift` keyframe). Stars stay in place.
  driftX?: number;
  driftY?: number;
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
  const isDay = () => props.variant === "day";

  const generateStars = () => {
    const newStars: Star[] = [];

    if (isDay()) {
      // Day motes: far fewer and larger than the stars — sparse specks of
      // light hanging in the air, not a starfield recoloured. Long cycles and
      // negative delays start every mote mid-wander, so the field fades in
      // already alive rather than moving off in lockstep.
      const moteCount = 70;
      for (let i = 0; i < moteCount; i++) {
        const twinkleDuration = Math.random() * 12 + 10; // 10-22s cycles
        newStars.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: Math.random() * 3 + 2, // 2-5px
          animationDelay: -Math.random() * twinkleDuration,
          twinkleDuration,
          // Dimmer dips than the stars: a mote drifting out of the light
          // nearly disappears, which is what makes the glints read as light.
          minOpacity: Math.random() * 0.4 + 0.15,
          // A slow, slightly rising wander — dust in warm air.
          driftX: Math.random() * 24 - 12,
          driftY: -(Math.random() * 12 + 4),
        });
      }
      setStars(newStars);
      return;
    }

    const starCount = 230; // Number of stars

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

  // Tracks props.variant (via isDay() in generateStars), so the field is
  // rebuilt for the right sky once the caller's dark-mode check lands.
  createEffect(() => {
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
            classList={{ star: true, mote: isDay() }}
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
              // Day motes wander by this much per cycle (see `moteDrift`).
              ...(star.driftX !== undefined && {
                "--drift-x": `${star.driftX}px`,
                "--drift-y": `${star.driftY}px`,
              }),
            }}
          />
        )}
      </For>

      {/* Shooting stars for extra magic — night only: the day field's magic is
          the slow drift itself, and a fast streak would jolt the calm. */}
      <Show when={!isDay() && (props.shootingStars ?? true)}>
        <div class="shooting-star shooting-star-1" />
        <div class="shooting-star shooting-star-2" />
        <div class="shooting-star shooting-star-3" />
      </Show>
    </div>
  );
};

export default Stars;
