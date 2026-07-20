import { readFileSync } from "fs";
import { resolve } from "path";

const readSource = (relativePath: string): string =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");

describe("the live Android wind-down keeps one continuous sun", () => {
  it("routes bedtime through the standard interaction instead of the legacy mini-app", () => {
    const routes = readSource("src/shared/RouteCmp.tsx");
    const androidInteraction = readSource(
      "src/android/interaction/InteractionAndroid.tsx",
    );

    expect(routes).not.toContain("SleepWindDownRoute");
    expect(routes).not.toContain('path="/sleepWindDown"');
    expect(androidInteraction).toContain("<InteractionCommon");
    expect(androidInteraction).not.toMatch(
      /SleepWindDownView|BreathingExercise|BreathSun|<Sun/,
    );
  });

  it("keeps the same InteractionCommon sun mounted for the goodnight settle", () => {
    const interaction = readSource(
      "src/shared/components/interaction/InteractionCommon.tsx",
    );
    const modeSwitch = readSource(
      "src/shared/components/interaction/InteractionModeSwitch.tsx",
    );

    // Count rendered JSX nodes, not explanatory comments that mention `<Sun>`.
    expect(interaction.match(/^\s*<Sun\s*$/gm)).toHaveLength(1);
    expect(interaction).toMatch(
      /getIsSunInFlow\(\)\s*&&\s*!props\.useShellSun[\s\S]*?<Sun\b/,
    );
    expect(interaction).toMatch(
      /getMode\(\)\s*===\s*"WIND_DOWN_SETTLE"[\s\S]*?settleForBedtime\(props\.onDragComplete\)/,
    );
    expect(modeSwitch).toMatch(
      /props\.mode\s*===\s*"WIND_DOWN_SETTLE"[\s\S]*?props\.isBedtimeGoodnight/,
    );
    expect(modeSwitch).not.toMatch(
      /props\.mode\s*===\s*"WIND_DOWN_SETTLE"[\s\S]*?<Sun\b/,
    );
  });
});
