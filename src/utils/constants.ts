export const FS = 48000;
export const GAIN_LIMIT = 12;
export const VIEW_RANGE = 14;
export const LS_STATE = "moderneq:state";
export const LS_PRESETS = "moderneq:presets";

export type FilterType = "lowshelf" | "peaking" | "highshelf";

export interface NativeFilter {
    key: string;
    freq: number;
    type: FilterType;
    Q: number;
}

export const NATIVE: NativeFilter[] = [
    { key: "audio.equalizer.low_shelf_gain_v2",     freq: 60,    type: "lowshelf",  Q: 0.707 },
    { key: "audio.equalizer.low_peak_gain_v2",      freq: 150,   type: "peaking",   Q: 0.98 },
    { key: "audio.equalizer.low_mid_peak_gain_v2",  freq: 400,   type: "peaking",   Q: 0.98 },
    { key: "audio.equalizer.high_mid_peak_gain_v2", freq: 1000,  type: "peaking",   Q: 0.98 },
    { key: "audio.equalizer.high_peak_gain_v2",     freq: 2400,  type: "peaking",   Q: 0.98 },
    { key: "audio.equalizer.high_shelf_gain_v2",    freq: 15000, type: "highshelf", Q: 0.707 },
];

export const BANDS = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000, 24000];
export const BAND_LABELS = ["32", "64", "125", "250", "500", "1K", "2K", "4K", "8K", "16K", "24K"];

export interface Region {
    name: string;
    from: number;
    to: number;
    color: string;
}

export const REGIONS: Region[] = [
    { name: "SUB",    from: 0, to: 1,  color: "139, 92, 246" },
    { name: "BASS",   from: 2, to: 3,  color: "30, 215, 96"  },
    { name: "MID",    from: 4, to: 6,  color: "245, 158, 11" },
    { name: "TREBLE", from: 7, to: 10, color: "56, 189, 248" },
];

export const PRESETS: Record<string, number[]> = {
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

export function clampDb(v: number): number {
    return Math.max(-GAIN_LIMIT, Math.min(GAIN_LIMIT, Math.round(v * 10) / 10));
}
