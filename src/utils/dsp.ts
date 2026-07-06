import { BANDS, FS, GAIN_LIMIT, NATIVE, FilterType } from "./constants";

interface BiquadCoeffs {
    b0: number;
    b1: number;
    b2: number;
    a1: number;
    a2: number;
}

export function biquadCoeffs(type: FilterType, f0: number, gainDb: number, Q: number): BiquadCoeffs {
    const A = Math.pow(10, gainDb / 40);
    const w0 = (2 * Math.PI * f0) / FS;
    const cw = Math.cos(w0), sw = Math.sin(w0);
    const alpha = sw / (2 * Q);
    let b0: number, b1: number, b2: number, a0: number, a1: number, a2: number;
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

export function magDb(c: BiquadCoeffs, f: number): number {
    const w = (2 * Math.PI * f) / FS;
    const c1 = Math.cos(w), s1 = Math.sin(w), c2 = Math.cos(2 * w), s2 = Math.sin(2 * w);
    const nr = c.b0 + c.b1 * c1 + c.b2 * c2, ni = c.b1 * s1 + c.b2 * s2;
    const dr = 1 + c.a1 * c1 + c.a2 * c2, di = c.a1 * s1 + c.a2 * s2;
    return 10 * Math.log10((nr * nr + ni * ni) / (dr * dr + di * di));
}

export function nativeResponse(gains: number[], f: number): number {
    let db = 0;
    for (let i = 0; i < NATIVE.length; i++) {
        if (Math.abs(gains[i]) < 0.01) continue;
        db += magDb(biquadCoeffs(NATIVE[i].type, NATIVE[i].freq, gains[i], NATIVE[i].Q), f);
    }
    return db;
}

const BASIS: number[][] = NATIVE.map((flt) => {
    const c = biquadCoeffs(flt.type, flt.freq, 6, flt.Q);
    return BANDS.map((f) => magDb(c, f) / 6);
});

export function fitToNative(target: number[]): number[] {
    const n = NATIVE.length;
    const M: number[][] = Array.from({ length: n }, () => new Array(n + 1).fill(0));
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
