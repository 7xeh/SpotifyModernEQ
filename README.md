<div align="center">

# Modern EQ

**A modern multi-band equalizer for the Spotify desktop client on [Spicetify](https://spicetify.app).**

Replace Spotify's buried 6-slider equalizer with an 11-band panel — SUB / BASS / MID / TREBLE regions, a draggable curve, presets, and live response visualization that shows exactly what the native filters are doing.

[![Discord](https://img.shields.io/badge/Discord-Join%20the%20Community-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/fXK34DeDW5)

![Spicetify](https://img.shields.io/badge/Spicetify-Extension-1DB954?style=flat-square&logo=spotify&logoColor=white)
![Version](https://img.shields.io/badge/Version-1.1.0-blue?style=flat-square)
![License](https://img.shields.io/badge/License-Source%20Available-blue?style=flat-square)
![Status](https://img.shields.io/badge/Status-Online-success?style=flat-square)

[Highlights](#highlights) · [Install](#install) · [Usage](#usage) · [How the band mapping works](#how-the-band-mapping-works) · [Troubleshooting](#troubleshooting)

![Preview](https://github.com/7xeh/SpotifyModernEQ/blob/main/icon.png?raw=true)

</div>

---

## Highlights

- **11 draggable bands, 32 Hz – 24 KHz** — a real curve instead of six fixed sliders on a settings page
- **Color-coded regions** — SUB, BASS, MID, and TREBLE zones so you can see what you are shaping
- **Live curve visualization** — your target curve *and* the actual response the six native filters produce, drawn together with a native filter gain readout, so the mapping is never hidden
- **Precise band control** — drag to set gain, scroll for fine ±0.5 dB steps, double-click to reset a band to 0
- **Full keyboard support** — Tab to focus a band, Arrow Up/Down (±0.5 dB), Page Up/Down (±2 dB), `0` to reset, with ARIA slider semantics for screen readers
- **14 built-in presets** — Bass Boost, V-Shape, Vocal Clarity, Loudness, and more — plus unlimited custom presets you can save, load, and delete
- **Two-way sync with the stock EQ** — the ModernEQ panel and Spotify's own equalizer page never disagree, and the stock page's stale state can't overwrite yours
- **Zero-latency apply** — only changed filters are written, in parallel
- **Update checker** — direct installs check GitHub once a day and show a notice when a newer release exists
- **Opens from the profile menu** — the top-right avatar dropdown, on any client locale

---

## Install

### From source

```bash
git clone https://github.com/7xeh/SpotifyModernEQ.git
cd SpotifyModernEQ
npm install
npm run deploy
```

`npm run deploy` builds the bundle, copies it into the Spicetify extensions folder, and runs `spicetify apply`.

### Windows installer

Run `installer/install-spicetify-MEQ.cmd` after building — it installs Spicetify if missing, copies the extension, and applies it.

Requires Spicetify `>= 2.0.0` and a Spotify build that ships the built-in equalizer (Settings → Playback → Equalizer).

---

## Usage

Open the profile menu (your avatar, top-right) and click **ModernEQ**.

| Action | Result |
| --- | --- |
| Drag a band | Set its gain |
| Scroll on a band | Fine ±0.5 dB steps |
| Double-click a band | Reset it to 0 dB |
| Arrow Up/Down | ±0.5 dB on the focused band |
| Page Up/Down | ±2 dB on the focused band |
| `0` | Reset the focused band |

The toggle at the top of the panel mirrors Spotify's native equalizer setting. Since v1.1.0, touching any band switches it on automatically.

---

## How the band mapping works

Spotify's audio engine has exactly 6 filters compiled into the native binary — no extension can add real DSP bands. ModernEQ models each native filter as an RBJ biquad (lowshelf @ 60 Hz, four peaking filters, highshelf @ 15 KHz) and solves a ridge-regularized least-squares fit that maps your 11-band target onto the 6 real gains, applied through `Spicetify.Platform.EqualizerAPI`.

The white curve in the panel is the true response of that fit — what you see is what is actually applied.

---

## Development

| Command | Description |
| --- | --- |
| `npm run build` | Type-check and bundle `src/` into `dist/modern-eq.js` |
| `npm run build:watch` | Rebuild on change |
| `npm run deploy` | Build, copy to the Spicetify extensions folder, and apply |
| `npm run release` | Build and copy the bundle into `builds/` |

---

## Troubleshooting

- **No "ModernEQ" entry in the profile menu** — your Spotify build must include the built-in equalizer (Settings → Playback → Equalizer). If that section is missing, ModernEQ stays inactive; check the console (`Ctrl+Shift+I`) for a `[ModernEQ]` message explaining why.
- **Changes don't seem to do anything** — the EQ toggle at the top of the panel must be on. Since v1.1.0, adjusting any band switches it on automatically.
- **Stock EQ page shows different values** — both UIs stay in sync automatically since v1.0.0. If they ever diverge, close and reopen the ModernEQ panel; it re-reads the native state.
- **Panel looks broken after a Spotify update** — run `spicetify apply` again, and check GitHub for a newer ModernEQ release.

---

## Need help or want to chat?

Join the official Discord for live support, bug reports, feature requests, preset sharing, and release announcements. It's the fastest way to get unstuck.

[**→ Join the Discord**](https://discord.gg/fXK34DeDW5)

## Links

- **Discord** (support, updates, preset sharing) — https://discord.gg/fXK34DeDW5
- **Changelog** — [CHANGELOG.md](CHANGELOG.md)
- **Report an issue** — https://github.com/7xeh/SpotifyModernEQ/issues
- **GitHub** — https://github.com/7xeh/SpotifyModernEQ

## License

Source-available under the MEQ Source-Available License v1.0 — see [LICENSE](LICENSE). Not OSI open source.

You may read the source, fork for personal use, and submit pull requests. Redistribution, republishing (including to the Spicetify Marketplace), and commercial use require written permission.

---

<div align="center">

Made with <3 for the Spicetify community by **7xeh**.

[![Discord](https://img.shields.io/badge/Need%20help%3F-Join%20the%20Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/fXK34DeDW5)

</div>
