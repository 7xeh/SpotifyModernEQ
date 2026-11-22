# Troubleshooting

## No "ModernEQ" entry in the profile menu

Your Spotify build must include the built-in equalizer (Settings → Playback → Equalizer). If that section is missing, there are no native filters to drive and Modern EQ stays inactive. Open the console (`Ctrl+Shift+I`) and look for a `[ModernEQ]` line explaining why.

If the equalizer exists but the entry still doesn't appear, run `spicetify apply` again and give the client 10–15 seconds to finish loading extensions. The entry injects on demand when you open the avatar menu and re-applies if Spotify re-renders it, so open and close the menu once after a cold start. ModernEQ is verified against Spotify `1.3.10.2586` and Spicetify `2.46.7`; a much newer client that moves the menu markup again would need a new release.

## Changes don't seem to do anything

The toggle at the top of the panel must be on. Since v1.1.0, adjusting any band switches it on automatically, so if nothing changes, confirm the native equalizer isn't being overridden by another extension.

## Stock EQ page shows different values

Both UIs stay in sync automatically. If they ever diverge, close and reopen the Modern EQ panel — it re-reads the native state and back-solves the bands.

## Panel looks broken after a Spotify update

Run `spicetify apply` again. Menu injection and pref subscriptions fail soft, so an unexpected markup change logs a `[ModernEQ]` warning instead of crashing. Check GitHub for a newer release; the in-app update checker will also surface one.

## The extension won't load (loader installs)

The loader shows a recovery dialog that retries in the background with backoff and an online-reconnect trigger. Check your connection, a VPN, or an ad blocker. Turn on verbose logging with `ModernEQ.setDebugMode(true)` (or set `moderneq:debug-mode` to `true`) and restart to see each loader source it tries.

## Still stuck?

Turn on debug mode, reproduce the problem, and open an issue with the `[ModernEQ]` / `[MEQ-Loader]` console output: https://github.com/7xeh/SpotifyModernEQ/issues
