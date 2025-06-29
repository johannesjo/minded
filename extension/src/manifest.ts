import { defineManifest } from "@crxjs/vite-plugin";
import packageJson from "../package.json";

// Convert from Semver (example: 0.1.0-beta6)
const [major, minor, patch, label = "0"] = packageJson.version
  // can only contain digits, dots, or dash
  .replace(/[^\d.-]+/g, "")
  // split into version parts
  .split(/[.-]/);

const manifest = defineManifest(async () => ({
  manifest_version: 3,
  name: packageJson.displayName ?? packageJson.name,
  version: `${major}.${minor}.${patch}.${label}`,
  description: packageJson.description,
  icons: {
    "128": "icons/logo-ext-128.png",
    "256": "icons/logo-ext-256.png",
  },
  options_page: "src/pages/options/index.html",
  background: { service_worker: "src/pages/background/background.ts" },
  action: {
    // default_popup: "src/pages/popup/index.html",
    default_icon: "icons/logo-ext-128.png",
  },
  content_scripts: [
    {
      matches: ["http://*/*", "https://*/*"],
      js: ["src/pages/content/content-script.tsx"],
      run_at: "document_start",
      // ...({world: "main"} as any)
    },
  ],
  permissions: ["storage", "activeTab"],
  host_permissions: ["<all_urls>"],
  web_accessible_resources: [
    {
      resources: ["assets/js/*.js", "assets/css/*.css", "assets/img/*"],
      matches: ["*://*/*"],
    },
  ],
  chrome_url_overrides: {
    newtab: "src/pages/newtab/index.html",
  },
}));

export default manifest;
