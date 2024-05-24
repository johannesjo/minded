// @ts-expect-error
import styles from "./BottomBar.module.scss";
// @ts-expect-error
import settingsSvg from "@assets/img/settings.svg";
// @ts-expect-error
import askQuestionSvg from "@assets/img/ask-question.svg";
// @ts-expect-error
import feedbackSvg from "@assets/img/feedback.svg";
// @ts-expect-error
import closeSvg from "@assets/img/close.svg";

import { A, useLocation } from "@solidjs/router";
import { createEffect, createSignal } from "solid-js";
import { Ico } from "@src/shared/components/ui/Ico";

const BottomBar = (props: { onShowQuestion: () => void }) => {
  const [getIsOnDashboard, setIsOnDashboard] = createSignal<boolean>(false);
  const location = useLocation();

  createEffect(() => {
    setIsOnDashboard(location.pathname === "/");
  });

  return (
    <div
      class={`${styles.bottomBarWrapper}  ${getIsOnDashboard() && styles.isOnDashboard} `}
    >
      {getIsOnDashboard() ? (
        <>
          <button
            class="btnIcoOnly"
            title="Get asked a question"
            onClick={() => {
              props.onShowQuestion();
            }}
          >
            <Ico name="askQuestion" />
          </button>
          <A
            title="Go to settings page"
            class="btnIcoOnly"
            href="/settings"
            activeClass="active"
          >
            <Ico name="settings" />
          </A>
          <A
            title="Give us somet feedback"
            class="btnIcoOnly"
            href="/feedback"
            activeClass="active"
          >
            <Ico name="feedback" />
          </A>
        </>
      ) : (
        <A
          title="Go to dashboard"
          class="btnIcoOnly"
          href="/"
          activeClass="xxx"
        >
          <Ico name="close" />
        </A>
      )}
    </div>
  );
};

export default BottomBar;
