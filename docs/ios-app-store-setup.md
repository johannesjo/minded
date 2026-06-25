# iOS App Store Connect setup — minded (widget-only variant)

Step-by-step to create the iOS app on App Store Connect and push it to
TestFlight, then (later) to a public release. Companion to
[`RELEASING.md`](../RELEASING.md), which covers the CI pipeline
(`.github/workflows/ios-testflight.yml`).

> **Why this isn't fully automated.** The App Store Connect **API cannot create
> an app record** (it can only register Bundle IDs); app creation is UI-only, or
> via `fastlane produce` which needs an interactive Apple ID + 2FA. So the app
> *shell* (Steps 1–2) is a one-time manual step. Everything after — builds,
> uploads, metadata — is automatable with the App Store Connect API key.

## Prerequisites

- Paid **Apple Developer Program** membership (Team ID `363FAFK383`).
- The three GitHub secrets from `RELEASING.md` added to the `production`
  environment (`APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_ISSUER_ID`,
  `APP_STORE_CONNECT_PRIVATE_KEY_BASE64`).
- Export compliance is handled in code (`ITSAppUsesNonExemptEncryption=false` in
  `extension/ios/App/App/Info.plist`), so no per-build "Missing Compliance"
  prompt.

---

## Step 1 — Register the Bundle ID (~1 min)

Developer portal → **Certificates, Identifiers & Profiles → Identifiers → ＋** →
**App IDs → App**:

- **Bundle ID:** `com.minded.app` (Explicit)
- **Description:** `minded`
- Capabilities: leave defaults.

Must be done first — the New App dialog only lists already-registered IDs.

> The iOS bundle id `com.minded.app` is intentionally **not** the same as
> `capacitor.config.ts`'s `appId` / the Android `applicationId` (both
> `com.minded.minded`). The iOS Xcode project (`project.pbxproj`) is the source
> of truth for iOS, and `cap sync` does not change it.

## Step 2 — Create the app shell (~2 min)

This is all you need for TestFlight. App Store Connect → **Apps → ＋ → New App**:

| Field | Value |
|---|---|
| Platform | iOS |
| Name | `minded` (if taken: `minded: mindful pause`) |
| Primary language | English (U.S.) |
| Bundle ID | `com.minded.app` |
| SKU | `minded-ios` (any unique string) |

Click **Create**.

## Step 3 — Run the build

GitHub → Actions → **iOS TestFlight → Run workflow** → approve the `production`
environment when it pauses. The build lands in **App Store Connect →
TestFlight** in ~10 min.

## Step 4 — Add a tester (e.g. a friend/partner), no public release

A TestFlight build is **not** a public release — only invited testers see it.

- **External (simplest):** create a tester group → add their email → fill the
  **Test Information** tab (one-line "What to test", **feedback email**,
  **Privacy Policy URL**) → submit for **Beta App Review** (light, usually fast).
  They install the **TestFlight** app and accept the invite.
- **Internal (instant, no review):** add their Apple ID as a user on your App
  Store Connect team first; internal builds appear immediately. Max 100.

Builds expire after 90 days.

---

## Full App Store metadata — only for a *public* release, not TestFlight

All strings are within Apple's limits and honest about what the iOS app does (a
companion widget + pause; it does **not** block apps on iOS).

**Subtitle** (≤30 — 25):

```
A pause before the scroll
```

**Promotional text** (≤170 — 141):

```
A quiet sun lives on your Home Screen. Tap it for a moment's pause before the apps that pull you in. No streaks, no guilt — just awareness.
```

**Description** (≤4000):

```
minded is a mindfulness layer for the moments you reach for your phone without meaning to.

On iOS, minded is deliberately gentle. A calm companion sun sits on your Home Screen. Tap it whenever you feel the pull to scroll, and it opens a short, quiet pause — a breath, a check-in, a chance to ask whether you actually meant to open this.

There are no streaks, no "days clean", no minutes-saved scores, no goals to fail. minded is about awareness without judgment — noticing the pull, not punishing yourself for it.

• A companion sun widget for your Home Screen — always there, calm, no numbers
• Tap it for a soft pause: a breath or a check-in, never forced
• A simple dashboard for the day's intentions and reflections
• Completely private: everything stays on your device — no account, no tracking, no analytics

minded doesn't block your apps or shame you out of using them. It gives you a quiet moment to choose, then gets out of the way.

Open source: github.com/johannesjo/minded
```

**Keywords** (≤100 — 96; no spaces after commas, on purpose):

```
mindfulness,focus,screen time,doomscrolling,digital wellbeing,breathe,calm,intention,habit,pause
```

**Remaining fields:**

| Field | Value |
|---|---|
| Primary category | Health & Fitness |
| Secondary category | Lifestyle |
| Age rating | 4+ |
| Price | Free |
| Support URL | `https://github.com/johannesjo/minded` |
| Marketing URL | `https://github.com/johannesjo/minded` |
| Copyright | `© 2026 Johannes Millan` |

**App Review notes:**

```
The main interface is a Home Screen widget (a sun). Add it via the Home Screen, then tap it to open a short mindful pause. No login/account; all data is local. The app does not block other apps on iOS.
```

No demo account needed.

**App Privacy:** in the questionnaire, declare **no data types** → Apple displays
*"The developer does not collect any data from this app."* True — minded is
local-only with no analytics (matches the committed `PrivacyInfo.xcprivacy`).

**Screenshots** (required for public submission, *not* TestFlight): **6.9″ =
1320×2868** (or 6.5″ = 1284×2778; smaller sizes auto-scale), 1–10 images.
Suggested three: the sun widget on the Home Screen, the breath/pause, the
dashboard. Capture from the iOS Simulator.

---

## The one thing you must supply yourself

A **Privacy Policy URL** — required for every App Store app and for external
TestFlight. Since nothing is collected it's a few lines; easiest is a
`PRIVACY.md` served via GitHub Pages.
