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
  description: "minded",
  icons: {
    "128": "public/icon_128x128.png",
  },
  options_page: "public/options.html",
  action: {
    default_icon: "public/icon.png",
    default_popup: "public/popup.html",
  },
  background: { service_worker: "src/background.ts" },
  content_scripts: [
    {
      run_at: "document_start",
      matches: ["http://*/*", "https://*/*", "<all_urls>"],
      js: ["src/content-script/content-script.tsx"],
    },
  ],
  permissions: ["storage", "tabs"],
  host_permissions: ["<all_urls>"],
  web_accessible_resources: [
    {
      matches: ["<all_urls>"],
      resources: [
        "js/assets/*",
        "js/*.*",
        "js/assets/**/*.*",
        "js/chunks/**/*.*",
      ],
    },
    {
      resources: ["assets/js/*.js", "assets/css/*.css", "assets/img/*"],
      matches: ["*://*/*"],
    },
  ],
  // TODO that might be cool
  // chrome_url_overrides: {
  //   newtab: "src/pages/newtab/index.html",
  // },
  // devtools_page: "src/pages/devtools/index.html",
}));

export default manifest;
