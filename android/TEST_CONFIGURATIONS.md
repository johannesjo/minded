# Android Studio Test Configurations

This document explains the test configurations available for the MyAccessibilityService tests.

## Available Run Configurations

After opening this project in Android Studio, you'll find the following test configurations in the run configuration dropdown (next to the green play button):

### 1. **All Unit Tests**
- Runs all unit tests in the `com.minded.minded` package
- Includes all test classes: ExampleUnitTest, MyAccessibilityServiceLogicTest, and MyAccessibilityServiceTest

### 2. **Unit Tests - MyAccessibilityService**
- Runs both MyAccessibilityService test classes
- Includes MyAccessibilityServiceLogicTest and MyAccessibilityServiceTest

### 3. **Logic Tests Only**
- Runs only MyAccessibilityServiceLogicTest
- Tests core logic without Android framework dependencies
- Tests: manufacturer detection, window validation, launcher detection

### 4. **Service Tests Only**
- Runs only MyAccessibilityServiceTest
- Tests constants and patterns used in the service

### 5. **Test Single Method: Manufacturer Detection**
- Example of running a single test method
- Runs only the manufacturer-specific system package detection test

## How to Use

1. Open the project in Android Studio
2. Wait for the project to sync
3. In the toolbar, find the dropdown menu next to the green "Run" button
4. Select one of the configurations listed above
5. Click the green "Run" button or press Shift+F10

## Running Tests from Terminal

You can also run these tests from the terminal:

```bash
# Navigate to android directory
cd android

# Run all tests
./gradlew :app:testDebugUnitTest

# Run specific test class
./gradlew :app:testDebugUnitTest --tests "com.minded.minded.MyAccessibilityServiceLogicTest"

# Run specific test method
./gradlew :app:testDebugUnitTest --tests "com.minded.minded.MyAccessibilityServiceLogicTest.test manufacturer-specific system package detection logic"

# Run with detailed output
./gradlew :app:testDebugUnitTest --info
```

## Test Coverage

The tests cover:
- Dynamic launcher detection
- System app detection
- Manufacturer-specific handling (Samsung, Xiaomi, OnePlus, etc.)
- Window validation logic
- Transition pattern constants
- Cache duration settings

## Viewing Test Results

After running tests:
- In Android Studio: Results appear in the "Run" tab at the bottom
- HTML Report: `android/app/build/reports/tests/testDebugUnitTest/index.html`
- XML Results: `android/app/build/test-results/testDebugUnitTest/`