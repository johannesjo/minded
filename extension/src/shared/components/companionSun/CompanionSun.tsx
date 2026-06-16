import { Component } from "solid-js";
import styles from "./CompanionSun.module.scss";

export interface CompanionHome {
  /** Horizontal center as a fraction of viewport width (0 = left, 1 = right). */
  xRatio: number;
  /** Vertical center as a fraction of viewport height (0 = top, 1 = bottom). */
  yRatio: number;
  /** Scale relative to the base companion size. */
  scale: number;
}

interface CompanionSunProps {
  /** Where the sun rests. It glides here whenever the value changes. */
  home: CompanionHome;
  /** Faded out and non-interactive while the interaction owns the sun. */
  visible: boolean;
  variant: "sun" | "moon";
  /** The persistent sun is the global "get asked a question" trigger. */
  onTap: () => void;
  /** Fade in the "tap to ask" hint beneath the sun (its hero / dashboard home). */
  showLabel: boolean;
}

/**
 * The sun as a constant companion: one persistent, drag-free sun that lives in
 * the app shell and glides between "homes" (a hero greeting on the dashboard, a
 * small corner companion on every other page) as the route changes. Tapping it
 * opens the question flow — it replaces the old bottom-bar trigger and is now
 * reachable from any page. It reuses the global `.minded-sun` visual (glow +
 * idle breath) so it reads as the very same sun that powers the interaction.
 */
export const CompanionSun: Component<CompanionSunProps> = (props) => {
  return (
    <button
      type="button"
      class={styles.companionSun}
      classList={{ [styles.isHidden]: !props.visible }}
      style={{
        "--cx": props.home.xRatio,
        "--cy": props.home.yRatio,
        "--c-scale": props.home.scale,
      }}
      aria-label="Get asked a question"
      aria-hidden={!props.visible}
      tabindex={props.visible ? 0 : -1}
      onClick={() => props.onTap()}
    >
      <span class="minded-sun" classList={{ moon: props.variant === "moon" }} />
      <span
        class={styles.label}
        classList={{ [styles.labelVisible]: props.showLabel && props.visible }}
        aria-hidden="true"
      >
        tap to ask
      </span>
    </button>
  );
};
