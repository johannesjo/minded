import { createSignal, JSX, onCleanup } from "solid-js";
import {
  continueHint,
  letGoHint,
  SUN_HINT_STAGGER_MS,
} from "@src/shared/components/interaction/sunHints";

/**
 * The real intervention's two hints, in its own markup and rhythm (the second
 * follows after SUN_HINT_STAGGER_MS), so the welcome teaches exactly what a
 * site will later show.
 */
export const InterventionHints = (props: {
  objectName: string;
}): JSX.Element => {
  const [getIsContinueShown, setIsContinueShown] = createSignal(false);
  const timer = window.setTimeout(
    () => setIsContinueShown(true),
    SUN_HINT_STAGGER_MS,
  );
  onCleanup(() => window.clearTimeout(timer));

  return (
    <div class="sun-instructions txtSmaller">
      <p class="sun-instructions-line is-visible">
        {letGoHint(props.objectName)}
      </p>
      <p
        class="sun-instructions-line"
        classList={{ "is-visible": getIsContinueShown() }}
      >
        {continueHint(props.objectName)}
      </p>
    </div>
  );
};
