# Windows distribution

The shared Tauri source in `desktop/src-tauri` generates both installers on `windows-latest`:

- NSIS `.exe` for managed and direct installation
- WiX `.msi` for enterprise deployment

The application supports Windows 10/11, WebView2 bootstrap, high DPI, resize/minimum window constraints, tray lifecycle and native notifications. Signing certificates are supplied only through GitHub Actions secrets.
