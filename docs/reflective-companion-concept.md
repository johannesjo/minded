# Concept: a reflective companion, not a scoreboard

Status: **exploration / not yet scheduled.** This is a design note capturing a
direction and — just as importantly — the guardrails that keep it from going
wrong. Nothing here is committed to a release.

## The idea in one line

minded already collects a goldmine of behavioural data but does almost nothing
reflective with it. Turn a small, carefully chosen slice of that into **gentle,
well-timed presence** — a mirror the user can look into, never a scoreboard that
grades them.

## Why this and not the obvious version

The obvious version — "you scrolled 20% less this week", streaks, budgets,
goals — would quietly turn minded into the *same* striving/optimization machine
it exists to dissolve. minded is a **mindfulness app first**, not a
self-improvement tracker. So the output of any feedback loop must be
**awareness, not performance**.

Mindfulness goal: *notice clearly, without judgment.* Awareness is the
intervention. Everything below serves that, or it doesn't ship.

## The hard bar

> We only surface something if we are **at least ~90% sure it is helpful** in
> that moment. Below that bar it reads as gimmicky, and one wrong guess makes
> the whole app feel like it doesn't know the user.

We cannot *measure* helpfulness — all data is local, there is no telemetry and
no A/B test. So the only way to hold the 90% line is **structural**:

1. **State observed behaviour, never inferred feeling.** "You've come back a few
   times tonight" is a counted fact. "You're feeling anxious" is a guess.
2. **Present moment only, never a stale timestamp.** A feeling from two hours ago
   is not a fact about now.
3. **Never manufacture anxiety, scarcity, or guilt.** No counts-as-failure, no
   "you've used up your budget", no deadlines.
4. **The helpful response must be obvious** (a pause, a breath, an option) — not
   advice we're unsure of.
5. **Rare and dismissible.** Rate-limited; easy to ignore; never blocks.

If a candidate can't pass all five, it doesn't exist.

## The filter, applied

| Candidate | Verdict | Why |
|---|---|---|
| **Present-session return loop** — "you've come back a few times tonight" | ✅ In | We counted the taps/attempts this session. Definitionally true, present, can't be stale. It *is* the moment the loop is active. Cross-platform. |
| **Time-of-day pattern (Android)** — "this is often when this app pulls at you" | ✅ In, gated | See "Android time data" below. A real *observed* pattern from OS usage history, behind a strong evidence gate. Android only. |
| Mood linkage — "earlier you felt low" | ❌ Cut | Infers a present feeling from an old timestamp. Emotions change fast; a wrong guess is actively damaging. |
| Emotion echo — "last time here you named anxiety" | ❌ Cut | Worse — projects a *past session's* emotion onto now. |
| Budget exhausted / near-limit (currently shipped) | ❌ Cut | Manufactures scarcity and guilt — the exact anxiety we're trying to dissolve. Reword away from minute-counts or remove. |

Net result: the "mirror" is deliberately **tiny** — essentially one cross-platform
insight plus one gated Android insight. That smallness is the feature working as
intended, not a shortfall.

## Android time data — the one place a real pattern is possible

- The app already holds `PACKAGE_USAGE_STATS` (`android/app/src/main/AndroidManifest.xml`)
  but only queries `UsageStatsManager` with a ~5-second lookback to detect the
  current foreground app (`getForegroundApp.kt`). It persists nothing intraday.
- The shared model keeps only per-**day** totals (`dailyUsage`) and a ~5-**hour**
  sun-tap window (`sunTapHistory.ts`). So *as stored today*, time-of-day is
  impossible.
- **However**, because the usage-access opt-in is already granted, we can ask the
  OS for its own historical event log via `queryEvents(begin, end)` — Android
  retains roughly a week of per-event timestamps. So we can reconstruct a real
  intraday pattern **without a weeks-long cold start**, and persist our own
  rolling hourly histogram to extend the window over time.
