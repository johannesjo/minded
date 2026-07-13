#!/usr/bin/env node

/**
 * preversion hook - runs before `npm version` bumps package.json.
 *
 * npm itself enforces a clean working tree. We add: refuse to bump
 * if local main is behind origin/main, otherwise a subsequent pull
 * --rebase rewrites the version commit and orphans the tag.
 */

import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

try {
  execSync('git fetch --quiet origin main', { cwd: ROOT });
  const behind = execSync('git rev-list --count HEAD..origin/main', {
    cwd: ROOT,
    encoding: 'utf8',
  }).trim();
  if (behind !== '0') {
    console.error(
      `Error: local main is ${behind} commit(s) behind origin/main. Pull first - otherwise the tag will point at an orphan commit after the next rebase.`
    );
    process.exit(1);
  }
} catch (err) {
  console.error('Preflight failed:', err.message);
  process.exit(1);
}
