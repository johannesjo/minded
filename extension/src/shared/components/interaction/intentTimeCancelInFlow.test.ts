import { compileString } from "sass";
import { readFileSync } from "fs";
import { resolve } from "path";

// Regression guard for the choice buttons being silently un-tappable.
//
// The intent/time selection's "cancel" used to be pinned as a full-bleed
// absolute band (`position: absolute; left: 0; right: 0; bottom: 48px`) so the
// choices group could centre on the full page height. But that band spans the
// whole width and, carrying its own pointer events, floats over - and steals
// taps from - the lower options whenever vertical space is tight (landscape,
// short browser windows, Android nav-bar insets / keyboard). To the user the
// options simply stop responding with nothing visible over them.
//
// The fix keeps the cancel in the flow at the bottom of the choices column so
// the click-through resting-sun spacer always sits between the options and the
// cancel. Compact-height spacing also keeps that whole column on-screen without
// adding a scroll surface that would desynchronise the fixed sun from its slot.

const SRC_DIR = resolve(__dirname, "../../../");

const compileInteractionCss = (): string =>
  compileString(
    [
      "@import 'styles/mixins/allTypo';",
      "@import 'shared/components/interaction/InteractionCommon';",
      "@import 'shared/components/interaction/timeSelection/TimeSelection';",
      "@import 'shared/components/interaction/intentSelection/IntentSelection';",
    ].join("\n"),
    {
      loadPaths: [SRC_DIR],
      quietDeps: true,
      silenceDeprecations: ["import", "mixed-decls"],
    },
  ).css;

describe("intent/time choice layout", () => {
  const css = compileInteractionCss();
  const norm = css.replace(/\s+/g, " ");
  const interactionSource = readFileSync(
    resolve(SRC_DIR, "shared/components/interaction/InteractionCommon.tsx"),
    "utf8",
  );

  // Every rule block whose selector targets the cancel inside the overlay.
  const cancelRules = [
    ...norm.matchAll(/([^{}]*-selection-cancel[^{}]*)\{([^{}]*)\}/g),
  ].filter((m) => /\.time-selection-overlay/.test(m[1]));

  it("emits a cancel rule scoped to the choices overlay", () => {
    expect(cancelRules.length).toBeGreaterThan(0);
  });

  it("never pins the cancel as an absolute/fixed band", () => {
    for (const m of cancelRules) {
      expect(m[2]).not.toMatch(/position:\s*(absolute|fixed)/);
    }
  });

  it("compacts the full choice flow on short viewports", () => {
    const compactStart = norm.indexOf("@media (max-height: 760px)");
    expect(compactStart).toBeGreaterThan(-1);

    const compactCss = norm.slice(compactStart);
    expect(compactCss).toMatch(
      /\.time-selection-overlay \.intent-selection-wrapper,[^{]*\.time-selection-overlay \.time-selection-wrapper \{[^}]*--btn-height: 44px;[^}]*--btn-fz: 18px;[^}]*--fz-xl: 22px;[^}]*padding: max\(var\(--space-sm\), var\(--safe-area-inset-top\)\) 0 max\(var\(--space-sm\), var\(--safe-area-inset-bottom\)\);/,
    );
    expect(compactCss).toMatch(
      /\.time-selection-overlay \.intent-selection-container,[^{]*\.time-selection-overlay \.time-selection-container \{[^}]*min-height: 0;[^}]*padding: var\(--space-md\) var\(--space-xl\);/,
    );
    expect(compactCss).toMatch(
      /\.time-selection-overlay \.intent-selection-container \.intent-options-grid,[^{]*\.time-selection-overlay \.time-selection-container \.time-options-grid \{[^}]*gap: var\(--space-sm\);/,
    );
    expect(compactCss).toMatch(
      /\.time-selection-overlay \.resting-sun-spacer \{[^}]*flex: 0 1 132px;[^}]*min-height: 0;/,
    );
  });

  it("remeasures the resting sun after native safe-area changes", () => {
    const handler = interactionSource.match(
      /const (\w+) = \(\) => measureRestingSunAnchor\(\);/,
    )?.[1];
    expect(handler).toBeDefined();
    expect(interactionSource).toContain(
      `window.addEventListener("androidSafeAreaChanged", ${handler});`,
    );
    expect(interactionSource).toContain(
      `window.removeEventListener("androidSafeAreaChanged", ${handler});`,
    );
  });
});
