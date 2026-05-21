/* @refresh reload */
import { createEffect, createSignal, JSX, Show } from "solid-js";
import {
  IS_APP,
  IS_WEB_EXT,
  IS_IOS,
  markAlternativeOpenedAndCountSunTap,
  markAlternativeShown,
} from "@src/dataInterface/commonSyncDataInterface";
import type {
  Alternative,
  SessionPlatform,
  SyncData,
} from "@src/dataInterface/syncData";
import {
  getAlternativesForTarget,
  getWebsiteAlternativeHref,
} from "@src/shared/components/interaction/alternatives/getAlternatives";
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

  const onAlternativeLinkClick = async (
    event: MouseEvent,
    alternative: Alternative,
    href: string,
  ) => {
    props.onCancelCountdown();

    const shouldHandleNavigation =
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey;

    if (shouldHandleNavigation) {
      event.preventDefault();
    }

    try {
      await shownAlternativePromise;
      await markAlternativeOpenedAndCountSunTap(alternative);
    } catch (error) {
      console.error("Failed to mark alternative opened", error);
    } finally {
      if (shouldHandleNavigation) {
        window.location.href = href;
      }
    }
  };

  const renderAlternativeLabel = (alternative: Alternative): JSX.Element => {
    const href = IS_WEB_EXT
      ? getWebsiteAlternativeHref(alternative)
      : undefined;

    return href ? (
      <a
        class="show-alternative-link"
        href={href}
        onClick={(event) =>
          void onAlternativeLinkClick(event, alternative, href)
        }
      >
        {alternative.label}
      </a>
    ) : (
      <strong>{alternative.label}</strong>
    );
  };

  return (
    <>
      <Show when={getAlternative()}>
        {(alternative) => (
          <div onmouseenter={props.onCancelCountdown}>
            <div class="txtBig interaction-heading">
              Try {renderAlternativeLabel(alternative())} instead?
            </div>
            <div class="show-alternative-actions">
              {props.onAddBetterAlternative && (
                <button
                  type="button"
                  class="btnTxt"
                  onClick={() => void onAddBetterAlternative()}
                >
                  Suggest better alternative
                </button>
              )}
            </div>
          </div>
        )}
      </Show>
    </>
  );
};
