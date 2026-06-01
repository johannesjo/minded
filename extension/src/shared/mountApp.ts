import { render } from "solid-js/web";
import type { JSX } from "solid-js";

/**
 * Mounts a root component into the shared #minded-6622 app container.
 *
 * @param component - Component thunk to render.
 * @param beforeRender - Optional hook run against the container before render
 *   (e.g. Android inset setup, which must apply before the first paint).
 */
export const mountApp = (
  component: () => JSX.Element,
  beforeRender?: (container: HTMLElement) => void,
): void => {
  const appContainer = document.querySelector<HTMLElement>("#minded-6622");
  if (!appContainer) {
    throw new Error("Can not find AppContainer");
  }
  beforeRender?.(appContainer);
  render(component, appContainer);
};
