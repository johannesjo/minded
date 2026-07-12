# UX analysis & beautification proposals

Status: **review document** — a full-app UX audit with prioritized improvement
suggestions. Produced from a complete read of all four platform surfaces
(extension, Android, iOS, shared web bundle) plus live screenshots of the
dashboard simulation and styleguide (`npm run styleguide`). Nothing here is
implemented; each item is a proposal to accept, reject, or reshape.

Every suggestion was filtered against the product fundamentals: mindfulness
first, never forced, no striving, minimalism (remove before you add). A final
section lists ideas that were considered and deliberately **not** proposed
because they fail that filter.

---

## 1. What already works — keep it

Worth naming, because most of it should be defended against future "helpful"
additions:

- **The sun as the single, continuous mechanic** is genuinely distinctive. The
  morph discipline (one sun, never two, never a hard cut) is implemented with
  real care (`InteractionCommon.tsx` settle system, `sunStore.ts` handoffs).
- **The living sky** — hour-interpolated pastel keyframes by day
  (`skyTimeline.ts`), a hand-placed starfield and moon at night — is the most
  beautiful thing in the app. The night dashboard is stunning.
- **The token system is mature**: a documented 8px spacing rhythm, radius and
  type scales, a single easing curve (`--ease-out`), alpha-ladder button
  system, grain overlay to kill gradient banding, comprehensive
  `prefers-reduced-motion` (15 files) and uniform teal `:focus-visible` rings
  (11 files), hover gated behind `@media (hover: hover)`.
- **Value-first onboarding** matches its concept doc closely: demo before
  permissions, widget-as-a-place, permission copy re-anchored to the sun
  ("one to notice the moment, one to appear in it"), skips stay first-class.
- **The routing is attuned, not random** — friction levels and context gates
  before any dice roll; rate-limited insights; the one shipped pattern insight
  ("you've come back a few times…") passes the 90% bar structurally.
- **Calm details**: the dashboard hero never changes under the user's eyes
  (re-greets only while hidden); wind-down's "Goodnight" is never a tally;
  urge-surfing's "same/higher" reflections avoid failure framing; the
  website-list has inline validation *and* undo.

---

## 2. P0 — the core loop

These three are the highest-leverage problems in the app. They all concern the
intervention moment itself, which is the product.

### 2.1 The escape hatch is invisible exactly when it matters most

On a real intervention, most modes have **no visible control at all** until
*after* the user answers:

- `ACTION_ADVICE` and `SHOW_REASON` render static text with
  `pointer-events: none` — a first-time user sees "How about a deep breath?"
  and literally nothing to tap.
- The sun-gesture instructions ("Tap the sun 3 times to continue…") only
  appear after `onInteractionSuccess`
  (`InteractionCommon.tsx` — `setShowSunInstructions` fires ~1s after an
  answer). Before answering, the triple-tap / drag / fling vocabulary is
  secret knowledge.
- `URGE_SURFING`'s 18–38s wave and `BELL`'s listening phase are deliberately
  empty screens whose only exit is that secret gesture. The source comments
  acknowledge they lean on the sun as "the universal way out" — but the user
  was never told.

The onboarding demo does teach the tap once, but only if the user actually
taps the welcome disc (the demo is never auto-opened, by design), and it
teaches *one* tap, not the intervention's triple-tap.

**Recommendation (minimal, philosophy-aligned):** don't add buttons — teach
the gesture once, in the moment. For the user's first N (~3) real
interventions, fade the existing sun-instructions overlay in after a short
idle (~4–6s) *before* any answer, instead of only after. After that, revert
to current post-answer behavior. This reuses the existing overlay and copy,
adds no chrome, and the hint is rare, soft, and disappears forever once the
gesture is learned. Store a small `sunHintShownCount` alongside the existing
sync data.

