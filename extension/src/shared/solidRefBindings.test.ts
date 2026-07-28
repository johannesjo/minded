import { readdirSync, readFileSync, statSync } from "fs";
import { resolve } from "path";

// SolidJS's JSX transform compiles `ref={someVar}` into a plain assignment
// *only* when `someVar` is a mutable binding. Declare it `const` and the
// compiler can't assign to it, so it falls back to the callback-ref form and
// emits `use(someVar, el)` - which calls the value as a function. For the usual
// `= undefined!` seed that throws `TypeError: … is not a function` while the
// element renders, taking the surrounding component down with it.
//
// Nothing else catches this: TypeScript is happy, and `prefer-const` actively
// pushes the wrong way, because the compiler's assignment is invisible to it.
// It cost the shell's companion sun once (the tap target that opens the pause,
// so the dashboard sun stopped opening an intervention at all), hence a guard.

const SRC = resolve(process.cwd(), "src");

const collectTsxFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const path = resolve(dir, entry);
    if (statSync(path).isDirectory()) {
      return entry === "node_modules" ? [] : collectTsxFiles(path);
    }
    return path.endsWith(".tsx") ? [path] : [];
  });

// `ref={name}` with a bare identifier - the assignment form. Callback refs
// (`ref={(el) => …}`) and member expressions (`ref={props.x}`) don't match and
// are compiled as callbacks on purpose.
const BARE_IDENTIFIER_REF = /\bref=\{([A-Za-z_$][\w$]*)\}/g;

describe("SolidJS ref bindings", () => {
  it("declares every assignment-style ref with let, never const", () => {
    const offenders: string[] = [];

    for (const file of collectTsxFiles(SRC)) {
      const source = readFileSync(file, "utf8");
      for (const [, name] of source.matchAll(BARE_IDENTIFIER_REF)) {
        const declaration = source.match(
          new RegExp(`\\bconst\\s+${name}\\b[^=\\n]*=\\s*(.{0,40})`),
        );
        if (!declaration) continue;
        // A `const` holding a function is a *callback* ref - the one form Solid
        // does mean to call. Only element-holding consts are the mistake.
        const isCallback = /^(async\s+)?(function\b|\(|[\w$]+\s*=>)/.test(
          declaration[1],
        );
        if (!isCallback) {
          offenders.push(`${file.slice(SRC.length + 1)}: ref={${name}}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
