import { readFileSync } from "fs";
import { resolve } from "path";

const component = readFileSync(
  resolve(__dirname, "../DashboardGroups.tsx"),
  "utf8",
);
const styles = readFileSync(
  resolve(__dirname, "../DashboardGroups.module.scss"),
  "utf8",
);
const normalizedComponent = component.replace(/\s+/g, " ");

describe("collapsed dashboard presentation", () => {
  it("places passive quote, energy, and emotion greetings directly on the sky", () => {
    expect(component).toMatch(
      /PASSIVE_HERO_TYPES[\s\S]*DashboardGroupType\.Quote[\s\S]*DashboardGroupType\.EnergyLvl[\s\S]*DashboardGroupType\.EmotionLabeling/,
    );
    expect(component).toContain('["cardDashboard"]: !isSkyGreeting');
    expect(component).toContain("[styles.skyGreeting]: isSkyGreeting");
  });

  it("keeps a sole energy or emotion greeting navigable without making quotes interactive", () => {
    expect(normalizedComponent).toContain(
      "const isInteractive = createDashboardCardInteractivity({",
    );
    expect(normalizedComponent).toContain(
      "getGroupCount: () => getDashboardGroups().length,",
    );
  });

  it("keeps a distinct, uncarded hero-greeting layout", () => {
    expect(styles).toContain(".skyGreeting");
  });

  it("offers one calm primary daily action and an easy secondary exit", () => {
    expect(normalizedComponent).toMatch(
      /<Btn voice onClick=\{\(\) => navigate\("\/dailyQuestions"\)\}>\s*stay a moment\s*<\/Btn>/,
    );
    expect(normalizedComponent).toMatch(
      /<Btn soft onClick=\{\(\) => removeDailyQuestionsBanner\(\)\}>\s*not now\s*<\/Btn>/,
    );
  });

  it("stacks daily invitation actions on narrow phones while preserving tap height", () => {
    expect(styles).toMatch(
      /\.cardDailyQuestionsBtns\s*\{[\s\S]*@media \(max-width: 360px\)\s*\{[\s\S]*grid-template-columns: 1fr;/,
    );
    expect(styles).toMatch(
      /@media \(max-width: 360px\)[\s\S]*button\s*\{[\s\S]*min-height: 44px;[\s\S]*margin: 0;/,
    );
  });

  it("names the history route 'look back' without an expansion chevron", () => {
    expect(normalizedComponent).toMatch(
      /<Btn plain class=\{styles\.revealBtn\} onClick=\{revealAll\}>\s*look back\s*<\/Btn>/,
    );
    expect(component).not.toContain("revealChevron");
    expect(styles).not.toContain(".revealChevron");
  });

  it("centres short look-back collections while long histories keep scrolling from the top", () => {
    expect(component).toContain(
      "[styles.shortCollection]: getDashboardGroups().length <= 4",
    );
    expect(styles).toMatch(
      /&\.shortCollection\s*\{[\s\S]*align-content:\s*safe center;/,
    );
    expect(styles).toMatch(
      /&\.shortCollection\s*\{[\s\S]*display:\s*flex;[\s\S]*justify-content:\s*center;/,
    );
    expect(styles).toMatch(
      /@media \(min-width: \$bpDashboardPhone2Col\)[\s\S]*flex-basis:\s*calc\(50% - 8px\);/,
    );
    expect(styles).toMatch(
      /@media \(min-width: \$bpDashboardMoreThan2Col\)[\s\S]*flex-basis:\s*calc\(33\.333% - 16px\);/,
    );
  });
});