**Also:** on real interventions, fling and drag-down produce the same "leave"
outcome but only drag-down is ever mentioned (acknowledged in
`InteractionCommon.tsx` near the instructions copy). Either mention both or
keep silence for fling — but a user who flings should not get an unexplained
exit the very first time. One extra word in the existing line ("Drag or fling
the sun down/away to let go") resolves it.

### 2.2 The sun is completely inaccessible

`Sun.tsx` renders the primary — often the *only* — control as a bare
`<div class="minded-sun">` with touch/mouse handlers only: no `role`, no
`tabindex`, no keyboard handler, no ARIA. Consequences:

- Keyboard users have no path to continue, leave, ground, or let go.
  `Escape` closes only on web (`InteractionWeb.tsx`), is unannounced, and has
  no counterpart on Android/dashboard.
- Screen-reader users get silence during interventions; the breathing sun,
  cues, finger-rest pad and orbit crown are all `aria-hidden` with no text
  alternative.

For an app whose audience includes people at their most depleted, this is
both an ethics and (for the extension, injected into arbitrary pages) a
practical problem.

**Recommendation:** give the sun `role="button"`, `tabindex="0"`, an
`aria-label` that states the available gestures for the current phase, and
keyboard equivalents: `Enter`/`Space` = tap, `ArrowDown` (hold or repeat) =
drag down, `ArrowUp` = fling/let-go, `Escape` = leave everywhere, not just
web. Announce the sun-instructions overlay via `aria-live="polite"` (the
website-list save status already uses this pattern — reuse it). This is
invisible to sighted mouse/touch users and betrays nothing of the aesthetic.

### 2.3 First-run dashboard says nothing at all

With `seed=none` the dashboard is a lone quote card, a "show all"-less void,
and an unlabeled glowing disc. The only textual hint that the sun is tappable
is its screen-reader label ("Get asked a question"). A user who skipped or
rushed onboarding lands here with no idea what the product does.

**Recommendation:** a one-time-only gentle line under the hero slot on a
fresh profile — e.g. *"the sun below is always here for a pause — tap it"* —
that disappears permanently after the first companion-sun tap (or first
intervention). One sentence, once, then gone; consistent with the
"rare and dismissible" bar. This also softens the cold start where the hero
pool is empty and a random quote is doing all the work.

---

## 3. P1 — trust, consistency, and broken affordances

Individually small; together they are the difference between "calm" and
"unfinished." A single wrong affordance makes the whole app feel like it
doesn't know the user — same logic as the 90% copy bar.

### 3.1 Real defects

1. ~~**The edit-confirm button is a no-op.**~~ **Rejected — deliberate.**
   The check button's empty `onClick` is intentional: tapping it blurs the
   input, and the input's `onblur` is the single commit path — a second
   commit from the click would race it. The button is the visible "done"
   affordance for that blur. Now documented in code (`AnswerEntry.tsx`).
2. **Bad category id renders anyway.**
   `QuestionCategoryView.tsx:31-33` logs `illegal route param` but continues
   into `QUESTION_CATEGORIES[undefined]`. Redirect to `/` instead.
3. **Deleting an answer is instant and irreversible** while removing a
   website offers Undo (`WebsiteList.tsx:283-289`). Unify on the undo
   pattern (no confirm dialogs — undo is the calmer shape):
   `QuestionCategoryView.tsx:54-59` / `AnswerEntry.tsx:85-91`.
4. **Grounding's 15s auto-dismiss has no engage-cancel.** Let-go cancels its
   auto-dismiss the moment the user engages (`LetGoOverlay.tsx` `onEngage`);
   the grounding offer can vanish mid-decision. Cancel the timer on any
   pointer-down/focus inside the offer.
5. **Daily-questions afternoon dead zone.**
   `getDailyQuestionsMode.ts` — the banner shows 05:00–11:59 and from 20:00,
   so 12:00–19:59 has no path into daily questions at all. Either widen the
   evening window (e.g. 18:00) or accept and document the gap; right now it
   reads as an accident. (The banner logic was *just* touched in `ebf3586`,
   so this is a live area.)
6. **`SHOW_ALTERNATIVE` is a dead end on Android/iOS.**
   `ShowAlternative.tsx` — "Try {alternative} instead?" is a link on web but
   inert `<strong>` text in the apps, with nothing to act on. Either make it
   actionable where possible or drop the mode from app routing.

### 3.2 Dead machinery to remove (minimalism applies to code too)

- The entire auto-dismiss countdown (`isInitFadeout`, `initFadeOut`, every
  `onCancelCountdown` handler, and the Bell/FingerRest/UrgeSurfing keep-alive
  intervals defending against it) — switched off at **all five** call sites.
  Note: if 2.1's "show instructions after idle" is adopted, part of this
  machinery could be repurposed instead of deleted.
- The `armWindow = 0` arming system (`interactionAnimation.const.ts:28`) and
  its `isArmed` / `is-arming` visual states in `IntentSelection` /
  `TimeSelection` — dead since the window is zero.
- `getIsSunInFlow()` hard-coded to `true`.

### 3.3 Philosophy contradictions to reconcile

- **Android health notification vs "no notifications, ever".**
  `MyAccessibilityService.kt:478-510` posts a DEFAULT-importance "minded
  needs a hand" alert. It exists for a good reason (a silently-dead service
  is worse), but it contradicts the stated principle. Recommendation: keep a
  recovery surface but demote it — low importance, silent, plus the existing
  dashboard missing-capability banner as the primary channel. If it stays as
  is, write the exception down in CLAUDE.md so it's a decision, not a drift.
