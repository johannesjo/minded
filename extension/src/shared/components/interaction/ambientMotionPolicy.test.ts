import { readFileSync } from "fs";
import { resolve } from "path";

import { PAGE_FADE_MS } from "@src/util/animation";

const readSource = (relativePath: string): string =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");

describe("calm motion policy", () => {
  it("keeps ambient companion surfaces still outside guided pauses", () => {
    const sunStyles = readSource(
      "src/shared/components/interaction/sun/Sun.scss",
    );
    const littleSunStyles = readSource(
      "src/shared/components/interaction/LittleSun.scss",
    );
    const questionStyles = readSource(
      "src/shared/components/interaction/Question.scss",
    );
    const routeStyles = readSource("src/shared/RouteCmp.module.scss");
    const routeComponent = readSource("src/shared/RouteCmp.tsx");
    const sunSettle = readSource(
      "src/shared/components/interaction/sun/sunSettle.ts",
    );
    const sunGlow = readSource(
      "src/shared/components/interaction/sun/sunAnimationUtils.ts",
    );
    const onboardingSunLayer = readSource(
      "src/shared/components/onboarding/OnboardingSunLayer.tsx",
    );
    const onboardingSunStyles = readSource(
      "src/shared/components/onboarding/onboardingSunLayer.module.scss",
    );

    expect(sunStyles).not.toContain("mindedSunIdleFloat");
    expect(sunStyles).not.toContain("mindedSunIdleBreath");
    expect(littleSunStyles).not.toContain("minded6622littleSunBreath");
    expect(questionStyles).not.toContain("tapHintBreathe");
    // The resting companion keeps its warm disc fill in CSS...
    expect(routeStyles).toMatch(
      /&\.isCompanion :global\(\.minded-sun:not\(\.moon\)\)\s*\{[\s\S]*--sun-bg:\s*radial-gradient/,
    );
    // ...but its amber glow now rides the one unified glow axis: the companion
    // settle opts into warmth 1 (statically - no breath), and warmth 1 maps to
    // the single canonical amber. No separate amber box-shadow declaration.
    expect(routeStyles).not.toMatch(/rgba\(255, 214, 115,/);
    expect(sunSettle).toMatch(/isCompanion:\s*true[\s\S]*warmth:\s*1/);
    expect(sunGlow).toMatch(/GLOW_AMBER_RGB[\s\S]*255,\s*214,\s*115/);
    expect(routeComponent).not.toContain("styles.isIntervention");
    expect(onboardingSunLayer).not.toContain("styles.isLeaving");
    expect(onboardingSunLayer).not.toContain("styles.isIntervention");
    expect(onboardingSunLayer).not.toContain("styles.isCompanion");
    expect(onboardingSunStyles).not.toMatch(
      /&\.isLeaving|&\.isIntervention|&\.isCompanion/,
    );
    expect(littleSunStyles).toMatch(
      /prefers-reduced-motion[\s\S]*#minded-6622-little-sun\s*\{[\s\S]*transition:\s*none/,
    );
    expect(questionStyles).toMatch(
      /prefers-reduced-motion[\s\S]*\.question-tap-hint\s*\{/,
    );
    expect(onboardingSunStyles).toMatch(
      /prefers-reduced-motion[\s\S]*\.sunLayer\s*\{[\s\S]*animation:\s*none/,
    );
  });

  it("reserves long motion for the sun instead of routine navigation", () => {
    const pageAnimationStyles = readSource("src/styles/mixins/_ani.scss");
    const androidOnboarding = readSource(
      "src/android/components/onboardingAndroid/OnboardingAndroid.tsx",
    );
    const iosOnboarding = readSource(
      "src/ios/components/onboardingIOS/OnboardingIOS.tsx",
    );

    expect(PAGE_FADE_MS).toBe(240);
    expect(pageAnimationStyles).toContain(
      "animation: minded6622fadeInScale var(--ease-out) 320ms",
    );
    expect(pageAnimationStyles).not.toContain("1000ms");
    expect(androidOnboarding).not.toContain("ENTRANCE_ANIMATION_MS");
    expect(iosOnboarding).not.toContain("ENTRANCE_ANIMATION_MS");
    expect(androidOnboarding).toContain('addEventListener("animationend"');
    expect(iosOnboarding).toContain('addEventListener("animationend"');
  });
});
