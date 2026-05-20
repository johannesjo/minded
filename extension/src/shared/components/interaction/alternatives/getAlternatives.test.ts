import type { Alternative } from "@src/dataInterface/syncData";
import { createMockSyncData } from "@src/test-utils/mockHelpers";
import {
  beautifyAlternativeUrl,
  createUserAppAlternative,
  createUserWebsiteAlternative,
  getAlternativesForTarget,
  getWebsiteAlternativeHref,
} from "./getAlternatives";

const websiteAlternative = (url: string): Alternative => ({
  id: `web:${url}`,
  kind: "website",
  label: "Example",
  url,
  createdTS: 0,
  shownCount: 0,
  dismissedCount: 0,
  openedCount: 0,
});

describe("getAlternativesForTarget", () => {
  it("normalizes legacy website alternatives with deterministic IDs", () => {
    expect(
      getAlternativesForTarget(
        createMockSyncData({
          alternativeWebsites: ["https://www.example.com/"],
        }),
        { kind: "host", id: "reddit.com" },
        "web",
      ),
    ).toEqual([
      {
        id: "legacy-web:https://www.example.com/",
        kind: "website",
        label: "example.com",
        url: "https://www.example.com/",
        createdTS: 0,
        shownCount: 0,
        dismissedCount: 0,
        openedCount: 0,
      },
    ]);
  });

  it("normalizes legacy app alternatives with deterministic IDs", () => {
    expect(
      getAlternativesForTarget(
        createMockSyncData({
          alternativeApps: ["Reader"],
          alternativeWebsites: ["https://example.com"],
        }),
        { kind: "app", id: "com.social.app" },
        "android",
      ),
    ).toEqual([
      {
        id: "legacy-app:Reader",
        kind: "app",
        label: "Reader",
        createdTS: 0,
        shownCount: 0,
        dismissedCount: 0,
        openedCount: 0,
      },
    ]);
  });

  it("keeps structured alternatives ahead of legacy fallback entries", () => {
    const structured: Alternative = {
      id: "structured",
      kind: "website",
      label: "Structured",
      url: "https://structured.example",
      createdTS: 100,
      shownCount: 1,
      dismissedCount: 0,
      openedCount: 0,
    };

    expect(
      getAlternativesForTarget(
        createMockSyncData({
          alternatives: [structured],
          alternativeWebsites: ["https://legacy.example"],
        }),
        { kind: "host", id: "reddit.com" },
        "web",
      ),
    ).toEqual([
      structured,
      {
        id: "legacy-web:https://legacy.example",
        kind: "website",
        label: "legacy.example",
        url: "https://legacy.example",
        createdTS: 0,
        shownCount: 0,
        dismissedCount: 0,
        openedCount: 0,
      },
    ]);
  });

  it("does not duplicate a legacy entry once stats created a structured copy", () => {
    const structuredLegacyCopy: Alternative = {
      id: "legacy-web:https://example.com",
      kind: "website",
      label: "example.com",
      url: "https://example.com",
      createdTS: 0,
      lastShownTS: 100,
      shownCount: 1,
      dismissedCount: 0,
      openedCount: 0,
    };

    expect(
      getAlternativesForTarget(
        createMockSyncData({
          alternatives: [structuredLegacyCopy],
          alternativeWebsites: ["https://example.com"],
        }),
        { kind: "host", id: "reddit.com" },
        "web",
      ),
    ).toEqual([structuredLegacyCopy]);
  });

  it("keeps custom alternatives available in website and app scopes", () => {
    const custom: Alternative = {
      id: "custom",
      kind: "custom",
      label: "Stretch",
      createdTS: 100,
      shownCount: 0,
      dismissedCount: 0,
      openedCount: 0,
    };
    const syncData = createMockSyncData({ alternatives: [custom] });

    expect(
      getAlternativesForTarget(
        syncData,
        { kind: "host", id: "reddit.com" },
        "web",
      ),
    ).toEqual([custom]);
    expect(
      getAlternativesForTarget(
        syncData,
        { kind: "app", id: "com.social.app" },
        "android",
      ),
    ).toEqual([custom]);
  });
});

describe("beautifyAlternativeUrl", () => {
  it("removes protocol, www prefix, and one trailing slash", () => {
    expect(beautifyAlternativeUrl("https://www.example.com/")).toBe(
      "example.com",
    );
  });
});

describe("website alternative links", () => {
  it("normalizes website alternatives to safe http links", () => {
    expect(
      getWebsiteAlternativeHref(websiteAlternative("example.com/read")),
    ).toBe("https://example.com/read");
    expect(
      getWebsiteAlternativeHref(websiteAlternative("http://example.com")),
    ).toBe("http://example.com/");
    expect(
      getWebsiteAlternativeHref(websiteAlternative("localhost:3000")),
    ).toBe("https://localhost:3000/");
    expect(
      getWebsiteAlternativeHref(websiteAlternative("example.com:8080/path")),
    ).toBe("https://example.com:8080/path");
  });

  it("does not create hrefs for app alternatives or unsafe protocols", () => {
    expect(
      getWebsiteAlternativeHref({
        id: "app",
        kind: "app",
        label: "Reader",
        createdTS: 0,
        shownCount: 0,
        dismissedCount: 0,
        openedCount: 0,
      }),
    ).toBeUndefined();
    expect(
      getWebsiteAlternativeHref(websiteAlternative("javascript:alert(1)")),
    ).toBeUndefined();
    expect(
      getWebsiteAlternativeHref(websiteAlternative("javascript:1")),
    ).toBeUndefined();
    expect(
      getWebsiteAlternativeHref(websiteAlternative("file:///tmp/example")),
    ).toBeUndefined();
    expect(
      getWebsiteAlternativeHref(websiteAlternative("file:1")),
    ).toBeUndefined();
  });
});

describe("user alternative factories", () => {
  it("creates structured website alternatives with legacy-compatible IDs", () => {
    expect(
      createUserWebsiteAlternative(" https://www.example.com/ ", 123),
    ).toEqual({
      id: "legacy-web:https://www.example.com/",
      kind: "website",
      label: "example.com",
      url: "https://www.example.com/",
      createdTS: 123,
      shownCount: 0,
      dismissedCount: 0,
      openedCount: 0,
    });
  });

  it("creates structured app alternatives with legacy-compatible IDs", () => {
    expect(createUserAppAlternative(" Reader ", 123)).toEqual({
      id: "legacy-app:Reader",
      kind: "app",
      label: "Reader",
      createdTS: 123,
      shownCount: 0,
      dismissedCount: 0,
      openedCount: 0,
    });
  });
});
