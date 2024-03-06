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
        <div className="welcome">Welcome to Minded</div>
        <div className="info-text">
          <p>
            Minded is a tool that will help you to be more productive and
            focused on what counts.
          </p>
          <p>
            As a first step please configure the websites that you want to spent{" "}
            <em>less</em> time on.
          </p>
        </div>

        <WebsiteList onSave={onSaveWebsites} />
      </div>
    </>
  );
};
