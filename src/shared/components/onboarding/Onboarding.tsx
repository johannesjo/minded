import { JSX } from "solid-js";
import "./Onboarding.scss";
import { WebsiteList } from "@src/shared/components/onboarding/WebsiteList";
import { updateCfg } from "@src/shared/data/dataInterface";

export const Onboarding: (props: { onComplete: () => void }) => JSX.Element = (
  props,
) => {
  const onSaveWebsites = async () => {
    await updateCfg({ isOnboardingComplete: true });
    props.onComplete();
  };

  return (
    <>
      <div className="welcome-wrapper">
        <div className="welcome">Welcome to <em>minded</em></div>
        <div className="info-text">
          <p>
            Which websites do you intent to use less?
          </p>
        </div>

        <WebsiteList onSave={onSaveWebsites} />
      </div>
    </>
  );
};
