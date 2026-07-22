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
import { createOnboardingSunDemo } from "./createOnboardingSunDemo";
import styles from "./onboardingSunLayer.module.scss";

/**
 * The ONE onboarding sun and its tap-to-pause demo overlay - shared by every
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
  onPauseVisibilityChange: (isOpen: boolean) => void;
}): JSX.Element => {
  const d = createOnboardingSunDemo(props);
  createEffect(() => props.onPauseVisibilityChange(d.getIsShowPause()));

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
                ? "Open a mindful pause"
                : d.isSunInputEnabled()
                  ? getSunHandlers()?.getAccessibleLabel?.()
                  : undefined
            }
            aria-description={
              d.isPauseDrivingSun() && d.isSunInputEnabled()
                ? getSunHandlers()?.getAccessibleDescription?.()
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
            // Welcome: a single tap is the invitation into the pause. Mid-pause
            // the tap threshold belongs to the interaction (though the
            // dashboard-style pause disables tap-continue anyway).
            tapThreshold={
              d.isPauseDrivingSun() ? (getSunHandlers()?.tapThreshold ?? 3) : 1
            }
            onSkip={() =>
              d.isPauseDrivingSun() ? getSunHandlers()?.onSkip() : d.openPause()
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
