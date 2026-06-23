# Spec: the always-soft sun on blocked apps

Status: **design; partially in flight.** The interactive sun bubble is landing in
PR #51. This doc is the surrounding design — the everyday intervention on a blocked
app stays *always-on and soft*, and the work is to make it something people don't
fear rather than something that escalates. The invitation-only home-screen
companion is a separate surface (`docs/sun-companion-widget.md`).

## The question this answers

Original ask: *"show the sun always, not just for blocked apps — maybe drop the
blocked-apps concept."* Where it landed:

- **Keep blocked apps** — they're the trigger signal — but **soften the framing**,
  away from a "block / naughty list" toward "where the pull usually happens."
- **Keep the soft intervention always showing on Android.** The dread people feel
  doesn't come from interventions *existing* — it comes from **escalation and
  unpredictability** (a thing that might get worse, or that you can't predict, is
  something you brace against). Remove escalation, keep the intervention consistent
  and gentle, and the fear has nowhere to live. Frequency was never the problem —
  you don't fear a friend who says hi every time.
- The sun is one continuous, always-morphing object (`CLAUDE.md`); on a blocked app
  it is both the gentle interrupt and the escape hatch.

## Locked decisions (do not regress)

Decided in review + owner direction.

**Baseline: PR #51** ("Android: make the little sun an interactive, non-blocking
bubble") is landing — a draggable chat-head bubble that, on *tap*, expands the
*same native overlay window* into a full-screen pause + soft "Step away?" invite
(auto-dismissing, never blocking). It does the pause in native Compose, sidestepping
the native→WebView seam the review flagged as a blocker.

- **No escalation.** No dwell-driven growth, no swelling glow, no "harder to ignore
  over time," and no ramping to a harsher/feared register with repetition. The
  intervention's intensity stays **flat and soft**. Friction may still vary *which*
  gentle prompt appears (variety); it never gates *whether* to intervene and never
  escalates *how hard*.
