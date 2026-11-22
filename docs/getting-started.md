# Getting Started

## Requirements

- Spicetify `>= 2.0.0` (tested through `2.46.7`)
- A Spotify desktop build that ships the built-in equalizer (Settings → Playback → Equalizer), tested through `1.3.10.2586`

If that equalizer section is missing from Spotify, there are no native filters to drive and Modern EQ stays inactive. It logs a `[ModernEQ]` line in the console (`Ctrl+Shift+I`) explaining why.

## First run

1. Install Modern EQ (see [Installation](installation.md)) and let Spotify reload.
2. Open the profile menu — your avatar, top-right.
3. Click **ModernEQ**. The panel opens over the client.

The entry appears on every client locale. ModernEQ finds the avatar trigger and its open menu by their accessibility relationships (`aria-controls` / `aria-labelledby`), not by an English label, clones a real menu row so it inherits the current theme, and re-injects itself if Spotify re-renders the menu. It never registers a `Spicetify.Menu` item, which on recent builds empties the whole React-Aria menu.

## The panel

The panel is a single surface:

- A **toggle** that mirrors Spotify's native equalizer on/off state.
- A **preset selector** with the 14 built-ins and any custom presets you save.
- A **Save preset** button for storing the current curve.
- The **graph**: 11 draggable bands from 32 Hz to 24 KHz, SUB / BASS / MID / TREBLE regions behind them, your target curve in the accent color, and the real response of the six native filters drawn in white.
- A **native filter readout** showing the exact gains being applied.
- **Reset** and **Delete preset** actions.

## Controls

| Action | Result |
| --- | --- |
| Drag a band | Set its gain |
| Scroll on a band | Fine ±0.5 dB steps |
| Double-click a band | Reset it to 0 dB |
| Tab | Focus a band |
| Arrow Up / Down | ±0.5 dB on the focused band |
| Page Up / Down | ±2 dB on the focused band |
| `0` | Reset the focused band |
| Escape, click outside, or ✕ | Close the panel |

Touching any band turns the equalizer on automatically, so a change is never silent.

Bands expose ARIA slider semantics, so screen readers announce each value.
