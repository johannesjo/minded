# Concept: value-first onboarding - meet the pause before the permissions

Status: **implemented** (both platforms' web flows browser-verified end to
end; the Android pin bridge and the iOS WidgetCenter plugin method follow the
existing native patterns but await a device/Xcode build. The `MindedWidget`
target is wired into `App.xcodeproj` by CI at build time -
`extension/ios/App/scripts/add_widget_target.rb`, see `RELEASING.md` - so
TestFlight builds carry the widget the iOS step points at). Two details
settled at implementation, noted inline below: the demo *returns to the
welcome* instead of auto-advancing, and the widget-step preview is the
resting onboarding disc itself - no asset needed. Companion docs:
`docs/sun-companion-widget.md` (the widget this leans on),
`docs/widget-prompts-concept.md` (why the widget is itself a mini-intervention),
`docs/ios-platform-fit.md` (why iOS is widget-only),
`docs/reflective-companion-concept.md` (the 90% bar all copy must clear).

## The problem today

**Android** (`OnboardingAndroid.tsx`): the flow is *meet the sun → pick apps →
required permissions → optional permissions → ready*. Two things are wrong with
its economics:

1. **The permissions come before any experienced value.** By step 2 the user is
   asked for the accessibility service and the draw-over-apps permission - the
   two highest-trust asks Android has, the ones Play-Store users are actively
   trained to distrust - on the strength of two sentences of promise ("it
   appears as a calm moment to pause"). The pause itself, the thing the
   permissions buy, has never been felt. The user is paying a toll before the
   tour.
2. **The zero-permission way in is invisible.** The home-screen widget is now a
   real second way for the sun to meet you - a 15-minute-stepped
   mini-intervention at the exact glance where a doom-scroll begins
   (`docs/widget-prompts-concept.md`) - and it costs *no permissions at all*.
   Onboarding never mentions it; it is discoverable only by accident in the
   launcher's widget gallery. A user scared off by the accessibility ask leaves
   with nothing, when the widget was sitting right there as the gentle,
   costless yes.

**iOS** (`MainIOS.tsx`): there is no first-run at all - first start drops the
user onto the dashboard. But on iOS the widget *is* the product surface
(`docs/ios-platform-fit.md`): there are no interventions, deliberately, and the
one surface that can meet the doom-scroll moment is the Home Screen widget. A
user who never adds it owns an app they must remember to open - the
self-initiated mechanism the platform-fit doc itself scores as "relies on the
willpower addiction erodes." Today nothing ever tells them the widget exists.

## The principle

**Show the pause first; then present the ways it can meet you; then ask for
exactly what the chosen way costs.** Permissions stop being a toll before the
tour and become the visible price of a thing the user already wants - informed
consent, not softening-up. Concretely, both platforms get the same three-beat
shape, realised very differently:

1. **Feel it** - experience the actual pause, live, on the real code path.
2. **Choose it** - the ways the sun can meet you, each with its honest cost.
3. **Pay only for what you chose** - permissions (Android overlay path) or a
   widget add (both platforms); skipping stays first-class throughout.

Neither the widget nor the overlay is a *mode* in any stored sense. What the
user picks merely routes which setup chores run; no `syncData` flag, no
settings toggle, no persistent "intervention mode" to configure later
(minimalism: nothing new to own). Both remain available forever through the
existing surfaces - the launcher gallery, the dashboard's setup invitation.

## Android

### The flow

```
0 meet the sun     (exists - now also the demo: tapping the disc opens the
                    real pause; tap, fling, and "begin" all advance)
1 where should it meet you    (the EXISTING picker, one new place at the top:
                    "your home screen" - inline widget pin, no permissions)
2 required perms   (only if apps were picked)
3 optional perms   (only if apps were picked)
4 ready / almost-there    (copy reflects the places chosen; the denied path
                    now offers the widget as the costless alternative)
```

Same number of beats as today's flow - the demo and the widget both arrive
without a single added screen. (An earlier cut of this concept added a "feel
the pause" step and a standalone two-card choice step; both dissolved once it
was noticed the picker already asks the choice step's question verbatim and
the welcome already holds the demo's sun. Fewer screens survived contact with
minimalism.) Three moves make it work:

**1. The welcome is the demo.** The welcome sun the user is already holding
becomes tappable (previously `isTapEnabled={false}`), and the copy invites
exactly that: *"Tap it."* The tap opens the real `InteractionOverlay` - the
same overlay the dashboard companion and the widget tap open, one code path,
no demo build, no mockup - and the overlay's own exit returns the user *to
the welcome* (settled at implementation: advancing behind the user's back
after a pause they merely peeked into would surprise, and it would also force
the closing disc through a bottom-bar detour; returning home keeps the
open/close glides perfect mirrors). Fling and "begin" advance to the picker.
The welcome thereby teaches the product's only two verbs *by doing
them* - tap is the pause, fling is the dismissal - instead of describing them.
A skipped demo is recoverable forever (the companion tap on the dashboard is
the same pause); a forced one would be off-voice, so it is never auto-opened.

Two honesty notes, named so they don't get papered over:

- **The ONE-sun rule binds here.** The onboarding flow owns a single disc that
  morphs between rests (`getOnboardingSunSettle`); the overlay must take that
  disc over and hand it back, exactly as the dashboard companion does - never a
  second sun, never a cut. `getOnboardingSunSettle` grows an "in pause" state;
  the overlay's settle takeover already knows this dance from `RouteCmp`.
- **What can't be demoed stays copy.** The *native* interruption - the sun
  stepping into Instagram over someone's feed - cannot be shown without the very
  permissions we haven't asked for yet. The demo shows the pause itself
  (which is what the permissions ultimately deliver); the copy carries the
  context: *"When you drift into an app on autopilot, this pause comes to you -
  right there, over the app."*

**2. The widget is a *place* in the picker, not a fork before it.** The
picker's onboarding heading already asks the exact choice-step question -
*"Where should the sun meet you?"* (`SettingsAndroid.tsx`) - so introducing
the two ways as a separate screen would ask it twice. Instead the picker gains
one row above the app list: **"Your home screen"**, a peer of Instagram and
TikTok under the one mental model the heading already established: *places
the sun can meet you.* Details that keep it honest:

- **Not a checkbox - an action.** A checkbox can't place a widget, and
  pretending it can would lie; the row carries an add-action that fires the
  system pin dialog (`requestPinAppWidget`) right there. Its checked state is
  the *observed* `isWidgetPlaced()`, never an intent flag - placed is placed,
  dismissed-the-dialog is not.
- **Continue is gated on places, not apps.** Today's save button requires
  ≥1 app (`disabled={!getSelectedApps()?.length}`); it relaxes to ≥1 *place*
  - apps or the placed widget. Neither place is preselected, neither wears a
  "recommended" badge.
- **The permission fork falls out of the data.** Steps 2–3 run only if apps
  were picked - no branch UI, no mode flag; the picker's own selection is the
  routing. Widget-only users go straight to ready without ever seeing the
  accessibility ask. That is the headline win: **the cautious user now has a
  costless yes**, and the highest-trust permission ask on Android is only ever
  shown to someone who has felt the pause and explicitly asked for the sun in
  their apps.
- **Named risk, accepted:** apps and a launcher widget are different kinds of
  thing (detected-and-intervened vs. placed object), so the row is a mixed
  abstraction. It's accepted because the user-facing frame - a place the sun
  meets you - is true of both, and one screen asking one question beats two
  screens asking the same one. The same row can serve the settings picker,
  self-retiring once the widget is placed.

**3. The denied path becomes the widget's strongest moment.** "Almost there"
(permission denied / "maybe later") gains the widget offer, gated on
`!isWidgetPlaced()`: *"This one needs no permissions at all - the sun can wait
on your home screen instead."* The flow's only dead end becomes a soft yes,
and it catches exactly the user this concept exists for - the one who felt the
pause but won't grant accessibility. They currently leave with nothing; they
should leave with the sun. The ready step's copy meanwhile reflects the places
actually chosen (a widget-only "ready" doesn't promise the sun in apps it was
never given).

**Steps 2–3 (permissions), re-anchored.** Structure unchanged; the copy in
`MissingCapabilities.tsx` gets to point backwards at an experience instead of
forwards at a promise - each permission maps to a visible half of what was
just felt: accessibility = *"notice which app you've opened"*, overlay =
*"bring that pause to you there."* "Maybe later" and the privacy note stay
exactly as they are.

**Re-entry.** The dashboard's "finish setup" invitation keeps re-entering at
step 1 - which now *is* the choice step, so the invitation's promise ("tell it
where to appear") becomes fully true, widget included, with `isWidgetPlaced()`
keeping the row honest on every visit.

### Native additions (small, both in existing files)

- `MainActivityJavaScriptInterface.requestPinWidget()` →
  `AppWidgetManager.isRequestPinAppWidgetSupported` /
  `requestPinAppWidget(ComponentName(MyAppWidgetReceiver))` - API 26+, i.e.
  effectively everyone; where unsupported (some launchers), the card falls back
  to a one-line instruction ("long-press your home screen → Widgets → minded").
- `MainActivityJavaScriptInterface.isWidgetPlaced()` →
  `getAppWidgetIds(ComponentName).isNotEmpty()` - lets the choice card confirm
  truthfully and retire itself, and keeps every later invitation honest (never
  suggest adding a widget that's already there).

## iOS

### The flow (new - first run, gated on the existing `isOnboardingComplete`)

`SyncData.cfg.isOnboardingComplete` already exists and iOS simply never uses
it; `MainIOS.tsx` gates on it the same way `MainAndroid.tsx` does. The flow is
two steps - the platform has no permissions to ask and no apps to pick, so the
Android flow's whole middle disappears (minimalism: the iOS product is smaller,
its onboarding must be too):

```
0 meet the sun     (the welcome - same shape as Android's step 0, iOS copy)
1 give it a home   (the widget - instructions + preview; "later" is first-class)
```

**Step 0 - meet the sun.** The same held, flingable disc; the copy tells the
iOS truth instead of the Android one: the sun doesn't step into other apps
here - it lives on your Home Screen, present at the glance where scrolling
begins, and it opens this pause when you reach for it. (Internally the widget
*takes the intervention's role* - the 15-minute prompt line is a
mini-intervention per `docs/widget-prompts-concept.md` - but user-facing copy
never says "intervention"; it is presence and invitation.) Tapping the sun can
open the real pause here too, same as Android's step 1 - on iOS this *is* the
full honest demo, because the in-app pause is exactly what the widget tap
delivers; nothing is left un-demoable.

**Step 1 - give it a home.** iOS has no programmatic pin, so this step is a
minimal instruction - *long-press your Home Screen → Edit → Add Widget →
minded*. The preview (settled at implementation) is the resting onboarding
disc itself, holding its hero rest above the instructions: the widget IS this
sun relocated, so showing the live disc is more honest than any still - and
no asset is needed. One primary "done" continue, one first-class "I'll add it
later." No verification dance on the spot; the check below handles the truth
quietly.

### The nudge afterwards - one invitation, truthful, self-retiring

- New plugin method `MindedIOSPlugin.isWidgetInstalled()` →
  `WidgetCenter.shared.getCurrentConfigurations` (iOS 14+; the deployment
  target is already past it). This is the load-bearing piece: the app can
  *know* whether the widget exists, so the nudge is gated on an observed fact,
  never a guess.
- While the widget is not installed, the dashboard shows the exact iOS twin of
  Android's `setupInvitationMsg` (`MainAndroid.tsx` passes it as `RoutesCmp`
  children; `MainIOS.tsx` does the same): one quiet dismissible line - *"The
  sun rests here whenever you open minded. To have it wait on your Home Screen
  too, give it a widget."* - tapping it reopens step 1. Same behaviour as
  Android's invite: dismiss lasts the session, a fresh return may re-offer it.
