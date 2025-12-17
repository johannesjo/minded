export default {
  roots: ["src"],
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  moduleNameMapper: {
    "^@src/(.*)$": "<rootDir>/src/$1",
    "^@assets/(.*)$": "<rootDir>/src/assets/$1",
    "^@pages/(.*)$": "<rootDir>/src/pages/$1",
    "^@dataInterface/(.*)$": "<rootDir>/src/dataInterface/web/$1",
  },
  setupFilesAfterEnv: ["<rootDir>/src/test-utils/jest.setup.js"],
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
