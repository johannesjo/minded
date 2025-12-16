# iOS Intervention Approaches: Evaluation & Recommendations

## Problem Statement

The minded app's core value proposition is **intercepting app launches** to show mindfulness interventions before users doom-scroll on social media. On Android, this works via:

1. **AccessibilityService** detects foreground app changes in real-time
2. **Overlay system** displays a custom intervention UI on top of any app
3. User completes mindfulness interaction before accessing the target app

**iOS fundamentally blocks both capabilities:**

- No API to detect which app is in the foreground
- No permission to draw UI over other apps
- Sandboxed apps cannot interact with or observe other apps
- Apple's philosophy: users control their device, apps don't spy on each other

This document evaluates all viable approaches to achieve similar functionality within iOS constraints.

---

## Approach 1: Safari Web Extension

### Description
Build an iOS Safari Web Extension that intercepts social media websites (web versions of Instagram, Twitter/X, Reddit, TikTok, Facebook, YouTube) and shows interventions before loading.

### Technical Implementation
```
iOS App Bundle
├── minded iOS App (main app)
├── Safari Web Extension
│   ├── manifest.json
│   ├── content-script.js (injects intervention)
│   ├── background.js (handles state/settings)
│   └── popup (extension toolbar UI)
```

The extension would:
1. Match URLs for target social media sites
2. Inject intervention UI before page loads (same as browser extension)
3. Communicate with main app for settings/stats via App Groups

### Feasibility
| Factor | Rating | Notes |
|--------|--------|-------|
| Technical | ✅ High | Well-documented API, similar to existing browser extension |
| App Store Approval | ✅ High | Apple allows Safari extensions |
| User Friction | ⚠️ Medium | Requires enabling extension in Settings |
| Coverage | ❌ Low | Only Safari web, not native apps |

### Pros
- **Leverages existing code**: Browser extension logic is 80% reusable
- **Full control over intervention UI**: Same experience as desktop
- **No user workarounds needed**: Works automatically once enabled
- **Reliable**: Apple-supported, won't break with OS updates

### Cons
- **Only covers web usage**: Users using native apps are unprotected
- **Setup friction**: Users must enable extension in Safari settings
- **Safari only**: Chrome/Firefox iOS users not covered (though they use WebKit)
- **Limited to websites**: Can't intervene on native apps at all

### User Journey
1. Download minded from App Store
2. Open Settings → Safari → Extensions → minded → Enable
3. Grant "All Websites" permission (or specific domains)
4. Visit twitter.com in Safari → Intervention appears

### Development Effort
- **Estimated**: 2-3 weeks
- **Complexity**: Low-Medium (reuse existing extension code)
- **Maintenance**: Low (stable APIs)

---

## Approach 2: Shortcuts Automation

### Description
Guide users to create iOS Shortcuts automations that open minded before target apps. When user opens Instagram, Shortcuts runs automation that:
1. Opens minded app
2. Shows intervention
3. Deep links back to Instagram

### Technical Implementation
```
Shortcut: "Open Instagram Mindfully"
├── Trigger: "When I open Instagram"
├── Action 1: Open minded://intervention?target=instagram
├── minded app: Shows intervention
└── Action 2: (after completion) Open instagram://
```

minded app requirements:
- Register URL scheme: `minded://`
- Handle `intervention` route with `target` parameter
- Store pending target, show intervention
- On completion, open target app via URL scheme

### Deep Link Registry (Target Apps)
```swift
let appSchemes: [String: String] = [
    "instagram": "instagram://",
    "twitter": "twitter://",
    "tiktok": "tiktok://",
    "facebook": "fb://",
    "reddit": "reddit://",
    "youtube": "youtube://",
    "snapchat": "snapchat://"
]
```

### Feasibility
| Factor | Rating | Notes |
|--------|--------|-------|
| Technical | ✅ High | URL schemes are simple |
| App Store Approval | ✅ High | Standard functionality |
| User Friction | ❌ Very High | Manual setup per app |
| Coverage | ⚠️ Medium | Native apps, but easily bypassed |

