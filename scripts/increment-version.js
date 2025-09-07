#!/usr/bin/env node

/**
 * Script to increment version automatically
 * Usage: node scripts/increment-version.js [patch|minor|major]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const versionType = process.argv[2] || 'patch';

if (!['patch', 'minor', 'major'].includes(versionType)) {
  console.error('❌ Invalid version type. Use: patch, minor, or major');
  process.exit(1);
}

try {
  // Read current package.json
  const packagePath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const currentVersion = packageJson.version;

  console.log(`📦 Current version: ${currentVersion}`);

  // Increment version using npm version command
  execSync(`npm version ${versionType} --no-git-tag-version`, {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
  });

  // Read new version
  const updatedPackageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const newVersion = updatedPackageJson.version;

  console.log(`🚀 New version: ${newVersion}`);
  console.log(`✅ Version incremented successfully (${versionType})`);
} catch (error) {
  console.error('❌ Error incrementing version:', error.message);
  process.exit(1);
}
