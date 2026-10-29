# The sun's halo — where the sun looks like what

There is only ever one sun. This is the reference for what it looks like in each
place it appears, and the rule governing the one thing that used to vary without
a reason: its colour.

## The rule

**The sun's body may be warm; the light it casts is white.**

Amber is *not* a day/night signal and *not* a role badge. On every surface we
control the sun's halo is white.

The test is **what the sun stands on**, not which process draws it. Amber is for
the sun on a background we *don't* control, where it has to announce itself or
read as a pale blob:

- the Little Sun overlay, over arbitrary app content;
- the small home-screen widget, transparent on the user's wallpaper.

A widget that paints the app's **own sky** behind the sun — the prompt card, on
both platforms — is our surface like any other. The sun glows white there.

The departing hand-off is the one in-app state that warms, because it is
mid-morph into the Little Sun: the warming *is* the hand-off, not a state the
in-app sun ever holds.

Why it matters: colour that changes with role turns the one continuous sun into
a set of differently-coloured suns. It also made the everyday lift off the bottom
bar into an intervention a colour change nobody asked for. White both ways keeps
that morph pure size and position.

The cool half of the axis is untouched — that still carries the up-drag/let-go
read — and the moon never warms at all.

The rule is enforced by tests in `sunSettle.test.ts` (`describe("halo warmth")`),
which assert every in-app settle carries no `warmth` and only the two departing
shapes do.

## One element, four knobs

Every sun in the app is the same `.minded-sun` div (`Sun.tsx` / `Sun.scss`).
Only these differ:

