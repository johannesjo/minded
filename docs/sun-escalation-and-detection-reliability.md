# Spec: confidence-gentle sun — escalation + detection-reliability

Status: **design / not yet scheduled.** A worked design for the intervention-side
sun on Android (and its web mirror). It resolves two coupled problems at once:
how to respond proportionally when we are *unsure*, and how to keep a stale or
wrong detection from ever producing a jarring, mis-targeted interrupt. This is the
*interrupt-side* sun; the invitation-only home-screen companion is a separate
surface (`docs/sun-companion-widget.md`).

## Locked decisions (do not regress)

Decided in review + owner direction. These supersede the escalation design below
(a full rewrite is pending).

**Baseline: PR #51** ("Android: make the little sun an interactive, non-blocking
bubble") is landing and already implements the simpler variant — a draggable
chat-head bubble that, on *tap*, expands the *same native overlay window* into a
full-screen pause + soft "Step away?" invitation (auto-dismissing, never
blocking). Crucially it does the pause in **native Compose** by swapping the one
window's layout params (`LittleSunWindow.kt` resting vs. expanded params), so it
**sidesteps the native→WebView seam** the review flagged as a blocker. This is the
foundation; the items below are deltas on top of it.

- **Auto-arriving pause — DEFERRED, not cut.** Keep the concept; ship and test the
  simpler *tap-only* variant first (PR #51), then decide from real use whether the
  sun should ever bring the pause on its own. The open strategic question (an
  interrupt dismissed ~9/10 when unready is friction; but a self-initiated pause
  may be too weak for the willpower-eroded user) is exactly what testing resolves.
- **Escalation — CUT.** No dwell-driven growth, no swelling glow, no "harder to
  ignore over time." A rising-intensity ramp tied to elapsed time manufactures
  urgency, which the fundamentals forbid.
- **No breathing outside meditations.** The everyday sun does not "breathe"; the
  breathing swell is reserved for guided meditations (e.g. urge-surfing). CLAUDE.md
  updated to match. *Conflict to resolve in/after PR #51:* its tap-pause currently
  breathes (`LittleSun.kt` `StepAwayOffer` → the `breath` infinite transition,
  scale 0.92↔1.12). That must become a non-breathing calm beat — recommended: a
  single grow-morph from the parked bubble to centre, then hold, then the invite.
- **The sun always morphs; there is only one.** One continuous object that
  glides/scales between states — never a hard cut, never vanishing, never in two
  places. PR #51's expand is currently a cross-fade swap (the bubble unmounts; the
  full-screen offer fades in), so for a beat the sun effectively *disappears* from
  its corner and *reappears* centred. Per this rule it should be a true positional
  morph: the sun glides+grows from its parked spot to centre as one object. Where
  a flow still can't morph (native overlay → WebView), the job is to *make* it
  morph.

## The problem in one line

Android foreground detection is **not, and can never be, 100% reliable** — so a
design that fires a full interrupt on a single detection event will sometimes fire
it on the wrong app (the canonical bug: the sun appears *after* the blocked app
has already been backgrounded). We cannot fix detection. We can make the *response*
immune to detection error.

## The governing principle

**Response cost must be proportional to certainty.** A false positive is only
expensive if the thing it triggers is expensive. So we split the response:

| When we are… | Response | False-positive cost |
|---|---|---|
| barely sure (one detection, possibly stale) | a small, calm, **dismissible** sun, counting up | ~free — flickers and fades, reads as nothing |
| sure *and* the app has stayed foregrounded | the sun **escalates** — grows, glides to the breath anchor, runs the pause | high — but unreachable by a transient (see below) |

This is the same friction-escalation sun arrived at on UX grounds, viewed from the
reliability angle. **They are one design.** The detector does not need to get
better; the response needs to be cheap-and-self-healing when uncertain, and
gated-on-sustained-confirmation when assertive.

Two consequences, stated plainly so they don't get re-litigated:

- **We deliberately bias toward false *negatives* on the assertive action.** A
  gentle nudge that arrives a beat late, or occasionally not at all, is
  on-philosophy (*never forced, gentle*). A confident hard-interrupt over the
  wrong app betrays the premise. When in doubt, under-commit.
- **Hide stays eager; show stays conservative.** The codebase already has this
  asymmetry (hide is immediate and ungated; show is gated by a 500 ms post-hide
  debounce, `OverlayDecisionEngine.kt:41-43`). We keep and lean into it.

## Part 1 — The sun state machine

The sun is a single overlay with five states. A **re-confirmation tick** (aligned
with the existing poll cadence, ~500 ms) drives every transition; the sun never
trusts the detection event that spawned it beyond the first frame.