- This is an *observed behavioural* fact ("opened around this hour on 6 of the
  last 7 evenings"), not an inferred feeling. With a strong N-day evidence gate it
  can clear the 90% bar. The browser extension has no equivalent permission, so
  this insight is Android-only — acceptable given the project targets Extension +
  Android.

## Where the value really is: the parts that make no claim

The insight work (above) is where all the gimmick risk lives. The two pieces
below carry most of the *mindfulness value* while asserting **nothing** about the
user that could be wrong — so they are both safer and, honestly, the heart of the
concept.

### Workstream A — "Take a breath" as an option

Today every button at an intervention pushes a decision *about the website*:
"Still on purpose / Show alternative / Leave now" (`patternInsight.ts` actions).

Add one option that isn't about the website at all: a single guided breath
(reusing the breathing component already used in grounding and sleep wind-down).
The user breathes once, then lands back exactly where they were — no "did you
succeed", no judgment. **The pause itself is the practice.** It states nothing, so
it cannot be wrong.

### Workstream B — Attunement (replace dice with legible rules)

At a high-pull moment the code currently rolls dice to pick which gentle thing to
show — `SCREEN_OFF_PROBABILITY = 1/3`, `URGE_SURFING_PROBABILITY = 1/3`
(`getInteractionMode.ts`). Replace the dice with simple, readable rules keyed off
what we plainly observe:

- late at night → offer screen-off / wind-down
- many rapid returns → offer urge-surfing or a breath
- calm first visit → the lightest possible touch (often just the sun)

This is **not** AI, not learning, not optimizing a metric. It is "show the option
that fits this moment" instead of random. It never *tells* the user anything; it
only changes *which* gentle option appears. Lowest risk of the three, fully
deterministic, and testable.

## What we will deliberately NOT build

Named explicitly so they don't creep back in:

- ❌ streaks / "days clean"
- ❌ "minutes saved" / efficiency scores
- ❌ success-vs-failure tallies
- ❌ daily goals or targets
- ❌ trend-up graphs
- ❌ social comparison / leaderboards
- ❌ any insight that infers a feeling
- ❌ any insight that creates scarcity, urgency, or guilt

Each of these re-imports the striving minded exists to dissolve.

## Reusing what's already there (this is an extension, not a rewrite)

- `interactionContext.ts` already computes a rich read of the present moment
  (`recentSunTaps`, `todayOpeningAttempts`, `isEvening`, `localHour`, friction
  level).
- `patternInsight.ts` already generates "noticing" messages and already has the
  rate-limiting machinery (`shownInsightIdsByDate`) so we never nag.
- `getInteractionMode.ts` already routes by friction + context.
- The breathing component already exists (grounding / sleep wind-down).
- These modules are **already unit-tested** (`patternInsight.test.ts`,
  `interactionContext.test.ts`, decision tests) — so this work extends an
  existing safety net rather than building on the untested critical path.

## Rough phasing (if it proceeds)

1. **Reframe tone** of any surviving factual insight to present, invitational,
   non-anxious language. No new claims.
2. **Workstream A** — the "take a breath" option.
3. **Workstream B** — attunement rules.
4. **Present-session return-loop** insight (the one bulletproof cross-platform
   noticing).
5. **Android time-of-day** insight — native usage-history harvest + rolling
   histogram + strong evidence gate. Largest effort; Android only.
6. *(Maybe, later)* a calm dashboard "noticings" surface — a single gentle weekly
   reflection, self-knowledge framed, no charts.

Note the ordering: the no-claim work (A, B) comes first; the claim-making work is
trimmed to bulletproof cases and back-loaded.

## Open questions

- **Copy voice.** The reflection lines *are* the product — they need sign-off in
  the app's existing gentle voice before any wiring.
- **Evidence gate for the Android pattern.** What N (days, occurrences-per-hour)
  is enough to call something "a pattern" without false positives on thin data?
- **How conservative is too conservative?** If the surviving set is one or two
  insights, is the insight half worth the effort, or should we ship only
  Workstreams A + B (which carry value with zero claim risk) and leave insights
  for later?
