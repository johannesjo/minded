/* @refresh reload */
import { createEffect, createSignal, JSX } from "solid-js";
import {
  IS_APP,
  IS_IOS,
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
import { getAlternativeCandidate } from "@src/shared/components/interaction/alternatives/getAlternativeCandidate";

// once on app load

export const ShowAlternativeInteraction: (props: {
  onSkip: () => void;
  onCancelCountdown: () => void;
  syncData: SyncData;
}) => JSX.Element = (props) => {
  const [getAlternative, setAlternative] = createSignal<
    Alternative | undefined
  >();
  let shownAlternativeId: string | undefined;
  let shownAlternativePromise: Promise<void> | undefined;

  createEffect(() => {
    // Keep the candidate stable if the shown-stat write refreshes sync data.
    if (getAlternative()) {
      return;
    }

    const platform: SessionPlatform = IS_APP
      ? IS_IOS
        ? "ios"
        : "android"
      : "web";
    const candidate = getAlternativeCandidate(
      getAlternativesForTarget(props.syncData, undefined, platform),
    );
    setAlternative(candidate);

    if (candidate && shownAlternativeId !== candidate.id) {
      shownAlternativeId = candidate.id;
      shownAlternativePromise = markAlternativeShown(candidate);
      void shownAlternativePromise;
    }
  });

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
        </div>
      )}
    </>
  );
};
