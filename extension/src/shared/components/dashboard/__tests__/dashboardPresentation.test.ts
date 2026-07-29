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
  it("places passive energy and emotion greetings directly on the sky", () => {
    expect(component).toMatch(
      /PASSIVE_HERO_TYPES[\s\S]*DashboardGroupType\.EnergyLvl[\s\S]*DashboardGroupType\.EmotionLabeling/,
    );
    expect(component).toContain('["cardDashboard"]: !isSkyGreeting');
    expect(component).toContain("[styles.skyGreeting]: isSkyGreeting");
  });

  it("greets with a card only when that card may greet right now - otherwise an empty sky", () => {
    // No filler card exists any more, so the hero slot can hold something that
    // must not greet (a stale recap). The view checks before showing it.
    expect(normalizedComponent).toContain(
      "return hero && isGreetingEligible(hero, new Date()) ? hero : undefined;",
    );
  });

  it("still offers 'look back' when nothing greets but cards exist", () => {
    expect(normalizedComponent).toContain("when={getHeldBackCount() > 0}");
    // A card already on its way into the greeting slot counts as being in it,
    // so the button can't flash in and out during a hand-off. The words hold no
    // card, so when they stand in for a greeting every card is held back.
    expect(normalizedComponent).toContain(
      "(getHeroGroup() || getPendingGreeting()?.hero ? 1 : 0)",
    );
  });

  describe("the empty sky (nothing of the user's to show yet)", () => {
    // What replaced the borrowed quote card: the space says what it is for and
    // where the way in is, rather than being filled with someone else's words.
    it("says what the space is for and names the sun as the way in", () => {
      // Present tense - it describes the room, it doesn't predict the user.
      expect(normalizedComponent).toContain(
        "This is where your reflections gather.",
      );
      // The companion word, not a hardcoded "sun": the disc below is the moon
      // after dark, and copy that names it must follow - reactively, since
      // these words can outlive the day/night threshold on screen.
      expect(normalizedComponent).toContain(
        "Tap the {getCompanionWord()} below whenever you’d like a pause.",
      );
      expect(component).toContain("createCompanionWord()");
    });

    it("speaks those words in the serif voice, directly on the sky - no card chrome", () => {
      expect(normalizedComponent).toContain("[styles.emptySky]: true,");
      expect(normalizedComponent).not.toMatch(
        /cardDashboard[^}]*emptySky|emptySky[^}]*cardDashboard/,
      );
      // The voice sits on the lines themselves, not the wrapper: the size
      // classes' inherited `text-wrap: pretty` would otherwise beat
      // displayVoice's `balance` on the elements actually holding the text.
      // Nested so it wins on specificity rather than on stylesheet order.
      expect(styles).toMatch(
        /\.emptySky \.emptySkyLine\s*\{[\s\S]*@include displayVoice;/,
      );
      expect(normalizedComponent).toContain(
        "class={`txtSlightlyBigger ${styles.emptySkyLine}`}",
      );
      expect(normalizedComponent).toContain(
        "class={`txtSmaller ${styles.emptySkyLine} ${styles.emptySkyWayIn}`}",
      );
    });

    it("eases in like the greeting it stands in for, never appearing outright", () => {
      expect(styles).toMatch(
        /\.emptySky\s*\{[\s\S]*@include standardPageTransitionIn\(\);/,
      );
    });

    // The greeting slot's one in-view change: the user answers their first
    // question through a native intervention and comes back, so the words have
    // to give way while being looked at. They fade first - an unmount the
    // instant the next state is set would cut them dead beside a card playing
    // its own 900ms entrance.
    it("fades out before handing the slot over - never a cut, on any path", () => {
      expect(styles).toMatch(
        /\.emptySky\s*\{[\s\S]*transition:\s*opacity var\(--dur-soft\)/,
      );
      expect(styles).toMatch(
        /&\.isBeingRemoved\s*\{[\s\S]*animation: none !important;[\s\S]*opacity: 0 !important;/,
      );
      expect(normalizedComponent).toContain(
        "[styles.isBeingRemoved]: getIsEmptySkyBeingRemoved(),",
      );
      // One decision path for every destination (a card, other words, or
      // nothing), so no branch can settle without the fade the others get.
      expect(normalizedComponent).toContain(
        "if (!areWordsVisible || next.mode === getEmptySkyMode()) { cancelHandOff(); settleGreeting(next); return; }",
      );
      expect(normalizedComponent).toMatch(
        /emptySkyHandOff = setTimeout\([\s\S]*emptySkyFadeMs\(\)\)/,
      );
    });

    // Regression: a hand-off left armed lands 480ms late and installs a
    // greeting built from data that has since changed - and because a shown
    // hero stops refresh from reconsidering, that phantom card stays for good
    // while the real cards sit behind a "look back" it has just hidden.
    it("drops a hand-off still waiting behind a fade when a newer decision arrives", () => {
      expect(normalizedComponent).toContain(
        "const cancelHandOff = () => { window.clearTimeout(emptySkyHandOff); setPendingGreeting(undefined); setIsEmptySkyBeingRemoved(false); };",
      );
      // ...but a fade already heading for this same state keeps its clock,
      // instead of being restarted by every refresh that arrives mid-fade.
      expect(normalizedComponent).toContain(
        "if (getPendingGreeting()?.mode === next.mode) { setPendingGreeting(next); return; }",
      );
    });

    it("swaps instantly under reduced motion instead of waiting out a fade nobody sees", () => {
      expect(normalizedComponent).toMatch(
        /emptySkyFadeMs = \(\): number => window\.matchMedia\?\.\("\(prefers-reduced-motion: reduce\)"\)\.matches \? 0 : EMPTY_SKY_FADE_MS/,
      );
    });

    it("says only the way in when cards exist but none of them may greet", () => {
      // Claiming the room is empty to someone who has entries would be untrue,
      // so the first line is gated on the genuinely-empty mode.
      expect(normalizedComponent).toContain(
        '{ mode: groups.length ? "wayIn" : "full", hero: undefined }',
      );
      expect(normalizedComponent).toContain(
        '<Show when={getEmptySkyMode() === "full"}>',
      );
      // Standing alone it is no longer a quieter second line.
      expect(styles).toMatch(
        /\.emptySkyWayIn\s*\{[\s\S]*&:only-child\s*\{[\s\S]*opacity: 1;/,
      );
    });

    it("holds the words back until the first data read, so they can't flash", () => {
      // A controlled signal, not a live derivation: an empty group list before
      // the first read means "not loaded yet", not "nothing to show".
      expect(normalizedComponent).toContain(
        '<Show when={getEmptySkyMode() !== "none"}>',
      );
      expect(normalizedComponent).toContain(
        'const [getEmptySkyMode, setEmptySkyMode] = createSignal<EmptySkyMode>("none");',
      );
    });

    it("gives the /lookBack grid the same words rather than a blank page", () => {
      expect(normalizedComponent).toContain(
        'when={getDashboardGroups().length || getEmptySkyMode() === "none"}',
      );
      expect(normalizedComponent).toContain(
        "fallback={<div class={styles.collapsed}>{renderEmptySky()}</div>}",
      );
    });
  });

  it("keeps a sole energy or emotion greeting navigable", () => {
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

  it("leads the daily card with a quick pause that completes in one tap", () => {
    // The questions ask you to type, and a day with no spare minute just
    // dismisses them. The card's first offer is therefore the ten-second door:
    // one present-moment practice, confirmed where you stand.
    expect(normalizedComponent).toContain("{getQuickPauseOffer().cue}");
    expect(normalizedComponent).toMatch(
      /<Btn onClick=\{\(\) => takeQuickPause\(\)\}>\s*\{getQuickPauseOffer\(\)\.action\}\s*<\/Btn>/,
    );
  });

  it("keeps the questions one quiet tap away, beside an equally quiet exit", () => {
    // The longer path did not move, it just stopped being the loudest pixel -
    // both alternatives are `soft` so neither out-shouts the practice above.
    expect(normalizedComponent).toMatch(
      /<Btn soft onClick=\{\(\) => navigate\("\/dailyQuestions"\)\}>\s*a few questions\s*<\/Btn>/,
    );
    expect(normalizedComponent).toMatch(
      /<Btn soft onClick=\{\(\) => removeDailyQuestionsBanner\(\)\}>\s*not now\s*<\/Btn>/,
    );
    // Still plain sans chrome throughout - no `voice` on any card button. The
    // card's serif voice lives on the prompt line (asserted below), so no lone
    // serif button sits wedged between sans elements.
    expect(normalizedComponent).not.toContain("<Btn voice");
  });

  it("takes the quick pause without recording or counting anything", () => {
    // Nothing is stored beyond "this day's invitation is spent" - the same
    // single call "not now" makes. A tally of which door you took would be
    // exactly the striving the app exists to avoid.
    expect(normalizedComponent).toMatch(
      /const takeQuickPause = \(\) => \{[^}]*\} setDailyQuestionsDoneForToday\(getDailyQuestionsBannerMode\(\)\); fadeOutDailyQuestionsBanner\(\); \};/,
    );
  });

  it("sends the guided breath to its own surface instead of finishing on the card", () => {
    // A breath is the one offer the sun has to lead; a printed cue completes
    // where it stands, so only this kind leaves the dashboard.
    expect(normalizedComponent).toMatch(
      /if \(getQuickPauseOffer\(\)\.kind === "breath"\) \{ navigate\("\/quickBreath"\); return; \}/,
    );
  });

  it("derives the quick pause from the same clock read as the card's mode", () => {
    // Reading the clock a second time at render is how the card once showed
    // morning wording at night; the line must describe the same moment.
    expect(normalizedComponent).toContain(
      "setQuickPauseOffer(getQuickPause(now, mode));",
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

  it("sets the confirming tap on its own row, right under the line it answers", () => {
    expect(styles).toMatch(
      /\.cardDailyQuestionsDone\s*\{[^}]*justify-content: center;/,
    );
  });

  it("stacks daily invitation actions on narrow phones while preserving tap height", () => {
    expect(styles).toMatch(
      /\.cardDailyQuestionsBtns\s*\{[^@]*@media \(max-width: 360px\)\s*\{[^}]*grid-template-columns: 1fr;/,
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
