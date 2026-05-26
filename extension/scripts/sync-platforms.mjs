#!/usr/bin/env node

/**
 * version hook — runs after npm bumps package.json, before postversion.
 *
 * Syncs the new semver to Android (versionName + bumped versionCode)
 * and iOS (MARKETING_VERSION + bumped CURRENT_PROJECT_VERSION). Files
 * are left unstaged; postversion.mjs stages and commits everything.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXT_ROOT = resolve(__dirname, '..');
const ROOT = resolve(EXT_ROOT, '..');

const PATHS = {
  packageJson: resolve(EXT_ROOT, 'package.json'),
  buildGradle: resolve(ROOT, 'android/app/build.gradle.kts'),
  pbxproj: resolve(EXT_ROOT, 'ios/App/App.xcodeproj/project.pbxproj'),
};

const { version: newVersion } = JSON.parse(readFileSync(PATHS.packageJson, 'utf8'));

let gradle = readFileSync(PATHS.buildGradle, 'utf8');
const currentVersionCode = parseInt(gradle.match(/versionCode\s*=\s*(\d+)/)[1], 10);
const newVersionCode = currentVersionCode + 1;
gradle = gradle.replace(/versionCode\s*=\s*\d+/, `versionCode = ${newVersionCode}`);
gradle = gradle.replace(/versionName\s*=\s*"[^"]+"/, `versionName = "${newVersion}"`);
writeFileSync(PATHS.buildGradle, gradle);

let pbx = readFileSync(PATHS.pbxproj, 'utf8');
const currentBuild = parseInt(pbx.match(/CURRENT_PROJECT_VERSION\s*=\s*(\d+);/)[1], 10);
const newBuild = currentBuild + 1;
pbx = pbx.replace(/MARKETING_VERSION\s*=\s*[^;]+;/g, `MARKETING_VERSION = ${newVersion};`);
pbx = pbx.replace(/CURRENT_PROJECT_VERSION\s*=\s*\d+;/g, `CURRENT_PROJECT_VERSION = ${newBuild};`);
writeFileSync(PATHS.pbxproj, pbx);

console.log(`\nSynced ${newVersion}`);
console.log(`  Android versionCode: ${currentVersionCode} -> ${newVersionCode}`);
console.log(`  iOS build:           ${currentBuild} -> ${newBuild}`);
