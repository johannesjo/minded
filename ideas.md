# IDEAS
* Optimized Content Script Injection:
    * Concept: Ensure the content script is as "invisible"
      as possible until triggered.
    * Benefit: Reduce memory footprint on heavy pages. Use
      "Shadow DOM" extensively (if not already) to
      completely isolate your UI styles from the host
      page's CSS to prevent bleeding.


* Personalized "Calm" Themes:
    * Concept: Allow users to unlock or select visual
      themes (Forest, Ocean, Space, Minimal).
    * Benefit: Increases emotional connection to the app.
      The "Sun" component could adapt its visuals
      accordingly.

    * Smart Onboarding "Calibration":
        * Concept: Upon installation, ask why they installed it
          (e.g., "I scroll too much on TikTok" vs. "I get
          distracted by News").
        * Benefit: Pre-configure the "Blocked Sites" list and
          question categories based on their specific pain
          points.


* "Focus Modes" / Scheduling:
    * Concept: Allow users to define schedules (e.g., "Work
      Hours", "Evening Wind-down").
    * Benefit:
        * Strict Mode: Harder blocks or longer breathing
          exercises during work hours.
        * Gentle Mode: Simple reminders or skip-able
          prompts during free time.


* "Urge Surfing" Toolkit:
    * Concept: A dedicated "SOS" feature for when a user
      feels a strong compulsion to doom-scroll.
    * Benefit: A specific set of short, high-impact
      exercises (e.g., "Box Breathing," "5-4-3-2-1
      Grounding technique") accessible anytime, not just on
      block.

---

## Explored Ideas (Dec 2024)

Focus areas: Smarter Blocking, Deeper Reflection, Quick Modes
Approach: Minimal gamification, solo app (no social)

### Smarter Blocking

* Time-Based Rules (Weekly Timetable):
    * Default focus hours with per-day adjustments
    * Example: 9am-5pm weekdays, Wednesday afternoons off
    * Allows legitimate evening use

* Progressive Friction:
    * 1st attempt → Quick question
    * 2nd attempt (within 1hr) → Longer reflection or breathing
    * 3rd+ attempts → Mandatory wait (30 sec)

* Usage Budgets:
    * Daily time limits per site/app
    * Visual countdown when on site
    * Soft vs hard limits

* Allowlist Exceptions:
    * Block YouTube but allow specific channels
    * URL patterns (block reddit.com, allow r/productivity)

### Deeper Reflection

* Intention Setting:
    * Morning: "What's your focus today?"
    * Evening: "Did you honor your intention?"
    * Show intention during blocking: "Remember, you wanted to..."

* Breathing Exercises:
    * Visual animation (expanding/contracting circle)
    * Box breathing (4-4-4-4) or 4-7-8 technique
    * Alternative to text-based questions

* Mood Trends:
    * Weekly visualization (line/bar chart)
    * Pattern insights: "You feel better on low-attempt days"

* Reflection Categories:
    * User chooses focus: anxious / procrastinating / need a break
    * Routes to appropriate questions or breathing

### Quick Modes

* One-Tap Mood:
    * Tap emoji → done
    * Skip sun ritual entirely
    * For genuinely busy moments

* Configurable Ritual Length:
    * Quick / Normal / Deep setting
    * Quick: Single question or mood tap
    * Deep: Multiple prompts + breathing

* Skip Without Guilt:
    * Clear "It's okay to skip" messaging
    * No tracking of skipped interactions

### Priority Matrix

| Feature              | Effort | Impact |
|----------------------|--------|--------|
| One-tap mood         | Low    | High   |
| Breathing exercises  | Medium | High   |
| Time-based blocking  | Medium | High   |
| Intention setting    | Low    | Medium |
| Progressive friction | Medium | Medium |
| Usage budgets        | High   | High   |
