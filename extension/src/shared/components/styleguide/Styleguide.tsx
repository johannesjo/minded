import {
  createEffect,
  createMemo,
  createSignal,
  For,
  JSX,
  onCleanup,
  onMount,
  Show,
} from "solid-js";

import { Checkbox } from "@src/shared/components/ui/Checkbox";
import { Toggle } from "@src/shared/components/ui/Toggle";
import TglBtns from "@src/shared/components/ui/TglBtns";
import { TextInput } from "@src/shared/components/ui/TextInput";
import { TimeInput } from "@src/shared/components/ui/TimeInput";
import { InputWithSend } from "@src/shared/components/ui/InputWithSend";
import Rating from "@src/shared/components/ui/Rating";
import { Stepper } from "@src/shared/components/ui/Stepper";
import { Toast } from "@src/shared/components/ui/Toast";
import { Ico, IcoName } from "@src/shared/components/ui/Ico";
import ButtonWrapper from "@src/shared/components/ui/ButtonWrapper";
import Btn from "@src/shared/components/ui/Btn";
import Chart from "@src/shared/components/ui/Chart";

import BreathingExercise from "@src/shared/components/interaction/breathingExercise/BreathingExercise";
import { NoticeInteraction } from "@src/shared/components/interaction/notice/NoticeInteraction";
import { IntentSelection } from "@src/shared/components/interaction/intentSelection/IntentSelection";
import Sun from "@src/shared/components/interaction/sun/Sun";
import {
  getSunSettleForPhase,
  restingSunAnchorFromRect,
  sunRestingSettle,
  type SunPhase,
} from "@src/shared/components/interaction/sun/sunSettle";
import { setBreathStartedAt } from "@src/shared/components/interaction/sun/sunStore";
import BackgroundTransition from "@src/shared/components/interaction/backgroundTransition/BackgroundTransition";
import { StrongFrictionBreathPause } from "@src/shared/components/interaction/breathPause/StrongFrictionBreathPause";
import { GroundingOverlay } from "@src/shared/components/interaction/grounding/GroundingOverlay";
import { LetGoOverlay } from "@src/shared/components/interaction/letGo/LetGoOverlay";
import { STRONG_FRICTION_BREATH_PAUSE_SECONDS } from "@src/shared/components/interaction/postSunPause";
import { prefersReducedMotion } from "@src/util/prefersReducedMotion";
import {
  AMBIENT_SKY_KEYFRAMES,
  ambientSkyColorsAt,
  ambientSkyGradient,
  duskTargetGradientAt,
  NIGHT_END_HOUR,
  NIGHT_START_HOUR,
  zenithTargetGradientAt,
} from "@src/shared/skyTimeline";
import {
  applySkyAtHour,
  applySkyForNow,
  getEffectiveHourNow,
} from "@src/shared/addWrapperClasses";

// @ts-ignore
import styles from "./styleguide.module.scss";
import SunWidgetGallery from "./SunWidgetGallery";

const ROOT_ID = "minded-6622";
const DARK_CLASS = "minded-6622-dark";

const COLOR_TOKENS = [
  "--c-fg",
  "--c-fg-full-emphasis",
  "--c-link-color",
  "--btn-bg",
  "--btn-bg-not-selected",
  "--btn-bg-selected",
  "--btn-bg-selectable-hover",
  "--btn-outline-color",
  "--form-inputs-bg",
  "--bottom-bar-bg",
  "--dashboard-card-bg",
  "--dashboard-card-bg-hover",
  "--c-graph-fg-full",
  "--c-graph-fg-less",
  "--c-gradient-1",
  "--c-gradient-2",
  "--c-gradient-3",
  "--c-gradient-4",
] as const;

const FONT_TOKENS = [
  "--fz-xxl",
  "--fz-xl",
  "--fz-l",
  "--fz-m",
  "--fz-s",
] as const;

