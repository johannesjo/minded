# Android App Detection Flow

This document explains how the minded Android app detects foreground app changes and decides when to show/hide the intervention overlay.

## High-Level Overview

```mermaid
flowchart TB
    subgraph Android["Android System"]
        A11Y[/"TYPE_WINDOW_STATE_CHANGED<br/>Accessibility Events"/]
        USAGE[/"UsageStatsManager<br/>Query every 500ms"/]
    end

    subgraph Detection["Detection Layer"]
        AS[MyAccessibilityService]
        HD[HybridAppDetector]
        HM[ServiceHealthMonitor]
    end

    subgraph Decision["Decision Layer"]
        OCS[OverlayControllerService]
    end

    subgraph UI["UI Layer"]
        INT[Intervention Overlay]
        SUN[Little Sun Overlay]
        HIDE[Hidden]
    end

    A11Y --> AS
    USAGE --> HD
    AS --> HD
    HD --> HM
    HD -->|validatedDetections| OCS
    AS -->|hideOverlayForBackgroundedApp| OCS
    OCS --> INT
    OCS --> SUN
    OCS --> HIDE
```

## Detailed AccessibilityService Flow

```mermaid
flowchart TD
    START((Accessibility<br/>Event)) --> EXTRACT[Extract packageName,<br/>className, eventText]

    EXTRACT --> CHECK_LEAVE{Leaving blocked app<br/>or overlay?}

    CHECK_LEAVE -->|Yes| CHECK_DEST{Destination is<br/>system/launcher?}
    CHECK_DEST -->|Yes, overlay-compatible| KEEP[Keep overlay visible]
    CHECK_DEST -->|Yes, not compatible| HIDE_BG[hideOverlayForBackgroundedApp]
    CHECK_DEST -->|No, user app| TRIGGER_SWITCH[triggerOverlay<br/>UPDATED FIX]

    CHECK_LEAVE -->|No| CHECK_SYSUI{Coming from<br/>SystemUI?}

    CHECK_SYSUI -->|Yes, non-launcher<br/>to user app| TRIGGER_SYSUI[triggerOverlay<br/>NEW FIX]
    CHECK_SYSUI -->|No| CONTINUE

    KEEP --> CONTINUE
    TRIGGER_SWITCH --> CONTINUE
    HIDE_BG --> CONTINUE
    TRIGGER_SYSUI --> CONTINUE

    CONTINUE --> IS_SYS{Is system<br/>package?}
    IS_SYS -->|Yes| UPDATE_LAST[Update lastPackageName]
    UPDATE_LAST --> RETURN1((Return))

    IS_SYS -->|No| VALID_WIN{isValidAppWindow?}
    VALID_WIN -->|No| RETURN2((Return))

    VALID_WIN -->|Yes| TRACK[trackTransition]
    TRACK --> PATTERN[analyzeTransitionPattern]
    PATTERN --> SHOULD{shouldTriggerOverlay<br/>WithConfidence?}

    SHOULD -->|Yes| HYBRID[Send to HybridAppDetector]
    SHOULD -->|No| FILTERED[Filtered out]

    HYBRID --> UPDATE_LAST2[Update lastPackageName]
    FILTERED --> UPDATE_LAST2
    UPDATE_LAST2 --> END1((End))
```

## Pattern Detection Logic

```mermaid
flowchart TD
    START((Analyze<br/>Pattern)) --> EMPTY{History<br/>empty?}

    EMPTY -->|Yes| FIRST[FIRST_APP_LAUNCH]
    EMPTY -->|No| NOTIF{Notification<br/>shade pattern?}

    NOTIF -->|Yes| NOTIF_PULL[NOTIFICATION_PULL]
    NOTIF -->|No| RECENTS{Recents<br/>browsing?}

    RECENTS -->|Yes| REC_BROWSE[RECENTS_BROWSING]
    RECENTS -->|No| QS{Quick settings<br/>pattern?}

    QS -->|Yes| QS_PULL[QUICK_SETTINGS_PULL]
    QS -->|No| LAUNCHER{From launcher<br/>within 2s?}

    LAUNCHER -->|Yes| LAUNCH_APP[LAUNCHER_TO_APP]
    LAUNCHER -->|No| VIA_LAUNCH{App → Launcher<br/>→ App within 3s?}

    VIA_LAUNCH -->|Yes| APP_VIA[APP_SWITCH_VIA_LAUNCHER]
    VIA_LAUNCH -->|No| DIRECT{Direct app switch<br/>within 1s?}

    DIRECT -->|Yes| DIRECT_SW[DIRECT_APP_SWITCH]
    DIRECT -->|No| RETURN{Returning to<br/>same app?}

    RETURN -->|Yes| RETURN_APP[RETURNING_TO_APP]
    RETURN -->|No| UNKNOWN[UNKNOWN]

    subgraph Triggers["Triggers Overlay Check"]
        FIRST
        LAUNCH_APP
        APP_VIA
        DIRECT_SW
        UNKNOWN
    end

    subgraph NoTrigger["Does NOT Trigger"]
        NOTIF_PULL
        REC_BROWSE
        QS_PULL
        RETURN_APP
    end
```

