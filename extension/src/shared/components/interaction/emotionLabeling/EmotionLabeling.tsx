import { createSignal, For, JSX, Match, Switch } from "solid-js";
import {
  PRIMARY_EMOTIONS,
  BODY_LOCATIONS,
  BodyLocation,
} from "./emotionLabeling.const";
import { saveEmotionLabeling } from "@src/dataInterface/commonSyncDataInterface";
import Btn from "@src/shared/components/ui/Btn";
import { prefersReducedMotion } from "@src/util/prefersReducedMotion";
import { createScreenFade } from "@src/util/screenFade";

interface EmotionLabelingProps {
  onSuccess: () => void;
  onSkip: () => void;
  onCancelCountdown: () => void;
}

export const EmotionLabeling = (props: EmotionLabelingProps): JSX.Element => {
  const [getStep, setStep] = createSignal(0);
  const [getSelectedEmotions, setSelectedEmotions] = createSignal<Set<string>>(
    new Set(),
  );
  const [getBodyLocations, setBodyLocations] = createSignal<Set<BodyLocation>>(
    new Set(),
  );

  const FADE_MS = 240;
  // Cross-screen fade between the two steps (emotions → body location), via the
  // shared helper rather than hard-cutting the <Switch>: drop opacity to 0, swap
  // the step while hidden, then ease back in. Matches the FADE_MS transition on
  // the root element below.
  const screenFade = createScreenFade(FADE_MS);

  const toggleEmotion = (emotion: string) => {
    props.onCancelCountdown();
    const current = new Set(getSelectedEmotions());
    if (current.has(emotion)) {
      current.delete(emotion);
    } else {
      current.add(emotion);
    }
    setSelectedEmotions(current);
  };

  const toggleBodyLocation = (location: BodyLocation) => {
    props.onCancelCountdown();
    const current = new Set(getBodyLocations());
    if (current.has(location)) {
      current.delete(location);
    } else {
      current.add(location);
    }
    setBodyLocations(current);
  };

  const handleComplete = async () => {
    await saveEmotionLabeling(
      Array.from(getSelectedEmotions()),
      Array.from(getBodyLocations()),
    );
    props.onSuccess();
  };

  return (
    <div
      id="minded-6622-emotion-labeling"
      style={{
        opacity: screenFade.opacity(),
        transition: prefersReducedMotion()
          ? "none"
          : `opacity ${FADE_MS}ms ease-in-out`,
      }}
      onmousemove={props.onCancelCountdown}
    >
      <Switch>
        {/* Step 0: Select Emotions */}
        <Match when={getStep() === 0}>
          <div class="txtBig">What are you feeling?</div>
          <div
            class="txtSmaller"
            style="margin-bottom: 16px; font-style: italic;"
          >
            Select all that apply
          </div>
          <div>
            <For each={[...PRIMARY_EMOTIONS]}>
              {(emotion) => (
                <Btn
                  variant="toggle"
                  small
                  selected={getSelectedEmotions().has(emotion)}
                  onClick={() => toggleEmotion(emotion)}
                >
                  {emotion}
                </Btn>
              )}
            </For>
          </div>
          <Btn
            variant="toggle"
            style={{
              "margin-top": "24px",
              visibility: getSelectedEmotions().size > 0 ? "visible" : "hidden",
            }}
            onClick={() => screenFade.toScreen(() => setStep(1))}
          >
            continue
          </Btn>
        </Match>

        {/* Step 1: Body Location */}
        <Match when={getStep() === 1}>
          <div class="txtBig">Where do you feel it?</div>
          <div
            class="txtSmaller"
            style="margin-bottom: 16px; font-style: italic;"
          >
            Select body areas
          </div>
          <div>
            <For each={[...BODY_LOCATIONS]}>
              {(location) => (
                <Btn
                  variant="toggle"
                  small
                  selected={getBodyLocations().has(location)}
                  onClick={() => toggleBodyLocation(location)}
                >
                  {location}
                </Btn>
              )}
            </For>
          </div>
          <Btn
            variant="toggle"
            style={{
              "margin-top": "24px",
              visibility: getBodyLocations().size > 0 ? "visible" : "hidden",
            }}
            onClick={handleComplete}
          >
            done
          </Btn>
        </Match>
      </Switch>
    </div>
  );
};
