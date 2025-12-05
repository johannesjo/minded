// CSS Module declarations
declare module "*.module.css" {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module "*.module.scss" {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module "*.module.sass" {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module "*.scss" {
  const content: string;
  export default content;
}

declare module "*.sass" {
  const content: string;
  export default content;
}

declare module "*.css" {
  const content: string;
  export default content;
}

// SVG declarations
declare module "*.svg" {
  const content: string;
  export default content;
}

declare module "*.svg?react" {
  import type { Component } from "solid-js";
  const SvgComponent: Component<Record<string, unknown>>;
  export default SvgComponent;
}

// Image declarations
declare module "*.png" {
  const content: string;
  export default content;
}

declare module "*.jpg" {
  const content: string;
  export default content;
}

declare module "*.jpeg" {
  const content: string;
  export default content;
}

declare module "*.gif" {
  const content: string;
  export default content;
}

declare module "*.webp" {
  const content: string;
  export default content;
}

// Font declarations
declare module "*.woff" {
  const content: string;
  export default content;
}

declare module "*.woff2" {
  const content: string;
  export default content;
}

declare module "*.ttf" {
  const content: string;
  export default content;
}

declare module "*.otf" {
  const content: string;
  export default content;
}

// Audio/Video declarations
declare module "*.mp3" {
  const content: string;
  export default content;
}

declare module "*.mp4" {
  const content: string;
  export default content;
}

declare module "*.webm" {
  const content: string;
  export default content;
}

// JSON declarations
declare module "*.json" {
  const content: unknown;
  export default content;
}

// Native bridge interfaces for Android/iOS
import type {
  AndroidMindedBridge,
  IOSMindedBridge,
} from "@src/dataInterface/dataInterface.types";

declare global {
  interface Window {
    androidMinded?: AndroidMindedBridge;
    iosMinded?: IOSMindedBridge;
    IS_MAIN_MINDED_6622?: boolean;
  }
}
