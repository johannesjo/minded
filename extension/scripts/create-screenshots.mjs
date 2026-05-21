import { chromium } from "playwright";
import { createServer } from "vite";
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extensionDir = path.resolve(__dirname, "..");
const repoRoot = path.resolve(extensionDir, "..");
const extensionScreenshotsDir = path.join(extensionDir, "screenshots");
const landingScreenshotsDir = path.join(repoRoot, "landing-page", "public");
const googlePlayPhoneScreenshotsDir = path.join(
  extensionScreenshotsDir,
  "google-play",
  "phone",
);

const desktopViewport = { width: 1280, height: 800 };
const phoneViewport = { width: 360, height: 640 };

const desktopShots = [
  { file: "dashboard.png", target: "dashboard", theme: "light" },
  { file: "dashboard-dark.png", target: "dashboard", theme: "dark" },
  { file: "mood-checkin.png", target: "mood-checkin", theme: "light" },
  { file: "energy-lvl.png", target: "energy-lvl", theme: "light" },
  {
    file: "q-something-i-am-looking-forward-to.png",
    target: "q-something-i-am-looking-forward-to",
    theme: "light",
  },
  {
    file: "q-this-week-i-will-do-my-best-to.png",
    target: "q-this-week-i-will-do-my-best-to",
    theme: "light",
  },
].map((shot) => ({
  ...shot,
  copyTo: [landingScreenshotsDir],
  outputDir: extensionScreenshotsDir,
  platform: "web-extension",
  viewport: desktopViewport,
}));

const googlePlayPhoneShots = [
  { file: "dashboard.png", target: "dashboard", theme: "light" },
  {
    file: "question-looking-forward.png",
    target: "q-something-i-am-looking-forward-to",
    theme: "light",
  },
  { file: "draggable-sun.png", target: "draggable-sun", theme: "light" },
  { file: "intent-selection.png", target: "intent-selection", theme: "light" },
  {
    file: "duration-selection.png",
    target: "duration-selection",
    theme: "light",
  },
  {
    file: "draggable-sun-dark.png",
    target: "draggable-sun",
    theme: "dark",
  },
  {
    file: "intent-selection-dark.png",
    target: "intent-selection",
    theme: "dark",
  },
  {
    file: "duration-selection-dark.png",
    target: "duration-selection",
    theme: "dark",
  },
].map((shot) => ({
  ...shot,
  copyTo: [],
  deviceScaleFactor: 3,
  hasTouch: true,
  isMobile: true,
  outputDir: googlePlayPhoneScreenshotsDir,
  platform: "android",
  viewport: phoneViewport,
}));

const shots = [...desktopShots, ...googlePlayPhoneShots];

const createScreenshotUrl = (baseUrl, shot) => {
  const url = new URL(baseUrl);
  url.searchParams.set("target", shot.target);
  url.searchParams.set("theme", shot.theme);
  url.searchParams.set("platform", shot.platform);
  return url.toString();
};

const applyTheme = async (page, shot) => {
  await page.evaluate((screenshotShot) => {
    const themeName = screenshotShot.theme;
    const platform = screenshotShot.platform;
    const isDark = themeName === "dark";
    const isAndroid = platform === "android";
    const root = document.getElementById("minded-6622");
    const wrapper =
      document.getElementById("minded-6622-coloured-wrapper") ||
      document.getElementById("minded-6622-coloured-wrapper-dynamic");

    root?.classList.toggle("minded-6622-dark", isDark);
    root?.classList.toggle("minded-6622-web-extension", !isAndroid);
    root?.classList.toggle("minded-6622-mobile-app", isAndroid);
    root?.classList.toggle("minded-6622-android", isAndroid);
    root?.classList.toggle("minded-6622-mouse-primary", !isAndroid);
    root?.classList.toggle("minded-6622-touch-primary", isAndroid);
    wrapper?.classList.toggle("minded-6622-dark", isDark);
  }, shot);
};

