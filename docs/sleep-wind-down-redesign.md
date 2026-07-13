# Sleep wind-down - dissolve the mini-app into a single bedtime settle

Status: **design of record (v3); core implemented, cleanup pending.** Supersedes
the current wind-down implementation (`src/shared/components/sleepWindDown/`, the
Android overlay branch, the dashboard card, and most of the settings section).
Written against the *Conceptual Fundamentals* in `CLAUDE.md` and the analysis in
`docs/conceptual-analysis-2026-07.md`. v3 incorporates **six** adversarial UX
reviews across two rounds (philosophy-fit, interaction-mechanics ×2,
sleep/behavioral, and a minimalism critic) and the product decisions they
surfaced.

## Implementation status

**Done (built + tested):**
- Engine - `WIND_DOWN_SETTLE` mode + `isBedtimeWindow` context, once-per-night
  guard, in-window survey suppression, strong-tier wordless fallback, anti-repeat
  exemption (`getInteractionMode.ts`, `interactionContext.ts`; 12 new unit tests).
- Shell - the wordless settle renders in `InteractionCommon` / `InteractionModeSwitch`
  (tap disabled, "Sleep well" beat, guard armed on show); the Android drag-down
  close locks the screen (`InteractionAndroid.tsx`).
- Activation - the Android `OverlayDecisionEngine` no longer pre-empts with the old
  overlay; the settle fires through the normal `ShowIntervention` path.
- Old surfaces made unreachable - `/sleepWindDown` route, dashboard card, the
  settings "Try wind-down now" preview, the settings "Paused for tonight" banner
  (which misread the reused guard field), and the `MainAndroid` auto-nav trigger
  all removed. Bedtime-window settings kept.
- `lockScreen()` added to the interaction WebView bridge
  (`InteractionWindowJavaScriptInterface`) so the settle's drag-down actually
  locks the screen (it previously called a method only the old bridge had).
- The "Sleep well" beat renders correctly (fires at the drag's release with
  content restored, not behind the 3s off-screen glide).
- Reviewed by four adversarial code-review agents; their confirmed findings
  (missing lock bridge, dead beat, orphaned trigger, expired-intent pre-emption,
  strong-repeat verbal fallback) are fixed. Both bundles build; all TS tests pass.
  (The Kotlin edits are compile-unverified - no Android SDK in the authoring
  environment.)

**Pending (native-coupled dead-code cleanup - do where the Android build runs):**
- Delete the old mini-app view dir (`src/shared/components/sleepWindDown/` except
  `sleepWindDown.util.ts`, which feeds the engine) together with its native entry
  (`indexSleepWindDownAndroid`, the vite `sleepWindDown` entry) and the native
  overlay classes (`SleepWindDownOverlayWindow.kt`, `…JavaScriptInterface.kt`,
  `SleepWindDownWindow.kt`).
- Remove the now-unused `OverlayDecision.ShowSleepWindDown` / `ShowWindDownSnoozeTimer`
  variants + `OverlayState` wind-down fields + their `OverlayControllerService`
  dispatch/computation.
- Drop the dead sync fields (`sleepWindDownSnoozeUntilTS`, `…ProgressNightId`,
  `…Completed`, the three drafts); `sleepWindDownDismissedNightId` is reused as the
  settle guard.