### Pros
- **Covers native apps**: The only way to intervene on native app launches
- **No jailbreak required**: Uses official Apple features
- **Full intervention UI**: minded app has full control
- **User commitment**: Manual setup = user is invested

### Cons
- **Extremely high setup friction**: User must create automation per app
- **Easily bypassed**: User can just tap "Don't Run" on automation prompt
- **Not blocking**: iOS shows "Running automation..." but doesn't prevent app opening
- **Notification-based**: iOS 15.4+ shows notification instead of blocking
- **Breaks regularly**: Shortcuts automations are fragile

### Critical Limitation
As of iOS 15.4, "Open App" automations **no longer block**. They show a notification that runs the shortcut, but the target app opens immediately. This fundamentally breaks the intervention model.

**Workaround**: Use "Ask Before Running" = OFF, but this still shows notification banner, doesn't block app.

### User Journey
1. Download minded from App Store
2. Open minded → Guided Setup
3. For each target app:
   - Open Shortcuts app
   - Create Personal Automation → App → [Target App] → Is Opened
   - Add action: Open minded://intervention?target=[app]
   - Disable "Ask Before Running"
4. Open Instagram → Notification banner → minded opens → Complete intervention → Return to Instagram

### Development Effort
- **Estimated**: 1-2 weeks
- **Complexity**: Low (URL scheme handling)
- **Maintenance**: Medium (Shortcuts behavior changes with iOS updates)

### Verdict
**Not recommended as primary approach** due to iOS 15.4+ changes making automations non-blocking. Could be offered as supplementary option for committed users.

---

## Approach 3: Screen Time API (FamilyControls/ManagedSettings)

### Description
Use Apple's Screen Time API to programmatically set app limits and display "shields" when time limits are reached.

### Technical Implementation
```swift
import FamilyControls
import ManagedSettings
import DeviceActivity

// Request authorization
AuthorizationCenter.shared.requestAuthorization(for: .individual) { result in
    // Handle result
}

// Create app selection
let selection = FamilyActivitySelection()
// User picks apps via FamilyActivityPicker

// Set up shield
let store = ManagedSettingsStore()
store.shield.applications = selection.applicationTokens
store.shield.applicationCategories = selection.categoryTokens

// Custom shield configuration (LIMITED)
store.shield.webDomainCategories = .specific(selection.webDomainTokens)
```

### What's Customizable
- **Shield title**: Custom text
- **Shield subtitle**: Custom text
- **Primary button**: Label + action
- **Secondary button**: Label + action
- **Icon**: App icon (cannot change)
- **Background**: Cannot customize

### What's NOT Customizable
- Cannot show custom UI/views
- Cannot show mindfulness questions
- Cannot show breathing exercises
- Cannot show quotes or advice
- Limited to Apple's shield template

### Feasibility
| Factor | Rating | Notes |
|--------|--------|-------|
| Technical | ⚠️ Medium | Complex API, limited documentation |
| App Store Approval | ✅ High | Apple-sanctioned API |
| User Friction | ✅ Low | In-app picker, no Shortcuts |
| Coverage | ✅ High | All apps, including native |
| Customization | ❌ Very Low | Cannot show interventions |

### Pros
- **Actually blocks apps**: Real enforcement, not easily bypassed
- **Covers all apps**: System-level blocking
- **Low setup friction**: FamilyActivityPicker is in-app
- **Apple-supported**: Won't break, designed for this use case

### Cons
- **Cannot show custom interventions**: Fatal flaw for minded's value prop
- **Binary block**: App is blocked or not, no "pause and reflect"
- **No mindfulness content**: Just a generic "Time Limit" screen
- **Complex implementation**: DeviceActivity, Extensions required
- **iOS 15+ only**: Older devices not supported