- **Auto-arriving pause — DEFERRED, not cut.** Keep the concept; the simpler
  tap-only variant (PR #51) ships first; decide later from real use whether the sun
  should ever bring the pause on its own.
- **The reflective questions are preserved.** `getInteractionMode`'s content
  (why-reduce, energy check, alternative, pattern insight, …) is the "reflect" in
  interrupt → reflect → redirect. They always remain available; the polish below
  reframes them as invitation, never a gate.
- **No breathing outside meditations.** The everyday sun does not "breathe"; the
  breathing swell is reserved for guided meditations (e.g. urge-surfing).
- **The sun always morphs; there is only one.** One continuous object that
  glides/scales between states — never a hard cut, never vanishing, never in two
  places. Where a flow can't morph yet (native overlay → WebView), make it morph.

## The everyday intervention: always-on, soft, un-feared

The intervention fires every time on a blocked app and stays in the gentle
register. The whole job is to make that *welcome rather than dreaded*. Four
directions, all about removing fear, none about adding force:

1. **Lock the *shape*, vary the *warmth*.** Same gentle morph-in, same instant
   fling-away, every single time — nothing to brace for. Let only the content
   (which question/word) vary. Predictability is the feature.
2. **Make the exit feel *wanted*.** The dread of any interruption is "am I trapped /
   will this cost me." Over-invest in the pass: instant from the first frame, never
   "are you sure?", never counted (PR #51 already leaves the step-away untallied —
   apply that ethos to the fling too). The sun holds the door open, it never blocks
   it.
3. **Give before it asks.** Lead with calm (the sun's presence/morph), not a
   question — the question is a soft, optional second beat you can fling past. The
   questions stay; they just become an invitation, not a toll.
4. **Familiarity is the antidote, and the morph delivers it.** Because it's one
   continuous sun that always morphs in (never a jarring pop, never a new screen),
   repetition turns it into a known companion instead of a recurring ambush. The
   "always morph / only one sun" rule is *what makes a frequent intervention feel
   safe*.

**The one honest risk:** always-on can drift into habituation / fatigue —
wallpaper you resent. Escalation would "fix" that by getting louder, which is the
exact fear-move we're rejecting. The right counter is **variety and lightness**,
not intensity: keep the content fresh (the existing routing already varies it), and
let many opens be just the sun + a word rather than a full prompt.

## iOS as the zero-friction arm

iOS's constraints force the pure-presence extreme (home-screen companion sun, no
detection, no intervention — `docs/sun-companion-widget.md`). That makes it a free
natural experiment: **Android = always-soft intervention; iOS = no friction at
all.** If the no-friction arm surprisingly retains/helps, migrate Android toward
less. Honest caveat: with no telemetry this is a *felt/qualitative* read, not data —
trust it for what it is.

## Reliability: the liveness gate (ship first)

The one genuinely-needed reliability fix, independent of everything above.

- **The bug:** detection lags 0.5–2 s, so the sun can be drawn *after* the user has
  already left the blocked app (`OverlayControllerService.showOverlay` trusts the
  package captured at detection time and never re-checks).
- **2a — drop stale shows.** `ValidatedDetection` already carries a timestamp
  (`HybridAppDetector.kt`); thread it through the overlay intent (today only the
  package name survives, `MyAccessibilityService.kt:384-387`) and reject shows
  older than ~one poll interval.
- **2b — freshest-foreground accessor.** A small shared holder both channels write
  (the accessibility focused-window read `computeFocusedAppPackage`, and the poll)
  and the overlay reads synchronously at show time — so the decisive draw consults
  live truth, not a captured string.
- **Honesty:** fully sound with accessibility alive; without it the poll's own lag
  means this *narrows* but doesn't *eliminate* the stale window. A soft, dismissible
  sun tolerates the residue.

## Accessibility optional: the prerequisite

The detector (`HybridAppDetector`) currently lives **inside**
`MyAccessibilityService` and dies with it — so with accessibility off there is no
poll, no detection, no sun. To make accessibility genuinely optional it must be
**re-parented into the foreground service** (`OverlayControllerService`, which
already owns overlay rendering and runs independently). Until that lands, "works
without accessibility" is not real.

## Cross-platform (web)

- Web already shows the intervention on every blocked page; the four polish
  directions apply unchanged.
- The sun is `LittleSunComponent`; the questions are `InteractionWeb`. No fake
  "confidence" or friction-gating needed.
- iOS is the no-friction arm (above), not a detection target.

## Slices (shippable order)

1. **Liveness gate** (2a + 2b) — fixes the stale-show bug; self-contained. **First.**
2. **Detector re-parenting** — the prerequisite for optional accessibility.
3. **Un-feared polish** — the four directions above (lock-shape/vary-warmth, wanted
   exit, give-before-ask, familiarity), plus the deferred PR #51 morph + breathing
   fix.

## Guardrails preserved

- **Count-up, blank below 30 s** (`formatTime.ts`) — never a clock from the moment
  the sun appears.
- **Countdown stays for user-chosen timed sessions** — an honest receipt of the
  user's own boundary, not an imposed budget.
- **All transitions fade/morph** — no hard cuts.
- **Observed behaviour only** — nothing here infers a feeling.
- **Minimalism** — no new screens; reuse the sun, the questions, the existing
  overlay chokepoint.
- **The questions stay** — always available; the polish reframes them, never removes
  them.

## Out of scope

- Making detection perfect (impossible on the platform — the point is to stop
  needing it).
- Requiring accessibility (it only sharpens).
- iOS interventions (iOS is the no-friction arm).

## Follow-ups (deferred)

- **Morph + breathing fix on the tap-pause — deferred.** PR #51 lands as-is (with
  its repeating breath and its bubble→full-screen cross-fade). The fix is a later,
  contained change in `LittleSun.kt` (`StepAwayOffer` / `Bubble`): (1) remove the
  repeating `breath` infinite transition — no breathing outside meditations;
  (2) replace the cross-fade swap with a single positional morph — the sun glides +
  grows from its parked bubble position to centre, holds, then the "Step away?"
  invite fades in. One file, does not block #51.
