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
   times in a short while" is a counted fact. "You're feeling anxious" is a guess.
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
| **Present-session return loop** — shipped copy: "You've come back a few times in a short while. That's okay — see if you can just notice the pull, without having to act on it." | ✅ In (shipped) | We counted the taps/attempts this session. Definitionally true, present, can't be stale. It *is* the moment the loop is active. Cross-platform. Wording stays time-neutral ("in a short while") because the ~5h sun-tap window isn't evening-gated. |
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

## Things I initially proposed that already exist (do not rebuild)

Two ideas from the first draft turned out to already be in the app. Recording
them so we don't reinvent them:

### "Take a breath" — already the core mechanic

The sun *is* the pause. `InteractionCommon.tsx` already glides the sun to a
"breathing" anchor and runs `StrongFrictionBreathPause`, with duration scaled by
friction via `getPostSunPauseSeconds()`. Adding a separate "take a breath" button
would duplicate the app's central interaction. **Nothing to build here.**

### Attunement — the routing is already largely context-driven

`getInteractionMode.ts` is **not** "rolling dice." It branches on friction level,
mood freshness, energy, evening, expired intent, and alternatives *before* any
randomness; the probabilities mostly add *variety* among already-eligible
options. Sleep wind-down isn't even routed here — it's a separate scheduled flow.
So "replace the dice with attunement rules" overstates how random the system is;
the app is already substantially attuned. At most there's a marginal tweak to
which gentle option appears at the highest-pull moments — not a headline feature,
and possibly not worth the churn.

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

## What actually survives scrutiny

After subtracting what already exists (the sun-pause, the context-driven routing,
wind-down) and what fails the 90% bar (mood/emotion inference, budget-anxiety),
the genuinely-new, trustworthy surface is small — just two insights:

1. **Present-session return-loop** noticing — the one bulletproof cross-platform
   observation ("you've come back a few times in a short while"). **Shipped.**
2. **Android time-of-day** pattern — native usage-history harvest + rolling
   histogram + strong evidence gate. Largest effort; Android only.

That is honestly the whole of it. The smallness is a sign the app already
embodies these principles well, not a shortfall — but it also means this concept
may not be the biggest available improvement. See the next section.

## Open questions / is this even the right bet?

- **Is the surviving set worth it?** Two insights — one simple, one a real chunk
  of native work — may not justify the design risk. It is legitimate to conclude
  the app already does mindful presence well and that effort is better spent
  elsewhere (e.g. the untested critical path / silent data-loss on storage quota,
  which threaten *all* interventions regardless of polish).
- **Copy voice.** If we do build the return-loop noticing, its wording *is* the
  product and needs sign-off in the app's existing gentle voice before wiring.
- **Evidence gate for the Android pattern.** What N (days, occurrences-per-hour)
  is enough to call something "a pattern" without false positives on thin data?
