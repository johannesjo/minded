import type { Alternative } from "@src/dataInterface/syncData";
import { getWebsiteAlternativeHref } from "@src/shared/components/interaction/alternatives/getAlternatives";

/**
 * The redirect leg of ShowAlternative: what accepting "Try X instead?" does.
 *
 * - An alternative we can open (a website on the extension, an app on
 *   Android) opens straight away - one tap from the offer to the better thing.
 * - Anything else (an activity, a custom line) ends on a calm beat and the
 *   plain leave, so the user is released to go do it rather than sent on to
 *   the self-set timer.
 *
 * Website alternatives are only ever offered on the extension and app ones
 * only on Android (getAlternativesForTarget scopes them), so each platform
 * needs just its own opener.
 */
export type AlternativeOpenTarget =
  | { kind: "url"; href: string }
  // Resolved to an installed app natively, at tap time (androidInterface.openAppNamed).
  | { kind: "app"; label: string };

export interface AlternativeOpenCapabilities {
  canOpenUrl: boolean;
  canOpenApp: boolean;
}

/** The serif line shown between the tap and the redirect. */
export const ALTERNATIVE_ACCEPT_BEAT = "Enjoy.";
/** Offer → beat crossfade, matching the other in-overlay screen swaps. */
export const ALTERNATIVE_SCREEN_FADE_MS = 480;
/** Long enough for the beat to arrive and be read, short enough not to wait. */
export const ALTERNATIVE_ACCEPT_BEAT_MS = 1200;

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
    const label = alternative.label.trim();
    return label ? { kind: "app", label } : undefined;
  }

  return undefined;
};

/**
 * The primary button answers the heading's question: "Open X" for something
 * we'll try to open, a plain "Yes" for something only the user can go do.
 */
export const getAlternativeAcceptLabel = (
  alternative: Alternative,
  target: AlternativeOpenTarget | undefined,
): string => (target ? `Open ${alternative.label}` : "Yes");
