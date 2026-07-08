# Concept: the speaking sun — quiet prompts on the home-screen widget

Status: **implemented on Android (device verification pending); iOS port
later.** A design note for evolving the existing sun companion widget
(`docs/sun-companion-widget.md`) from pure presence into presence *plus one
quiet line of text*. The Android implementation lives in
`android/app/src/main/java/com/minded/minded/widget/` (`WidgetPrompts.kt`,
the responsive `MyAppWidget.kt`); it has not yet been seen on a real
launcher/device.

> **Update — per-prompt tap routing shipped.** The widget now shows *real
> interaction content* and tapping lands on that **exact** interaction (a NOTICE
> cue → the NOTICE screen, a "How about…" line → the ACTION_ADVICE screen),
> instead of a random pick. See *Tapping the widget lands on the line it shows*
> below; this reverses the original "deliberately out of scope" note. Two
> consequences: the widget pool is now the **waking-hours** widget-safe slice of
> the interaction pools (one `WAKING_PROMPTS` list, 05:00–21:00), and the
> **evening gratitude register was dropped** — gratitude is sleep-wind-down
> content with no dashboard interaction to land on, so it can't satisfy the
> new rule that every line maps to a real interaction.

## The idea in one line

The home-screen widget becomes **a miniature still of the in-app intervention
screen**: the app's sky, one short present-moment line in the serif question
voice ("Feel both feet on the floor."), and the sun resting beneath it —
ambient, metric-free, an invitation. Resized down to 1×1 it falls back to the
plain floating sun. The widget remains a doorway, but the doorway can hold a
word.

## Why this, and why Android first