- **Web onboarding is the only hard-gated flow** — "Add at least one website
  to continue" with no skip (`WebsiteList.tsx:168`), while Android offers
  "I'll set this up later" and iOS "I'll add it later". Add the same soft
  skip to web (land on the dashboard; the newtab info box already explains
  how to get value later).
- **iOS onboarding step 0 has no skip** (`OnboardingIOS.tsx:225-229`);
  Android and web both offer one on the welcome. Add it for parity.

### 3.4 Smaller consistency items

- **Web settings render duplicate headings** — Options wraps each section in
  its own `h3`+intro while the shared components render their own headings
  too ("Sound" → "Completion Sound", "Grace Period" twice, "Active Hours"
  twice). Pass a `hideHeading` prop or drop the wrapper headings.
- **Android settings has a redundant in-page "Back" button**
  (`SettingsAndroidRoute.tsx:33-37`) duplicating the bottom-bar arrow.
- **Blocked-apps picker has no filter** (`SettingsAndroid.tsx`) — on a phone
  with 150 apps this is a long unordered scroll. A single quiet text filter
  input is worth its place.
- **Energy rating has no anchors** — urge-surfing's 1–5 scale shows
  "barely"/"intense", the energy dots show nothing. Two tiny end labels
  ("low"/"high") make the scale legible without adding striving.
- **No step-back affordances**: EmotionLabeling step 2 → 1, and
  TimeSelection → IntentSelection (cancel currently drops all the way out).
  Low priority, but both are one-line escapes from re-doing a flow.
- **Feedback is a raw `mailto:`** — acceptable for now, but at minimum catch
  the no-mail-client case (nothing happens today) with a copyable address.

---

## 4. P2 — flow-level refinements

### Dashboard
- "show all" is the only gateway to the whole reflective archive and it's a
  quiet text link. That quietness is on-philosophy; consider only a slightly
  larger hit area and a chevron that hints downward motion (it currently
  opens a route, not an expansion — the icon over-promises an accordion).
- `TxtQuestion` cards are tappable, quote/energy/emotion cards are not, with
  no visual differentiation. Give interactive cards the existing hover/press
  treatment (`--dashboard-card-bg-hover` exists already) and *no* affordance
  on static ones — differentiation by behavior, not new chrome.