- Optional polish: a soft fade-in for the fresh bedtime interrupt (T3 / #118), and
  a new in-settings preview for the settle (decision 3a - the old route-based one
  was removed).

## Verdict in one paragraph

Wind-down feels out of place because it *is* a second app: its own menu of five
activities, a tips page, a parallel navigation stack, alarm-clock grammar
(snooze 15/30/60, triple-tap, skip tonight), and a Kotlin trigger that
pre-empts the real intervention engine. The fix is to **delete the mini-app and
re-express bedtime as a single wordless "settle" in the standard intervention
flow.** Inside the user's configured bedtime window, reaching for a blocked app
brings the normal interrupt; the disc is already a moon at night; the engine
serves one **`WIND_DOWN_SETTLE`** - a wordless moon reading *"let the day go"* -
at most **once per night**. Drift it down and the phone settles into *"Sleep
well"* and goes dark. No menu, no writing prompt, no second mode, no bespoke
navigation, no second trigger. One flow, one gesture, one thing per night.

---

## Why it feels off

Three fundamentals break at once (each is load-bearing, per `CLAUDE.md`).

**1. The app always picks one thing for you; wind-down hands you a menu.**
Every intervention is chosen by `getInteractionMode.ts` from the present
moment - the user never chooses. Wind-down opens *"Choose anything that helps -
pick in any order"* (`SleepWindDownView.tsx:435-479`) over five activities plus
a tips page. A five-item chooser at bedtime is more cognitive load than one
thing, at the moment of least capacity.

**2. The sun is the flow; wind-down builds a second flow beside it.** It never
touches `interactionContext` / `getInteractionMode` / `InteractionCommon`. It
has its own view-switch, its own `history.pushState` back-stack, its own
persistence namespace (`sleepWindDown*`), and a Kotlin trigger
(`OverlayDecisionEngine.kt:117-127`) that fires *instead of* the real cascade -
duplicated across TS (`sleepWindDown.util.ts`) and Kotlin (`SleepWindDownWindow.kt`).

**3. It speaks alarm-clock / blocker grammar.** Snooze 15/30/60, "triple-tap to
snooze", "skip tonight". Triple-tap exists nowhere else in the app; the UX
analysis already flags these as undiscoverable
(`docs/ux-analysis-and-beautification.md:243-247`). Same wall-vocabulary
`conceptual-analysis-2026-07.md` flags as T3.

Root cause: a striving-shaped, menu-driven, scheduler-configured mini-app inside
an app whose identity is *one sun, one gesture, one thing chosen for you.*

---

## Decisions (from six UX reviews)

The deletions were unanimously endorsed. The reviews then split v2 apart on two
points and converged on the rest; the resulting calls:

1. **Settle only - no bedtime writing tool.** v2 kept a note/brain-dump reachable
   by dragging the moon down. Three reviewers killed it: it *collides* with the
   settle gesture (one downward release can't both open an editor and settle the
   phone), the "reuse the dashboard grounding gesture" was false (grounding is
   hard-gated `isFromDashboard`, so it never fires at a real interrupt), and as a
   barely-discoverable drag it was vestigial. Cutting it makes the gesture
   unambiguous: **down = settle, always.** (Acknowledged cost, from the
   sleep-behavioral review: constructive worry-dump before sleep has real
   sleep-onset evidence; a wakeful mind that wants it can still open the app's
   existing dashboard grounding deliberately. If demand appears, it returns later
   as **tap = a one-tap "anything for tomorrow?" note** - a *distinct* primitive,
   not overloaded on down.)
2. **One mode, not two.** Cut `WIND_DOWN_BREATH`; breathing already exists
   elsewhere, and a genuinely strong late-night pull still reaches it via the
   untouched strong-friction branch.
3. **Keep the user-configured bedtime window.** Reuse-the-19:00–06:00-night was
   proposed for minimalism but "bedtime" would then start at 19:00 for everyone -
   too broad. Keep the already-built `SleepWindDownCfg` per-weekday window (may
   simplify to a single time later) + a "try it now" preview in settings.
4. **Copy: drop "it's getting late."** It's a mild urgency/should judgment - a
   softer cousin of the cut T2 line. The settle reads only *"let the day go"* /
   *"a moment before bed"* - the bedtime signal without the "should."
5. **Leave strong-tier escalation as-is, but fix its verbal fallback.** The
   "bell at 11pm" fear is already moot - bell / urge-surfing / screen-off are
   hour-gated to 05:00–22:00 (`getInteractionMode.ts:211-212`). The real residual:
   after 22:00 a strong pull falls through to a *verbal* `QUESTION` /
   pattern-insight, breaking the wordless-at-least-capacity promise. Fix: inside
   the bedtime window, the strong branch's **verbal fallbacks are replaced by the
   wordless settle** (screen-off stays - it ends in a dark phone, which is the
   goal). No suppression of the practice tier; just a wordless fallback.

---

## The redesign: one wordless settle

Two framing points:

- **Nothing to morph.** At night the disc is *already* a moon - automatic,
  19:00–06:00 (`isDarkModeNow()`; `NIGHT_START_HOUR = 19`, `skyTimeline.ts:37-38`),
  independent of this feature. So there is no sun→moon step.
- **The north star is the shortest path to a dark screen.** Every element is
  judged against it (sleep-behavioral review): the settle's power is the
  *consequence* (phone goes dark), not the visual. An ignored bedtime interrupt
  should tend toward dark, never bounce the user back into the blocked app.

### The moment, end to end

1. You reach for a blocked app inside your bedtime window. The **normal**
   interrupt fires - with a **soft fade-in**, not the opaque instant shield
   (see T3 note). The disc is already the moon.
2. If the settle hasn't shown yet tonight, the engine serves
   **`WIND_DOWN_SETTLE`**: a wordless moon, *"let the day go - a moment before
   bed."* Once per night, full stop.
3. **Drift the moon down** → a soft *"Sleep well"* beat → `closeCurrentApp()`
   + `lockScreen()` on Android. The phone goes dark. That is the whole ritual.
4. **Fling it away** = skip - the universal escape, unchanged. Closes the
   interrupt without the goodnight beat or the lock. Either way the settle is
   **done for tonight** (the once-per-night guard is set on first appearance).
5. Reopen later the same night → no second settle. A *strong* pull still meets
   the strong tier (now wordless at bedtime, decision 5); an ordinary reopen
   gets the ordinary cascade. "Quiet the night" means *the settle doesn't
   repeat* - honestly scoped, not "no interventions ever again tonight."

No menu, no writing prompt, no tips, no breath, no triple-tap, no snooze picker,
no bespoke navigation, no second trigger system.

### Why this is on-philosophy

- **One thing chosen for you**, via the same engine as every other moment - and
  **always skippable**.
- **Wordless**, at the moment of least capacity; the only words are one calm
  line, shown at most once a night.
- **Never a tally.** The per-night guard is an invisible suppression flag, never
  surfaced - no "you settled N nights," no calendar, no card.
- **Ends in the dark**, which is the actual bedtime goal.

---

## What changes - concrete map

### Cut

| Surface | File(s) |
|---|---|
| Overview/menu, all activity screens (note/gratitude/tomorrow/calm-read/breathing), tips, back-nav, dismiss transition, snooze-duration UI, triple-tap, "skip tonight" | `src/shared/components/sleepWindDown/` (view, back-nav, dismiss-transition, activities) |
| All bedtime content pools (tips, calm-read, gratitude/tomorrow/brain-dump prompts) | `src/shared/data/sleepContent.ts` |
| Dedicated web route | `RouteCmp.tsx:439`, `SleepWindDownRoute.tsx` |
| Dashboard card | `dashboard.model.ts:35-44`, `getDashboardEntriesFromQuestions.tsx:122-131`, `DashboardGroups.tsx:278-318` |
| Overlay decision branch + snooze plumbing (`ShowSleepWindDown`, `ShowWindDownSnoozeTimer`, `isWindDownActive/Snoozed`, `getWindDownSnoozeTimerEndTime`) | `OverlayDecisionEngine.kt:117-127`, `OverlayControllerService.kt:481-500,647-648,675-683` |
| `SleepWindDownWindow.kt` | deletable **once** all three snooze/active callers above are removed (nothing else native reads the window - confirm at implementation) |
| Dead persisted fields: `sleepWindDownSnoozeUntilTS`, `sleepWindDownProgressNightId`, `sleepWindDownCompleted[]`, the three draft fields | `syncData.d.ts:215-221`, `syncData.const.ts:105-111` (drop; stale values harmless) |

### Keep

- **The bedtime *window* config** (`SleepWindDownCfg`, `syncData.d.ts:26-31`) and
  `resolveNightId` (`sleepWindDown.util.ts:26-105`). Settings shrinks to on/off +
  the `WeekdaySchedule` window + a "try it now" preview.
- **One per-night guard field** - reuse `sleepWindDownDismissedNightId` (or rename
  to `sleepWindDownSettledNightId`) as the invisible "settle already shown tonight"
  flag. Set on first appearance of the settle; compared against `resolveNightId`.
- **The moon** (already the night disc) and `setIsShellSunHidden` single-disc
  handling.

### Change (the core of the work)

1. **Engine.** `interactionContext.ts`: add `isBedtimeWindow` =
   `resolveNightId(cfg.sleepWindDown, now) !== null` (computed in-WebView from
   `syncData` - **no new TS↔Kotlin channel** for routing). `getInteractionMode.ts`:
   - add one mode `WIND_DOWN_SETTLE`, served at the evening slot (replacing
     `evening_action_advice`, `:305`) when
     `isBedtimeWindow && !settledTonight` - i.e. below the hard gates and the
     strong-friction branch (decision 5);
   - **suppress the surveys inside the window**: no few-answers `QUESTION`, no
     pre-19:00 `ENERGY_LVL` - a verbal survey at bedtime is a 90%-bar violation,
     so make it impossible in-window, not merely rare;
   - in the strong branch, inside the window, **replace the verbal fallbacks**
     (`strong_friction_question`, pattern-insight) with `WIND_DOWN_SETTLE`
     (decision 5); keep screen-off/urge-surfing (hour-gated off after 22:00 anyway);
   - **exempt `WIND_DOWN_SETTLE` from the `lastInteractionMode` anti-repeat** - it
     is a deliberate once-per-night repeat, like the existing hard gates.
2. **Shell (`InteractionCommon`).** Teach it the settle mode:
   - **disable tap** for `WIND_DOWN_SETTLE` (a tap otherwise opens the intent/time
     *session-grant* flow, `:677-723,1712` - absurd at bedtime; disabling tap also
     cleanly severs that path, no surgery on the continue flow needed);
   - **terminal = goodnight, not a session grant** - a new mode-gated branch in
     `runTerminalOutcome` renders a soft *"Sleep well"* beat before close;
   - **thread completing direction + mode to native**: today `onDragComplete` /
     `onFlingAway` take no args and both just `closeCurrentApp()`
     (`Sun.tsx:50-51`, `InteractionAndroid.tsx:92-93`). Change the callback
     contract to carry `(mode, direction)` so only a **down-settle** calls
     `lockScreen()`; a fling closes without the lock. Set `completionDirection`
     handling so an upward fling still completes as skip (don't lock the sun to
     down-only, or the fling-away escape breaks - `sunAnimationUtils.ts:122-125`);
   - keep it soft: the *"Sleep well"* beat eases in before the OS lock hand-off.
3. **Android.** Delete the pre-empting overlay branch; the normal
   `ShowIntervention` path runs and the WebView router returns `WIND_DOWN_SETTLE`.
   Route the settle's close to `closeCurrentApp()` + `lockScreen()` (as today,
   `SleepWindDownAndroid.tsx:35-38`). Give the fresh bedtime interrupt a soft
   fade-in instead of the opaque `fadeInDurationMs = 0` shield (T3).

