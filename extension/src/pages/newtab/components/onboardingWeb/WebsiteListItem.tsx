import { createEffect, createSignal, JSX, Show } from "solid-js";
// @ts-ignore
import styles from "./WebsiteListItem.module.scss";
import { Ico } from "@src/shared/components/ui/Ico";
import Btn from "@src/shared/components/ui/Btn";
import { TextInput } from "@src/shared/components/ui/TextInput";

// List item component
export const WebsiteListItem: (props: {
  value: string;
  index: number;
  error?: string;
  update: (value: string) => void;
  remove: () => void;
}) => JSX.Element = (props) => {
  const [getValue, setValue] = createSignal(props.value);

  createEffect(() => {
    setValue(props.value);
  });

  const errorId = () => `minded-website-error-${props.index}`;

  return (
    <div class={styles.WebsiteListItemWrapper}>
      <div class={styles.WebsiteListItem}>
        <TextInput
          value={getValue()}
          placeholder="example.com"
          ariaLabel={`Website ${props.index + 1}`}
          ariaInvalid={!!props.error}
          ariaDescribedBy={props.error ? errorId() : undefined}
          onBlur={() => props.update(getValue())}
          onInput={(value) => setValue(value)}
        />
        <Btn
          variant="icon"
          small
          title="Remove website"
          aria-label={`Remove ${getValue() || "website"}`}
          onClick={props.remove}
        >
          <Ico name="close" />
        </Btn>
      </div>
      <Show when={props.error}>
        <div id={errorId()} class={styles.errorText}>
          {props.error}
        </div>
      </Show>
    </div>
  );
};

// Parent component
