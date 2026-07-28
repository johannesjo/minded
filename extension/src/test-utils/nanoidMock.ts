/**
 * Jest stand-in for the ESM-only `nanoid` package (jest.config.js maps it
 * here). Deterministic-ish, unique-per-process ids are all tests need.
 */
let count = 0;

export const nanoid = (): string => `test-nanoid-${++count}`;
