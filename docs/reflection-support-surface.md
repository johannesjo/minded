# Concept: a reflection / support surface for hard, low-output stretches

Status: **proposal / awaiting sign-off.** This translates an external
brainstorming handover (written in Super Productivity's vocabulary) onto
minded's actual surfaces, picks a direction, and specifies a minimal first
slice. Nothing here is committed to a release. Copy is illustrative and needs
maintainer sign-off before wiring — in this app the wording *is* the product.

Companion to `reflective-companion-concept.md`. That note asks "what can we
*reflect back* to the user?"; this one asks "how do we *carry load* for a
depleted user and make a low-output stretch feel legitimate?" Same 90% bar,
same no-scoreboard guardrails.

## The intent, in one line

When someone is in a high-load phase (new parenthood, burnout, ADHD-style
overload), minded's job shifts from "help me notice the pull" to *also*
"help me carry less and not feel like I'm failing on a hard week" — by
**externalizing load** and **normalizing a near-empty day**, never by
measuring the user.

## First, the honest translation

The handover assumes a **task manager** (Super Productivity): a procrastination
dialog, a daily-planning flow, a daily summary, projects/tags you can park.
minded is a **doomscroll interrupter** built around the sun. So three of the
four proposed directions are partial or category errors here, and saying so is
most of the value:

| Handover direction | Fit for minded | Why |
|---|---|---|
| **A. Broaden "what's in the way"** | ✅ Strong | minded already has the reflective-question system (`src/shared/data/questions.ts`), an intervention flow that shows one (`getQuestionSmart.ts` → `Question.tsx`), `chips` for no-typing answers, and `isDontSaveAnswer` for ephemerality. Everything A needs already exists. |
| **B. Frictionless brain-dump / inbox** | ⚠️ Weak | minded is not a capture app and has no inbox/task list. The only brain-dump is the Android-only `SleepWindDown` ("Wind-Down Brain Dump"). A general inbox would fragment the app and violate its minimalism principle ("remove before you add"). **Recommend: do not build.** If anything, widen the existing wind-down dump — not a new module. |
| **C. "Lighter stretch" / park projects until a date** | ❌ N/A | There are no projects/tasks/tags in minded to shelve. The data model has per-day usage and ephemeral answers, nothing to "pause until <date>." This is a Super Productivity feature with no referent here. |
| **D. Gentle planning / summary tone** | ⚠️ Marginal | minded has no daily-planning or end-of-day-summary screen. The nearest surfaces are dashboard question categories (`RefocusHelperToday` = "Finding Focus Today", `GoodPlansToday`). Tone is already gentle. Small copy nudges are possible but low-value on their own. |

Also resolved from the handover's open questions:
- **i18n**: there is **no i18n layer** in minded today — all question copy is raw
  English strings in the `t:` field. So "German/English aware from the start" is
  moot; new copy is English, consistent with the rest of the app.
- **Editable prompt copy without code changes**: questions already *are* the
  config — plain data in `questions.ts`. The maintainer edits strings there; no
  separate config mechanism is needed or worth adding.

**Recommendation: pursue Direction A only, in a minded-native form. Decline
B and C; fold D's tone idea into A rather than shipping it alone.**

## What "Direction A, minded-native" actually is

Today, during an intervention the app may show one reflective question
(`getQuestionSmart`), the user answers, it fades, and the flow proceeds to the
sun gesture → intent/time selection. There is **no supportive branch**: every
answer leads to the same "now choose how long you'll browse" push-through. The
`UnderstandingProcrastination` category even leans slightly clinical
("What do you think is a factor that **enables your procrastination**").

The change is to make **"it's just a hard day" a first-class, supported
answer** at the moment of interruption — one that routes *toward setting the
phone down*, not toward configuring a browsing session.

Three moving parts, smallest first:

1. **Soften the framing (pure content).** Reframe the
   `UnderstandingProcrastination` lead-ins away from the accusatory register
   toward present-moment, non-judgmental phrasing — e.g. "What's in the way
   right now?" instead of "What enables your procrastination?". This is a
   one-file edit in `questions.ts` (`t:` strings + the category `dashboardTxt`),
   fully reversible.

2. **Make depletion a first-class answer (content + existing `chips`).** Add a
   present-moment, intervention-only, **ephemeral** question whose `chips` name
   the depleted states as legitimate answers:
   `["I'm tired", "overwhelmed", "can't focus", "just a hard day"]` plus the
   built-in "Something else…" typed path. Mark it `isDontSaveAnswer: true` and
   `isSkipOnDashboard: true` — present-moment only, never logged, never a
   record to fall behind on (this is exactly how `HBH7`/`HAU7` and the let-go
   question already behave). Naming the state *is* the value; we store nothing.

3. **Route the depleted answer to a supportive off-ramp, not push-through (tiny
   flow touch).** This is the only non-content part. When one of the
   "depleted" chips is chosen, instead of proceeding to intent/time selection,
   show a single legitimizing line and offer the *already-built* grounding sit
   as the gentle exit:

   > "That's a real answer. A near-empty stretch is a fine plan — nothing here
   > needs you right now. Want to set the phone down for a minute?"

   The off-ramp reuses the existing **grounding** offer ("Stay a while?",
   `grounding.const.ts`) or simply a fade-to-close. No new meditation surface,
   no new component — we are re-pointing one branch of the existing flow at a
   surface that already exists. The escape hatch (the sun) is untouched and
   always available.

Why reuse grounding/letGo rather than invent a response engine: those surfaces
already embody "permission to do less" — grounding (drag down) = "Stay a while?
just sit", letGo (fling up) = name a thing and release it, neither charges the
answer. The supportive branch is the intervention flow *borrowing* that exit.

## Passing minded's 90% bar

Direction A clears the bar in `reflective-companion-concept.md` precisely
because the **user names their own present state** — the app never infers it:

1. **Observed/self-reported, not inferred.** A tapped "I'm tired" chip is a
   first-person, present-tense statement the user volunteered. We are not
   guessing a feeling from a stale timestamp (the cut "mood linkage" failure).
2. **Present moment only.** The question fires *at* the interruption and is
   discarded immediately. Nothing persists, so nothing can go stale.
3. **No anxiety/scarcity/guilt.** The response *lowers* the bar ("a near-empty
   stretch is a fine plan"). It is the opposite of "you've used up your budget."
4. **The helpful response is obvious.** Set the phone down / sit for a minute —
   not advice we're unsure of.
5. **Rare and dismissible.** It rides the existing intervention cadence and the
   sun escape hatch; it never blocks and auto-fades like every other offer.

And it honours the anti-features: no mood score, no streak, no history of "hard
days", nothing leaves the device, no scheduled reflection nag.

## Minimal first slice (what I'd ship to validate the tone)

Deliberately the smallest reversible thing that tests the voice before any flow
work:

1. **Content-only PR**, no flow changes:
   - Soften `UnderstandingProcrastination` copy + `dashboardTxt` in
     `questions.ts` (step 1 above).
   - Add the ephemeral "what's in the way right now?" question with the
     depleted-state `chips`, `isDontSaveAnswer: true`, `isSkipOnDashboard: true`
     (step 2). Modeled exactly on the existing `LET_GO_QUESTION` standalone
     pattern (`letGo/letGo.const.ts`) and the `HBH7` ephemeral pattern.
   - New `QID` for the question, following the existing id convention.
   - Confirm via the answer-save path (`Question.tsx:69-70`,
     `syncDataInterface.saveAnswer`) that `isDontSaveAnswer` keeps it out of
     storage — i.e. verify nothing is persisted as a metric.

   This alone makes "a hard day" a *nameable* answer at the interruption, with
   zero risk and full reversibility.

2. **Follow-up PR (only if slice 1 feels right):** the supportive off-ramp
   (step 3) — re-point the depleted-chip branch at the grounding offer / a
   supportive fade instead of intent-time selection. This is the only code that
   touches the flow and deserves its own review.

Ship behind the lightest possible opt-in, or simply as part of the existing
intervention question rotation (it self-limits via the normal cadence).

## Open questions for the maintainer

1. **Sign off the copy.** The lead-in reframe and the depleted chips/response
   line are the product — exact wording needs your voice before wiring. Drafts
   above are placeholders.
2. **Off-ramp target.** For the depleted branch, prefer (a) reuse the grounding
   "Stay a while?" offer, or (b) just a supportive line + fade-to-close? (a) is
   richer, (b) is lighter. Recommendation: start with (b), it adds less.
3. **Host surface.** Confirm the intervention question flow is the right host
   (vs. a dedicated gesture surface like letGo). Recommendation: intervention
   flow — it's where "what's in the way right now?" is actually true.
4. **Decline B and C explicitly?** Confirm we're not building a general inbox
   (B) or project-parking (C), since neither fits minded's model. The
   load-carrying intent is served by A's "permission to do less" branch instead.

## North star

The surface's job is to *carry what the user shouldn't have to* and to *make a
hard, low-output stretch feel legitimate* — never to measure the user. When in
doubt, choose the option that adds less. For minded that means: no new module,
no stored answer, one softened question and one supportive branch that points
at a calm exit the app already has.
