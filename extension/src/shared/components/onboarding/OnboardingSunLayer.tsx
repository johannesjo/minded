import { createEffect, JSX, Show } from "solid-js";
import Sun, { SunSettle } from "@src/shared/components/interaction/sun/Sun";
import {
  getIsShellSunHidden,
  getSunFocusRequest,
  getSunHandlers,
  requestSunFocus,
  setBreathStartedAt,
} from "@src/shared/components/interaction/sun/sunStore";
import InteractionOverlay from "@src/shared/components/dashboard/interactionOverlay/InteractionOverlay";
import { SUN_TAP_THRESHOLD } from "@src/shared/components/interaction/sunHints";
import { createOnboardingSunDemo } from "./createOnboardingSunDemo";
import { ONBOARDING_DEMO_LINE } from "./onboardingDemoLine";
import styles from "./onboardingSunLayer.module.scss";

/**
 * The ONE onboarding sun and its welcome demo (tap-to-pause, or the
 * intervention's two outcomes where it is the only sun - see welcomeGesture) - shared by every
 * platform's onboarding. It owns the shared takeover state machine
 * (createOnboardingSunDemo), so the whole thing lives in one place; each flow
 * supplies only its step/leaving signals, its base settle rests, and how to
 * advance off the welcome.
 *
 * Mirrors the dashboard shell's fixed sun layer: the flow never mounts a
 * per-step disc; this single element morphs between the flow's rests and,
 * during the welcome demo, is driven by the shared sunStore exactly like the
 * shell sun (roles, anchors, handlers) - same disc, morphing, never a second
 * one. It mounts only once its first rest is measured, snapping straight into
 * place (never a centre-flash), softened by the layer's fade-in.
 */
export const OnboardingSunLayer = (props: {
  getStep: () => number;
  getIsLeaving: () => boolean;
  getBaseSettle: () => SunSettle | null;
  advanceFromWelcome: () => void;
  onPauseExperienced?: () => void;
  onPauseVisibilityChange?: (isOpen: boolean) => void;
  /**
   * What the welcome disc teaches. "tap" (default) opens the real pause - the
   * companion sun's own gesture. "intervention" teaches the intervention's two
   * outcomes instead, for platforms whose only sun is the intervention (there,
   * a tap-to-pause demo rehearses something the user never meets again): drag
   * down or fling away lets go (advanceFromWelcome), SUN_TAP_THRESHOLD taps or
   * Enter continue (onWelcomeContinue) - Enter matches the real intervention.
   */
  welcomeGesture?: "tap" | "intervention";
  onWelcomeContinue?: () => void;
  /** While true the welcome disc rests without input (its practice is open). */
  getIsWelcomeHeld?: () => boolean;
}): JSX.Element => {
  const d = createOnboardingSunDemo(props);
  const isInterventionWelcome = () => props.welcomeGesture === "intervention";
  const continueFromWelcome = () => {
    if (d.isSunGrabbable()) props.onWelcomeContinue?.();
  };
  createEffect(() => props.onPauseVisibilityChange?.(d.getIsShowPause()));

  const openPauseWithFocus = () => {
    d.openPause();
    requestSunFocus();
  };

  return (
    <>
      <div
        class={styles.sunLayer}
        classList={{
          [styles.isInteractive]: d.isSunInputEnabled(),
          // A pause surface that replaces the sun (the let-go question, a
          // screen-free grounding sit) hides the layer, exactly as on the shell.
          [styles.isHidden]: getIsShellSunHidden() === true,
          [styles.isHiddenSoft]: getIsShellSunHidden() === "soft",
        }}
      >
        <Show when={d.getHasSunMounted()}>
          <Sun
            variant={d.sunVariant}
            settle={d.getActiveSunSettle()}
            aria-label={
              d.isSunGrabbable()
                ? isInterventionWelcome()
                  ? `Continue with the ${d.sunVariant}`
                  : "Open a mindful pause"
                : d.isSunInputEnabled()
                  ? getSunHandlers()?.getAccessibleLabel?.()
                  : undefined
            }
            aria-description={
              d.isPauseDrivingSun() && d.isSunInputEnabled()
                ? getSunHandlers()?.getAccessibleDescription?.()
                : d.isSunGrabbable() && isInterventionWelcome()
                  ? `Press Enter to continue, or drag the ${d.sunVariant} down to let go.`
                  : undefined
            }
            aria-keyshortcuts={
              d.isPauseDrivingSun() && d.isSunInputEnabled()
                ? getSunHandlers()?.getAccessibleKeyShortcuts?.()
                : undefined
            }
            onKeyboardActivate={
              d.isPauseDrivingSun()
                ? (activation) =>
                    getSunHandlers()?.onKeyboardActivate?.(activation)
                : isInterventionWelcome()
                  ? continueFromWelcome
                  : openPauseWithFocus
            }
            onAccessibleActionEnabledChange={(enabled) =>
              getSunHandlers()?.onAccessibleActionEnabledChange?.(enabled)
            }
            focusRequest={getSunFocusRequest()}
            minimizeWillChange={true}
            isTapEnabled={
              d.isPauseDrivingSun()
                ? d.isSunInputEnabled() &&
                  (getSunHandlers()?.isTapEnabled ?? true)
                : d.isSunGrabbable()
            }
            isDragEnabled={d.isSunInputEnabled()}
            // Welcome: a single tap is the invitation into the pause (the
            // intervention welcome counts like the real intervention). Mid-pause
            // the tap threshold belongs to the interaction (though the
            // dashboard-style pause disables tap-continue anyway).
            tapThreshold={
              d.isPauseDrivingSun()
                ? (getSunHandlers()?.tapThreshold ?? SUN_TAP_THRESHOLD)
                : isInterventionWelcome()
                  ? SUN_TAP_THRESHOLD
                  : 1
            }
            onSkip={() =>
              d.isPauseDrivingSun()
                ? getSunHandlers()?.onSkip()
                : isInterventionWelcome()
                  ? continueFromWelcome()
                  : d.openPause()
            }
            onFlingAway={() =>
              d.isPauseDrivingSun()
                ? getSunHandlers()?.onFlingAway()
                : d.advanceFromHero()
            }
            onDragComplete={() =>
              d.isPauseDrivingSun()
                ? getSunHandlers()?.onDragComplete()
                : d.advanceFromHero()
            }
            onStartBackgroundAnimation={(dur) =>
              d.isPauseDrivingSun()
                ? getSunHandlers()?.onStartBackgroundAnimation?.(dur)
                : undefined
            }
            onFlungOffscreen={() =>
              d.isPauseDrivingSun()
                ? getSunHandlers()?.onFlungOffscreen?.()
                : undefined
            }
            onCompletionStarted={(started) =>
              d.isPauseDrivingSun()
                ? getSunHandlers()?.onCompletionStarted?.(started)
                : started && d.advanceFromHero()
            }
            onBreathStart={setBreathStartedAt}
          />
        </Show>
      </div>

      {/*
        The welcome demo: the real interaction overlay (sky z-20, under the sun
        layer's z-30, exactly like the dashboard). Its closing fade hands the
        disc back first (onClosingStarted), so the sun glides home to the flow's
        rest while the sky fades - one motion, never a companion detour.
      */}
      {d.getIsShowPause() && (
        <InteractionOverlay
          widgetLine={ONBOARDING_DEMO_LINE}
          onClosingStarted={d.onPauseClosing}
          onHideInteraction={() => {
            d.onPauseClosed();
            requestSunFocus();
          }}
        />
      )}
    </>
  );
};
