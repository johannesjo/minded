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
  { target: "browser-social", theme: "light" },
  { target: "browser-intervention", theme: "light" },
];

export const VIDEO_SITES = Object.freeze(["youtube", "x", "instagram"]);

export const VIDEO_COPY = Object.freeze({
  choice: "take a short walk",
  endTitle: "A pause\nbefore the scroll.",
  endSubtitle: "You decide what happens next.",
});

export const VIDEO_TIMING = Object.freeze({
  socialSiteMs: 750,
  instagramMs: 1200,
  questionMs: 1200,
  instructionsMs: 2200,
  afterDragMs: 900,
  tabCloseMs: 1300,
});

export const createVideoUrl = (baseUrl, scene) => {
  const url = new URL(baseUrl);
  url.searchParams.set("target", scene.target);
  url.searchParams.set("theme", scene.theme);
  url.searchParams.set("platform", "web-extension");
  url.searchParams.set("skyHour", "9");
  url.searchParams.set("browser", "1");
  return url.toString();
};

export const getDownwardDragPath = (box, distance = 170, steps = 32) => {
  const center = {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  };

  return Array.from({ length: steps + 1 }, (_, index) => {
    const progress = index / steps;
    const easedProgress = progress * progress * (3 - 2 * progress);

    return {
      x: center.x,
      y: center.y + distance * easedProgress,
    };
  });
};

export const getPointerApproachPath = (target, steps = 8) => {
  const start = { x: target.x + 90, y: target.y - 70 };

  return Array.from({ length: steps + 1 }, (_, index) => ({
    x: start.x + ((target.x - start.x) * index) / steps,
    y: start.y + ((target.y - start.y) * index) / steps,
  }));
};

export const installTransitionCurtain = () => {
  const install = () => {
    const style = document.createElement("style");
    style.textContent = `
      html::after {
        background: #f4ecd6;
        content: "";
        bottom: 0;
        left: 0;
        opacity: 1;
        pointer-events: none;
        position: fixed;
        right: 0;
        top: 68px;
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

const installVideoPointer = async (page, initialPosition) => {
  await page.locator("body").evaluate((body, position) => {
    document.getElementById("minded-video-pointer")?.remove();
    document.getElementById("minded-video-pointer-style")?.remove();

    const style = document.createElement("style");
    style.id = "minded-video-pointer-style";
    style.textContent = `
      #minded-video-pointer {
        filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.18));
        height: 40px;
        opacity: 0;
        pointer-events: none;
        position: fixed;
        transition:
          left 40ms linear,
          top 40ms linear,
          opacity 240ms ease;
        width: 32px;
        z-index: 2147483647;
      }
      #minded-video-pointer.is-visible { opacity: 1; }
      #minded-video-pointer.is-hidden { opacity: 0; }
      #minded-video-pointer svg {
        overflow: visible;
        transform-origin: 4px 3px;
        transition: transform 150ms ease;
      }
      #minded-video-pointer::after {
        border: 2px solid rgba(37, 37, 37, 0.55);
        border-radius: 50%;
        content: "";
        height: 14px;
        left: -5px;
        opacity: 0;
        position: absolute;
        top: -5px;
        transform: scale(0.5);
        transition:
          opacity 180ms ease,
          transform 180ms ease;
        width: 14px;
      }
      #minded-video-pointer.is-dragging svg {
        transform: scale(0.9) translate(1px, 2px);
      }
      #minded-video-pointer.is-dragging::after {
        opacity: 0.65;
        transform: scale(1.5);
      }
    `;
    document.documentElement.appendChild(style);

    const pointer = document.createElement("div");
    pointer.id = "minded-video-pointer";
    pointer.setAttribute("aria-hidden", "true");
    pointer.innerHTML = `
      <svg viewBox="0 0 32 40" width="32" height="40" aria-hidden="true">
        <path
          d="M4 3v26l7-6 6 13 6-3-6-12h10L4 3Z"
          fill="#fff"
          stroke="#252525"
          stroke-linejoin="round"
          stroke-width="2.2"
        />
      </svg>
    `;

    const movePointer = (x, y) => {
      pointer.style.left = `${x - 4}px`;
      pointer.style.top = `${y - 3}px`;
    };
    movePointer(position.x, position.y);

    window.addEventListener(
      "mousemove",
      (event) => movePointer(event.clientX, event.clientY),
      true,
    );
    window.addEventListener(
      "mousedown",
      () => pointer.classList.add("is-dragging"),
      true,
    );
    window.addEventListener(
      "mouseup",
      () => pointer.classList.remove("is-dragging"),
      true,
    );

    body.appendChild(pointer);
    requestAnimationFrame(() => pointer.classList.add("is-visible"));
  }, initialPosition);
};

const hideVideoPointer = async (page) => {
  await page.locator("#minded-video-pointer").evaluate((pointer) => {
    pointer.classList.add("is-hidden");
  });
};

const chooseAlternative = async (page, alternative) => {
  const box = await alternative.boundingBox();
  if (!box) throw new Error("Could not measure the alternative for the video.");

  const target = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const [pointerStart, ...pointerApproach] = getPointerApproachPath(target);
  await installVideoPointer(page, pointerStart);
  await wait(page, 180);
  for (const point of pointerApproach) {
    await page.mouse.move(point.x, point.y);
    await wait(page, 65);
  }
  await wait(page, 180);
  await page.mouse.down();
  await wait(page, 180);
  await page.mouse.up();
  await wait(page, 180);
  await hideVideoPointer(page);
};

const dragSunDown = async (page, sun) => {
  const box = await sun.boundingBox();
  if (!box) throw new Error("Could not measure the sun for the video drag.");

  const [start, ...dragPath] = getDownwardDragPath(box);
  const [pointerStart, ...pointerApproach] = getPointerApproachPath(start);
  await installVideoPointer(page, pointerStart);
  await wait(page, 250);
  for (const point of pointerApproach) {
    await page.mouse.move(point.x, point.y);
    await wait(page, 70);
  }
  await wait(page, 250);
  await page.mouse.down();
  try {
    await wait(page, 180);
    for (const point of dragPath) {
      await page.mouse.move(point.x, point.y);
      await wait(page, 40);
    }
    await wait(page, 120);
  } finally {
    await page.mouse.up();
  }
  await wait(page, 180);
  await hideVideoPointer(page);
};

const installVideoChrome = async (page) => {
  await page
    .locator("#minded-motion-freeze")
    .evaluateAll((elements) => elements.forEach((element) => element.remove()));
  await page.addStyleTag({
    content: `
      html, body { overflow: hidden; }
      #minded-6622-coloured-wrapper,
      #minded-6622-coloured-wrapper-dynamic {
        height: calc(100vh - 68px) !important;
        top: 68px !important;
      }
      .background-transition,
      .background-transition-grain {
        top: 68px !important;
      }

      .minded-video-card {
        color: #252525;
        font-family: inherit;
        pointer-events: none;
        position: fixed;
        z-index: 10000000000000000;
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
        top: 68px;
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
      body.appendChild(card);
      requestAnimationFrame(() => card.classList.add("is-visible"));
    },
    { title, subtitle },
  );
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

