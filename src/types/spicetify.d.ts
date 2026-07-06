interface EqualizerFilter {
    frequency: number;
    key: string;
    type: "lowshelf" | "peaking" | "highshelf";
    gain: number;
}

interface EqualizerAPI {
    getFilters: () => Promise<EqualizerFilter[]>;
    setFilterGain: (key: string, gain: number) => Promise<void>;
    setEnabledState: (enabled: boolean) => void;
    subscribeToEnabledState: (callback: (enabled: boolean) => void) => () => void;
    isSupported: () => boolean;
    prefs: {
        sub: (arg: { key: string }, callback: (value: unknown) => void) => { cancel: () => void };
    };
}

declare const Spicetify: {
    Platform: {
        EqualizerAPI: EqualizerAPI;
    };
    showNotification?: (message: string, isError?: boolean, duration?: number) => void;
};

declare interface Window {
    Spicetify?: typeof Spicetify;
    ModernEQ?: any;
}

declare const __VERSION__: string;
declare const __DEV__: boolean;
