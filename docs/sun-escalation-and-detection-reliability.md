# Spec: the always-soft sun on blocked apps

Status: **design; partially in flight.** The interactive sun bubble is landing in
PR #51. This doc is the surrounding design - the everyday intervention on a blocked
app stays *always-on and soft*, and the work is to make it something people don't
fear rather than something that escalates. The invitation-only home-screen
companion is a separate surface (`docs/sun-companion-widget.md`).

## The question this answers

Original ask: *"show the sun always, not just for blocked apps - maybe drop the
blocked-apps concept."* Where it landed:

- **Keep blocked apps** - they're the trigger signal - but **soften the framing**,
  away from a "block / naughty list" toward "where the pull usually happens."
- **Keep the soft intervention always showing on Android.** The dread people feel
  doesn't come from interventions *existing* - it comes from **escalation and
  unpredictability** (a thing that might get worse, or that you can't predict, is
  something you brace against). Remove escalation, keep the intervention consistent
  and gentle, and the fear has nowhere to live. Frequency was never the problem -
  you don't fear a friend who says hi every time.
- The sun is one continuous, always-morphing object (`CLAUDE.md`); on a blocked app
  it is both the gentle interrupt and the escape hatch.

## Locked decisions (do not regress)

Decided in review + owner direction.

**Revised (2026-07): the ported fling / overshoot-set gestures are replaced by a
visible "horizon" drop zone.** The 2026-06 revision (below) ported the in-app
sun's fling and drag-down thresholds 1:1 onto the bubble. In practice (owner
feedback) that didn't survive contact with the bubble's architecture: the leave
had to carry the disc off-screen by moving the tiny wrap-content overlay
*window* every frame (`updateViewLayout`, which is not frame-synced - the fling
looked broken rather than physical); the overshoot set had **no visible trigger
area** at all; and its bottom-edge trigger collided with the bubble's own
parking spots at the screen edges. So the step-away is still offered on the
bubble itself, but as **one clear, indicated gesture**: while the bubble is
being dragged, a soft **horizon glow + a small "Step away" label** fades in at
the bottom-centre of the screen (its own non-touchable overlay window,
`LittleSunLeaveZone.kt`); carrying the sun into it magnetizes the disc onto the
glow (haptic tick - unmistakably armed, drag back out to cancel); releasing
lets the sun **set below the horizon** and opens minded. The set animates
*inside* the full-width zone window (a frame-synced Compose transform, as
smooth as the in-app sun) instead of moving the bubble window. Any other drag -
to any edge or corner - just repositions the bubble (parkable anywhere the
clamp allows); a plain tap does nothing (so a stray touch neither ejects the
user nor detonates a surface). The **fling leave is cut** per owner direction:
it was un-smoothable in a window-move architecture and redundant next to a
visible target; the universal fling escape hatch still lives on the in-app sun,
where a full-viewport surface can do it justice. (`LittleSun.kt`,
`LittleSunLeaveZone.kt`, `LittleSunWindow.kt`, geometry in
`LittleSunPosition.kt`.)

**Superseded (2026-06): step-away via fling / drag-past-the-clamp on the
bubble.** This revision removed PR #51's full-screen pause - tapping did nothing
actionable, then the leave demanded a second, hidden, heavy drag inside a modal
that overran the calm a casual companion tap deserves - and offered the
step-away on the bubble itself instead: fling it, or drag it ~100 dp past its
lowest allowed rest, with thresholds and physics ported 1:1 from
`sunAnimationUtils.ts` and applied by moving the bubble's own window. What
*survives* from it: no additional full-screen surface, the leave lives on the
bubble, tap stays inert, and the rest of this doc's framing - no escalation,
the leave must feel *wanted*, one always-morphing sun. What was replaced (by
the 2026-07 revision above): the invisible thresholds and the window-move leave
animations.

**Original baseline: PR #51** ("Android: make the little sun an interactive,
non-blocking bubble") - a draggable chat-head bubble that, on *tap*, expanded the
*same native overlay window* into a full-screen pause + soft "Step away?" invite
(auto-dismissing, never blocking). It did the pause in native Compose, sidestepping
the native→WebView seam the review flagged as a blocker. **Superseded by the
revision above.**

- **No escalation.** No dwell-driven growth, no swelling glow, no "harder to ignore
  over time," and no ramping to a harsher/feared register with repetition. The
  intervention's intensity stays **flat and soft**. Friction may still vary *which*
  gentle prompt appears (variety); it never gates *whether* to intervene and never
  escalates *how hard*.
