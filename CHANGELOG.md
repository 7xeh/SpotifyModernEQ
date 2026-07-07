# Changelog

## 1.1.0

Release-hardening pass.

- Profile-menu detection is now locale-independent (matches the profile link, not English text), so the ModernEQ entry appears on non-English clients
- Full keyboard support on the EQ bands: Tab to focus, Arrow Up/Down (±0.5 dB), Page Up/Down (±2 dB), `0` to reset a band, with ARIA slider semantics for screen readers
- Adjusting the EQ while it is switched off now enables it automatically — no more silent "nothing changes"
- Update notifications: direct installs check GitHub once a day and show a notice when a newer release exists (loader installs manage updates themselves)
- Corrupted or out-of-date saved state and custom presets are validated and cleaned on load instead of breaking the panel
- Startup no longer retries forever on Spotify builds without the native equalizer — ModernEQ logs why it is inactive and stops
- Menu injection and pref subscriptions fail soft: an unexpected Spotify markup or API change logs a warning instead of crashing the extension
- Middle-clicking the menu entry no longer navigates to the profile page

## 1.0.0

- Initial release: 11-band EQ (32 Hz – 24 KHz) with SUB/BASS/MID/TREBLE regions, least-squares mapping onto Spotify's 6 native filters, live target/applied curve visualization, built-in and custom presets, profile-menu launcher
- Two-way sync with the stock equalizer settings page, including mirroring applied gains into the stock sliders so its stale state can never overwrite yours
