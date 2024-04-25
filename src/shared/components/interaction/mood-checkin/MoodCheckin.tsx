import { createSignal, JSX } from "solid-js";
import {
  MOOD_CHECKIN_OPTIONS,
  MoodCheckinVal,
} from "@src/shared/components/interaction/mood-checkin/moodCheckin.const";

export const MoodCheckin: (props: {
  onSuccess: () => void;
  onCancel: () => void;
  onCancelCountdown: () => void;
}) => JSX.Element = (props) => {
  const [getSelectedMood, setSelectedMood] =
    createSignal<MoodCheckinVal | null>(null);

  const onSaveMood = () => {
    // await saveAnswer({
    //   id: nanoid(),
    //   val,
    //   qid: null,
    //   ts: Date.now(),
    //   questionCategoryId: props.questionCategoryId,
    // });
    props.onSuccess();
  };

  return (
    <div id="minded-6622-mood-checkin" onmousemove={props.onCancelCountdown}>
      <div class="minded-6622-txt-big">How do you feel?</div>

      <div class="minded-6622-mood-checkin-btns">
        {MOOD_CHECKIN_OPTIONS.map((opt) => (
          <div
            class={
              getSelectedMood() === opt.id
                ? "minded-6622-mood-checkin-btn isSelected"
                : "minded-6622-mood-checkin-btn"
            }
            onclick={() => setSelectedMood(opt.id)}
          >
            {opt.txt}
          </div>
        ))}
      </div>
      <div
        style="margin-top: 64px;"
        class={
          getSelectedMood()
            ? "minded-6622-textarea-block isVisible"
            : "minded-6622-textarea-block"
        }
      >
        <div style="margin-bottom: 16px" class="minded-6622-txt-smaller">
          Anything you'd like to add?
        </div>
        <textarea></textarea>
      </div>

      <div
        class={
          getSelectedMood() ? "minded-6622-btns isVisible" : "minded-6622-btns"
        }
        style="margin-top: 64px;"
      >
        <div class="minded-6622-nxt-btn" onclick={onSaveMood}>
          save
        </div>
      </div>
    </div>
  );
};
