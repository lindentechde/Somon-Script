#!/usr/bin/env node

/**
 * Copy the version from package.json into jsr.json.
 * Runs as the npm `version` lifecycle script and from increment-version.js.
 * Usage: node scripts/sync-jsr-version.js
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');

function syncJsrVersion() {
  const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  const jsrPath = path.join(rootDir, 'jsr.json');
  if (!fs.existsSync(jsrPath)) {
    console.warn(`⚠️  jsr.json not found (JSR publish may fail)`);
    return false;
  }
  const jsrJson = JSON.parse(fs.readFileSync(jsrPath, 'utf8'));
  jsrJson.version = packageJson.version;
  fs.writeFileSync(jsrPath, JSON.stringify(jsrJson, null, 2) + '\n');
  console.log(`📄 Synced jsr.json to version ${packageJson.version}`);
  return true;
}

module.exports = { syncJsrVersion };

if (require.main === module) {
  syncJsrVersion();
}