### What minded Could Do
```
User opens blocked app
    ↓
Apple Shield appears: "Time to be Mindful"
    ↓
Primary Button: "Open minded" → Launch minded app
Secondary Button: "Use App Anyway" → Dismiss shield
    ↓
If user opens minded:
    - Complete intervention in minded app
    - minded removes shield temporarily (programmatically)
    - User returns to target app
```

This creates a **two-step intervention** rather than an in-place overlay, but preserves the core flow.

### User Journey
1. Download minded from App Store
2. Grant Screen Time permission
3. Select apps to shield via FamilyActivityPicker
4. Open Instagram → Apple Shield appears → "Open minded" button
5. Complete intervention in minded → Shield removed temporarily
6. Return to Instagram

### Development Effort
- **Estimated**: 4-6 weeks
- **Complexity**: High (multiple extensions, background scheduling)
- **Maintenance**: Medium (API is stable but complex)

### Required Components
1. **Main App**: Configuration UI, FamilyActivityPicker
2. **DeviceActivityMonitor Extension**: Tracks app opens
3. **ShieldConfiguration Extension**: Customizes shield text
4. **ShieldAction Extension**: Handles button taps

---

## Approach 4: Widget-as-Launcher

### Description
Redesign the user journey: instead of intercepting app launches, make users launch social apps **through** a minded widget. The widget shows the intervention first, then opens the target app.

### Technical Implementation
```swift
// WidgetKit widget with app shortcuts
struct MindfulLauncherWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "launcher", provider: Provider()) { entry in
            LauncherWidgetView(entry: entry)
        }
        .configurationDisplayName("Mindful Launcher")
        .description("Access apps mindfully")
        .supportedFamilies([.systemMedium, .systemLarge])
    }
}

// Widget shows app icons
// Tap → Deep link to minded://launch?app=instagram
// minded shows intervention
// On complete → Open instagram://
```

### Alternative: Lock Screen Widget (iOS 16+)
Smaller widget on lock screen for quick access with intervention gate.

### Feasibility
| Factor | Rating | Notes |
|--------|--------|-------|
| Technical | ✅ High | Standard WidgetKit |
| App Store Approval | ✅ High | Normal widget functionality |
| User Friction | ❌ High | Requires behavior change |
| Coverage | ⚠️ Medium | Only if user uses widget |
| Bypass Risk | ❌ High | User can open apps directly |

### Pros
- **Full intervention control**: minded app shows complete UI
- **No special permissions**: Standard widget functionality
- **Habit formation**: Can become new muscle memory
- **Visual reminder**: Widget on home screen = constant presence

### Cons
- **Requires behavior change**: User must choose to use widget
- **Easily bypassed**: App Store icon still accessible
- **Friction resistance**: Users will revert to direct launch
- **Not automatic**: Zero enforcement

### UX Considerations
To make this viable, help users reduce friction:
1. Move target apps to App Library (off home screen)
2. Place minded widget where apps used to be
3. Use Focus modes to hide apps from home screen

### User Journey
1. Download minded from App Store
2. Add minded widget to home screen
3. Move Instagram/TikTok/etc to App Library
4. To open Instagram: Tap widget → Complete intervention → App opens

### Development Effort
- **Estimated**: 2-3 weeks
- **Complexity**: Low-Medium
- **Maintenance**: Low

---

## Approach 5: Local VPN / DNS Blocking

### Description
Create a local VPN that filters traffic to social media domains. When blocked domains are accessed, show a local block page or redirect to minded.

### Technical Implementation
```swift
import NetworkExtension

class PacketTunnelProvider: NEPacketTunnelProvider {
    override func startTunnel(options: [String : NSObject]?) async throws {
        let settings = NEPacketTunnelNetworkSettings(tunnelRemoteAddress: "127.0.0.1")

        // Configure DNS to filter domains
        let dnsSettings = NEDNSSettings(servers: ["127.0.0.1"])
        dnsSettings.matchDomains = [""] // All domains
        settings.dnsSettings = dnsSettings

        try await setTunnelNetworkSettings(settings)
    }

    // Intercept DNS queries, block social media domains
    func handleDNSQuery(domain: String) -> DNSResponse {
        if blockedDomains.contains(domain) {
            return .blocked // or redirect to local server
        }
        return .passthrough
    }
}
```

