import type { Alternative } from "@src/dataInterface/syncData";
import type { InteractionMode } from "@src/shared/components/interaction/getInteractionMode";
import {
  type AlternativeOpenCapabilities,
  type AlternativeOpenTarget,
  getAlternativeOpenTarget,
} from "@src/shared/components/interaction/alternatives/alternativeRedirect";

/**
 * The redirect leg of interrupt → reflect → redirect (#163): which way out of
 * the post-sun choice leads, given what the user just reflected on.
 *
 * "Leads" is order and weight only. Every exit stays one tap away - staying
 * always reaches the unchanged time choice, leaving is always on the surface,
 * and the sun fling stays the universal escape. Nothing here gates anything.
 *
 * - "leave": the practice the user just completed was itself not-acting, so
 *   the gentlest close is to let it be enough and step away. Opening something
 *   else would be one more act.
 * - "alternative": an enabled alternative exists for this platform and the
 *   prompt hadn't already offered one - "Try X instead?" leads.
 * - "stay": the time choice, with the quiet leave beside it.
 *
 * A sleep wind-down branch was considered and left out: the guided wind-down
 * is its own native Android overlay, chosen by the overlay service, with no
 * existing way to open it from an intervention.
 */
export type PostSunRedirect =
  | { lead: "stay" }
  | { lead: "leave" }
  | {
      lead: "alternative";
      alternative: Alternative;
      target: AlternativeOpenTarget | undefined;
    };

/**
 * Attention practices that are themselves "not acting": sitting with the urge,
 * listening a bell down into silence, one guided breath. Each is only
 * *completed* by sitting through it, so completing one is observed behaviour,
 * not a guess.
 *
 * Deliberately out:
 * - SCREEN_OFF never reports a completion: it closes on its own leave, so it
 *   only reaches this surface via a sun tap past it.
 * - NOTICE is a one-glance noticing tapped "done", and FINGER_REST completes
 *   on a touch barely longer than a tap (FINGER_REST_MIN_MS) - both too light
 *   to read as the user having let the pull go.
 * - Grounding is not an intervention mode (it is the dashboard's down-drag
 *   offer, which never reaches the time choice).
 */
export const LETTING_BE_MODES: readonly InteractionMode[] = [
  "URGE_SURFING",
  "BELL",
  "BREATH",
];

// Prompts that were already about alternatives - offering one again on the
// way out would be the same question twice.
const ALTERNATIVE_MODES: readonly InteractionMode[] = [
  "SHOW_ALTERNATIVE",
  "SET_ALTERNATIVE",
];

export interface PostSunRedirectInput {
  /** The mode the intervention opened with. */
  mode: InteractionMode | undefined;
  /** The prompt was completed (its onSuccess fired) before the sun tap. */
  hasCompleted: boolean;
  /** This platform's best alternative candidate, if any is enabled. */
  alternative: Alternative | undefined;
  capabilities: AlternativeOpenCapabilities;
}

export const getPostSunRedirect = ({
  mode,
  hasCompleted,
  alternative,
  capabilities,
}: PostSunRedirectInput): PostSunRedirect => {
  if (!mode) return { lead: "stay" };

  // The bedtime moon's tap is the "staying up a little longer" path - its own
  // drag-down is the goodnight. A pattern insight puts "still on purpose",
  // its alternative and "leave now" side by side: whether the user answered
  // it or tapped past all three, both other exits were just declined.
  // Both already chose: honour it.
  if (mode === "WIND_DOWN_SETTLE" || mode === "PATTERN_INSIGHT") {
    return { lead: "stay" };
  }

  if (hasCompleted && LETTING_BE_MODES.includes(mode)) {
    return { lead: "leave" };
  }

  if (alternative && !ALTERNATIVE_MODES.includes(mode)) {
    return {
      lead: "alternative",
      alternative,
      target: getAlternativeOpenTarget(alternative, capabilities),
    };
  }

  return { lead: "stay" };
};

/** The leave-led question, spoken in the serif voice. */
export const LEAVE_QUESTION = "Leave it here?";
/** The leave choice - the tap-shaped twin of the fling's "let go". */
export const LEAVE_LABEL = "Let go";
/** Staying: on to the unchanged time choice. */
export const STAY_LABEL = "Stay";
/** The calm beat between choosing to leave and the leave itself. */
export const LEAVE_BEAT = "Go gently.";
