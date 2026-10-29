import type { Alternative } from "@src/dataInterface/syncData";
import {
  type AlternativeOpenCapabilities,
  findInstalledApp,
  getAlternativeAcceptLabel,
  getAlternativeOpenTarget,
} from "@src/shared/components/interaction/alternatives/alternativeRedirect";

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

const APPS = [
  { packageName: "com.amazon.kindle", name: "Kindle" },
  { packageName: "org.wikipedia", name: "Wikipedia" },
];

const caps = (
  overrides: Partial<AlternativeOpenCapabilities> = {},
): AlternativeOpenCapabilities => ({
  canOpenUrl: true,
  canOpenApp: true,
  getInstalledApps: () => APPS,
  ...overrides,
});

describe("findInstalledApp", () => {
  it("matches the typed label case- and space-insensitively", () => {
    expect(findInstalledApp("  kindle ", APPS)?.packageName).toBe(
      "com.amazon.kindle",
    );
  });

  it("never guesses: no partial match, no ambiguous match", () => {
    expect(findInstalledApp("Kind", APPS)).toBeUndefined();
    expect(findInstalledApp("", APPS)).toBeUndefined();
    expect(
      findInstalledApp("Notes", [
        { packageName: "a.notes", name: "Notes" },
        { packageName: "b.notes", name: "notes" },
      ]),
    ).toBeUndefined();
  });
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

  it("does not offer a website it can't open on this platform", () => {
    const website = alt({ kind: "website", url: "wikipedia.org" });
    expect(
      getAlternativeOpenTarget(website, caps({ canOpenUrl: false })),
    ).toBeUndefined();
    expect(
      getAlternativeOpenTarget(
        alt({ kind: "website", url: "javascript:alert(1)" }),
        caps(),
      ),
    ).toBeUndefined();
  });

  it("resolves an app alternative to an installed package", () => {
    expect(
      getAlternativeOpenTarget(alt({ kind: "app", label: "Kindle" }), caps()),
    ).toEqual({ kind: "app", packageName: "com.amazon.kindle" });
  });

  it("prefers a stored package and skips the installed-app read", () => {
    const getInstalledApps = jest.fn(() => APPS);
    expect(
      getAlternativeOpenTarget(
        alt({ kind: "app", label: "Reader", packageName: "com.reader" }),
        caps({ getInstalledApps }),
      ),
    ).toEqual({ kind: "app", packageName: "com.reader" });
    expect(getInstalledApps).not.toHaveBeenCalled();
  });

  it("has no target for apps it can't find or can't launch", () => {
    expect(
      getAlternativeOpenTarget(alt({ kind: "app", label: "Chess" }), caps()),
    ).toBeUndefined();
    const getInstalledApps = jest.fn(() => APPS);
    expect(
      getAlternativeOpenTarget(
        alt({ kind: "app", label: "Kindle" }),
        caps({ canOpenApp: false, getInstalledApps }),
      ),
    ).toBeUndefined();
    expect(getInstalledApps).not.toHaveBeenCalled();
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

describe("getAlternativeAcceptLabel", () => {
  it("says Open X only when it will really open X", () => {
    const kindle = alt({ kind: "app", label: "Kindle" });
    expect(
      getAlternativeAcceptLabel(kindle, {
        kind: "app",
        packageName: "com.amazon.kindle",
      }),
    ).toBe("Open Kindle");
    expect(getAlternativeAcceptLabel(kindle, undefined)).toBe("Yes");
  });
});
