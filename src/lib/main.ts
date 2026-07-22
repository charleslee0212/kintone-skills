#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const GITHUB_REPO = 'https://github.com/Kintone-US/kintone-claude-skills.git';
const DEFAULT_TARGET = './';
const PRESERVE_DIR = 'projects';

// Internal-only content that must never reach a user's project, on any run.
const EXCLUDED_ROOT_DIRS = ['feedback', 'tasks'];
const EXCLUDED_FILENAMES = [
  'initiate-testing.md',
  'feedback-reviewer.md',
  'feedback-review.md',
];

function log(msg: string) {
  console.log(msg);
}

function fail(msg: string) {
  console.error(`\n✖ ${msg}`);
  process.exit(1);
}

function commandExists(cmd: string) {
  const result = spawnSync(cmd, ['--version'], { stdio: 'ignore' });
  return result.status === 0;
}

function parseArgs(argv: string[]) {
  const args: { target: string; help?: boolean } = { target: DEFAULT_TARGET };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dir' && i + 1 < argv.length) {
      args.target = argv[i + 1];
      i++;
    }
    if (a === '--help' || a === '-h') args.help = true;
  }
  return args;
}

function printHelp() {
  log(`
kintone-skills

Sets up Kintone's internal Claude skills repo into a
local project directory, using git for auth.

Usage:
  npx kintone-skills [options]

Options:
--dir <path>        Target directory (default: ${DEFAULT_TARGET})
  -h, --help          Show this help

Notes:
  - Requires git to be installed, with access to the skills repo
    already configured (SSH key or credential helper/token).
  - This only ever adds/refreshes shared skill files; it never
    leaves behind a git repo to commit or push to.
  - '${PRESERVE_DIR}/' is seeded once on first run and is never
    touched again, so your own work there is safe.
`);
}

function cloneToTempDir(repoUrl: string): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kintone-skills-'));
  const result = spawnSync(
    'git',
    ['clone', '--depth', '1', '--quiet', repoUrl, tmpDir],
    { stdio: ['ignore', 'ignore', 'pipe'], encoding: 'utf-8' },
  );

  if (result.status !== 0) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    const stderr = (result.stderr || '').toLowerCase();
    if (
      stderr.includes('not found') ||
      stderr.includes('access denied') ||
      stderr.includes('permission denied') ||
      stderr.includes('could not read')
    ) {
      fail(
        `You don't have access to ${repoUrl} (or it doesn't exist). ` +
          `Ask an admin to add you to the repo, then try again.`,
      );
    }
    fail(
      `Could not fetch ${repoUrl}. Check your git credentials (SSH key or token) and try again.`,
    );
  }

  return tmpDir;
}

function copySkills(sourceDir: string, targetDir: string) {
  fs.mkdirSync(targetDir, { recursive: true });
  const preserveExists = fs.existsSync(path.join(targetDir, PRESERVE_DIR));

  fs.cpSync(sourceDir, targetDir, {
    recursive: true,
    force: true,
    filter: (src) => {
      const rel = path.relative(sourceDir, src);
      if (rel === '.git' || rel.startsWith(`.git${path.sep}`)) return false;
      if (
        preserveExists &&
        (rel === PRESERVE_DIR || rel.startsWith(`${PRESERVE_DIR}${path.sep}`))
      ) {
        return false;
      }
      const topLevelDir = rel.split(path.sep)[0];
      if (EXCLUDED_ROOT_DIRS.includes(topLevelDir)) return false;
      if (EXCLUDED_FILENAMES.includes(path.basename(rel))) return false;
      return true;
    },
  });
}

export default () => {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const targetDir = path.resolve(process.cwd(), args.target);

  if (!commandExists('git')) {
    fail(
      'git not found. Install it from https://git-scm.com/downloads, then try again.',
    );
  }

  log(`↻ Fetching Kintone skills...`);
  const tmpDir = cloneToTempDir(GITHUB_REPO);
  try {
    copySkills(tmpDir, targetDir);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  log(`\n✅ Kintone skills are ready in current directory.`);
  log(`   Re-run "npx kintone-skills" any time to pull the latest updates.`);
  log(`   ('${PRESERVE_DIR}/' is yours and is never overwritten after its first run.)\n`);
};
