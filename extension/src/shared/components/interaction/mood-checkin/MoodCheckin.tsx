import { createSignal, For, JSX } from "solid-js";
import {
  MOOD_CHECKIN_FEEL_BETTER_OPTIONS,
  MOOD_CHECKIN_OPTIONS,
  MoodCheckinVal,
} from "@src/shared/components/interaction/mood-checkin/moodCheckin.const";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import { saveMoodCheckIn } from "@dataInterface/syncDataInterface";
import { SaveBtn } from "@src/shared/components/ui/SaveBtn";
import TglBtns from "@src/shared/components/ui/TglBtns";

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

  const onSaveAll = async () => {
    const mood = getSelectedMood();
    if (mood) {
      await saveMoodCheckIn(mood, getAdditionalTxt());
      props.onSuccess();
    }
  };

  return (
    <div id="minded-6622-mood-checkin" onmousemove={props.onCancelCountdown}>
      <div class="txt-big">How do you feel?</div>

      <TglBtns
        options={MOOD_CHECKIN_OPTIONS}
        onSelect={(v) => setSelectedMood(v)}
      />

      <div
        class={
          getSelectedMood() ? "additional-block isVisible" : "additional-block"
        }
      >
        <div class="txt-smaller">
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
          <For each={MOOD_CHECKIN_FEEL_BETTER_OPTIONS}>
            {(opt) => <option value={opt} />}
          </For>
        </datalist>
      </div>

      <SaveBtn onSave={onSaveAll} isVisible={!!getSelectedMood()} />
    </div>
  );
};
