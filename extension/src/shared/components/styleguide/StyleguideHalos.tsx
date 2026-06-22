import { Accessor, createSignal, For, JSX, Show } from "solid-js";

import Btn from "@src/shared/components/ui/Btn";
import BackgroundTransition from "@src/shared/components/interaction/backgroundTransition/BackgroundTransition";
import {
  HaloType,
  HaloVariant,
  MOON_VARIANTS,
  SUN_VARIANTS,
} from "./haloVariants";

// @ts-ignore
import styles from "./styleguideHalos.module.scss";

const DISC_SIZE_GRID = 84;
const DISC_SIZE_STAGE = 120;

const listFor = (type: HaloType): HaloVariant[] =>
  type === "sun" ? SUN_VARIANTS : MOON_VARIANTS;

interface HaloDiscProps {
  variant: HaloVariant;
  type: HaloType;
  size: number;
  draggable?: boolean;
}

/**
 * One sun/moon disc rendered from a halo recipe. The same component backs the
 * grid previews (static) and the drag stage (draggable) — only the --halo-*
 * custom properties change between variants. A baseline translate keeps a
 * stacking context so the wash composites over the disc face like the real sun.
 */
const HaloDisc = (props: HaloDiscProps): JSX.Element => {
  const [pos, setPos] = createSignal({ x: 0, y: 0 });
  let discEl: HTMLDivElement | undefined;
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let baseX = 0;
  let baseY = 0;

  const onPointerDown = (e: PointerEvent) => {
    if (!props.draggable) return;
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    baseX = pos().x;
    baseY = pos().y;
    discEl?.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!dragging) return;
    setPos({
      x: baseX + (e.clientX - startX),
      y: baseY + (e.clientY - startY),
    });
  };

  const endDrag = (e: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    discEl?.releasePointerCapture(e.pointerId);
  };

  return (
    <div
      ref={discEl}
      class={styles.disc}
      classList={{
        [styles.moon]: props.type === "moon",
        [styles.draggable]: !!props.draggable,
      }}
      style={{
        width: `${props.size}px`,
        height: `${props.size}px`,
        transform: `translate(${pos().x}px, ${pos().y}px)`,
        "--halo-disc": props.variant.disc,
        "--halo-shadow": props.variant.halo,
        "--halo-wash": props.variant.wash,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <span class={styles.wash} aria-hidden="true" />
    </div>
  );
};

interface Selection {
  type: HaloType;
  idx: number;
}

interface StyleguideHalosProps {
  isDark: boolean;
  onToggleDark: () => void;
  onBack: () => void;
}

const StyleguideHalos = (props: StyleguideHalosProps): JSX.Element => {
  const [selected, setSelected] = createSignal<Selection | null>(null);

  // Step within the selected type, wrapping — quick A/B without leaving the stage.
  const step = (delta: number) => {
    const sel = selected();
    if (!sel) return;
    const len = listFor(sel.type).length;
    setSelected({ type: sel.type, idx: (sel.idx + delta + len) % len });
  };

  const HaloGrid = (gridProps: {
    type: HaloType;
    title: string;
  }): JSX.Element => (
    <>
      <h2 class={styles.groupTitle}>{gridProps.title}</h2>
      <p class={styles.groupHint}>
        {gridProps.type === "sun"
          ? "Warm rim halo + broad bloom wash behind the disc."
          : "Cool rim halo only — the night scene stays free of warm wash."}
      </p>
      <div class={styles.grid}>
        <For each={listFor(gridProps.type)}>
          {(variant, i) => (
            <button
              type="button"
              class={styles.cell}
              onClick={() => setSelected({ type: gridProps.type, idx: i() })}
            >
              <div class={styles.cellStage}>
                <HaloDisc
                  variant={variant}
                  type={gridProps.type}
                  size={DISC_SIZE_GRID}
                />
              </div>
              <span class={styles.cellLabel}>{variant.label}</span>
              <span class={styles.cellNote}>{variant.note}</span>
            </button>
          )}
        </For>
      </div>
    </>
  );

  const Stage = (stageProps: { sel: Accessor<Selection> }): JSX.Element => {
    const variant = () => listFor(stageProps.sel().type)[stageProps.sel().idx];
    const type = () => stageProps.sel().type;
    return (
      <div class={styles.stage}>
        {/* Re-mount on theme flip so dark-mode detection (stars/sunset) refreshes. */}
        <For each={[props.isDark ? "dark" : "light"]}>
          {() => <BackgroundTransition isSunGradientAttached={true} />}
        </For>

        <div class={styles.stageDiscLayer}>
          <HaloDisc
            variant={variant()}
            type={type()}
            size={DISC_SIZE_STAGE}
            draggable
          />
        </div>

        <div class={styles.stageHint}>
          drag the {type()} anywhere over the gradient
        </div>

        <div class={styles.stageControls}>
          <Btn
            variant="icon"
            small
            onClick={() => step(-1)}
            aria-label="previous"
          >
            ‹
          </Btn>
          <span class={styles.stageLabel}>
            {type()} · {variant().label}
          </span>
          <Btn variant="icon" small onClick={() => step(1)} aria-label="next">
            ›
          </Btn>
          <Btn
            variant="toggle"
            small
            selected={props.isDark}
            onClick={props.onToggleDark}
          >
            {props.isDark ? "dark" : "light"}
          </Btn>
          <Btn outline onClick={() => setSelected(null)}>
            ← grid
          </Btn>
        </div>
      </div>
    );
  };

  return (
    <Show
      when={selected()}
      fallback={
        <div class={styles.page}>
          <div class={styles.header}>
            <h1>halo lab</h1>
            <div class={styles.headerActions}>
              <Btn
                outline
                onClick={props.onToggleDark}
                aria-pressed={props.isDark}
              >
                {props.isDark ? "light mode" : "dark mode"}
              </Btn>
              <Btn onClick={props.onBack}>← styleguide</Btn>
            </div>
          </div>
          <p class={styles.intro}>
            12 halo studies each for the sun and the moon. Each cell sits on the
            live page gradient — click one to open it full-screen and drag it to
            any band of the gradient. Toggle dark mode to test the night sky.
          </p>

          <HaloGrid type="sun" title="Suns" />
          <HaloGrid type="moon" title="Moons" />
        </div>
      }
    >
      {(sel) => <Stage sel={sel} />}
    </Show>
  );
};

export default StyleguideHalos;
