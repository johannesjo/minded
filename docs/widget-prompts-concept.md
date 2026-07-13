# Concept: the speaking sun - quiet prompts on the home-screen widget

Status: **implemented on Android and iOS (device verification pending on
both).** A design note for evolving the existing sun companion widget
(`docs/sun-companion-widget.md`) from pure presence into presence *plus one
quiet line of text*. The Android implementation lives in
`android/app/src/main/java/com/minded/minded/widget/` (`WidgetPrompts.kt`,
the responsive `MyAppWidget.kt`); the iOS port in
`extension/ios/App/MindedWidget/` (`WidgetPrompts.swift`, the `systemMedium`
card in `MindedWidget.swift`). Neither has yet been seen on a real
launcher/device.

> **Update - per-prompt tap routing shipped.** The widget now shows *real
> interaction content* and tapping lands on that **exact** interaction (a NOTICE
> cue → the NOTICE screen, a "How about…" line → the ACTION_ADVICE screen),
> instead of a random pick. See *Tapping the widget lands on the line it shows*
> below; this reverses the original "deliberately out of scope" note. Two
> consequences: the widget pool is now the **waking-hours** widget-safe slice of
> the interaction pools (one `WAKING_PROMPTS` list, 06:00–19:00), and the
> **evening gratitude register was dropped** - gratitude is sleep-wind-down
> content with no dashboard interaction to land on, so it can't satisfy the
> new rule that every line maps to a real interaction.