```
                detection passes entry gate (Part 2)
   HIDDEN ───────────────────────────────────────────► AMBIENT
     ▲                                                   │  │
     │ fade done                       dwell ≥ start(f)  │  │ foreground ≠ blocked
     │                                                   ▼  │   (any tick)
  DEPARTING ◄──────────────────────────────────── ESCALATING
     ▲  ▲                       de-escalate (leave)  │
     │  │                                            │ dwell ≥ commit(f)
     │  │ pause done / flung / leave                 │  AND foreground == blocked
     │  └──────────────────── PAUSE ◄────────────────┘   (final liveness gate)
     └──── (fade out, soft, never a hard cut) ────────
```

- **HIDDEN** — nothing on screen.
- **AMBIENT** — small, calm sun in the corner, counting **up**, blank for the
  first ~30 s (`formatTime.ts:16-19` — keep this guardrail). Low salience,
  fully dismissible (fling away). This is the *only* state a single, possibly-stale
  detection can produce. False-positive-tolerant by construction.
- **ESCALATING** — as `confirmedDwellMs` accumulates, the sun grows / its glow
  swells (reuse the amber `glowBrush`, `LittleSun.kt:73-79`) and begins gliding
  toward the breathing anchor. Pure ambient awareness of *observed* dwell — no
  number required.
- **PAUSE** — the committed interrupt: the sun reaches the anchor and runs
  `StrongFrictionBreathPause` (reuse the existing glide-to-breath motion,
  `InteractionCommon.tsx:494-498`).
- **DEPARTING** — fade out (soft), then HIDDEN.

### The two invariants that make it work

1. **`confirmedDwellMs` only counts *continuous, re-confirmed* foreground presence
   on the blocked app.** Every tick re-reads the freshest foreground (Part 2). The
   instant it is not the blocked app, the sun goes to DEPARTING and `confirmedDwellMs`
   **resets to zero**. (Full reset, not decay: leaving the app is the desired
   outcome; if the user returns they earn a fresh, gentle runway.)
2. **PAUSE is reachable only from ESCALATING, only when `confirmedDwellMs ≥
   commit(friction)`, and only if foreground is still the blocked app at the commit
   tick.** A transient mis-detection or a stale poll cannot survive continuous
   re-confirmation long enough to reach commit. This is how we *eliminate* false
   positives for the expensive action without any better sensor.

### Escalation runway is set by friction (and, on Android, confidence)

`start(friction)` and `commit(friction)` come from the shared friction level
(`getFrictionLevel`, `interactionContext.ts:98-123`), which runs identically on
both platforms:

- **soft** → long or infinite runway (the ambient sun may be the *whole* response;
  it never escalates to a pause). This is the "don't always hit them with the full
  intervention" case.
- **normal** → medium runway.
- **strong** → short runway (the pull is real; reach the pause quickly).

On Android, **detection confidence folds *into* friction** rather than gating the
UI directly: a low-confidence detection biases toward a longer runway (treat
uncertainty as a weak reason to escalate). Confidence stays an Android-internal
detail and never leaks into a user-facing model the web cannot share. A user who
never grants accessibility is simply capped at lower confidence → longer runways →
more ambient-sun, less auto-pause — a graceful degradation, not a dead feature.

### Tap is an accelerant, never the only path

Tapping the sun jumps straight to PAUSE (or shortens the runway). But the pause
**must be able to arrive on its own** — the premise is the user is in an automatic
scroll and will *not* choose to tap. Tap is the escape hatch and the fast-forward;
dwell is the safety net. (Note: the Android overlay sun is currently
`FLAG_NOT_TOUCHABLE`, `LittleSunWindow.kt:142-146` — relaxing that is net-new work
and a prerequisite for tap.)

## Part 2 — The render-time liveness gate (kills the stale-show bug)

Today the show path trusts the package name captured at detection time and never
re-checks it before drawing (`OverlayControllerService.showOverlay`,
`OverlayControllerService.kt:329-409`). The strongest "what is foreground *now*"
signal — the accessibility focused-window read (`computeFocusedAppPackage`,
`MyAccessibilityService.kt:430-448`) — exists but is trapped inside the
accessibility service and unavailable to the overlay controller at draw time. Two
mechanisms close the gap.

### 2a. Thread the detection timestamp; drop stale shows

`ValidatedDetection` already carries a timestamp (`HybridAppDetector.kt:494-500`),
but only the package name survives into the overlay intent
(`MyAccessibilityService.kt:384-387`, `triggerOverlay` at `:515-558`). Thread the
timestamp (and a `focusedConfirmed` flag) through the intent extras, and in
`checkToShowOverlay` reject any detection older than `STALE_SHOW_THRESHOLD_MS`
(~600–800 ms, i.e. one poll interval). This alone kills the reported bug: a 500 ms
usage-stats poll that emits a detection already stale by the time it is processed
can no longer draw a window.

### 2b. A freshest-foreground accessor the overlay can read synchronously

Introduce a small shared holder — `ForegroundState { packageName, timestampMs,
source }` — written by **both** detection channels:

