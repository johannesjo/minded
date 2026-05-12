/* @refresh reload */
import { createEffect, createSignal, JSX } from "solid-js";
import {
  IS_APP,
  IS_IOS,
  markAlternativeDismissed,
  markAlternativeOpenedAndCountSunTap,
  markAlternativeShown,
} from "@src/dataInterface/commonSyncDataInterface";
import type {
  Alternative,
  SessionPlatform,
  SyncData,
} from "@src/dataInterface/syncData";
import { getAlternativeOpenUrl } from "@src/shared/components/interaction/alternatives/getAlternativeOpenUrl";
import { getAlternativesForTarget } from "@src/shared/components/interaction/alternatives/getAlternatives";
import {
  getAlternativeCandidate,
  getNextAlternativeCandidate,
} from "@src/shared/components/interaction/alternatives/getAlternativeCandidate";

// once on app load

export const ShowAlternativeInteraction: (props: {
  onSkip: () => void;
  onStayBriefly?: () => void;
  onAddBetterAlternative?: () => void;
  onCancelCountdown: () => void;
  syncData: SyncData;
}) => JSX.Element = (props) => {
  const [getAlternative, setAlternative] = createSignal<
    Alternative | undefined
  >();
  let shownAlternativeId: string | undefined;
  let shownAlternativePromise: Promise<void> | undefined;

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

  const onDismissAlternative = async () => {
    const alternative = getAlternative();
    if (!alternative) {
      return;
    }

    props.onCancelCountdown();
    await shownAlternativePromise;
    await markAlternativeDismissed(alternative);

    const nextAlternative = getNextAlternativeCandidate(
      getAlternativesForTarget(props.syncData, undefined, getPlatform()),
      alternative.id,
    );

    if (!nextAlternative) {
      props.onSkip();
      return;
    }

    setAlternative(nextAlternative);
    markCandidateShown(nextAlternative);
  };

  const onStayBriefly = async () => {
    props.onCancelCountdown();
    await shownAlternativePromise;
    props.onStayBriefly?.();
  };

  const onAddBetterAlternative = async () => {
    props.onCancelCountdown();
    await shownAlternativePromise;
    props.onAddBetterAlternative?.();
  };

  const onGoToUrl = async (event: MouseEvent) => {
    event.preventDefault();
    const alternative = getAlternative();
    const url = getOpenableUrl();
    if (!alternative || !url) {
      return;
    }

    try {
      await shownAlternativePromise;
      await markAlternativeOpenedAndCountSunTap(alternative);
    } finally {
      window.location.href = url;
    }
  };

  const getOpenableUrl = () => {
    return getAlternativeOpenUrl(getAlternative());
  };

  return (
    <>
      {getAlternative() && (
        <div onmouseenter={props.onCancelCountdown}>
          <div class="txtBig" style="padding-bottom:32px; padding-top: 32px;">
            {IS_APP || !getOpenableUrl() ? (
              <>
                Try <strong>{getAlternative()?.label}</strong> instead?
              </>
            ) : (
              <>
                How about visiting{" "}
                <a href={getOpenableUrl()} onClick={(ev) => void onGoToUrl(ev)}>
                  {getAlternative()?.label}
                </a>{" "}
                instead?
              </>
            )}
          </div>
          {props.onStayBriefly && (
            <button
              type="button"
              class="btnTxt"
              onClick={() => void onStayBriefly()}
            >
              Stay 2 min
            </button>
          )}
          {props.onAddBetterAlternative && (
            <button
              type="button"
              class="btnTxt"
              onClick={() => void onAddBetterAlternative()}
            >
              Add better option
            </button>
          )}
          <button
            type="button"
            class="btnTxt"
            onClick={() => void onDismissAlternative()}
          >
            Not for me
          </button>
        </div>
      )}
    </>
  );
};
