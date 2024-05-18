import { createSignal, JSX } from "solid-js";
import {
  MOOD_CHECKIN_FEEL_BETTER_OPTIONS,
  MOOD_CHECKIN_OPTIONS,
  MoodCheckinVal,
} from "@src/shared/components/interaction/mood-checkin/moodCheckin.const";
// @ts-ignore
import { saveMoodCheckIn } from "@dataInterface/syncDataInterface";

export const MoodCheckin: (props: {
  onSuccess: () => void;
  onSKip: () => void;
  onCancelCountdown: () => void;
}) => JSX.Element = (props) => {
  const [getSelectedMood, setSelectedMood] =
    createSignal<MoodCheckinVal | null>(null);
  const [getAdditionalTxt, setAdditionalTxt] = createSignal<string | null>(
    null,
  );

  const onSaveAll = async () => {
    const mood = getSelectedMood();
    if (mood) {
      await saveMoodCheckIn(mood, getAdditionalTxt());
      props.onSuccess();
    }
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
        class={
          getSelectedMood()
            ? "minded-6622-textarea-block isVisible"
            : "minded-6622-textarea-block"
        }
      >
        <div style="margin-bottom: 16px" class="minded-6622-txt-smaller">
          {getSelectedMood() === MoodCheckinVal.Awful ||
          getSelectedMood() === MoodCheckinVal.Bad
            ? "What might help to make you feel better?"
            : "Anything you'd like to add?"}
        </div>
        <input
          id={
            getSelectedMood() === MoodCheckinVal.Awful ||
            getSelectedMood() === MoodCheckinVal.Bad
              ? "minded-6622-feel-better-suggestions"
              : "minded-6622-checkin-notes"
          }
          list={
            getSelectedMood() === MoodCheckinVal.Awful ||
            getSelectedMood() === MoodCheckinVal.Bad
              ? "auto-suggestions-for-mood-checkin"
              : ""
          }
          autocomplete="true"
          autofocus={true}
          maxlength="200"
          onInput={(ev) => setAdditionalTxt((ev.target as any).value)}
          onKeyDown={(ev) => setAdditionalTxt((ev.target as any).value)}
        />
        <datalist id="auto-suggestions-for-mood-checkin">
          {MOOD_CHECKIN_FEEL_BETTER_OPTIONS.map((opt) => (
            <option value={opt} />
          ))}
        </datalist>
      </div>

      <div
        class={
          getSelectedMood() ? "minded-6622-btns isVisible" : "minded-6622-btns"
        }
      >
        <div class="minded-6622-nxt-btn" onclick={onSaveAll}>
          save
        </div>
      </div>
    </div>
  );
};
