import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";
import { createServer } from "vite";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extensionDir = path.resolve(__dirname, "..");
const repoRoot = path.resolve(extensionDir, "..");
const outputDir = path.join(repoRoot, "output", "playwright");
const outputPath = path.join(outputDir, "minded-intro.mp4");
const viewport = { width: 1280, height: 720 };

export const VIDEO_SCENES = [
  { target: "dashboard", theme: "light" },
  {
    target: "draggable-sun",
    theme: "light",
    caption: "interrupt, gently.",
  },
  {
    target: "intent-selection",
    theme: "light",
    caption: "choose with intention.",
  },
  {
    target: "duration-selection",
    theme: "light",
    caption: "set a calm boundary.",
  },
  {
    target: "q-something-i-am-looking-forward-to",
    theme: "light",
    caption: "make room for what matters.",
  },
];

export const createVideoUrl = (baseUrl, scene) => {
  const url = new URL(baseUrl);
  url.searchParams.set("target", scene.target);
  url.searchParams.set("theme", scene.theme);
  url.searchParams.set("platform", "web-extension");
  url.searchParams.set("skyHour", "9");
  return url.toString();
};

export const getDownwardDragPath = (box, distance = 170, steps = 12) => {
  const center = {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  };

  return Array.from({ length: steps + 1 }, (_, index) => ({
    x: center.x,
    y: center.y + (distance * index) / steps,
  }));
};

export const installTransitionCurtain = () => {
  const install = () => {
    const style = document.createElement("style");
    style.textContent = `
      html::after {
        background: #f4ecd6;
        content: "";
        inset: 0;
        opacity: 1;
        pointer-events: none;
        position: fixed;
        transition: opacity 700ms ease;
        z-index: 2147483647;
      }
      html.minded-video-revealed::after { opacity: 0; }
    `;
    document.documentElement.appendChild(style);
  };

  if (document.documentElement) install();
  else document.addEventListener("DOMContentLoaded", install, { once: true });
};

const wait = (page, milliseconds) => page.waitForTimeout(milliseconds);

const dragSunDown = async (page, sun) => {
  const box = await sun.boundingBox();
  if (!box) throw new Error("Could not measure the sun for the video drag.");

  const [start, ...dragPath] = getDownwardDragPath(box);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  try {
    for (const point of dragPath) {
      await page.mouse.move(point.x, point.y);
      await wait(page, 90);
    }
    await wait(page, 120);
  } finally {
    await page.mouse.up();
  }
};

const installVideoChrome = async (page) => {
  await page.locator("#minded-motion-freeze").evaluate((element) => {
    element.remove();
  });
  await page.addStyleTag({
    content: `
      html, body { overflow: hidden; }

      .minded-video-caption,
      .minded-video-card {
        color: #252525;
        font-family: inherit;
        pointer-events: none;
        position: fixed;
        z-index: 2147483647;
      }

      .minded-video-caption {
        font-family: Georgia, "Times New Roman", serif;
        font-size: 24px;
        left: 42px;
        letter-spacing: -0.02em;
        opacity: 0;
        top: 34px;
        transform: translateY(10px);
        transition:
          opacity 700ms ease,
          transform 700ms ease;
      }

      .minded-video-caption.is-visible {
        opacity: 0.72;
        transform: translateY(0);
      }

      .minded-video-card {
        align-items: center;
        backdrop-filter: blur(18px);
        background: rgba(247, 244, 231, 0.72);
        display: flex;
        flex-direction: column;
        inset: 0;
        justify-content: center;
        opacity: 0;
        padding: 80px;
        text-align: center;
        transition: opacity 800ms ease;
      }

      .minded-video-card.is-visible { opacity: 1; }
      .minded-video-card .brand {
        font-size: 18px;
        letter-spacing: 0.16em;
        margin-bottom: 28px;
        opacity: 0.55;
      }
      .minded-video-card h1 {
        font-family: Georgia, "Times New Roman", serif;
        font-size: 66px;
        font-weight: 400;
        letter-spacing: -0.045em;
        line-height: 1.02;
        margin: 0;
        max-width: 850px;
        white-space: pre-line;
      }
      .minded-video-card p {
        font-size: 22px;
        line-height: 1.45;
        margin: 28px 0 0;
        max-width: 620px;
        opacity: 0.68;
      }
    `,
  });
};

const addCaption = async (page, caption) => {
  if (!caption) return;

  await page.locator("body").evaluate((body, text) => {
    const element = document.createElement("div");
    element.className = "minded-video-caption";
    element.textContent = text;
    const host =
      document.getElementById("minded-6622-coloured-wrapper-dynamic") ||
      document.getElementById("minded-6622-coloured-wrapper") ||
      body;
    host.appendChild(element);
    requestAnimationFrame(() => element.classList.add("is-visible"));
  }, caption);
};

const addCard = async (page, { title, subtitle }) => {
  await page.locator("body").evaluate(
    (body, copy) => {
      const card = document.createElement("div");
      card.className = "minded-video-card";

      const brand = document.createElement("div");
      brand.className = "brand";
      brand.textContent = "minded";

      const heading = document.createElement("h1");
      heading.textContent = copy.title;

      const supportingCopy = document.createElement("p");
      supportingCopy.textContent = copy.subtitle;

      card.append(brand, heading, supportingCopy);
      const host =
        document.getElementById("minded-6622-coloured-wrapper-dynamic") ||
        document.getElementById("minded-6622-coloured-wrapper") ||
        body;
      host.appendChild(card);
      requestAnimationFrame(() => card.classList.add("is-visible"));
    },
    { title, subtitle },
  );
};

