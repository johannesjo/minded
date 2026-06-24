import { compileString } from "sass";
import { resolve } from "path";

// Regression guard for the choice buttons being silently un-tappable.
//
// The intent/time selection's "cancel" used to be pinned as a full-bleed
// absolute band (`position: absolute; left: 0; right: 0; bottom: 48px`) so the
// choices group could centre on the full page height. But that band spans the
// whole width and, carrying its own pointer events, floats over — and steals
// taps from — the lower options whenever vertical space is tight (landscape,
// short browser windows, Android nav-bar insets / keyboard). To the user the
// options simply stop responding with nothing visible over them.
//
// The fix keeps the cancel in the flow at the bottom of the choices column so
// the click-through resting-sun spacer always sits between the options and the
// cancel. This test fails if anyone re-pins the cancel as an absolute full-width
// band inside the overlay.

const SRC_DIR = resolve(__dirname, "../../../");

const compileInteractionCss = (): string =>
  compileString(
    [
      "@import 'styles/mixins/allTypo';",
      "@import 'shared/components/interaction/InteractionCommon';",
    ].join("\n"),
    {
      loadPaths: [SRC_DIR],
      quietDeps: true,
      silenceDeprecations: ["import", "mixed-decls"],
    },
  ).css;

describe("intent/time cancel stays in the flow (not a full-width band)", () => {
  const css = compileInteractionCss();
  const norm = css.replace(/\s+/g, " ");

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
});
