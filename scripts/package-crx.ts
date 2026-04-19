import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { resolve } from 'path';

const distDir = resolve(import.meta.dir, '../dist');
const releaseDir = resolve(import.meta.dir, '../release');
const manifestPath = resolve(distDir, 'manifest.json');

// Ensure dist exists
if (!existsSync(distDir)) {
  console.error('dist/ directory not found. Run `bun run build` first.');
  process.exit(1);
}

// Read version from manifest
const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
const version = manifest.version;

// Create release directory
if (!existsSync(releaseDir)) {
  mkdirSync(releaseDir, { recursive: true });
}

console.log(`Packaging repo2txt v${version}...`);

// Create zip for Chrome Web Store
const zipName = `repo2txt-v${version}.zip`;
execSync(`cd ${distDir} && zip -r ${resolve(releaseDir, zipName)} . -x "*.map"`);

console.log(`Created: release/${zipName}`);
console.log('\nUpload this zip to Chrome Web Store Developer Dashboard.');
console.log('For local testing, load the dist/ folder as an unpacked extension.');
