import { createSignal, JSX, onCleanup, onMount } from "solid-js";
import { saveAnswer } from "@src/dataInterface/commonSyncDataInterface";
import { BRAIN_DUMP_PROMPTS } from "@src/shared/data/sleepContent";
import {
  QuestionCategoryId,
  QuestionForPrompt,
} from "@src/shared/data/questions";
import { Question } from "@src/shared/components/interaction/Question";
import { QID } from "@src/shared/data/questionId";
// @ts-ignore
import styles from "../SleepWindDownRoute.module.scss";

const pickPrompt = (prompts: string[]): string =>
  prompts[Math.floor(Math.random() * prompts.length)];

const DRAFT_DEBOUNCE_MS = 600;
const BRAIN_DUMP_MAX_LENGTH = 2000;

export const BrainDump = (props: {
  initialText?: string;
  prompts?: string[];
  onDraftChange?: (text: string) => void;
  onBeforeSubmit?: () => void | Promise<void>;
  onDone: () => void | Promise<void>;
}): JSX.Element => {
  // Initialize lazily so there's no flash of prompt[0] before the random pick.
  const [prompt] = createSignal(
    pickPrompt(props.prompts ?? BRAIN_DUMP_PROMPTS),
  );
  const [text, setText] = createSignal(props.initialText ?? "");
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const question: QuestionForPrompt = {
    id: QID.SWD1,
    categoryId: QuestionCategoryId.SleepWindDown,
    t: prompt(),
    isDontSaveAnswer: true,
  };

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

  const submit = async (answerText: string) => {
    if (isSubmitting()) return;
    setIsSubmitting(true);
    const trimmed = answerText.trim();
    if (debounceHandle) {
      clearTimeout(debounceHandle);
      debounceHandle = null;
    }
    await props.onBeforeSubmit?.();
    try {
      if (trimmed.length > 0) {
        await saveAnswer({
          id: `sleep-${Date.now()}`,
          qid: null,
          questionCategoryId: QuestionCategoryId.SleepWindDown,
          val: trimmed,
          ts: Date.now(),
        });
      }
    } catch (e) {
      console.warn("Failed to save sleep wind-down brain dump", e);
      setIsSubmitting(false);
      return;
    }
    isSubmitted = true;
    await props.onDone();
  };

  return (
    <div class={`${styles.activityBody} ${styles.brainDumpInteraction}`}>
      <Question
        initialQuestion={question}
        answers={[]}
        initialValue={text()}
        maxLength={BRAIN_DUMP_MAX_LENGTH}
        onCancelCountdown={() => undefined}
        onSkip={() => undefined}
        onUpdateQuestion={() => undefined}
        onValueChange={(v) => {
          setText(v);
          scheduleDraftWrite(v);
        }}
        onSuccess={(answer) => submit(answer.val.toString())}
      />
      <div class={styles.activityActions}>
        <button
          class="btnTxt isOutline"
          disabled={isSubmitting()}
          onClick={() => submit(text())}
        >
          Done
        </button>
      </div>
    </div>
  );
};
