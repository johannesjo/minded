import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
// import devtools from 'solid-devtools/vite';
import * as path from "path";
import { resolve } from "path";
import { viteStaticCopy } from "vite-plugin-static-copy";
import hotReloadExtension from "hot-reload-extension-vite";
import { crx } from "@crxjs/vite-plugin";

import manifest from "./src/manifest";

const root = resolve(__dirname, "src");
const publicDir = resolve(__dirname, "public");
const outDir = resolve(__dirname, "dist");
const assetsDir = resolve(root, "assets");
const isDev = process.env.__DEV__ === "true";

export default defineConfig({
  plugins: [
    hotReloadExtension({
      log: true,
      backgroundPath: "src/background.ts", // src/pages/background/index.ts
    }),
    /*
    Uncomment the following line to enable solid-devtools.
    For more info see https://github.com/thetarnav/solid-devtools/tree/main/packages/extension#readme
    */
    // devtools(),
    solidPlugin(),
    viteStaticCopy({
      targets: [
        {
          src: "public/**",
          dest: "",
        },
      ],
    }),
    crx({ manifest }),
  ],
  resolve: {
    alias: {
      "@src": root,
      "@assets": assetsDir,
    },
  },
  server: {
    port: 3000,
  },
  // since we want to handle it manually
  publicDir: false,
  build: {
    outDir,
    sourcemap: true,
    rollupOptions: {
      // input: {
      //   background: path.resolve(__dirname, "src/background.ts"),
      //   popup: path.resolve(__dirname, "src/popup.tsx"),
      //   options: path.resolve(__dirname, "src/options.tsx"),
      //   "content-script": path.resolve(
      //     __dirname,
      //     "src/content-script/content-script.tsx",
      //   ),
      //   // 'content-script-inner': path.resolve(__dirname, 'src/content-script/content-script-inner.tsx'),
      // },
      // output: {
      //   manualChunks: {},
      //   dir: path.resolve(__dirname, "dist/js"),
      //   format: "esm",
      //   entryFileNames: "[name].js",
      //   chunkFileNames: "chunks/[name].js",
      // },
    },
  },
  // css: {
  //   preprocessorOptions: {
  //     scss: {
  //       additionalData: `@import "src/styles/variables.scss";`,
  //     },
  //   },
  // },
});
