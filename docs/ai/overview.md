# Minded - Technical Overview

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technical Stack](#technical-stack)
3. [Architecture](#architecture)
4. [Core Features](#core-features)
5. [Platform Implementations](#platform-implementations)
6. [Technical Implementation Details](#technical-implementation-details)
7. [Development Practices](#development-practices)
8. [Future Considerations](#future-considerations)

## Project Overview

**Minded** is a multi-platform mindfulness and productivity application designed to help users combat social media addiction, doom-scrolling, and procrastination. Instead of simply blocking distracting websites and apps, Minded presents users with interactive mindfulness exercises, encouraging self-reflection and healthier digital habits.

### Target Platforms
- **Browser Extension**: Chrome and Firefox (Manifest V3)
- **Android App**: Native Kotlin with WebView for UI
- **iOS App**: Native Swift with Capacitor integration

### Core Philosophy
The application follows a "pause and reflect" approach, intercepting potentially addictive behaviors and replacing them with moments of mindfulness, self-assessment, and positive reinforcement.

## Technical Stack

### Core Technologies
- **[SolidJS](https://www.solidjs.com/)** (v1.8.15): Reactive UI framework with fine-grained reactivity
- **[TypeScript](https://www.typescriptlang.org/)**: Type-safe JavaScript (strict mode recommended but not enforced)
- **[Vite](https://vitejs.dev/)**: Modern build tool with hot module replacement
- **[SCSS/Sass](https://sass-lang.com/)**: CSS preprocessing for better style organization

### Platform-Specific Technologies

#### Browser Extension
- **[CRXJS Vite Plugin](https://crxjs.dev/)**: Chrome extension development with Vite
- **[webextension-polyfill](https://github.com/mozilla/webextension-polyfill)**: Cross-browser extension API compatibility
- **Manifest V3**: Modern Chrome extension architecture with service workers

#### Android
- **Kotlin**: Native Android development
- **Jetpack Compose**: Modern Android UI toolkit for overlay components
- **WebView**: Hosts the SolidJS application
- **AccessibilityService**: Detects foreground applications
- **WindowManager**: System-level overlay windows

#### iOS
- **Swift**: Native iOS development
- **[Capacitor](https://capacitorjs.com/)**: Native runtime bridge
- **WKWebView**: WebKit-based web view for hosting the app

### Key Dependencies
```json
{
  "solid-js": "^1.8.15",
  "@solidjs/router": "^0.8.2",
  "chart.js": "^4.4.3",
  "solid-chartjs": "^1.3.9",
  "parse-domain": "^8.2.2",
  "nanoid": "^5.0.7"
}
```

## Architecture

### Project Structure
```
minded/
├── extension/                    # Main project root
│   ├── src/
│   │   ├── android/             # Android-specific code
│   │   ├── ios/                 # iOS-specific code
│   │   ├── pages/               # Browser extension pages
│   │   │   ├── background/      # Service worker
│   │   │   ├── content/         # Content script
│   │   │   ├── popup/           # Extension popup
│   │   │   ├── newtab/          # New tab override
│   │   │   └── options/         # Settings page
│   │   ├── shared/              # Cross-platform code
│   │   │   ├── components/      # UI components
│   │   │   ├── data/            # Static data
│   │   │   └── util/            # Utilities
│   │   ├── dataInterface/       # Platform abstraction
│   │   ├── assets/              # Images and icons
│   │   └── styles/              # Global styles
│   ├── dist/                    # Browser extension build
│   ├── distIOS/                 # iOS build output
│   └── vite.config.ts           # Build configuration
├── android/                     # Native Android app
└── ios/                         # Native iOS app
```

### Platform Abstraction Pattern

The application uses a **DataInterface pattern** to abstract platform-specific implementations:

```typescript
// Common interface definition
interface CommonSyncDataInterface {
  getSyncData(): Promise<SyncData>
  setSyncData(data: SyncData): Promise<void>
  // ... other methods
}

// Platform-specific implementations
// @dataInterface alias resolves to:
// - src/dataInterface/extension/ (browser)
// - src/dataInterface/android/ (Android)
// - src/dataInterface/ios/ (iOS)
```

This pattern enables ~80% code reuse across platforms while maintaining platform-specific optimizations.

### Build System

Vite handles multi-platform builds through different modes:

1. **Default Mode** (Browser Extension)
   ```bash
   npm start  # Development with HMR
   npm run build  # Production build → dist/
   ```

2. **Android Mode**
   ```bash
   npm run startDroid  # Development
   npm run buildDroid  # Production → android/app/src/main/assets/web/
   ```

3. **iOS Mode**
   ```bash
   npm run startIOS  # Development
   npm run buildIOS  # Production → distIOS/
   ```

### State Management

The application uses a hybrid approach to state management:

1. **Local Component State**: SolidJS signals for UI state
   ```typescript
   const [mood, setMood] = createSignal<Mood>('OK')
   ```

2. **Global Application State**: Platform storage via DataInterface
   ```typescript
   const syncData = await getSyncData()
   await setSyncData(updatedData)
   ```

3. **Cross-Component Communication**: Custom browser events
   ```typescript
   window.dispatchEvent(new CustomEvent('REFRESH_DASHBOARD_EV'))
   ```

## Core Features

### 1. Mindfulness Interactions

When users visit blocked sites or apps, they're presented with various interactive exercises:

- **Reflective Questions**: 500+ prompts across 16 categories
  - Gratitude
  - Self-discovery
  - Motivation
  - Life philosophy
  - And more...

- **Mood Check-ins**: Track emotional state with optional journaling
- **Energy Level Rating**: 5-star scale for daily energy tracking
- **Emoji Check-ins**: Quick emotional state capture
- **Self-Assessment**: Rate different aspects of well-being
- **Breathing Exercises**: Guided breathing animations
- **Action Advice**: Motivational suggestions
- **Alternative Activities**: Healthier website/app suggestions

### 2. Gesture-Based Controls

Recent updates introduced sophisticated gesture interactions:

```typescript
// Sun component supports:
- Swipe Up: Complete with "good" outcome (blue sky animation)
- Swipe Down: Complete with "neutral" outcome (sunset animation)
- Tap 3x: Continue (opens next step)
- Visual Feedback: Real-time gradient transitions based on drag
```

### 3. Dashboard Analytics

Comprehensive overview of user's mindfulness journey:
- Answer history by category
- Mood tracking visualization
- Energy level trends
- Browsing behavior ratings
- "Minded decisions" counter
- Random motivational quotes

### 4. Website/App Blocking

**Browser Extension**:
- Content script injection on blocked domains
- Tab management and redirection
- Background service worker for persistence

**Android**:
- AccessibilityService monitors foreground apps
- System overlay shows interactions
- Foreground service ensures reliability

## Platform Implementations

### Browser Extension

**Architecture**:
```
Content Script (injected) ←→ Background Script (service worker)
       ↓                            ↓
  Interaction UI              Tab Management
                              Storage Sync
```

**Key Components**:
- `content-script.tsx`: Injected into blocked pages, renders overlay
- `background.ts`: Service worker handling tab events and storage
- `Popup.tsx`: Extension popup with dashboard
- `manifest.ts`: Chrome Extension Manifest V3 configuration

### Android Application

**Native Architecture**:
```
MainActivity
    ↓
WebView (SolidJS App)
    ↓
JavaScript Interface
    ↓
Native Services:
- AccessibilityService (app detection)
- OverlayControllerService (floating UI)
- MyForegroundService (reliability)
```

**Overlay System**:
- **LittleSun**: Draggable sun icon (Jetpack Compose)
- **SmallMsg**: Toast-like messages
- **SuccessSun**: Completion animation

### iOS Application

**Capacitor Integration**:
```
Swift App Shell
    ↓
Capacitor Bridge
    ↓
WKWebView (SolidJS App)
    ↓
Native Plugins
```

## Technical Implementation Details

### Data Storage Model

```typescript
interface SyncData {
  answers: { [questionId: string]: Answer }
  blockedSites: string[]
  alternatives: Alternative[]
  sunTapBurst: number
  attemptCnt: number
  setting_threshold: number
  // ... more fields
}
```

### Interaction Selection Algorithm

```typescript
// Simplified algorithm in getInteractionMode.ts
function getInteractionMode(props: ModeProps): InteractionMode {
  // Currently forced to QUESTION for testing
  // Normal flow uses weighted random selection based on:
  // - Time since last interaction type
  // - Time of day
  // - User history
  // - Platform constraints
}
```

### Question Selection Logic

```typescript
// getQuestionSmart function considerations:
1. Category frequency modifiers
2. Time-based filters (morning/evening questions)
3. Platform limitations
4. Previous answer avoidance
5. Randomization with weights
```

### Performance Optimizations

1. **Lazy Loading**: Charts loaded on-demand
2. **Responsive Sizing**: Adaptive UI based on screen size
3. **Animation Optimization**: RequestAnimationFrame for smooth transitions
4. **Storage Quotas**: Automatic cleanup when hitting browser limits
5. **Debouncing**: Prevents excessive function calls

## Development Practices

### Code Style Guidelines

Per CLAUDE.md instructions:
- **Functional over OOP**: Pure functions and composition preferred
- **No class inheritance**: Use composition and factory functions
- **TypeScript strict typing**: Prefer `unknown` over `any`
- **Immutability**: `const` over `let`, never `var`
- **Semantic HTML**: Proper tags over div soup
- **Comments**: Explain "why" not "how"

### Testing Strategy

**Current State**:
- Jest configured but no tests implemented
- Manual testing approach
- No coverage requirements

**Recommended Improvements**:
- Unit tests for core algorithms
- Integration tests for platform interfaces
- E2E tests for critical user flows

### Error Handling

Patterns used throughout:
```typescript
try {
  const data = await getSyncData()
  // Process data
} catch (error) {
  console.error('Failed to load data:', error)
  // Fallback to defaults
}
```

### Security & Privacy

- **Local-only storage**: No external servers or analytics
- **No tracking**: Complete user privacy
- **Platform isolation**: DataInterface prevents cross-platform data leaks
- **Content sanitization**: HTML escaping for user input

## Future Considerations

### Technical Debt

1. **Missing Tests**: No automated testing infrastructure
2. **Console Logs**: Debug statements in production code
3. **TODO Comments**: Incomplete features marked throughout
4. **Commented Code**: Old implementations not removed
5. **TypeScript Strict Mode**: Currently disabled

### Potential Improvements

1. **Accessibility**:
   - Add ARIA labels and roles
   - Implement keyboard navigation
   - Support screen readers
   - High contrast mode

2. **Internationalization**:
   - Extract hardcoded strings
   - Implement i18n framework
   - Support multiple languages

3. **Performance**:
   - Implement virtual scrolling for long lists
   - Add service worker caching
   - Optimize bundle sizes

4. **Features**:
   - Cloud sync across devices
   - Advanced analytics
   - Social features (anonymous sharing)
   - Custom interaction creation

### Architecture Evolution

Consider:
- Migrating to a monorepo structure
- Implementing a proper state management solution
- Adding a backend for advanced features
- Creating a design system for consistent UI

## Conclusion

Minded represents a well-architected multi-platform application that successfully balances code reuse with platform-specific optimizations. The DataInterface pattern provides clean separation of concerns, while SolidJS offers excellent performance for reactive UI updates.

The application's focus on mindfulness and digital wellness is implemented through thoughtful interactions and gentle nudges rather than harsh blocking. With proper testing infrastructure and accessibility improvements, Minded could serve as an excellent example of modern cross-platform development using web technologies.
