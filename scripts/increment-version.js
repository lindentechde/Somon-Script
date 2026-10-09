#!/usr/bin/env node

/**
 * Script to increment version automatically
 * Usage: node scripts/increment-version.js [patch|minor|major]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { syncJsrVersion } = require('./sync-jsr-version');

// Validate Node.js version
const nodeVersion = Number.parseInt(process.version.match(/^v(\d+)/)[1]);
if (nodeVersion < 20) {
  console.error(`❌ Node.js 20+ required, found ${process.version}`);
  process.exit(1);
}

const versionType = process.argv[2] || 'patch';
const dryRun = process.argv.includes('--dry-run');

if (!['patch', 'minor', 'major'].includes(versionType)) {
  console.error('❌ Invalid version type. Use: patch, minor, or major');
  console.error('   Usage: node scripts/increment-version.js [patch|minor|major] [--dry-run]');
  process.exit(1);
}

try {
  // Read current package.json
  const packagePath = path.join(__dirname, '..', 'package.json');
  if (!fs.existsSync(packagePath)) {
    console.error('❌ package.json not found');
    process.exit(1);
  }

  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const currentVersion = packageJson.version;

  // Validate current version format
  if (!/^\d+\.\d+\.\d+$/.test(currentVersion)) {
    console.error(`❌ Invalid current version format: ${currentVersion}`);
    process.exit(1);
  }

  console.log(`📦 Current version: ${currentVersion}`);

  if (dryRun) {
    console.log(`\n📋 Dry-run mode enabled`);
    console.log(`Would bump version (${versionType}): ${currentVersion} → ?`);
    console.log('No changes will be made.');
    process.exit(0);
  }

  // Increment version using npm version command
  execSync(`npm version ${versionType} --no-git-tag-version`, {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
  });

  // Read new version
  const updatedPackageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const newVersion = updatedPackageJson.version;

  console.log(`🚀 New version: ${newVersion}`);

  // Sync jsr.json version (also done by the npm `version` lifecycle script)
  syncJsrVersion();

  // Create git commit with version changes
  try {
    // Check if git is available
    execSync('git --version', { stdio: 'ignore' });

    // Add files
    execSync('git add package.json package-lock.json jsr.json 2>/dev/null || true', {
      cwd: path.join(__dirname, '..'),
      shell: '/bin/bash',
    });

    // Check if there are changes to commit
    const statusOutput = execSync('git status --porcelain', {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf8',
    });

    if (!statusOutput.trim()) {
      console.log(`⚠️  No files staged for commit`);
    } else {
      execSync(`git commit -m "chore: bump version to ${newVersion}"`, {
        cwd: path.join(__dirname, '..'),
      });
      console.log(`✅ Git commit created for version ${newVersion}`);
    }
  } catch (gitError) {
    if (gitError.message.includes('not a git repository')) {
      console.error('❌ Not in a git repository');
      process.exit(1);
    } else if (gitError.message.includes('git config')) {
      console.error('❌ Git not configured (set git user.name and user.email)');
      process.exit(1);
    } else {
      console.warn(`⚠️  Git operation failed: ${gitError.message}`);
      console.warn(`   Version was updated but git commit skipped`);
    }
  }

  console.log(`\n✅ Version incremented successfully (${versionType})`);
  console.log(`\n📌 Next step: git push origin main`);
} catch (error) {
  console.error('❌ Error incrementing version:', error.message);
  process.exit(1);
}
