import { createSignal, JSX } from "solid-js";
import styles from "./WebsiteListItem.module.scss";

// List item component
export const WebsiteListItem: (props: {
  value: string;
  update: (value: string) => void;
  remove: () => void;
}) => JSX.Element = (props) => {
  let [getValue, setValue] = createSignal(props.value);

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
        oninput={(e) => setValue((e as any).currentTarget.value as string)}
      />
      <button className="btn-ico" onClick={props.remove}>✕</button>
    </div>
  );
};

// Parent component