## HybridAppDetector Validation Flow

```mermaid
flowchart TD
    START((Accessibility<br/>Event)) --> RECORD[Record event in<br/>HealthMonitor]

    RECORD --> MODE{In fallback<br/>mode?}
    MODE -->|Yes| SWITCH[Switch back to<br/>hybrid mode]
    MODE -->|No| CONTINUE
    SWITCH --> CONTINUE

    CONTINUE --> CONF{Pattern<br/>confidence?}

    CONF -->|HIGH ≥0.8| EMIT_NOW[Emit immediately]
    CONF -->|MEDIUM/LOW| VALIDATE[Validate with UsageStats]

    VALIDATE --> QUERY[getForegroundAppReliable]

    QUERY --> RESULT{UsageStats<br/>result?}

    RESULT -->|Success, matches| VALIDATED[HIGH confidence<br/>Cross-validated]
    RESULT -->|Success, differs| RETRY{Retry?}
    RESULT -->|Stale| RETRY
    RESULT -->|No permission| USE_INITIAL[Use initial<br/>confidence]
    RESULT -->|Error| USE_INITIAL

    RETRY -->|Yes, first try| DELAY[Delay 150ms]
    DELAY --> QUERY
    RETRY -->|No, already retried| DISCREPANCY[Log discrepancy]
    DISCREPANCY --> USE_LOW[LOW confidence]

    VALIDATED --> EMIT
    USE_INITIAL --> CHECK_LEVEL
    USE_LOW --> CHECK_LEVEL

    CHECK_LEVEL{Confidence<br/>level?}
    CHECK_LEVEL -->|HIGH/MEDIUM| EMIT
    CHECK_LEVEL -->|LOW| DELAY_MORE[Delay 300ms]
    DELAY_MORE --> REVALIDATE[Revalidate]
    REVALIDATE --> EMIT_OR_REJECT{Result?}
    EMIT_OR_REJECT -->|Not VERY_LOW| EMIT
    EMIT_OR_REJECT -->|VERY_LOW| REJECT[Detection rejected]
    CHECK_LEVEL -->|VERY_LOW| REJECT

    EMIT_NOW --> TRIGGER[triggerOverlay]
    EMIT --> TRIGGER

    TRIGGER --> OCS((OverlayController<br/>Service))
```

## UsageStats Fallback Detection

```mermaid
flowchart TD
    START((Poll every<br/>500ms)) --> QUERY[getForegroundAppReliable]

    QUERY --> RESULT{Result?}

    RESULT -->|Success| CHANGED{App<br/>changed?}
    RESULT -->|Stale| RECORD[Record package]
    RESULT -->|Error/NoPermission| SKIP[Skip]

    CHANGED -->|No| SKIP
    CHANGED -->|Yes| MODE{Detection<br/>mode?}

    MODE -->|FALLBACK| EMIT_FALLBACK[Emit fallback<br/>detection]
    MODE -->|HYBRID| CHECK_MISS{Missed by<br/>A11y service?}

    CHECK_MISS --> CALC[Calculate time since<br/>last A11y event]
    CALC --> THRESHOLD{> 800ms?}

    THRESHOLD -->|No| SKIP
    THRESHOLD -->|Yes| BLOCKED{Is app<br/>blocked?}

    BLOCKED -->|Yes| EMIT_FALLBACK
    BLOCKED -->|No| SKIP2[Skip non-blocked]

    EMIT_FALLBACK --> OCS((OverlayController<br/>Service))

    RECORD --> NEXT((Next poll))
    SKIP --> NEXT
    SKIP2 --> NEXT
```

## OverlayControllerService Decision Logic

```mermaid
flowchart TD
    START((onStartCommand)) --> TYPE{Intent type?}

    TYPE -->|HIDE_OVERLAY| HIDE_ALL[hideAllBut - hide all overlays]
    TYPE -->|CURRENT_PACKAGE| CHECK[checkToShowOverlay]
    TYPE -->|SHOW/HIDE specific| SPECIFIC[Show/hide specific overlay]

    CHECK --> OWN{Our own<br/>package?}
    OWN -->|Yes| SKIP1((Skip))

    OWN -->|No| DEBOUNCE{Recently<br/>hid all?}
    DEBOUNCE -->|Yes, <500ms| SKIP2((Skip))

    DEBOUNCE -->|No| BLOCKED{Is package<br/>blocked?}

    BLOCKED -->|No| HIDE_ALL2[hideAllBut]
    BLOCKED -->|Yes| LAUNCHER{Is launcher<br/>package?}

    LAUNCHER -->|Yes| HIDE_ALL3[hideAllBut]
    LAUNCHER -->|No| SHOWING{Overlay already<br/>showing?}

    SHOWING -->|Yes| SKIP3((Skip - already visible))
    SHOWING -->|No| SESSION{Active<br/>session?}

    SESSION -->|Yes, timer running| SHOW_SUN[Show Little Sun]
    SESSION -->|No| SHOW_INT[Show Intervention]

    HIDE_ALL --> END1((End))
    HIDE_ALL2 --> END2((End))
    HIDE_ALL3 --> END3((End))
    SHOW_SUN --> END4((End))
    SHOW_INT --> END5((End))
```