- On iOS the widget *is* the whole product surface — no interventions exist
  there by design (`docs/ios-platform-fit.md`), so ambient presence is the
  only channel, and making it slightly richer is the only way iOS minded
  grows. But the Android widget, receiver, alarms, deep link, and phase logic
  already exist and are testable without a Mac; iOS is a port of whatever
  Android proves out (the current iOS widget was ported 1:1 from Android and
  its extension target isn't even wired into Xcode yet). So: **prototype the
  concept on Android, port the shape to WidgetKit once it's settled.**
- The glance at the phone is the moment a doom-scroll begins. The sun already
  re-grounds that glance with warmth; a present-moment anchor sitting next to
  it is the same re-grounding, one register more explicit — for users who
  want it.

## The prior constraint this pushes against — and how it stays honest

`docs/sun-companion-widget.md` scoped v1 to "no metrics on the widget … it is
a sun, not a scoreboard" and "no bespoke widget-only experience." Both
survive:

- **No metrics** stays absolute. A prompt is not a metric — but the rule
  generalizes: the widget never shows a number, a count, a streak, a
  timestamp, or anything *about the user*. The line speaks in the world's
  voice ("What can you hear right now?"), never the app's voice about the
  user ("you've opened Instagram…").
- **No bespoke experience** stays true for the tap: it still runs the *shared*
  interaction flow (`?sun=open`), not a widget-only surface — the tapped line
  just pins which existing NOTICE/ACTION_ADVICE that flow opens on (see *Tapping
  the widget lands on the line it shows*). The prompt is ambient reading, not a
  new surface. And visually it isn't a new surface either: the card deliberately
  *is* the intervention screen in miniature — same sky, same serif voice, same
  text-above-sun layout — so the widget previews the exact world the tap opens,
  down to the line, rather than inventing a widget-only look.
- **Opt-out by shape.** The gallery default (3×2) is the card; resizing down
  below card size (to 2×2, 2×1, 1×1) returns the pure wordless sun. The words
  are the widget's face, but silence is always one resize away — and existing
  placed 1×1 suns stay exactly as they are.

## What the widget may say — the 90% bar, applied to a surface that lingers

The product bar (`docs/reflective-companion-concept.md`) is built for
in-the-moment surfaces. A widget line **lingers for hours**, so "present
moment, never a stale timestamp" becomes the dominant constraint and rules
out most of the app's content:

1. **Timeless anchors only, or generously window-gated.** A line must be
   true and helpful at *any* moment someone might read it within its display
   window. "Feel both feet on the floor" can never go stale. "Good morning"
   at 11:58 already lies.
2. **Never about the user.** No observed behaviour either — the return-loop
   insight is definitionally session-bound and would be stale wallpaper an
   hour later. On this surface, even true observations expire. World-voice
   invitations don't.
3. **Glanceable by anyone.** The home screen is semi-public. Never the
   user's answers, intents, emotion labels, blocked apps — nothing personal,
   ever. (This also means no App Group / no data feed is needed on iOS,
   preserving the widget's zero-entitlement footprint.)
4. **No anxiety, scarcity, urgency, or guilt** — as everywhere.
5. **Slow, deterministic rotation.** See below; a fast-changing widget is a
   novelty feed, which is the failure mode to design against.

### The pool (as shipped in `WidgetPrompts.kt`)

| Slot | Source | Examples (verbatim from the app) |
|---|---|---|
| Waking (05–21) | `NOTICE_CUES` (`notice.const.ts`) + the short `ACTION_ADVICES` (`actionAdvices.ts`) | "Feel both feet on the floor." / "How about a deep breath?" |
| Night (21–05) | **nothing — the moon, alone** | words at 2 a.m. read as a nudge; the calm answer is silence |

The pool is deliberately small (one `WAKING_PROMPTS` list, ≤60 chars each —
enforced by test) and carries **no open questions**: an unanswerable question on
an ambient surface reads as friction, and — since tapping must now open the
line's real interaction — every entry must be a NOTICE cue or an ACTION_ADVICE,
the app's only widget-safe modes. The lines are copied **verbatim** from those
two interaction pools (a jest parity test guards the copy against drift), not an
automatic feed of `QUESTIONS`. *(The former evening gratitude row was dropped —
see the status note at the top and the routing section below.)*

### The cut list (so it doesn't creep back)

- ❌ anything with a number: usage, taps, minutes, streaks, budgets
- ❌ pattern insights / behaviour observations (stale within the hour here)
- ❌ mood/energy echoes ("earlier you felt…") — already cut app-wide
- ❌ the user's own words (answers, intents) — semi-public surface
- ❌ time-sensitive greetings ("good morning") — staleness trap for no gain
- ❌ quotes-as-content-strategy — `QUOTES` has one entry; don't build a
  quote-of-the-day machine, that's a different (and more ornamental) product

## The biggest risk, named: a changing widget trains checking

Rotating content on a home screen is, mechanically, a tiny feed — "what does
it say now?" is the exact dopamine loop minded exists to dissolve. Two design
rules keep the prompt an anchor instead of a slot machine:

- **Rotation is slow and boring by design**: the line changes only at the
  app's existing time boundaries — the day's line at 05:00, silence at 21:00
  (no invented dayparts; ~one text change a day, since the epoch-day index
  turns over unseen during the wordless night, aligned with the alarms the
  widget already arms) — never per-glance, never per-hour.
- **Rotation is deterministic**: the epoch day indexes the pool, so
  the same moment always shows the same line and the pool is walked exactly
  one line per day (same intent as `sleepWindDown.util.ts`'s `nightIdToIndex`,
  minus that char-sum hash's uneven date-rollover steps). Nothing to refresh,
  nothing to fish for — and technically necessary anyway, since Glance
  recomposes on launcher events and a `Math.random` pick would visibly
  shuffle.

Habituation — the line becoming invisible wallpaper within days — is
*accepted*, not fought. A mindfulness bell you've stopped hearing still rings
sometimes. Fighting habituation with novelty is how this becomes a feed.

## Architecture (Android, as implemented)

Everything extends what exists; nothing new is invented.

```
[card ≥ ~3×2]  =  intervention screen in miniature:
                  [app sky] over [serif line] over [sun]
      |                              |
  SizeMode.Responsive         WidgetPrompts.promptForMoment(epochDay, hour)
  (below card size →          (pure Kotlin, epoch-day indexed, unit-tested —
   plain floating sun)         the SunWidgetPhase pattern; night → null)
      |
  tap → actionStartActivity(EXTRA_LAUNCH_ROUTE = "/?sun=open",
                            EXTRA_WIDGET_LINE = the shown line)  ← lands on that line
      |
  MyAppWidgetReceiver alarm: next sky-step boundary (⊇ the phase flips
   ⊇ the prompt slots) → 05/09/13/17/19/21 (≈6 inexact wakeups/day)
```

- **`MyAppWidget.kt`**: `SizeMode.Responsive` with two faces — `SUN_ONLY`
  (40×40dp) and `PROMPT_CARD` (170×140dp). The 140dp floor is a fit
  guarantee, not a guess (12dp padding ×2 + three 15sp serif lines + 8dp
  spacer + 44dp sun ≈ 136dp); anything shorter — flat rows, dense grids,
  landscape — keeps the plain floating sun rather than a clipped card. The
  card is a `Column` with the sky as `background(ImageProvider)` — dedicated
  **card-sized `widget_sky_*` renders** of the exact app sky, dithered at
  target size by `gen_loading_sky.py` (minifying the full-screen sky would
  undersample the dither and re-band; these also cut the launcher-side
  decode ~5×). Like the app's ambient background the sky moves through the
  day: one render per `AMBIENT_SKY_KEYFRAMES` entry (`skyTimeline.ts`),
  stepped on whole hours by `WidgetSky.kt` (dawn 05 → morning 09 → midday 13
  → afternoon 17 → dusk 19 → the dark night sky at 21). Text is 15sp
  platform serif (widgets can't embed Newsreader; the serif register
  carries), colored `--c-fg-full-emphasis` light (`rgba(0,0,0,.85)`) — only
  ever drawn on the light pastel day skies, by construction (see below).
  `cornerRadius(24dp)` on API 31+ (square below). Sky follows the clock via
  `WidgetSky`/`SunWidgetPhase`, never the system theme.
- **`WidgetPrompts.kt`** (new, `widget/` package): the curated waking-hours
  pool (`WAKING_PROMPTS`), plus pure `promptForMoment(epochDay, hour)`,
  `minutesUntilNextChange`, and `isWidgetSafeLine` (the tap's allow-list) —
  R-free, JVM-unit-tested like `SunWidgetPhase` (`WidgetPromptsTest`). The slot
  boundaries are built from `SunWidgetPhase`'s own `DAY_START`/`NIGHT_START`
  constants, so the no-text window *is* the moon's window and can't drift. Tests
  enforce the guardrails mechanically: determinism, ≤60 chars, full-pool
  one-step-a-day rotation, night returns `null`, text-iff-light-sky, the
  allow-list, and (`WidgetSkyTest`) the sky boundaries covering both the
  phase flips and the prompt slots. The shared boundary walk lives in
  `clockBoundaries.kt`, used by `WidgetSky`, `WidgetPrompts`, and
  `SunWidgetPhase`.
- **`MyAppWidgetReceiver.kt`**: the existing self-rescheduling inexact alarm
  arms at the next sky-step boundary, which contains the sun's phase flips
  and the prompt slots by construction. Same pattern, same permissions
  (none). DST drift (±1h twice a year, self-correcting) is documented and
  accepted.
- **`app_widget_info.xml`**: target 3×2 on API 31+, and `minWidth/minHeight`
  170×110dp so pre-31 launchers also default to a 3×2 drop; `minResize`
  40dp keeps 1×1 reachable and already-placed widgets keep their spans.
  The picker shows a real card still via `previewLayout`
  (`layout/widget_preview_card.xml`, API 31+) with the plain-sun
  `previewImage` as the pre-31 fallback.
- **No syncData read, no bridge, no WorkManager.** The widget stays fully
  self-contained and clock-driven — exactly like today. (Native *can* read
  `SharedPreferenceService`, but per the content rules there is nothing
  personal the widget should ever display, so it deliberately doesn't.)

**Source of truth for the pool — KISS first:** the pool lives in Kotlin for
v1 as a curated **verbatim mirror** of the TS interaction pools (`NOTICE_CUES`,
`ACTION_ADVICES`). Because the tap now re-matches the shown line against those
same TS pools by exact string, the copies must not drift — a jest parity test
(`widgetPromptsMirror.test.ts`) reads `WidgetPrompts.kt` and asserts every line
still exists verbatim in the source. When the iOS port lands (a third consumer
in Swift), extract the pool to a small JSON generated at build time from a
shared TS const —
`// shortcut: Kotlin-only mirror — extract to generated shared JSON when iOS ports this`.

## Tapping the widget lands on the line it shows

The card is a still of the intervention screen, so the tap opens *that* screen
on *that* line — not a fresh random pick. The mechanism stays self-contained and
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
  random pick — it degrades, never breaks.

This is why only NOTICE and ACTION_ADVICE may appear on the widget, and why the
gratitude register had to go: they are the only ambient-safe modes that *also*
have a dashboard-sun interaction to land on. The widget can only mirror this
time-of-day + content slice; it deliberately cannot reflect the live
per-user context (`getInteractionMode`'s friction/usage/variety), which needs
private state the widget must never hold.

## iOS port (after Android settles)

The shape maps cleanly to WidgetKit, arguably more naturally than Android:

- `systemMedium` family = the wide variant; `systemSmall` stays the pure sun.
- The timeline already pre-places day/night boundary entries; daypart prompt
  changes are just more pre-placed entries — **no App Group, no refresh
  budget pressure, no entitlement**, same as today.
- The pool ships bundled in the widget target (the shared-JSON extraction
  above happens here).
- Prerequisite regardless of this concept: the `MindedWidget` target still
  needs to be wired into `App.xcodeproj` and built once for real.

## Deliberately out of scope

- ~~**Per-prompt tap routing**~~ — **now shipped** (see *Tapping the widget
  lands on the line it shows*). The original worry was that it couples the
  widget to a question pool and builds a bespoke widget-experience; keeping the
  widget to the two ambient-safe interaction modes (whose lines it already
  showed verbatim) and re-matching by string sidesteps both — no new pool, no
  new surface, and an unrecognised line just falls back to the universal
  invitation.
- **Lock-screen / AOD variants** — the iOS accessory-widget alpha problem is
  documented; same restraint on Android.
- **Notifications of any kind** — the product has none, deliberately; the
  widget never reaches for you.
- **Any behaviour-derived content** — even the shipped return-loop insight.
  Wrong surface: it lingers.

## Decisions taken at implementation (were open questions)

- **Pool has no questions** — anchors and suggestions only; every line must
  map to a widget-safe interaction the tap can open (NOTICE / ACTION_ADVICE).
- **Boundaries are the app's existing lines** (05 / 21); nothing new. *(The 20
  evening boundary went with the gratitude register.)*
- **The card is the gallery default** (3×2 target) — per the product call
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
  non-issue — Glance ships resource *references*, not parceled bitmaps; the
  real cost was the launcher-side decode, addressed by the card-sized sky.)
