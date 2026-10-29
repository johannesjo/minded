import type { Alternative } from "@src/dataInterface/syncData";
import {
  type AlternativeOpenCapabilities,
  getAlternativeAcceptLabel,
  getAlternativeOpenTarget,
} from "@src/shared/components/interaction/alternatives/alternativeRedirect";
import { getAlternativesForTarget } from "@src/shared/components/interaction/alternatives/getAlternatives";
import { DEFAULT_SYNC_DATA } from "@src/dataInterface/syncData.const";

const alt = (overrides: Partial<Alternative>): Alternative => ({
  id: "a",
  kind: "activity",
  label: "go for a walk",
  createdTS: 0,
  shownCount: 0,
  dismissedCount: 0,
  openedCount: 0,
  ...overrides,
});

const caps = (
  overrides: Partial<AlternativeOpenCapabilities> = {},
): AlternativeOpenCapabilities => ({
  canOpenUrl: true,
  canOpenApp: true,
  ...overrides,
});

describe("getAlternativeOpenTarget", () => {
  it("opens a website alternative as a normalised url", () => {
    expect(
      getAlternativeOpenTarget(
        alt({ kind: "website", label: "wikipedia.org", url: "wikipedia.org" }),
        caps(),
      ),
    ).toEqual({ kind: "url", href: "https://wikipedia.org/" });
  });

  it("does not offer a website it can't open", () => {
    expect(
      getAlternativeOpenTarget(
        alt({ kind: "website", url: "wikipedia.org" }),
        caps({ canOpenUrl: false }),
      ),
    ).toBeUndefined();
    expect(
      getAlternativeOpenTarget(
        alt({ kind: "website", url: "javascript:alert(1)" }),
        caps(),
      ),
    ).toBeUndefined();
  });

  it("hands an app alternative's typed name to the native resolver", () => {
    expect(
      getAlternativeOpenTarget(alt({ kind: "app", label: " Kindle " }), caps()),
    ).toEqual({ kind: "app", label: "Kindle" });
    expect(
      getAlternativeOpenTarget(
        alt({ kind: "app", label: "Kindle" }),
        caps({ canOpenApp: false }),
      ),
    ).toBeUndefined();
  });

  it("has no target for activities and custom lines", () => {
    expect(getAlternativeOpenTarget(alt({}), caps())).toBeUndefined();
    expect(
      getAlternativeOpenTarget(
        alt({ kind: "custom", label: "Call Mum" }),
        caps(),
      ),
    ).toBeUndefined();
  });
});

describe("platform scoping the openers rely on", () => {
  const syncData = {
    ...DEFAULT_SYNC_DATA,
    alternativeWebsites: [],
    alternativeApps: [],
    alternatives: [
      alt({ id: "w", kind: "website", url: "wikipedia.org" }),
      alt({ id: "p", kind: "app", label: "Kindle" }),
    ],
  };
  const kinds = (platform: "web" | "android") =>
    getAlternativesForTarget(syncData, undefined, platform).map((a) => a.kind);

  it("offers websites only on the extension and apps only on Android", () => {
    expect(kinds("web")).toEqual(["website"]);
    expect(kinds("android")).toEqual(["app"]);
  });
});

describe("getAlternativeAcceptLabel", () => {
  it("says Open X for something it will open, Yes otherwise", () => {
    expect(
      getAlternativeAcceptLabel(alt({ kind: "app", label: "Kindle" }), {
        kind: "app",
        label: "Kindle",
      }),
    ).toBe("Open Kindle");
    expect(
      getAlternativeAcceptLabel(
        alt({ kind: "website", label: "wikipedia.org" }),
        {
          kind: "url",
          href: "https://wikipedia.org/",
        },
      ),
    ).toBe("Open wikipedia.org");
    expect(getAlternativeAcceptLabel(alt({}), undefined)).toBe("Yes");
  });
});