## Complete End-to-End Flow Example

### Scenario: User opens blocked app (YouTube) from launcher

```mermaid
sequenceDiagram
    participant Android as Android System
    participant A11Y as AccessibilityService
    participant HD as HybridAppDetector
    participant OCS as OverlayControllerService
    participant UI as Overlay UI

    Android->>A11Y: TYPE_WINDOW_STATE_CHANGED<br/>(YouTube)
    A11Y->>A11Y: Not leaving blocked app
    A11Y->>A11Y: isSystemPackage? No
    A11Y->>A11Y: isValidAppWindow? Yes
    A11Y->>A11Y: trackTransition
    A11Y->>A11Y: analyzeTransitionPattern<br/>→ LAUNCHER_TO_APP
    A11Y->>A11Y: shouldTrigger? Yes (0.95 confidence)
    A11Y->>HD: onAccessibilityEvent(YouTube, LAUNCHER_TO_APP, 0.95)
    HD->>HD: HIGH confidence → emit immediately
    HD->>OCS: validatedDetection(YouTube)
    OCS->>OCS: checkToShowOverlay(YouTube)
    OCS->>OCS: isBlocked? Yes
    OCS->>OCS: Active session? No
    OCS->>UI: Show Intervention Overlay
```

### Scenario: User opens WhatsApp from notification (THE BUG FIX)

```mermaid
sequenceDiagram
    participant Android as Android System
    participant A11Y as AccessibilityService
    participant OCS as OverlayControllerService
    participant UI as Overlay UI

    Note over UI: Intervention showing for YouTube

    Android->>A11Y: TYPE_WINDOW_STATE_CHANGED<br/>(SystemUI - notification shade)
    A11Y->>A11Y: lastPackageName = YouTube
    A11Y->>A11Y: isLeavingBlockedApp? Yes
    A11Y->>A11Y: isOverlayCompatibleSystemUI? Yes
    A11Y->>A11Y: Keep overlay visible
    A11Y->>A11Y: isSystemPackage? Yes → return
    A11Y->>A11Y: lastPackageName = SystemUI

    Note over A11Y: User taps WhatsApp notification

    Android->>A11Y: TYPE_WINDOW_STATE_CHANGED<br/>(WhatsApp)
    A11Y->>A11Y: lastPackageName = SystemUI
    A11Y->>A11Y: isLeavingBlockedApp? No (SystemUI is system)
    A11Y->>A11Y: NEW CHECK: Coming from non-launcher<br/>SystemUI to user app?
    A11Y->>A11Y: Yes! Trigger overlay check
    A11Y->>OCS: triggerOverlay(WhatsApp)
    OCS->>OCS: checkToShowOverlay(WhatsApp)
    OCS->>OCS: isBlocked(WhatsApp)? No
    OCS->>OCS: hideAllBut()
    OCS->>UI: Hide all overlays

    Note over UI: Overlay hidden, WhatsApp visible
```

## Confidence Levels

| Level | Score Range | Action |
|-------|-------------|--------|
| HIGH | ≥ 0.8 | Act immediately, no validation needed |
| MEDIUM | 0.5 - 0.79 | Validate with UsageStats, act if confirmed |
| LOW | 0.3 - 0.49 | Validate, retry after 300ms if uncertain |
| VERY_LOW | < 0.3 | Ignore detection |

## Pattern Confidence Scores

| Pattern | Confidence | Triggers Overlay? |
|---------|------------|-------------------|
| FIRST_APP_LAUNCH | 0.95 | Yes |
| LAUNCHER_TO_APP | 0.95 | Yes |
| APP_SWITCH_VIA_LAUNCHER | 0.90 | Yes |
| DIRECT_APP_SWITCH | 0.85 | Yes |
| UNKNOWN | 0.50 | Depends on validation |
| RETURNING_TO_APP | 0.20 | No |
| NOTIFICATION_PULL | 0.15 | No |
| QUICK_SETTINGS_PULL | 0.15 | No |
| RECENTS_BROWSING | 0.10 | No |
