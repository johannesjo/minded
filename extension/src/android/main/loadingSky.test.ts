import { readFileSync } from "fs";
import { resolve } from "path";

const SRC_DIR = resolve(__dirname, "../..");

describe("pre-mount loading sky", () => {
  // A root background is sized to the <html> box, which is only the empty
  // body's height before the bundle mounts - so without a viewport-tall box the
  // gradient repeated down the screen as thin orange/turquoise stripes.
  it.each(["android/main/index.html", "pages/newtab/index.html"])(
    "stretches <html> to the viewport in %s so the sky paints once",
    (page) => {
      const html = readFileSync(resolve(SRC_DIR, page), "utf8");
      // The plain `html { background: ... }` rule, not the @supports one.
      const rule = [...html.matchAll(/\n\s*html \{([^}]*)\}/g)].find((m) =>
        m[1].includes("linear-gradient("),
      );
      expect(rule).toBeDefined();
      expect(rule![1]).toMatch(/min-height:\s*100%;/);
    },
  );
});
