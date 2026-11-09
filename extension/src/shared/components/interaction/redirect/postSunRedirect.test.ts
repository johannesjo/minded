import type { Alternative } from "@src/dataInterface/syncData";
import type { InteractionMode } from "@src/shared/components/interaction/getInteractionMode";
import {
  getPostSunRedirect,
  LEAVE_BEAT,
  LEAVE_LABEL,
  LEAVE_QUESTION,
  LETTING_BE_MODES,
  STAY_LABEL,
  type PostSunRedirectInput,
} from "@src/shared/components/interaction/redirect/postSunRedirect";

const website: Alternative = {
  id: "w1",
  kind: "website",
  label: "Wikipedia",
  url: "wikipedia.org",
  createdTS: 1,
  shownCount: 0,
  dismissedCount: 0,
  openedCount: 0,
};

const activity: Alternative = {
  id: "a1",
  kind: "activity",
  label: "a short walk",
  createdTS: 1,
  shownCount: 0,
  dismissedCount: 0,
  openedCount: 0,
};

const input = (
  overrides: Partial<PostSunRedirectInput>,
): PostSunRedirectInput => ({
  mode: "QUESTION",
  hasCompleted: true,
  alternative: undefined,
  capabilities: { canOpenUrl: true, canOpenApp: false },
  ...overrides,
});

describe("getPostSunRedirect", () => {
  it("keeps today's time choice leading by default", () => {
    expect(getPostSunRedirect(input({}))).toEqual({ lead: "stay" });
    expect(getPostSunRedirect(input({ mode: undefined }))).toEqual({
      lead: "stay",
    });
  });

  it.each(LETTING_BE_MODES)(
    "lets leaving lead after a completed %s practice",
    (mode) => {
      expect(getPostSunRedirect(input({ mode }))).toEqual({ lead: "leave" });
    },
  );

  it("leads with leaving over an alternative after a not-acting practice", () => {
    expect(
      getPostSunRedirect(input({ mode: "URGE_SURFING", alternative: website })),
    ).toEqual({ lead: "leave" });
  });

  it("does not read a practice tapped past as one sat through", () => {
    expect(
      getPostSunRedirect(input({ mode: "URGE_SURFING", hasCompleted: false })),
    ).toEqual({ lead: "stay" });
  });

  it.each<InteractionMode>(["NOTICE", "QUESTION", "EMOTION_LABELING"])(
    "keeps the time choice leading after %s",
    (mode) => {
      expect(getPostSunRedirect(input({ mode }))).toEqual({ lead: "stay" });
    },
  );

  it("leads with opening an enabled alternative", () => {
    expect(getPostSunRedirect(input({ alternative: website }))).toEqual({
      lead: "alternative",
      alternative: website,
      target: { kind: "url", href: "https://wikipedia.org/" },
    });
  });

  it("leads with an alternative the user can only go do, with no target", () => {
    expect(getPostSunRedirect(input({ alternative: activity }))).toEqual({
      lead: "alternative",
      alternative: activity,
      target: undefined,
    });
  });

  it("still offers an alternative after a prompt tapped past", () => {
    expect(
      getPostSunRedirect(
        input({ mode: "BELL", hasCompleted: false, alternative: website }),
      ).lead,
    ).toBe("alternative");
  });

  it.each<InteractionMode>(["SHOW_ALTERNATIVE", "SET_ALTERNATIVE"])(
    "never asks about an alternative twice after %s",
    (mode) => {
      expect(getPostSunRedirect(input({ mode, alternative: website }))).toEqual(
        { lead: "stay" },
      );
    },
  );

  it("honours the bedtime moon's tap as staying up a little longer", () => {
    expect(
      getPostSunRedirect(
        input({ mode: "WIND_DOWN_SETTLE", alternative: website }),
      ),
    ).toEqual({ lead: "stay" });
  });

  it("honours 'still on purpose' on a pattern insight", () => {
    expect(
      getPostSunRedirect(
        input({ mode: "PATTERN_INSIGHT", alternative: website }),
      ),
    ).toEqual({ lead: "stay" });
    expect(
      getPostSunRedirect(
        input({
          mode: "PATTERN_INSIGHT",
          hasCompleted: false,
          alternative: website,
        }),
      ).lead,
    ).toBe("alternative");
  });

  it("speaks in short, plain, judgment-free words", () => {
    for (const line of [LEAVE_QUESTION, LEAVE_LABEL, STAY_LABEL, LEAVE_BEAT]) {
      expect(line).not.toMatch(/[—–]/);
      expect(line).not.toMatch(/well done|great|good job|proud|\d/i);
      expect(line.split(/\s+/).length).toBeLessThanOrEqual(3);
    }
  });
});