const closeBrowserTab = async (page) => {
  await page.evaluate(() => {
    const closeTab = window.__MINDED_CLOSE_BROWSER_TAB__;
    if (typeof closeTab !== "function") {
      throw new Error("The screenshot surface cannot close the demo tab.");
    }
    closeTab();
  });
  await wait(page, VIDEO_TIMING.tabCloseMs);
};

const showBrowserSite = async (page, site, milliseconds) => {
  await page.evaluate((nextSite) => {
    const showSite = window.__MINDED_SET_BROWSER_SITE__;
    if (typeof showSite !== "function") {
      throw new Error("The screenshot surface cannot switch demo websites.");
    }
    showSite(nextSite);
  }, site);
  await wait(page, milliseconds);
};

const waitForScene = async (page, target) => {
  const selectors = {
    "browser-social": "#minded-video-social-pile",
    "browser-intervention": "#minded-6622-question",
  };
  const selector = selectors[target];
  if (!selector) throw new Error(`Unknown video scene: ${target}`);
  await page.waitForSelector(selector);
};

export const loadScene = async (page, scene, baseUrl, isFirstScene) => {
  const url = createVideoUrl(baseUrl, scene);
  if (isFirstScene) {
    await page.goto(url, { waitUntil: "networkidle" });
    return;
  }

  await page.evaluate(
    ({ target, url: nextUrl }) => {
      const setTarget = window.__MINDED_SET_SCREENSHOT_TARGET__;
      if (typeof setTarget !== "function") {
        throw new Error("The screenshot surface cannot switch video scenes.");
      }
      history.replaceState(null, "", nextUrl);
      setTarget(target);
    },
    { target: scene.target, url },
  );
};

const playScene = async (page, scene, baseUrl, pageErrors, isFirstScene) => {
  await loadScene(page, scene, baseUrl, isFirstScene);
  await page.waitForFunction(() => window.__MINDED_SCREENSHOT_READY__ === true);
  await page.evaluate(() => document.fonts?.ready);
  await waitForScene(page, scene.target);
  await installVideoChrome(page);

  if (pageErrors.length) {
    throw new Error(
      `Browser errors while preparing ${scene.target}:\n${pageErrors.join("\n")}`,
    );
  }

  if (scene.target === "browser-social") {
    await revealScene(page);
    await wait(page, VIDEO_TIMING.socialSiteMs);
    await showBrowserSite(page, VIDEO_SITES[1], VIDEO_TIMING.socialSiteMs);
    await showBrowserSite(page, VIDEO_SITES[2], VIDEO_TIMING.instagramMs);
    return;
  }

  await revealScene(page);
  await wait(page, VIDEO_TIMING.questionMs);

  const alternative = page.getByRole("button", {
    name: VIDEO_COPY.choice,
    exact: true,
  });
  await chooseAlternative(page, alternative);
  await page.waitForSelector(".sun-instructions-line.is-visible");
  await wait(page, VIDEO_TIMING.instructionsMs);

  const sun = page.locator(".sun-container .minded-sun");
  await dragSunDown(page, sun);
  await wait(page, VIDEO_TIMING.afterDragMs);
  await closeBrowserTab(page);
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
      await playScene(page, scene, baseUrl, pageErrors, index === 0);
      if (index < VIDEO_SCENES.length - 1) await coverScene(page);
    }

    await addCard(page, {
      title: VIDEO_COPY.endTitle,
      subtitle: VIDEO_COPY.endSubtitle,
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
