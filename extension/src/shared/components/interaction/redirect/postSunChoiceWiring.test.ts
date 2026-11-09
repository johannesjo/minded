import { readFileSync } from "fs";
import { join } from "path";

// Source-text guards for wiring a node-env test can't render: leaving from the
// post-sun choice must run the same plain leave as the fling, stay reachable
// from the time choice, and never leave without its calm beat.
const read = (rel: string): string =>
  readFileSync(join(__dirname, rel), "utf8");

describe("post-sun choice wiring", () => {
  const common = read("../InteractionCommon.tsx");
  const choice = read("PostSunChoice.tsx");

  it("leaves through the fling's own path, counted as a leave", () => {
    expect(common).toContain("<PostSunChoice");
    expect(common).toMatch(
      /onLeave=\{\(open\) =>\s*skipFlow\.leave\(\(\) => open\?\.\(\) \|\| props\.onFlingAway\(\)\)/,
    );
  });

  it("keeps the unchanged time choice, with leaving beside it", () => {
    expect(choice).toContain("<TimeSelection");
    // Beside the time choice when it leads - not again after "Stay", which
    // has just declined leaving.
    expect(choice).toContain(
      'onLeave={redirect.lead === "stay" ? leave : undefined}',
    );
  });

  it("writes no alternative stat for a tap that is ignored", () => {
    // The guard comes before the stat write is started.
    expect(choice).toMatch(
      /if \(isLeaving \|\| !props\.isArmed\) return;[\s\S]*?const ready = prepare\(\);/,
    );
  });

  it("rests on a beat before leaving, and stands down once disposed", () => {
    expect(choice).toContain('toScreen("beat"');
    expect(choice).toContain("!isDisposed && onLeave(open)");
  });

  it("keeps the resting sun's slot on every screen it shows", () => {
    // The lead and beat screens here; the time screen has its own.
    expect(choice.match(/class="resting-sun-spacer"/g)).toHaveLength(2);
    expect(read("../timeSelection/TimeSelection.tsx")).toContain(
      'class="resting-sun-spacer"',
    );
  });
});
