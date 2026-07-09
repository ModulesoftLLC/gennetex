#!/usr/bin/env node
/**
 * .env → admin-web/index.html Supabase тохиргоо синк
 * Ажиллуулах: npm run admin:sync-env
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ENV_FILE = path.join(ROOT, '.env');
const ADMIN_HTML = path.join(ROOT, 'admin-web/index.html');

function readEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error('.env файл олдсонгүй. .env.example-ээс хуулна уу.');
    process.exit(1);
  }
  const out = {};
  fs.readFileSync(filePath, 'utf8')
    .split('\n')
    .forEach((line) => {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (!m) return;
      out[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '');
    });
  return out;
}

const env = readEnv(ENV_FILE);
const url = env.EXPO_PUBLIC_SUPABASE_URL;
const key = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('EXPO_PUBLIC_SUPABASE_URL болон EXPO_PUBLIC_SUPABASE_ANON_KEY .env дээр байх ёстой.');
  process.exit(1);
}

let html = fs.readFileSync(ADMIN_HTML, 'utf8');
html = html.replace(
  /const SUPABASE_URL = '[^']*';/,
  `const SUPABASE_URL = '${url}';`,
);
html = html.replace(
  /const SUPABASE_ANON_KEY = '[^']*';/,
  `const SUPABASE_ANON_KEY = '${key}';`,
);
fs.writeFileSync(ADMIN_HTML, html);
console.log('Admin web Supabase тохиргоо синк хийгдлээ:', url);