- **Auto-arriving pause - DEFERRED, not cut.** Keep the concept; the simpler
  tap-only variant (PR #51) ships first; decide later from real use whether the sun
  should ever bring the pause on its own.
- **The reflective questions are preserved.** `getInteractionMode`'s content
  (why-reduce, energy check, alternative, pattern insight, …) is the "reflect" in
  interrupt → reflect → redirect. They always remain available; the polish below
  reframes them as invitation, never a gate.
- **Breathing only in *guided* breath pauses.** A repeating breath belongs to
  guided meditations (e.g. urge-surfing) and the strong-friction breath pause
  (`StrongFrictionBreathPause`, **kept** - it guides breathe-in / hold / out). The
  ambient / companion / everyday-soft sun never carries an unguided breath - which
  is why the PR #51 tap-pause's *ambient* breath becomes a morph (see Follow-ups).
- **The sun always morphs; there is only one.** One continuous object that
  glides/scales between states - never a hard cut, never vanishing, never in two
  places. Where a flow can't morph yet (native overlay → WebView), make it morph.

## The everyday intervention: always-on, soft, un-feared

> **"Rare" applies to content, not presence.** The ~90% / "rare and dismissible"
> bar (`docs/reflective-companion-concept.md`) governs the reflective *questions
> and insights* we surface - not the sun's presence. The sun appears on every
> blocked-app open *because* that consistency is what makes it feel safe rather
> than an ambush. "Rare" means each *thing we say* must clear the bar in the
> moment; it never meant show the sun rarely.

The intervention fires every time on a blocked app and stays in the gentle
register. The whole job is to make that *welcome rather than dreaded*. Four
directions, all about removing fear, none about adding force:

1. **Lock the *shape*, vary the *warmth*.** Same gentle morph-in, same instant
   fling-away, every single time - nothing to brace for. Let only the content
   (which question/word) vary. Predictability is the feature.
2. **Make the exit feel *wanted*.** The dread of any interruption is "am I trapped /
   will this cost me." Over-invest in the pass: instant from the first frame, never
   "are you sure?", never counted (PR #51 already leaves the step-away untallied -
   apply that ethos to the fling too). The sun holds the door open, it never blocks
   it.
3. **Give before it asks.** Lead with calm (the sun's presence/morph), not a
   question - the question is a soft, optional second beat you can fling past. The
   questions stay; they just become an invitation, not a toll.
4. **Familiarity is the antidote, and the morph delivers it.** Because it's one
   continuous sun that always morphs in (never a jarring pop, never a new screen),
   repetition turns it into a known companion instead of a recurring ambush. The
   "always morph / only one sun" rule is *what makes a frequent intervention feel
   safe*.

**The one honest risk:** always-on can drift into habituation / fatigue -
wallpaper you resent. Escalation would "fix" that by getting louder, which is the
exact fear-move we're rejecting. The right counter is **variety and lightness**,
not intensity: keep the content fresh (the existing routing already varies it), and
let many opens be just the sun + a word rather than a full prompt.

## The skip check-in: when the pause is passed on autopilot (2026-09)

Owner feedback: most interventions were being tapped straight through - partly
because the owner was genuinely fine with how they used the configured apps,
partly out of plain muscle memory. A pass that is pure muscle memory is worth
nothing, and until now minded never noticed passes at all (only a completed
prompt feeds `sunTaps`), so someone who always taps past got the same full
doorway pause forever. That is the habituation risk above, arrived.

**What it does.** After `SKIP_CHECK_IN_THRESHOLD` (10) interventions in a row
tapped past into the app, the next intervention - instead of its usual
prompt - asks once:

> *You've been tapping past the sun lately.*
> *How should the sun meet you?*
> **As it does now** · **Only after a while** · **Not this week**

- **As it does now** - carry on; the count starts over, and the check-in won't
  ask again for a week.
- **Only after a while** - for a week the Little Sun still meets every open,
  but the full pause waits until the session has run ~10 minutes
  (`LATER_PAUSE_AFTER_S`; on Android only minutes with the screen on and
  unlocked count - a per-app unlocked-session count that both the hand-back and
  the next open's decision read - so nobody unlocks straight into a pause),
  then arrives by the usual corner morph. It moves the
  pause from the doorway, where the thumb has learned to skip, to mid-session,
  where it hasn't - and where drifting actually happens.
- **Not this week** - minded stays out of the way entirely for a week.

**Why asking, not inferring.** A pass can't tell "I'm fine" from "I'm on
autopilot" - the most hooked user passes the most. Guessing either way fails the
~90% bar; asking doesn't. Whatever the user picks, they picked it awake, which is
the point of the app. A week off they chose beats the realistic alternative
(disabling accessibility or uninstalling), because minded comes back.

**Guardrails (do not regress):**
- **The copy states what happened, never how often or what it means.** No count,
  no "you don't seem to need minded", no "you skipped", and never "go in" for
  continuing into the app. Guarded by `skipCheckIn.test.ts`.
- **A fork, not a wall.** The triple-tap (and its keyboard / native loading-sun
  equivalents, and Escape on the web) is off on this one screen, because the
  choices are the way in; the fling still leaves. No countdown, no delay.
- **The thumb that's already tapping.** The check-in lands mid-triple-tap, so the
  choices only respond once faded in (`SKIP_CHECK_IN_ARM_MS`) - a reflexive tap
  must never pick a week off for the user.
- **Rare: at most once a week.** Every answer - "As it does now" included -
  stands for a week, and the streak is frozen while it does. Showing the
  check-in uses the ask up: one simply left (home button, closed tab) comes back
  only after a fresh run of passes, never on every open.
- **"Lately" must be true.** A gap of more than `SKIP_STREAK_MAX_GAP_MS` (3 days)
  between passes starts the count over, and a streak whose last pass is older
  than that can't bring the check-in.
- **The streak is never shown and never feeds friction or copy.** It only decides
  when to ask, and never counts where the router can't ask (the dashboard, a
  pause opened on purpose; iOS; the bedtime window, so the check-in is never
  about moon taps).
- **A pass** is continuing into the app without having done the prompt: the
  triple-tap continue, a mode's own skip button, the native loading-sun tap -
  the taps the copy names. (Escape on the web isn't a tap, so it isn't counted.)
  A read-only prompt tapped past still counts - it can be passed on autopilot. **Doing the prompt, sitting through the strong-friction
  breath (which can't be passed on autopilot), or leaving starts the count
  over.**
- **Never at bedtime** - the wordless settle keeps that window.
- **Visible and undoable.** While a week stands, Settings shows one line and
  "Resume now". When it ends it simply ends: no "welcome back", no re-ask.

This revises one line of the locked baseline: "the soft intervention always shows"
becomes "the sun always shows; the full pause meets the user at the door or, for
a chosen week, mid-session". Presence stays constant, which is what this doc's
"rare applies to content, not presence" was protecting.

Where it lives: `interaction/skipCheckIn/` (rules, copy, UI, and the flow that
counts passes), the `SKIP_CHECK_IN` gate at the top of `getInteractionMode`, the
"later" week as a widened grace on the web (`util/sessionGrace.ts`), and on
Android `util/InterventionPause.kt` (mirrored constants, guarded by
`interventionPauseMirror.test.ts`), the `ShowLittleSunUntilPause` decision, and
the Little Sun's mid-session hand-back.

## iOS as the zero-friction arm

iOS's constraints force the pure-presence extreme (home-screen companion sun, no
detection, no intervention - `docs/sun-companion-widget.md`). That makes it a free
natural experiment: **Android = always-soft intervention; iOS = no friction at
all.** If the no-friction arm surprisingly retains/helps, migrate Android toward
less. Honest caveat: with no telemetry this is a *felt/qualitative* read, not data -
trust it for what it is.

## Reliability: the liveness gate (ship first)

The one genuinely-needed reliability fix, independent of everything above. The bug:
detection lags 0.5–2 s, so the sun can be drawn *after* the user has already left
the blocked app (`OverlayControllerService.showOverlay` trusts the package captured
at detection time and never re-checks). Two complementary guards:

- **2a - age guard (delayed delivery).** `ValidatedDetection` carries an *emit*
  timestamp (`HybridAppDetector.kt`); thread it through the overlay intent (today
  only the package survives the `triggerOverlay` →
  `INTENT_EXTRA_CURRENT_PACKAGE_NAME` path) and have the pure
  `OverlayDecisionEngine.decide` reject a detection delivered too late. Cheap,
  fully unit-testable. **Its limit:** the timestamp is *emit* time, so it catches a
  detection that sat in the pipe - not one that was already stale *when read* (the
  poll can read a 1–2 s-old foreground and emit it "fresh"). That case needs 2b.
- **2b - render-time foreground re-check (the substantive fix).** Right before
  drawing, consult the freshest foreground the detectors have *already published*
  and skip the draw if it is no longer the target app. This is what actually catches
  "the user already left." Mechanism is a **push-cache, not a blocking pull**: every
  confident read is pushed into a small process-wide `@Volatile` holder
  (`ForegroundStateHolder`, mirroring `MyAccessibilityService`'s `focusSnapshot`) -
  the accessibility focused-window read publishes a live (age ≈ 0) read, and the
  usage-stats poll publishes its read stamped with the read's *real* age
  (`now - ageMs`) so a laggy/stale read is recognisably old. The overlay controller
  reads this holder synchronously and the pure `OverlayDecisionEngine` acts only on
  evidence that is present, recent (`FOREGROUND_FRESH_WINDOW_MS`), and at least as
  new as the detection it would override. Why a cache and not a literal re-read: the
  only foreground source reachable from the overlay controller is the laggy
  `getForegroundAppReliable` (`computeFocusedAppPackage` lives inside the
  accessibility service and isn't callable cross-service), and calling it on the
  service-start path would block the main thread on 0.5–2 s of binder IPC for a
  reading no fresher than what the detectors already publish.
- **Honesty:** 2b is authoritative only while accessibility is alive - its writer
  (the detector) dies with the accessibility service, which is the Slice 2
  re-parenting work. Without accessibility it degrades to the laggy poll: the stale
  window *narrows* but isn't eliminated. A soft, dismissible sun tolerates the
  residue.

## Accessibility optional: the prerequisite

The detector (`HybridAppDetector`) currently lives **inside**
`MyAccessibilityService` and dies with it - so with accessibility off there is no
poll, no detection, no sun. To make accessibility genuinely optional it must be
**re-parented into the foreground service** (`OverlayControllerService`, which
already owns overlay rendering and runs independently). Until that lands, "works
without accessibility" is not real.

What *is* real already: the dead-service state is visible. The service keeps a
connected flag (`MyAccessibilityService.isConnected`), the main bridge exposes it
with the settings state as `DetectionHealth`, and the Android shell shows one calm
line on the dashboard when the service is enabled in settings but not bound
("minded can't see your apps right now") - the one failure the permission checks
can't see. It is a fact about the binding, never an inference from event
silence, so it can't fire on a phone that is merely idle.

## Cross-platform (web)

- Web already shows the intervention on every blocked page; the four polish
  directions apply unchanged.
- The sun is `LittleSunComponent`; the questions are `InteractionWeb`. No fake
  "confidence" or friction-gating needed.
- iOS is the no-friction arm (above), not a detection target.

## Slices (shippable order)

1. **Liveness gate** (2a + 2b) - fixes the stale-show bug; self-contained. **First.**
2. **Detector re-parenting** - the prerequisite for optional accessibility.
3. **Un-feared polish** - the four directions above (lock-shape/vary-warmth, wanted
   exit, give-before-ask, familiarity), plus the deferred PR #51 morph + breathing
   fix.

## Guardrails preserved

- **Count-up, blank below 30 s** (`formatTime.ts`) - never a clock from the moment
  the sun appears.
- **Countdown stays for user-chosen timed sessions** - an honest receipt of the
  user's own boundary, not an imposed budget.
- **All transitions fade/morph** - no hard cuts.
- **Observed behaviour only** - nothing here infers a feeling.
- **Minimalism** - no new screens; reuse the sun, the questions, the existing
  overlay chokepoint.
- **The questions stay** - always available; the polish reframes them, never removes
  them.

## Out of scope

- Making detection perfect (impossible on the platform - the point is to stop
  needing it).
- Requiring accessibility (it only sharpens).
- iOS interventions (iOS is the no-friction arm).

## Follow-ups (deferred)

- **The tap-pause morph/cross-fade follow-up is now moot - the pause itself was
  removed.** This note tracked polishing the bubble→full-screen pause's open/close
  morph (the close path needed an 80 ms cross-fade because the single window had to
  *resize*, and a true positional morph would have meant a two-window rearchitecture).
  The 2026-06 revision removed the full-screen pause entirely, so there is no
  expand/resize/cross-fade left to morph.
- **The window-move leave throw is gone (2026-07).** The 2026-06 revision
  carried the leave off-screen by moving the little sun's own wrap-content
  window per frame (`onLeaveMove`) to avoid any larger surface. That is what
  made the fling look broken - `updateViewLayout` is not frame-synced - and it
  is why the fling was cut. The set now animates inside the bottom-anchored
  leave-zone window (`LittleSunLeaveZone.kt`): still not a full-screen surface,
  still no native→WebView seam, and the animation is a frame-synced Compose
  transform. The set keeps the brisk `SET_MS` (≈620 ms) rather than the web's
  3 s - the exit must feel *wanted*, not slow.
