# Conceptual analysis - what works, what doesn't (July 2026)

Status: **analysis snapshot; in-scope findings fixed in the same change.** A
full conceptual read of the app - philosophy, mechanics, copy, architecture -
against its own stated fundamentals (`CLAUDE.md`,
`docs/reflective-companion-concept.md`,
`docs/sun-escalation-and-detection-reliability.md`). Written from a complete
pass over the shared UI, the intervention system, the Android native side, the
extension data layer, and the iOS widget.

Fixed alongside this doc: T1 (practice completions no longer feed friction),
T2 (baseline comparison removed end-to-end), T4 (screen-off countdown copy),
the settings wall-vocabulary half of T3 (also resolves #185, part of #165 and
#161), G1's silent answer-loss path (now honest + tested - resolves #153),
G2 (stale docs corrected - CI does wire the widget), the quote pool
(P1 - resolves #166), and the P2 comment/dead-code drift. Tracked as issues:
the read-modify-write races (#209), the active-hours boundary gap (#210), the
throttle-field reuse (#211); the fresh-detection shield morph and the
untested native path were already tracked (#118, #160, #151, #71).

## Verdict in one paragraph

The concept is unusually coherent and - rarer - actually enforced in code: the
anti-striving philosophy shows up as structure (no tallies, no streaks,
auto-dismissing offers, a universal escape hatch, deliberately-vague counts,
unit tests that mechanically guard copy rules). The weaknesses are not
philosophical drift but four specific cracks: (1) a feedback loop where
*completing* mindful practices escalates future friction, (2) the single most
common user moment - a fresh intervention on Android - is the one place the
"always morph, never hard-cut" rule is broken, (3) the extension can silently
lose the user's reflections (the most personal artifact the app holds), and
(4) iOS currently ships a shell whose entire value proposition (the widget)
may not be in the build. Plus one copy line ("Usually around X by now") that
edges over the app's own 90% bar.

---

## What works well

### 1. The philosophy is structural, not aspirational

Most apps state values; this one encodes them. Examples found all over the
tree, not in a manifesto:

- Let-go answers are deliberately **not persisted** (`letGo.const.ts` -
  "archiving it would contradict the gesture").
- The pattern insight says "a few times", never a number ("never a tally to
  beat", `patternInsight.ts`).
- The Little Sun's grace timer counts **up**, explicitly to avoid
  "manufacturing the very urgency we avoid" (`LittleSun.tsx`).
- Grounding and wind-down close on "a wordless settle beat - no praise, no
  verdict"; the wind-down exit is always just "Goodnight", never an
  "all done" tally.
- The daily-budget feature was genuinely excised (#38): no user-facing
  budget/near-limit copy survives anywhere - only clearly-labeled dormant
  storage fields kept for sync-contract stability.
- Widget copy rules (≤60 chars, no questions, verbatim parity with the
  interaction pools, night = wordless moon) are enforced by Jest/JVM tests,
  not convention.
- `RefocusHelperToday` was parked *because* it "leans productivity" - the
  philosophy actively removes content, not just adds it.

This is the app's biggest asset: a contributor (or future you) cannot easily
regress the premise by accident, because the premise is load-bearing code.

### 2. The sun is a genuinely great central mechanic

One object that is simultaneously the interrupt, the pause, the escape hatch,
and the companion resolves the core tension of the category (intervention vs.
gentleness) elegantly. Details that make it work:

- **Direction picks the ritual, never randomness**: dashboard drag-down =
  grounding ("Stay a while?"), fling = let go. The gesture vocabulary is tiny
  and teachable - onboarding teaches it *by doing* (tap = the pause, fling =
  dismissal).
- **The one-sun/always-morph rule is real architecture** (`sunStore.ts`
  singleton, morph phases, corner-handoff choreography), not a visual trick.
- The escape is over-invested exactly as the escalation doc demands: instant,
  never "are you sure?", never counted against you (with one exception - see
  Tension 1).

### 3. Routing restraint and the 90% bar hold up under inspection

`getInteractionMode.ts` really is context-first: hard gates (first-answer,
energy freshness, evening, strong-friction branch, expired intent) run before
any dice, and the probabilities mostly add variety among already-eligible
gentle options. The copy inventory across all 14 modes is consistently
observed-behaviour, present-moment, non-judgmental. The cut lists in the docs
(mood echo, emotion echo, budget copy) were actually cut in the code. The bar
is being held.

### 4. Platform honesty is a strength, not a compromise

The iOS decision (`docs/ios-platform-fit.md`) is the best piece of product
thinking in the repo: it corrects its own earlier false premise, names the
real blocker (the shield primitive is a wall, off-philosophy), and lands on a
reframe (presence + invitation) rather than a degraded port. Android-only
wind-down is the same discipline. The "iOS = no-friction arm, Android =
always-soft arm" natural experiment framing is honest about what a
no-telemetry product can and can't learn.

### 5. The calm surfaces practice what they preach

The dashboard greeting **never measures** - no counts, minutes, streaks,
trends anywhere on a calm surface; an unusual amount of code exists purely so
cards never visibly change under the user. Usage read-backs are structurally
confined to real interventions with explicit comments forbidding their return
to the dashboard. Settings are genuinely minimal (four sections; every
numeric option is generosity - grace, schedules - never a scarcity cap).

### 6. Engineering self-awareness

The docs candidly enumerate the same risks the code confirms. The liveness
gate (2a age guard + 2b render-time re-check) from the escalation doc is
implemented *and* heavily tested (`OverlayDecisionEngine`). The content
script is battle-scarred in the right ways (closed shadow DOM, host-CSS
counter-measures, shortcut suppression). Pure decision logic is well tested
on all three platforms.

---

## What doesn't work

### Conceptual tensions (the philosophy contradicting itself)

**T1 - Completing a mindful practice escalates future friction.** This is the
sharpest contradiction found. `countSunTap()` fires when the user *completes*
urge-surfing (`UrgeSurfing.tsx:155`) and screen-off (`ScreenOffInteraction.tsx:43`)
- the code frames it as a reward - but the same counter is what pushes
`getFrictionLevel` to `strong` (≥5 recent taps in the 5h window) and arms the
"You've come back a few times" pattern insight (≥3). A user who diligently
rides three urge waves in an afternoon is treated by the router like someone
caught in a return loop, gets the heavier register next time, and may be told
they "keep coming back" - when what they actually did was the practice. The
signal conflates *returning to the pull* with *engaging with the pause*.
**Fixed:** practice completions no longer count sun taps. The review of that
fix then found the web half of the same conflation - the extension counted
every *leave* (fling, drag-down, Little-Sun tap) and every skip as a tap while
counting completed interactions not at all, the inverse of Android - so web
was aligned too: taps now fire on `onInteractionSubmitted` only, on both
platforms; leaves and skips are never counted.

**T2 - "Usually around {baseline} by now" is a benchmark.** The usage
observation ("You've spent about X on Y so far today") is a clean observed
fact; the second line (`AppUsageOrBrowsingBehavior.tsx:96-100`) compares now
against a personal average. Comparison-to-baseline is the grammar of a
tracker - it invites "am I ahead or behind?", which is scoring in all but
name. It was the single string in the app that a strict reading of the
reflective-companion bar ("never manufacture judgment") flags. **Fixed:** the
baseline was removed end-to-end (display, model, extension computation, and
the Android bridge/Kotlin lookback).

**T3 - Gentle paint on a hard-block mechanic, at the most common moment.**
Two related findings:
- The settings vocabulary ("block rules", "blocked apps", "Limit blocking",
  "select at least one app that you want to use less") speaks the wall
  language the outward copy disavows ("an invitation, never a wall"). Confined
  to config surfaces, but it's the user's first-run vocabulary.
- More importantly: on Android, a *fresh* detection - the highest-frequency
  moment in the whole product - appears as an instantly-opaque dark shield
  (`InteractionWindow.kt`, `fadeInDurationMs = 0`), with the sun blooming
  only afterwards inside the WebView. The morph exists on the rarer
  corner-handoff path (timer expiry) and on the step-away, but the everyday
  interrupt is a hard cut. The opacity is a deliberate anti-temptation choice,
  yet it means the product's central promise ("the sun always morphs, never
  hard-cuts") is broken precisely where users meet it most. `CLAUDE.md`
  already names this seam as "make it morph, not accept the cut" - it remains
  the biggest unpaid design debt.

**T4 - Small gamification residue.** Screen-off's "Almost - {n}s more away"
was a countdown-to-success gate - the one surfaced remaining-count in the
app. **Fixed:** the copy is now "Almost - stay away a little longer." and the
remaining-time value was removed from `screenOffEval` entirely.

### Philosophy–implementation gaps (the code letting the concept down)

**G1 - Silent loss of the user's reflections (highest-severity technical
finding).** In the extension, `saveAnswerN`
(`extension/src/dataInterface/extension/syncDataInterface.ts:52-85`) catches
all write failures but only *handles* `QUOTA_BYTES_PER_ITEM`. Any other
rejection (total-quota `QUOTA_BYTES`, `MAX_ITEMS`, write-rate limits,
transient failures) is swallowed: the promise resolves, the caller believes
the answer saved, and it's gone. The quota-recovery retry itself has no
`.catch`. Additionally, all platforms share an unguarded read-modify-write
pattern (`updateSyncDataHelpers.ts`) with last-write-wins races on array
keys, and Android/iOS patch by writing the whole blob. For a local-only,
no-telemetry app, the user's answer journal *is* the relationship - silently
dropping it is the worst possible failure mode, and none of this path was
tested. **Fixed** (the save path): quota errors (including Firefox's
differently-worded one) prune-and-retry without ever touching the just-given
answer; anything else alerts honestly and rejects; callers were hardened so a
rejection can't brick the input or leave an optimistic list lying; all of it
unit-tested. The read-modify-write races remain open as #209.

**G2 - iOS widget wiring: doc drift, now resolved.** The docs disagreed with
each other: `ios-platform-fit.md` and `value-first-onboarding-concept.md`
said the `MindedWidget` target "is not yet wired into `App.xcodeproj`", while
`widget-prompts-concept.md` and `RELEASING.md` said CI wires it. The workflow
is the ground truth: `.github/workflows/ios-testflight.yml` runs
`extension/ios/App/scripts/add_widget_target.rb` before `pod install`, so
every archive embeds the widget. The two stale docs have been corrected.
(What still stands from the docs: the widget hasn't been verified on a real
device/launcher yet.)

**G3 - The untested critical path is the I/O, not the logic.** Test
discipline is excellent for pure functions and near-zero exactly where the
real risks live: the 1742-line `InteractionCommon.tsx` orchestrator (its
logic is being extracted into tested helpers - good pattern, keep going), the
extension storage failure paths (G1), all Android window/WebView
orchestration, and the native→WebView morph handoff. The "black screen until
tap" workarounds in `InteractionWindow.kt` show how fragile that seam is.

**G4 - Content-script blind spots.** Gating happens once at `document_start`
keyed on the initial URL; there is no SPA/soft-navigation re-check. Host-based
matching makes intra-host routing moot, but cross-host client navigations and
back/forward transitions can slip through - on exactly the SPA-heavy sites
that are the primary targets.

### Product-level loose ends

**P1 - The quote card is a single hardcoded quote.** `quotes.ts` contains
exactly one entry, and `RndQuote` is an always-eligible greeting and the
empty-state fallback - so the "random calming quote" is always the same
Thich Nhat Hanh line. Everywhere else the app invests heavily in
non-repetition on calm surfaces; here the fallback card is permanently
frozen. **Fixed:** the pool grew to a small curated set (still deliberately
not a quote-of-the-day machine).

**P2 - Doc/comment drift.** A stale dashboard comment promised a
"minded-decisions counter" and usage charts "in the full grid" that don't
exist (`getDashboardEntriesFromQuestions.tsx` - comment rewritten); dormant
`last*RatingTS` fields are semantically reused as throttle timestamps
(tracked as #211); the iOS-widget-wiring contradiction (G2 - fixed); template
test stubs (deleted) and a handful of TODO markers. One item from the first
draft of this list turned out NOT to be drift: `RefocusHelperToday` staying
in `FIXED_QUESTION_CATEGORIES_ON_DASHBOARD` while disabled is deliberate -
disabled means "stop asking", but recaps of answers already given still
render (the tests assert it; the listing now carries a comment saying so).
Individually trivial; collectively such drift erodes the
docs-as-source-of-truth discipline the repo otherwise excels at.

**P3 - The feedback loop is honesty without eyes.** No telemetry is a
principled, philosophy-consistent choice - but it means the 90%-helpful bar,
the always-on-soft bet, and the iOS/Android natural experiment all rest on
felt reads plus a mailto: link. That's coherent, just worth naming: the
product's strongest claims about what helps are structurally unverifiable,
so the structural guardrails (observed-behaviour-only, rare, dismissible)
are carrying *all* the weight. They currently do - see T1/T2 for the two
places they're strained.

**P4 - Where the effort goes.** `CLAUDE.md` notes the extension has almost
no users; iOS ships nothing until G2 resolves. In practice minded is an
Android-first product today. That's fine - but it argues for prioritizing the
Android seam work (T3's shield morph, the detector re-parenting so
accessibility is truly optional) over further extension polish.

---

## If only five things get attention

1. ~~**Stop counting practice completions as friction fuel** (T1)~~ - done,
   including the web leave/skip counting the follow-up review surfaced.
2. ~~**Make the extension's answer-save path loss-proof and honest** (G1)~~ -
   done and tested; the storage races stay open as #209.
3. ~~**Resolve the iOS widget wiring question** (G2)~~ - resolved: CI wires
   it; on-device verification still pending.
4. **Morph the fresh-detection interrupt** (T3) - the everyday moment should
   be the product's softest, not its hardest. Tracked in #118; still the
   biggest open item.
5. ~~**Review the two copy strains** (T2, T4)~~ - both removed.