const prepareShot = async (page, shot) => {
  switch (shot.target) {
    case "dashboard":
      await page.waitForSelector(".cardDashboard");
      break;
    case "mood-checkin":
      await page.getByRole("button", { name: "Okay" }).click();
      await page.waitForSelector(".additional-block.isVisible");
      break;
    case "energy-lvl":
      await page.getByRole("button", { name: "Set rating to 3" }).click();
      break;
    case "draggable-sun":
      await page.waitForSelector(".sun-container .minded-sun");
      break;
    case "intent-selection":
      await page.waitForSelector(".intent-selection-wrapper");
      break;
    case "duration-selection":
      await page.waitForSelector(".time-selection-wrapper");
      break;
    case "q-something-i-am-looking-forward-to":
    case "q-this-week-i-will-do-my-best-to":
      await page.locator("#minded-6622-question").click();
      await page.waitForSelector("#minded-6622-inp textarea");
      await page.locator("#minded-6622-inp textarea").evaluate((el) => {
        el.blur();
      });
      break;
    default:
      throw new Error(`Unknown screenshot target: ${shot.target}`);
  }
};

const prepareShotWithDiagnostics = async (page, shot, pageErrors) => {
  try {
    await prepareShot(page, shot);
  } catch (error) {
    const bodyText = await page
      .locator("body")
      .innerText()
      .catch(() => "");
    throw new Error(
      [
        `Failed to prepare ${shot.file}.`,
        pageErrors.length
          ? `Browser errors:\n${pageErrors.join("\n")}`
          : "Browser errors: none captured.",
        bodyText ? `Body text:\n${bodyText}` : "Body text: empty.",
        error instanceof Error ? error.message : String(error),
      ].join("\n\n"),
    );
  }
};

const launchBrowser = async () => {
  try {
    return await chromium.launch();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      [
        "Could not launch Playwright Chromium.",
        'Run "npm run screenshots:install" from the extension directory, then retry.',
        "",
        message,
      ].join("\n"),
    );
  }
};

const captureScreenshots = async () => {
  const dirs = new Set(
    shots.flatMap((shot) => [shot.outputDir, ...(shot.copyTo || [])]),
  );
  for (const dir of dirs) {
    await mkdir(dir, { recursive: true });
  }

  const server = await createServer({
    configFile: path.join(extensionDir, "vite.config.ts"),
    mode: "screenshots",
    server: {
      host: "127.0.0.1",
      port: 5175,
      strictPort: false,
    },
  });

  let browser;
  try {
    await server.listen();
    const baseUrl = server.resolvedUrls?.local?.[0];
    if (!baseUrl) {
      throw new Error("Vite did not expose a local server URL.");
    }

    browser = await launchBrowser();
    for (const shot of shots) {
      const context = await browser.newContext({
        viewport: shot.viewport,
        deviceScaleFactor: shot.deviceScaleFactor ?? 1,
        hasTouch: shot.hasTouch ?? false,
        isMobile: shot.isMobile ?? false,
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      const pageErrors = [];

      page.on("pageerror", (error) => {
        pageErrors.push(error.stack || error.message);
      });
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          pageErrors.push(msg.text());
        }
      });

      await page.goto(createScreenshotUrl(baseUrl, shot), {
        waitUntil: "networkidle",
      });
      try {
        await page.waitForFunction(
          () => window.__MINDED_SCREENSHOT_READY__ === true,
        );
      } catch (error) {
        const bodyText = await page
          .locator("body")
          .innerText()
          .catch(() => "");
        throw new Error(
          [
            `Timed out waiting for ${shot.file} to become ready.`,
            pageErrors.length
              ? `Browser errors:\n${pageErrors.join("\n")}`
              : "Browser errors: none captured.",
            bodyText ? `Body text:\n${bodyText}` : "Body text: empty.",
            error instanceof Error ? error.message : String(error),
          ].join("\n\n"),
        );
      }
      await page.evaluate(() => document.fonts?.ready);
      await prepareShotWithDiagnostics(page, shot, pageErrors);
      await applyTheme(page, shot);
      await page.waitForTimeout(350);

      if (pageErrors.length) {
        throw new Error(
          `Console errors while creating ${shot.file}:\n${pageErrors.join(
            "\n",
          )}`,
        );
      }

      const outputPath = path.join(shot.outputDir, shot.file);
      await page.screenshot({ path: outputPath });
      await page.close();
      await context.close();

      for (const copyDir of shot.copyTo || []) {
        await copyFile(outputPath, path.join(copyDir, shot.file));
      }
      console.log(`Created ${path.relative(repoRoot, outputPath)}`);
    }
  } finally {
    await browser?.close();
    await server.close();
  }
};

await captureScreenshots();
