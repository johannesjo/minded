import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
// import devtools from 'solid-devtools/vite';
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
  plugins: [
    // hotReloadExtension({
    //   log: true,
    //   backgroundPath: "src/background.ts", // src/pages/background/index.ts
    // }),
    /*
    Uncomment the following line to enable solid-devtools.
    For more info see https://github.com/thetarnav/solid-devtools/tree/main/packages/extension#readme
    */
    // devtools(),
    solidPlugin(),
    crx({manifest}),
  ],
  resolve: {
    alias: {
      "@src": root,
      "@assets": assetsDir,
      "@pages": pagesDir,
    },
  },
  publicDir,
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
