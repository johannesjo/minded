# MyAccessibilityService.kt Improvement List

## Current Issues Analysis

After thorough analysis of `MyAccessibilityService.kt`, here are the key issues that need to be addressed for better app detection and launcher exclusion:

### 1. **Incomplete Launcher Detection** (Lines 144-149)
- Current detection is too simplistic using string matching
- Missing many popular launchers (Samsung One UI, MIUI, etc.)
- No dynamic detection of installed launchers
- Should query PackageManager for actual launcher apps

### 2. **Hardcoded System Package List** (Lines 108-142)
- Static list that may not cover all devices
- Missing manufacturer-specific system apps
- No way to update without code changes
- Should use PackageManager queries and system app flags

### 3. **Basic Debouncing Logic** (Lines 204-235)
- Simple time-based approach (500ms)
- Doesn't consider app transition patterns
- Can miss legitimate quick app switches
- Should track transition sequences instead

### 4. **Limited Package History Usage** (Lines 197-202)
- Collects history but barely uses it
- Only checks for repeated packages in one scenario
- Could analyze patterns for better detection
- Should use for transition pattern recognition

### 5. **No Verification of Genuine App Switches**
- Doesn't verify if app actually came to foreground
- Can trigger on partial UI changes
- Should check window focus and content
- Missing validation of event context

### 6. **Poor Handling of Rapid Events**
- No event deduplication
- Can process multiple events for same transition
- Should batch and process events intelligently

### 7. **Missing Edge Cases**
- Split-screen mode not handled
- Picture-in-picture transitions ignored
- App shortcuts and widgets can cause false positives
- Notification shade interactions not filtered

### 8. **No Confidence Scoring**
- Binary decision (show/don't show)
- No uncertainty handling
- Should have confidence levels for decisions

## Implementation Priority List

### Priority 1: Dynamic Launcher Detection
- Query PackageManager for all apps that handle ACTION_MAIN with CATEGORY_HOME
- Cache results with periodic refresh
- Include manufacturer-specific launchers

### Priority 2: Enhanced System App Detection
- Use PackageManager.getApplicationInfo() with FLAG_SYSTEM
- Check for system UID ranges
- Maintain allowlist of user apps that look like system apps

### Priority 3: Transition Pattern Recognition
- Track sequences of package changes
- Identify common patterns (launcher → app, app → recent → app, etc.)
- Use state machine for transition detection

### Priority 4: Event Context Analysis
- Check event.getSource() for window type
- Verify className indicates main activity
- Use event.getContentDescription() for additional context

### Priority 5: Smart Debouncing
- Replace time-based with pattern-based debouncing
- Consider event sequences not just timing
- Allow quick switches for certain patterns

### Priority 6: History-Based Filtering
- Use package history to identify bouncing patterns
- Detect and filter notification shade pulls
- Recognize task switcher usage

### Priority 7: Manufacturer-Specific Handling
- Detect device manufacturer
- Apply specific rules for Samsung, Xiaomi, etc.
- Handle custom UI elements

### Priority 8: Testing and Metrics
- Add debug logging for analysis
- Track detection accuracy
- Implement self-learning improvements

## Code Quality Improvements

### 1. **Extract Constants**
- Move all magic numbers to companion object
- Name all string patterns clearly
- Group related constants

### 2. **Separate Concerns**
- Extract detection logic to separate classes
- Create dedicated PackageFilter class
- Implement TransitionDetector class

### 3. **Improve Error Handling**
- Add specific exception types
- Implement retry logic properly
- Log errors with context

### 4. **Add Documentation**
- Document complex logic
- Add examples for edge cases
- Explain debouncing strategy

## Next Steps

1. Start with Priority 1 (Dynamic Launcher Detection)
2. Test each improvement thoroughly
3. Commit after each successful implementation
4. Monitor for regressions
5. Gather metrics on detection accuracy