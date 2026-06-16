import { Component } from "solid-js";
import styles from "./CompanionSun.module.scss";

export interface CompanionHome {
  /** Horizontal center as a CSS length/expression, e.g. "50vw". */
  centerX: string;
  /** Vertical center as a CSS length/expression, e.g. "16vh". */
  centerY: string;
  /** Scale relative to the base companion size. */
  scale: number;
}

interface CompanionSunProps {
  /** Where the sun rests. It glides here whenever the value changes. */
  home: CompanionHome;
  /** Faded out when another flow needs to fully own the sun. */
  visible: boolean;
  variant: "sun" | "moon";
  /** The persistent sun is the global "get asked a question" trigger. */
  onTap: () => void;
  /** Disabled while the sun is being used as a visual handoff/anchor. */
  interactive: boolean;
}

/**
 * The sun as a constant companion: one persistent, drag-free sun that lives in
 * the app shell and glides between "homes" (a hero greeting on the dashboard,
 * a compact top-bar companion on every other page) as the route changes.
 * Tapping it opens the question flow — it replaces the old bottom-bar trigger
 * and is now reachable from any page. It reuses the global `.minded-sun` visual
 * (glow + idle breath) so it reads as the very same sun that powers the
 * interaction.
 */
export const CompanionSun: Component<CompanionSunProps> = (props) => {
  return (
    <button
      type="button"
      class={styles.companionSun}
      classList={{
        [styles.isHidden]: !props.visible,
        [styles.isStatic]: props.visible && !props.interactive,
      }}
      style={{
        "--c-x": props.home.centerX,
        "--c-y": props.home.centerY,
        "--c-scale": props.home.scale,
      }}
      aria-label="Get asked a question"
      aria-hidden={!props.visible || !props.interactive}
      tabindex={props.visible && props.interactive ? 0 : -1}
      onClick={() => {
        if (props.interactive) props.onTap();
      }}
    >
      <span class="minded-sun" classList={{ moon: props.variant === "moon" }} />
    </button>
  );
};
