import { JSX, Show, splitProps } from "solid-js";
import { A } from "@solidjs/router";

type Variant = "text" | "icon" | "toggle";

interface CommonBtnProps {
  children?: JSX.Element;
  /**
   * Extra layout-only classes (margins, grid placement, …). The visual variant
   * and its modifiers come from the typed props below — don't pass `btn*`
   * classes here.
   */
  class?: string;
  onClick?: JSX.EventHandlerUnion<HTMLButtonElement, MouseEvent>;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  title?: string;
  style?: JSX.CSSProperties | string;
  /**
   * Render as a link instead of `<button>`. Internal routes use the router
   * `<A>`; external links (mailto:/tel:/http(s):, or anything with
   * `target="_blank"`) render a plain `<a>`.
   */
  href?: string;
  activeClass?: string;
  target?: string;
  "aria-label"?: string;
  "aria-pressed"?: boolean | "true" | "false";
  "aria-describedby"?: string;
}

/** Text button (the default). Modifiers: `outline` (ghost) and `big` (CTA). */
type TextBtnProps = CommonBtnProps & {
  variant?: "text";
  outline?: boolean;
  big?: boolean;
};

/** Icon-only button. Modifiers: `small` and `plain` (no resting background). */
type IconBtnProps = CommonBtnProps & {
  variant: "icon";
  small?: boolean;
  plain?: boolean;
};

/** Selectable toggle. Modifiers: `small` and `selected`. */
type ToggleBtnProps = CommonBtnProps & {
  variant: "toggle";
  small?: boolean;
  selected?: boolean;
};

export type BtnProps = TextBtnProps | IconBtnProps | ToggleBtnProps;

// Relaxed view used only inside this file so we can read every modifier without
// fighting the discriminated union. The public `BtnProps` is what keeps call
// sites honest — e.g. `plain` is accepted only on `variant="icon"`, and there
// is no way to stack arbitrary one-off looks.
type InternalBtnProps = CommonBtnProps & {
  variant?: Variant;
  outline?: boolean;
  big?: boolean;
  small?: boolean;
  plain?: boolean;
  selected?: boolean;
};

const BASE_CLASS: Record<Variant, string> = {
  text: "btnTxt",
  icon: "btnIco",
  toggle: "btnToggleSelect",
};

/**
 * The single button primitive. Three bases — text / icon / toggle — each with a
 * small, typed set of modifiers. The type system only permits the curated
 * combinations, so screens can't sprout one-off button looks; the underlying
 * `btn*` SCSS classes are an implementation detail of this component.
 */
const Btn = (props: BtnProps): JSX.Element => {
  const p = props as InternalBtnProps;
  const [local, rest] = splitProps(p, [
    "variant",
    "outline",
    "big",
    "small",
    "plain",
    "selected",
    "class",
    "children",
    "href",
    "activeClass",
    "target",
    "type",
  ]);

  // Internal routes go through the router's <A>; mailto/tel/http(s) links — or
  // anything opening a new tab — are plain anchors so the router doesn't try to
  // navigate them.
  const isExternalLink = (): boolean =>
    local.href !== undefined &&
    (/^(mailto:|tel:|https?:)/i.test(local.href) || local.target === "_blank");

  const className = (): string => {
    const variant = local.variant ?? "text";
    const classes = [BASE_CLASS[variant]];
    if (variant === "text") {
      if (local.outline) classes.push("isOutline");
      if (local.big) classes.push("isBig");
    } else if (variant === "icon") {
      if (local.small) classes.push("isSmall");
      if (local.plain) classes.push("isPlain");
    } else {
      if (local.small) classes.push("isSmall");
      if (local.selected) classes.push("isSelected");
    }
    if (local.class) classes.push(local.class);
    return classes.join(" ");
  };

  const anchorRest = (): JSX.AnchorHTMLAttributes<HTMLAnchorElement> =>
    rest as unknown as JSX.AnchorHTMLAttributes<HTMLAnchorElement>;

  return (
    <Show
      when={local.href !== undefined}
      fallback={
        <button type={local.type ?? "button"} class={className()} {...rest}>
          {local.children}
        </button>
      }
    >
      <Show
        when={isExternalLink()}
        fallback={
          <A
            href={local.href!}
            class={className()}
            activeClass={local.activeClass}
            {...anchorRest()}
          >
            {local.children}
          </A>
        }
      >
        <a
          href={local.href}
          target={local.target}
          class={className()}
          {...anchorRest()}
        >
          {local.children}
        </a>
      </Show>
    </Show>
  );
};

export default Btn;
