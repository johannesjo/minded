#!/usr/bin/env node

/**
 * Version Release Automation Script
 *
 * Usage: npm run version [patch|minor|major] [--skip-build] [--skip-git]
 *
 * This script:
 * 1. Bumps version in package.json
 * 2. Syncs version to Android build.gradle.kts
 * 3. Syncs version to iOS project.pbxproj
 * 4. Builds all platforms
 * 5. Creates git commit and tag
 */

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
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

function parseVersion(versionStr) {
  const [major, minor, patch] = versionStr.split('.').map(Number);
  return { major, minor, patch };
}

function incrementVersion(version, type) {
  const v = { ...version };
  switch (type) {
    case 'major':
      v.major += 1;
      v.minor = 0;
      v.patch = 0;
      break;
    case 'minor':
      v.minor += 1;
      v.patch = 0;
      break;
    case 'patch':
      v.patch += 1;
      break;
    default:
      throw new Error(`Invalid version type: ${type}. Use patch, minor, or major.`);
  }
  return v;
}

function versionToString(version) {
  return `${version.major}.${version.minor}.${version.patch}`;
}

function getCurrentAndroidVersionCode() {
  const content = readFileSync(PATHS.buildGradle, 'utf8');
  const match = content.match(/versionCode\s*=\s*(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

function getCurrentIOSBuildNumber() {
  const content = readFileSync(PATHS.pbxproj, 'utf8');
  const match = content.match(/CURRENT_PROJECT_VERSION\s*=\s*(\d+);/);
  return match ? parseInt(match[1], 10) : 0;
}

function updatePackageJson(newVersion) {
  const content = JSON.parse(readFileSync(PATHS.packageJson, 'utf8'));
  content.version = newVersion;
  writeFileSync(PATHS.packageJson, JSON.stringify(content, null, 2) + '\n');
}

function updateAndroidGradle(newVersion, newVersionCode) {
  let content = readFileSync(PATHS.buildGradle, 'utf8');
  content = content.replace(/versionCode\s*=\s*\d+/, `versionCode = ${newVersionCode}`);
  content = content.replace(/versionName\s*=\s*"[^"]+"/, `versionName = "${newVersion}"`);
  writeFileSync(PATHS.buildGradle, content);
}

function updateIOSPbxproj(newVersion, newBuildNumber) {
  let content = readFileSync(PATHS.pbxproj, 'utf8');
  content = content.replace(/MARKETING_VERSION\s*=\s*[^;]+;/g, `MARKETING_VERSION = ${newVersion};`);
  content = content.replace(/CURRENT_PROJECT_VERSION\s*=\s*\d+;/g, `CURRENT_PROJECT_VERSION = ${newBuildNumber};`);
  writeFileSync(PATHS.pbxproj, content);
}

function preflight() {
  try {
    const status = execSync('git status --porcelain', { cwd: ROOT, encoding: 'utf8' });
    if (status.trim()) {
      console.error('Error: Working directory has uncommitted changes. Commit or stash first.');
      process.exit(1);
    }
  } catch {
    console.error('Error: Git check failed');
    process.exit(1);
  }
}

function buildExtension() {
  console.log('\nBuilding browser extension...');
  execSync('npm run build', { cwd: EXT_ROOT, stdio: 'inherit' });
}

function buildAndroid() {
  console.log('\nBuilding Android web assets...');
  execSync('npm run buildDroid', { cwd: EXT_ROOT, stdio: 'inherit' });

  console.log('\nBuilding Android AAB...');
  execSync('./gradlew bundleRelease', { cwd: resolve(ROOT, 'android'), stdio: 'inherit' });
}

function gitCommitAndTag(version) {
  const tag = `v${version}`;
  console.log(`\nCreating git commit and tag ${tag}...`);

  execSync(
    'git add extension/package.json android/app/build.gradle.kts extension/ios/App/App.xcodeproj/project.pbxproj',
    { cwd: ROOT, stdio: 'inherit' }
  );

  execSync(`git commit -m "chore(release): bump version to ${version}"`, { cwd: ROOT, stdio: 'inherit' });

  execSync(`git tag -a ${tag} -m "Release ${version}"`, { cwd: ROOT, stdio: 'inherit' });

  console.log(`\nCreated commit and tag ${tag}`);
  console.log('Run "git push && git push --tags" to publish');
}

function main() {
  const args = process.argv.slice(2);
  const versionType = args.find((arg) => ['patch', 'minor', 'major'].includes(arg));
  const skipBuild = args.includes('--skip-build');
  const skipGit = args.includes('--skip-git');

  if (!versionType) {
    console.error('Usage: npm run version [patch|minor|major] [--skip-build] [--skip-git]');
    process.exit(1);
  }

  if (!skipGit) {
    preflight();
  }

  const pkg = JSON.parse(readFileSync(PATHS.packageJson, 'utf8'));
  const currentVersion = parseVersion(pkg.version);
  const newVersion = incrementVersion(currentVersion, versionType);
  const newVersionStr = versionToString(newVersion);

  const currentAndroidVersionCode = getCurrentAndroidVersionCode();
  const currentIOSBuildNumber = getCurrentIOSBuildNumber();
  const newAndroidVersionCode = currentAndroidVersionCode + 1;
  const newIOSBuildNumber = currentIOSBuildNumber + 1;

  console.log('\nVersion Release Automation');
  console.log('─'.repeat(40));
  console.log(`Version:     ${pkg.version} -> ${newVersionStr}`);
  console.log(`Android:     versionCode ${currentAndroidVersionCode} -> ${newAndroidVersionCode}`);
  console.log(`iOS:         build ${currentIOSBuildNumber} -> ${newIOSBuildNumber}`);
  console.log('─'.repeat(40));

  console.log('\nUpdating version files...');
  updatePackageJson(newVersionStr);
  console.log('  - package.json');

  updateAndroidGradle(newVersionStr, newAndroidVersionCode);
  console.log('  - build.gradle.kts');

  updateIOSPbxproj(newVersionStr, newIOSBuildNumber);
  console.log('  - project.pbxproj');

  if (!skipBuild) {
    try {
      buildExtension();
      buildAndroid();
    } catch (error) {
      console.error('\nBuild failed:', error.message);
      console.error('Version files have been updated. Fix the build and run again with --skip-git');
      process.exit(1);
    }
  } else {
    console.log('\nSkipping builds (--skip-build)');
  }

  if (!skipGit) {
    gitCommitAndTag(newVersionStr);
  } else {
    console.log('\nSkipping git operations (--skip-git)');
  }

  console.log('\nVersion release complete!');
  console.log(`New version: ${newVersionStr}`);

  if (!skipBuild) {
    console.log(`\nOutput files:`);
    console.log(`  Extension: extension/minded.zip`);
    console.log(`  Android:   android/app/build/outputs/bundle/release/app-release.aab`);
  }
}

main();
