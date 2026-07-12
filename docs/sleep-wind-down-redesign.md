# Sleep wind-down — dissolve the mini-app into bedtime interventions

Status: **design proposal, not yet built.** Supersedes the current wind-down
implementation (`src/shared/components/sleepWindDown/`, the Android overlay
branch, the settings section, the dashboard card). Written against the
*Conceptual Fundamentals* in `CLAUDE.md` and the analysis in
`docs/conceptual-analysis-2026-07.md`.

## Verdict in one paragraph

Wind-down feels out of place because it *is* a second app. Everywhere else,
minded is one sun, one gesture, one thing chosen *for* you. Wind-down instead
opens a multi-screen chooser ("choose anything that helps" — a 5-item
checklist + a tips page), rides its own trigger system that pre-empts the
intervention engine, and speaks alarm-clock grammar (snooze 15/30/60,
triple-tap, skip tonight, a per-weekday schedule). It is the app's only menu,
its only parallel navigation stack, and its least on-philosophy surface. The
fix is not to polish it — it is to **delete the mini-app and re-express bedtime
as a register of the standard intervention flow**: at night the companion disc
is *already* a moon (automatic, 19:00–06:00), so there is nothing to morph. The
wind-down activities stop being a menu and become **individual, always-skippable
interventions** — the engine offers one at a time, the user flings it away like
any other. One flow, not two.

---

## Why it feels off

Three fundamentals break at once (each is load-bearing, per `CLAUDE.md`).

