import { readFileSync } from "fs";
import { resolve } from "path";

const surface = readFileSync(
  resolve(__dirname, "../pages/screenshots/Screenshots.tsx"),
  "utf8",
);
const captureScript = readFileSync(
  resolve(process.cwd(), "scripts/create-screenshots.mjs"),
  "utf8",
);

describe("visual baseline coverage", () => {
  it.each([
    "dashboard-empty",
    "dashboard-look-back",
    "settings",
    "pattern-insight",
  ])("renders and captures the %s state", (target) => {
    expect(surface).toContain(`"${target}"`);
    expect(captureScript).toMatch(new RegExp(`target:\\s*["']${target}["']`));
  });

  it("renders the real three-action Pattern Insight component", () => {
    expect(surface).toContain("PatternInsightInteraction");
    expect(surface).toMatch(
      /actions:\s*\[\s*"still_on_purpose",\s*"show_alternative",\s*"leave_now",?\s*\]/,
    );
  });

  it("waits for the persistent sun on the uncarded dashboard hero", () => {
    expect(captureScript).toMatch(
      /case "dashboard":\s*await page\.waitForSelector\("\.minded-sun"\);/,
    );
  });
});
