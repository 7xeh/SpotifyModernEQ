(function ModernEQ() {
  if (!window.Spicetify?.Platform?.EqualizerAPI || !Spicetify.Menu) {
    setTimeout(ModernEQ, 300);
    return;
  }

  const EQ = Spicetify.Platform.EqualizerAPI;
  const FS = 48000;
  const GAIN_LIMIT = 12;
  const VIEW_RANGE = 14;
  const LS_STATE = "moderneq:state";
  const LS_PRESETS = "moderneq:presets";

  const NATIVE = [
    { key: "audio.equalizer.low_shelf_gain_v2",      freq: 60,    type: "lowshelf",  Q: 0.707 },
    { key: "audio.equalizer.low_peak_gain_v2",       freq: 150,   type: "peaking",   Q: 0.98 },
    { key: "audio.equalizer.low_mid_peak_gain_v2",   freq: 400,   type: "peaking",   Q: 0.98 },
    { key: "audio.equalizer.high_mid_peak_gain_v2",  freq: 1000,  type: "peaking",   Q: 0.98 },
    { key: "audio.equalizer.high_peak_gain_v2",      freq: 2400,  type: "peaking",   Q: 0.98 },
    { key: "audio.equalizer.high_shelf_gain_v2",     freq: 15000, type: "highshelf", Q: 0.707 },
  ];

  const BANDS = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000, 24000];
  const BAND_LABELS = ["32", "64", "125", "250", "500", "1K", "2K", "4K", "8K", "16K", "24K"];

  const REGIONS = [
    { name: "SUB",    from: 0, to: 1,  color: "139, 92, 246" },
    { name: "BASS",   from: 2, to: 3,  color: "30, 215, 96"  },
    { name: "MID",    from: 4, to: 6,  color: "245, 158, 11" },
    { name: "TREBLE", from: 7, to: 10, color: "56, 189, 248" },
  ];

  const PRESETS = {
    "Flat":          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    "Bass Boost":    [7, 6, 4.5, 2.5, 0.5, 0, 0, 0, 0, 0, 0],
    "Bass Reducer":  [-6, -5, -3.5, -2, -0.5, 0, 0, 0, 0, 0, 0],
    "Treble Boost":  [0, 0, 0, 0, 0, 0.5, 2, 4, 5.5, 6.5, 7],
    "Vocal Clarity": [-1.5, -1, 0, 1.5, 3, 3.5, 3, 1.5, 0, -0.5, -0.5],
    "V-Shape":       [5.5, 4.5, 2, 0, -1.5, -1, 0.5, 3, 4.5, 5.5, 6],
    "Warm":          [3, 3.5, 2.5, 1.5, 0.5, -0.5, -1, -0.5, 0, 0.5, 0.5],
    "Bright":        [-1, -0.5, 0, 0, 0.5, 1.5, 2.5, 3.5, 4, 4.5, 5],
    "Electronic":    [5, 4.5, 1.5, 0, -1.5, 0, 1, 2.5, 4, 5, 5.5],
    "Rock":          [4.5, 3.5, 1, -0.5, -1, 0.5, 2.5, 3.5, 4, 4, 4],
    "Acoustic":      [3.5, 3, 1.5, 0.5, 1, 1.5, 2.5, 3, 2.5, 1.5, 1],
    "Loudness":      [5, 3.5, 0.5, -1, -1.5, -0.5, 0.5, 2.5, 4.5, 5.5, 5],
    "Podcast":       [-3, -1, 1.5, 3, 3.5, 3, 2, 0.5, -1, -2, -3],
    "Lounge":        [2.5, 1.5, 0, -1, -0.5, 0.5, 1, 1.5, 2, 2.5, 2.5],
  };

  function biquadCoeffs(type, f0, gainDb, Q) {
    const A = Math.pow(10, gainDb / 40);
    const w0 = (2 * Math.PI * f0) / FS;
    const cw = Math.cos(w0), sw = Math.sin(w0);
    const alpha = sw / (2 * Q);
    let b0, b1, b2, a0, a1, a2;
    if (type === "peaking") {
      b0 = 1 + alpha * A; b1 = -2 * cw; b2 = 1 - alpha * A;
      a0 = 1 + alpha / A; a1 = -2 * cw; a2 = 1 - alpha / A;
    } else if (type === "lowshelf") {
      const beta = 2 * Math.sqrt(A) * alpha;
      b0 = A * ((A + 1) - (A - 1) * cw + beta);
      b1 = 2 * A * ((A - 1) - (A + 1) * cw);
      b2 = A * ((A + 1) - (A - 1) * cw - beta);
      a0 = (A + 1) + (A - 1) * cw + beta;
      a1 = -2 * ((A - 1) + (A + 1) * cw);
      a2 = (A + 1) + (A - 1) * cw - beta;
    } else {
      const beta = 2 * Math.sqrt(A) * alpha;
      b0 = A * ((A + 1) + (A - 1) * cw + beta);
      b1 = -2 * A * ((A - 1) + (A + 1) * cw);
      b2 = A * ((A + 1) + (A - 1) * cw - beta);
      a0 = (A + 1) - (A - 1) * cw + beta;
      a1 = 2 * ((A - 1) - (A + 1) * cw);
      a2 = (A + 1) - (A - 1) * cw - beta;
    }
    return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
  }

  function magDb(c, f) {
    const w = (2 * Math.PI * f) / FS;
    const c1 = Math.cos(w), s1 = Math.sin(w), c2 = Math.cos(2 * w), s2 = Math.sin(2 * w);
    const nr = c.b0 + c.b1 * c1 + c.b2 * c2, ni = c.b1 * s1 + c.b2 * s2;
    const dr = 1 + c.a1 * c1 + c.a2 * c2, di = c.a1 * s1 + c.a2 * s2;
    return 10 * Math.log10((nr * nr + ni * ni) / (dr * dr + di * di));
  }

  function nativeResponse(gains, f) {
    let db = 0;
    for (let i = 0; i < NATIVE.length; i++) {
      if (Math.abs(gains[i]) < 0.01) continue;
      db += magDb(biquadCoeffs(NATIVE[i].type, NATIVE[i].freq, gains[i], NATIVE[i].Q), f);
    }
    return db;
  }

  const BASIS = NATIVE.map((flt) => {
    const c = biquadCoeffs(flt.type, flt.freq, 6, flt.Q);
    return BANDS.map((f) => magDb(c, f) / 6);
  });

  function fitToNative(target) {
    const n = NATIVE.length;
    const M = Array.from({ length: n }, () => new Array(n + 1).fill(0));
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < n; k++) {
        let s = 0;
        for (let j = 0; j < BANDS.length; j++) s += BASIS[i][j] * BASIS[k][j];
        M[i][k] = s + (i === k ? 1e-3 : 0);
      }
      let b = 0;
      for (let j = 0; j < BANDS.length; j++) b += BASIS[i][j] * target[j];
      M[i][n] = b;
    }
    for (let col = 0; col < n; col++) {
      let piv = col;
      for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
      [M[col], M[piv]] = [M[piv], M[col]];
      for (let r = 0; r < n; r++) {
        if (r === col || M[r][col] === 0) continue;
        const fac = M[r][col] / M[col][col];
        for (let k = col; k <= n; k++) M[r][k] -= fac * M[col][k];
      }
    }
    return M.map((row, i) => {
      const g = row[n] / row[i];
      return Math.max(-GAIN_LIMIT, Math.min(GAIN_LIMIT, Math.round(g * 10) / 10));
    });
  }

  let bands = new Array(BANDS.length).fill(0);
  let fitted = new Array(NATIVE.length).fill(0);
  let presetName = "Flat";
  let enabled = false;
  let panel = null;

  function clampDb(v) {
    return Math.max(-GAIN_LIMIT, Math.min(GAIN_LIMIT, Math.round(v * 10) / 10));
  }

  function loadState() {
    try {
      const s = JSON.parse(localStorage.getItem(LS_STATE));
      if (Array.isArray(s?.bands) && s.bands.length === BANDS.length) {
        bands = s.bands.map(Number);
        presetName = s.preset || "Manual";
      }
    } catch {}
    fitted = fitToNative(bands);
  }

  function saveState() {
    localStorage.setItem(LS_STATE, JSON.stringify({ bands, preset: presetName }));
  }

  function customPresets() {
    try { return JSON.parse(localStorage.getItem(LS_PRESETS)) || []; } catch { return []; }
  }

  let lastApplied = null;
  let writing = false;
  let dirty = false;

  async function pushGains() {
    if (writing) { dirty = true; return; }
    writing = true;
    try {
      do {
        dirty = false;
        const target = [...fitted];
        const writes = [];
        for (let i = 0; i < NATIVE.length; i++) {
          if (!lastApplied || Math.abs(target[i] - lastApplied[i]) > 0.049) {
            writes.push(EQ.setFilterGain(NATIVE[i].key, target[i]));
          }
        }
        lastApplied = target;
        if (writes.length) await Promise.all(writes);
      } while (dirty);
    } catch (e) {
      console.error("[ModernEQ] failed to apply gains", e);
      lastApplied = null;
    } finally {
      writing = false;
      if (dirty) pushGains();
    }
  }

  async function syncFromNative() {
    try {
      const filters = await EQ.getFilters();
      const current = NATIVE.map((n) => {
        const f = filters.find((x) => x.key === n.key);
        return f ? Math.round(f.gain * 10) / 10 : 0;
      });
      const drift = current.some((g, i) => Math.abs(g - fitted[i]) > 0.2);
      if (drift) {
        bands = BANDS.map((f) => clampDb(nativeResponse(current, f)));
        fitted = current;
        presetName = "Manual";
        saveState();
      }
      lastApplied = [...current];
    } catch (e) {
      console.warn("[ModernEQ] syncFromNative failed", e);
    }
  }

  const ICON = `<svg role="img" height="16" width="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 1a1 1 0 0 1 1 1v6.126a2.5 2.5 0 0 1 0 4.748V14a1 1 0 1 1-2 0v-1.126a2.5 2.5 0 0 1 0-4.748V2a1 1 0 0 1 1-1zm6 0a1 1 0 0 1 1 1v1.126a2.5 2.5 0 0 1 0 4.748V14a1 1 0 1 1-2 0V7.874a2.5 2.5 0 0 1 0-4.748V2a1 1 0 0 1 1-1zm6 0a1 1 0 0 1 1 1v6.126a2.5 2.5 0 0 1 0 4.748V14a1 1 0 1 1-2 0v-1.126a2.5 2.5 0 0 1 0-4.748V2a1 1 0 0 1 1-1z"/></svg>`;

  const CSS = `
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
  `;

  const F_LO = Math.log10(26), F_HI = Math.log10(24000);

  function dbToY(db, h) {
    return h / 2 - (db / VIEW_RANGE) * (h / 2);
  }

  function bandCenterX(i, w) {
    return ((i + 0.5) / BANDS.length) * w;
  }

  function warpX(f, w) {
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

  function drawCurve() {
    if (!panel) return;
    const canvas = panel.querySelector(".meq-canvas");
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
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
    [[12, "+12"], [6, "+6"], [0, "0"], [-6, "-6"], [-12, "-12"]].forEach(([db, t]) => {
      ctx.fillText(t, 6, dbToY(db, h));
    });

    const pts = [];
    for (let k = 0; k <= 220; k++) {
      const f = Math.pow(10, F_LO + (k / 220) * (F_HI - F_LO));
      pts.push([warpX(f, w), dbToY(nativeResponse(fitted, f), h)]);
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
    ctx.moveTo(0, dbToY(bands[0], h));
    for (let i = 0; i < BANDS.length; i++) {
      const x = bandCenterX(i, w), y = dbToY(bands[i], h);
      if (i === 0) { ctx.lineTo(x, y); continue; }
      const px0 = bandCenterX(i - 1, w), py0 = dbToY(bands[i - 1], h);
      const cx = (px0 + x) / 2;
      ctx.bezierCurveTo(cx, py0, cx, y, x, y);
    }
    ctx.lineTo(w, dbToY(bands[BANDS.length - 1], h));
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "rgba(255,255,255,.55)";
    NATIVE.forEach((n) => {
      const x = warpX(n.freq, w), y = dbToY(nativeResponse(fitted, n.freq), h);
      ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
    });

    positionThumbs();
  }

  function positionThumbs() {
    const stage = panel.querySelector(".meq-stage");
    const h = stage.getBoundingClientRect().height;
    panel.querySelectorAll(".meq-col").forEach((col, i) => {
      col.querySelector(".meq-thumb").style.top = dbToY(bands[i], h) + "px";
      col.querySelector(".meq-val").textContent = (bands[i] > 0 ? "+" : "") + bands[i].toFixed(1);
    });
  }

  function updateNativeReadout() {
    const el = panel.querySelector(".meq-native");
    el.textContent = "Native filters → " + NATIVE.map((n, i) => {
      const f = n.freq >= 1000 ? n.freq / 1000 + "K" : n.freq;
      return `${f}Hz ${fitted[i] >= 0 ? "+" : ""}${fitted[i].toFixed(1)}`;
    }).join(" · ");
  }

  function rebuildPresetSelect() {
    const sel = panel.querySelector(".meq-select");
    sel.innerHTML = "";
    const opt = (v, label) => { const o = document.createElement("option"); o.value = v; o.textContent = label || v; sel.appendChild(o); };
    opt("Manual");
    Object.keys(PRESETS).forEach((n) => opt(n));
    const custom = customPresets();
    if (custom.length) {
      const grp = document.createElement("optgroup");
      grp.label = "My presets";
      custom.forEach((p) => { const o = document.createElement("option"); o.value = "custom:" + p.name; o.textContent = p.name; grp.appendChild(o); });
      sel.appendChild(grp);
    }
    sel.value = PRESETS[presetName] ? presetName
      : custom.some((p) => p.name === presetName) ? "custom:" + presetName
      : "Manual";
  }

  function commit() {
    fitted = fitToNative(bands);
    saveState();
    drawCurve();
    updateNativeReadout();
    pushGains();
  }

  function setBands(next, name) {
    bands = next.map(clampDb);
    presetName = name;
    commit();
  }

  function openPanel() {
    if (panel) { closePanel(); return; }

    const regionHeader = REGIONS.map((r) => {
      const span = r.to - r.from + 1;
      return `<div class="meq-region" style="flex:${span};color:rgba(${r.color},.9);background:rgba(${r.color},.07)">${r.name}</div>`;
    }).join("");

    const overlay = document.createElement("div");
    overlay.className = "meq-overlay";
    overlay.innerHTML = `
      <div class="meq-panel" role="dialog" aria-label="ModernEQ">
        <div class="meq-header">
          <div class="meq-title">${ICON} ModernEQ</div>
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

    const sw = overlay.querySelector(".meq-switch");
    const setSw = (on) => { enabled = on; sw.classList.toggle("on", on); };
    const unsub = EQ.subscribeToEnabledState(setSw);
    sw.onclick = () => EQ.setEnabledState(!enabled);

    rebuildPresetSelect();
    const sel = overlay.querySelector(".meq-select");
    const delBtn = overlay.querySelector(".meq-delete");
    const refreshDel = () => { delBtn.style.display = sel.value.startsWith("custom:") ? "" : "none"; };
    refreshDel();
    sel.onchange = () => {
      const v = sel.value;
      if (v === "Manual") { presetName = "Manual"; saveState(); }
      else if (v.startsWith("custom:")) {
        const p = customPresets().find((x) => x.name === v.slice(7));
        if (p) setBands(p.bands, p.name);
      } else if (PRESETS[v]) setBands(PRESETS[v], v);
      refreshDel();
    };
    delBtn.onclick = () => {
      const name = sel.value.slice(7);
      localStorage.setItem(LS_PRESETS, JSON.stringify(customPresets().filter((p) => p.name !== name)));
      presetName = "Manual";
      saveState();
      rebuildPresetSelect();
      refreshDel();
    };

    const saveRow = overlay.querySelector(".meq-save-row");
    const nameInput = overlay.querySelector(".meq-input");
    overlay.querySelector(".meq-save").onclick = () => { saveRow.classList.add("open"); nameInput.focus(); };
    overlay.querySelector(".meq-save-cancel").onclick = () => saveRow.classList.remove("open");
    overlay.querySelector(".meq-save-confirm").onclick = () => {
      const name = nameInput.value.trim();
      if (!name) return;
      const list = customPresets().filter((p) => p.name !== name);
      list.push({ name, bands: [...bands] });
      localStorage.setItem(LS_PRESETS, JSON.stringify(list));
      presetName = name;
      saveState();
      saveRow.classList.remove("open");
      nameInput.value = "";
      rebuildPresetSelect();
      refreshDel();
      Spicetify.showNotification?.(`Preset "${name}" saved`);
    };

    overlay.querySelector(".meq-reset").onclick = () => { setBands(PRESETS.Flat, "Flat"); rebuildPresetSelect(); refreshDel(); };

    const stage = overlay.querySelector(".meq-stage");
    const markManual = () => { presetName = "Manual"; sel.value = "Manual"; refreshDel(); };
    overlay.querySelectorAll(".meq-col").forEach((col, i) => {
      const fromY = (clientY) => {
        const r = stage.getBoundingClientRect();
        return clampDb(((r.height / 2 - (clientY - r.top)) / (r.height / 2)) * VIEW_RANGE);
      };
      col.onpointerdown = (e) => {
        col.setPointerCapture(e.pointerId);
        col.classList.add("drag");
        bands[i] = fromY(e.clientY);
        markManual();
        commit();
        col.onpointermove = (ev) => { bands[i] = fromY(ev.clientY); commit(); };
        col.onpointerup = () => { col.onpointermove = null; col.classList.remove("drag"); };
      };
      col.ondblclick = () => { bands[i] = 0; markManual(); commit(); };
      col.onwheel = (e) => {
        e.preventDefault();
        bands[i] = clampDb(bands[i] + (e.deltaY < 0 ? 0.5 : -0.5));
        markManual();
        commit();
      };
    });

    const onKey = (e) => { if (e.key === "Escape") closePanel(); };
    overlay.onclick = (e) => { if (e.target === overlay) closePanel(); };
    overlay.querySelector(".meq-close").onclick = closePanel;
    document.addEventListener("keydown", onKey);
    const ro = new ResizeObserver(() => drawCurve());
    ro.observe(stage);
    panel._cleanup = () => { document.removeEventListener("keydown", onKey); unsub?.(); ro.disconnect(); };

    syncFromNative().then(() => {
      if (!panel) return;
      rebuildPresetSelect();
      drawCurve();
      updateNativeReadout();
    });
    drawCurve();
    updateNativeReadout();
  }

  function closePanel() {
    if (!panel) return;
    panel._cleanup?.();
    panel.remove();
    panel = null;
  }

  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.appendChild(style);

  loadState();

  new Spicetify.Menu.Item("ModernEQ", false, openPanel, ICON).register();
})();
