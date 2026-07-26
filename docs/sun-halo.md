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

Never warm, at any point. The disc is drawn (a shaded body under soft maria
fields - see `.moon-face` in Sun.scss); the halo is
a white/cool box-shadow plus a static cool light-pool (`::after`). Rest 1.1,
hover 1.7; snug reach on the bar, broad everywhere else. In dark mode a wide cool
"horizon reflection" pools under the bottom bar (`RouteCmp.module.scss`, #125).
The departing moon dims to 1.0 + snug like the sun, but stays cool.

## Outside the app

### On a background we don't control — amber

| Where | Look |
|---|---|
| Little Sun, Android native overlay (`LittleSun.kt`) | **white** disc (`SUN_COLOR = Color.White`) + amber radial glow `#ffd673`, 30dp. Night: `#eef2ff` disc, `#bed2ff` glow |
| Little Sun, in the WebView (`--little-sun-bg`) | amber gradient face `#ffe487→#ffb24f→#f2823c` + `--little-sun-shadow` amber halo, 40px |
| Little Sun, web extension | the same CSS one, but the face is pinned to `#fff` — it reads fine as a pale disc on a web page, where the Android overlay over arbitrary app content did not |
| Small widget, Android | `ic_sun_widget_day.xml` — white disc, faint gold rim, amber bloom `@ .28`; transparent on the wallpaper |
| Small widget, iOS | `CompanionSun` with `onOwnSky: false` — same disc, amber bloom `255,214,115 @ .28`; clear container background |

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
- `sunSettle.test.ts` — the guard tests
- `sunHaloMirror.test.ts` — the same rule enforced across the language boundary
  (the widget's Android/iOS twins, and the overlay's native Compose suns)
- This file — the full state map

To see the states side by side, use the styleguide's sun morph harness
(`Styleguide.tsx`).
