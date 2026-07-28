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
    // Both buttons are plain sans chrome - no `voice` on the primary. The
    // card's serif voice lives on the prompt line instead (asserted below), so
    // no lone serif button sits wedged beside the sans "not now" exit.
    expect(normalizedComponent).toMatch(
      /<Btn onClick=\{\(\) => navigate\("\/dailyQuestions"\)\}>\s*stay a moment\s*<\/Btn>/,
    );
    expect(normalizedComponent).not.toContain("<Btn voice");
    expect(normalizedComponent).toMatch(
      /<Btn soft onClick=\{\(\) => removeDailyQuestionsBanner\(\)\}>\s*not now\s*<\/Btn>/,
    );
  });

  it("speaks the card's invitation in the serif voice on the prompt, not a button", () => {
    // The prompt is the app speaking gently, so it carries the Newsreader voice
    // (layered onto the size class), matching the "Stay a while?" grounding card.
    expect(normalizedComponent).toMatch(
      /<div class=\{`txtSlightlyBigger \$\{styles\.cardDailyQuestionsPrompt\}`\}>/,
    );
    expect(styles).toMatch(
      /\.cardDailyQuestionsPrompt\s*\{[\s\S]*@include displayVoice;/,
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

  // holdGreeting is what keeps the greeting still across a return, and the
  // conditions around it are the whole feature - each one silently undoes it.
  // Unit tests on holdGreeting itself would stay green through all three.
  it("holds the greeting across returns, and re-rolls it only offscreen", () => {
    // Only where the greeting is actually being (re)chosen: a routine in-view
    // refresh must not reshuffle the visible cards, and the "look back" grid
    // must not touch the greeting memory at all (it would hold the *grid's*
    // centre card, and the dashboard would come back with a stranger).
    expect(normalizedComponent).toContain(
      "const isChoosingGreeting = !props.forceRevealed && (reselect || getHeroGroup() === undefined);",
    );
    expect(normalizedComponent).toMatch(
      /if \(isChoosingGreeting\) \{[^}]*const wasReGreetedWhileAway = takeReGreetRequest\(\);/,
    );
    // Taken unconditionally - short-circuited behind `reselect`, a handled
    // re-greet would leave the request standing and re-roll the return after
    // it too.
    expect(normalizedComponent).toContain(
      "const wasReGreetedWhileAway = takeReGreetRequest(); if (!reselect && !wasReGreetedWhileAway) holdGreeting(groups, lastGreetingKey);",
    );
    expect(component.match(/takeReGreetRequest\(\)/g)).toHaveLength(1);
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

  it("centres incomplete rows in longer look-back collections", () => {
    expect(styles).toMatch(
      /\.box:last-child:nth-child\(odd\)\s*\{[\s\S]*grid-column:\s*2\s*\/\s*span 2;/,
    );
    expect(styles).toMatch(
      /\.box:nth-last-child\(1\):nth-child\(3n \+ 1\)\s*\{[\s\S]*grid-column:\s*3\s*\/\s*span 2;/,
    );
    expect(styles).toMatch(
      /\.box:nth-last-child\(2\):nth-child\(3n \+ 1\)\s*\{[\s\S]*grid-column:\s*2\s*\/\s*span 2;/,
    );
    expect(styles).toMatch(
      /\.box:nth-last-child\(1\):nth-child\(3n \+ 2\)\s*\{[\s\S]*grid-column:\s*4\s*\/\s*span 2;/,
    );
  });
});
