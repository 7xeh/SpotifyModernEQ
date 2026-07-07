const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const LS_LAST_CHECK = "moderneq:last-update-check";
const RELEASES_API = "https://api.github.com/repos/7xeh/SpotifyModernEQ/releases/latest";
const RELEASES_PAGE = "https://github.com/7xeh/SpotifyModernEQ/releases/latest";

function isNewer(latest: string, current: string): boolean {
    const a = latest.split(".").map((n) => parseInt(n, 10) || 0);
    const b = current.split(".").map((n) => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        const d = (a[i] || 0) - (b[i] || 0);
        if (d !== 0) return d > 0;
    }
    return false;
}

export async function checkForUpdates(): Promise<void> {
    try {
        if ((window as any)._modern_eq_metadata?.IsLoader) return;
        const last = Number(localStorage.getItem(LS_LAST_CHECK) || 0);
        if (Date.now() - last < CHECK_INTERVAL_MS) return;
        localStorage.setItem(LS_LAST_CHECK, String(Date.now()));

        const response = await fetch(RELEASES_API, {
            headers: { Accept: "application/vnd.github.v3+json" },
        });
        if (!response.ok) return;
        const release = await response.json();
        const latest = String(release.tag_name || "").trim().replace(/^v/i, "");
        if (latest && isNewer(latest, __VERSION__)) {
            console.log(`[ModernEQ] Update available: v${__VERSION__} → v${latest} (${RELEASES_PAGE})`);
            Spicetify.showNotification?.(`ModernEQ v${latest} is available — get it from GitHub`, false, 8000);
        }
    } catch {}
}
