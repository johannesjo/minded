// @ts-ignore
import styles from "./BottomBar.module.scss";
// @ts-ignore
import settingsSvg from "@assets/img/settings.svg";
// @ts-ignore
import askQuestionSvg from "@assets/img/ask-question.svg";
// @ts-ignore
import { goSettings } from "@dataInterface/system";

const BottomBar = (props: { onShowQuestion: () => void }) => {
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
      <div class="btn-ico" onClick={goSettings}>
        <img src={settingsSvg} />
      </div>
    </div>
  );
};

export default BottomBar;
