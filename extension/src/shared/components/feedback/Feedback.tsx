import { createSignal, onMount } from "solid-js";
// @ts-ignore
import styles from "./Feedback.module.scss";
// @ts-ignore
import { IS_ANDROID, IS_IOS } from "@src/dataInterface/commonSyncDataInterface";

const Feedback = () => {
  const [mailtoLink, setMailtoLink] = createSignal("");

  onMount(() => {
    const encodedSubject = encodeURIComponent(
      `Feedback for minded ${IS_ANDROID ? "on Android" : IS_IOS ? "on IOS" : "WebExtension"}`,
    );
    const encodedBody = encodeURIComponent(`Things, I like:


Things, I don't like:


Ideas for improvement:


I will use minded in the future: yes/no


Other comments:

`);
    setMailtoLink(
      `mailto:contact@minded.today?subject=${encodedSubject}&body=${encodedBody}`,
    );
  });

  return (
    <div class={styles.wrapper}>
      <p class="txtBig">
        <em>minded</em> is very young, so we'd really appreciate your feedback!
      </p>

      <div>
        <a href={mailtoLink()} class="btnTxt" target="_blank">
          ♥ send us a quick email ♥
        </a>
      </div>
    </div>
  );
};

export default Feedback;
