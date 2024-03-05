import { createEffect, createSignal, JSX, on } from "solid-js";

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
    <div>
      <input
        type="text"
        value={getValue()}
        onblur={()=> props.update(getValue())}
        oninput={(e) => setValue((e as any).currentTarget.value as string)}
      />
      <button onClick={props.remove}>Remove</button>
    </div>
  );
};

// Parent component
