import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.minded.minded",
  appName: "minded",
  webDir: "distIOS",
  zoomEnabled: false,
  plugins: {
    Keyboard: {
      resize: "native",
    },
  },
  ios: {
    zoomEnabled: false,
  },
  android: {
    allowMixedContent: true,
  },
  server: {
    // cleartext: true,
    // hostname: "localhost",
  },
};

export default config;
