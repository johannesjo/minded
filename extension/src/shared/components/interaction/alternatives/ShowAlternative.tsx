/* @refresh reload */
import { createEffect, createSignal, JSX } from "solid-js";
import {
  IS_APP,
  IS_IOS,
  markAlternativeShown,
} from "@src/dataInterface/commonSyncDataInterface";
import type {
  Alternative,
  SessionPlatform,
  SyncData,
} from "@src/dataInterface/syncData";
import { getAlternativesForTarget } from "@src/shared/components/interaction/alternatives/getAlternatives";
import { getAlternativeCandidate } from "@src/shared/components/interaction/alternatives/getAlternativeCandidate";

// once on app load

export const ShowAlternativeInteraction: (props: {
  onAddBetterAlternative?: (alternative: Alternative) => void;
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

  const onAddBetterAlternative = async () => {
    const alternative = getAlternative();
    if (!alternative) {
      return;
    }

    props.onCancelCountdown();
    await shownAlternativePromise;
    props.onAddBetterAlternative?.(alternative);
  };

  return (
    <>
      {getAlternative() && (
        <div onmouseenter={props.onCancelCountdown}>
          <div class="txtBig" style="padding-bottom:32px; padding-top: 32px;">
            Try <strong>{getAlternative()?.label}</strong> instead?
          </div>
          <div class="show-alternative-actions">
            {props.onAddBetterAlternative && (
              <button
                type="button"
                class="btnTxt"
                onClick={() => void onAddBetterAlternative()}
              >
                Add better option
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
};
