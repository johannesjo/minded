export default {
  roots: ["src"],
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  moduleNameMapper: {
    // nanoid ships ESM-only; map it to a tiny CJS-compatible stub so modules
    // that mint ids (e.g. shared/data/customQuestions.ts) stay testable.
    "^nanoid$": "<rootDir>/src/test-utils/nanoidMock.ts",
    "^@src/(.*)$": "<rootDir>/src/$1",
    "^@assets/(.*)$": "<rootDir>/src/assets/$1",
    "^@pages/(.*)$": "<rootDir>/src/pages/$1",
    "^@dataInterface/(.*)$": "<rootDir>/src/dataInterface/extension/$1",
  },
  setupFilesAfterEnv: ["<rootDir>/src/test-utils/jest.setup.js"],
  // Pin the zone so results never depend on the machine running them. Almost
  // everything date-shaped in this app is keyed on the user's *local* calendar
  // day (the daily-questions window, the quick pause, isToday), and a UTC box
  // cannot tell a correct local-midnight implementation from one that divides
  // a timestamp by 86400000 - both agree there. A non-zero offset makes that
  // distinction observable, so the suite is run at one.
  globalSetup: "<rootDir>/src/test-utils/jest.globalSetup.js",
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/test-utils/**",
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
