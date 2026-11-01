import { fadeOutThen, PAGE_FADE_MS } from "./animation";

describe("fadeOutThen", () => {
  const frames: (FrameRequestCallback | null)[] = [];

  beforeEach(() => {
    jest.useFakeTimers();
    frames.length = 0;
    Object.assign(globalThis, {
      window: {
        matchMedia: () => ({ matches: false }),
        requestAnimationFrame: (cb: FrameRequestCallback) => frames.push(cb),
        cancelAnimationFrame: (id: number) => {
          frames[id - 1] = null;
        },
      },
    });
  });
  afterEach(() => {
    jest.useRealTimers();
    delete (globalThis as { window?: unknown }).window;
  });

  // The fade's opacity write waits for a frame, but its end is a plain timer.
  // When the frame is late (a busy main thread), `done` restores the element
  // first - the stale frame must not then hide it for good.
  it("does not leave the element hidden when its frame lands after the fade", async () => {
    const el = { style: {} as Record<string, string> };
    const done = jest.fn(() => {
      el.style.opacity = "";
    });

    fadeOutThen(el as unknown as HTMLElement, done);
    jest.advanceTimersByTime(PAGE_FADE_MS);
    await Promise.resolve();
    expect(done).toHaveBeenCalled();
    frames.forEach((cb) => cb?.(0));

    expect(el.style.opacity).toBe("");
  });
});
