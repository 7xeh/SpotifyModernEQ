# Modern EQ

A modern multi-band equalizer for the Spotify desktop client on Spicetify — SUB / BASS / MID / TREBLE regions, draggable curve, presets, and live response visualization.

![Spicetify](https://img.shields.io/badge/Spicetify-Extension-1DB954?style=flat-square&logo=spotify&logoColor=white)
![License](https://img.shields.io/badge/License-Source--Available-blue?style=flat-square)

## Why

Spotify's stock equalizer exposes 6 fixed filters (60 / 150 / 400 / 1000 / 2400 / 15000 Hz, ±12 dB) buried in the settings page. ModernEQ replaces that experience with an 11-band panel spanning 32 Hz – 24 KHz. Your 11-band target curve is least-squares-fitted onto the 6 native filters through `Spicetify.Platform.EqualizerAPI`, and the panel draws both your target curve and the response the native filters actually produce — so you always see exactly what is applied.

## Features

- 11 draggable bands from 32 Hz to 24 KHz
- Frequency regions: SUB, BASS, MID, TREBLE with color-coded zones
- Live curve visualization
  - Your target curve
  - The actual applied response of the 6 native filters
  - Native filter gain readout
- Band controls
  - Drag to set gain
  - Scroll wheel for fine ±0.5 dB steps
  - Double-click to reset a band to 0
- 14 built-in presets (Bass Boost, V-Shape, Vocal Clarity, Loudness, and more)
- Save, load, and delete your own custom presets
- EQ on/off toggle synced with Spotify's native equalizer setting
- Opens from the profile menu (top-right avatar dropdown)
- Zero-latency apply — only changed filters are written, in parallel

## Install

### From source

```
git clone https://github.com/7xeh/SpotifyModernEQ.git
cd SpotifyModernEQ
npm install
npm run deploy
```

### Installer

Run `installer/install-spicetify-MEQ.cmd` after building — it installs Spicetify if missing, copies the extension, and applies it.

## Development

| Command | Description |
| --- | --- |
| `npm run build` | Type-check and bundle `src/` into `dist/modern-eq.js` |
| `npm run build:watch` | Rebuild on change |
| `npm run deploy` | Build, copy to the Spicetify extensions folder, and apply |
| `npm run release` | Build and copy the bundle into `builds/` |

## Troubleshooting

- **No "ModernEQ" entry in the profile menu** — your Spotify build must include the built-in equalizer (Settings → Playback → Equalizer). If that section is missing, ModernEQ stays inactive; check the console (`Ctrl+Shift+I`) for a `[ModernEQ]` message.
- **Changes don't seem to do anything** — the EQ toggle at the top of the panel must be on. Since v1.1.0, adjusting any band switches it on automatically.
- **Stock EQ page shows different values** — both UIs stay in sync automatically since v1.0.0. If they ever diverge, close and reopen the ModernEQ panel; it re-reads the native state.
- **Panel looks broken after a Spotify update** — run `spicetify apply` again, and check GitHub for a newer ModernEQ release.

## How the band mapping works

Spotify's audio engine has exactly 6 filters compiled into the native binary — no extension can add real DSP bands. ModernEQ models each native filter as an RBJ biquad (lowshelf @ 60 Hz, four peaking filters, highshelf @ 15 KHz) and solves a ridge-regularized least-squares fit that maps your 11-band target onto the 6 real gains. The white curve in the panel is the true response of that fit, so the mapping is never hidden.

## License

MEQ Source-Available License v1.0 — see [LICENSE](LICENSE).

You may read the source, fork for personal use, and submit pull requests. Redistribution, republishing (including to the Spicetify Marketplace), and commercial use require written permission.