const ICO_NAMES: IcoName[] = [
  "settings",
  "askQuestion",
  "feedback",
  "close",
  "send",
  "questionExchange",
  "add",
  "arrowBack",
  "delete",
  "deleteForever",
  "edit",
  "pen",
  "info",
  "check",
];

const TOC = [
  { id: "flags", label: "Theme & flags" },
  { id: "colors", label: "Colors" },
  { id: "sky", label: "Sky" },
  { id: "typography", label: "Typography" },
  { id: "buttons", label: "Buttons" },
  { id: "inputs", label: "Inputs" },
  { id: "selectors", label: "Selectors" },
  { id: "indicators", label: "Indicators" },
  { id: "icons", label: "Icons" },
  { id: "chart", label: "Chart" },
  { id: "interactions", label: "Interactions" },
  { id: "sun-widget", label: "Sun widget" },
];

const getRoot = () => document.getElementById(ROOT_ID);

const readVar = (name: string): string => {
  const root = getRoot();
  if (!root) return "";
  return getComputedStyle(root).getPropertyValue(name).trim();
};

const Styleguide = (): JSX.Element => {
  const root = getRoot();
  const originalDark = root?.classList.contains(DARK_CLASS) ?? false;
  const [isDark, setIsDark] = createSignal(originalDark);
  const themeKey = () => (isDark() ? "dark" : "light");

  createEffect(() => {
    getRoot()?.classList.toggle(DARK_CLASS, isDark());
  });

  onCleanup(() => {
    getRoot()?.classList.toggle(DARK_CLASS, originalDark);
  });

  // Re-read CSS vars when the theme toggles.
  const [tokenSnapshot, setTokenSnapshot] = createSignal(0);
  createEffect(() => {
    isDark();
    requestAnimationFrame(() => setTokenSnapshot((n) => n + 1));
  });
  const colorEntries = createMemo(() => {
    tokenSnapshot();
    return COLOR_TOKENS.map((name) => ({ name, value: readVar(name) }));
  });
  const fontEntries = createMemo(() => {
    tokenSnapshot();
    return FONT_TOKENS.map((name) => ({ name, value: readVar(name) }));
  });

  const wrapperClasses = createMemo(() => {
    tokenSnapshot();
    const r = getRoot();
    return r ? Array.from(r.classList) : [];
  });

  const [toastVisible, setToastVisible] = createSignal(false);
  const [stepperStep, setStepperStep] = createSignal(1);
  const [checkboxOn, setCheckboxOn] = createSignal(true);
  const [toggleOn, setToggleOn] = createSignal(true);
  const [textVal, setTextVal] = createSignal("hello");
  const [timeVal, setTimeVal] = createSignal("09:00");
  const [wrapperVisible, setWrapperVisible] = createSignal(true);
  const [intentArmed, setIntentArmed] = createSignal(true);
  const [groundingOpen, setGroundingOpen] = createSignal(false);
  const [letGoOpen, setLetGoOpen] = createSignal(false);

  onMount(() => {
    setTokenSnapshot((n) => n + 1);
  });

  const scrollTo = (id: string) => {
    document
      .getElementById(`sg-${id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div class={styles.styleguide}>
      <header class={styles.header}>
        <div class={styles.headerTop}>
          <h1>styleguide</h1>
          <div class={styles.headerActions}>
            {/* Plain navigation (separate page, no router on the styleguide). */}
            <Btn
              outline
              onClick={() => {
                window.location.href = "dashboard.html";
              }}
            >
              dashboard simulation →
            </Btn>
            <Btn
              outline
              onClick={() => setIsDark((v) => !v)}
              aria-pressed={isDark()}
            >
              {isDark() ? "light mode" : "dark mode"}
            </Btn>
          </div>
        </div>
        <nav class={styles.toc}>
          <For each={TOC}>
            {(item) => (
              <Btn variant="toggle" small onClick={() => scrollTo(item.id)}>
                {item.label}
              </Btn>
            )}
          </For>
        </nav>
      </header>

      <Section id="flags" title="Theme & wrapper flags">
        <p class="txtBig">
          Live class list on <code>#{ROOT_ID}</code> — toggle dark mode above to
          see <code>{DARK_CLASS}</code> appear.
        </p>
        <div class={styles.chipRow}>
          <For each={wrapperClasses()}>
            {(cls) => <span class={styles.chip}>{cls}</span>}
          </For>
        </div>
      </Section>

      <Section id="colors" title="Color tokens">
        <div class={styles.swatchGrid}>
          <For each={colorEntries()}>
            {(entry) => (
              <div class={styles.swatch}>
                <div
                  class={styles.swatchSample}
                  style={{ background: entry.value || "transparent" }}
                />
                <code>{entry.name}</code>
                <span>{entry.value || "—"}</span>
              </div>
            )}
          </For>
        </div>
      </Section>

      <Section id="sky" title="Sky timeline">
        <SkySection isDark={isDark} />
      </Section>

      <Section id="typography" title="Typography">
        <h2 class="h2">.h2 — functional heading (Inter)</h2>
        <h2 class="h2 h2Mindful">
          .h2.h2Mindful — mindful heading (display serif)
        </h2>
        <h3 class="h3">.h3 — subsection heading (Inter)</h3>
        <p class="txtBig">.txtBig — display body (display serif)</p>
        <p>plain paragraph text using --c-fg (Inter)</p>
        <div class={styles.fontList}>
          <For each={fontEntries()}>
            {(entry) => (
              <div class={styles.fontRow} style={{ "font-size": entry.value }}>
                <code>{entry.name}</code> <span>{entry.value || "—"}</span> the
                quick brown fox
              </div>
            )}
          </For>
        </div>
      </Section>

      <Section id="buttons" title="Buttons">
        <p class={styles.muted}>
          Every button is the <code>&lt;Btn&gt;</code> component. Three bases —{" "}
          text (default), <code>variant="icon"</code> and{" "}
          <code>variant="toggle"</code> — each with a small, typed set of
          modifiers. The type system only permits these combinations, so there's
          no way to stack one-off looks.
        </p>

        <Subsection label="<Btn>">
          <Btn>default</Btn>
          <Btn disabled>disabled</Btn>
        </Subsection>

        <Subsection label="<Btn outline>">
          <Btn outline>default</Btn>
          <Btn outline disabled>
            disabled
          </Btn>
        </Subsection>

        <Subsection label="<Btn big> (primary CTA size)">
          <Btn big>
            <Ico name="send" /> save
          </Btn>
          <Btn big disabled>
            disabled
          </Btn>
        </Subsection>

        <Subsection label='<Btn variant="toggle">'>
          <Btn variant="toggle">unselected</Btn>
          <Btn variant="toggle" selected>
            selected
          </Btn>
          <Btn variant="toggle" disabled>
            disabled
          </Btn>
        </Subsection>

        <Subsection label='<Btn variant="toggle" small>'>
          <Btn variant="toggle" small>
            unselected
          </Btn>
          <Btn variant="toggle" small selected>
            selected
          </Btn>
          <Btn variant="toggle" small disabled>
            disabled
          </Btn>
        </Subsection>

        <Subsection label='<Btn variant="icon"> / small / plain'>
          <Btn variant="icon" aria-label="settings">
            <Ico name="settings" />
          </Btn>
          <Btn variant="icon" small aria-label="close">
            <Ico name="close" />
          </Btn>
          <Btn variant="icon" plain aria-label="info">
            <Ico name="info" />
          </Btn>
          <Btn variant="icon" aria-label="disabled" disabled>
            <Ico name="delete" />
          </Btn>
        </Subsection>
      </Section>

      <Section id="inputs" title="Inputs">
        <Subsection label="<TextInput>">
          <TextInput
            value={textVal()}
            onInput={setTextVal}
            placeholder="type here"
          />
          <TextInput value="" placeholder="placeholder" />
          <TextInput value="disabled value" disabled />
        </Subsection>

        <Subsection label="<TimeInput>">
          <TimeInput value={timeVal()} onChange={setTimeVal} />
          <TimeInput value="07:30" onChange={() => undefined} disabled />
        </Subsection>

        <Subsection label="<InputWithSend>">
          <div style={{ "max-width": "480px" }}>
            <InputWithSend
              value=""
              onSubmit={(val) => {
                console.log("Styleguide InputWithSend submit:", val);
                return Promise.resolve();
              }}
            />
          </div>
        </Subsection>
      </Section>

      <Section id="selectors" title="Selectors">
        <Subsection label="<Checkbox>">
          <Checkbox
            checked={checkboxOn()}
            onChange={setCheckboxOn}
            label="enable feature"
          />
          <Checkbox
            checked={false}
            onChange={() => undefined}
            label="disabled"
            disabled
          />
        </Subsection>

        <Subsection label="<Toggle>">
          <Toggle
            checked={toggleOn()}
            onChange={setToggleOn}
            label="notifications"
          />
          <Toggle
            checked={false}
            onChange={() => undefined}
            label="disabled"
            disabled
          />
        </Subsection>

        <Subsection label="<TglBtns>">
          <TglBtns
            options={[
              { val: "a", txt: "option a" },
              { val: "b", txt: "option b" },
              { val: "c", txt: "option c" },
            ]}
            onSelect={(v) => console.log("TglBtns select:", v)}
          />
        </Subsection>

        <Subsection label="<Rating>">
          <div>
            <span class={styles.muted}>interactive: </span>
            <Rating onSetRating={(v) => console.log("rating:", v)} />
          </div>
          <div>
            <span class={styles.muted}>show only (value=3): </span>
            <Rating value={3} isShowOnly />
          </div>
        </Subsection>
      </Section>

      <Section id="indicators" title="Indicators & feedback">
        <Subsection label="<Stepper>">
          <Stepper
            nrOfSteps={4}
            activeStep={stepperStep()}
            onSetStep={setStepperStep}
          />
          <div>
            <Btn onClick={() => setStepperStep((s) => Math.max(0, s - 1))}>
              prev
            </Btn>
            <Btn onClick={() => setStepperStep((s) => Math.min(3, s + 1))}>
              next
            </Btn>
          </div>
        </Subsection>

        <Subsection label="<Toast>">
          <Btn outline onClick={() => setToastVisible(true)}>
            show toast
          </Btn>
          <Toast
            message="saved!"
            visible={toastVisible()}
            onHide={() => setToastVisible(false)}
          />
        </Subsection>

        <Subsection label="<ButtonWrapper> (fade in/out)">
          <Btn outline onClick={() => setWrapperVisible((v) => !v)}>
            toggle visibility
          </Btn>
          <ButtonWrapper isVisible={wrapperVisible()}>
            <Btn>i fade in and out</Btn>
          </ButtonWrapper>
        </Subsection>
      </Section>

      <Section id="icons" title="Icons">
        <div class={styles.icoGrid}>
          <For each={ICO_NAMES}>
            {(name) => (
              <div class={styles.icoCell}>
                <Ico name={name} size={32} />
                <code>{name}</code>
              </div>
            )}
          </For>
        </div>
      </Section>

      <Section id="chart" title="Chart">
        <p class={styles.muted}>
          Re-mounted on theme toggle so axis colors pick up the active palette.
        </p>
        <div style={{ "max-width": "480px" }}>
          <For each={[themeKey()]}>
            {() => (
              <Chart
                chartData={{
                  labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
                  datasets: [
                    {
                      label: "demo",
                      data: [2, 3, 1, 4, 3, 5, 2],
                      tension: 0.3,
                    },
                  ],
                }}
              />
            )}
          </For>
        </div>
      </Section>

      <Section
        id="interactions"
        title="Interactions (curated, render in isolation)"
      >
        <Subsection label="<BreathingExercise>">
          <div class={styles.interactionFrame}>
            <BreathingExercise />
          </div>
        </Subsection>

        <Subsection label="<NoticeInteraction>">
          <div class={styles.interactionFrame}>
            <NoticeInteraction
              onSuccess={() => console.log("NoticeInteraction: success")}
              onSkip={() => console.log("NoticeInteraction: skip")}
              onCancelCountdown={() => undefined}
            />
          </div>
        </Subsection>

        <Subsection label="<IntentSelection>">
          <div class={styles.interactionFrame}>
            <Btn outline onClick={() => setIntentArmed((v) => !v)}>
              isArmed: {String(intentArmed())}
            </Btn>
            <IntentSelection
              isArmed={intentArmed()}
              onSelectIntent={(i) => console.log("intent:", i)}
              onCancel={() => console.log("intent cancel")}
              onCancelCountdown={() => undefined}
            />
          </div>
        </Subsection>

        <Subsection label="<GroundingOverlay> — dashboard down-drag">
          <p class={styles.muted}>
            On the dashboard, dragging the sun down offers a moment to ground
            yourself: a timed meditation (still sun + start/end gong) or a
            screen-free sit (on the web the screen dims; on Android the phone
            locks). A gentle offer — declining is easy and ignoring it dismisses
            it. Opens a full-screen stage.
          </p>
          <Btn outline onClick={() => setGroundingOpen(true)}>
            Open grounding offer
          </Btn>
          {groundingOpen() && (
            <GroundingOverlay
              variant={isDark() ? "moon" : "sun"}
              onClose={() => setGroundingOpen(false)}
            />
          )}
        </Subsection>

        <Subsection label="<LetGoOverlay> — dashboard fling-away">
          <p class={styles.muted}>
            The sibling of the grounding offer: flinging the sun up/away ("let
            go") offers the standard intervention question "What do you want to
            let go of?". A gentle offer — declining is easy and ignoring it
            dismisses it. It sits on the standard (transparent) interaction
            background; in the live app the just-flung shell sun is hidden while
            it's open and returns home on close.
          </p>
          <Btn outline onClick={() => setLetGoOpen(true)}>
            Open let-go offer
          </Btn>
          {letGoOpen() && (
            <LetGoOverlay answers={[]} onClose={() => setLetGoOpen(false)} />
          )}
        </Subsection>

        <Subsection label="Persistent sun — post-interaction morph">
          <p class={styles.muted}>
            The same sun is never hidden: it glides down + breathes for the
            pause, then glides up + shrinks into a calm anchor for the choices,
            with the background light tracking it. Step through the phases —
            opens a full-screen stage.
          </p>
          <SunMorphHarness />
        </Subsection>
      </Section>

      <Section id="sun-widget" title="Sun widget (Android)">
        <p class={styles.muted}>
          The two time-of-day phases of the home-screen companion sun — the warm
          sun by day, the cool moon by night. The day sun is the real vector
          drawable; the night moon is the actual lunar photo with a baked glow (
          <code>ic_sun_widget_night.webp</code>), the same art the widget shows.
          Phase is chosen by the local clock, not the system theme — toggle dark
          mode above to preview the discs on a dark wallpaper. Indicative, not a
          pixel-exact device render.
        </p>
        <SunWidgetGallery />
      </Section>
    </div>
  );
};

const Section = (props: {
  id: string;
  title: string;
  children: JSX.Element;
}): JSX.Element => (
  <section id={`sg-${props.id}`} class={styles.section}>
    <h2>{props.title}</h2>
    {props.children}
  </section>
);

const Subsection = (props: {
  label: string;
  children: JSX.Element;
}): JSX.Element => (
  <div class={styles.subsection}>
    <code class={styles.subsectionLabel}>{props.label}</code>
    <div class={styles.subsectionRow}>{props.children}</div>
  </div>
);

const formatHour = (hour: number): string => {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

// The living time-of-day sky (skyTimeline.ts): keyframe strips, an hour
// scrubber previewing the ambient sky and both drag-target skies, an
// apply-to-page toggle, and a jump into the dashboard simulation at the
// scrubbed hour (?skyHour=) to test the real drag/grounding flow.
const SkySection = (props: { isDark: () => boolean }): JSX.Element => {
  const [hour, setHour] = createSignal(
    // min: rounding 23:53+ would yield 24, past the slider's max
    Math.min(23.75, Math.round(getEffectiveHourNow() * 4) / 4),
  );
  const [applyToPage, setApplyToPage] = createSignal(false);
  const isNight = () => hour() >= NIGHT_START_HOUR || hour() < NIGHT_END_HOUR;

  createEffect(() => {
    // Track the dark toggle too: applySkyAtHour keys off the wrapper class,
    // so re-running after a theme flip clears (dark) or re-applies (light)
    // the inline sky vars instead of leaving stale light-sky values under
    // the dark theme. The parent's class-toggle effect runs first (created
    // earlier), so the class is already updated when this re-reads it.
    props.isDark();
    if (applyToPage()) {
      applySkyAtHour(hour());
    } else {
      // Unconditional: the entry set now-sky inline vars at load, so a dark
      // flip must clear them even if apply-to-page was never touched.
      applySkyForNow();
    }
  });
  onCleanup(() => applySkyForNow());

  return (
    <>
      <p class="txtBig">
        The ambient sky interpolates through pastel keyframes across the light
        window ({formatHour(NIGHT_END_HOUR)}–{formatHour(NIGHT_START_HOUR)}); at
        night the dark theme owns the sky. The sun-drag reveals are targets on
        the same timeline: from 17:00 the down-drag sunset deepens toward night
        and the up-drag blue dims, so the gesture always leans away from
        <em> now</em>.
      </p>

      <Subsection label="ambient keyframes">
        <For each={AMBIENT_SKY_KEYFRAMES}>
          {(kf) => (
            <div class={styles.skyStrip}>
              <div
                class={styles.skyStripSample}
                style={{ background: ambientSkyGradient(kf.colors) }}
              />
              <code>{kf.label}</code>
              <span>{formatHour(kf.hour)}</span>
            </div>
          )}
        </For>
      </Subsection>

      <div class={styles.skyControls}>
        <input
          type="range"
          min="0"
          max="23.75"
          step="0.25"
          value={hour()}
          onInput={(e) => setHour(Number(e.currentTarget.value))}
          aria-label="hour of day"
        />
        <code>{formatHour(hour())}</code>
        <Checkbox
          checked={applyToPage()}
          onChange={setApplyToPage}
          label="apply to page"
        />
        <Btn
          outline
          onClick={() => {
            window.location.href = `dashboard.html?skyHour=${hour()}`;
          }}
        >
          dashboard simulation at {formatHour(hour())} →
        </Btn>
      </div>

      <Show
        when={!isNight()}
        fallback={
          <p class={styles.muted}>
            {formatHour(hour())} is night — the dark theme's two-orb sky and
            deep-night reveal apply (toggle dark mode above to see them); inline
            sky overrides are cleared. The strips below show the clamped
            light-window edge.
          </p>
        }
      >
        <p class={styles.muted}>
          apply-to-page only takes effect in light mode — in dark mode the night
          theme owns the sky.
        </p>
      </Show>

      <Subsection label={`skies at ${formatHour(hour())}`}>
        <div class={styles.skyStrip}>
          <div
            class={styles.skyStripSample}
            style={{
              background: ambientSkyGradient(ambientSkyColorsAt(hour())),
            }}
          />
          <code>ambient</code>
          <span>resting app background</span>
        </div>
        <div class={styles.skyStrip}>
          <div
            class={styles.skyStripSample}
            style={{ background: duskTargetGradientAt(hour()) }}
          />
          <code>drag down</code>
          <span>grounding reveal</span>
        </div>
        <div class={styles.skyStrip}>
          <div
            class={styles.skyStripSample}
            style={{ background: zenithTargetGradientAt(hour()) }}
          />
          <code>drag up</code>
          <span>let-go reveal</span>
        </div>
      </Subsection>
    </>
  );
};

// Full-screen harness for the persistent-sun morph. Drives the real <Sun> with
// the exact `settle` targets InteractionCommon uses (via getSunSettleForPhase),
// alongside the real background + post-sun content, so the glide / breath / rest
// can be felt and tuned without triggering a strong-friction intervention.
const SunMorphHarness = (): JSX.Element => {
  const [isOpen, setIsOpen] = createSignal(false);
  const [phase, setPhase] = createSignal<SunPhase>("interactive");
  // Mirror the real flow: the resting disc tucks just beneath the measured
  // choices block rather than sitting at a fixed ratio.
  const [restingAnchor, setRestingAnchor] = createSignal<{
    x: number;
    y: number;
  } | null>(null);

  const settle = () => {
    if (phase() === "resting") {
      const anchor = restingAnchor();
      if (anchor) return sunRestingSettle(anchor);
    }
    return getSunSettleForPhase(phase());
  };

  const measureRestingAnchor = () => {
    if (prefersReducedMotion()) {
      setRestingAnchor(null);
      return;
    }
    const spacer = document.querySelector(
      ".time-selection-overlay .resting-sun-spacer",
    );
    if (!spacer) return;
    setRestingAnchor(restingSunAnchorFromRect(spacer.getBoundingClientRect()));
  };

  createEffect(() => {
    if (phase() !== "resting") {
      setRestingAnchor(null);
      return;
    }
    requestAnimationFrame(measureRestingAnchor);
  });

  // Mirror the real flow's clear-on-leave: drop the shared breath origin whenever
  // we're not breathing, so re-entering "breathing" re-glides and publishes a
  // fresh clock for the cue rather than reading a stale one.
  createEffect(() => {
    if (phase() !== "breathing") setBreathStartedAt(undefined);
  });

  const isInteractive = () => phase() === "interactive";

  const PHASES: SunPhase[] = [
    "interactive",
    "breathing",
    "resting",
    "departing",
  ];

  return (
    <>
      <Btn
        outline
        onClick={() => {
          setPhase("interactive");
          setIsOpen(true);
        }}
      >
        open sun stage
      </Btn>

      <Show when={isOpen()}>
        <div class={styles.sunStage}>
          <BackgroundTransition isSunGradientAttached={true} />

          <Show when={phase() === "breathing"}>
            <div class="time-selection-overlay" style={{ "z-index": 1100 }}>
              <div class="post-sun-screen">
                <StrongFrictionBreathPause
                  seconds={STRONG_FRICTION_BREATH_PAUSE_SECONDS}
                  onComplete={() => undefined}
                  onCancel={() => setPhase("interactive")}
                />
              </div>
            </div>
          </Show>

          <Show when={phase() === "resting"}>
            <div
              class="time-selection-overlay has-resting-sun"
              style={{ "z-index": 1100 }}
            >
              <div class="post-sun-screen">
                <IntentSelection
                  isArmed={true}
                  onSelectIntent={() => undefined}
                  onCancel={() => setPhase("interactive")}
                  onCancelCountdown={() => undefined}
                />
              </div>
            </div>
          </Show>

          <div
            class={styles.sunStageSun}
            style={{ "pointer-events": isInteractive() ? "auto" : "none" }}
          >
            <Sun
              settle={settle()}
              onSkip={() => undefined}
              onFlingAway={() => undefined}
              onDragComplete={() => undefined}
              onBreathStart={setBreathStartedAt}
              tapThreshold={3}
            />
          </div>

          <div class={styles.sunStageControls}>
            <For each={PHASES}>
              {(p) => (
                <Btn
                  variant="toggle"
                  small
                  selected={phase() === p}
                  onClick={() => setPhase(p)}
                >
                  {p}
                </Btn>
              )}
            </For>
            <Btn outline onClick={() => setIsOpen(false)}>
              close
            </Btn>
          </div>
        </div>
      </Show>
    </>
  );
};

export default Styleguide;
