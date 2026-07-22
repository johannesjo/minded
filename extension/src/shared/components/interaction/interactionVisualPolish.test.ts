import { readFileSync } from "fs";
import { resolve } from "path";
import { compile } from "sass";

const readSource = (relativePath: string): string =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");

const ruleBody = (scss: string, selector: string): string => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = scss.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\n\\}`));
  if (!match) throw new Error(`could not find ${selector}`);
  return match[1];
};

describe("interaction visual polish", () => {
  it("presents pattern-insight actions as one centred choice group", () => {
    const component = readSource(
      "src/shared/components/interaction/patternInsight/PatternInsightInteraction.tsx",
    );
    const styles = readSource(
      "src/shared/components/interaction/patternInsight/PatternInsightInteraction.module.scss",
    );
    const actions = ruleBody(styles, ".actions");

    expect(component).toContain(
      'import styles from "./PatternInsightInteraction.module.scss"',
    );
    expect(component).toMatch(
      /<div class=\{styles\.actions\}>[\s\S]*?<For each=\{props\.insight\.actions\}>/,
    );
    expect(actions).toMatch(/display:\s*grid/);
    expect(actions).toMatch(/grid-template-columns:\s*1fr/);
    expect(actions).toMatch(/gap:\s*var\(--space-md\)/);
    expect(actions).toMatch(/width:\s*100%/);
    expect(actions).toMatch(/max-width:\s*320px/);
    expect(actions).toMatch(/margin:\s*0 auto/);
  });

  it("lets quotation marks frame a reason without synthesized italics", () => {
    const styles = readSource(
      "src/shared/components/interaction/InteractionCommon.scss",
    );

    expect(styles).not.toMatch(
      /\.interaction-quote\s*\{[\s\S]*?font-style:\s*italic/,
    );
  });

  it("uses the gentle duration for central interaction opacity changes", () => {
    const styles = readSource(
      "src/shared/components/interaction/InteractionCommon.scss",
    );
    const component = readSource(
      "src/shared/components/interaction/InteractionCommon.tsx",
    );

    expect(
      styles.match(
        /transition:\s*opacity var\(--dur-gentle\) var\(--ease-out\)/g,
      ),
    ).toHaveLength(5);
    expect(styles).not.toContain("--screen-transition-ms");
    expect(styles).not.toMatch(/transition:\s*opacity (?:1s|900ms)/);
    expect(component).not.toContain('"--screen-transition-ms"');
    expect(component).toContain(
      'transition: "opacity var(--dur-gentle) var(--ease-out)",',
    );
    expect(component).toContain("const reduceMotion = prefersReducedMotion();");
    expect(component).toMatch(
      /const SCREEN_TRANSITION_MS = reduceMotion\s*\? 0\s*:\s*ANIMATION_TIMING\.fadeOut\.standard/,
    );
    expect(component).toContain("reduceMotion ? 0 : 400");
    expect(component).toMatch(
      /const runFadeAnimation[\s\S]*?if \(reduceMotion \|\| duration <= 0\) \{[\s\S]*?onComplete\(\);[\s\S]*?return;/,
    );
  });

  it("uses the shared entrance fade without important animation overrides", () => {
    const relativePath =
      "src/shared/components/dashboard/interactionOverlay/InteractionOverlay.module.scss";
    const styles = readSource(relativePath);
    const css = compile(resolve(process.cwd(), relativePath), {
      loadPaths: [resolve(process.cwd(), "src")],
      quietDeps: true,
      silenceDeprecations: ["import", "mixed-decls"],
    }).css.replace(/\s+/g, " ");

    expect(styles).toContain("@include standardPageTransitionIn();");
    expect(styles).not.toMatch(/animation(?:-name)?:\s*[^;]*!important/);
    expect(css).toMatch(
      /\.interactionOverlay\s*\{[^}]*animation:\s*minded6622fadeInScale var\(--ease-out\) 320ms/,
    );
    expect(css).toMatch(
      /@media \(prefers-reduced-motion:\s*reduce\)\s*\{\s*\.interactionOverlay\s*\{\s*animation:\s*none/,
    );
    expect(css).toMatch(
      /\.interactionOverlay\.instant\s*\{\s*animation:\s*none/,
    );
  });
});
