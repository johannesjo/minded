import { compileString } from "sass";
import { resolve } from "path";

// Regression guard for the dismissed-content tap-stealing bug.
//
// During the intent/time choices the faded previous screen (`.is-dismissed`)
// sits at z-index 1101, above the choices overlay (1100), and must be fully
// click-through. The CSS `*` selector does NOT match pseudo-elements, and every
// `.btnToggleSelect` carries an `::after` hit-area expander with
// `pointer-events: all` (btn.scss). So `.is-dismissed *` alone leaves those
// pseudos live and they swallow taps meant for the choices. The fix lists the
// `::before`/`::after` descendant pseudos explicitly — this test fails if anyone
// collapses the rule back to the `*`-only form.

const SRC_DIR = resolve(__dirname, "../../../");

// InteractionCommon.scss relies on the globally-available `displayVoice` mixin
// (provided by the build, not imported in the file), so compile it through a
// wrapper that pulls the mixin into scope — exactly what's needed to render the
// real `.is-dismissed` rule.
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

describe("InteractionCommon .is-dismissed pointer-events", () => {
  const css = compileInteractionCss();
  // Collapse whitespace so selector/declaration matching is layout-agnostic.
  const norm = css.replace(/\s+/g, " ");

  // The single rule that makes the dismissed subtree inert.
  const dismissRule = norm.match(
    /([^{}]*\.is-dismissed[^{}]*)\{\s*pointer-events:\s*none\s*!important;?\s*\}/,
  );

  it("emits an `is-dismissed { pointer-events: none !important }` rule", () => {
    expect(dismissRule).not.toBeNull();
  });

  it("neutralises descendant pseudo-elements (which `*` cannot match)", () => {
    const selector = dismissRule![1];
    // Without these the btn `::after` hit-area expanders stay live above the
    // choices and eat their taps — the exact bug this guards against.
    expect(selector).toContain(".interaction-content.is-dismissed *::after");
    expect(selector).toContain(".interaction-content.is-dismissed *::before");
  });
});
