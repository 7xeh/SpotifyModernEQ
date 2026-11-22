const STORAGE_PREFIX = "moderneq:";

function isLocalStorageAvailable(): boolean {
    try {
        const probe = "__meq_storage_test__";
        localStorage.setItem(probe, probe);
        localStorage.removeItem(probe);
        return true;
    } catch {
        return false;
    }
}

export const storage = {
    get(key: string): string | null {
        try {
            if (!isLocalStorageAvailable()) return null;
            return localStorage.getItem(STORAGE_PREFIX + key);
        } catch {
            return null;
        }
    },

    set(key: string, value: string): boolean {
        try {
            if (!isLocalStorageAvailable()) return false;
            localStorage.setItem(STORAGE_PREFIX + key, value);
            return true;
        } catch {
            return false;
        }
    },

    remove(key: string): void {
        try {
            if (!isLocalStorageAvailable()) return;
            localStorage.removeItem(STORAGE_PREFIX + key);
        } catch {}
    },

    getJSON<T>(key: string, fallback: T): T {
        const raw = this.get(key);
        if (raw === null) return fallback;
        try {
            const parsed = JSON.parse(raw);
            return parsed === null || parsed === undefined ? fallback : (parsed as T);
        } catch {
            return fallback;
        }
    },

    setJSON(key: string, value: unknown): boolean {
        try {
            return this.set(key, JSON.stringify(value));
        } catch {
            return false;
        }
    },
};
