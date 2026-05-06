import { SyncData, UserCfg } from "@src/dataInterface/syncData";
import { SelfAssessmentId } from "@src/shared/components/interaction/selfAssessmentInteraction/selfAssessment.model";

/**
 * Mock the global Date constructor and Date.now() with a fixed date.
 * Call jest.restoreAllMocks() in afterEach to clean up.
 */
export const mockDate = (date: Date | string | number): void => {
  const mockNow = new Date(date);
  const RealDate = Date;

  // @ts-expect-error - we're intentionally replacing the Date constructor
  global.Date = class extends RealDate {
    constructor();
    constructor(value: number | string);
    constructor(
      year: number,
      month: number,
      date?: number,
      hours?: number,
      minutes?: number,
      seconds?: number,
      ms?: number,
    );
    constructor(
      ...args:
        | []
        | [number | string]
        | [number, number, number?, number?, number?, number?, number?]
    ) {
      if (args.length === 0) {
        super(mockNow.getTime());
      } else {
        // @ts-expect-error - spread works at runtime
        super(...args);
      }
    }

    static now(): number {
      return mockNow.getTime();
    }

    static parse(s: string): number {
      return RealDate.parse(s);
    }

    static UTC(
      year: number,
      month: number,
      date?: number,
      hours?: number,
      minutes?: number,
      seconds?: number,
      ms?: number,
    ): number {
      return RealDate.UTC(year, month, date, hours, minutes, seconds, ms);
    }
  };
};

/**
 * Mock Math.random() to return a fixed value.
 * Call jest.restoreAllMocks() in afterEach to clean up.
 */
export const mockRandom = (value: number): jest.SpyInstance => {
  return jest.spyOn(Math, "random").mockReturnValue(value);
};

/**
 * Mock Math.random() to return values from a sequence.
 * Values cycle when the sequence is exhausted.
 * Call jest.restoreAllMocks() in afterEach to clean up.
 */
export const mockRandomSequence = (values: number[]): jest.SpyInstance => {
  let index = 0;
  return jest.spyOn(Math, "random").mockImplementation(() => {
    const value = values[index % values.length];
    index++;
    return value;
  });
};

const DEFAULT_TS_VAL = 99;

const DEFAULT_CFG: UserCfg = {
  isOnboardingComplete: false,
  blockedApps: [],
  blockedHosts: [
    "reddit.com",
    "facebook.com",
    "youtube.com",
    "instagram.com",
    "tiktok.com",
    "netflix.com",
    "amazon.com",
  ],
};

/**
 * Create a mock SyncData object with optional overrides.
 * This creates a default SyncData without importing from syncData.const.ts
 * to avoid TypeScript errors from the browser extension APIs.
 */
export const createMockSyncData = (overrides?: Partial<SyncData>): SyncData => {
  const defaultSelfAssessment = Object.values(SelfAssessmentId).reduce(
    (acc, curr) => {
      acc[curr] = { ts: DEFAULT_TS_VAL, val: -1 };
      return acc;
    },
    {} as Record<SelfAssessmentId, { ts: number; val: number }>,
  );

  const defaultData: SyncData = {
    cfg: DEFAULT_CFG,
    lastBlockedTS: DEFAULT_TS_VAL,
    lastBlockedUrl: "",
    moodCheckTS: DEFAULT_TS_VAL,
    moodCheckVal: undefined,
    moodCheckAdditional: "",
    browsingBehaviorRating: {},
    lastBrowsingBehaviorRatingTS: DEFAULT_TS_VAL,
    appUsageRating: {},
    lastAppUsageRatingTS: DEFAULT_TS_VAL,
    energyLvlVal: 0,
    energyLvlTS: DEFAULT_TS_VAL,
    dailyQuestionsMorningTS: DEFAULT_TS_VAL,
    dailyQuestionsEveningTS: DEFAULT_TS_VAL,
    answers: [],
    attempts: {},
    sunTaps: {},
    selfAssessment: defaultSelfAssessment,
    alternativeApps: [],
    alternativeWebsites: [],
    activeTimer: null,
    emotionLabeling: null,
    dailyBudget: null,
    dailyUsage: {},
    budgetPromptDismissedTS: DEFAULT_TS_VAL,
    sleepWindDownDismissedNightId: "",
    sleepWindDownSnoozeUntilTS: 0,
    sleepWindDownProgressNightId: "",
    sleepWindDownCompleted: [],
    sleepWindDownBrainDumpDraft: "",
    sleepWindDownGratitudeDraft: "",
    sleepWindDownTomorrowDraft: "",
  };

  return {
    ...defaultData,
    ...overrides,
    cfg: {
      ...defaultData.cfg,
      ...overrides?.cfg,
    },
  };
};
