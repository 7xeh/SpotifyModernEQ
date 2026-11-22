# Installation

## From source

```bash
git clone https://github.com/7xeh/SpotifyModernEQ.git
cd SpotifyModernEQ
npm install
npm run deploy
```

`npm run deploy` builds the bundle, locates your Spicetify config, copies `modern-eq.js` into the Extensions folder, registers it, and runs `spicetify apply`. It resolves the Extensions folder from `spicetify path userdata` and falls back to the platform config path if that is unavailable.

Useful flags:

- `node deploy.js --skip-build` — deploy the existing `dist/modern-eq.js` without rebuilding
- `node deploy.js --no-apply` — copy and register without applying
- `node deploy.js --no-bump` — build without bumping the version

## Loader script

The loader (`loader/MEQ-loader.js`) fetches the latest release at runtime so the extension updates itself without a reinstall. It:

- Asks the self-hosted version API first, then the GitHub latest release.
- Verifies the downloaded bundle against the release's published SHA-256.
- Falls back to a CORS proxy (integrity-checked) when the direct GitHub download is blocked by CORS, then to the self-hosted mirrors.

Register the loader the same way as the built extension if you want self-updating installs.

## Windows installer

Run `installer/install-spicetify-MEQ.cmd` after building. It installs Spicetify if missing, copies the extension, registers it, and applies.

## Verifying

Open the console (`Ctrl+Shift+I`) and look for `[ModernEQ] vX.Y.Z loaded`. The profile menu should now show a **ModernEQ** entry.
