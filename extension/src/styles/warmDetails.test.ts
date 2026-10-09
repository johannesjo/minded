import { readFileSync } from "fs";
import { resolve } from "path";

const warm = readFileSync(resolve(__dirname, "_warmDetails.scss"), "utf8");
const sharedAll = readFileSync(resolve(__dirname, "_sharedAll.scss"), "utf8");

const stripComments = (scss: string): string =>
  scss.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");

describe("warm details (selection, caret, native accents)", () => {
  const code = stripComments(warm).trim();

  it("is loaded with the shared styles every surface uses", () => {
    expect(sharedAll).toMatch(/@import "warmDetails";/);
  });

  it("is scoped entirely under the #minded-6622 root (never leaks into host pages)", () => {
    // One top-level block, and it is the app root.
    expect(code.startsWith("#minded-6622 {")).toBe(true);
    let depth = 0;
    let topLevelBlocks = 0;
    for (const ch of code) {
      if (ch === "{") {
        if (depth === 0) topLevelBlocks++;
        depth++;
      } else if (ch === "}") depth--;
    }
    expect(topLevelBlocks).toBe(1);
  });

  it("tints selection, caret and native controls warm - by day and by night", () => {
    expect(code).toMatch(
      /::selection\s*\{\s*background-color:\s*var\(--c-selection-bg\)/,
    );
    expect(code).toMatch(
      /textarea[\s\S]*?\{\s*caret-color:\s*var\(--c-caret\)/,
    );
    expect(code).toMatch(/accent-color:\s*var\(--c-accent\)/);
    const night = code.match(/&\.minded-6622-dark\s*\{([^}]*)\}/)?.[1] ?? "";
    for (const token of ["--c-selection-bg", "--c-caret", "--c-accent"]) {
      expect(code).toContain(`${token}:`);
      expect(night).toContain(`${token}:`);
    }
  });

  it("leaves the selected text its own colour (only the background tints)", () => {
    expect(code).not.toMatch(/::selection\s*\{[^}]*(?<![-\w])color:/);
  });
});