| Knob | Range | Set by |
|---|---|---|
| `--glow-color` | cool `200,220,255` ← **white** `255,255,255` → amber `255,214,115` | `glowColorForTemp`, from the drag temperature or a settle's `warmth` |
| `--glow-intensity` | brightness of the bloom | drag ramp, floored at the rest glow; a settle may pin it |
| `--glow-reach` | `1` broad (15/40/**80**px layers) · `0.2` snug (far plume collapsed) | a settle's `reach` |
| `--minded-sun-face-edge` | the disc's own rim: `#fff` or warm `#fff5dc` | `RouteCmp.module.scss`, companion only |

Plus one constant: a 1px warm hairline (`--sun-shadow`) rings the sun disc in
every state. The moon replaces it with a white one.

## The light it casts on the sky

The halo is the light *at* the sun. The sun also lights the sky *around* it: a
broad, faint radial lift (`.sun-light` in Sun.tsx / Sun.scss, logic in
`sunLight.ts`) - a near bloom just past the rim plus a very faint, wide lift.

- **White, always.** It takes no warmth input at all; the departing hand-off
  warms the halo, never this. The moon casts the cool end of the glow axis
  (`200,220,255`) at half the level.
- **It is a child of the disc**, so it rides the disc's own transform: every
  drag, fling, settle glide, companion ↔ intervention lift and reflow re-pin
  carries the light on the same frame, in every runtime. It moves only when
  the disc moves - no drift, no pulse, no breath of its own.
- **It leaves with the sky.** On both corner hand-offs (the settles that pin
  `discPx`) its level eases to 0 on `--dur-sky`, alongside the sky's own
  `is-departing` / `is-arriving` fade - a white pool over someone else's app
  would only be a pale smudge. Under reduced motion it doesn't fade; it just
  sits where the (snapped) disc rests.
- **It paints over content**, because the disc's stacking context sits above
  it. It is shaped so the nearest voice copy only catches ~5% white (~5.1:1
  contrast against 5.4:1 without it). That faint lift is the only highlight
  text gets.

Guard tests: `sunLight.test.ts`.

## Day (light theme → sun)

| Where | Disc | Halo | Intensity | Reach |
|---|---|---|---|---|
| Companion, resting on the bottom bar | white + warm `#fff5dc` rim | white | 1.25 | snug |
| Companion, hovered | same | white | 1.8 | snug |
| Dragged up (let go) | white | cools toward `200,220,255` with drag distance | 1.25 | broad |
| Dragged down (grounding) | white | white | 1.25 | broad |
| Intervention, full size | white | white | 1.25 | broad |
| Breath pause (scale .82) | white | white | 1.25 | broad |
| Urge-surfing (looping pulse) | white | white | 1.25 | broad |
| Intent/time choices (scale .5) | white | white | 1.25 | broad |
| Daily questions (+ orbit dots) | companion look | white | 1.25 | snug |
| Daily-questions success bloom (.62) | white | white | 1.25 | broad |
| **Departing → Little Sun** | white, shrinking to 40px (web) / 30px (Android) | **amber** | 1.0 | snug |
| **Arriving ← Little Sun** | same corner + disc size, growing back to full | white | 1.0 | snug → broad |

The snug reach on the companion is *not* about colour: this low on the bar the
broad bloom's far plume gets clipped by the screen edge below, pulling the disc's
visible mass upward off the icon line (#106).

The last two rows are the same morph in opposite directions, and only one of them
warms. The halo answers to the surface the sun is *moving onto*: departing, that
is arbitrary app content, so it warms on the way out; arriving, it is our own sky,
so it comes home white and the morph is pure size and position. Position, disc
size and reach mirror exactly — `sunArriveSettle` / `sunArriveSettleAt` are the
departing targets with the warmth taken back out, and `sunSettle.test.ts` asserts
warmth is the only field that differs. Arriving reused the departing target until
#262, which put an orange flash at the top of every intervention re-shown after a
session timer.

## Night (dark theme → moon)

Never warm, at any point. The disc is drawn (a shaded body under soft maria
fields - see `.moon-face` in Sun.scss) and shows tonight's real phase: its
night side is veiled by a soft-edged earthshine wash (`--moon-shadow`,
`src/shared/sky/moonShadow.ts`), never cut out, so even a new moon is a faint,
findable disc. The phase changes the face only - the halo is
a white/cool box-shadow plus a static cool light-pool (`::after`). Rest 1.1,
hover 1.7; snug reach on the bar, broad everywhere else. In dark mode a wide cool
"horizon reflection" pools under the bottom bar (`RouteCmp.module.scss`, #125).
The departing moon dims to 1.0 + snug like the sun, but stays cool.

### The day↔night flip

The theme can flip under a live sun: an app resume across the threshold, or -
on the dashboard shell, which follows the clock live (`followDayNight`) - the
real dusk or dawn arriving while the app is open. Neither turns under an open
pause (parts of it read the theme once): the theme stays as it was, and the
turn plays on the minute after the pause closes.

The sky turns the way the real one does (`sky/skyTurn.ts`, played as a View
Transition by `turnTheSky` in `addWrapperClasses.ts`, since a gradient can't
transition in CSS), over `SKY_TURN_MS` (2.4 s):

- **Nightfall:** the dark comes down from the zenith on a soft, half-screen
  front, so the horizon holds the last light longest.
- **Daybreak:** a broad dome of day rises from the bottom centre, the sky's
  sunrise point, until it holds the whole sky.

Ahead of the front the old sky is already going - it dims toward the night, or
lifts toward the day - so the half of the screen still waiting reads as dusk
deepening, not a still picture about to be wiped.

The sun is never part of that sweep. Each disc on screen gets its own capture
layer (played by a small injected stylesheet - `skyTurnStylesheet` - with the
`-webkit-mask` twins older WebViews need) and stays one disc turning: the moon face fades in *over* the sun face
(the face underneath stays opaque, so the disc never goes translucent mid-flip),
over `--dur-sky-turn`, and the halo, the moon's cool pool and the light it
casts on the sky (`.sun-light`) ease with it (`sunVariantMorph.ts`, Sun.scss)
instead of changing ahead of the disc. Each
disc's turn waits for the sky's front to reach it (`--sky-turn-delay`). So the
companion on the bar turns late at nightfall, when the night reaches the
horizon, and at once at daybreak, rising with the first light. An intervention
sun mid-screen turns halfway through.

A capture paints above the whole page and drops its ancestors' opacity, so a
disc is lifted only when it is plainly there: nothing fading it, nothing
painted over its centre. A sun under a sheet or mid-fade stays part of the page
and turns inside the sweep instead of popping through what covers it.

A tap, key or scroll during the turn lands on the transition, not the page, so
it hurries the rest of the turn - the sky and the disc's own delayed turn alike
- to a close in ~0.3 s instead, and the next one reaches the sun. The disc's
slow turn beat ends the moment the turn lands (`SKY_TURN_SETTLED_EV`), so the
next glide never drags a slow halo. Reduced motion, a hidden page
(a resume lands on the new sky) and WebViews without View Transitions get the
plain flip; a runtime without masks gets the two skies dissolving on the
turn's beat.

On the widget card, night opens on the **nightfall** face (`widget_sky_nightfall`):
the dark sky with the app's own afterglow layers baked in at `--night-afterglow`
0.65. It shows while the real afterglow (`WidgetSun.Moment.afterglow`, ported from
`solarSky.ts`) is ≥ 0.35 (`WidgetSky.NIGHTFALL_MIN_AFTERGLOW`), then the plain
dark face takes over - so the card steps dusk → nightfall → deep night with the
app's sky instead of jumping straight to the deep night. The moon on it is
unchanged: cool, never warmed. The warmth is the sky's (the sunset's afterglow),
not a halo.

## Outside the app

### On a background we don't control — amber

| Where | Look |
|---|---|
| Little Sun, Android native overlay (`LittleSun.kt`) | **white** disc (`SUN_COLOR = Color.White`) + amber radial glow `#ffd673`, 30dp. Night: `#eef2ff` disc, `#bed2ff` glow |
| Little Sun, in the WebView (`--little-sun-bg`) | amber gradient face `#ffe487→#ffb24f→#f2823c` + `--little-sun-shadow` amber halo, 40px |
| Little Sun, web extension | the same CSS one, but the face is pinned to `#fff` — it reads fine as a pale disc on a web page, where the Android overlay over arbitrary app content did not |
| Mindfulness bell, Android native overlay (`BellSun.kt`) | the Little Sun's disc and amber glow (`SunDisc`), at the centre of the screen (where an intervention's sun first appears, so a takeover hands off in place: the intervention's sun grows out of the bell's), with a light dim over the rest of the screen - the deep blue of the night sky, not black, so the world quiets like dusk rather than greying out like a dialog - that comes and goes with the sun and leaves a clear circle around it; nothing of it takes a touch. At the strike a ring of the same amber light leaves the sun's rim and travels outward, thinning as it fades with the audible tone — only ever outward (never a swell that draws back in, which would read as a breath), never a second colour. Night: the moon's cool halo. When the Little Sun or the widget's sun is already in view, the bell brings no disc: the ring leaves that sun's rim instead (one sun) |
| Small widget, Android | `ic_sun_widget_day.xml` — white disc, faint gold rim, amber bloom `@ .28`; transparent on the wallpaper |
| Small widget, iOS | `CompanionSun` with `onOwnSky: false` — same disc, amber bloom `255,214,115 @ .28`; clear container background |
| Night moon, both widgets | tonight's phase (`WidgetMoon`): the drawn moon with its night side veiled by the app's earthshine (`#141e3d @ .7`, blurred); the cool halo is untouched by the phase, exactly as in app |
| Lock Screen + tinted/clear Home Screen, iOS | `SunGlyph` — no colour at all: the system keeps only alpha there and paints its own tint, so a solid disc in a faint ring by day, a hollow one at night; the halo rule has nothing to decide |

Note there are *two* Little Suns on Android: the native Compose overlay
(`LittleSun.kt`, 30dp, white disc) and the CSS one the WebView draws
(`--little-sun-bg`, 40px, amber face). They have different disc sizes and
different faces — `sunSettle.ts` keeps a departing target for each
(`LITTLE_SUN_DISC_PX_ANDROID` / `_WEB`). Both wear the same amber halo.

A white sun on someone else's app or wallpaper is a white blob. That is the
entire reason amber exists, and why the departing hand-off has to arrive already
wearing it.

### On the app's own sky — white

| Where | Look |
|---|---|
| Prompt card, Android | `ic_sun_widget_day_on_sky.xml` — same disc and rim, **white** bloom at the same `@ .28`; over `widget_sky_*` |
| Prompt card, iOS | `CompanionSun(onOwnSky: true)` — same, over the matching sky image |
| Widget-picker still, Android | `widget_preview_card.xml` — mirrors the card, so it uses the white-bloom drawable too |
| Fresh-arrival sun, Android overlay | `SunDisc` in `InteractionWindow.FreshArrivalSun` with `onOwnSky` true while it waits — white disc, **white** glow, over the native loading sky. Night: `#eef2ff` disc, `#bed2ff` glow, like every other native disc |

The card paints the same sky the app does, so the sun on it is on our surface and
follows the in-app rule. Only the bloom's colour differs between each pair of
twins — same stops, same alpha, same disc — so keep them in step.

The fresh-arrival sun is the same test applied to a *native* disc. When an
intervention fires on Android the WebView needs a beat to boot, so the overlay
paints its own loading sky (`LoadingSky.kt`, mirroring the WebView's ambient sky)
and greets the user with a native Compose disc that glides to the measured web
sun and cross-fades into it. It is the first sun of every **fresh** intervention
(`!isCornerArrival`, Android only) — on our sky, handing off to a white-haloed
web sun — so it glows white. It wore the Little Sun's amber until #262, which
meant a fresh intervention opened on an orange halo that turned white at the
hand-off.

Two suns in that file answer differently, and neither is a fixed property of its
call site:

- The **corner hand-off** placeholder *is* the Little Sun that just left the
  blocked app. It waits on our loading sky too — for up to
  `CORNER_PLACEHOLDER_FALLBACK_MS` (1.5 s), not a blink — but the arriving web sun
  mounts at `warmth: 1` (`sunDepartSettleAt`) and warms back to white as it glides
  home, so both sides are amber at the swap. It keeps `SunDisc()`'s default.
- The **fresh-arrival** disc is also the escape hatch: tapping it retargets the
  same disc to the saved Little Sun rest, glides it there, and cross-fades into
  the real (amber) Little Sun. So `onOwnSky` is a *state* — true while it waits,
  false once it is morphing away — and `SunDisc` eases between the two colours
  over `glowMorphMs`, passed as the glide's own duration. The warming lands with
  the position.

The shared principle: on our sky the halo is white; the warming is always a
hand-off in progress, and it is always an ease, never a cut.

The moon needs no twin on either platform: it never warms on any surface.

Note `app_widget_info.xml`'s `previewImage` stays the amber drawable — the
pre-API-31 gallery renders it on the launcher's own surface, not on our sky.

## Where this is written down

- `extension/src/shared/components/interaction/sun/sunSettle.ts` — `THE HALO RULE`
  block comment, at the point the settles are defined
- `CLAUDE.md` — the short form, under Styling Guidelines
- `sunSettle.test.ts` — the guard tests (and `sunLight.test.ts` for the cast light)
- `sunHaloMirror.test.ts` — the same rule enforced across the language boundary
  (the widget's Android/iOS twins, and the overlay's native Compose suns)
- This file — the full state map

To see the states side by side, use the styleguide's sun morph harness
(`Styleguide.tsx`).
