# The sun's halo — where the sun looks like what

There is only ever one sun. This is the reference for what it looks like in each
place it appears, and the rule governing the one thing that used to vary without
a reason: its colour.

## The rule

**The sun's body may be warm; the light it casts is white.**

Amber is *not* a day/night signal and *not* a role badge. On every one of
minded's own surfaces the sun's halo is white. Amber belongs to the sun as it
lives **outside** the app — the Little Sun overlay (over arbitrary app content)
and the home-screen widgets (on the user's wallpaper) — where it has to announce
itself against a background we don't control.

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

The snug reach on the companion is *not* about colour: this low on the bar the
broad bloom's far plume gets clipped by the screen edge below, pulling the disc's
visible mass upward off the icon line (#106).

## Night (dark theme → moon)

Never warm, at any point. The disc is the NASA near-side lunar photo; the halo is
a white/cool box-shadow plus a static cool light-pool (`::after`). Rest 1.1,
hover 1.7; snug reach on the bar, broad everywhere else. In dark mode a wide cool
"horizon reflection" pools under the bottom bar (`RouteCmp.module.scss`, #125).
The departing moon dims to 1.0 + snug like the sun, but stays cool.

## Outside the app — where the amber lives

| Where | Look |
|---|---|
| Little Sun, web extension | white disc `#fff`, amber halo `0 0 6px 1px #ffd673` |
| Little Sun, Android overlay | amber gradient face (`#ffe487→#ffb24f→#f2823c`) + amber radial glow, 30dp. Night: `#eef2ff` disc, `#bed2ff` glow |
| Android home-screen widget | amber (`ic_sun_widget_day.xml`); moon at night |
| iOS home-screen widget | white disc with faint gold rim + amber bloom `255,214,115 @ .28`; moon at night |

These four sit on backgrounds we don't own — someone else's app, someone's
wallpaper. A white sun there is a white blob. That is the entire reason amber
exists, and why the departing hand-off has to arrive already wearing it.

## Where this is written down

- `extension/src/shared/components/interaction/sun/sunSettle.ts` — `THE HALO RULE`
  block comment, at the point the settles are defined
- `CLAUDE.md` — the short form, under Styling Guidelines
- `sunSettle.test.ts` — the guard tests
- This file — the full state map

To see the states side by side, use the styleguide's sun morph harness
(`Styleguide.tsx`).
