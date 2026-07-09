#!/usr/bin/env node
/**
 * Vercel deploy бэлдэх скрипт:
 *   dist-web/                 → adiya.site (нийтийн танилцуулга сайт)
 *   dist-web/gennetex/admin/  → adiya.site/gennetex/admin (админ хяналтын самбар)
 *
 * Ингэснээр эх кодод admin-web/, public-web/ тусдаа хэвээр үлдэж, зөвхөн
 * гаралт (dist-web) дээр нэгтгэгдэнэ.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist-web');
const publicWeb = path.join(root, 'public-web');
const adminWeb = path.join(root, 'admin-web');
const logo = path.join(root, 'assets', 'logo.png');

function rimraf(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

function copyDir(src, destDir) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(destDir, { recursive: true });
  fs.cpSync(src, destDir, { recursive: true });
}

console.log('[build-web] Цэвэрлэж байна:', dist);
rimraf(dist);
fs.mkdirSync(dist, { recursive: true });

// 1) Нийтийн сайт → dist-web/
console.log('[build-web] Нийтийн сайт хуулж байна (public-web → dist-web)');
copyDir(publicWeb, dist);

// Лого — нийтийн сайтад
if (fs.existsSync(logo)) {
  fs.copyFileSync(logo, path.join(dist, 'logo.png'));
}

// 2) Админ самбар → dist-web/gennetex/admin/
const adminDest = path.join(dist, 'gennetex', 'admin');
console.log('[build-web] Админ самбар хуулж байна (admin-web → dist-web/gennetex/admin)');
copyDir(adminWeb, adminDest);

console.log('[build-web] Бэлэн. Гаралт:', dist);
