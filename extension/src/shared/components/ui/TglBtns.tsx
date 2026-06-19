import { createSignal, For, JSX } from "solid-js";
import Btn from "@src/shared/components/ui/Btn";

export interface TglBtnOption<T> {
  val: T;
  txt: string;
}

const TglBtns = <T,>(props: {
  options: TglBtnOption<T>[];
  onSelect: (value: T) => void;
}): JSX.Element => {
  const [getSelectedVal, setSelectedVal] = createSignal<T | null>(null);

  return (
    <div style="margin-right: -8px; margin-left: -8px;">
      <For each={props.options}>
        {(option) => (
          <Btn
            variant="toggle"
            selected={getSelectedVal() === option.val}
            onClick={() => {
              setSelectedVal(() => option.val);
              props.onSelect(option.val);
            }}
          >
            {option.txt}
          </Btn>
        )}
      </For>
    </div>
  );
};

export default TglBtns;

// .mood-checkin-btns {
//   display: flex;
//   flex-wrap: wrap;
//   justify-content: center;
//   user-select: none;
//   pointer-events: all;
//   // more space on mobile for buttons
//   margin-left: -32px;
//   margin-right: -32px;
//   margin-top: 16px;
//   margin-bottom: 16px;
//
// @include onNonMobileScreens() {
//     margin-top: 32px;
//     margin-bottom: 64px;
//   }
// }
