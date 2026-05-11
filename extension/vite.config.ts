import { defineConfig, UserConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import * as path from "path";
import { resolve } from "path";
import { crx } from "@crxjs/vite-plugin";
import rollupCopy from "rollup-plugin-copy";

import manifest from "./src/manifest";

const root = resolve(__dirname, "src");
const outDir = resolve(__dirname, "dist");
const assetsDir = resolve(root, "assets");
const isDev = process.env.__DEV__ === "true";
const publicDir = resolve(__dirname, "public");
const pagesDir = resolve(root, "pages");
// const outDirDroid = resolve(__dirname, "distDroid");
const outDirDroid = resolve("../android/app/src/main/assets/web/");
const outDirIOS = resolve(__dirname, "distIOS");
const dataInterfaceExtension = resolve(root, "dataInterface", "extension");
const dataInterfaceDroid = resolve(root, "dataInterface", "android");
const dataInterfaceIOS = resolve(root, "dataInterface", "ios");

export default defineConfig(({ mode }): UserConfig => {
  const sassOptions = {
    quietDeps: true,
    silenceDeprecations: ["import", "mixed-decls"],
  };
  return mode === "ios"
    ? {
        // base: "file:///android_asset/web",
        plugins: [solidPlugin()],
        css: {
          preprocessorOptions: {
            scss: sassOptions,
          },
        },
        resolve: {
          alias: {
            "@src": root,
            "@assets": assetsDir,
            "@pages": pagesDir,
            "@dataInterface": dataInterfaceIOS,
          },
        },
        build: {
          outDir: outDirIOS,
          sourcemap: true,
          rollupOptions: {
            plugins: [
              rollupCopy({
                targets: [
                  {
                    src: resolve(outDirIOS, "src", "ios", "main", "index.html"),
                    dest: outDirIOS,
                  },
                ],
                hook: "writeBundle", // Ensures that the files are copied after the bundle is written
              }),
            ],
            input: {
              main: resolve(root, "ios", "main", "index.html"),
            },
            output: {
              entryFileNames: "[name]/index.js",
              chunkFileNames: isDev
                ? "assets/js/[name].js"
                : "assets/js/[name].[hash].js",
              assetFileNames: (assetInfo) => {
                if (!assetInfo.name) return "assets/[ext]/[name].chunk.[ext]";
                const { name } = path.parse(assetInfo.name);
                return `assets/[ext]/${name}.chunk.[ext]`;
              },
            },
          },
        },
      }
    : mode === "android"
      ? {
          base: "file:///android_asset/web",
          plugins: [solidPlugin()],
          css: {
            preprocessorOptions: {
              scss: sassOptions,
            },
          },
          resolve: {
            alias: {
              "@src": root,
              "@assets": assetsDir,
              "@pages": pagesDir,
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
                sleepWindDown: resolve(
                  root,
                  "android",
                  "sleepWindDown",
                  "index.html",
                ),
              },
              output: {
                entryFileNames: "src/[name]/index.js",
                chunkFileNames: isDev
                  ? "assets/js/[name].js"
                  : "assets/js/[name].[hash].js",
                assetFileNames: (assetInfo) => {
                  if (!assetInfo.name) return "assets/[ext]/[name].chunk.[ext]";
                  const { name } = path.parse(assetInfo.name);
                  return `assets/[ext]/${name}.chunk.[ext]`;
                },
              },
            },
          },
        }
      : {
          plugins: [
            solidPlugin(),
            crx({ manifest, contentScripts: { injectCss: false } }),
          ],
          css: {
            preprocessorOptions: {
              scss: sassOptions,
            },
          },
          resolve: {
            alias: {
              "@src": root,
              "@assets": assetsDir,
              "@pages": pagesDir,
              "@dataInterface": dataInterfaceExtension,
            },
          },
          publicDir,
          server: {
            watch: {
              usePolling: true,
            },
            hmr: {
              clientPort: 5173,
            },
          },
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
                  if (!assetInfo.name) return "assets/[ext]/[name].chunk.[ext]";
                  const { name } = path.parse(assetInfo.name);
                  return `assets/[ext]/${name}.chunk.[ext]`;
                },
              },
            },
          },
        };
});
