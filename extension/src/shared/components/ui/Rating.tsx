import { createSignal, For, JSX } from "solid-js";

export const Rating: (props: {
  value?: number;
  isShowOnly?: boolean;
  onSetRating?: (val: number) => void;
  /**
   * Optional end labels under the dots (e.g. ["low", "high"]) so the scale's
   * direction is legible - the same quiet anchors the urge-surfing scale uses
   * ("barely" / "intense").
   */
  anchors?: [string, string];
}) => JSX.Element = (props) => {
  const [rating, setRating] = createSignal(props.value || 0);
  const [hoveredRating, setHoveredRating] = createSignal(0);

  return (
    <div class={"rating " + (props.isShowOnly ? "showOnly" : "")}>
      <For each={Array.from({ length: 5 }, (_, i) => i + 1)}>
        {(value) => (
          <button
            type="button"
            class="ratingButton"
            disabled={props.isShowOnly}
            aria-label={`Set rating to ${value}`}
            onClick={() => {
              if (props.isShowOnly) return;
              setRating(value);
              props.onSetRating?.(value);
            }}
            onmouseenter={() => {
              if (props.isShowOnly) return;
              setHoveredRating(value);
            }}
            onmouseleave={() => setHoveredRating(0)}
          >
            <div
              classList={{
                ratingDot: true,
                isFull: value <= rating() || value <= hoveredRating(),
              }}
            />
          </button>
        )}
      </For>
      {props.anchors && (
        <div class="ratingAnchors">
          <span>{props.anchors[0]}</span>
          <span>{props.anchors[1]}</span>
        </div>
      )}
    </div>
  );
};

export default Rating;
