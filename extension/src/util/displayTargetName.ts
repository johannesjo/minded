import { SessionTarget } from "@src/dataInterface/syncData";

// App and website names can be long (deep subdomains, verbose app labels), and
// a prompt is a single calm line — so any injected name is hard-capped here and
// ellipsised rather than allowed to blow out the layout.
export const MAX_TARGET_NAME_LEN = 18;

/**
 * A short, display-ready name for the site/app an interaction is about. Hosts
 * are stripped of scheme/`www.`/path; anything longer than MAX_TARGET_NAME_LEN
 * is truncated with an ellipsis. Returns undefined when there's no usable name
 * (e.g. on the dashboard, where no single site/app is in play).
 */
export const displayTargetName = (
  target?: SessionTarget,
): string | undefined => {
  const raw = target?.id?.trim();
  if (!raw) return undefined;

  let name = raw;
  if (target!.kind === "host") {
    name = name
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/.*$/, "");
  }
  if (!name) return undefined;

  if (name.length > MAX_TARGET_NAME_LEN) {
    name = name.slice(0, MAX_TARGET_NAME_LEN - 1).trimEnd() + "…";
  }
  return name;
};

/**
 * Swaps the generic "this website" / "this app" referent in a prompt for the
 * actual site/app name when we know it (during an in-the-moment intervention),
 * so "Why are you visiting this website" reads "Why are you visiting reddit.com".
 * Falls back to the original generic wording when there's no name — e.g. the
 * same prompt shown passively on the dashboard.
 */
export const withTargetName = (text: string, targetName?: string): string => {
  if (!targetName) return text;
  return text
    .replace(/\bthis website\b/g, targetName)
    .replace(/\bthis app\b/g, targetName);
};
