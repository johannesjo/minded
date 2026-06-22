import { createEffect, createSignal, JSX } from "solid-js";

const ButtonWrapper = (props: {
  children: JSX.Element;
  isVisible: boolean;
}): JSX.Element => {
  const [getIsVisible, setIsVisible] = createSignal<boolean>(props.isVisible);

  createEffect(() => {
    setIsVisible(props.isVisible);
  });

  return (
    <div
      // parent styling hook
      class="btn-wrapper"
      style={`text-align:center;  transition: 0.2s ease-out; ${!getIsVisible() ? "visibility: hidden; opacity: 0;" : "opacity: 1"}`}
    >
      <div style="padding-top: 32px; pointer-events:all; display: inline-block;">
        {props.children}
      </div>
    </div>
  );
};

export default ButtonWrapper;
