// import type { PluginListenerHandle } from "@capacitor/core";

export interface IOSPluginDefinition {
  continueToApp: () => void;
  /**
   * Whether any minded widget is currently on the Home Screen
   * (WidgetCenter.getCurrentConfigurations). The observed state keeps the
   * widget invitation truthful and self-retiring: it shows only while no
   * widget exists and disappears silently once one does. Rejects on older
   * native shells without this method — callers treat that as "unknown" and
   * never nag.
   */
  isWidgetInstalled: () => Promise<{ isInstalled: boolean }>;
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
