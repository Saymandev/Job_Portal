/*
  Simple environment verifier for backend service.
  - Tries to load .env files for local runs (ignored on Render where process.env is provided)
  - Prints presence and basic metadata of required env vars
  - Exits 0 when all required vars are set (non-empty), 1 otherwise
*/

const fs = require('fs');
const path = require('path');

function safeRequire(moduleName) {
  try {
    return require(moduleName);
  } catch {
    return null;
  }
}

// Optionally load dotenv for local dev; on Render, these calls are harmless
const dotenv = safeRequire('dotenv');
if (dotenv) {
  const candidatePaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'apps/backend/.env'),
    path.resolve(process.cwd(), '../.env'),
  ];
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      dotenv.config({ path: p });
      // Do not break; allow later files to override earlier ones
    }
  }
}

const requiredKeys = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'MONGODB_URI'];
const optionalKeys = [
  'JWT_EXPIRES_IN',
  'JWT_REFRESH_EXPIRES_IN',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'PORT',
  'NODE_ENV',
];

function maskValue(value) {
  if (typeof value !== 'string') return String(value);
  const trimmed = value.trim();
  if (trimmed.length <= 4) return '*'.repeat(trimmed.length || 1);
  return `${trimmed.slice(0, 2)}***${trimmed.slice(-2)} (len=${trimmed.length})`;
}

function report(keys, label) {
  console.log(`\n${label}:`);
  for (const key of keys) {
    const val = process.env[key];
    const ok = Boolean(val && String(val).trim());
    console.log(`- ${key}: ${ok ? 'SET' : 'MISSING'}${ok ? ` -> ${maskValue(String(val))}` : ''}`);
  }
}

report(requiredKeys, 'Required');
report(optionalKeys, 'Optional');

const missing = requiredKeys.filter((k) => !process.env[k] || String(process.env[k]).trim() === '');
if (missing.length > 0) {
  console.error(`\nMissing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

console.log('\nAll required environment variables are set.');
process.exit(0);


