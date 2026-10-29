import type { Alternative } from "@src/dataInterface/syncData";
import { getWebsiteAlternativeHref } from "@src/shared/components/interaction/alternatives/getAlternatives";

/**
 * The redirect leg of ShowAlternative: what accepting "Try X instead?" does.
 *
 * - An alternative we can open (a website, or an app we can find installed)
 *   opens straight away - one tap from the offer to the better thing.
 * - Anything else (an activity, a custom line, an app we can't find) ends on
 *   a calm beat and the plain leave, so the user is released to go do it
 *   rather than sent on to the self-set timer.
 */
export type AlternativeOpenTarget =
  | { kind: "url"; href: string }
  | { kind: "app"; packageName: string };

export interface InstalledApp {
  packageName: string;
  name: string;
}

export interface AlternativeOpenCapabilities {
  canOpenUrl: boolean;
  canOpenApp: boolean;
  /** Read lazily - only an app alternative without a package needs it. */
  getInstalledApps: () => InstalledApp[];
}

/** The serif line shown between the tap and the redirect. */
export const ALTERNATIVE_ACCEPT_BEAT = "Enjoy.";
/** Offer → beat crossfade, matching the other in-overlay screen swaps. */
export const ALTERNATIVE_SCREEN_FADE_MS = 480;
/** Long enough for the beat to arrive and be read, short enough not to wait. */
export const ALTERNATIVE_ACCEPT_BEAT_MS = 1200;

const normalizeAppName = (name: string): string =>
  name.trim().toLocaleLowerCase();

/**
 * App alternatives are typed by the user ("Kindle"), not picked, so resolve
 * the label to an installed app only on an exact (case-insensitive) name
 * match - opening the wrong app would be worse than opening none.
 */
export const findInstalledApp = (
  label: string,
  apps: InstalledApp[],
): InstalledApp | undefined => {
  const wanted = normalizeAppName(label);
  if (!wanted) return undefined;
  const matches = apps.filter((app) => normalizeAppName(app.name) === wanted);
  return matches.length === 1 ? matches[0] : undefined;
};

export const getAlternativeOpenTarget = (
  alternative: Alternative,
  capabilities: AlternativeOpenCapabilities,
): AlternativeOpenTarget | undefined => {
  if (alternative.kind === "website") {
    const href = capabilities.canOpenUrl
      ? getWebsiteAlternativeHref(alternative)
      : undefined;
    return href ? { kind: "url", href } : undefined;
  }

  if (alternative.kind === "app" && capabilities.canOpenApp) {
    const packageName =
      alternative.packageName ??
      findInstalledApp(alternative.label, capabilities.getInstalledApps())
        ?.packageName;
    return packageName ? { kind: "app", packageName } : undefined;
  }

  return undefined;
};

/**
 * The primary button answers the heading's question. "Open X" when it will
 * really open X; a plain "Yes" otherwise, so the button never promises an
 * app or site it can't deliver.
 */
export const getAlternativeAcceptLabel = (
  alternative: Alternative,
  target: AlternativeOpenTarget | undefined,
): string => (target ? `Open ${alternative.label}` : "Yes");
