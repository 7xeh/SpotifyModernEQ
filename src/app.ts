import { startMenuObserver } from "./utils/menu";
import { CSS } from "./utils/panel";
import { loadState } from "./utils/store";
import { checkForUpdates } from "./utils/updater";

const MAX_INIT_ATTEMPTS = 100;
let initAttempts = 0;

function init(): void {
    if (typeof Spicetify === "undefined" || !Spicetify.Platform?.EqualizerAPI) {
        if (++initAttempts > MAX_INIT_ATTEMPTS) {
            console.warn(
                "[ModernEQ] EqualizerAPI not found — this Spotify build has no built-in equalizer " +
                "(Settings → Playback → Equalizer). ModernEQ is inactive."
            );
            return;
        }
        setTimeout(init, 300);
        return;
    }

    try {
        if (Spicetify.Platform.EqualizerAPI.isSupported?.() === false) {
            console.warn("[ModernEQ] Equalizer reported as unsupported on this platform. ModernEQ is inactive.");
            return;
        }
    } catch {}

    const style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);

    loadState();
    startMenuObserver();
    setTimeout(checkForUpdates, 15000);

    console.log(`[ModernEQ] v${__VERSION__} loaded`);
}

init();