- The moment the widget is detected, the invitation is simply *gone*. No
  confirmation, no "nice!", no first-widget celebration - the widget's own
  presence on the home screen is the entire acknowledgment.

**Why nudging is on-philosophy here and would not be on Android:** on iOS the
widget is the only surface that can meet the doom-scroll moment; without it the
product is functionally empty, so one truthful, dismissible, self-retiring
invitation clears the 90% bar the same way the Android setup invitation does.
It states an observed fact (no widget is installed), invites rather than
warns, and retires itself on the observed remedy. Anything beyond this - a
badge, a notification, a recurring "have you added it yet?" - fails the bar
and stays out.

## What this deliberately is not (the bar, applied)

- **Not persuasion sequencing.** The demo-before-ask exists for informed
  consent - the user should know what the permission buys before deciding -
  not to warm them up. The test: every skip stays first-class and unpunished
  ("I'll set this up later" on the welcome, "maybe later" on permissions, the
  choice step's skip, iOS's "I'll add it later"), and denied permissions keep
  routing to the existing gentle "Almost there," never a guilt screen.
- **No new persistent state beyond what's listed.** No "intervention mode"
  enum, no widget-nudge counters, no onboarding-variant flags. The only
  additions are the two native queries (widget placed / installed), which read
  the world rather than store anything about the user.
