# Spec: the friction-gated sun on blocked apps

Status: **design; partially in flight.** The interactive sun bubble is landing in
PR #51. This doc is the surrounding design — when the sun appears on a blocked
app, what it does, and how we make the response gentler *without* losing the
reflective questions. The invitation-only home-screen companion is a separate
surface (`docs/sun-companion-widget.md`).

## The question this answers

Original ask: *"show the sun always, not just for blocked apps — maybe drop the
blocked-apps concept."* Where it landed, after working it through:

- **Keep blocked apps** — they're the trigger signal — but **soften the framing**,
  away from a "block / naughty list" toward "where the pull usually happens."
- **Surface the sun more, gated by *friction*, not detection certainty.** On a calm
  moment the sun *is* the whole response; when the pull is real the fuller
  reflective intervention still fires.
- The sun is one continuous, always-morphing object (see `CLAUDE.md`); on a
  blocked app it is both the gentle interrupt and the escape hatch.

So your instinct — *don't hit them with the full intervention every time* — is the
design. We just spell "when" as friction rather than "always," and keep the
blocklist as the trigger.

## Locked decisions (do not regress)

Decided in review + owner direction.

**Baseline: PR #51** ("Android: make the little sun an interactive, non-blocking
bubble") is landing and already implements the simpler variant — a draggable
chat-head bubble that, on *tap*, expands the *same native overlay window* into a
full-screen pause + soft "Step away?" invitation (auto-dismissing, never
blocking). Crucially it does the pause in **native Compose** by swapping the one
window's layout params (`LittleSunWindow.kt` resting vs. expanded params), so it
**sidesteps the native→WebView seam** the review flagged as a blocker.

- **Auto-arriving pause — DEFERRED, not cut.** Keep the concept; ship and test the
  simpler *tap-only* variant first (PR #51), then decide from real use whether the
  sun should ever bring the pause on its own. The open strategic question (an
  interrupt dismissed ~9/10 when unready is friction; but a self-initiated pause
  may be too weak for the willpower-eroded user) is exactly what testing resolves.
- **Escalation — CUT.** No dwell-driven growth, no swelling glow, no "harder to
  ignore over time." A rising-intensity ramp tied to elapsed time manufactures
  urgency, which the fundamentals forbid.
- **No breathing outside meditations.** The everyday sun does not "breathe"; the
  breathing swell is reserved for guided meditations (e.g. urge-surfing). CLAUDE.md
  updated to match (see Follow-ups for the PR #51 conflict).
- **The sun always morphs; there is only one.** One continuous object that
  glides/scales between states — never a hard cut, never vanishing, never in two
  places. Where a flow can't morph yet (native overlay → WebView), the job is to
  *make* it morph.
- **The reflective questions are preserved.** `getInteractionMode`'s content
  (why-reduce, energy check, alternative, pattern insight, …) is the "reflect" in
  interrupt → reflect → redirect. Friction decides how eagerly we reach for a
  question; it never deletes them.

## The response, by friction

The sun appears on a blocked app — its arrival/morph is itself the gentle
pattern-break. What follows is gated by the existing friction level
(`getFrictionLevel`, `interactionContext.ts` — runs on both platforms from shared
`SyncData`):

- **soft** (calm, early opening, no recent returns) → the **ambient sun is the
  whole response.** A draggable companion bubble (PR #51); tap opens a calm pause.
  No question is pushed automatically. This is the new gentleness — we stop hitting
  *every* blocked-app open with the full intervention.
- **normal / strong** (the pull is real) → the **reflective intervention fires** —
  the questions, unchanged from today. Soft is the *only* case where they're held
  back.

**The questions are not lost — and the sun opens into them.** The tap-pause should
route into the existing `getInteractionMode` flow (a gentle question and/or "Step
away?"), not a bare step-away. So even from a soft-moment sun, the user who engages
reaches the same reflective content; we just don't *force* it when the moment is
calm.

Detection **confidence (Android) folds into friction** — an uncertain detection is
a weak reason to escalate, so it biases toward soft (sun only). Confidence never
gates the UI directly, so web (which has no confidence concept) shares one model.

## The sun itself

- Draggable bubble at rest (PR #51, `LittleSunWindow.kt` / `LittleSun.kt`); the app
  underneath stays interactive (wrap-content, so only the bubble's bounds capture
  touches).
- Tap → calm pause → question / "Step away?", auto-dismissing, never blocking.
- One object, always morphing; no auto-arriving pause, no escalation, no breathing
  outside meditations (see Locked decisions + Follow-ups).

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
  and the overlay reads synchronously at show time. Untraps the ground-truth signal
  so the decisive draw consults live truth, not a captured string.
- **Honesty:** fully sound with accessibility alive; without it the poll's own lag
  means this *narrows* but doesn't *eliminate* the stale window. A cheap ambient
  sun tolerates the residue — which is exactly why cutting the auto-pause matters.

## Accessibility optional: the prerequisite

The detector (`HybridAppDetector`) currently lives **inside**
`MyAccessibilityService` and dies with it — so with accessibility off there is no
poll, no detection, no sun. To make accessibility genuinely optional it must be
**re-parented into the foreground service** (`OverlayControllerService`, which
already owns overlay rendering and runs independently). Until that lands, "works
without accessibility" is not real.

## Cross-platform (web)

- Web reaches **soft** behaviorally (early opening, no recent returns) — no fake
  "confidence" needed.
- Reuse `LittleSunComponent` for the ambient sun and the existing `InteractionWeb`
  for the questions; soft → mount the sun first, normal/strong → the intervention.
- Re-confirmation on web = page visibility; fade out on hidden / navigation.

## Slices (shippable order)

1. **Liveness gate** (2a + 2b) — fixes the stale-show bug; self-contained, no
   philosophy or state-machine risk. **Do this first.**
2. **Detector re-parenting** — the prerequisite for optional accessibility.
3. **Friction-gated entry** — soft → ambient sun, normal/strong → questions; web
   mirror. Plus the deferred PR #51 morph + breathing fix.

## Guardrails preserved

- **Count-up, blank below 30 s** (`formatTime.ts`) — never a clock from the moment
  the sun appears.
- **Countdown stays for user-chosen timed sessions** — an honest receipt of the
  user's own boundary, not an imposed budget.
- **All transitions fade/morph** — no hard cuts.
- **Observed behaviour only** — nothing here infers a feeling.
- **Minimalism** — no new screens; reuse the sun, the questions, the existing
  overlay decision chokepoint.
- **The questions stay** — soft only *defers* them; it never removes them.

## Open to tune

- Friction thresholds for the gate (default: the existing `getFrictionLevel`).
- Whether the soft-moment tap-pause offers a question, "Step away?", or both.

## Out of scope

- Making detection perfect (impossible on the platform — the point is to stop
  needing it).
- Requiring accessibility (it only sharpens; folds into friction).
- iOS (`docs/ios-platform-fit.md`).

## Follow-ups (deferred)

- **Morph + breathing fix on the tap-pause — deferred.** PR #51 lands as-is (with
  its repeating breath and its bubble→full-screen cross-fade). The fix is a later,
  contained change in `LittleSun.kt` (`StepAwayOffer` / `Bubble`): (1) remove the
  repeating `breath` infinite transition — no breathing outside meditations;
  (2) replace the cross-fade swap with a single positional morph — the sun glides +
  grows from its parked bubble position to centre, holds, then the "Step away?"
  invite fades in. One file, does not block #51.
