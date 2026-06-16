import { Component } from "solid-js";
import styles from "./CompanionSun.module.scss";

interface CompanionSunProps {
  /** Hidden (and non-interactive) while another flow owns the sun. */
  visible: boolean;
  variant: "sun" | "moon";
  /** The persistent sun is the global "get asked a question" trigger. */
  onTap: () => void;
}

/**
 * The sun as a constant companion: one persistent, drag-free sun that lives in
 * the app shell and rests in the same compact top-bar spot on every page (it
 * replaces the old bottom-bar trigger and is reachable from anywhere). Tapping
 * it opens the question flow. It reuses the global `.minded-sun` visual (glow +
 * idle breath) so it reads as the very same sun that powers the interaction.
 */
export const CompanionSun: Component<CompanionSunProps> = (props) => {
  return (
    <button
      type="button"
      class={styles.companionSun}
      classList={{ [styles.isHidden]: !props.visible }}
      aria-label="Get asked a question"
      aria-hidden={!props.visible}
      tabindex={props.visible ? 0 : -1}
      onClick={() => props.onTap()}
    >
      <span class="minded-sun" classList={{ moon: props.variant === "moon" }} />
    </button>
  );
};
