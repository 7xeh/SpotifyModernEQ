import { BANDS, BAND_LABELS, NATIVE, PRESETS, REGIONS, VIEW_RANGE, clampDb } from "./constants";
import { fitToNative, nativeResponse } from "./dsp";
import { PANEL_ICON } from "./icons";
import { customPresets, deleteCustomPreset, pushGains, saveCustomPreset, saveState, state, subscribeToGainChanges, syncFromNative } from "./store";

export const CSS = `
.meq-overlay { position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,.6); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; }
.meq-panel { width: min(820px, 95vw); background: linear-gradient(160deg, #181818 0%, #101010 100%); color: var(--spice-text, #fff); border: 1px solid rgba(255,255,255,.09); border-radius: 20px; box-shadow: 0 32px 100px rgba(0,0,0,.7); padding: 22px 26px 20px; font-family: var(--font-family, CircularSp, sans-serif); }
.meq-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.meq-title { font-size: 18px; font-weight: 800; letter-spacing: -.2px; margin-right: auto; display: flex; align-items: center; gap: 10px; }
.meq-title svg { color: var(--spice-button, #1ed760); width: 20px; height: 20px; }
.meq-switch { position: relative; width: 44px; height: 25px; border-radius: 13px; background: rgba(255,255,255,.22); cursor: pointer; transition: background .15s; flex: none; border: none; padding: 0; }
.meq-switch.on { background: var(--spice-button, #1ed760); }
.meq-switch::after { content: ""; position: absolute; top: 3px; left: 3px; width: 19px; height: 19px; border-radius: 50%; background: #fff; transition: transform .15s; box-shadow: 0 1px 4px rgba(0,0,0,.4); }
.meq-switch.on::after { transform: translateX(19px); }
.meq-select { background: rgba(255,255,255,.08); color: inherit; border: 1px solid rgba(255,255,255,.14); border-radius: 9px; padding: 7px 12px; font-size: 13px; font-weight: 600; cursor: pointer; }
.meq-select option, .meq-select optgroup { background: #1b1b1b; }
.meq-btn { background: rgba(255,255,255,.08); color: inherit; border: 1px solid rgba(255,255,255,.1); border-radius: 9px; padding: 7px 14px; font-size: 13px; font-weight: 700; cursor: pointer; transition: background .12s; }
.meq-btn:hover { background: rgba(255,255,255,.16); }
.meq-btn.primary { background: var(--spice-button, #1ed760); border-color: transparent; color: #000; }
.meq-close { background: none; border: none; color: inherit; font-size: 18px; cursor: pointer; opacity: .6; padding: 4px 8px; }
.meq-close:hover { opacity: 1; }
.meq-regions { display: flex; margin-bottom: 6px; }
.meq-region { text-align: center; font-size: 10px; font-weight: 800; letter-spacing: 2px; padding: 4px 0; border-radius: 6px 6px 0 0; }
.meq-stage { position: relative; height: 300px; border-radius: 12px; background: rgba(255,255,255,.03); overflow: hidden; }
.meq-canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
.meq-cols { position: absolute; inset: 0; display: flex; }
.meq-col { flex: 1; position: relative; cursor: ns-resize; touch-action: none; }
.meq-col:hover { background: rgba(255,255,255,.03); }
.meq-thumb { position: absolute; left: 50%; width: 15px; height: 15px; border-radius: 50%; background: #fff; border: 3px solid var(--spice-button, #1ed760); transform: translate(-50%, -50%); pointer-events: none; box-shadow: 0 0 10px rgba(30,215,96,.45), 0 2px 6px rgba(0,0,0,.5); transition: box-shadow .12s; }
.meq-col.drag .meq-thumb { box-shadow: 0 0 18px rgba(30,215,96,.8), 0 2px 6px rgba(0,0,0,.5); }
.meq-val { position: absolute; left: 50%; transform: translateX(-50%); top: 8px; font-size: 11px; font-weight: 800; opacity: 0; transition: opacity .12s; pointer-events: none; color: var(--spice-button, #1ed760); text-shadow: 0 1px 4px rgba(0,0,0,.8); }
.meq-col:hover .meq-val, .meq-col.drag .meq-val { opacity: 1; }
.meq-labels { display: flex; margin-top: 8px; }
.meq-labels span { flex: 1; text-align: center; font-size: 11px; opacity: .55; font-weight: 700; }
.meq-footer { display: flex; align-items: center; gap: 10px; margin-top: 16px; }
.meq-native { font-size: 11px; opacity: .5; margin-right: auto; line-height: 1.5; }
.meq-legend { display: flex; gap: 18px; font-size: 11px; opacity: .65; margin-top: 10px; }
.meq-legend i { display: inline-block; width: 18px; height: 3px; border-radius: 2px; margin-right: 6px; vertical-align: middle; }
.meq-save-row { display: none; gap: 8px; margin-bottom: 14px; }
.meq-save-row.open { display: flex; }
.meq-input { flex: 1; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.14); border-radius: 9px; color: inherit; padding: 7px 12px; font-size: 13px; }
.meq-menu-icon { display: inline-flex; align-items: center; margin-right: 12px; flex: none; }
`;

