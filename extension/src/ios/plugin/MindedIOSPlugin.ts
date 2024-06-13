import { registerPlugin } from "@capacitor/core";

import type { IOSPluginDefinition } from "./definitions";

const MindedIOSPlugin = registerPlugin<IOSPluginDefinition>("MindedIOSPlugin");

export * from "./definitions";
export { MindedIOSPlugin };
