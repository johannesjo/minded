import { createSignal, JSX, onCleanup, onMount } from "solid-js";
import { saveAnswer } from "@src/dataInterface/commonSyncDataInterface";
import { BRAIN_DUMP_PROMPTS } from "@src/shared/data/sleepContent";
import { QuestionCategoryId } from "@src/shared/data/questions";
// @ts-ignore
import styles from "../SleepWindDownRoute.module.scss";

const pickPrompt = (): string =>
  BRAIN_DUMP_PROMPTS[Math.floor(Math.random() * BRAIN_DUMP_PROMPTS.length)];

const DRAFT_DEBOUNCE_MS = 600;

export const BrainDump = (props: {
  initialText?: string;
  onDraftChange?: (text: string) => void;
  onDone: () => void;
  onBack: () => void;
}): JSX.Element => {
  // Initialize lazily so there's no flash of prompt[0] before the random pick.
  const [prompt] = createSignal(pickPrompt());
  const [text, setText] = createSignal(props.initialText ?? "");

  let debounceHandle: ReturnType<typeof setTimeout> | null = null;
  // Once the user submits, we MUST NOT re-flush the local text — the parent
  // has already cleared the draft and we'd otherwise overwrite "" with the
  // text the user just submitted, causing it to reappear next mount.
  let isSubmitted = false;

  const scheduleDraftWrite = (value: string) => {
    if (!props.onDraftChange || isSubmitted) return;
    if (debounceHandle) clearTimeout(debounceHandle);
    debounceHandle = setTimeout(() => {
      if (isSubmitted) return;
      props.onDraftChange?.(value);
      debounceHandle = null;
    }, DRAFT_DEBOUNCE_MS);
  };

  const flushDraft = () => {
    if (!props.onDraftChange || isSubmitted) return;
    if (debounceHandle) {
      clearTimeout(debounceHandle);
      debounceHandle = null;
    }
    props.onDraftChange(text());
  };

  onMount(() => {
    onCleanup(() => {
      // Don't drop typed-but-not-yet-debounced text on unmount.
      flushDraft();
    });
  });

  const submit = async () => {
    const trimmed = text().trim();
    isSubmitted = true;
    if (debounceHandle) {
      clearTimeout(debounceHandle);
      debounceHandle = null;
    }
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

  const back = () => {
    flushDraft();
    props.onBack();
  };

  return (
    <div class={styles.activityBody}>
      <h2 class={`h2 ${styles.activityTitle}`}>{prompt()}</h2>
      <textarea
        class={styles.brainDumpTextarea}
        placeholder="Write whatever's on your mind. Saved with your journal."
        value={text()}
        onInput={(e) => {
          const v = e.currentTarget.value;
          setText(v);
          scheduleDraftWrite(v);
        }}
      />
      <div class={styles.activityActions}>
        <button class="btnTxtOutline" onClick={back}>
          Back
        </button>
        <button class="btnTxtOutline" onClick={submit}>
          Done
        </button>
      </div>
    </div>
  );
};
