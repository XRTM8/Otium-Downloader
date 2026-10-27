#!/usr/bin/env node
/**
 * Builds the release feed consumed by the Otium updater runtime and in-app feeds.
 *
 * The Windows updater reads `platforms.windows-x86_64` (Tauri's signed installer).
 * The updater UI also reads `assets` to locate the portable EXE.
 */
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

function readJson(relativePath) {
  try {
    return JSON.parse(readFileSync(path.join(root, relativePath), 'utf8'));
  } catch (error) {
    fail(`could not read ${relativePath}: ${error.message}`);
  }
}

function sha256(filePath) {
  const content = readFileSync(filePath);
  return createHash('sha256').update(content).digest('hex');
}

function parseArgs(argv) {
  const options = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith('--')) fail(`unexpected argument: ${argument}`);

    const equals = argument.indexOf('=');
    if (equals !== -1) {
      options.set(argument.slice(2, equals), argument.slice(equals + 1));
      continue;
    }

    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      options.set(argument.slice(2), 'true');
      continue;
    }

    options.set(argument.slice(2), next);
    index += 1;
  }
  return options;
}

const args = parseArgs(process.argv.slice(2));
const pkg = readJson('package.json');
const version = pkg.version;
const tag = args.get('tag') || `v${version}`;
const repository = 'XRTM8/Otium-Downloader';

const outDir = path.resolve(root, args.get('out-dir') || 'release');
mkdirSync(outDir, { recursive: true });

const installerPath = args.get('installer');
const signaturePath = args.get('signature');
const portablePath = args.get('portable');

const feed = {
  version,
  notes: args.get('notes') || `Otium Downloader ${version} release.`,
  pub_date: new Date().toISOString(),
  platforms: {},
  assets: []
};

// 1. Windows NSIS Installer + Signature
if (installerPath && existsSync(installerPath)) {
  const installerName = `Otium_Downloader_${version}_x64-setup.exe`;
  const stagedInstaller = path.join(outDir, installerName);
  if (path.resolve(installerPath) !== path.resolve(stagedInstaller)) {
    copyFileSync(installerPath, stagedInstaller);
  }

  let signature = '';
  if (signaturePath && existsSync(signaturePath)) {
    signature = readFileSync(signaturePath, 'utf8').trim();
    writeFileSync(`${stagedInstaller}.sig`, `${signature}\n`);
  }

  const stat = statSync(stagedInstaller);
  const hash = sha256(stagedInstaller);

  feed.platforms['windows-x86_64'] = {
    signature,
    url: `https://github.com/${repository}/releases/download/${tag}/${installerName}`
  };

  feed.assets.push({
    name: installerName,
    kind: 'windows-installer',
    arch: 'x86_64',
    url: `https://github.com/${repository}/releases/download/${tag}/${installerName}`,
    size: stat.size,
    sha256: hash
  });
}

// 2. Windows Portable Executable
if (portablePath && existsSync(portablePath)) {
  const portableName = `otium-downloader-${version}-portable.exe`;
  const stagedPortable = path.join(outDir, portableName);
  if (path.resolve(portablePath) !== path.resolve(stagedPortable)) {
    copyFileSync(portablePath, stagedPortable);
  }

  const stat = statSync(stagedPortable);
  const hash = sha256(stagedPortable);

  feed.assets.push({
    name: portableName,
    kind: 'windows-portable',
    arch: 'x86_64',
    url: `https://github.com/${repository}/releases/download/${tag}/${portableName}`,
    size: stat.size,
    sha256: hash
  });
}

const feedPath = path.join(outDir, 'latest.json');
writeFileSync(feedPath, JSON.stringify(feed, null, 2) + '\n');
console.log(`Generated updater feed at: ${feedPath}`);
