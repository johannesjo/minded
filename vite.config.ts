import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
// import devtools from 'solid-devtools/vite';
import * as path from "path";
import { resolve } from "path";
import { crx } from "@crxjs/vite-plugin";

import manifest from "./src/manifest";

const root = resolve(__dirname, "src");
const outDir = resolve(__dirname, "dist");
const assetsDir = resolve(root, "assets");
const isDev = process.env.__DEV__ === "true";
const publicDir = resolve(__dirname, "public");
const pagesDir = resolve(root, "pages");

export default defineConfig({
  plugins: [solidPlugin(), crx({ manifest })],
  resolve: {
    alias: {
      "@src": root,
      "@assets": assetsDir,
      "@pages": pagesDir,
    },
  },
  publicDir,
  // server: {
  //   watch: {
  //     usePolling: true,
  //   },
  //   hmr: true
  // },
  build: {
    outDir,
    sourcemap: true,
    rollupOptions: {
      input: {
        content: resolve(pagesDir, "content", "content-script.tsx"),
        background: resolve(pagesDir, "background", "background.ts"),
        popup: resolve(pagesDir, "popup", "index.html"),
        newtab: resolve(pagesDir, "newtab", "index.html"),
        options: resolve(pagesDir, "options", "index.html"),
      },
      output: {
        entryFileNames: "src/pages/[name]/index.js",
        chunkFileNames: isDev
          ? "assets/js/[name].js"
          : "assets/js/[name].[hash].js",
        assetFileNames: (assetInfo) => {
          const { name } = path.parse(assetInfo.name);
          return `assets/[ext]/${name}.chunk.[ext]`;
        },
      },
    },
  },
});
