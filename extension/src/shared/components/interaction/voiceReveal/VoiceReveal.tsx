import { createMemo, For, JSX } from "solid-js";
import { Dynamic } from "solid-js/web";
import {
  getVoiceWordDelayMs,
  splitVoiceWords,
} from "@src/shared/components/interaction/voiceReveal/voiceRevealTiming";

/**
 * A serif prompt that arrives word by word: each word comes into focus once
 * (fade + tiny rise; no blur - see voiceReveal.scss), staggered - one gentle arrival, never a
 * loop. Only for the words the app speaks on an intervention, never chrome.
 *
 * - Words are inline-blocks separated by real spaces, so `text-wrap: balance`
 *   and normal line breaking still see one sentence.
 * - Screen readers get the whole sentence once from a visually-hidden copy;
 *   the animated words are aria-hidden.
 * - The words list is rebuilt only when `text` changes (a new prompt), so the
 *   arrival never re-triggers for the same line.
 */
export const VoiceReveal = (props: {
  text: string;
  class?: string;
  style?: JSX.CSSProperties;
  as?: "div" | "span";
}): JSX.Element => {
  // Fresh objects per text change: every word of a *new* prompt animates, and
  // <For> can't reuse a previous prompt's identical word mid-arrival.
  const words = createMemo(() =>
    splitVoiceWords(props.text).map((word) => ({ word })),
  );

  return (
    <Dynamic
      component={props.as ?? "div"}
      class={props.class ? `voice-reveal ${props.class}` : "voice-reveal"}
      style={props.style}
    >
      <span class="voice-reveal-sr">{props.text}</span>
      <span class="voice-reveal-words" aria-hidden="true">
        <For each={words()}>
          {(entry, i) => (
            <>
              {i() > 0 ? " " : ""}
              <span
                class="voice-reveal-word"
                style={{
                  "animation-delay": `${getVoiceWordDelayMs(i(), words().length)}ms`,
                }}
              >
                {entry.word}
              </span>
            </>
          )}
        </For>
      </span>
    </Dynamic>
  );
};

export default VoiceReveal;
