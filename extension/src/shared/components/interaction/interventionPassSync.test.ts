jest.mock("@src/util/browser", () => ({ bro: {} }));

import {
  announceInterventionPassed,
  isPassedInOtherTab,
  onInterventionPassedInOtherTab,
} from "./interventionPassSync";

const SHOWN_AT = 1_000_000;
const passed = (over: Record<string, unknown> = {}) => ({
  host: "youtube.com",
  ts: SHOWN_AT + 30_000,
  tabToken: "other",
  ...over,
});
const check = (value: unknown) =>
  isPassedInOtherTab(value, {
    host: "youtube.com",
    ownTabToken: "mine",
    shownSinceTS: SHOWN_AT,
  });

describe("isPassedInOtherTab", () => {
  it("takes a pass from another tab on the same site after the pause showed", () => {
    expect(check(passed())).toBe(true);
  });

  it("ignores this tab's own pass", () => {
    expect(check(passed({ tabToken: "mine" }))).toBe(false);
  });

  it("ignores a pass on a different site", () => {
    expect(check(passed({ host: "reddit.com" }))).toBe(false);
  });

  it("ignores a pass from before this pause appeared", () => {
    // e.g. written back by an old updateHostsEntry read, or a skip that
    // happened before this page loaded.
    expect(check(passed({ ts: SHOWN_AT - 1 }))).toBe(false);
  });

  it("ignores a removed or malformed value", () => {
    expect(check(undefined)).toBe(false);
    expect(check("youtube.com")).toBe(false);
    expect(check(passed({ ts: "soon" }))).toBe(false);
  });
});

describe("onInterventionPassedInOtherTab", () => {
  type StorageListener = (
    changes: Record<string, { newValue?: unknown }>,
    areaName: string,
  ) => void;

  const setup = () => {
    let storageListener: StorageListener | undefined;
    let visibilityListener: (() => void) | undefined;
    let stored: Record<string, unknown> = {};
    const bro = jest.requireMock("@src/util/browser").bro;
    bro.storage = {
      onChanged: {
        addListener: (l: StorageListener) => (storageListener = l),
        removeListener: (l: StorageListener) => {
          if (storageListener === l) storageListener = undefined;
        },
      },
      local: {
        get: async () => stored,
        set: async (v: Record<string, unknown>) => {
          stored = { ...stored, ...v };
        },
      },
    };
    const doc = {
      hidden: true,
      addEventListener: (_: string, l: () => void) => (visibilityListener = l),
      removeEventListener: (_: string, l: () => void) => {
        if (visibilityListener === l) visibilityListener = undefined;
      },
    };
    (globalThis as { document?: unknown }).document = doc;
    return {
      fireStorage: (value: unknown, area = "local") =>
        storageListener?.({ interventionPassed: { newValue: value } }, area),
      returnToTab: () => {
        doc.hidden = false;
        visibilityListener?.();
      },
      setStored: (value: unknown) => {
        stored = { interventionPassed: value };
      },
      getStored: () => stored.interventionPassed,
      isListening: () => !!storageListener || !!visibilityListener,
    };
  };

  const flush = () => new Promise((r) => setTimeout(r, 0));
  const otherTabPass = (host = "youtube.com") => ({
    host,
    ts: Date.now() + 1000,
    tabToken: "other",
  });

  afterEach(() => {
    delete (globalThis as { document?: unknown }).document;
  });

  it("follows a pass from another tab on the same site", () => {
    const env = setup();
    const onPassed = jest.fn();
    onInterventionPassedInOtherTab("youtube.com", () => 0, onPassed);

    env.fireStorage(otherTabPass("reddit.com"));
    env.fireStorage(otherTabPass(), "sync");
    expect(onPassed).not.toHaveBeenCalled();

    env.fireStorage(otherTabPass());
    expect(onPassed).toHaveBeenCalledTimes(1);
  });

  it("ignores the pass this tab announced itself", async () => {
    const env = setup();
    const onPassed = jest.fn();
    onInterventionPassedInOtherTab("youtube.com", () => 0, onPassed);

    announceInterventionPassed("youtube.com");
    await flush();
    env.fireStorage(env.getStored());
    expect(onPassed).not.toHaveBeenCalled();
  });

  it("picks up a pass it missed when the tab is shown again", async () => {
    const env = setup();
    const onPassed = jest.fn();
    onInterventionPassedInOtherTab("youtube.com", () => 0, onPassed);

    env.setStored(otherTabPass());
    env.returnToTab();
    await flush();
    expect(onPassed).toHaveBeenCalledTimes(1);
  });

  it("stops listening once unsubscribed", () => {
    const env = setup();
    const stop = onInterventionPassedInOtherTab(
      "youtube.com",
      () => 0,
      jest.fn(),
    );
    stop();
    expect(env.isListening()).toBe(false);
  });
});

describe("announceInterventionPassed", () => {
  it("never throws, even when storage throws synchronously", () => {
    const bro = jest.requireMock("@src/util/browser").bro;
    const consoleError = jest.spyOn(console, "error").mockImplementation();
    bro.storage = {
      local: {
        set: () => {
          throw new Error("Extension context invalidated");
        },
      },
    };
    expect(() => announceInterventionPassed("youtube.com")).not.toThrow();
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
