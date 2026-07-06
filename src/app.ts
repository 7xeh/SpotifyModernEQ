import { startMenuObserver } from "./utils/menu";
import { CSS } from "./utils/panel";
import { loadState } from "./utils/store";

function init(): void {
    if (typeof Spicetify === "undefined" || !Spicetify.Platform?.EqualizerAPI) {
        setTimeout(init, 300);
        return;
    }

    const style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);

    loadState();
    startMenuObserver();

    console.log(`[ModernEQ] v${__VERSION__} loaded`);
}

init();