---

## Risks / open questions

- **T3 hard-cut entry.** Routing through the normal Android interrupt would
  otherwise inherit the opaque instant shield at the calmest moment - a possible
  *regression* vs today's dedicated transition. The bedtime path is the strongest
  place to finally pay the T3/#118 debt; at minimum give it a soft fade-in.
- **Habituation.** An identical settle every night risks becoming ignorable
  wallpaper. Mitigation is structural: the value lives in the *consequence* (dark
  screen) + easy skip, not the visual; and it fires at most once per night, so it
  never nags within a night.
- **"Quiet the night" is scoped, not absolute.** The guard silences *the settle*;
  a later strong pull still meets the (now-wordless) strong tier, and an ordinary
  reopen still gets the ordinary cascade. Copy must not over-promise "no more
  interruptions tonight." No wall-clock snooze survives; the old 15/30/60 is gone
  by design (grace grants no session for these modes, so it isn't a replacement -
  accepted: reopening may re-interrupt via the normal cascade).
- **Fling-down resolved as settle.** Fling is *velocity*, so a brisk downward
  drag reads as a fling yet still means "down". Resolved by **direction, not
  velocity**: any downward completion (slow drag or brisk fling) settles + locks;
  only an up/away fling skips (the escape hatch). The settle fires once at the
  drag's release and a guard (`runFlingSkip` / `hasBedtimeSettled`) suppresses the
  fling's later terminal so it can't double-close.
- **Migration.** Dead fields drop; `dismissedNightId` is reused with new
  semantics (nightId comparison makes stale values harmless).
- **Tests.** Delete the util/back-nav/dismiss-transition suites with their code;
  add engine tests for `isBedtimeWindow`, the once-per-night guard, in-window
  survey suppression, the strong-tier wordless fallback, and anti-repeat exemption
  (extends the existing `getInteractionMode` / `interactionContext` suites). Cover
  the shell branches (tap off, goodnight terminal, direction→lockScreen) - the
  seam `conceptual-analysis-2026-07.md` (G3) calls untested.
- **Still Android-only.** The register only activates where a bedtime window is
  configured (Android-gated per `CLAUDE.md`); the shared engine change widens
  cheaply later.
