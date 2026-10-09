import { For, type JSX } from "solid-js";
import { BreathSun } from "@src/shared/components/interaction/breathSun/BreathSun";
import { moonShadowLayerFor } from "@src/shared/sky/moonShadow";
import { nightStarsLayerAt } from "@src/shared/sky/nightStarField";
import { nightWindowsFrom } from "@src/shared/sky/solarSky";
import {
  currentTimeZone,
  locationForTimeZone,
} from "@src/shared/sky/timeZoneLocation";
import { getSkyMomentNow } from "@src/shared/addWrapperClasses";
import styles from "./styleguide.module.scss";

// The true sky (src/shared/sky/): what the real sun and moon are doing for
// this zone today, the moon's phases, and the stars coming out with the
// twilight - plus jumps into the dashboard simulation at telling moments.

const MOON_CYCLES = [0, 0.07, 0.18, 0.25, 0.36, 0.5, 0.64, 0.75, 0.86, 0.95];
const STAR_DEPTHS = [0.05, 0.2, 0.45, 0.7, 1];

const SIMULATIONS: ReadonlyArray<{ label: string; query: string }> = [
  {
    label: "Berlin, June dusk",
    query: "skyAt=2026-06-21T19:15:00Z&skyZone=Europe/Berlin",
  },
  {
    label: "Berlin, June 21:50 (blue hour)",
    query: "skyAt=2026-06-21T19:50:00Z&skyZone=Europe/Berlin",
  },
  {
    label: "Berlin, December 16:00",
    query: "skyAt=2026-12-21T15:00:00Z&skyZone=Europe/Berlin",
  },
  {
    label: "crescent moon night",
    query: "skyAt=2026-10-14T21:00:00Z&skyZone=Europe/Berlin",
  },
  {
    label: "Svalbard, midsummer midnight",
    query: "skyAt=2026-06-21T22:00:00Z&skyZone=Arctic/Longyearbyen",
  },
];

// The styleguide's own Subsection markup (kept local, not exported from
// Styleguide.tsx, to avoid a circular import).
const Subsection = (props: {
  label: string;
  children: JSX.Element;
}): JSX.Element => (
  <div class={styles.subsection}>
    <code class={styles.subsectionLabel}>{props.label}</code>
    <div class={styles.subsectionRow}>{props.children}</div>
  </div>
);

const fmt = (ms: number): string =>
  new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const TrueSkyPreview = (): JSX.Element => {
  const zone = currentTimeZone();
  const location = locationForTimeZone(zone);
  const moment = getSkyMomentNow();
  const nights = location
    ? nightWindowsFrom(new Date(), location, 24).map(
        ([a, b]) => `${fmt(a)}–${fmt(b)}`,
      )
    : [];

  return (
    <>
      <Subsection label="true sky - timed to the real sun">
        <p class={styles.muted}>
          {location
            ? `${zone} ≈ ${location.lat}°, ${location.lon}° · next 24h night: ${nights.join(", ") || "none (the sun stays up)"} · palette hour now ${moment.hour.toFixed(2)} · stars ${Math.round(moment.starDepth * 100)}% · moon ${Math.round(moment.moon.illumination * 100)}% lit`
            : `${zone ?? "unknown zone"}: no location - fixed 19:00/06:00 clock`}
        </p>
        <div class={styles.skyControls}>
          <For each={SIMULATIONS}>
            {(sim) => <a href={`dashboard.html?${sim.query}`}>{sim.label} →</a>}
          </For>
        </div>
      </Subsection>

      <Subsection label="moon phases (new → full → new)">
        <div class={styles.skyControls}>
          <For each={MOON_CYCLES}>
            {(cycle) => (
              <div
                style={{
                  "--moon-shadow": moonShadowLayerFor({
                    cycle,
                    illumination: (1 - Math.cos(2 * Math.PI * cycle)) / 2,
                    isWaxing: cycle < 0.5,
                  }),
                }}
              >
                <BreathSun variant="moon" size="compact" fill={1} />
              </div>
            )}
          </For>
        </div>
      </Subsection>

      <Subsection label="stars coming out with the twilight (-4° → -18°)">
        <div class={styles.skyControls}>
          <For each={STAR_DEPTHS}>
            {(depth) => (
              <div class={styles.skyStrip}>
                <div
                  class={styles.skyStripSample}
                  style={{
                    "background-image": `${nightStarsLayerAt(depth)}, linear-gradient(#02091f, #0a2860)`,
                    "background-size": "cover",
                  }}
                />
                <code>{Math.round(depth * 100)}%</code>
              </div>
            )}
          </For>
        </div>
      </Subsection>
    </>
  );
};

export default TrueSkyPreview;
