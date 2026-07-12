# Why iOS is a widget-only variant — and the one way it works

Status: **decision note — acted on.** Records why iOS is *not* a port of the
Android app, corrects a wrong reason that was previously documented, and
explains the one adaptation we now build: **option 1 below, the companion-sun
Home Screen widget.** The forced-intervention path stays out of scope. See
`extension/ios/App/MindedWidget/` for the implementation and `RELEASING.md` for
the Mac-less build + TestFlight pipeline.

## The wrong reason we used to give

The old note said iOS "cannot deliver real interventions due to platform
restrictions on inspecting/blocking other apps." That is **false** and worth
correcting, because a decision resting on a false premise rots the moment someone
notices it isn't true.

Since iOS 16, consumer App Store apps **can** block app launches via the Screen
Time API — `FamilyControls` (authorize + let the user pick apps),
`ManagedSettings` (apply a shield), `DeviceActivity` (schedule/trigger it). This
is exactly how **one sec, Opal, Jomo, ScreenZen, Clearspace** work, with
`.individual` authorization on the user's own device — no MDM, no parent/child
setup. It needs a privileged "Family Controls (Distribution)" entitlement
requested from Apple (multi-week approval, can be denied).

So iOS *can* intervene. That was never the real blocker.

## The real reason: the only effective primitive is the wrong shape

minded's interrupt is the draggable sun you can fling away in one gesture — the
pause **is** the always-available escape hatch, and it appears *in the moment*,
never blocking. iOS offers no way to reproduce that:

- **The shield is a wall, not a companion.** `ManagedSettings` shields are the
  parental-controls primitive: a gate you must act against. You can soften the
  copy and add a pass-through button, but the *posture* is restriction. minded
  would be the gentlest-spoken app in a category whose entire UX vocabulary is
  "you are not allowed."
- **The sun can't live in the shield.** Shields render only a color, blur, icon,
  title, subtitle, and buttons — **no animation, no interactive elements**. The
  draggable, fling-able sun — the soul of the product — cannot exist there. At
  best the shield's button redirects *into* the minded app, where the real sun
  pause runs. The pause becomes a tap away, not the moment itself.
- **DeviceActivity's native vocabulary is budgets.** Its model is schedules and
  thresholds ("block 9–5", "after 30 min") — the scarcity/limit thinking the
  reflective-companion concept explicitly *cut* ("you've used up your budget").
  Staying on-philosophy means deliberately refusing the framework's main feature.
- **No content awareness.** App tokens are opaque; there is no in-app
  doom-scroll detection and no foreground-app read. The rich present-moment read
  (`interactionContext.ts`) that drives `getInteractionMode.ts` is mostly
  impossible.

## The dilemma, in one table

| Mechanism | On-philosophy? | Effective interrupt? |
|---|---|---|
| Shield (block app open) | ❌ wall / restriction model | ✅ catches you in the moment |
| Notification nudge ("the sun is here if you'd like to pause") | ✅ invitation, dismissible, never blocks | ❌ a banner you swipe away while already in the feed |
| Self-initiated (open minded when you choose) | ✅ fully | ❌ relies on the willpower addiction erodes |

The mechanism that *works* betrays the premise; the mechanisms that *fit* the
premise don't work. Android escapes this only because the sun-companion **is**
the interrupt. iOS gives no equivalent.

## The tension worth naming: iOS is the better mindfulness audience

The iOS audience skews toward people who *choose* mindfulness tools — more
self-aware, more intentional, more willing to engage an invitation — which is a
better fit for minded's premise than the average Android user we currently
build the forced overlay for. So "iOS doesn't fit" is uncomfortable: the
*platform* resists our mechanism while the *audience* fits our philosophy.

## The one adaptation that would be true to the product

The resolution is a **reframe, not a port.** Stop trying to make iOS do
Android's job (force a pause at the moment of pull) and let iOS do the job it —
and its audience — are suited for: **ambient presence + invitation.**

Notice that the Android overlay is the *most* interventionist, least mindful
expression of minded — the one closest to forcing. iOS strips exactly that away
and pushes minded toward its gentlest self. For a self-selected mindfulness
audience, that may be the better product, not a degraded one.

Concretely, an iOS minded could be:

1. **The sun as an always-present companion** — a Home Screen / Lock Screen
   widget (and/or Live Activity) that simply *is there*, calm, no metrics.
   Tapping it opens the sun pause. This is the bottom-bar companion, moved to
   where iOS lets it live. Fully on-philosophy, needs no special entitlement.
2. **An optional, gentlest-possible open-triggered pause** — for users who opt
   in, a shield used in its softest form: triggered **only on app-open** (never
   time-budgets or schedules), **always pass-through**, copy as invitation, the
   button redirecting into the real sun pause. The trigger ("you opened this app
   now") is an *observed, present-moment fact* — the one thing that clears the
   90% bar. This is the one sec pattern bent as far toward gentleness as it goes.

Honest caveats:

- This will **not** stop hard doom-scrolling for someone who needs to be
  stopped. If iOS minded's job is "fight addiction," it is weaker than Android.
  If its job is "cultivate awareness for people already inclined," it fits.
- The widget/notification path is on-philosophy and entitlement-free; the shield
  path needs Apple's entitlement and still carries the wall posture, softened.
- Whether always-pass-through, budget-free triggering is fully expressible in
  `DeviceActivity` needs verification before any commitment.
- The current iOS code (Capacitor WebView + a Shortcuts automation intent) is
  none of this — Shortcuts doesn't block, it only nags. It is a dead end, not a
  foundation.

## Current decision

We build **option 1 only**: the companion sun as a Home Screen widget —
presence + invitation, no metrics, no shield, no budgets. It needs no special
entitlement and is fully on-philosophy: minded's gentlest self, and arguably its
*truest* self for the self-selected iOS mindfulness audience. We deliberately do
**not** ship the forced overlay or the Screen Time shield (option 2): its only
effective interrupt is the wrong shape, and we won't wear the
striving/parental-controls model in minded's paint.

Scope guardrails for anyone touching iOS:

- **In scope:** the WidgetKit companion sun (`extension/ios/App/MindedWidget/`),
  the `minded://sun` deep link, and the shared Capacitor WebView shell that the
  tap opens.
- **Out of scope:** `FamilyControls`/`ManagedSettings`/`DeviceActivity` shields,
  any forced overlay, time budgets/schedules, or content/foreground-app reads.
  Don't reintroduce these without revisiting this note.

Build & ship: iOS is built, signed, and pushed to TestFlight from a GitHub
macOS runner with **no local Mac** (`.github/workflows/ios-testflight.yml`).
The `MindedWidget` extension target is not stored in `App.xcodeproj`; the
workflow wires it in on the fly (`extension/ios/App/scripts/add_widget_target.rb`,
run before `pod install`), so every archive embeds the companion sun. See
`extension/ios/App/MindedWidget/README.md` and `RELEASING.md`.
