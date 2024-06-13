// import type { PluginListenerHandle } from "@capacitor/core";

export interface IOSPluginDefinition {
  continueToApp: () => void;
  // addListener(
  //   eventName: "screenOrientationChange",
  //   listenerFunc: (orientation: { type: OrientationType }) => void,
  // ): Promise<PluginListenerHandle> & PluginListenerHandle;
  //
  // /**
  //  * Removes all listeners
  //  */
  // removeAllListeners(): Promise<void>;
}
