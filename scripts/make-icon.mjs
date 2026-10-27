#!/usr/bin/env node
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const iconSrc = path.join(root, 'app-icon.png');

if (!existsSync(iconSrc)) {
  console.error('Source app-icon.png not found at:', iconSrc);
  process.exit(1);
}

console.log('Generating Tauri app icons from app-icon.png...');
execSync('npx tauri icon app-icon.png', { stdio: 'inherit', cwd: root });
console.log('All platform icons generated successfully.');
