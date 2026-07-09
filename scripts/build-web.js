#!/usr/bin/env node
/**
 * Vercel deploy бэлдэх скрипт:
 *   dist-web/                 → adiya.site (нийтийн танилцуулга сайт)
 *   dist-web/gennetex/admin/  → adiya.site/gennetex/admin (админ хяналтын самбар)
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist-web');
const publicWeb = path.join(root, 'public-web');
const publicWebDist = path.join(publicWeb, 'dist');
const publicWebPublic = path.join(publicWeb, 'public');
const adminWeb = path.join(root, 'admin-web');
const logo = path.join(root, 'assets', 'logo.png');
const reportLogo = path.join(root, 'assets', 'report-logo.png');

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

// Copy logos to deploy paths (admin + fallback)
if (fs.existsSync(logo)) {
  fs.mkdirSync(publicWebPublic, { recursive: true });
  fs.copyFileSync(logo, path.join(publicWebPublic, 'logo.png'));
  fs.copyFileSync(logo, path.join(adminWeb, 'logo.png'));
  const adminReport = path.join(adminWeb, 'report-logo.png');
  if (fs.existsSync(reportLogo)) {
    fs.copyFileSync(reportLogo, adminReport);
  } else {
    fs.copyFileSync(logo, adminReport);
  }
}

// 1) React + Tailwind public site build
console.log('[build-web] Public site build (Vite)...');
try {
  execSync('npm install', { cwd: publicWeb, stdio: 'inherit' });
  execSync('npm run build', { cwd: publicWeb, stdio: 'inherit' });
} catch (e) {
  console.error('[build-web] Public site build алдаа:', e.message);
  process.exit(1);
}

if (!fs.existsSync(publicWebDist)) {
  console.error('[build-web] public-web/dist олдсонгүй');
  process.exit(1);
}

console.log('[build-web] dist-web руу хуулж байна');
copyDir(publicWebDist, dist);

if (fs.existsSync(logo) && !fs.existsSync(path.join(dist, 'logo.png'))) {
  fs.copyFileSync(logo, path.join(dist, 'logo.png'));
}

// 2) Админ самбар → dist-web/gennetex/admin/
const adminDest = path.join(dist, 'gennetex', 'admin');
console.log('[build-web] Админ самбар (admin-web → gennetex/admin)');
copyDir(adminWeb, adminDest);

// Лого fallback — /gennetex/logo.png (relative path алдаа гарвал)
if (fs.existsSync(logo)) {
  fs.copyFileSync(logo, path.join(dist, 'gennetex', 'logo.png'));
  if (fs.existsSync(reportLogo)) {
    fs.copyFileSync(reportLogo, path.join(dist, 'gennetex', 'report-logo.png'));
  }
}

console.log('[build-web] Бэлэн. Гаралт:', dist);
