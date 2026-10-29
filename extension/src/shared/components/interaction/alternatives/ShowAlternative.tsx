/* @refresh reload */
import {
  createEffect,
  createMemo,
  createSignal,
  JSX,
  onCleanup,
  Show,
} from "solid-js";
import {
  IS_ANDROID,
  IS_APP,
  IS_WEB_EXT,
  IS_IOS,
  markAlternativeOpened,
  markAlternativeOpenedAndCountSunTap,
  markAlternativeShown,
} from "@src/dataInterface/commonSyncDataInterface";
import type {
  Alternative,
  SessionPlatform,
  SyncData,
} from "@src/dataInterface/syncData";
import { androidInterface } from "@src/dataInterface/android/androidInterface";
import { getAlternativesForTarget } from "@src/shared/components/interaction/alternatives/getAlternatives";
import { getAlternativeCandidate } from "@src/shared/components/interaction/alternatives/getAlternativeCandidate";
import {
  ALTERNATIVE_ACCEPT_BEAT,
  ALTERNATIVE_ACCEPT_BEAT_MS,
  ALTERNATIVE_SCREEN_FADE_MS,
  type AlternativeOpenTarget,
  getAlternativeAcceptLabel,
  getAlternativeOpenTarget,
} from "@src/shared/components/interaction/alternatives/alternativeRedirect";
import { VoiceReveal } from "@src/shared/components/interaction/voiceReveal/VoiceReveal";
import Btn from "@src/shared/components/ui/Btn";
import { createScreenFade } from "@src/util/screenFade";
import { prefersReducedMotion } from "@src/util/prefersReducedMotion";

export const ShowAlternativeInteraction: (props: {
  onAddBetterAlternative?: (alternative: Alternative) => void;
  onCancelCountdown: () => void;
  onLeaveNow: () => void;
  /** The sun took over during the beat (tap, fling, drag): stand down. */
  isSuperseded: () => boolean;
  syncData: SyncData;
}) => JSX.Element = (props) => {
  const [getAlternative, setAlternative] = createSignal<
    Alternative | undefined
  >();
  const [getIsAccepted, setIsAccepted] = createSignal(false);
  const [getIsBeatShown, setIsBeatShown] = createSignal(false);
  const screenFade = createScreenFade(ALTERNATIVE_SCREEN_FADE_MS);
  let beatTimeout: number | undefined;
  let isDisposed = false;
  let shownAlternativeId: string | undefined;
  let shownAlternativePromise: Promise<void> | undefined;

  onCleanup(() => {
    isDisposed = true;
    window.clearTimeout(beatTimeout);
  });

  const getPlatform = (): SessionPlatform =>
    IS_APP ? (IS_IOS ? "ios" : "android") : "web";

  const markCandidateShown = (candidate: Alternative | undefined) => {
    if (candidate && shownAlternativeId !== candidate.id) {
      shownAlternativeId = candidate.id;
      shownAlternativePromise = markAlternativeShown(candidate).catch(
        (error) => {
          console.error("Failed to mark alternative shown", error);
        },
      );
      void shownAlternativePromise;
    }
  };

  createEffect(() => {
    // Keep the candidate stable if the shown-stat write refreshes sync data.
    if (getAlternative()) {
      return;
    }

    const candidate = getAlternativeCandidate(
      getAlternativesForTarget(props.syncData, undefined, getPlatform()),
    );
    setAlternative(candidate);
    markCandidateShown(candidate);
  });

  const getOpenTarget = createMemo(() => {
    const alternative = getAlternative();
    return alternative
      ? getAlternativeOpenTarget(alternative, {
          canOpenUrl: IS_WEB_EXT,
          canOpenApp: IS_ANDROID && !!androidInterface.openAppNamed,
        })
      : undefined;
  });

  // Hand over to the alternative. False when nothing opened, so the caller
  // falls back to the plain leave rather than stranding the user.
  const openTarget = (target: AlternativeOpenTarget): boolean => {
    if (target.kind === "url") {
      // The redirect takes over this tab. The sky stays up until the page
      // unloads - fading it first would bare the very feed being left (and a
      // back-navigation would restore an invisible, click-eating overlay).
      window.location.href = target.href;
      return true;
    }

    try {
      // Native resolves and launches the app, then fades its window out.
      return androidInterface.openAppNamed?.(target.label) === true;
    } catch (error) {
      console.error("Failed to open alternative", error);
      return false;
    }
  };

  // The accept: a quiet "Enjoy." beat, then the redirect itself - the named
  // site/app when we can open it, otherwise the plain leave, which releases the
  // user to go do it instead of routing them on to the self-set timer.
  const onAccept = () => {
    const alternative = getAlternative();
    if (!alternative || getIsAccepted()) {
      return;
    }

    props.onCancelCountdown();
    setIsAccepted(true);
    const target = getOpenTarget();
    const onLeaveNow = props.onLeaveNow;
    const isSuperseded = props.isSuperseded;
    const marked = (async () => {
      try {
        await shownAlternativePromise;
        // Opening is taking the pause up (a sun tap, as the old link counted);
        // "Yes" to an activity is a leave, and no leave counts a tap.
        await (target
          ? markAlternativeOpenedAndCountSunTap(alternative)
          : markAlternativeOpened(alternative));
      } catch (error) {
        console.error("Failed to mark alternative opened", error);
      }
    })();

    screenFade.toScreen(() => {
      setIsBeatShown(true);
      beatTimeout = window.setTimeout(() => {
        beatTimeout = undefined;
        void marked.then(() => {
          // A sun tap/fling during the beat already chose the next step.
          if (isDisposed || isSuperseded()) return;
          if (!target || !openTarget(target)) onLeaveNow();
        });
      }, ALTERNATIVE_ACCEPT_BEAT_MS);
    });
  };

  const onAddBetterAlternative = async () => {
    const alternative = getAlternative();
    if (!alternative || getIsAccepted()) {
      return;
    }

    props.onCancelCountdown();
    await shownAlternativePromise;
    props.onAddBetterAlternative?.(alternative);
  };

  return (
    <>
      <Show when={getAlternative()}>
        {(alternative) => (
          <div
            style={{
              opacity: screenFade.opacity(),
              "pointer-events":
                screenFade.isFading() || getIsAccepted() ? "none" : undefined,
              transition: prefersReducedMotion()
                ? "none"
                : `opacity ${ALTERNATIVE_SCREEN_FADE_MS}ms ease-in-out`,
            }}
            onmouseenter={props.onCancelCountdown}
          >
            <Show
              when={!getIsBeatShown()}
              fallback={
                <VoiceReveal
                  class="txtBig interaction-heading"
                  text={ALTERNATIVE_ACCEPT_BEAT}
                />
              }
            >
              <div class="txtBig interaction-heading">
                Try <strong>{alternative().label}</strong> instead?
              </div>
              <div class="show-alternative-actions">
                <Btn onClick={onAccept}>
                  {getAlternativeAcceptLabel(alternative(), getOpenTarget())}
                </Btn>
                {props.onAddBetterAlternative && (
                  <Btn plain onClick={() => void onAddBetterAlternative()}>
                    Suggest a different one
                  </Btn>
                )}
              </div>
            </Show>
          </div>
        )}
      </Show>
    </>
  );
};