const F_LO = Math.log10(26);
const F_HI = Math.log10(24000);

let panel: (HTMLElement & { _cleanup?: () => void }) | null = null;

function dbToY(db: number, h: number): number {
    return h / 2 - (db / VIEW_RANGE) * (h / 2);
}

function bandCenterX(i: number, w: number): number {
    return ((i + 0.5) / BANDS.length) * w;
}

function warpX(f: number, w: number): number {
    const lf = Math.log10(f);
    const l0 = Math.log10(BANDS[0]), lN = Math.log10(BANDS[BANDS.length - 1]);
    if (lf <= l0) {
        const t = (lf - F_LO) / (l0 - F_LO);
        return Math.max(0, t) * bandCenterX(0, w);
    }
    if (lf >= lN) {
        const t = (lf - lN) / (F_HI - lN);
        return bandCenterX(BANDS.length - 1, w) + Math.min(1, t) * (w - bandCenterX(BANDS.length - 1, w));
    }
    for (let i = 0; i < BANDS.length - 1; i++) {
        const la = Math.log10(BANDS[i]), lb = Math.log10(BANDS[i + 1]);
        if (lf <= lb) {
            const t = (lf - la) / (lb - la);
            return bandCenterX(i, w) + t * (bandCenterX(i + 1, w) - bandCenterX(i, w));
        }
    }
    return w;
}

function drawCurve(): void {
    if (!panel) return;
    const canvas = panel.querySelector(".meq-canvas") as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);
    const w = rect.width, h = rect.height;
    ctx.clearRect(0, 0, w, h);

    const accent = getComputedStyle(document.documentElement).getPropertyValue("--spice-button").trim() || "#1ed760";

    REGIONS.forEach((r) => {
        const x0 = (r.from / BANDS.length) * w;
        const x1 = ((r.to + 1) / BANDS.length) * w;
        ctx.fillStyle = `rgba(${r.color}, .045)`;
        ctx.fillRect(x0, 0, x1 - x0, h);
    });
    ctx.strokeStyle = "rgba(255,255,255,.09)";
    ctx.setLineDash([3, 5]);
    ctx.lineWidth = 1;
    REGIONS.slice(1).forEach((r) => {
        const x = (r.from / BANDS.length) * w;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    });
    ctx.setLineDash([]);

    ctx.strokeStyle = "rgba(255,255,255,.07)";
    [-12, -6, 6, 12].forEach((db) => {
        ctx.beginPath(); ctx.moveTo(0, dbToY(db, h)); ctx.lineTo(w, dbToY(db, h)); ctx.stroke();
    });
    ctx.strokeStyle = "rgba(255,255,255,.16)";
    ctx.beginPath(); ctx.moveTo(0, dbToY(0, h)); ctx.lineTo(w, dbToY(0, h)); ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,.35)";
    ctx.font = "600 10px sans-serif";
    ctx.textBaseline = "middle";
    ([[12, "+12"], [6, "+6"], [0, "0"], [-6, "-6"], [-12, "-12"]] as [number, string][]).forEach(([db, t]) => {
        ctx.fillText(t, 6, dbToY(db, h));
    });

    const pts: [number, number][] = [];
    for (let k = 0; k <= 220; k++) {
        const f = Math.pow(10, F_LO + (k / 220) * (F_HI - F_LO));
        pts.push([warpX(f, w), dbToY(nativeResponse(state.fitted, f), h)]);
    }
    const y0 = dbToY(0, h);
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "rgba(255,255,255,.14)");
    grad.addColorStop(0.5, "rgba(255,255,255,.03)");
    grad.addColorStop(1, "rgba(255,255,255,.14)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], y0);
    pts.forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.lineTo(pts[pts.length - 1][0], y0);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.stroke();

    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([7, 5]);
    ctx.beginPath();
    ctx.moveTo(0, dbToY(state.bands[0], h));
    for (let i = 0; i < BANDS.length; i++) {
        const x = bandCenterX(i, w), y = dbToY(state.bands[i], h);
        if (i === 0) { ctx.lineTo(x, y); continue; }
        const px0 = bandCenterX(i - 1, w), py0 = dbToY(state.bands[i - 1], h);
        const cx = (px0 + x) / 2;
        ctx.bezierCurveTo(cx, py0, cx, y, x, y);
    }
    ctx.lineTo(w, dbToY(state.bands[BANDS.length - 1], h));
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "rgba(255,255,255,.55)";
    NATIVE.forEach((n) => {
        const x = warpX(n.freq, w), y = dbToY(nativeResponse(state.fitted, n.freq), h);
        ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
    });

    positionThumbs();
}

