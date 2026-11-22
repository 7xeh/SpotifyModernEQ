# Settings

Modern EQ keeps its surface to a single panel. The rest is a small console API and automatic update handling.

## Console API

Modern EQ exposes `window.ModernEQ` once loaded:

| Call | What it does |
| --- | --- |
| `ModernEQ.open()` | Open (or close) the equalizer panel |
| `ModernEQ.checkForUpdates()` | Run a manual update check and surface the result as a toast |
| `ModernEQ.getUpdateInfo()` | Resolve `{ hasUpdate, currentVersion, latestVersion, releaseUrl }` |
| `ModernEQ.setDebugMode(true)` | Turn on verbose `[ModernEQ]` logging |
| `ModernEQ.isDebugEnabled()` | Read the debug flag |
| `ModernEQ.version` | The running version string |

## Debug mode

```js
ModernEQ.setDebugMode(true)
```

The flag is stored under `moderneq:debug-mode`, so it persists across restarts and the loader reads it too. Turn it off with `ModernEQ.setDebugMode(false)`.

## Updates

- Direct installs and loader installs both check for a newer release on a schedule (every 30 minutes, with jitter and exponential backoff on failure, paused while the window is hidden).
- Loader installs can apply an update in place: the prompt offers **Update and reload**, which reloads Spotify to pull the new bundle.
- Direct installs can't self-update, so the prompt links straight to the GitHub release.
- After an update applies, a toast confirms the new version with a link to the release notes.
- Prompts can be snoozed by dismissing them; a dismissed version is held off for 12 hours.

Update notices, preset saves, and errors all appear as in-app toasts in the bottom-left, with a fallback to Spotify's native notification when the DOM isn't ready.

## Storage

Everything Modern EQ persists lives under the `moderneq:` namespace in `localStorage`:

| Key | Holds |
| --- | --- |
| `moderneq:state` | Current bands and preset name |
| `moderneq:presets` | Your saved custom presets |
| `moderneq:debug-mode` | Debug flag |
| `moderneq:pending-update`, `moderneq:update-snooze`, `moderneq:update-skip`, `moderneq:last-known-version` | Update bookkeeping |
