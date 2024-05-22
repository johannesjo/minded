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
        onClick={() => {
          props.onShowQuestion();
        }}
      >
        <img src={askQuestionSvg} />
      </div>
      <div class="btn-ico" onClick={() => navigate("/settings")}>
        <img src={settingsSvg} />
      </div>
      <div class="btn-ico" onClick={() => navigate("/feedback")}>
        <img src={feedbackSvg} />
      </div>
    </div>
  );
};

export default BottomBar;