function positionThumbs(): void {
    if (!panel) return;
    const stage = panel.querySelector(".meq-stage") as HTMLElement;
    const h = stage.getBoundingClientRect().height;
    panel.querySelectorAll(".meq-col").forEach((col, i) => {
        (col.querySelector(".meq-thumb") as HTMLElement).style.top = dbToY(state.bands[i], h) + "px";
        (col.querySelector(".meq-val") as HTMLElement).textContent =
            (state.bands[i] > 0 ? "+" : "") + state.bands[i].toFixed(1);
    });
}

function updateNativeReadout(): void {
    if (!panel) return;
    const el = panel.querySelector(".meq-native") as HTMLElement;
    el.textContent = "Native filters → " + NATIVE.map((n, i) => {
        const f = n.freq >= 1000 ? n.freq / 1000 + "K" : n.freq;
        return `${f}Hz ${state.fitted[i] >= 0 ? "+" : ""}${state.fitted[i].toFixed(1)}`;
    }).join(" · ");
}

function rebuildPresetSelect(): void {
    if (!panel) return;
    const sel = panel.querySelector(".meq-select") as HTMLSelectElement;
    sel.innerHTML = "";
    const opt = (v: string, label?: string) => {
        const o = document.createElement("option");
        o.value = v;
        o.textContent = label || v;
        sel.appendChild(o);
    };
    opt("Manual");
    Object.keys(PRESETS).forEach((n) => opt(n));
    const custom = customPresets();
    if (custom.length) {
        const grp = document.createElement("optgroup");
        grp.label = "My presets";
        custom.forEach((p) => {
            const o = document.createElement("option");
            o.value = "custom:" + p.name;
            o.textContent = p.name;
            grp.appendChild(o);
        });
        sel.appendChild(grp);
    }
    sel.value = PRESETS[state.presetName] ? state.presetName
        : custom.some((p) => p.name === state.presetName) ? "custom:" + state.presetName
        : "Manual";
}

function commit(): void {
    state.fitted = fitToNative(state.bands);
    saveState();
    drawCurve();
    updateNativeReadout();
    pushGains();
}

function setBands(next: number[], name: string): void {
    state.bands = next.map(clampDb);
    state.presetName = name;
    commit();
}

