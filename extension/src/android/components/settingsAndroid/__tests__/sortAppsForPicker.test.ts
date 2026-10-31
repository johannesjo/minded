import { filterAppsForPicker, sortAppsForPicker } from "../sortAppsForPicker";

const app = (packageName: string, name: string) => ({ packageName, name });

describe("sortAppsForPicker", () => {
  it("lifts the usual feed apps above the rest, keeping each group's native A-Z order", () => {
    const apps = [
      app("com.adobe.scan.android", "Adobe Scan"),
      app("com.instagram.android", "Instagram"),
      app("com.bank.app", "My Bank"),
      app("com.reddit.frontpage", "Reddit"),
      app("com.zhiliaoapp.musically", "TikTok"),
      app("com.whatsapp", "WhatsApp"),
    ];

    expect(sortAppsForPicker(apps).map((a) => a.name)).toEqual([
      "Instagram",
      "Reddit",
      "TikTok",
      "Adobe Scan",
      "My Bank",
      "WhatsApp",
    ]);
  });

  it("leaves a list with no feed apps untouched", () => {
    const apps = [app("a.b", "Alpha"), app("c.d", "Beta")];
    expect(sortAppsForPicker(apps)).toEqual(apps);
  });

  it("puts the already-chosen apps first, then feed apps, then the rest", () => {
    const apps = [
      app("com.adobe.scan.android", "Adobe Scan"),
      app("com.instagram.android", "Instagram"),
      app("com.bank.app", "My Bank"),
      app("com.reddit.frontpage", "Reddit"),
      app("com.whatsapp", "WhatsApp"),
    ];

    expect(
      sortAppsForPicker(apps, ["com.whatsapp", "com.reddit.frontpage"]).map(
        (a) => a.name,
      ),
    ).toEqual(["Reddit", "WhatsApp", "Instagram", "Adobe Scan", "My Bank"]);
  });
});

describe("filterAppsForPicker", () => {
  const apps = [
    app("a", "Instagram"),
    app("b", "My Bank"),
    app("c", "Insta Lite"),
  ];

  it("matches names case-insensitively, anywhere in the name", () => {
    expect(filterAppsForPicker(apps, " inSTA ").map((a) => a.name)).toEqual([
      "Instagram",
      "Insta Lite",
    ]);
    expect(filterAppsForPicker(apps, "bank").map((a) => a.name)).toEqual([
      "My Bank",
    ]);
  });

  it("keeps every app for an empty query", () => {
    expect(filterAppsForPicker(apps, "  ")).toBe(apps);
  });
});
