// Convert the Android sun-widget vector drawables into inline SVG so the
// styleguide (and its per-PR preview deploy) can show the two time-of-day
// phases without an Android build. The Android `ic_sun_widget_*.xml` files stay
// the single source of truth: this script reads them and emits a generated TS
// module - it never hand-copies colours, so the preview can't silently drift
// from what ships on the device. Run via `npm run generate:widget-previews`
// (also wired as a `pre` step of `styleguide:build`).
//
// Fidelity caveat: browser SVG radial gradients are close to, but not pixel-
// identical to, Android's rendering. Good for reviewing palette and catching
// drift; not a substitute for one on-device glance.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "../..");
const drawableDir = resolve(repoRoot, "android/app/src/main/res/drawable");
const outFile = resolve(
  scriptDir,
  "../src/shared/components/styleguide/generated/sunWidgetPreviews.ts",
);

// Mirrors SunWidgetPhase.kt's boundaries (day 6–19, the moon otherwise), which
// are the app's own skyTimeline day/night edges - for display only; the phase
// math itself lives in Kotlin (guarded against drift by widgetClockMirror.test).
const PHASES = [
  { key: "day", label: "Day", hours: "06–19" },
  { key: "night", label: "Night", hours: "19–06" },
];

/** Android #AARRGGBB | #RRGGBB -> { color: '#rrggbb', opacity: number }. */
function parseColor(hex) {
  const h = hex.replace("#", "");
  if (h.length === 8) {
    return {
      color: "#" + h.slice(2),
      opacity: parseInt(h.slice(0, 2), 16) / 255,
    };
  }
  return { color: "#" + h, opacity: 1 };
}

/**
 * A `<group>`'s transform as an SVG one. The night moon's maria are ellipses, but
 * a VectorDrawable radial gradient is always circular, so each ships as a circle
 * squashed by its group - which means this converter has to honour groups or the
 * preview would show round maria the device never draws.
 *
 * Android composes a group as T(pivot) * R * S * T(-pivot), so that is what we
 * emit. rotation/translate aren't used by the sun or moon today, but they are
 * handled rather than ignored: dropping one silently would show a preview that
 * disagrees with the device, which is the one thing this script exists to stop.
 */
function groupTransform(attrs) {
  const num = (name, fallback) => {
    const m = attrs.match(new RegExp(`android:${name}="([^"]+)"`));
    return m ? parseFloat(m[1]) : fallback;
  };
  const sx = num("scaleX", 1);
  const sy = num("scaleY", 1);
  const px = num("pivotX", 0);
  const py = num("pivotY", 0);
  const tx = num("translateX", 0);
  const ty = num("translateY", 0);
  const rot = num("rotation", 0);

  const parts = [];
  if (tx !== 0 || ty !== 0) parts.push(`translate(${tx} ${ty})`);
  if (rot !== 0 || sx !== 1 || sy !== 1) {
    parts.push(`translate(${px} ${py})`);
    if (rot !== 0) parts.push(`rotate(${rot})`);
    if (sx !== 1 || sy !== 1) parts.push(`scale(${sx} ${sy})`);
    parts.push(`translate(${-px} ${-py})`);
  }
  return parts.length ? parts.join(" ") : null;
}

/** One Android `<vector>` drawable -> one standalone SVG string (for an <img>). */
function vectorToSvg(xml, key) {
  // Walk the drawable in order, keeping a stack of enclosing <group>s so a path
  // inherits the composed transform. Each <path> carries android:pathData (already
  // SVG path syntax) and one nested radial <gradient> with <item> stops.
  //
  // Self-closing forms are matched explicitly. Without that, a `<path ... />`
  // would make the paired-tag pattern run on to the NEXT `</path>`, swallowing
  // any groups in between and mixing one path's geometry with another's gradient -
  // a plausible-looking, silently wrong SVG. No converted drawable has one today,
  // but other drawables in this repo do (ic_timer_24.xml, the launcher icons), so
  // it is one copy-paste away.
  const token =
    /<group\b([^>]*?)\/>|<group\b([^>]*)>|<\/group>|<path\b[^>]*?\/>|<path\b[\s\S]*?<\/path>/g;
  let defs = "";
  let shapes = "";
  const groups = [];
  let i = 0;
  let match;

  while ((match = token.exec(xml)) !== null) {
    const [raw, selfClosingGroupAttrs, groupAttrs] = match;

    if (raw.startsWith("</group")) {
      groups.pop();
      continue;
    }
    if (raw.startsWith("<group")) {
      // A self-closing group encloses nothing, so it must not push a scope.
      if (selfClosingGroupAttrs === undefined)
        groups.push(groupTransform(groupAttrs));
      continue;
    }

    const block = raw;
    const pathData = block.match(/android:pathData="([^"]+)"/)[1];
    const gradient = block.match(/android:centerX="([^"]+)"/);
    if (!gradient) {
      // A path with a plain fillColor rather than a nested gradient. Nothing in
      // the sun/moon drawables hits this; skip rather than crash on a stray one.
      continue;
    }
    const cx = gradient[1];
    const cy = block.match(/android:centerY="([^"]+)"/)[1];
    const r = block.match(/android:gradientRadius="([^"]+)"/)[1];
    const stops = [
      ...block.matchAll(/android:offset="([^"]+)"\s+android:color="([^"]+)"/g),
    ]
      .map(([, offset, color]) => {
        const { color: c, opacity } = parseColor(color);
        return `<stop offset="${offset}" stop-color="${c}" stop-opacity="${opacity}"/>`;
      })
      .join("");
    const gid = `sw-${key}-${i++}`;
    defs += `<radialGradient id="${gid}" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${r}">${stops}</radialGradient>`;
    const transform = groups.filter(Boolean).join(" ");
    const t = transform ? ` transform="${transform}"` : "";
    shapes += `<path d="${pathData}" fill="url(#${gid})"${t}/>`;
  }

  return (
    `<svg viewBox="0 0 108 108" width="108" height="108" ` +
    `xmlns="http://www.w3.org/2000/svg"><defs>${defs}</defs>${shapes}</svg>`
  );
}

// Both phases are vector drawables now: the moon stopped being a photograph
// when the in-app moon did (there is only ever one moon), so night converts the
// same way day always has.
const previews = PHASES.map(({ key, label, hours }) => {
  const xml = readFileSync(
    resolve(drawableDir, `ic_sun_widget_${key}.xml`),
    "utf8",
  );
  return { key, label, hours, svg: vectorToSvg(xml, key) };
});

const banner =
  "// GENERATED by extension/scripts/generate-widget-previews.mjs - do not edit by hand.\n" +
  "// Source of truth: android/app/src/main/res/drawable/ic_sun_widget_{day,night}.xml\n" +
  "// Regenerate with: npm run generate:widget-previews\n";

const body =
  banner +
  "\nexport interface SunWidgetPreview {\n" +
  '  key: "day" | "night";\n' +
  "  label: string;\n" +
  "  /** Display-only hour range for the phase. */\n" +
  "  hours: string;\n" +
  "  /** Inline SVG converted 1:1 from the phase's vector drawable. */\n" +
  "  svg: string;\n" +
  "}\n\n" +
  "export const SUN_WIDGET_PREVIEWS: SunWidgetPreview[] = " +
  JSON.stringify(previews, null, 2) +
  ";\n";

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, body);
console.log(
  `generate-widget-previews: wrote ${previews.length} phases -> ${outFile}`,
);
