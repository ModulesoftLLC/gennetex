# Gennetex cross-platform architecture

## Current entrypoints (preserved)

- Mobile: repository root Expo application (`App.js`, `src/`, `android/`, `ios/`)
- Admin web: `admin-web/`, deployed under `/gennetex/admin`
- Public web: `public-web/`
- Desktop: `desktop/`, native-capable Tauri 2 application
- Backend: Vercel functions in `api/`, Firebase Auth/Firestore/Storage and retained Supabase migrations

Moving the established mobile entrypoint into a new directory would break EAS and native project paths, so the migration is incremental. Shared types and policies are extracted module-by-module while the deployed entrypoints remain stable.

## Shared identity and authorization

Every client calls the same `/api/employee-auth` phone/PIN and verify.mn flow. The returned Firebase custom token creates the shared authenticated session. Client navigation is only a convenience; Firebase rules and server endpoints remain the authority. Desktop and admin web reject non-admin roles after reading the authenticated `profiles/{uid}` record.

## Realtime and offline

Firestore snapshot listeners distribute changes across mobile, web and desktop. Desktop stores the latest successful collection snapshots locally and restores them when a listener cannot connect. Writes remain server-authorized and are not fabricated while offline.

## Release targets

- Android APK/AAB and iOS IPA: EAS native builds
- Web: Vercel production deployment
- Windows EXE/MSI: GitHub Actions Windows runner
- macOS Intel/Apple Silicon DMG: GitHub Actions macOS runners

Desktop updater artifacts are signed with minisign-compatible Tauri keys; the public key is embedded in the client and the private key belongs only in CI secrets.
