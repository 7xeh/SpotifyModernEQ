# SpotifyModernEQ

A modern equalizer for the Spotify desktop client, built as a [Spicetify](https://spicetify.app/) extension.

Spotify's stock EQ exposes 6 fixed filters (60 / 150 / 400 / 1000 / 2400 / 15000 Hz, ±12 dB). ModernEQ replaces that UI with an 11-band panel spanning 32 Hz – 24 KHz, grouped into SUB / BASS / MID / TREBLE regions. Your 11-band target curve is least-squares-fitted onto the 6 native filters via `Spicetify.Platform.EqualizerAPI`, and the panel draws both your target curve and the response the native filters actually produce.

## Features

- 11 draggable bands (32 Hz – 24 KHz) with region grouping
- Live curve visualization: target vs. actually-applied response
- Built-in presets plus save/delete of your own custom presets
- EQ on/off toggle synced with Spotify's native setting
- Opens from the profile menu (top-right avatar dropdown)

## Install

```
copy moderneq.js %APPDATA%\spicetify\Extensions\
spicetify config extensions moderneq.js
spicetify apply
```

## Notes

The extra bands give you finer control over the curve shape, but the audio is still processed by Spotify's 6 native filters — the fit is transparent, shown live in the panel footer.