const hideCard = async (page) => {
  await page.locator(".minded-video-card").evaluate((card) => {
    card.classList.remove("is-visible");
  });
  await wait(page, 700);
};

const revealScene = async (page) => {
  await page.evaluate(() => {
    document.documentElement.classList.add("minded-video-revealed");
  });
  await wait(page, 600);
};

const coverScene = async (page) => {
  await page.evaluate(() => {
    document.documentElement.classList.remove("minded-video-revealed");
  });
  await wait(page, 600);
};

const waitForScene = async (page, target) => {
  const selectors = {
    dashboard: ".cardDashboard",
    "draggable-sun": ".sun-container .minded-sun",
    "intent-selection": ".intent-selection-wrapper",
    "duration-selection": ".time-selection-wrapper",
    "q-something-i-am-looking-forward-to": "#minded-6622-question",
  };
  const selector = selectors[target];
  if (!selector) throw new Error(`Unknown video scene: ${target}`);
  await page.waitForSelector(selector);
};

const playScene = async (page, scene, sceneIndex, baseUrl, pageErrors) => {
  await page.goto(createVideoUrl(baseUrl, scene), { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__MINDED_SCREENSHOT_READY__ === true);
  await page.evaluate(() => document.fonts?.ready);
  await waitForScene(page, scene.target);
  await installVideoChrome(page);

  if (pageErrors.length) {
    throw new Error(
      `Browser errors while preparing ${scene.target}:\n${pageErrors.join("\n")}`,
    );
  }

  if (sceneIndex === 0) {
    await addCard(page, {
      title: "A gentle pause\nbetween you and the scroll.",
      subtitle: "Notice. Choose. Continue.",
    });
    await revealScene(page);
    await wait(page, 2200);
    await hideCard(page);
    await wait(page, 800);
    return;
  }

  await addCaption(page, scene.caption);
  await revealScene(page);
  await wait(page, 650);

  if (scene.target === "draggable-sun") {
    const sun = page.locator(".sun-container .minded-sun");
    await dragSunDown(page, sun);
    await wait(page, 1500);
  } else if (scene.target === "intent-selection") {
    const intent = page.getByRole("button", { name: "check one thing" });
    await intent.hover();
    await wait(page, 550);
    await intent.click();
    await wait(page, 300);
  } else if (scene.target === "duration-selection") {
    const duration = page.getByRole("button", { name: "5 min", exact: true });
    await duration.hover();
    await wait(page, 550);
    await duration.click();
    await wait(page, 300);
  } else if (scene.target === "q-something-i-am-looking-forward-to") {
    await wait(page, 450);
    await page.locator("#minded-6622-question").click();
    await page.waitForSelector("#minded-6622-inp textarea");
    await wait(page, 800);
  }
};

const transcodeVideo = async (recordedPath) => {
  await execFileAsync("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-i",
    recordedPath,
    "-c:v",
    "libx264",
    "-preset",
    "slow",
    "-crf",
    "18",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    outputPath,
  ]);

  if ((await stat(outputPath)).size === 0) {
    throw new Error("The generated product video is empty.");
  }
};

export const captureVideo = async () => {
  await mkdir(outputDir, { recursive: true });
  const recordingDir = await mkdtemp(path.join(tmpdir(), "minded-video-"));
  const server = await createServer({
    configFile: path.join(extensionDir, "vite.config.ts"),
    mode: "screenshots",
    server: { host: "127.0.0.1", port: 5175, strictPort: false },
  });

  let browser;
  let context;
  try {
    await server.listen();
    const baseUrl = server.resolvedUrls?.local?.[0];
    if (!baseUrl) throw new Error("Vite did not expose a local server URL.");

    browser = await chromium.launch();
    const warmupPage = await browser.newPage({ viewport });
    await warmupPage.goto(createVideoUrl(baseUrl, VIDEO_SCENES[0]), {
      waitUntil: "networkidle",
    });
    await warmupPage.waitForFunction(
      () => window.__MINDED_SCREENSHOT_READY__ === true,
    );
    await warmupPage.close();

    context = await browser.newContext({
      viewport,
      deviceScaleFactor: 1,
      recordVideo: { dir: recordingDir, size: viewport },
    });
    await context.addInitScript(installTransitionCurtain);

    const page = await context.newPage();
    const video = page.video();
    const pageErrors = [];
    page.on("pageerror", (error) => {
      pageErrors.push(error.stack || error.message);
    });
    page.on("console", (message) => {
      if (message.type() === "error") pageErrors.push(message.text());
    });

    for (const [index, scene] of VIDEO_SCENES.entries()) {
      pageErrors.length = 0;
      await playScene(page, scene, index, baseUrl, pageErrors);
      if (index < VIDEO_SCENES.length - 1) await coverScene(page);
    }

    await addCard(page, {
      title: "Less autopilot.\nMore intention.",
      subtitle: "A mindfulness app for the moments you reach for a scroll.",
    });
    await wait(page, 2200);

    await context.close();
    context = undefined;
    if (!video) throw new Error("Playwright did not create a video recording.");

    await transcodeVideo(await video.path());
    console.log(`Created ${path.relative(repoRoot, outputPath)}`);
  } finally {
    await context?.close();
    await browser?.close();
    await server.close();
    await rm(recordingDir, { recursive: true, force: true });
  }
};

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) await captureVideo();
