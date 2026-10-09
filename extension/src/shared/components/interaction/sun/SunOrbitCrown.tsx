import {
  Component,
  createEffect,
  createSignal,
  Index,
  onCleanup,
  Show,
} from "solid-js";

type Orbit = { total: number; filled: number };

/**
 * Faint progress dots arranged as a crown above the disc (`filled` of `total`
 * lit) - the daily-questions flow's gentle, non-numeric "where am I" hint.
 * Rendered as a child of the disc, so it rides the disc's scale and the ring
 * stays just outside the edge at any size. (Moved out of Sun.tsx unchanged.)
 */
export const SunOrbitCrown: Component<{
  orbit?: Orbit | null;
  discSize: number;
}> = (props) => {
  // Keep the progress crown mounted through one soft fade when the flow clears
  // it (the success bloom), so the dots dissolve rather than snapping out - a
  // hard cut reads as a jolt (see the styling rules). We hold the last orbit
  // value for the duration of the fade, then unmount.
  const ORBIT_FADE_MS = 600;
  const [getOrbitLeaving, setOrbitLeaving] = createSignal(false);
  let lastOrbit: Orbit | null = null;
  let orbitLeaveT: ReturnType<typeof setTimeout> | undefined;
  createEffect(() => {
    const o = props.orbit;
    if (o && o.total > 0) {
      lastOrbit = o;
      clearTimeout(orbitLeaveT);
      setOrbitLeaving(false);
    } else if (lastOrbit) {
      clearTimeout(orbitLeaveT);
      setOrbitLeaving(true);
      orbitLeaveT = setTimeout(() => {
        setOrbitLeaving(false);
        lastOrbit = null;
      }, ORBIT_FADE_MS);
    }
  });
  onCleanup(() => clearTimeout(orbitLeaveT));
  // The crown to draw: the live orbit, or the held last value while it fades out.
  const orbitToRender = (): Orbit | null =>
    props.orbit && props.orbit.total > 0
      ? props.orbit
      : getOrbitLeaving()
        ? lastOrbit
        : null;

  return (
    <Show when={orbitToRender()}>
      {(orbit) => (
        // A faint crown of dots spread across the top arc (avoiding the bottom,
        // where the disc rests on the bar).
        <div
          class="sun-orbit"
          classList={{ "is-leaving": getOrbitLeaving() }}
          aria-hidden="true"
        >
          <Index each={Array.from({ length: orbit().total })}>
            {(_, i) => {
              const total = orbit().total;
              // A fixed gap between adjacent dots, centred on straight-up, so the
              // crown stays a tidy shallow arc over the top of the disc for any
              // count. (A fixed *total* span splayed the few dots we ever show -
              // 2 or 3 - out to the sides at ±60°, reading as scattered rather
              // than a crown.) At 26° apart, 3 dots span just ±26° and sit high
              // above the cap.
              const gapDeg = 26;
              const angle = (i - (total - 1) / 2) * gapDeg;
              // +24 is pre-scale local px: the crown rides the disc's transform
              // (companion scale ~0.52), so this lands ~10px of on-screen
              // clearance beyond the disc edge at every breakpoint.
              const radius = props.discSize / 2 + 24;
              return (
                <div
                  class="sun-orbit-dot"
                  classList={{ filled: i < orbit().filled }}
                  style={{
                    transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-${radius}px)`,
                  }}
                />
              );
            }}
          </Index>
        </div>
      )}
    </Show>
  );
};
