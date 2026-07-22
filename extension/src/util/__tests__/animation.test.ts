import { fadeOut } from "../animation";

describe("fadeOut", () => {
  const runtime = globalThis as unknown as {
    window?: Pick<Window, "matchMedia" | "requestAnimationFrame">;
  };
  const originalWindow = runtime.window;

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
    if (originalWindow) runtime.window = originalWindow;
    else delete runtime.window;
  });

  it("removes visual duration and delay when reduced motion is requested", async () => {
    jest.useFakeTimers();
    runtime.window = {
      matchMedia: jest.fn().mockReturnValue({ matches: true }),
      requestAnimationFrame: jest.fn().mockImplementation((callback) => {
        callback(0);
        return 1;
      }),
    } as unknown as Pick<Window, "matchMedia" | "requestAnimationFrame">;
    const element = {
      style: { opacity: "", transition: "", transitionDelay: "" },
    } as HTMLElement;

    const result = fadeOut(element, 800, 200);

    expect(element.style.transition).toBe("none");
    expect(element.style.transitionDelay).toBe("");
    expect(element.style.opacity).toBe("0");
    expect(result.frameNr).toBe(0);
    expect(jest.getTimerCount()).toBe(0);
    await expect(result.promise).resolves.toBeUndefined();
  });
});
