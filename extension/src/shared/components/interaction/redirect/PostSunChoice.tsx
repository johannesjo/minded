/* @refresh reload */
import {
  Component,
  createSignal,
  Match,
  onCleanup,
  Switch,
  untrack,
} from "solid-js";
import {
  markAlternativeOpened,
  markAlternativeShown,
} from "@src/dataInterface/commonSyncDataInterface";
import type { SyncData } from "@src/dataInterface/syncData";
import type { InteractionMode } from "@src/shared/components/interaction/getInteractionMode";
import {
  ALTERNATIVE_ACCEPT_BEAT,
  ALTERNATIVE_ACCEPT_BEAT_MS,
  ALTERNATIVE_SCREEN_FADE_MS,
  getAlternativeAcceptLabel,
} from "@src/shared/components/interaction/alternatives/alternativeRedirect";
import { getAlternativeCandidate } from "@src/shared/components/interaction/alternatives/getAlternativeCandidate";
import { getAlternativesForTarget } from "@src/shared/components/interaction/alternatives/getAlternatives";
import {
  getAlternativeOpenCapabilities,
  getAlternativePlatform,
  openAlternativeTarget,
} from "@src/shared/components/interaction/alternatives/openAlternative";
import {
  getPostSunRedirect,
  LEAVE_BEAT,
  LEAVE_LABEL,
  LEAVE_QUESTION,
  type PostSunRedirect,
  STAY_LABEL,
} from "@src/shared/components/interaction/redirect/postSunRedirect";
import { TimeSelection } from "@src/shared/components/interaction/timeSelection/TimeSelection";
import { VoiceReveal } from "@src/shared/components/interaction/voiceReveal/VoiceReveal";
import {
  VOICE_REVEAL,
  voiceFollowStyle,
} from "@src/shared/components/interaction/voiceReveal/voiceRevealTiming";
import Btn from "@src/shared/components/ui/Btn";
import { prefersReducedMotion } from "@src/util/prefersReducedMotion";
import { createScreenFade } from "@src/util/screenFade";

type Screen = "lead" | "time" | "beat";

const pickRedirect = (
  mode: InteractionMode | undefined,
  hasCompleted: boolean,
  syncData: SyncData | undefined,
): PostSunRedirect =>
  getPostSunRedirect({
    mode,
    hasCompleted,
    alternative: syncData
      ? getAlternativeCandidate(
          getAlternativesForTarget(
            syncData,
            undefined,
            getAlternativePlatform(),
          ),
        )
      : undefined,
    capabilities: getAlternativeOpenCapabilities(),
  });

/**
 * The post-sun choice (#163): the redirect leg after the reflection. Staying
 * (the unchanged time choice) and leaving are both always here; what the user
 * just reflected on only picks which one leads (postSunRedirect.ts).
 *
 * - Stay leads: the time choice shows straight away, with "Let go" beneath it.
 * - Leave / an alternative leads: that one choice, with a quiet "Stay" that
 *   crossfades to the time choice. No extra step for anyone else.
 *
 * Leaving ends on a short serif beat, then the platform's plain leave (the
 * fling's own path) - or, for an alternative, opens it like ShowAlternative.
 * Every screen keeps the resting sun's spacer, so the one sun stays beneath
 * the words and only glides when the layout moves.
 */
