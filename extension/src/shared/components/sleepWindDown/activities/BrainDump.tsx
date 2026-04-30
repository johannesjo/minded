import { createSignal, JSX, onMount } from "solid-js";
import { saveAnswer } from "@src/dataInterface/commonSyncDataInterface";
import { BRAIN_DUMP_PROMPTS } from "@src/shared/data/sleepContent";
import { QuestionCategoryId } from "@src/shared/data/questions";
// @ts-ignore
import styles from "../SleepWindDownRoute.module.scss";

const pickPrompt = (): string =>
  BRAIN_DUMP_PROMPTS[Math.floor(Math.random() * BRAIN_DUMP_PROMPTS.length)];

export const BrainDump = (props: {
  onDone: () => void;
  onBack: () => void;
}): JSX.Element => {
  const [prompt, setPrompt] = createSignal(BRAIN_DUMP_PROMPTS[0]);
  const [text, setText] = createSignal("");

  onMount(() => setPrompt(pickPrompt()));

  const submit = async () => {
    const trimmed = text().trim();
    if (trimmed.length > 0) {
      await saveAnswer({
        id: `sleep-${Date.now()}`,
        qid: null,
        questionCategoryId: QuestionCategoryId.SleepWindDown,
        val: trimmed,
        ts: Date.now(),
      });
    }
    props.onDone();
  };

  return (
    <div class={styles.activityBody}>
      <h3 class="h3" style={{ "text-align": "center", margin: 0 }}>
        {prompt()}
      </h3>
      <textarea
        class={styles.brainDumpTextarea}
        placeholder="Write whatever's on your mind. It stays here."
        value={text()}
        onInput={(e) => setText(e.currentTarget.value)}
      />
      <div class={styles.activityActions}>
        <button class="btnTxtOutline" onClick={props.onBack}>
          Back
        </button>
        <button class="btnTxt" onClick={submit}>
          Done
        </button>
      </div>
    </div>
  );
};
