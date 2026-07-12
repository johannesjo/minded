# Sleep wind-down — dissolve the mini-app into bedtime interventions

Status: **design of record (v2), not yet built.** Supersedes the current
wind-down implementation (`src/shared/components/sleepWindDown/`, the Android
overlay branch, the dashboard card, and most of the settings section). Written
against the *Conceptual Fundamentals* in `CLAUDE.md` and the analysis in
`docs/conceptual-analysis-2026-07.md`. v2 incorporates two adversarial UX
reviews (philosophy-fit and interaction-mechanics) and three product decisions
they surfaced (below).

## Verdict in one paragraph

Wind-down feels out of place because it *is* a second app. Everywhere else,
minded is one sun, one gesture, one thing chosen *for* you. Wind-down instead
opens a multi-screen chooser ("choose anything that helps" — a 5-item
checklist + a tips page), rides its own trigger system that pre-empts the
intervention engine, and speaks alarm-clock grammar (snooze 15/30/60,
triple-tap, skip tonight, a per-weekday schedule). It is the app's only menu,
its only parallel navigation stack, and its least on-philosophy surface. The
fix is to **delete the mini-app and re-express bedtime as a register of the
standard intervention flow**: at night the companion disc is *already* a moon
(automatic, 19:00–06:00), so there is nothing to morph. Inside the user's
bedtime window the engine pushes only a **wordless settle** ("let the day go");
the one writing tool worth keeping (a note / brain-dump) stays **reachable on
demand** by dragging the moon down, never served unbidden. One flow, not two.

---

## Why it feels off

Three fundamentals break at once (each is load-bearing, per `CLAUDE.md`).

**1. The app always picks one thing for you; wind-down hands you a menu.**
Every intervention is chosen by `getInteractionMode.ts` from the present
moment — the user never chooses. Wind-down opens *"Choose anything that helps —
pick in any order"* (`SleepWindDownView.tsx:435-479`) over five activities plus
a tips page. Even though its exit is never a tally (a genuine strength — the
"Goodnight" is always present and toggles are optional,
`SleepWindDownView.tsx:463-469`), a five-item chooser at bedtime is still more
cognitive load than one thing, at the moment of least capacity.

**2. The sun is the flow; wind-down builds a second flow beside it.** It never
touches `interactionContext` / `getInteractionMode` / `InteractionCommon`. It
has its own view-switch, its own `history.pushState` back-stack
(`sleepWindDownBackNavigation.ts`), its own dismiss transition, its own
persistence namespace (`sleepWindDown*` on the blob), and a Kotlin trigger
(`OverlayDecisionEngine.kt:117-127`) that fires *instead of* the real
intervention cascade — duplicated across TS (`sleepWindDown.util.ts`) and Kotlin
(`SleepWindDownWindow.kt`). "Standard flows" is exactly what it forks away from.

**3. It speaks alarm-clock / blocker grammar.** Snooze 15/30/60
(`SNOOZE_DURATION_OPTIONS`), "triple-tap to snooze", "skip tonight", a
per-weekday schedule. Triple-tap exists nowhere else in the app; the UX
analysis already flags these gestures as undiscoverable
(`docs/ux-analysis-and-beautification.md:243-247`). This is the same
wall-vocabulary that `conceptual-analysis-2026-07.md` flags as T3.

Root cause: a striving-shaped, menu-driven, scheduler-configured mini-app
inside an app whose identity is *one sun, one gesture, one thing chosen for
you, never a menu.*

---

## Product decisions (from the two UX reviews)

Both reviewers reached **"proceed with changes"**: the *deletions* are right,
but the first draft's "route the activities through the engine and rely on
frequency tuning" was neither safe nor buildable as written. Three calls
resolve it:

1. **Bedtime content — wordless push, tools on demand.** The engine pushes
   *only* a wordless settle (occasionally a breath). The note / brain-dump is
   **reachable** by dragging the moon down, **never served unbidden**. Rationale:
   an engine-*pushed* writing prompt on a lit phone in bed is more screen
   engagement at the exact moment the goal is to put the phone down — it fails
   the 90% bar. But a wakeful mind often *knows* a brain-dump would help, so the
   tool must stay reachable (agency), just not forced.
2. **Strong pull at night — leave escalation as-is.** Inside the bedtime window
   the register does **not** suppress the strong-friction tier. If a genuinely
   strong late-night pull trips `strong` friction (repeated opens), the existing
   urge-surfing / bell / screen-off escalation still runs — that pull is exactly
   when riding the urge out is the right practice. This also means the bedtime
   branch needs **no** suppression logic: it slots in at the ordinary evening
   position, *below* the strong-friction branch.
