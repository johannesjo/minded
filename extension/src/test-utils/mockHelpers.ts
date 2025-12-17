import { SyncData } from "@src/dataInterface/syncData";
import { DEFAULT_SYNC_DATA } from "@src/dataInterface/syncData.const";

/**
 * Mock the global Date constructor and Date.now() with a fixed date.
 * Call jest.restoreAllMocks() in afterEach to clean up.
 */
export const mockDate = (date: Date | string | number): void => {
  const mockNow = new Date(date);
  const originalDate = global.Date;

  const MockDate = class extends originalDate {
    constructor(...args: ConstructorParameters<typeof Date>) {
      if (args.length === 0) {
        super(mockNow.getTime());
      } else {
        // @ts-expect-error - spread args work at runtime
        super(...args);
      }
    }

    static now(): number {
      return mockNow.getTime();
    }
  } as DateConstructor;

  global.Date = MockDate;
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

/**
 * Create a mock SyncData object with optional overrides.
 */
export const createMockSyncData = (
  overrides?: Partial<SyncData>,
): SyncData => ({
  ...DEFAULT_SYNC_DATA,
  ...overrides,
  cfg: {
    ...DEFAULT_SYNC_DATA.cfg,
    ...overrides?.cfg,
  },
});
