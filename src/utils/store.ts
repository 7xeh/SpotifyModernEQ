import { BANDS, LS_PRESETS, LS_STATE, NATIVE, clampDb } from "./constants";
import { fitToNative, nativeResponse } from "./dsp";

export interface CustomPreset {
    name: string;
    bands: number[];
}

export const state = {
    bands: new Array(BANDS.length).fill(0) as number[],
    fitted: new Array(NATIVE.length).fill(0) as number[],
    presetName: "Flat",
    enabled: false,
};

function sanitizeBands(raw: unknown): number[] | null {
    if (!Array.isArray(raw) || raw.length !== BANDS.length) return null;
    const bands = raw.map((v) => clampDb(Number(v)));
    return bands.every((v) => Number.isFinite(v)) ? bands : null;
}

export function loadState(): void {
    try {
        const s = JSON.parse(localStorage.getItem(LS_STATE) || "null");
        const bands = sanitizeBands(s?.bands);
        if (bands) {
            state.bands = bands;
            state.presetName = typeof s.preset === "string" ? s.preset : "Manual";
        }
    } catch {}
    state.fitted = fitToNative(state.bands);
}

export function saveState(): void {
    localStorage.setItem(LS_STATE, JSON.stringify({ bands: state.bands, preset: state.presetName }));
}

export function customPresets(): CustomPreset[] {
    try {
        const raw = JSON.parse(localStorage.getItem(LS_PRESETS) || "null");
        if (!Array.isArray(raw)) return [];
        return raw
            .map((p) => {
                const bands = sanitizeBands(p?.bands);
                return typeof p?.name === "string" && p.name.trim() && bands
                    ? { name: p.name.slice(0, 32), bands }
                    : null;
            })
            .filter((p): p is CustomPreset => p !== null);
    } catch {
        return [];
    }
}

export function saveCustomPreset(name: string): void {
    const list = customPresets().filter((p) => p.name !== name);
    list.push({ name, bands: [...state.bands] });
    localStorage.setItem(LS_PRESETS, JSON.stringify(list));
}

export function deleteCustomPreset(name: string): void {
    localStorage.setItem(LS_PRESETS, JSON.stringify(customPresets().filter((p) => p.name !== name)));
}

let lastApplied: number[] | null = null;
let writing = false;
let dirty = false;

function mirrorToStockUI(gains: number[]): void {
    const inputs = document.querySelectorAll<HTMLInputElement>(".x-settings-equalizerPanelInput");
    if (inputs.length !== NATIVE.length) return;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    if (!setter) return;
    inputs.forEach((input, i) => {
        if (Math.abs(parseFloat(input.value) - gains[i]) < 0.05) return;
        setter.call(input, String(gains[i]));
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
    });
}

export async function pushGains(): Promise<void> {
    if (writing) {
        dirty = true;
        return;
    }
    writing = true;
    try {
        do {
            dirty = false;
            const target = [...state.fitted];
            const writes: Promise<void>[] = [];
            for (let i = 0; i < NATIVE.length; i++) {
                if (!lastApplied || Math.abs(target[i] - lastApplied[i]) > 0.049) {
                    writes.push(Spicetify.Platform.EqualizerAPI.setFilterGain(NATIVE[i].key, target[i]));
                }
            }
            lastApplied = target;
            if (writes.length) await Promise.all(writes);
            mirrorToStockUI(target);
        } while (dirty);
    } catch (e) {
        console.error("[ModernEQ] failed to apply gains", e);
        lastApplied = null;
    } finally {
        writing = false;
        if (dirty) pushGains();
    }
}

export async function syncFromNative(): Promise<boolean> {
    try {
        const filters = await Spicetify.Platform.EqualizerAPI.getFilters();
        const current = NATIVE.map((n) => {
            const f = filters.find((x) => x.key === n.key);
            return f ? Math.round(f.gain * 10) / 10 : 0;
        });
        const drift = current.some((g, i) => Math.abs(g - state.fitted[i]) > 0.2);
        if (drift) {
            state.bands = BANDS.map((f) => clampDb(nativeResponse(current, f)));
            state.fitted = current;
            state.presetName = "Manual";
            saveState();
        }
        lastApplied = [...current];
        return drift;
    } catch (e) {
        console.warn("[ModernEQ] syncFromNative failed", e);
        return false;
    }
}

export function subscribeToGainChanges(onExternalChange: () => void): () => void {
    let debounce: ReturnType<typeof setTimeout> | undefined;
    let subs: { cancel: () => void }[] = [];
    try {
        subs = NATIVE.map((n) =>
            Spicetify.Platform.EqualizerAPI.prefs.sub({ key: n.key }, () => {
                clearTimeout(debounce);
                debounce = setTimeout(async () => {
                    if (writing) return;
                    const drifted = await syncFromNative();
                    if (drifted) onExternalChange();
                }, 150);
            })
        );
    } catch (e) {
        console.warn("[ModernEQ] gain subscription unavailable", e);
    }
    return () => {
        clearTimeout(debounce);
        subs.forEach((s) => {
            try { s?.cancel?.(); } catch {}
        });
    };
}
