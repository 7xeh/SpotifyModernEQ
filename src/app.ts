import { startMenuObserver } from "./utils/menu";
import { CSS, openPanel } from "./utils/panel";
import { loadState } from "./utils/store";
import { checkForUpdates, getBuildHash, getUpdateInfo, showPostUpdateChangelog, startUpdateChecker, VERSION } from "./utils/updater";
import { isDebugEnabled, setDebugMode, info, warn } from "./utils/debug";

const MAX_INIT_ATTEMPTS = 100;
let initAttempts = 0;

function exposeApi(): void {
    (window as any).ModernEQ = {
        open: openPanel,
        checkForUpdates: () => checkForUpdates({ trigger: "manual" }),
        getUpdateInfo,
        setDebugMode,
        isDebugEnabled,
        version: VERSION,
        buildHash: getBuildHash(),
    };
}

function init(): void {
    if (typeof Spicetify === "undefined" || !Spicetify.Platform?.EqualizerAPI) {
        if (++initAttempts > MAX_INIT_ATTEMPTS) {
            warn(
                "EqualizerAPI not found — this Spotify build has no built-in equalizer " +
                "(Settings → Playback → Equalizer). ModernEQ is inactive."
            );
            return;
        }
        setTimeout(init, 300);
        return;
    }

    try {
        if (Spicetify.Platform.EqualizerAPI.isSupported?.() === false) {
            warn("Equalizer reported as unsupported on this platform. ModernEQ is inactive.");
            return;
        }
    } catch {}

    const style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);

    loadState();
    startMenuObserver();
    exposeApi();

    startUpdateChecker(30 * 60 * 1000);
    showPostUpdateChangelog().catch(() => {});

    info(`v${VERSION} loaded`);
}

init();
