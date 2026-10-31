import { sortAppsForPicker } from "../sortAppsForPicker";

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
});
