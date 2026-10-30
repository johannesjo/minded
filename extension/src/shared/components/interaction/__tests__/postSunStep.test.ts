import { createPostSunStep } from "../postSunStep";

describe("createPostSunStep", () => {
  let frames: FrameRequestCallback[];
  beforeEach(() => {
    jest.useFakeTimers();
    frames = [];
    global.requestAnimationFrame = (cb: FrameRequestCallback) =>
      frames.push(cb);
  });
  afterEach(() => jest.useRealTimers());

  const setup = (isDisposed = false) => {
    const fading: boolean[] = [];
    const step = createPostSunStep({
      isDisposed: () => isDisposed,
      setIsScreenFading: (v) => fading.push(v),
    });
    return { step, fading };
  };

  it("lets a newer step replace a pending one - never both", () => {
    const { step } = setup();
    const first = jest.fn();
    const second = jest.fn();
    step.after(700, first);
    step.after(700, second);
    jest.advanceTimersByTime(700);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("fades the screen out, swaps once it's gone, then raises it a frame later", () => {
    const { step, fading } = setup();
    const swap = jest.fn();
    step.fadeScreenThen(700, swap);
    expect(fading).toEqual([true]);
    jest.advanceTimersByTime(699);
    expect(swap).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(swap).toHaveBeenCalledTimes(1);
    expect(fading).toEqual([true]);
    frames.forEach((cb) => cb(0));
    expect(fading).toEqual([true, false]);
  });

  it("runs nothing once disposed or cleared", () => {
    const disposed = setup(true);
    const run = jest.fn();
    disposed.step.after(10, run);
    const cleared = setup();
    cleared.step.after(10, run);
    cleared.step.clear();
    jest.advanceTimersByTime(10);
    expect(run).not.toHaveBeenCalled();
  });
});
