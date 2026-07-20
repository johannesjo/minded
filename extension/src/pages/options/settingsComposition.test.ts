import { readFileSync } from "fs";
import { resolve } from "path";
import { DEFAULT_SYNC_DATA } from "@src/dataInterface/syncData.const";
import type { SyncData, UserCfg } from "@src/dataInterface/syncData";

const readSource = (relativePath: string): string =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");

describe("settings composition", () => {
  it("renders both settings pages with defaults when hydration rejects", async () => {
    const { resolveSettingsCfg } = jest.requireActual<{
      resolveSettingsCfg: (
        readSyncData: () => Promise<SyncData>,
      ) => Promise<UserCfg>;
    }>("@src/shared/components/settings/settingsHydration");

    await expect(
      resolveSettingsCfg(() =>
        Promise.reject(new Error("storage unavailable")),
      ),
    ).resolves.toEqual(DEFAULT_SYNC_DATA.cfg);

    const settingsPages = [
      readSource("src/pages/options/Options.tsx"),
      readSource(
        "src/android/components/settingsAndroid/SettingsAndroidRoute.tsx",
      ),
    ];

    for (const page of settingsPages) {
      expect(page).toMatch(
        /setCfg\(\s*await resolveSettingsCfg\(getSyncData\)\s*\)/,
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

    expect(androidSettings).toContain("getSyncData");
    expect(androidSettings).toContain("initialSoundEnabled");
    expect(androidSettings).toContain("initialGrace");
    expect(androidSettings).toContain("initialSchedule");
    expect(androidSettings).toContain("initialCfg");
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

    expect(soundSettings).toContain("Completion sound");
    expect(graceSettings).toContain("Grace period");
    expect(focusSettings).toContain("Active hours");
    expect(windDownSettings).toContain("Sleep wind-down");
  });
});
