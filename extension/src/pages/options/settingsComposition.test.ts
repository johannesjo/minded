import { readFileSync } from "fs";
import { resolve } from "path";
import { DEFAULT_SYNC_DATA } from "@src/dataInterface/syncData.const";
import type { SyncData, UserCfg } from "@src/dataInterface/syncData";

const readSource = (relativePath: string): string =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");

describe("settings composition", () => {
  it("renders both settings pages with defaults when hydration rejects", async () => {
    const { resolveSettingsSnapshot } = jest.requireActual<{
      resolveSettingsSnapshot: (
        readSyncData: () => Promise<SyncData>,
        platform: "web" | "android" | "ios",
      ) => Promise<{
        cfg: UserCfg;
        alternatives: unknown[];
        customQuestions: unknown[];
      }>;
    }>("@src/shared/components/settings/settingsHydration");

    await expect(
      resolveSettingsSnapshot(
        () => Promise.reject(new Error("storage unavailable")),
        "web",
      ),
    ).resolves.toEqual({
      cfg: DEFAULT_SYNC_DATA.cfg,
      alternatives: [],
      customQuestions: [],
    });

    const settingsPages = [
      readSource("src/pages/options/Options.tsx"),
      readSource(
        "src/android/components/settingsAndroid/SettingsAndroidRoute.tsx",
      ),
    ];

    for (const page of settingsPages) {
      expect(page).toMatch(
        /setSettings\(\s*await resolveSettingsSnapshot\(\s*getSyncData,\s*"(?:web|android)",?\s*\)\s*\)/,
      );
    }
  });

  it("hydrates shared settings once at each page boundary", () => {
    const webSettings = readSource("src/pages/options/Options.tsx");
    const androidSettings = readSource(
      "src/android/components/settingsAndroid/SettingsAndroidRoute.tsx",
    );

    expect(webSettings).toContain("getSyncData");
    expect(webSettings).toContain("initialSoundEnabled");
    expect(webSettings).toContain("initialGrace");
    expect(webSettings).toContain("initialSchedule");
    expect(webSettings).toContain("initialAlternatives");
    expect(webSettings).toContain("initialCustomQuestions");

    expect(androidSettings).toContain("getSyncData");
    expect(androidSettings).toContain("initialSoundEnabled");
    expect(androidSettings).toContain("initialGrace");
    expect(androidSettings).toContain("initialSchedule");
    expect(androidSettings).toContain("initialAlternatives");
    expect(androidSettings).toContain("initialCustomQuestions");
    expect(androidSettings).toContain("initial.cfg");

    // One read per page: every section is fed from the same snapshot, so no
    // section may reach for storage again on its own.
    for (const page of [webSettings, androidSettings]) {
      expect(page.match(/getSyncData/g)).toHaveLength(2);
    }
  });

  it("uses sentence-case section headings", () => {
    const soundSettings = readSource(
      "src/shared/components/settings/SoundSettings.tsx",
    );
    const graceSettings = readSource(
      "src/shared/components/settings/SessionGraceSettings.tsx",
    );
    const focusSettings = readSource(
      "src/shared/components/settings/FocusSchedule.tsx",
    );
    const windDownSettings = readSource(
      "src/shared/components/settings/SleepWindDownSettings.tsx",
    );
    const alternativesSettings = readSource(
      "src/shared/components/settings/AlternativesSettings.tsx",
    );
    const customQuestionsSettings = readSource(
      "src/shared/components/settings/CustomQuestionsSettings.tsx",
    );

    expect(soundSettings).toContain("Completion sound");
    expect(graceSettings).toContain("Grace period");
    expect(focusSettings).toContain("Active hours");
    expect(windDownSettings).toContain("Sleep wind-down");
    // Both platform wordings - the heading echoes the question the user was
    // actually asked, rather than the code's word ("alternatives").
    expect(alternativesSettings).toContain("What to open instead");
    expect(alternativesSettings).toContain("Where to go instead");
    expect(customQuestionsSettings).toContain("Your own questions");
  });

  it("uses a quiet single-column composition for Web settings", () => {
    const pageStyles = readSource("src/pages/options/Options.module.scss");
    const websiteComponent = readSource(
      "src/pages/newtab/components/onboardingWeb/WebsiteList.tsx",
    );
    const websiteStyles = readSource(
      "src/pages/newtab/components/onboardingWeb/WebsiteList.module.scss",
    );
    const sharedSettingStyles = [
      readSource("src/shared/components/settings/SoundSettings.module.scss"),
      readSource(
        "src/shared/components/settings/SessionGraceSettings.module.scss",
      ),
      readSource("src/shared/components/settings/FocusSchedule.module.scss"),
      readSource(
        "src/shared/components/settings/AlternativesSettings.module.scss",
      ),
      readSource(
        "src/shared/components/settings/CustomQuestionsSettings.module.scss",
      ),
    ];

    expect(pageStyles).toMatch(/\.Options\s*\{[\s\S]*max-width:\s*680px/);
    expect(pageStyles).toMatch(
      /\.Options\s*\{[\s\S]*--settings-header-justify:\s*space-between/,
    );
    expect(pageStyles).toMatch(/\.header\s*\{[\s\S]*text-align:\s*left/);
    expect(pageStyles).toMatch(/\.sections\s*\{[\s\S]*gap:\s*0/);
    expect(pageStyles).toMatch(/:global\(\.h3\)\s*\{[\s\S]*font-weight:\s*500/);

    expect(websiteComponent).toContain(
      "[styles.settingsLayout]: props.showSaveButton === false",
    );
    expect(websiteStyles).toMatch(
      /\.WebsiteListItems\s*\{[\s\S]*display:\s*grid[\s\S]*grid-template-columns/,
    );
    expect(websiteStyles).toMatch(
      /\.settingsLayout\s*\{[\s\S]*\.WebsiteListItems\s*\{[\s\S]*display:\s*flex[\s\S]*flex-direction:\s*column/,
    );
    expect(websiteStyles).toMatch(
      /\.settingsLayout\s*\{[\s\S]*>\s*div\s*\{[\s\S]*border-bottom:\s*1px solid/,
    );

    for (const styles of sharedSettingStyles) {
      expect(styles).toContain("var(--settings-header-justify");
      expect(styles).toContain("var(--settings-text-align");
    }
  });
});
