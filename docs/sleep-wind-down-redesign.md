# Sleep wind-down — dissolve the mini-app into the sun's evening register

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
as an evening register of the one sun**: the moon appears through the normal
interrupt, offers a single note-for-tomorrow landing, and closes by settling
down. One flow, not two.

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

## The redesign: bedtime is a register of the one sun

Don't make wind-down a place you navigate into. Make it **the one sun quietly
becoming the moon in the evening** — same single gesture, same "one thing
chosen for you," tuned for bed. Decided direction (full dissolve; keep a single
note-for-tomorrow landing that closes on the moon settling):

### The moment, end to end

1. You reach for a blocked app inside your bedtime window. The **normal**
   interrupt fires — no separate overlay decision. The sun morphs in as the
   **moon** (evening skin of the single sun, not a fresh disc).
2. The router, which already knows it's the bedtime window, picks **one**
   bedtime-appropriate gesture — not a menu:
   - most nights, the **moon-settle**: the moon simply present, then *"let the
     day go"* as you settle it down; or
   - a single **note for tomorrow**: one free-text landing to externalise the
     racing mind so the phone can go down, then settle.
3. Close = **drag the moon down** — the grounding gesture the dashboard already
   teaches, in its evening form. On Android, the settle closes the app and lets
   the screen sleep.
4. Not now = **fling the moon away** — the universal escape, unchanged. No
   "skip tonight" button, no confirm.
5. Come back in a moment = the **existing little-sun grace timer**, counted up,
   not a bespoke 15/30/60 + triple-tap.

That's the whole feature. No overview menu, no activity checklist, no tips
page, no triple-tap, no bespoke navigation stack, no second trigger system.

### Why this is on-philosophy

- **One thing chosen for you**, via the same engine as every other moment.
- **One sun, always morphs** — the moon is finally a morph of the shell sun,
  not a hard-cut fresh disc (also chips at the T3 morph debt).
- **The one activity worth keeping is the on-philosophy one.** Of the five,
  note-for-tomorrow / brain-dump is the only reflect→let-go gesture and the
  real reason you can put the phone down. The rest (gratitude prompt, calm-read
  passages, tips list, breathing) are content a companion doesn't need at the
  interrupt.
- **Remove before you add**: this is a large net deletion.

---

## What changes — concrete map

### Cut

| Surface | File(s) |
|---|---|
| Overview/menu, tips, calm-read, gratitude & breathing screens, back-nav, dismiss transition, snooze-duration UI, triple-tap | most of `src/shared/components/sleepWindDown/` (keep only the window math + the note landing — see below) |
| Calm-read passages, sleep tips, extra prompt pools | `src/shared/data/sleepContent.ts` (keep tomorrow/brain-dump prompts) |
| Dedicated web route | `RouteCmp.tsx:439`, `SleepWindDownRoute.tsx` |
| Dashboard card | `dashboard.model.ts:35-44`, `getDashboardEntriesFromQuestions.tsx:122-131`, `DashboardGroups.tsx:278-318` |
| Settings section (schedule stays as one window; drop the "activities" framing) | `SleepWindDownSettings.tsx` slimmed; mount `SettingsAndroidRoute.tsx:31` |
| Separate overlay decision branch | `OverlayDecisionEngine.kt:117-127`, state build `OverlayControllerService.kt:481-491,647-648,675-683` |

### Keep

- **The bedtime *window* config** (`SleepWindDownCfg`, `syncData.d.ts:26-31`)
  and `resolveNightId` (`sleepWindDown.util.ts:26-105` / `SleepWindDownWindow.kt`).
  A user-set bedtime window is the one genuinely new signal; keep it as a
  single range, not a five-activity feature. Settings shrinks to: on/off +
  the `WeekdaySchedule` window.
- **The note-for-tomorrow landing** (`activities/BrainDump.tsx` reduced to the
  single-prompt case) filed under the existing `GoodPlans` / `SleepWindDown`
  category — no menu around it.
- **The moon** (`Sun variant="moon"`, drag-down) and `setIsShellSunHidden`
  single-disc handling.

### Change (the core of the work)

1. **Route bedtime through the engine.** Add a bedtime register to
   `getInteractionMode.ts`. It already has `context.isEvening`
   (`interactionContext.ts:80`, hour ≥ 20) and an `evening_action_advice`
   branch (`getInteractionMode.ts:305`). Add:
   - a context field `isBedtimeWindow` derived from the user's
     `SleepWindDownCfg` via `resolveNightId(cfg, now) !== null` (not a fixed
     hour — respect the configured window), threaded through
     `getInteractionContext`;
   - two modes, `WIND_DOWN_SETTLE` and `WIND_DOWN_NOTE`, chosen ahead of the
     ordinary evening branch when `isBedtimeWindow && !dismissedTonight`;
     mostly settle, occasionally the note. These become normal
     `InteractionMode`s with reasons (`bedtime_settle`, `bedtime_note`) and
     ride the same `InteractionCommon` shell — no new navigation.
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