- the accessibility focused-window read, whenever it is computed (authoritative
  while accessibility is alive), and
- the usage-stats poll's latest result.

The overlay controller reads it synchronously at show time **and on every
re-confirmation tick**, taking the freshest value. This untraps the ground-truth
signal (the show decision consults live truth, not a captured string) and gives the
state machine its per-tick confirmation source. When accessibility is dead it
degrades to the poll value — laggier, but the continuous re-confirm + fade
compensates (a wrong read self-corrects on the next confirmed leave).

### Entry gate, assembled

A detection may enter **AMBIENT** when: it is fresh (2a) **and** the freshest
foreground equals the blocked app (2b) **and** the existing appropriateness rules
(session/grace/friction in `OverlayDecisionEngine.decide`, `:31-101`) allow it. If
foreground cannot be confirmed (e.g. accessibility dead, poll stale), entry is
allowed **only to AMBIENT, never straight to an assertive state** — and the
continuous re-confirm loop sorts it out within a tick or two. The expensive action
is never entered on an unconfirmed reading.

## Cross-platform mapping (web)

Web detection is a certain URL match (`isOnBlockedUrl.ts`), so there is no
stale-poll race and Part 2 is largely a no-op (the live truth is "is this page
still active"). But Part 1 applies unchanged and the infrastructure already exists:

- `LittleSunComponent` (`LittleSun.tsx`) is the ambient sun; it already counts up
  as a calm companion in grace mode, with the rationale already written in-code
  ("count… *up* — a calm companion… not a countdown ticking down toward the next
  intervention (which would manufacture the very urgency we avoid)",
  `LittleSun.tsx:291-302`).
- Friction-gate the entry in `ContentScriptMain.tsx:104-118`: **soft** → mount the
  ambient sun first; **normal/strong** → short runway. Escalation/commit reuses the
  existing `onShowFreshInteraction` path (`LittleSun.tsx:287`).
- The re-confirmation tick on web = page visibility / the content script being
  alive on that page; on `visibilitychange`-hidden or navigation, fade out.

One user-facing rule, both platforms: *when the moment is calm the sun just keeps
you company; when the pull is strong the sun brings a fuller pause.*

## Concrete change list

**Android**

1. `ValidatedDetection` → thread `timestampMs` + `focusedConfirmed` through the
   overlay intent (`MyAccessibilityService.kt:384-387`, `:515-558`).
2. New `ForegroundState` shared holder, written by the focused-window read and the
   poll; read synchronously by `OverlayControllerService`.
3. `OverlayControllerService.checkToShowOverlay` / `showOverlay` (`:329-409`,
   `:569-675`): add the liveness gate (stale-drop + freshest-foreground match);
   require it at draw time for any assertive state.
4. `OverlayDecisionEngine.decide` (`:31-101`): take friction + confidence into
   `OverlayState`; output an *entry posture* (AMBIENT + a friction-derived runway),
   not just `ShowLittleSun`/`ShowIntervention`.
5. `LittleSunWindow`: generalize the one-shot 3 s revalidation (`:106-119`) to a
   per-tick re-confirm with fade-on-leave; add the ESCALATING visual (grow / glow
   swell) driven by `confirmedDwellMs`; at commit, transition into the breath pause;
   relax `FLAG_NOT_TOUCHABLE` (`:142-146`) so tap accelerates to PAUSE.

**Web**

6. `ContentScriptMain.tsx` (`:104-118`): friction-gated ambient-first entry;
   per-visibility re-confirm with fade; reuse `onShowFreshInteraction` for commit.

## Parameters to tune (open)

- `start(friction)` / `commit(friction)` dwell thresholds per level.
- `STALE_SHOW_THRESHOLD_MS` (~600–800 ms).
- Re-confirmation tick interval (default: reuse the 500 ms poll cadence).
- Escalation visual: grow vs. glow-swell vs. both.

## Guardrails preserved (do not regress)

- **Count-up, blank below 30 s** (`formatTime.ts`) — never start digits "from the
  moment it appears."
- **Countdown stays for user-*chosen* timed sessions** — there it is an honest
  receipt of the user's own boundary, not a minded-imposed budget.
- **All transitions fade** — open, escalate, de-escalate, depart. No hard cuts
  (CLAUDE.md styling guideline).
- **Observed behaviour only** — `confirmedDwellMs` is a counted present-moment fact;
  nothing here infers a feeling.
- **Minimalism** — no new screens, no new components: reuse the sun, the breath
  pause, `LittleSunComponent`, and the existing overlay decision chokepoint.

## Deliberately out of scope

- **Making detection more reliable.** Impossible on the platform; the whole point
  is to stop needing it.
- **Requiring accessibility.** It only sharpens (raises confidence → shorter
  runways). Without it, the sun leans ambient and degrades gracefully.
- **iOS.** Untouched (`docs/ios-platform-fit.md`).
