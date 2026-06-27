import {
  displayTargetName,
  withTargetName,
  MAX_TARGET_NAME_LEN,
} from "../displayTargetName";

describe("displayTargetName", () => {
  it("returns undefined when there is no target or id", () => {
    expect(displayTargetName(undefined)).toBeUndefined();
    expect(displayTargetName({ kind: "host", id: "" })).toBeUndefined();
    expect(displayTargetName({ kind: "host", id: "   " })).toBeUndefined();
  });

  it("strips scheme, www. and path from hosts", () => {
    expect(
      displayTargetName({ kind: "host", id: "https://www.reddit.com" }),
    ).toBe("reddit.com");
    expect(
      displayTargetName({ kind: "host", id: "reddit.com/r/all?x=1" }),
    ).toBe("reddit.com");
  });

  it("aggressively truncates long names with an ellipsis", () => {
    const long = "really-long-subdomain.example.co.uk";
    const out = displayTargetName({ kind: "host", id: long })!;
    expect(out.length).toBe(MAX_TARGET_NAME_LEN);
    expect(out.endsWith("…")).toBe(true);
  });

  it("leaves short app labels untouched", () => {
    expect(displayTargetName({ kind: "app", id: "Instagram" })).toBe(
      "Instagram",
    );
  });
});

describe("withTargetName", () => {
  it("swaps the generic referent for the real name", () => {
    expect(
      withTargetName("Why are you visiting this website", "reddit.com"),
    ).toBe("Why are you visiting reddit.com");
    expect(withTargetName("Instead of using this app, ...", "Instagram")).toBe(
      "Instead of using Instagram, ...",
    );
  });

  it("falls back to the generic wording when no name is known", () => {
    const txt = "Why are you visiting this website";
    expect(withTargetName(txt, undefined)).toBe(txt);
    expect(withTargetName(txt, "")).toBe(txt);
  });
});