- `DashboardAnswerList` hides the original question in a `title` tooltip —
  invisible on touch. The category view already shows questions; consider
  simply dropping the tooltip (remove, don't add).

### Interventions
- The dashboard sun deliberately routes to a narrower mode set than a real
  intervention (`isMainView` gate). Fine — but grounding/let-go are the *only*
  gesture rituals there, and their direction mapping ("fling away = let go",
  "drag down = stay") has no directional cue beyond words. The existing
  drag-target skies already respond to direction; consider letting the first
  few pixels of drag reveal a faint word ("stay" below, "let go" above) —
  reusing the sky-reveal machinery, not adding UI.
- `SCREEN_OFF`'s "Almost — {n}s more away." reads awkwardly; suggest
  "Almost — {n} seconds to go."
- Post-sun cancel semantics: "cancel" in TimeSelection returns to the
  interactive sun (restart), which surprises after choosing an intent.

### Sleep wind-down
- The goodnight screen's only exit is the moon-drag; snooze confirm is a
  triple-tap. Both gestures are undiscoverable and motor-demanding with no
  fallback. Keep the ritual, add a quiet timed fallback (e.g. after ~10s a
  soft "sleep well" text button fades in), mirroring the P0 hint pattern.
- Preview mode (`?preview=1`) shows "Skip tonight"/"Snooze" that silently do
  nothing. Hide them in preview or show a subtle "preview" tag.

---

## 5. Beautification — visual design proposals

The visual language is already strong. These proposals are about *tightening*
it, not changing direction.

### 5.1 Tokenize elevation (the biggest gap)

There is **no shadow token** — every `box-shadow`/`text-shadow` is bespoke
(`Toggle.module.scss:53`, `LittleSun.scss:168`, `InteractionCommon.scss:151`,
plus the hand-tuned sun/moon blooms). Add a tiny set and migrate:

```scss
--shadow-soft: 0 1px 3px rgba(0, 0, 0, 0.12);      // controls (toggle knob)
--shadow-lift: 0 8px 24px rgba(0, 0, 0, 0.12);     // floating surfaces
--glow-bloom: 0 0 30px 10px rgba(255, 255, 255, 0.55); // hover bloom, tamed
```

While at it: `--btn-box-shadow: 0 0 30px 10px rgba(255,255,255,0.9)` is the
single loudest visual in the light theme — a near-opaque white flare on every
button hover that fights the calm register. Halving its alpha (as above)
keeps the warmth and loses the flashbulb.

### 5.2 Enforce the existing grids

The 8px ban is documented in `_variables.scss` but violated in shipped
components. One mechanical pass:

- `card.scss:17` `padding: 18px 14px` → `16px` (or `16px 16px`)
- `DashboardGroups.module.scss:97` `8px 6px`, `:174` `margin: 0 6px`,
  `:197` `gap: 36px` → snap to `--space-*`
- `mixins/btn.scss:155,217` `padding: 0 14px / 0 18px` → `--space-md`;
  `:5` hardcoded `border-radius: 8px` → `var(--radius-sm)`; small-toggle
  `34px/12px` and toggle-selected `16px` → nearest scale values
- `FingerRest.scss:39` `border-radius: 40px` → `--radius-xl`
- One-off font sizes: `SessionGraceSettings.module.scss:15,27` `14px` →
  `--fz-s`; `DailyQuestions.module.scss:36` `1.5rem` → `--fz-l`;
  `SleepWindDownRoute.module.scss:133` `1.05em` → drop or tokenize

### 5.3 Complete the motion ladder

The 3-tier ladder (`--dur-instant/quick/soft`) doesn't cover the app's many
600–1000ms "gentle settle" beats, so they live as literals (700ms screen
fade, 800ms overlay close, 900ms cue crossfade, 1000ms sky handoff, 2500ms
sky settle). Add two tokens and migrate:

```scss
--dur-gentle: 700ms;   // screen/content crossfades
--dur-settle: 2500ms;  // sky handoffs, wordless closing beats
```

Also: `util/animation.ts:11,18` uses inline `ease-in` — the only easing in
the app that isn't `--ease-out`. Fades that *decelerate* out feel softer;
switching to the token curve makes exits match entrances.

### 5.4 Fix the drifted fallbacks and orphan palettes

- `BackgroundTransition.scss:14,25,39` hardcodes fallback gradients
  (`#ccf1f6/#ffebf6/#f4f3b5`, `#3e88dd/#66c5e4`) from an older palette; any
  var-resolution failure shows an off-brand sky. Sync them to current token
  values.
- `GroundingOverlay.module.scss:58-59` hardcodes `#060709` — the only
  surface that snaps to near-black in light mode. Tokenize (e.g.
  `--c-screen-rest`) and consider easing to it through the existing sunset
  ramp rather than a straight fade to black.
- `SleepWindDownRoute.module.scss:157-165` carries a bespoke night palette
  (`#101b3f`, `#1a2455`, `#25305d`…) parallel to the dark-theme gradient
  tokens. Fold into the token system so night stays one color story.
- Sky gradient stop positions are duplicated between `_variables.scss` and
  `skyTimeline.ts` with sync-by-comment. Generate one from the other (build
  step or shared const) to remove the drift risk.

### 5.5 Contrast & legibility watch-items

- `.dashboardHeading` — Inter **weight 200** at 13–14px in `--h4-c` over
  pastel. At this size/weight it flirts with unreadability on the yellow
  band (see `day-showall` simulation). Weight 300 keeps the whisper and
  clears the bar; the codebase itself notes hairline brittleness at
  `allTypo.scss:27`.
- Intervention text over the variable sky relies on
  `text-shadow: 0 1px 3px rgba(0,0,0,0.1)` — effectively nothing. On the
  brightest midday band, serif question text drops below AA. Options that
  don't add chrome: slightly stronger text shadow, or a very soft radial
  scrim (a few % black) behind the text block, baked into
  `.interaction-heading`.
- Day-mode dashboard cards (`rgba(255,255,255,0.43)`, no border/shadow) have
  very low separation on the yellow band. A 1px inner hairline
  (`inset 0 0 0 1px rgba(255,255,255,0.35)`) keeps the frosted look and adds
  just enough edge. (Night mode is fine — the 0.07 white cards read well.)
- Tap-indicator dots (`0.18` white) and orbit crown (`0.22`) are near
  subliminal by design — fine, but since the triple-tap *count* is feedback
  the user needs, consider nudging filled-dot contrast only.

### 5.6 Typography

- The serif-lowercase button voice is a strong, distinctive bet — keep it.
  But audit Newsreader at the **small** sizes: small toggles render serif at
  ~14–15px where the optical-size axis gets spindly on Android subpixel.
  Suggestion: keep serif for `btnTxt`, use Inter for `small` toggle/icon
  variants (they're functional chrome, not voice).
- `.h2` lowercases everything via `text-transform` while `h3` is Title Case
  and card headings are lowercase — codify the intent (see §6).

### 5.7 Styleguide gaps

The styleguide documents colors, type, sky, buttons, icons, and live
interactions — but not **spacing, radius, shadows, or the motion ladder**.
Those are exactly the tokens found drifting (§5.2). Add one compact
"rhythm" section rendering the scales; ungoverned tokens are the ones that
rot.

### 5.8 One deliberate beautification idea (optional)

The first-run hero (a quote inside a frosted card) is the least beautiful
moment of an otherwise gorgeous surface — a gray box floating in a void.
Render the *quote* greeting without card chrome: serif text directly on the
sky (the intervention screens already prove this reads beautifully), card
chrome only for cards with user content. Removes an element; adds nothing.

---

## 6. Copy voice — a 5-line style guide

The app has three casing regimes (lowercase `.h2`/buttons via CSS transform,
Title Case `h3` settings sections, sentence-case prompts) and mixed
button-label casing in source ("Surf it" vs "continue"). Propose codifying:

1. **Prompts & headings speak in sentence case** ("What do you want to do
   here?", "Wind down for sleep?").
2. **Buttons are lowercase** — already enforced by `<Btn>`'s CSS; also write
   them lowercase in source so code matches render.
3. **Settings section headings: sentence case** ("Active hours", "Grace
   period") — Title Case is the one regime that reads corporate; drop it.
4. **State the observed, never the inferred; present tense; no exclamation
   marks** (the feedback page's "…your feedback!" is the only `!` in the app
   — fits there, keep it deliberate).
5. **The companion is "the sun" by day, "the moon" by night** — already
   systematic via `companionWord()`; extend the same rule to any new copy.

---

## 7. Quick wins (small effort, visible value)

Status after review: 1 was rejected as deliberate; 2–12 are implemented.

1. ~~Wire the answer-edit confirm button (§3.1.1).~~ **Rejected — the empty
   onClick is deliberate** (blur is the single commit path; see §3.1.1).
2. ✅ Undo for answer deletion, reusing the website-list pattern (§3.1.3).
3. ✅ Engage-cancel for the grounding offer's auto-dismiss (§3.1.4).
4. ✅ Mention fling in the sun instructions (§2.1).
5. ✅ "low"/"high" anchors on the energy dots (§3.4).
6. ✅ Deduplicate web settings headings (§3.4) — the wrapper intros were
   removed; the components' own headings + state-aware descriptions carry
   the sections.
7. ✅ Remove the Android settings in-page Back button (§3.4).
8. ✅ Snap off-grid paddings/radii to tokens (§5.2) — with three deliberate
   exceptions kept as-is, each already justified by an in-code comment:
   the finger-rest pad's 40px radius (proportional to the ~420px pad), the
   calm-read 1.05em ("a touch above inherited" has no token), and the small
   toggle's 12px selected radius (scaled-down analog of the 8→16 morph).
9. ✅ Tame the button hover bloom (§5.1) — alpha 0.9 → 0.55.
10. ✅ Weight 200 → 300 on `.dashboardHeading` (§5.5).
11. ✅ Fix `BackgroundTransition` fallback gradients (§5.4).
12. ✅ Redirect on illegal category route param (§3.1.2).

---

## 8. Considered and rejected (on philosophy)

Recorded so they don't come back:

- ❌ **Visible skip/close buttons on every intervention** — would gut the
  gesture ritual; the one-time idle hint (§2.1) teaches instead of cluttering.
- ❌ **A stats/insights dashboard, usage graphs, or "time saved"** — the
  reflective-companion doc already killed these; nothing in this audit
  changes that.
- ❌ **Confirmation dialogs for destructive actions** — undo is calmer and
  already has an in-app precedent.
- ❌ **Toolbar popup for the extension** — a full calm page is a better fit
  than a cramped popup; the current behavior is a feature.
- ❌ **Labels/text in the bottom bar** — icon + generous hit area is enough;
  labels would be permanent chrome for a one-time learning problem.
- ❌ **Onboarding tour overlays / coach marks** — the product's one-object
  design doesn't need a tour; the two one-time hints (§2.1, §2.3) are the
  ceiling.
- ❌ **Streak-like "you completed N wind-downs"** anywhere — including the
  wind-down menu, which deliberately never tallies. Keep it that way.