export const PostSunChoice: Component<{
  mode: InteractionMode | undefined;
  hasCompleted: boolean;
  syncData: SyncData | undefined;
  isArmed: boolean;
  onSelectTime: (seconds: number) => void;
  onCancel: () => void;
  /** Leave; `open` tries an alternative first and falls back when it can't. */
  onLeave: (open?: () => boolean) => void;
  /** The layout under the resting sun moved: re-measure its slot. */
  onReflow: () => void;
}> = (props) => {
  const redirect = untrack(() =>
    pickRedirect(props.mode, props.hasCompleted, props.syncData),
  );
  const [getScreen, setScreen] = createSignal<Screen>(
    redirect.lead === "stay" ? "time" : "lead",
  );
  const [getBeat, setBeat] = createSignal("");
  const screenFade = createScreenFade(ALTERNATIVE_SCREEN_FADE_MS);
  let beatTimeout: number | undefined;
  let isLeaving = false;
  let isDisposed = false;
  onCleanup(() => {
    isDisposed = true;
    window.clearTimeout(beatTimeout);
  });

  const shownPromise =
    redirect.lead === "alternative"
      ? markAlternativeShown(redirect.alternative).catch((error) =>
          console.error("Failed to mark alternative shown", error),
        )
      : undefined;

  const toScreen = (screen: Screen, onShown?: () => void) =>
    screenFade.toScreen(() => {
      setScreen(screen);
      requestAnimationFrame(() => !isDisposed && props.onReflow());
      onShown?.();
    });

  // Fade to the calm beat, rest on it, then go. `ready` is awaited so a stat
  // write never races the tab or app being closed under it.
  const leaveWithBeat = (
    beat: string,
    ready: Promise<unknown>,
    open?: () => boolean,
  ) => {
    if (isLeaving || !props.isArmed) return;
    isLeaving = true;
    const onLeave = props.onLeave;
    setBeat(beat);
    toScreen("beat", () => {
      beatTimeout = window.setTimeout(() => {
        beatTimeout = undefined;
        void ready.then(() => !isDisposed && onLeave(open));
      }, ALTERNATIVE_ACCEPT_BEAT_MS);
    });
  };

  const leave = () => leaveWithBeat(LEAVE_BEAT, Promise.resolve());

  const acceptAlternative = () => {
    if (redirect.lead !== "alternative") return;
    const { alternative, target } = redirect;
    // Counted as an opened alternative only - no sun tap: like every leave,
    // stepping out to the better thing must not raise the next friction.
    const marked = (async () => {
      await shownPromise;
      await markAlternativeOpened(alternative).catch((error) =>
        console.error("Failed to mark alternative opened", error),
      );
    })();
    leaveWithBeat(
      ALTERNATIVE_ACCEPT_BEAT,
      marked,
      target ? () => openAlternativeTarget(target) : undefined,
    );
  };

  const stay = () => {
    if (!props.isArmed || screenFade.isFading()) return;
    toScreen("time");
  };

  const leadQuestion =
    redirect.lead === "alternative"
      ? `Try ${redirect.alternative.label} instead?`
      : LEAVE_QUESTION;

  return (
    <div
      class="post-sun-choice"
      style={{
        opacity: screenFade.opacity(),
        "pointer-events": screenFade.isFading() ? "none" : undefined,
        transition: prefersReducedMotion()
          ? "none"
          : `opacity ${ALTERNATIVE_SCREEN_FADE_MS}ms ease-in-out`,
      }}
    >
      <Switch>
        <Match when={getScreen() === "time"}>
          <TimeSelection
            isArmed={props.isArmed}
            onSelectTime={props.onSelectTime}
            onCancel={props.onCancel}
            onLeave={leave}
          />
        </Match>
        <Match when={getScreen() === "lead"}>
          <div
            class="time-selection-wrapper voice-follow-scope"
            style={voiceFollowStyle(
              leadQuestion,
              VOICE_REVEAL.SUN_GLIDE_LEAD_MS,
            )}
          >
            <div
              class="time-selection-container"
              classList={{ "is-arming": !props.isArmed }}
            >
              <VoiceReveal
                class="txtBig"
                text={leadQuestion}
                lead={VOICE_REVEAL.SUN_GLIDE_LEAD_MS}
              />
              <div class="post-sun-choice-actions voice-follow">
                <Btn
                  disabled={!props.isArmed}
                  onClick={
                    redirect.lead === "alternative" ? acceptAlternative : leave
                  }
                >
                  {redirect.lead === "alternative"
                    ? getAlternativeAcceptLabel(
                        redirect.alternative,
                        redirect.target,
                      )
                    : LEAVE_LABEL}
                </Btn>
                <Btn plain disabled={!props.isArmed} onClick={stay}>
                  {STAY_LABEL}
                </Btn>
              </div>
              <div class="resting-sun-spacer" aria-hidden="true" />
            </div>
            <div class="time-selection-cancel voice-follow">
              <Btn soft onClick={props.onCancel}>
                cancel
              </Btn>
            </div>
          </div>
        </Match>
        <Match when={getScreen() === "beat"}>
          <div class="time-selection-wrapper">
            <div class="time-selection-container">
              <VoiceReveal class="txtBig" text={getBeat()} />
              <div class="resting-sun-spacer" aria-hidden="true" />
            </div>
          </div>
        </Match>
      </Switch>
    </div>
  );
};
