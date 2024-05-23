import { createSignal, For, JSX } from "solid-js";
// @ts-ignore
import lightningSvg from "@assets/img/lightning.svg";

export const Rating: (props: {
  value?: number;
  isShowOnly?: boolean;
  onSetRating?: (val: number) => void;
}) => JSX.Element = (props) => {
  const [rating, setRating] = createSignal(props.value);
  const [hoveredRating, setHoveredRating] = createSignal(0);

  return (
    <div class={"rating " + (props.isShowOnly ? "showOnly" : "")}>
      <For each={Array.from({ length: 5 }, (_, i) => i + 1)}>
        {(value) => (
          <span
            class={
              value <= rating() || value <= hoveredRating() ? "isFull" : ""
            }
            onClick={() => {
              if (props.isShowOnly) return;
              setRating(value);
              props.onSetRating(value);
            }}
            onmouseenter={() => {
              if (props.isShowOnly) return;
              setHoveredRating(value);
            }}
            onmouseleave={() => setHoveredRating(0)}
          >
            <img src={lightningSvg} />
          </span>
        )}
      </For>
    </div>
  );
};

export default Rating;
