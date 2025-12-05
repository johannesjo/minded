import { createSignal, JSX } from "solid-js";
// @ts-ignore
import styles from "./WebsiteListItem.module.scss";
import { Ico } from "@src/shared/components/ui/Ico";

// List item component
export const WebsiteListItem: (props: {
  value: string;
  update: (value: string) => void;
  remove: () => void;
}) => JSX.Element = (props) => {
  const [getValue, setValue] = createSignal(props.value);

  // createEffect(
  //   on(
  //     getValue,
  //     (v) => {
  //       props.update(v);
  //     },
  //     { defer: true },
  //   ),
  // );

  return (
    <div class={styles.WebsiteListItem}>
      <input
        type="text"
        value={getValue()}
        onblur={() => props.update(getValue())}
        oninput={(e) => setValue(e.currentTarget.value)}
      />
      <button class="btnIcoSmall" onClick={props.remove}>
        <Ico name="close" />
      </button>
    </div>
  );
};

// Parent component
