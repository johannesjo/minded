/* @refresh reload */
import { createEffect, createSignal, JSX } from "solid-js";
import {
  countSunTap,
  IS_APP,
} from "@src/dataInterface/commonSyncDataInterface";
import { getRndEntry } from "@src/util/getRndEntry";
import { SyncData } from "@src/dataInterface/syncData";
import SuccessSun from "@src/shared/components/successSun/SuccessSun";

// once on app load

export const ShowAlternativeInteraction: (props: {
  onSkip: () => void;
  onCancelCountdown: () => void;
  syncData: SyncData;
}) => JSX.Element = (props) => {
  const [getAlternative, setAlternative] = createSignal<string | undefined>();
  const [getIsShowSuccessSun, setIsShowSuccessSun] = createSignal(false);

  createEffect(() => {
    setAlternative(
      getRndEntry(
        IS_APP
          ? props.syncData.alternativeApps
          : props.syncData.alternativeWebsites,
      ),
    );
  });

  const beautifyUrl = (url: string): string => {
    return url?.replace("https://", "").replace("www.", "");
  };

  const onGoToUrl = () => {
    setIsShowSuccessSun(true);
    countSunTap();
  };

  return (
    <>
      {getIsShowSuccessSun() && <SuccessSun isReducedSuccessSun={true} />}

      <div onmouseenter={props.onCancelCountdown}>
        <div class="txtBig" style="padding-bottom:32px; padding-top: 32px;">
          {IS_APP ? (
            <>
              How about using <strong>{getAlternative()}</strong> instead?
            </>
          ) : (
            <>
              How about visiting{" "}
              <a href={getAlternative()} onclick={onGoToUrl}>
                {beautifyUrl(getAlternative())}
              </a>{" "}
              instead?
            </>
          )}
        </div>
      </div>
    </>
  );
};
