import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, createReadStream } from 'fs';
import { resolve } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const crx3 = require('crx3');

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
const zipPath = resolve(releaseDir, zipName);
execSync(`cd ${distDir} && zip -r ${zipPath} . -x "*.map"`);

// Create CRX for self-hosted distribution
const crxName = `repo2txt-v${version}.crx`;
const crxPath = resolve(releaseDir, crxName);

crx3(createReadStream(zipPath), { crxPath })
  .then(() => {
    console.log(`Created: release/${zipName}`);
    console.log(`Created: release/${crxName}`);
    console.log('\nUpload the zip to Chrome Web Store Developer Dashboard.');
    console.log('Use the crx for self-hosted extension distribution.');
    console.log('For local testing, load the dist/ folder as an unpacked extension.');
  })
  .catch((err: Error) => {
    console.error('Failed to create CRX:', err.message);
    process.exit(1);
  });
