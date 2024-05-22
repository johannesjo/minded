// @ts-expect-error
import styles from "./BottomBar.module.scss";
// @ts-expect-error
import settingsSvg from "@assets/img/settings.svg";
// @ts-expect-error
import askQuestionSvg from "@assets/img/ask-question.svg";
// @ts-expect-error
import feedbackSvg from "@assets/img/feedback.svg";
import { useNavigate } from "@solidjs/router";

const BottomBar = (props: { onShowQuestion: () => void }) => {
  const navigate = useNavigate();

  return (
    <div class={styles.bottomBarWrapper}>
      <div
        class="btn-ico"
        title="Get asked a question"
        onClick={() => {
          props.onShowQuestion();
        }}
      >
        <img src={askQuestionSvg} />
      </div>
      <div
        title="Go to settings page"
        class="btn-ico"
        onClick={() => navigate("/settings")}
      >
        <img src={settingsSvg} />
      </div>
      <div
        title="Give us somet feedback"
        class="btn-ico"
        onClick={() => navigate("/feedback")}
      >
        <img src={feedbackSvg} />
      </div>
    </div>
  );
};

export default BottomBar;
