import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
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
// const outDirDroid = resolve(__dirname, "distDroid");
const outDirDroid = resolve("../android/app/src/main/assets/web/");
const dataInterfaceExtension = resolve(root, "dataInterface", "extension");
const dataInterfaceDroid = resolve(root, "dataInterface", "android");

export default defineConfig(({ mode }) => {
  return mode === "android"
    ? {
        base: "file:///android_asset/web",
        plugins: [solidPlugin()],
        resolve: {
          alias: {
            "@src": root,
            "@assets": assetsDir,
            "@dataInterface": dataInterfaceDroid,
          },
        },
        build: {
          outDir: outDirDroid,
          sourcemap: true,
          rollupOptions: {
            input: {
              main: resolve(root, "android", "main", "index.html"),
              interaction: resolve(
                root,
                "android",
                "interaction",
                "index.html",
              ),
            },
            output: {
              entryFileNames: "src/[name]/index.js",
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
      }
    : {
        plugins: [solidPlugin(), crx({ manifest })],
        resolve: {
          alias: {
            "@src": root,
            "@assets": assetsDir,
            "@pages": pagesDir,
            "@dataInterface": dataInterfaceExtension,
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
      };
});
