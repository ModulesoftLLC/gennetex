#!/usr/bin/env node
/**
 * Firebase-only admin build check.
 * Firebase-ийн public web config admin-web/index.html дотор багцлагдсан тул
 * build хийх үед нууц backend credential синк хийх шаардлагагүй.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEFAULT_ADMIN_HTML = path.join(ROOT, 'admin-web/index.html');

function syncAdminEnv(targetHtml = DEFAULT_ADMIN_HTML) {
  if (!fs.existsSync(targetHtml)) {
    console.error('[firebase-admin-check] Файл олдсонгүй:', targetHtml);
    return false;
  }
  const html = fs.readFileSync(targetHtml, 'utf8');
  if (!html.includes('FIREBASE_CONFIG') || !html.includes('createFirebaseSbClient')) {
    console.error('[firebase-admin-check] Firebase тохиргоо дутуу байна.');
    return false;
  }
  console.log('[firebase-admin-check] Firebase-only admin тохиргоо бэлэн.');
  return true;
}

if (require.main === module) {
  const target = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_ADMIN_HTML;
  if (!syncAdminEnv(target)) process.exit(1);
}

module.exports = { syncAdminEnv };
