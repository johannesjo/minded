import {
  createSleepWindDownDismissTransition,
  SLEEP_WIND_DOWN_EXIT_FADE_MS,
} from "../sleepWindDownDismissTransition";

describe("createSleepWindDownDismissTransition", () => {
  it("waits for the wind-down wrapper to fade before dismissing", async () => {
    let resolveFade: () => void = () => undefined;
    const fadePromise = new Promise<void>((resolve) => {
      resolveFade = resolve;
    });
    const wrapperEl = { style: {} } as HTMLElement;
    const fade = jest.fn(() => ({ promise: fadePromise }));
    const onDismiss = jest.fn();

    const dismiss = createSleepWindDownDismissTransition({
      getWrapperEl: () => wrapperEl,
      onDismiss,
      fade,
    });

    const dismissal = dismiss("done");

    expect(fade).toHaveBeenCalledWith(wrapperEl, SLEEP_WIND_DOWN_EXIT_FADE_MS);
    expect(onDismiss).not.toHaveBeenCalled();

    resolveFade();
    await dismissal;

    expect(onDismiss).toHaveBeenCalledWith("done");
  });

  it("dismisses once when completion callbacks fire more than once", async () => {
    const fade = jest.fn(() => ({ promise: Promise.resolve() }));
    const onDismiss = jest.fn();

    const dismiss = createSleepWindDownDismissTransition({
      getWrapperEl: () => ({ style: {} }) as HTMLElement,
      onDismiss,
      fade,
    });

    await Promise.all([dismiss("done"), dismiss("done")]);

    expect(fade).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("still dismisses when no wrapper element has mounted", async () => {
    const fade = jest.fn(() => ({ promise: Promise.resolve() }));
    const onDismiss = jest.fn();

    const dismiss = createSleepWindDownDismissTransition({
      getWrapperEl: () => undefined,
      onDismiss,
      fade,
    });

    await dismiss("snooze");

    expect(fade).not.toHaveBeenCalled();
    expect(onDismiss).toHaveBeenCalledWith("snooze");
  });
});