- **No metrics, no celebration.** Placing the widget or granting a permission
  gets the existing quiet glide-out, nothing more. Success screens that
  congratulate are striving in disguise.
- **No notifications, ever** - including for the iOS widget nudge. The product
  has none, deliberately; the widget never reaches for you, and neither does
  the invitation to add it.
- **The browser extension is untouched.** `OnboardingWeb` has no permission
  cliff (the extension install *was* the permission) and no widget; nothing
  here applies.

## Implementation notes (file-level, as landed)

**Shared**

- `InteractionOverlay.tsx` gained an optional `onClosingStarted` - the
  embedding onboarding flow reclaims its disc the instant the closing fade
  begins, so the sun glides home *during* the sky fade (one motion, no
  companion detour).
- `interactionOverlay/pauseTakeover.ts` - the pure takeover truth table
  (`shouldPauseDriveSun`, unit-tested): who drives the ONE disc while the demo
  is up - the live interaction (via the shared sunStore, exactly like the
  dashboard shell sun) or the flow's own rests. Both platforms' onboardings
  use it; the sunStore's companion anchor is re-seeded from each flow's own
  probe so mid-demo companion rests (grounding) land on the real bar anchor.
- `Stepper.tsx` - the dot array is now reactive to `nrOfSteps` (the
  widget-only run shortens the flow mid-way).

