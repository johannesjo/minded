import type { SunPhase } from "./sunSettle";

export type InteractiveSunAccessibleAction = "continue" | "stay";
export type SunAccessibleActivation = "primary" | "up" | "down";

export interface InteractiveSunAccessibility {
  label: string;
  action: InteractiveSunAccessibleAction;
  alternativeAction?: {
    label: string;
    activation: "up";
  };
  description?: string;
  keyShortcuts?: string;
}

/**
 * A delayed focus handoff remains valid only while focus has not moved into a
 * different live control. An inert descendant is accepted because its surface
 * has just yielded to the sun and can no longer retain meaningful focus.
 */
export const shouldHonorSunFocusRequest = (
  activeElement: Element | null,
  sunElement: Element,
): boolean =>
  !activeElement ||
  activeElement === sunElement ||
  activeElement.getAttribute("role") === "dialog" ||
  activeElement.closest("[inert]") !== null;

export const getSunKeyboardActivation = (
  key: string,
  supportsDirectionalRituals: boolean,
): SunAccessibleActivation | undefined => {
  if (key === "Enter" || key === " ") return "primary";
  if (!supportsDirectionalRituals) return undefined;
  if (key === "ArrowUp") return "up";
  if (key === "ArrowDown") return "down";
  return undefined;
};

/**
 * Give the gesture-driven sun one clear keyboard equivalent while it is live.
 * The resting/breathing phases are presence rather than controls, so they stay
 * out of the tab order. On the dashboard, Enter chooses the gentler of its two
 * directional rituals ("stay a while"); elsewhere it performs the same
 * continue/escape outcome as tapping, without asking a keyboard user to repeat
 * a key several times.
 */
export const getInteractiveSunAccessibility = (state: {
  phase: SunPhase;
  variant: "sun" | "moon";
  isFromDashboard: boolean;
  isWindDown: boolean;
  isInputEnabled: boolean;
}): InteractiveSunAccessibility | undefined => {
  if (state.phase !== "interactive" || !state.isInputEnabled) return undefined;

  if (state.isFromDashboard) {
    return {
      label: `Stay a while with the ${state.variant}`,
      action: "stay",
      alternativeAction: {
        label: `Let go with the ${state.variant}`,
        activation: "up",
      },
      description:
        "Press Enter or Arrow Down to stay a while. Press Arrow Up to let go.",
      keyShortcuts: "Enter Space ArrowDown ArrowUp",
    };
  }

  return {
    label: state.isWindDown
      ? "Continue without winding down"
      : `Continue with the ${state.variant}`,
    action: "continue",
  };
};
