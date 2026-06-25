/* @refresh reload */
import { createSignal, JSX, onCleanup, onMount, Switch, Match } from "solid-js";
import { fadeOut } from "@src/util/animation";
import { stopAllVideos } from "@src/util/stopAllVideos";
import { LittleSunComponent } from "@src/shared/components/interaction/LittleSun";
import InteractionCommon from "@src/shared/components/interaction/InteractionCommon";
import { closeTab } from "@src/dataInterface/extension/extensionApi";
import { QuestionForPrompt } from "@src/shared/data/questions";
import { isDarkModeNow } from "@src/shared/addWrapperClasses";
import { updateHostsEntry } from "@dataInterface/localDataInterface";
import {
  updateSyncData,
  countSunTap,
} from "@src/dataInterface/commonSyncDataInterface";
import { ActiveTimer, SessionIntent } from "@src/dataInterface/syncData";
import { createActiveTimer } from "@src/shared/components/interaction/sessionLimit";
import { prefersReducedMotion } from "@src/util/prefersReducedMotion";

// NOTE: val also needs to be set in css

export const InteractionWeb: (props: {
  host: string;
  onHideAll: () => void;
  shadowRoot?: ShadowRoot;
  /**
   * The page opened straight into a Little Sun (an active session was already
   * running), and its timer has now run out — so this first intervention should
   * arrive by morphing out of the Little Sun's corner rather than appearing fresh.
   * Re-shows that happen *within* this component (a session set here, then its
   * timer expiring) drive the same morph via the internal signal below.
   */
  morphInFromCorner?: boolean;
}) => JSX.Element = (props) => {
  const [getQuestion, setQuestion] = createSignal<QuestionForPrompt>();

  const [getIsShowLittleSun, setIsShowLittleSun] = createSignal(false);
  // Whether the next full intervention should glide in from the Little Sun corner
  // (the reverse of the departing hand-off). Seeded from the prop for the very
  // first intervention; set true whenever a Little Sun shown *here* hands back to
  // the intervention because its timer ran out. Once any Little Sun has appeared,
  // every re-show is a morph-in — only a first intervention with no prior timer
  // (prop false) simply appears.
  const [getMorphInFromCorner, setMorphInFromCorner] = createSignal(
    !!props.morphInFromCorner,
  );

  // Whether *this* showing should actually run the morph: only when the flag is
  // set and the glide can be seen and is wanted (kept in step with
  // InteractionCommon's own guard so the sky fade and the sun glide agree).
  const canMorphIn = () =>
    getMorphInFromCorner() &&
    !prefersReducedMotion() &&
    (typeof document === "undefined" || !document.hidden);

  // When morphing in, the sun must stay fully opaque (so it reads as the same disc
  // gliding out of the corner), so the surface is rendered WITHOUT the .aniIn fade
  // and instead the sky alone fades in via the wrapper's `is-arriving` class — the
  // mirror of the departing hand-off (is-departing fades only the sky out). This
  // signal carries that class for the ~1s the sky fade plays, then drops it.
  const SKY_ARRIVE_MS = 1050;
  // Seeded so the very first paint already carries the class (the first showing
  // can be a morph straight from an expired Little Sun); onMount arms the timeout.
  const [getIsSkyArriving, setIsSkyArriving] = createSignal(canMorphIn());
  let skyArriveTimeout: number | undefined;
  const beginSkyArriving = (on: boolean) => {
    window.clearTimeout(skyArriveTimeout);
    setIsSkyArriving(on);
    if (on) {
      skyArriveTimeout = window.setTimeout(
        () => setIsSkyArriving(false),
        SKY_ARRIVE_MS,
      );
    }
  };

  let wrapperEl: HTMLDivElement = undefined!;
  let isDismissing = false;
  const stopVideoTimeouts: number[] = [];

  // Seed the sky fade for the very first showing (it came straight from a Little
  // Sun whose timer expired); later re-shows arm it from onShowFreshInteraction.
  onMount(() => {
    if (canMorphIn()) beginSkyArriving(true);
  });
  onCleanup(() => window.clearTimeout(skyArriveTimeout));

  onMount(() => {
    // Stop videos multiple times to catch delayed autoplay
    stopVideoTimeouts.push(
      window.setTimeout(() => stopAllVideos(), 1000),
      window.setTimeout(() => stopAllVideos(), 2000),
      window.setTimeout(() => stopAllVideos(), 5000),
    );

    // NOTE: Session checks (activeTimer, sessionEndTS) are intentionally NOT done here.
    // content-script.tsx and isShowFullMinder() already determine whether to show
    // InteractionWeb vs LittleSun before rendering. Re-checking here with async data
    // loads creates a race condition where the state can toggle and cause the
    // intervention to show twice.
  });

  const escapeHandler: EventListener = (ev) => {
    const keyboardEvent = ev as KeyboardEvent;

    if (keyboardEvent.key === "Escape") {
      ev.stopPropagation();
      ev.preventDefault();
      if (isDismissing) return;

      isDismissing = true;
      if (wrapperEl) {
        fadeOut(wrapperEl, 150).promise.then(() => teardown());
      } else {
        teardown();
      }
    }
  };

  const shadowKeyboardEventTarget = props.shadowRoot;

  onMount(() => {
    // Capture on document so Escape also works while focus is still on the host page.
    document.addEventListener("keydown", escapeHandler, true);
    shadowKeyboardEventTarget?.addEventListener("keydown", escapeHandler);
  });

  onCleanup(() => {
    stopVideoTimeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
    document.removeEventListener("keydown", escapeHandler, true);
    shadowKeyboardEventTarget?.removeEventListener("keydown", escapeHandler);
  });

  const teardown = () => {
    document.removeEventListener("keydown", escapeHandler, true);
    shadowKeyboardEventTarget?.removeEventListener("keydown", escapeHandler);
    props.onHideAll();
  };

  const setSessionLimit = async (seconds: number, intent?: SessionIntent) => {
    const now = Date.now();
    const isRestOfDay = seconds < 0;
    const activeTimer: ActiveTimer = createActiveTimer({
      seconds,
      now,
      target: { kind: "host", id: props.host },
      platform: "web",
      intent,
    });

    await updateSyncData({ activeTimer });

    await updateHostsEntry(props.host, {
      lastUsedTS: now,
      sessionDurationInS: 0,
    });

    // Ensure we tear down any stale question state
    setQuestion(undefined);
    stopAllVideos();

    if (isRestOfDay) {
      // Rest of day: hide everything completely
      teardown();
    } else {
      // Timed session: show little sun countdown
      setIsShowLittleSun(true);
    }
  };

  return (
    <>
      {/* Use Switch/Match for exclusive conditional rendering to prevent
          component recreation when unrelated signals change */}
      <Switch>
        <Match when={getIsShowLittleSun()}>
          <div class="aniIn" style={{ opacity: "1" }}>
            <LittleSunComponent
              host={props.host}
              teardown={teardown}
              onShowFreshInteraction={(morph) => {
                // Set the morph flag on every hand-back (true only when the timer
                // genuinely ran out), so it's always fresh for the next mount and
                // can't go stale into a later re-question/tap re-show.
                setMorphInFromCorner(morph);
                // Arm the sky fade-in BEFORE the Switch flips, so the re-mounted
                // wrapper carries `is-arriving` from its first paint.
                beginSkyArriving(canMorphIn());
                setIsShowLittleSun(false);
                setQuestion(undefined);
                stopAllVideos();
              }}
              onTap={() => closeTab()}
            />
          </div>
        </Match>
        <Match when={true}>
          {/* Morphing in keeps the sun fully opaque, so it is rendered WITHOUT
              the .aniIn surface fade; the sky alone fades in via `is-arriving`
              below. Every other showing keeps the normal .aniIn fade. */}
          <div class={canMorphIn() ? "" : "aniIn"}>
            <div
              id="minded-6622-coloured-wrapper-dynamic"
              classList={{
                "minded-6622-dark": isDarkModeNow(),
                "is-arriving": getIsSkyArriving(),
              }}
              style={{ opacity: "1" }}
              onclick={(ev) => {
                // Background click disabled - only gesture controls
                ev.stopPropagation();
              }}
              ref={(el) => {
                wrapperEl = el;
                // Reset inline styles when element is (re)created to ensure visibility
                // This fixes the issue where previous opacity manipulation persists
                if (el) {
                  el.style.opacity = "1";
                  el.style.transition = "";
                }
              }}
            >
              <InteractionCommon
                questionForPrompt={getQuestion()}
                isInitFadeout={false}
                wrapperEl={wrapperEl}
                shadowRoot={props.shadowRoot}
                interactionTarget={{ kind: "host", id: props.host }}
                interactionPlatform="web"
                morphInFromCorner={getMorphInFromCorner()}
                onSetAnswer={() => {}}
                onModeSet={() => {}}
                onAfterInteractionFadeout={() => {
                  setIsShowLittleSun(true);
                }}
                onSkip={async () => {
                  await countSunTap();
                  setIsShowLittleSun(true);
                }}
                onUpdateQuestion={(question) => {
                  setQuestion(question);
                }}
                onFlingAway={() => closeTab()}
                onDragComplete={() => closeTab()}
                onSetSessionLimit={setSessionLimit}
              />
            </div>
          </div>
        </Match>
      </Switch>
    </>
  );
};
