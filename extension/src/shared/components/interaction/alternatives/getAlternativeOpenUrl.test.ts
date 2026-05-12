import type { Alternative } from "@src/dataInterface/syncData";
import { getAlternativeOpenUrl } from "./getAlternativeOpenUrl";

const websiteAlternative = (
  url: string,
  overrides: Partial<Alternative> = {},
): Alternative => ({
  id: "website",
  kind: "website",
  label: "Website",
  url,
  createdTS: 0,
  shownCount: 0,
  dismissedCount: 0,
  openedCount: 0,
  ...overrides,
});

describe("getAlternativeOpenUrl", () => {
  it("keeps http and https URLs", () => {
    expect(
      getAlternativeOpenUrl(websiteAlternative("https://example.com")),
    ).toBe("https://example.com");
    expect(
      getAlternativeOpenUrl(websiteAlternative("http://example.com")),
    ).toBe("http://example.com");
  });

  it("normalizes bare website targets to https URLs", () => {
    expect(getAlternativeOpenUrl(websiteAlternative("example.com"))).toBe(
      "https://example.com",
    );
  });

  it("normalizes host-with-port website targets to https URLs", () => {
    expect(getAlternativeOpenUrl(websiteAlternative("localhost:3000"))).toBe(
      "https://localhost:3000",
    );
    expect(
      getAlternativeOpenUrl(websiteAlternative("example.com:8080/path")),
    ).toBe("https://example.com:8080/path");
  });

  it("rejects non-http schemes", () => {
    expect(
      getAlternativeOpenUrl(websiteAlternative("javascript:alert(1)")),
    ).toBeUndefined();
    expect(
      getAlternativeOpenUrl(websiteAlternative("file:///tmp/a")),
    ).toBeUndefined();
  });

  it("does not return open URLs for non-website alternatives", () => {
    expect(
      getAlternativeOpenUrl(
        websiteAlternative("https://example.com", {
          kind: "custom",
        }),
      ),
    ).toBeUndefined();
  });
});
