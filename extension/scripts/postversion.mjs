#!/usr/bin/env node

/**
 * postversion hook — runs last, after npm bumps package.json/lock and
 * after sync-platforms.mjs syncs gradle + pbxproj.
 *
 * Why this script exists:
 * npm's `npm version` is documented to commit + tag between the version
 * and postversion hooks. We observed it silently skipping that step in
 * this repo (postversion ran, but no commit and no tag — git status left
 * package.json/lock unstaged and gradle/pbxproj staged from the version
 * hook). Likely cause: npm's commit logic abandons quietly when the
 * version hook stages files outside the package directory.
 *
 * Rather than chase the npm-internal bug, we disable npm's commit + tag
 * via .npmrc (git-tag-version=false) and do them here explicitly. The
 * `npm version patch` interface stays the same; only the plumbing differs.
 *
 * See docs/release-automation-plan.md → "Release commit + tag" for the
 * full rationale.
 */

import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXT_ROOT = resolve(__dirname, '..');
const ROOT = resolve(EXT_ROOT, '..');

const PATHS = {
  packageJson: resolve(EXT_ROOT, 'package.json'),
  packageLock: resolve(EXT_ROOT, 'package-lock.json'),
  buildGradle: resolve(ROOT, 'android/app/build.gradle.kts'),
  pbxproj: resolve(EXT_ROOT, 'ios/App/App.xcodeproj/project.pbxproj'),
};

const { version } = JSON.parse(readFileSync(PATHS.packageJson, 'utf8'));
const tag = `v${version}`;

execSync(
  `git add ${PATHS.packageJson} ${PATHS.packageLock} ${PATHS.buildGradle} ${PATHS.pbxproj}`,
  { cwd: ROOT, stdio: 'inherit' }
);
execSync(`git commit -m "chore(release): bump version to ${version}"`, {
  cwd: ROOT,
  stdio: 'inherit',
});
execSync(`git tag -a ${tag} -m "Release ${version}"`, { cwd: ROOT, stdio: 'inherit' });

console.log(`\nCreated commit and tag ${tag}.`);
console.log(`Run "git push --follow-tags" to trigger the CI release workflow.`);
