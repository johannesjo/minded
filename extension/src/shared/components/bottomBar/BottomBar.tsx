// @ts-expect-error
import styles from "./BottomBar.module.scss";

import { A, useLocation, useNavigate } from "@solidjs/router";
import { createEffect, createSignal } from "solid-js";
import { Ico } from "@src/shared/components/ui/Ico";

const BottomBar = (props: { onShowQuestion: () => void }) => {
  const [getIsOnDashboard, setIsOnDashboard] = createSignal<boolean>(false);
  const location = useLocation();
  const navigate = useNavigate();

  createEffect(() => {
    setIsOnDashboard(location.pathname === "/");
  });

  return (
    <div
      onClick={() => !getIsOnDashboard() && navigate("/")}
      style={!getIsOnDashboard() && "cursor: pointer;"}
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
            <Ico name="questionOverlay" />
          </button>
          <A
            title="Give us somet feedback"
            class="btnIcoOnly"
            href="/feedback"
            activeClass="active"
          >
            <Ico name="feedback" />
          </A>
          <A
            title="Go to settings page"
            class="btnIcoOnly"
            href="/settings"
            activeClass="active"
          >
            <Ico name="settings" />
          </A>
        </>
      ) : (
        <A
          title="Go to dashboard"
          class="btnIcoOnly"
          href="/"
          activeClass="xxx"
        >
          <Ico name="arrowBack" />
        </A>
      )}
    </div>
  );
};

export default BottomBar;
