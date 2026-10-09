import { createRoot } from "solid-js";

import { createScreenFade } from "@src/util/screenFade";

jest.mock("@src/util/prefersReducedMotion", () => ({
  prefersReducedMotion: () => false,
}));

// The node test env has no `window`; alias it to the global so the helper's
// window.setTimeout resolves to jest's fake timers.
(globalThis as unknown as { window: typeof globalThis }).window = globalThis;

describe("createScreenFade", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("stays inert through the fade-out AND the fade-in, swapping at the midpoint", () => {
    createRoot((dispose) => {
      const fade = createScreenFade(400);
      const swap = jest.fn();

      fade.toScreen(swap);
      expect(fade.opacity()).toBe(0);
      expect(fade.isFading()).toBe(true);

      jest.advanceTimersByTime(400);
      expect(swap).toHaveBeenCalledTimes(1);
      expect(fade.opacity()).toBe(1);
      // The incoming screen is still fading up from 0 - nothing on it is
      // tappable until it's actually visible.
      expect(fade.isFading()).toBe(true);

      jest.advanceTimersByTime(400);
      expect(fade.isFading()).toBe(false);
      dispose();
    });
  });

  it("restarts cleanly when called again mid-swap", () => {
    createRoot((dispose) => {
      const fade = createScreenFade(400);
      const first = jest.fn();
      const second = jest.fn();

      fade.toScreen(first);
      jest.advanceTimersByTime(600); // midway through the first fade-in
      fade.toScreen(second);
      expect(fade.opacity()).toBe(0);

      jest.advanceTimersByTime(400);
      expect(second).toHaveBeenCalledTimes(1);
      expect(fade.isFading()).toBe(true);
      jest.advanceTimersByTime(400);
      expect(fade.isFading()).toBe(false);
      expect(first).toHaveBeenCalledTimes(1);
      dispose();
    });
  });
});
