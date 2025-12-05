import { createSignal, JSX } from "solid-js";
// @ts-ignore
import styles from "./WebsiteListItem.module.scss";
import { Ico } from "@src/shared/components/ui/Ico";
import { TextInput } from "@src/shared/components/ui/TextInput";

// List item component
export const WebsiteListItem: (props: {
  value: string;
  update: (value: string) => void;
  remove: () => void;
}) => JSX.Element = (props) => {
  const [getValue, setValue] = createSignal(props.value);

  return (
    <div class={styles.WebsiteListItem}>
      <TextInput
        value={getValue()}
        onBlur={() => props.update(getValue())}
        onInput={(value) => setValue(value)}
      />
      <button class="btnIcoSmall" onClick={props.remove}>
        <Ico name="close" />
      </button>
    </div>
  );
};

// Parent component
