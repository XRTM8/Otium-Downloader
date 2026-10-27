#!/usr/bin/env node
/**
 * Single-version guard for Otium Downloader.
 *
 * Ensures package.json is the single source of truth and enforces that
 * Cargo.toml, Cargo.lock, and tauri.conf.json match the same version string.
 * When called with a release tag (e.g. v1.0.0), verifies tag parity.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const checks = [];

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

function check(label, actual, expected) {
  checks.push({ label, actual, expected, ok: actual === expected });
  if (actual !== expected) {
    failures.push(`${label}: expected ${expected}, found ${actual}`);
  }
}

function parseJson(relativePath) {
  try {
    return JSON.parse(read(relativePath));
  } catch (error) {
    failures.push(`${relativePath}: ${error.message}`);
    return null;
  }
}

function cargoPackageVersion(toml) {
  const section = /^\[package\]\s*$([\s\S]*?)(?=^\[|(?![\s\S]))/m.exec(toml);
  if (!section) return null;
  const version = /^\s*version\s*=\s*"([^"]+)"/m.exec(section[1]);
  return version ? version[1] : null;
}

function cargoLockVersion(lock) {
  const blocks = lock.split(/^\[\[package\]\]\s*$/m);
  for (const block of blocks) {
    if (/^\s*name\s*=\s*"otium_downloader"\s*$/m.test(block)) {
      const version = /^\s*version\s*=\s*"([^"]+)"/m.exec(block);
      return version ? version[1] : null;
    }
  }
  return null;
}

const pkg = parseJson('package.json');
if (!pkg) {
  console.error('Failed to parse package.json');
  process.exit(1);
}

const canonicalVersion = pkg.version;
if (!canonicalVersion) {
  console.error('package.json missing version field');
  process.exit(1);
}

// 1. Cargo.toml
const cargoToml = read('src-tauri/Cargo.toml');
check('src-tauri/Cargo.toml [package].version', cargoPackageVersion(cargoToml), canonicalVersion);

// 2. Cargo.lock
const cargoLock = read('src-tauri/Cargo.lock');
check('src-tauri/Cargo.lock otium_downloader version', cargoLockVersion(cargoLock), canonicalVersion);

// 3. tauri.conf.json
const tauriConf = parseJson('src-tauri/tauri.conf.json');
if (tauriConf) {
  check('src-tauri/tauri.conf.json version', tauriConf.version, canonicalVersion);
}

// 4. Tag argument (if supplied)
const tagArg = process.argv.slice(2).find((arg) => !arg.startsWith('--'));
if (tagArg) {
  const expectedTag = `v${canonicalVersion}`;
  check('Release git tag argument', tagArg, expectedTag);
}

console.log(`Otium Downloader Version Guard: v${canonicalVersion}`);
for (const c of checks) {
  console.log(`  ${c.ok ? '✓' : '✗'} ${c.label} (${c.actual})`);
}

if (failures.length > 0) {
  console.error('\nVersion check FAILED with mismatched versions:');
  for (const f of failures) {
    console.error(`  - ${f}`);
  }
  process.exit(1);
}

console.log('\nAll versions strictly consistent.');
