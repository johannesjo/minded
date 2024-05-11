import { createSignal, JSX } from "solid-js";
// @ts-ignore
import lightningSvg from "@assets/img/lightning.svg";

export const Rating: (props: {
  value?: number;
  isShowOnly?: boolean;
  onSetRating?: (val: number) => void;
}) => JSX.Element = (props) => {
  const [rating, setRating] = createSignal(props.value);
  const [hoveredRating, setHoveredRating] = createSignal(0);
  rating;
  return (
    <div class={"minded-6622-rating " + (props.isShowOnly ? "showOnly" : "")}>
      {Array.from({ length: 5 }, (_, i) => i + 1).map((value) => (
        <span
          class={value <= rating() ? "isFull" : ""}
          onClick={() => {
            if (props.isShowOnly) return;
            setRating(value);
            props.onSetRating(value);
          }}
          onmouseenter={() => {
            if (props.isShowOnly) return;
            setRating(value);
          }}
        >
          <img src={lightningSvg} />
        </span>
      ))}
    </div>
  );
};

export default Rating;