**Android**

- `OnboardingAndroid.tsx` - the tappable welcome disc (tap = the pause, fling
  = advance), the store-driven demo takeover, `handlePlacesSaved` routing
  (apps → permission steps; none → straight to "ready"), the widget-only
  ready copy, the "Almost there" widget offer, and the 5→3-dot stepper.
- `SettingsAndroid.tsx` - the "Your home screen" place row (pin action;
  checked state is the observed placement; self-retires when already placed
  at mount) and the continue gate relaxed from ≥1 app to ≥1 *place*.
- `android/util/widgetPlacement.ts` - the shared observed-placement signal:
  `readIsWidgetPlaced` + `createWidgetPlacement` (resume re-read + a brief
  poll after a pin request, since the system pin sheet may not background the
  activity).
- `MissingCapabilities.tsx` - copy re-anchored ("one to notice the moment,
  one to appear in it"); structure unchanged.
- `MainAndroid.tsx` - the setup invitation is additionally gated on
  `!isWidgetPlaced`, so a widget-only user is never nagged toward apps.
- `MainActivityJavaScriptInterface.kt` - `requestPinWidget()`,
  `isWidgetPlaced()` (AppWidgetManager; minSdk 29 > the API-26 pin floor).

**iOS**

- `MainIOS.tsx` - gates on the existing `isOnboardingComplete`; the widget
  invitation rides as `RoutesCmp` children (Android's invitation pattern),
  gated on the observed `isWidgetInstalled` (default *true*: unknown must
  never nag - which also covers older native shells without the method).
- `ios/components/onboardingIOS/OnboardingIOS.tsx` - the two steps; reuses
  `Sun`, `Stepper`, `Btn`, `ButtonWrapper`, the shared `pauseTakeover`, and
  the same probe/settle choreography (hero + companion only - no sky band).
- `definitions.ts` + `MindedIOSPlugin.swift`/`.m` - `isWidgetInstalled()` via
  `WidgetCenter.getCurrentConfigurations` (resolves installed=true on any
  read failure, again so unknown never nags).
- The `MindedWidget` target is wired into `App.xcodeproj` by CI at build time
  (`add_widget_target.rb`, before `pod install` - see `RELEASING.md`), so
  step 1 points at a widget that is in every TestFlight build.

## Open questions

- **The demo's discoverability.** "Tap it." as copy is the current lean; if a
  held, invited tap still gets missed in practice, the fallback is making the
  invitation more visible - never auto-opening (a missed demo is recoverable,
  a forced one is off-voice).
- **The home-screen row's second life.** It naturally fits the settings picker
  too (same component, self-retiring once placed) - worth shipping there in
  the same change, or onboarding-only first?
- **Pin-dialog edge cases.** `requestPinAppWidget` unsupported (some
  launchers) falls back to a one-line instruction on the row; a *dismissed*
  pin dialog just leaves the row unchecked - confirm no extra affordance is
  needed.
- **Whether the ready step should offer the place *not* chosen** - current
  lean: no (remove before you add); the denied path's widget offer and the
  dashboard invitation already cover recovery.
- **Copy sign-off.** All new lines (cards, permission re-anchors, the iOS
  invitation) deserve the same voice review the return-loop copy got.
- **On-device verification.** The web flows are browser-verified end to end
  (mocked native bridge), but the pin dialog on real launchers, the
  post-pin poll timing, and the WidgetCenter read all need one round on
  hardware - as does the demo's sun morph under real WebView timing.