> **Update - the line is now a 15-minute mini-intervention, not a once-a-day
> anchor.** The original design rotated one line per *day* ("slow and boring by
> design"). Reframed: the doom-scroll moment is the unlock, and on iOS the widget
> is the *only* surface that can meet it - so the line now **steps every 15
> minutes** through the waking day, fresh on return but far too slow to reward
> re-checking. This reverses the slow-rotation rule in *The biggest risk* below
> (rewritten). The anti-feed guarantee now comes from the 15-minute floor plus
> invitational-only copy, not from near-stillness. WidgetKit can't fire *on*
> unlock and Android can't cheaply either, so both realise this as a dense,
> deterministic, pre-placed rotation that simply renders the current slot's line
> whenever the user returns.

## The idea in one line

The home-screen widget becomes **a miniature still of the in-app intervention
screen**: the app's sky, one short present-moment line in the serif question
voice ("Feel both feet on the floor."), and the sun resting beneath it -
ambient, metric-free, an invitation. Resized down to 1×1 it falls back to the
plain floating sun. The widget remains a doorway, but the doorway can hold a
word.

## Why this, and why Android first

- On iOS the widget *is* the whole product surface - no interventions exist
  there by design (`docs/ios-platform-fit.md`), so ambient presence is the
  only channel, and making it slightly richer is the only way iOS minded
  grows. But the Android widget, receiver, alarms, deep link, and phase logic
  already exist and are testable without a Mac; iOS is a port of whatever
  Android proves out (the iOS widget was ported 1:1 from Android; CI wires its
  extension target in at build time). So: **prototype the concept on Android,
  port the shape to WidgetKit once it's settled** - which has since happened,
  see *iOS port* below.
- The glance at the phone is the moment a doom-scroll begins. The sun already
  re-grounds that glance with warmth; a present-moment anchor sitting next to
  it is the same re-grounding, one register more explicit - for users who
  want it.

## The prior constraint this pushes against - and how it stays honest

`docs/sun-companion-widget.md` scoped v1 to "no metrics on the widget … it is
a sun, not a scoreboard" and "no bespoke widget-only experience." Both
survive:

- **No metrics** stays absolute. A prompt is not a metric - but the rule
  generalizes: the widget never shows a number, a count, a streak, a
  timestamp, or anything *about the user*. The line speaks in the world's
  voice ("What can you hear right now?"), never the app's voice about the
  user ("you've opened Instagram…").
- **No bespoke experience** stays true for the tap: it still runs the *shared*
  interaction flow (`?sun=open`), not a widget-only surface - the tapped line
  just pins which existing NOTICE/ACTION_ADVICE that flow opens on (see *Tapping
  the widget lands on the line it shows*). The prompt is ambient reading, not a
  new surface. And visually it isn't a new surface either: the card deliberately
  *is* the intervention screen in miniature - same sky, same serif voice, same
  text-above-sun layout - so the widget previews the exact world the tap opens,
  down to the line, rather than inventing a widget-only look.
- **Opt-out by shape.** The gallery default (3×2) is the card; resizing down
  below card size (to 2×2, 2×1, 1×1) returns the pure wordless sun. The words
  are the widget's face, but silence is always one resize away - and existing
  placed 1×1 suns stay exactly as they are.

## What the widget may say - the 90% bar, applied to a surface that lingers

The product bar (`docs/reflective-companion-concept.md`) is built for
in-the-moment surfaces. A widget line **lingers for hours**, so "present
moment, never a stale timestamp" becomes the dominant constraint and rules
out most of the app's content:

1. **Timeless anchors only, or generously window-gated.** A line must be
   true and helpful at *any* moment someone might read it within its display
   window. "Feel both feet on the floor" can never go stale. "Good morning"
   at 11:58 already lies.
2. **Never about the user.** No observed behaviour either - the return-loop
   insight is definitionally session-bound and would be stale wallpaper an
   hour later. On this surface, even true observations expire. World-voice
   invitations don't.
3. **Glanceable by anyone.** The home screen is semi-public. Never the
   user's answers, intents, emotion labels, blocked apps - nothing personal,
   ever. (This also means no App Group / no data feed is needed on iOS,
   preserving the widget's zero-entitlement footprint.)
4. **No anxiety, scarcity, urgency, or guilt** - as everywhere.
5. **Deterministic rotation, paced to the return moment.** See below: the line
   steps every 15 minutes so a glance on return finds a fresh invitation, but
   never fast enough to reward re-checking within a session.

### The pool (as shipped in `WidgetPrompts.kt`)

| Slot | Source | Examples (verbatim from the app) |
|---|---|---|
| Waking (06–19) | `NOTICE_CUES` (`notice.const.ts`) + the short `ACTION_ADVICES` (`actionAdvices.ts`) | "Feel both feet on the floor." / "How about a deep breath?" |
| Night (19–06) | **nothing - the moon, alone** | words at 2 a.m. read as a nudge; the calm answer is silence |

The pool is deliberately small (one `WAKING_PROMPTS` list, ≤60 chars each -
enforced by test) and carries **no open questions**: an unanswerable question on
an ambient surface reads as friction, and - since tapping must now open the
line's real interaction - every entry must be a NOTICE cue or an ACTION_ADVICE,
the app's only widget-safe modes. The lines are copied **verbatim** from those
two interaction pools (a jest parity test guards the copy against drift), not an
automatic feed of `QUESTIONS`. *(The former evening gratitude row was dropped -
see the status note at the top and the routing section below.)*

### The cut list (so it doesn't creep back)

- ❌ anything with a number: usage, taps, minutes, streaks, budgets
- ❌ pattern insights / behaviour observations (stale within the hour here)
- ❌ mood/energy echoes ("earlier you felt…") - already cut app-wide
- ❌ the user's own words (answers, intents) - semi-public surface
- ❌ time-sensitive greetings ("good morning") - staleness trap for no gain
- ❌ quotes-as-content-strategy - `QUOTES` is a deliberately small, curated
  dashboard pool; don't build a quote-of-the-day machine, that's a different
  (and more ornamental) product

## The biggest risk, named: a changing widget trains checking

Rotating content on a home screen *can* become a tiny feed - "what does it say
now?" is the exact dopamine loop minded exists to dissolve. But the widget is a
**mini-intervention**, not ambient wallpaper: the glance on unlock is where a
doom-scroll begins, and on iOS (`docs/ios-platform-fit.md`) this widget is the
*only* surface that can meet that moment - a line worn to wallpaper by the tenth
look of the day can't. So the line **steps every 15 minutes** through the waking
day. Two properties keep that an intervention, not a slot machine:

- **Below the re-check threshold.** Fifteen minutes is far too slow to reward
  refreshing - stare and nothing happens for a quarter hour - so it never trains
  the "check again" loop. The freshness lives *between* sessions (two returns
  spaced apart differ), never *within* a glance: fast enough to feel alive on
  return, slow enough to be boring to watch.
- **Every line is safe at any glance.** The widget can't tell a doom-scroll
  return from a neutral glance (checking the time, opening the camera), so the
  pool stays gentle present-moment *invitations* in the world's voice - never
  confrontation, never a command. You get the intervention's *timing* without
  its *tone*.
- **Rotation is still deterministic**: the slot index is a continuous count of
  15-minute slots since the epoch, so the same moment always shows the same line
  (a Glance/WidgetKit recomposition on a host event can't shuffle it) and the
  pool is walked one step per slot with no adjacent repeats - the whole pool in
  ~3¾ h, so no line recurs within a session.

Habituation is still *accepted*, not fought with novelty for its own sake: the
15-minute step exists to meet the return moment freshly, not to manufacture a
stream of new things to see. A mindfulness bell rung on your return still rings.

## Architecture (Android, as implemented)

Everything extends what exists; nothing new is invented.

```
[card ≥ ~3×2]  =  intervention screen in miniature:
                  [app sky] over [serif line] over [sun]
      |                              |
  SizeMode.Exact              WidgetPrompts.promptForMoment(epochDay, hour, minute)
  (below card size →          (pure Kotlin, 15-min-slot indexed, unit-tested -
   plain floating sun;         the SunWidgetPhase pattern; night → null)
   sun scales to the tile)
      |
  tap → actionStartActivity(EXTRA_LAUNCH_ROUTE = "/?sun=open",
                            EXTRA_WIDGET_LINE = the shown line)  ← lands on that line
      |
  MyAppWidgetReceiver alarm: next 15-min prompt step (the finest cadence,
   ⊇ the sky steps ⊇ the phase flips); one alarm spans the night
   (~60 inexact, non-wake wakeups per waking day - only while the screen's on)
```

- **`MyAppWidget.kt`**: `SizeMode.Exact` with two faces, the card shown once
  the tile clears the `CARD_MIN` 170×140dp floor. That 140dp height is a fit
  guarantee, not a guess (12dp padding ×2 + three 15sp serif lines + 8dp
  spacer + 44dp sun ≈ 136dp); anything shorter - flat rows, dense grids,
  landscape - keeps the plain floating sun rather than a clipped card. `Exact`
  (not `Responsive`) so the real tile size is known: the sun/moon then scales
  to fill it (`companionSunSize`, a fraction of the shorter side floored at the
  1×1 sun) rather than floating as a fixed 72dp dot in a large tile - most
  visibly the night card, where the wordless moon grows to own the space. The
  card is a `Column` with the sky as `background(ImageProvider)` - dedicated
  **card-sized `widget_sky_*` renders** of the exact app sky, dithered at
  target size by `gen_loading_sky.py` (minifying the full-screen sky would
  undersample the dither and re-band; these also cut the launcher-side
  decode ~5×). Like the app's ambient background the sky moves through the
  day: one render per `AMBIENT_SKY_KEYFRAMES` entry (`skyTimeline.ts`),
  stepped on whole hours by `WidgetSky.kt` (dawn 06 → morning 09 → midday 13
  → afternoon 17 → dusk 18 → the dark night sky at 19). Text is 15sp
  platform serif (widgets can't embed Newsreader; the serif register
  carries), colored `--c-fg-full-emphasis` light (`rgba(0,0,0,.85)`) - only
  ever drawn on the light pastel day skies, by construction (see below).
  `cornerRadius(24dp)` on API 31+ (square below). Sky follows the clock via
  `WidgetSky`/`SunWidgetPhase`, never the system theme.
- **`WidgetPrompts.kt`** (new, `widget/` package): the curated waking-hours
  pool (`WAKING_PROMPTS`), plus pure `promptForMoment(epochDay, hour, minute)`,
  `minutesUntilNextChange`, and `isWidgetSafeLine` (the tap's allow-list) -
  R-free, JVM-unit-tested like `SunWidgetPhase` (`WidgetPromptsTest`). The
  wordless-night window is built from `SunWidgetPhase`'s own
  `DAY_START`/`NIGHT_START` constants, so it *is* the moon's window and can't
  drift. Tests enforce the guardrails mechanically: determinism, ≤60 chars,
  full-pool one-step-per-15-min-slot rotation with no adjacent repeats, the
  15-minute day cadence with a single night-spanning alarm, night returns
  `null`, text-iff-light-sky, and the allow-list. `WidgetSky` and
  `SunWidgetPhase` are pure `forHour` lookups (the receiver refreshes on the
  prompt's cadence, which subsumes their whole-hour steps, so neither needs a
  schedule of its own); the wrap-around boundary walk in `clockBoundaries.kt`
  is used only for that night-spanning alarm.
- **`MyAppWidgetReceiver.kt`**: the existing self-rescheduling inexact,
  non-wake alarm now arms at the next 15-minute prompt step - the finest
  cadence, which contains the sky steps and the sun's phase flips by
  construction - and a single alarm spans the wordless night. Non-wake (RTC)
  means it only fires while the device is already awake, i.e. right when
  someone's looking. Same pattern, same permissions (none). DST drift (±1h
  twice a year, self-correcting) is documented and accepted.
- **`app_widget_info.xml`**: target 3×2 on API 31+, and `minWidth/minHeight`
  170×110dp so pre-31 launchers also default to a 3×2 drop; `minResize`
  40dp keeps 1×1 reachable and already-placed widgets keep their spans.
  The picker shows a real card still via `previewLayout`
  (`layout/widget_preview_card.xml`, API 31+) with the plain-sun
  `previewImage` as the pre-31 fallback.
- **No syncData read, no bridge, no WorkManager.** The widget stays fully
  self-contained and clock-driven - exactly like today. (Native *can* read
  `SharedPreferenceService`, but per the content rules there is nothing
  personal the widget should ever display, so it deliberately doesn't.)

**Source of truth for the pool - KISS first:** the pool lives natively as a
curated **verbatim mirror** of the TS interaction pools (`NOTICE_CUES`,
`ACTION_ADVICES`) - in Kotlin (`WidgetPrompts.kt`) and, since the iOS port, in
Swift (`WidgetPrompts.swift`). Because the tap re-matches the shown line
against those same TS pools by exact string, the copies must not drift - a
jest parity test (`widgetPromptsMirror.test.ts`) reads both native sources and
asserts every line still exists verbatim in TS *and* that the two native pools
match one-to-one in order (same order + same slot arithmetic = the same line
at the same moment on both platforms). When iOS became the third consumer, the
planned build-time JSON extraction was weighed and deliberately deferred:
three build systems' worth of codegen wasn't worth dodging a mechanically
guarded copy. The upgrade path stands if a fourth consumer appears or the pool
starts churning.

## Tapping the widget lands on the line it shows

The card is a still of the intervention screen, so the tap opens *that* screen
on *that* line - not a fresh random pick. The mechanism stays self-contained and
carries no user data:

- **The card carries its exact line** to the app as an intent extra
  (`EXTRA_WIDGET_LINE`, `MyAppWidget.openSunIntent`).
- **The native shell allow-lists it** exactly like the launch route:
  `MainActivity.widgetLineFromIntent` forwards the extra only if
  `WidgetPrompts.isWidgetSafeLine` recognises it, then appends it URL-encoded to
  the hash (`#/?sun=open&widgetLine=…`) on both the cold and warm paths. A
  crafted intent can only ever inject one of the widget's own known, quote-free
  lines.
- **The web shell forces the matching mode** (`RouteCmp` reads `widgetLine` →
  `InteractionOverlay` → `InteractionCommon`): `matchWidgetLine` looks the string
  up in `NOTICE_CUES`/`ACTION_ADVICES` and pins that exact NOTICE cue or
  ACTION_ADVICE, mirroring the existing `questionForPrompt` injection. An
  unrecognised line (copy drift, a crafted intent) falls through to the normal
  random pick - it degrades, never breaks.

This is why only NOTICE and ACTION_ADVICE may appear on the widget, and why the
gratitude register had to go: they are the only ambient-safe modes that *also*
have a dashboard-sun interaction to land on. The widget can only mirror this
time-of-day + content slice; it deliberately cannot reflect the live
per-user context (`getInteractionMode`'s friction/usage/variety), which needs
private state the widget must never hold.

## iOS port (implemented)

The shape mapped cleanly to WidgetKit, arguably more naturally than Android:

- `systemMedium` family = the card; `systemSmall` stays the pure sun (the
  WidgetKit analogue of Android's responsive size fallback).
- The timeline pre-places every face change as an entry - quarter-hour prompt
  steps by day (which contain the sky's whole-hour steps and the phase flips by
  construction, exactly like the Android alarm cadence), one wordless entry
  spanning the night - **no App Group, no refresh budget pressure** (the
  entries are deterministic, so nothing regenerates on unlock), **no
  entitlement**. This is exactly why the iOS shape fits: WidgetKit can't fire
  *on* unlock, but a dense pre-placed timeline renders the current slot's line
  whenever the user returns - the same effect, at zero refresh-budget cost.
- The pool ships bundled in the widget target as a Swift mirror
  (`WidgetPrompts.swift`) guarded by the same parity test - see *Source of
  truth* above for why the JSON extraction was deferred.
- The skies are the same dithered renders as Android's, generated at the iOS
  card's own size by the same script (`android/tools/gen_loading_sky.py` →
  `MindedWidget/Assets.xcassets`).
- Tap routing mirrors Android's: the card's `widgetURL` carries its exact line
  (`minded://sun?line=…`); the native shell re-encodes it to alphanumerics+`%`
  (`AppDelegate.encodedWidgetLine` - nothing that could break out of the JS
  string can reach the WebView hash; the exact-pool match stays on the web,
  where an unknown line degrades to the normal open) and appends
  `&widgetLine=…` on both the cold (user script) and warm (notification) paths.
- The `MindedWidget` target is wired into `App.xcodeproj` by CI
  (`scripts/add_widget_target.rb`); like the rest of the iOS widget it was
  written without a Mac, so the first Xcode build/TestFlight run is the real
  verification.

## Deliberately out of scope

- ~~**Per-prompt tap routing**~~ - **now shipped** (see *Tapping the widget
  lands on the line it shows*). The original worry was that it couples the
  widget to a question pool and builds a bespoke widget-experience; keeping the
  widget to the two ambient-safe interaction modes (whose lines it already
  showed verbatim) and re-matching by string sidesteps both - no new pool, no
  new surface, and an unrecognised line just falls back to the universal
  invitation.
- **Lock-screen / AOD variants** - the iOS accessory-widget alpha problem is
  documented; same restraint on Android.
- **Notifications of any kind** - the product has none, deliberately; the
  widget never reaches for you.
- **Any behaviour-derived content** - even the shipped return-loop insight.
  Wrong surface: it lingers.

## Decisions taken at implementation (were open questions)

- **Pool has no questions** - anchors and suggestions only; every line must
  map to a widget-safe interaction the tap can open (NOTICE / ACTION_ADVICE).
- **Boundaries are the app's own day/night edges** (06 / 19); nothing new. *(The
  20 evening boundary went with the gratitude register.)*
- **The card is the gallery default** (3×2 target) - per the product call
  that the widget should read as the intervention screen; the wordless sun
  remains one resize away and existing 1×1 placements are untouched.

## Still open

- **Copy sign-off.** The pool reuses the app's own words verbatim, but the
  selection is an editorial act and deserves the same voice review the
  return-loop copy got.
- **On-device look.** The card has not been seen on a real launcher yet:
  serif rendering, the card sky's dither under mild scaling, and how the
  170×140dp face maps to 3×2 across launchers/grid densities all need one
  round on hardware. (The RemoteViews bitmap budget turned out to be a
  non-issue - Glance ships resource *references*, not parceled bitmaps; the
  real cost was the launcher-side decode, addressed by the card-sized sky.)