3. **Bedtime cue — minimal cue + settings preview.** Keep one soft
   bedtime-specific line on the **first** offer of the night ("it's getting
   late — a moment before bed?") and a "try it now" preview in settings.
   Restores the "we know it's bedtime" signal (the moon alone only signals
   "after 19:00", not the user's configured window) without the old prompt
   screen, and keeps the feature discoverable/testable after setup.

---

## The redesign: bedtime is a register of the standard flow

Two framing corrections from the first draft:

- **Nothing to morph.** At night the companion disc is *already* a moon —
  automatic, clock-driven, 19:00–06:00 (`isDarkModeNow()` →
  `.minded-6622-dark` → `getSunVariant()`; `NIGHT_START_HOUR = 19`,
  `NIGHT_END_HOUR = 6`, `skyTimeline.ts:37-38`), independent of this feature.
  So there is no "sun becomes a moon" step; at bedtime it simply *is* the moon.
  The bedtime *cue* is therefore carried by copy (decision 3), not a morph.
- **No menu, and the engine pushes only the settle.** The writing tool is a
  reach-for-it affordance, not a routed mode (decision 1).

### The moment, end to end

1. You reach for a blocked app inside your bedtime window. The **normal**
   interrupt fires — no separate overlay decision. The disc is already the moon.
2. Below the hard gates (few-answers, energy) and the **strong-friction branch**
   (left intact, decision 2), the engine serves the bedtime register instead of
   the ordinary evening cascade: mostly **`WIND_DOWN_SETTLE`** (a wordless moon,
   *"let the day go"*), occasionally **`WIND_DOWN_BREATH`** (one breath, then
   settle). On the first offer of the night, a single soft line frames it as
   bedtime (decision 3).
3. Want to set the day down first? **Drag the moon down** → one **note /
   brain-dump** landing (reusing the dashboard's existing drag-down grounding
   gesture), filed under the existing `GoodPlans` / `SleepWindDown` category.
   One gesture, reached on purpose — not a menu, not pushed.
4. Skip = **fling the moon away** — the universal escape, unchanged. No "skip
   tonight" button, no confirm, no triple-tap.
5. Settle/close = the moon drifting **down** → *"Sleep well"*, then on Android
   `closeCurrentApp()` + `lockScreen()` (the phone goes dark). A deliberate
   settle **quiets the rest of the night** (see per-night dismissal below); a
   reflexive fling only closes this one open.
6. Come back in a moment = the **existing little-sun grace timer**, not a
   bespoke 15/30/60 snooze picker.

No overview menu, no activity checklist, no tips page, no triple-tap, no
bespoke navigation stack, no second trigger system.

### Why this is on-philosophy

- **One thing chosen for you**, via the same engine as every other moment — and
  **always skippable**, like every intervention.
- **Wordless by default** at the moment of least capacity; the writing tool is
  there for the mind that wants it, never pushed at the mind that doesn't.
- **Rare and dismissible**, per the 90% bar — mostly settle, breath seldom, one
  bedtime line per night.
- **Escalation stays honest** (decision 2): a real strong pull still meets the
  real practice; bedtime doesn't paper over it.

---

## What changes — concrete map

### Cut

| Surface | File(s) |
|---|---|
| Overview/menu, gratitude & tomorrow & calm-read & tips screens, back-nav, dismiss transition, snooze-duration UI, triple-tap, "skip tonight" | most of `src/shared/components/sleepWindDown/` (the screens/chrome) |
| Tips list + calm-read passages + gratitude/tomorrow prompt pools (screen-on/off-register content) | `SLEEP_TIPS`, `CALM_READ_PASSAGES`, gratitude/tomorrow pools in `src/shared/data/sleepContent.ts` (keep brain-dump prompts) |
| Dedicated web route | `RouteCmp.tsx:439`, `SleepWindDownRoute.tsx` |
| Dashboard card | `dashboard.model.ts:35-44`, `getDashboardEntriesFromQuestions.tsx:122-131`, `DashboardGroups.tsx:278-318` |
| Separate overlay decision branch (the pre-empting trigger) + its snooze plumbing | `OverlayDecisionEngine.kt:117-127`, state build `OverlayControllerService.kt:481-491,647-648,675-683` |

### Keep

- **One writing tool** — the note / brain-dump gesture (`activities/BrainDump.tsx`
  reduced to a single prompt), reached on demand via the drag-down, filed under
  the existing categories. Brain-dump prompts stay in `sleepContent.ts`.
- **The bedtime *window* config** (`SleepWindDownCfg`, `syncData.d.ts:26-31`)
  and `resolveNightId` (`sleepWindDown.util.ts:26-105`). Settings shrinks to
  on/off + the `WeekdaySchedule` window + a "try it now" preview (decision 3).
- **A per-night dismissal field.** One bespoke field survives —
  `sleepWindDownDismissedNightId` — because the standard engine has *no*
  "quiet for the rest of tonight" concept, and without it every open re-fires a
  full-screen interrupt (the "nightly form" failure). Set by a **deliberate
  settle**, not by a reflexive fling. Snooze-until and the draft fields can go.
- **The moon** (already the night disc) and `setIsShellSunHidden` single-disc
  handling; the drag-**down** settle as the close.

### Change (the core of the work)

1. **Engine — add the bedtime register.** In `interactionContext.ts`, add
   `isBedtimeWindow` derived from `resolveNightId(cfg.sleepWindDown, now) !==
   null` (respect the configured window; computed in-WebView from `syncData`, so
   **no new TS↔Kotlin channel** is needed for routing). In
   `getInteractionMode.ts`, add `WIND_DOWN_SETTLE` (+ occasional
   `WIND_DOWN_BREATH`) as normal `InteractionMode`s, selected at the **evening
   slot** (replacing the `evening_action_advice` branch at `:305`) when
   `isBedtimeWindow && !dismissedTonight` — i.e. *below* few-answers, energy,
   strong-friction, and expired-intent (decision 2, so no suppression). Extend
   the `lastInteractionMode` anti-repeat to the WIND_DOWN family.
2. **Shell — teach `InteractionCommon` the bedtime modes.** These are real
   branches, not a drop-in:
   - **Disable triple-tap** for WIND_DOWN modes (the non-dashboard sun enables
     it → tapping currently opens the intent/time *session-grant* flow,
     `InteractionCommon.tsx:677-723,1712` — absurd at bedtime).
   - **Terminal outcome = goodnight, not a session grant.** WIND_DOWN modes must
     bypass the intent/time selection and go straight to a soft *"Sleep well"*
     settle-close.
   - **Drag-down vs fling.** Today both are identical ("let go",
     `InteractionCommon.tsx:951-965`); thread the completing direction +
     mode out so *down* = deliberate settle (quiet the night; Android lock) and
     *fling* = skip this open. `Sun` already accepts `completionDirection="down"`
     (`Sun.tsx:89`) but the shell never passes it — new wiring.
   - **Reach-for-it writing.** Drag-down on the settle offers the single
     note/brain-dump; add `BrainDump` to the mode/affordance path with its
     draft-save contract (not currently in `InteractionModeSwitch`).
   - Keep transitions soft (the *"Sleep well"* beat easing in before the OS
     lock hand-off), per the styling rules.
3. **Android — delete the pre-empting branch; keep the close.** Normal
   `ShowIntervention` runs; the WebView router returns a `WIND_DOWN_*` mode.
   Thread mode+direction to `InteractionAndroid` so a settle close still does
   `closeCurrentApp()` + `lockScreen()` (today `SleepWindDownAndroid.tsx:35-38`;
   the standard host only does `closeCurrentApp()`, `InteractionAndroid.tsx:92-93`).
   Note: bedtime is now *downstream* of the active-session/grace checks, so a
   blocked app opened during an active session shows the little sun, not the
   bedtime interrupt — an intended, minor semantic change.

---

## Risks / open questions

- **Native window read may survive.** Routing needs no TS↔Kotlin channel, but if
  the native detector still consults the window for anything, the `resolveNightId`
  math stays duplicated in Kotlin — confirm during implementation whether
  `SleepWindDownWindow.kt` can be deleted or must remain (the plan only removes
  the *overlay branch + snooze* duplication for certain).
- **First-night / pre-19:00 edge gates.** Because bedtime sits *below*
  few-answers and energy (decision 2), a brand-new user's first night could get
  the onboarding QUESTION, and a window a user sets starting before 19:00 could
  get an ENERGY_LVL survey (energy is gated to `localHour < 19`). Both are rare;
  flagged, accepted for now given decision 2. Revisit if they bite.
- **Per-night dismissal semantics.** Define precisely: a completed drag-down
  settle sets `dismissedNightId` (quiet till the next night); a fling does not.
  Confirm the grace timer is an acceptable "come back in a moment" — for a user
  who keeps opening apps it is shorter and per-session, not the old wall-clock
  snooze; that downgrade is intended.
- **Migration.** `sleepWindDownSnoozeUntilTS` + the three draft fields become
  dead; decide drop vs. quiet-retain (per the app's "let-go answers aren't
  persisted" instinct, dropping stale bedtime drafts is defensible).
- **Tests.** The util/back-nav/dismiss-transition tests mostly delete with their
  code; add engine tests for `isBedtimeWindow`, the two new modes, placement
  below strong-friction, and anti-repeat — extending the existing
  `getInteractionMode` / `interactionContext` suites, not the untested critical
  path. The shell branches (triple-tap off, goodnight terminal, drag-down close)
  need coverage too — this is the seam `conceptual-analysis-2026-07.md` (G3)
  calls untested.
- **Still Android-only.** The register only activates where a bedtime window is
  configured (Android-gated per `CLAUDE.md`); the shared engine change is cheap
  to widen later.
