import { JSX } from "solid-js";
import "./Onboarding.scss";
import { WebsiteList } from "@src/shared/components/WebsiteList";

export const Onboarding: () => JSX.Element = () => {
  return (
    <>
      <div id="minded-6622-coloured-wrapper">
        <div className="welcome-wrapper">
          <div className="welcome">Welcome to Minded</div>
          <div className="info-text">
            <p>
              Minded is a tool that will help you to be more productive and
              focused on what counts.
            </p>
            <p>
              As a first step please configure the websites that you want to
              spent less time on.
            </p>
          </div>
          <WebsiteList />
        </div>
      </div>
    </>
  );
};