**1. The app always picks one thing for you; wind-down hands you a menu.**
Every intervention is chosen by `getInteractionMode.ts` from the present
moment — the user never chooses. Wind-down abandons that and opens
*"Choose anything that helps — pick in any order"*
(`SleepWindDownView.tsx:435-479`) over five activities plus a tips page. A
chooser at bedtime — tired, in bed — is maximum cognitive load at the moment
of minimum capacity. That inverts the premise ("a quiet, uncluttered surface
lowers cognitive load"), and it is why the feature reads as a bolted-on sleep
app.

**2. The sun is the flow; wind-down builds a second flow beside it.** It never
touches `interactionContext` / `getInteractionMode` / `InteractionCommon`. It
has its own view-switch, its own `history.pushState` back-stack
(`sleepWindDownBackNavigation.ts`), its own dismiss transition, its own
persistence namespace (`sleepWindDown*` on the blob), and a Kotlin trigger
(`OverlayDecisionEngine.kt:117-127`) that fires *instead of* the real
intervention cascade. Two flows, two navigation models, and one trigger
duplicated across TS (`sleepWindDown.util.ts`) and Kotlin
(`SleepWindDownWindow.kt`) that must be kept in sync. "Standard flows" is
exactly what it forks away from.

**3. It speaks alarm-clock / blocker grammar.** Snooze 15/30/60
(`SNOOZE_DURATION_OPTIONS`), "triple-tap to snooze", "skip tonight", drag the
moon *down*, a per-weekday bedtime schedule. Triple-tap exists nowhere else in
the app; the UX analysis already flags these gestures as undiscoverable
(`docs/ux-analysis-and-beautification.md:243-247`). This is the same
wall-vocabulary that `conceptual-analysis-2026-07.md` flags as T3 — an alarm
and a chooser wearing a calm skin.

Root cause: a striving-shaped, menu-driven, scheduler-configured mini-app
inside an app whose identity is *one sun, one gesture, one thing chosen for
you, never a menu.*

---

## The redesign: bedtime is a register of the standard flow

Don't make wind-down a place you navigate into. Make it **the standard
intervention, with its option set swapped for bedtime.** Two corrections to the
first draft of this doc:

- **Nothing to morph.** At night the companion disc is *already* a moon —
  automatic, clock-driven, 19:00–06:00 (`isDarkModeNow()` →
  `.minded-6622-dark` → `getSunVariant()`; `NIGHT_START_HOUR = 19`,
  `NIGHT_END_HOUR = 6`, `skyTimeline.ts:37-38`), independent of this feature.
  So there is no "sun becomes a moon at bedtime" step; at bedtime it simply
  *is* the moon.
- **The activities become interventions, not a menu.** A menu *forces* a
  choice — the thing that felt off. A single activity *routed to you as one
  intervention*, always fling-to-skip, does not: it is the same "one thing
  chosen for you, never forced" the whole app runs on. Because the user only
  ever sees one, occasionally, this is what *earns* keeping several activities
  (note for tomorrow, gratitude, brain dump, a calm read, breathing) instead of
  cutting them to one. The engine serves one at a time with variety.

### The moment, end to end

1. You reach for a blocked app inside your bedtime window. The **normal**
   interrupt fires — no separate overlay decision. The disc is already the moon.
2. The engine offers **one** bedtime gesture, chosen for you — not a menu.
   Bedtime swaps the daytime option set for the wind-down set, and suppresses
   the productivity-leaning evening modes (action advice = "do a task now" is
   wrong at bedtime). Most nights the plain **settle** (*"let the day go"*);
   sometimes a single landing — **note for tomorrow**, **gratitude**, a
   **brain dump**, **something calm to read**, or a **breath**.
3. Skip = **fling the moon away** — the universal escape, unchanged, on *every*
   bedtime offer. No "skip tonight" button, no confirm, no triple-tap.
4. Close/settle = **drag the moon down** — the grounding gesture the dashboard
   already teaches. On Android, the settle closes the app and lets the screen
   sleep.
5. Come back in a moment = the **existing little-sun grace timer**, counted up,
   not a bespoke 15/30/60 snooze.

That's the whole feature. No overview menu, no activity checklist, no tips
page, no triple-tap, no bespoke navigation stack, no second trigger system.

### Why this is on-philosophy

- **One thing chosen for you**, via the same engine as every other moment —
  and **always skippable**, like every intervention.
- **No menu, no forced choice** at the moment of least capacity (tired, in
  bed). The engine carries the decision, not the user.
- **Keeping several activities is now cheap**, because each is a rare single
  offer rather than a line on a checklist. Distribution is what makes the
  content affordable; a menu is what made it expensive.
- **Rare and dismissible**, per the 90% bar: tune bedtime offers to be soft and
  infrequent — mostly settle, the writing/reading offers seldom — so the
  interrupt never feels like a nightly form to fill in.

---

## What changes — concrete map

### Cut

| Surface | File(s) |
|---|---|
| Overview/menu, back-nav, dismiss transition, snooze-duration UI, triple-tap, "skip tonight" | most of `src/shared/components/sleepWindDown/` (the *screens/chrome* — the activity content survives as interventions, see Keep) |
| The tips page + sleep-hygiene list (advice content, leans productivity — off-register at the interrupt) | `SLEEP_TIPS` in `src/shared/data/sleepContent.ts`; tips view in `SleepWindDownView.tsx:553-563` |
| Dedicated web route | `RouteCmp.tsx:439`, `SleepWindDownRoute.tsx` |
| Dashboard card | `dashboard.model.ts:35-44`, `getDashboardEntriesFromQuestions.tsx:122-131`, `DashboardGroups.tsx:278-318` |
| Separate overlay decision branch (the pre-empting trigger) | `OverlayDecisionEngine.kt:117-127`, state build `OverlayControllerService.kt:481-491,647-648,675-683` |

### Keep

- **The activity content, re-homed as interventions** — the note-for-tomorrow,
  gratitude, brain-dump, calm-read and breathing gestures survive; only the
  *menu around them* dies. Prompt/passage pools stay in
  `src/shared/data/sleepContent.ts` (minus `SLEEP_TIPS`); the writing gesture is
  `activities/BrainDump.tsx` reduced to a single prompt per offer and filed
  under the existing `GoodPlans` / `SleepWindDown` categories; breathing reuses
  the shared `BreathingExercise`.
- **The bedtime *window* config** (`SleepWindDownCfg`, `syncData.d.ts:26-31`)
  and `resolveNightId` (`sleepWindDown.util.ts:26-105` / `SleepWindDownWindow.kt`).
  A user-set bedtime window is the one genuinely new signal. Settings shrinks
  to on/off + the `WeekdaySchedule` window (drop the "activities" framing).
- **The moon** (already the night disc) and `setIsShellSunHidden` single-disc
  handling; the drag-**down** settle as the close.

### Change (the core of the work)

1. **Route bedtime through the engine.** Add a bedtime register to
   `getInteractionMode.ts`. It already has `context.isEvening`
   (`interactionContext.ts:80`, hour ≥ 20) and an `evening_action_advice`
   branch (`getInteractionMode.ts:305`). Add:
   - a context field `isBedtimeWindow` derived from the user's
     `SleepWindDownCfg` via `resolveNightId(cfg, now) !== null` (respect the
     configured window, not a fixed hour), threaded through
     `getInteractionContext`;
   - a small set of bedtime modes as normal `InteractionMode`s —
     `WIND_DOWN_SETTLE`, `WIND_DOWN_NOTE`, `WIND_DOWN_GRATITUDE`,
     `WIND_DOWN_BRAIN_DUMP`, `WIND_DOWN_READ`, `WIND_DOWN_BREATH` — selected
     when `isBedtimeWindow && !dismissedTonight`, *ahead of and instead of* the
     ordinary evening/action-advice options, with anti-repeat variety and a
     strong lean toward the plain settle (the writing/reading offers rare). Each
     rides the same `InteractionCommon` shell and is fling-to-skip like any
     intervention — no new navigation.
2. **Android: delete the pre-empting branch.** Instead of
   `ShowSleepWindDown` short-circuiting the cascade, the normal
   `ShowIntervention` path runs and the WebView-side router returns a
   `WIND_DOWN_*` mode. `dismissedNightId` / grace still persist, but as the
   ordinary session dismissal, not a bespoke namespace. Removes the TS↔Kotlin
   trigger duplication (Kotlin keeps only the window read it already needs for
   detection gating).
3. **Close semantics.** `WIND_DOWN_SETTLE` renders the moon with
   `completionDirection="down"`; on completion the Android host does
   `closeCurrentApp()` + `lockScreen()` (as today, `SleepWindDownAndroid.tsx:21-46`),
   folded into the standard dismiss handler.

---

## Risks / open questions

- **Detection gating still needs the window on Android.** Even after removing
  the overlay branch, the native side reads the bedtime window to decide it's
  bedtime; keep `SleepWindDownWindow.kt` for that, but it no longer drives a
  separate overlay — only sets `isBedtimeWindow` in the state the WebView
  router reads. Confirm the state plumbing survives the simplification.
- **Migration of persisted fields.** `sleepWindDownDismissedNightId` /
  `sleepWindDownSnoozeUntilTS` collapse into the ordinary dismissal + grace.
  Existing drafts (`sleepWindDownBrainDumpDraft` etc.) — decide whether to
  migrate or drop; per the app's "let-go answers aren't persisted" instinct,
  dropping stale bedtime drafts is defensible.
- **Frequency.** Bedtime should be soft and rare — settle most nights, the note
  seldom. Tune the note probability low so the interrupt never feels like a
  nightly form to fill in.
- **Tests.** The util, back-nav, dismiss-transition, and activity-action tests
  mostly delete with their code; add engine tests for the two new modes and the
  `isBedtimeWindow` gate (extends the existing `getInteractionMode` /
  `interactionContext` suites rather than the untested critical path).
- **Still Android-only.** The register only activates where a bedtime window is
  configured, which stays Android-gated per `CLAUDE.md`; the shared engine
  change is cheap to widen later.
