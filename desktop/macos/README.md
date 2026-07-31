# macOS distribution

The shared Tauri source in `desktop/src-tauri` generates `.app` and `.dmg` packages on native macOS CI runners:

- `macos-14`: Apple Silicon (`aarch64-apple-darwin`)
- `macos-13`: Intel (`x86_64-apple-darwin`)

Signing and notarization values are read from GitHub Actions secrets. The minimum supported version is macOS Sonoma 14.