### Blocked Domains Example
```swift
let blockedDomains = [
    "instagram.com", "www.instagram.com", "i.instagram.com",
    "twitter.com", "x.com", "api.twitter.com",
    "tiktok.com", "www.tiktok.com",
    "facebook.com", "www.facebook.com", "m.facebook.com",
    "reddit.com", "www.reddit.com", "old.reddit.com"
]
```

### Feasibility
| Factor | Rating | Notes |
|--------|--------|-------|
| Technical | ⚠️ Medium | VPN APIs are complex |
| App Store Approval | ⚠️ Medium | Apple scrutinizes VPN apps |
| User Friction | ⚠️ Medium | VPN permission required |
| Coverage | ⚠️ Medium | Network traffic only |
| Intervention UI | ❌ None | Just blocks, no custom UI |

### Pros
- **Covers web AND in-app API calls**: Comprehensive blocking
- **Hard to bypass**: User must disable VPN
- **Cross-browser**: Works in Safari, Chrome, any app
- **Effective deterrent**: Apps become unusable when blocked

### Cons
- **No intervention UI**: Binary block, no mindfulness content
- **Battery drain**: VPN always running
- **Trust concerns**: Users wary of VPN apps
- **Blocks but doesn't educate**: Misses the mindfulness aspect
- **Doesn't work offline**: Cached content still accessible
- **App Store risk**: Apple may reject or remove

### What Competing Apps Do
- **Freedom**: Local VPN blocking, premium subscription
- **Opal**: Screen Time API + VPN combo
- **one sec**: Shortcuts-based (pre-iOS 15.4 design)
- **ScreenZen**: Android-only (uses AccessibilityService)

### Verdict
**Not recommended as primary approach** because it loses the core mindfulness intervention. Could be offered as "hard block" mode for users who want complete restriction.

---

## Approach 6: Focus Mode Integration

### Description
Leverage iOS Focus modes to create a "Mindful" focus that hides distracting apps and surfaces minded. Not an intervention system, but a proactive "mindful environment."

### Technical Implementation
minded can't programmatically create Focus modes, but can:
1. Guide users to create a "Mindful" focus
2. Provide Focus Filter extension for custom behavior
3. Show different UI when Focus is active

```swift
import Intents

// Check current Focus status
class FocusStatusProvider {
    func currentFocusStatus() async -> INFocusStatus {
        let status = INFocusStatusCenter.default.focusStatus
        return status
    }
}

// Focus Filter extension
class MindedFocusFilter: FocusFilterIntent {
    static var title: LocalizedStringResource = "Minded Mode"

    @Parameter(title: "Block Level")
    var blockLevel: BlockLevel

    func perform() async throws -> some IntentResult {
        // Apply settings based on Focus
    }
}
```

### Feasibility
| Factor | Rating | Notes |
|--------|--------|-------|
| Technical | ✅ High | Standard APIs |
| App Store Approval | ✅ High | Normal functionality |
| User Friction | ⚠️ Medium | Requires Focus setup |
| Coverage | ⚠️ Low | Preventive, not reactive |

### Verdict
**Supplementary feature only**. Focus modes are about prevention, not intervention. Good addition but doesn't solve core problem.

---

## Approach 7: Hybrid Strategy (Recommended)

### Description
Combine multiple approaches to maximize coverage while accepting iOS limitations:

### Tier 1: Primary Coverage
**Safari Web Extension** - Catches all web-based social media usage with full intervention experience.

### Tier 2: Native App Blocking
**Screen Time API** - Provides actual enforcement for native apps. Shield points users to minded for intervention.

