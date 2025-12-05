import { createSignal, For, JSX } from "solid-js";
import {
  MOOD_CHECKIN_FEEL_BETTER_OPTIONS,
  MOOD_CHECKIN_OPTIONS,
  MoodCheckinVal,
} from "@src/shared/components/interaction/moodCheckin/moodCheckin.const";
import { saveMoodCheckIn } from "@src/dataInterface/commonSyncDataInterface";
import TglBtns from "@src/shared/components/ui/TglBtns";
import { IS_ANDROID } from "@src/dataInterface/commonSyncDataInterface";

export const MoodCheckin: (props: {
  onSuccess: () => void;
  onSkip: () => void;
  onCancelCountdown: () => void;
}) => JSX.Element = (props) => {
  const [getSelectedMood, setSelectedMood] =
    createSignal<MoodCheckinVal | null>(null);
  const [getAdditionalTxt, setAdditionalTxt] = createSignal<string | null>(
    null,
  );
  const [getSaveDelay, setSaveDelay] = createSignal<NodeJS.Timeout | null>(
    null,
  );

  const onMoodSelect = async (mood: MoodCheckinVal) => {
    setSelectedMood(mood);

    // Clear any existing timeout
    const existingDelay = getSaveDelay();
    if (existingDelay) {
      clearTimeout(existingDelay);
    }

    // Save immediately if no additional text is expected, otherwise wait a bit
    const delay = setTimeout(async () => {
      await saveMoodCheckIn(mood, getAdditionalTxt() || undefined);
      props.onSuccess();
    }, 3000); // Give user 3 seconds to add additional text

    setSaveDelay(delay);
  };

  const handleInputChange = (value: string) => {
    setAdditionalTxt(value);

    // Reset the save timer when user types
    const existingDelay = getSaveDelay();
    if (existingDelay) {
      clearTimeout(existingDelay);

      const mood = getSelectedMood();
      if (mood) {
        const delay = setTimeout(async () => {
          await saveMoodCheckIn(mood, getAdditionalTxt() || undefined);
          props.onSuccess();
        }, 2000); // Save 2 seconds after user stops typing

        setSaveDelay(delay);
      }
    }
  };

  return (
    <div id="minded-6622-mood-checkin" onmousemove={props.onCancelCountdown}>
      <div class="txtBig">How do you feel?</div>

      <TglBtns options={MOOD_CHECKIN_OPTIONS} onSelect={onMoodSelect} />

      <div
        class={
          getSelectedMood() ? "additional-block isVisible" : "additional-block"
        }
      >
        <div class="txtSmaller">
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
            !IS_ANDROID &&
            (getSelectedMood() === MoodCheckinVal.Awful ||
              getSelectedMood() === MoodCheckinVal.Bad)
              ? "auto-suggestions-for-mood-checkin"
              : ""
          }
          autocomplete="true"
          maxlength="200"
          onInput={(ev) => handleInputChange(ev.currentTarget.value)}
          onKeyDown={(ev) => {
            if (ev.key === "Enter") {
              ev.preventDefault();
              // Save immediately on Enter
              const existingDelay = getSaveDelay();
              if (existingDelay) {
                clearTimeout(existingDelay);
              }
              const mood = getSelectedMood();
              if (mood) {
                saveMoodCheckIn(mood, getAdditionalTxt() || undefined).then(
                  () => {
                    props.onSuccess();
                  },
                );
              }
            }
          }}
        />
        <datalist id="auto-suggestions-for-mood-checkin">
          <For each={MOOD_CHECKIN_FEEL_BETTER_OPTIONS}>
            {(opt) => <option value={opt} />}
          </For>
        </datalist>
      </div>
    </div>
  );
};
