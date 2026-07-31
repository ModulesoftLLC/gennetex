# Gennetex ERP Desktop

Native-capable Tauri 2 desktop client using the same Firebase project, phone/PIN authentication API and role model as mobile. Only `admin` and `superadmin` profiles may enter.

Authentication API: `https://gennetex.vercel.app/api/employee-auth` (Verify.mn + Firebase custom tokens).

## Local setup

1. Copy `.env.example` to `.env` and use the same public Firebase values as the mobile build.
2. Install Node, Rust and the Tauri platform prerequisites.
3. Run `npm install`, then `npm run desktop:dev`.

## Production packages

- Windows CI produces NSIS `.exe` and WiX `.msi` installers.
- macOS CI produces signed-ready `.app` and `.dmg` outputs for Apple Silicon and Intel runners.
- Replace the updater public key and configure signing secrets before public distribution.

The desktop UI is a dedicated responsive workspace, not an iframe or wrapper around the admin website.