export function openPanel(): void {
    if (panel) {
        closePanel();
        return;
    }

    const regionHeader = REGIONS.map((r) => {
        const span = r.to - r.from + 1;
        return `<div class="meq-region" style="flex:${span};color:rgba(${r.color},.9);background:rgba(${r.color},.07)">${r.name}</div>`;
    }).join("");

    const overlay = document.createElement("div") as HTMLElement & { _cleanup?: () => void };
    overlay.className = "meq-overlay";
    overlay.innerHTML = `
      <div class="meq-panel" role="dialog" aria-label="ModernEQ">
        <div class="meq-header">
          <div class="meq-title">${PANEL_ICON} ModernEQ</div>
          <button class="meq-switch" aria-label="Toggle equalizer"></button>
          <select class="meq-select" aria-label="Preset"></select>
          <button class="meq-btn meq-save">Save preset</button>
          <button class="meq-close" aria-label="Close">✕</button>
        </div>
        <div class="meq-save-row">
          <input class="meq-input" placeholder="Preset name" maxlength="32">
          <button class="meq-btn primary meq-save-confirm">Save</button>
          <button class="meq-btn meq-save-cancel">Cancel</button>
        </div>
        <div class="meq-regions">${regionHeader}</div>
        <div class="meq-stage">
          <canvas class="meq-canvas"></canvas>
          <div class="meq-cols">${BANDS.map(() => `<div class="meq-col"><span class="meq-val"></span><div class="meq-thumb"></div></div>`).join("")}</div>
        </div>
        <div class="meq-labels">${BAND_LABELS.map((l) => `<span>${l}Hz</span>`).join("")}</div>
        <div class="meq-legend">
          <span><i style="background:var(--spice-button,#1ed760)"></i>Your target curve</span>
          <span><i style="background:rgba(255,255,255,.85)"></i>Actual applied response (6 native filters)</span>
        </div>
        <div class="meq-footer">
          <div class="meq-native"></div>
          <button class="meq-btn meq-delete" style="display:none">Delete preset</button>
          <button class="meq-btn meq-reset">Reset</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    panel = overlay;

    const sw = overlay.querySelector(".meq-switch") as HTMLButtonElement;
    const setSw = (on: boolean) => {
        state.enabled = on;
        sw.classList.toggle("on", on);
    };
    const unsub = Spicetify.Platform.EqualizerAPI.subscribeToEnabledState(setSw);
    sw.onclick = () => Spicetify.Platform.EqualizerAPI.setEnabledState(!state.enabled);

    rebuildPresetSelect();
    const sel = overlay.querySelector(".meq-select") as HTMLSelectElement;
    const delBtn = overlay.querySelector(".meq-delete") as HTMLButtonElement;
    const refreshDel = () => {
        delBtn.style.display = sel.value.startsWith("custom:") ? "" : "none";
    };
    refreshDel();
    sel.onchange = () => {
        const v = sel.value;
        if (v === "Manual") {
            state.presetName = "Manual";
            saveState();
        } else if (v.startsWith("custom:")) {
            const p = customPresets().find((x) => x.name === v.slice(7));
            if (p) setBands(p.bands, p.name);
        } else if (PRESETS[v]) {
            setBands(PRESETS[v], v);
        }
        refreshDel();
    };
    delBtn.onclick = () => {
        deleteCustomPreset(sel.value.slice(7));
        state.presetName = "Manual";
        saveState();
        rebuildPresetSelect();
        refreshDel();
    };

    const saveRow = overlay.querySelector(".meq-save-row") as HTMLElement;
    const nameInput = overlay.querySelector(".meq-input") as HTMLInputElement;
    (overlay.querySelector(".meq-save") as HTMLButtonElement).onclick = () => {
        saveRow.classList.add("open");
        nameInput.focus();
    };
    (overlay.querySelector(".meq-save-cancel") as HTMLButtonElement).onclick = () => saveRow.classList.remove("open");
    (overlay.querySelector(".meq-save-confirm") as HTMLButtonElement).onclick = () => {
        const name = nameInput.value.trim();
        if (!name) return;
        saveCustomPreset(name);
        state.presetName = name;
        saveState();
        saveRow.classList.remove("open");
        nameInput.value = "";
        rebuildPresetSelect();
        refreshDel();
        Spicetify.showNotification?.(`Preset "${name}" saved`);
    };

    (overlay.querySelector(".meq-reset") as HTMLButtonElement).onclick = () => {
        setBands(PRESETS["Flat"], "Flat");
        rebuildPresetSelect();
        refreshDel();
    };

    const stage = overlay.querySelector(".meq-stage") as HTMLElement;
    const markManual = () => {
        state.presetName = "Manual";
        sel.value = "Manual";
        refreshDel();
    };
    overlay.querySelectorAll(".meq-col").forEach((colEl, i) => {
        const col = colEl as HTMLElement;
        const fromY = (clientY: number) => {
            const r = stage.getBoundingClientRect();
            return clampDb(((r.height / 2 - (clientY - r.top)) / (r.height / 2)) * VIEW_RANGE);
        };
        col.onpointerdown = (e) => {
            try { col.setPointerCapture(e.pointerId); } catch {}
            col.classList.add("drag");
            state.bands[i] = fromY(e.clientY);
            markManual();
            commit();
            col.onpointermove = (ev) => {
                state.bands[i] = fromY(ev.clientY);
                commit();
            };
            col.onpointerup = () => {
                col.onpointermove = null;
                col.classList.remove("drag");
            };
        };
        col.ondblclick = () => {
            state.bands[i] = 0;
            markManual();
            commit();
        };
        col.onwheel = (e) => {
            e.preventDefault();
            state.bands[i] = clampDb(state.bands[i] + (e.deltaY < 0 ? 0.5 : -0.5));
            markManual();
            commit();
        };
    });

    const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") closePanel();
    };
    overlay.onclick = (e) => {
        if (e.target === overlay) closePanel();
    };
    (overlay.querySelector(".meq-close") as HTMLButtonElement).onclick = closePanel;
    document.addEventListener("keydown", onKey);
    const ro = new ResizeObserver(() => drawCurve());
    ro.observe(stage);
    const unsubGains = subscribeToGainChanges(() => {
        rebuildPresetSelect();
        refreshDel();
        drawCurve();
        updateNativeReadout();
    });
    overlay._cleanup = () => {
        document.removeEventListener("keydown", onKey);
        unsub?.();
        unsubGains();
        ro.disconnect();
    };

    syncFromNative().then(() => {
        if (!panel) return;
        rebuildPresetSelect();
        drawCurve();
        updateNativeReadout();
    });
    drawCurve();
    updateNativeReadout();
}

export function closePanel(): void {
    if (!panel) return;
    panel._cleanup?.();
    panel.remove();
    panel = null;
}