### Tier 3: Habit Building
**Widget Launcher** - Offers mindful alternative for users who want positive friction without hard blocks.

### Tier 4: Optional Extras
- **Shortcuts guidance** - For power users who want automation
- **Focus mode integration** - For proactive blocking schedules
- **VPN blocking** - "Nuclear option" for users who want hard blocks

### Combined User Journey
```
Scenario A: User opens twitter.com in Safari
→ Safari Extension intercepts
→ Full intervention UI in webpage
→ Complete interaction → Access granted

Scenario B: User opens Twitter native app
→ Screen Time shield appears
→ User taps "Be Mindful First"
→ minded app opens
→ Complete intervention
→ minded removes shield temporarily
→ User returns to Twitter

Scenario C: User uses Widget Launcher
→ Taps Twitter in minded widget
→ minded shows intervention
→ Complete interaction
→ Redirects to Twitter app
```

### Implementation Priority

| Phase | Component | Effort | Impact |
|-------|-----------|--------|--------|
| 1 | Safari Web Extension | 2-3 weeks | High (web coverage) |
| 2 | Screen Time Integration | 4-6 weeks | High (native apps) |
| 3 | Widget Launcher | 2 weeks | Medium (habit building) |
| 4 | Focus Integration | 1 week | Low (supplementary) |
| 5 | Shortcuts Guide | 1 week | Low (power users) |

---

## Comparison Matrix

| Approach | Native Apps | Web | Intervention UI | Setup Friction | Bypass Risk | Effort |
|----------|-------------|-----|-----------------|----------------|-------------|--------|
| Safari Extension | ❌ | ✅ | ✅ Full | Medium | Low | Low |
| Shortcuts | ✅ | ❌ | ✅ Full | Very High | Very High | Low |
| Screen Time API | ✅ | ✅ | ❌ Limited | Low | Medium | High |
| Widget Launcher | ✅ | ❌ | ✅ Full | High | Very High | Low |
| VPN Blocking | ✅ | ✅ | ❌ None | Medium | Low | Medium |
| Focus Modes | ✅ | ✅ | ❌ None | Medium | High | Low |
| **Hybrid** | ✅ | ✅ | ⚠️ Varies | Medium | Medium | High |

---

## Recommendation

### Primary Strategy: Safari Extension + Screen Time API

1. **Safari Web Extension** for web coverage with full intervention UI
2. **Screen Time API** for native app coverage with redirect to minded

This provides:
- ✅ Coverage of both web and native app usage
- ✅ Real enforcement (can't easily bypass Screen Time)
- ✅ Full intervention experience for web
- ⚠️ Two-step intervention for native apps (acceptable tradeoff)

### Honest Limitations to Communicate to Users

The iOS version will never match Android's seamless experience because:
1. Apple doesn't allow apps to draw over other apps
2. Apple doesn't allow apps to detect other app usage
3. These are intentional privacy/security decisions by Apple

**Messaging**: "minded on iOS works differently than Android. For the best experience, we recommend using social media through Safari where our full interventions work. For native apps, we use Screen Time to pause you before opening, then guide you through a mindful check-in."

---

## Next Steps

1. **Validate Screen Time API approach** - Build prototype to confirm shield customization meets minimum requirements
2. **Port browser extension to Safari** - Leverage existing content script code
3. **Design two-step native flow** - UX for Screen Time shield → minded app → return
4. **User research** - Test hybrid approach with iOS users for acceptance

---

## Appendix: iOS Version Requirements

| Feature | Minimum iOS |
|---------|-------------|
| Safari Web Extension | iOS 15.0 |
| Screen Time API | iOS 15.0 |
| FamilyActivityPicker | iOS 15.0 |
| WidgetKit | iOS 14.0 |
| Focus Filters | iOS 16.0 |
| Lock Screen Widgets | iOS 16.0 |

**Recommended minimum**: iOS 15.0 (covers ~90% of active devices as of 2024)
