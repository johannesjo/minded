import {
  SCROLL_FALLBACK_MS,
  waitForNaturalBreak,
  type NaturalBreakEnv,
} from "@src/shared/components/interaction/naturalBreak";

const createEnv = (href = "https://example.com/feed") => {
  const target = new EventTarget();
  const doc = Object.assign(new EventTarget(), {
    visibilityState: "visible",
  });
  let currentHref = href;
  const env: NaturalBreakEnv = {
    target,
    doc,
    getHref: () => currentHref,
    setInterval: (fn, ms) => setInterval(fn, ms),
    clearInterval: (id) => clearInterval(id as NodeJS.Timeout),
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (id) => clearTimeout(id as NodeJS.Timeout),
  };
  return {
    env,
    navigate: (next: string) => {
      currentHref = next;
    },
    dispatch: (type: string, init: Record<string, unknown> = {}) =>
      target.dispatchEvent(Object.assign(new Event(type), init)),
    setVisibility: (state: "visible" | "hidden") => {
      doc.visibilityState = state;
      doc.dispatchEvent(new Event("visibilitychange"));
    },
  };
};

describe("waitForNaturalBreak", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("arrives when the user moves to another page", () => {
    const { env, navigate } = createEnv();
    const onBreak = jest.fn();
    waitForNaturalBreak(onBreak, { env });

    jest.advanceTimersByTime(5000);
    expect(onBreak).not.toHaveBeenCalled();

    navigate("https://example.com/post/1");
    jest.advanceTimersByTime(1000);
    expect(onBreak).toHaveBeenCalledTimes(1);
  });

  it("arrives on back/forward navigation without waiting for the poll", () => {
    const { env, navigate, dispatch } = createEnv();
    const onBreak = jest.fn();
    waitForNaturalBreak(onBreak, { env });

    navigate("https://example.com/previous");
    dispatch("popstate");
    expect(onBreak).toHaveBeenCalledTimes(1);
  });

  it("does not treat jumping to a heading on the same page as a new page", () => {
    const { env, navigate } = createEnv("https://example.com/article");
    const onBreak = jest.fn();
    waitForNaturalBreak(onBreak, { env });

    navigate("https://example.com/article#part-2");
    jest.advanceTimersByTime(2000);
    expect(onBreak).not.toHaveBeenCalled();
  });

  it("lets the user read: scrolling is not a break at first", () => {
    const { env, dispatch } = createEnv();
    const onBreak = jest.fn();
    waitForNaturalBreak(onBreak, { env });

    jest.advanceTimersByTime(SCROLL_FALLBACK_MS - 1000);
    dispatch("wheel");
    dispatch("touchmove");
    expect(onBreak).not.toHaveBeenCalled();
  });

  it("meets a feed that never changes page at the next scroll after a while", () => {
    const { env, dispatch } = createEnv();
    const onBreak = jest.fn();
    waitForNaturalBreak(onBreak, { env });

    jest.advanceTimersByTime(SCROLL_FALLBACK_MS);
    expect(onBreak).not.toHaveBeenCalled();

    dispatch("touchmove");
    expect(onBreak).toHaveBeenCalledTimes(1);
  });

  it("counts scroll keys, but not typing a space into a text field", () => {
    const { env, dispatch } = createEnv();
    const onBreak = jest.fn();
    waitForNaturalBreak(onBreak, { env });
    jest.advanceTimersByTime(SCROLL_FALLBACK_MS);

    const field = { tagName: "TEXTAREA" };
    const typing = Object.assign(new Event("keydown"), { key: " " });
    Object.defineProperty(typing, "target", { value: field });
    env.target.dispatchEvent(typing);
    dispatch("keydown", { key: "a" });
    expect(onBreak).not.toHaveBeenCalled();

    dispatch("keydown", { key: "PageDown" });
    expect(onBreak).toHaveBeenCalledTimes(1);
  });

  it("arrives when the user comes back to the tab, not when they leave it", () => {
    const { env, setVisibility } = createEnv();
    const onBreak = jest.fn();
    waitForNaturalBreak(onBreak, { env });

    setVisibility("hidden");
    expect(onBreak).not.toHaveBeenCalled();

    setVisibility("visible");
    expect(onBreak).toHaveBeenCalledTimes(1);
  });

  it("fires only once", () => {
    const { env, navigate, dispatch, setVisibility } = createEnv();
    const onBreak = jest.fn();
    waitForNaturalBreak(onBreak, { env });

    navigate("https://example.com/other");
    dispatch("popstate");
    setVisibility("hidden");
    setVisibility("visible");
    jest.advanceTimersByTime(SCROLL_FALLBACK_MS);
    dispatch("wheel");

    expect(onBreak).toHaveBeenCalledTimes(1);
  });

  it("never fires once cancelled", () => {
    const { env, navigate, dispatch } = createEnv();
    const onBreak = jest.fn();
    const cancel = waitForNaturalBreak(onBreak, { env });

    cancel();
    navigate("https://example.com/other");
    jest.advanceTimersByTime(SCROLL_FALLBACK_MS + 1000);
    dispatch("wheel");

    expect(onBreak).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });
});
