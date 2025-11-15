#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🔍 Admin Node Health Check');
console.log('==========================\n');

// 1. Verify dotenv loading
console.log('1. Checking dotenv configuration...');
try {
  const envCount = Object.keys(process.env).length;
  console.log(`✅ dotenv loaded successfully (${envCount} environment variables)`);
} catch (error) {
  console.log('❌ Failed to load dotenv:', error);
  process.exit(1);
}

// 2. Check environment variables
console.log('\n2. Checking environment variables...');

const requiredEnvVars = [
  'SERVICE_JWT_PRIVATE_KEY_PATH',
  'FOUNDER_PUBLIC_KEY_PATH',
  'GOVERNANCE_PRIVATE_KEY_PATH'
];

let allEnvVarsPresent = true;

for (const envVar of requiredEnvVars) {
  const value = process.env[envVar];
  if (value) {
    console.log(`✅ ${envVar}: ${value}`);
  } else {
    console.log(`❌ ${envVar}: NOT SET`);
    allEnvVarsPresent = false;
  }
}

if (!allEnvVarsPresent) {
  console.log('\n❌ Some required environment variables are missing. Check your .env file.');
  process.exit(1);
}

// 3. Validate key files
console.log('\n3. Validating key files...');

interface KeyCheck {
  name: string;
  path: string;
  expectedHeader: string;
  type: 'private' | 'public';
}

const keyChecks: KeyCheck[] = [
  {
    name: 'Admin Node JWT Private Key',
    path: process.env.SERVICE_JWT_PRIVATE_KEY_PATH!,
    expectedHeader: '-----BEGIN RSA PRIVATE KEY-----',
    type: 'private'
  },
  {
    name: 'Founder Public Key',
    path: process.env.FOUNDER_PUBLIC_KEY_PATH!,
    expectedHeader: '-----BEGIN PUBLIC KEY-----',
    type: 'public'
  },
  {
    name: 'Governance Private Key',
    path: process.env.GOVERNANCE_PRIVATE_KEY_PATH!,
    expectedHeader: '-----BEGIN RSA PRIVATE KEY-----',
    type: 'private'
  }
];

let allKeysValid = true;

for (const check of keyChecks) {
  try {
    const fullPath = path.resolve(check.path);

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      console.log(`❌ ${check.name}: File not found at ${fullPath}`);
      allKeysValid = false;
      continue;
    }

    // Read file content
    const content = fs.readFileSync(fullPath, 'utf8');

    // Check header
    const firstLine = content.split('\n')[0].trim();
    if (firstLine !== check.expectedHeader) {
      console.log(`❌ ${check.name}: Invalid format. Expected "${check.expectedHeader}", got "${firstLine}"`);
      allKeysValid = false;
      continue;
    }

    // Check for BOM (Byte Order Mark)
    const hasBOM = content.charCodeAt(0) === 0xFEFF;
    if (hasBOM) {
      console.log(`❌ ${check.name}: File contains BOM (Byte Order Mark). Must be UTF-8 without BOM.`);
      allKeysValid = false;
      continue;
    }

    console.log(`✅ ${check.name}: Valid ${check.type} key at ${fullPath}`);

  } catch (error) {
    console.log(`❌ ${check.name}: Error reading file - ${error}`);
    allKeysValid = false;
  }
}

if (!allKeysValid) {
  console.log('\n❌ Some key files are invalid or missing.');
  process.exit(1);
}

// 4. Governance signing readiness
console.log('\n4. Governance signing readiness...');

const governanceKeyPath = process.env.GOVERNANCE_PRIVATE_KEY_PATH!;
try {
  const fullPath = path.resolve(governanceKeyPath);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    const firstLine = content.split('\n')[0].trim();

    if (firstLine === '-----BEGIN RSA PRIVATE KEY-----') {
      console.log('✅ Governance signing enabled - logs will be cryptographically signed');
    } else {
      console.log('❌ Governance signing disabled - invalid key format');
      process.exit(1);
    }
  } else {
    console.log('❌ Governance signing disabled - key file not found');
    process.exit(1);
  }
} catch (error) {
  console.log('❌ Governance signing disabled - error loading key:', error);
  process.exit(1);
}

// 5. Final status
console.log('\n🎉 Health Check Complete!');
console.log('========================');
console.log('✅ dotenv configuration: OK');
console.log('✅ Environment variables: OK');
console.log('✅ Key files: OK');
console.log('✅ Governance signing: ENABLED');
console.log('\n🚀 Admin Node is ready to start!');
console.log('Run: npm start');

process.exit(0);