# macOS distribution

The shared Tauri source in `desktop/src-tauri` generates `.app` and `.dmg` packages on native macOS CI runners:

- `macos-15`: Apple Silicon (`aarch64-apple-darwin`)
- `macos-15-intel`: Intel (`x86_64-apple-darwin`)

Signing and notarization values are read from GitHub Actions secrets. The minimum supported version is macOS Sonoma 14.
