import { storage } from "./storage";
import { warn, error as logError } from "./debug";
import { toast, dismissToast } from "./toast";

declare const __VERSION__: string;
declare const __BUILD_HASH__: string;

const METADATA_KEY = "_modern_eq_metadata";
const GITHUB_REPO = "7xeh/SpotifyModernEQ";
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases`;
const RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases`;
const UPDATE_API_URL = "https://7xeh.dev/apps/moderneq/api/version.php";
const RELEASE_BASE_URL = "https://7xeh.dev/apps/moderneq/releases";

const MIN_CHECK_INTERVAL_MS = 15 * 60 * 1000;
const DEFAULT_CHECK_INTERVAL_MS = 30 * 60 * 1000;
const INITIAL_CHECK_DELAY_MS = 15000;
const MAX_BACKOFF_MS = 2 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 6000;
const SCHEDULE_JITTER_MS = 2 * 60 * 1000;
const SNOOZE_MS = 12 * 60 * 60 * 1000;
const PENDING_TTL_MS = 60 * 60 * 1000;

const STORAGE_KEYS = {
    pending: "pending-update",
    snooze: "update-snooze",
    skip: "update-skip",
    lastVersion: "last-known-version",
} as const;

export interface VersionInfo {
    major: number;
    minor: number;
    patch: number;
    text: string;
}

export interface RemoteRelease {
    version: VersionInfo;
    downloadUrl: string;
    releaseUrl: string;
    changelog: string;
}

export type UpdateTrigger = "auto" | "manual";

export type UpdateCheckResult =
    | { status: "update"; current: VersionInfo; remote: RemoteRelease; installable: boolean }
    | { status: "current"; current: VersionInfo; remote: RemoteRelease }
    | { status: "error"; current: VersionInfo; message: string };

interface LoaderMetadata {
    LoadedVersion?: string;
    IsLoader?: boolean;
}

interface PendingUpdate {
    version: string;
    fromVersion: string;
    createdAt: number;
}

function loaderMetadata(): LoaderMetadata | null {
    try {
        const meta = (window as any)[METADATA_KEY];
        return meta && meta.LoadedVersion ? (meta as LoaderMetadata) : null;
    } catch {
        return null;
    }
}

function clearLoaderMetadata(): void {
    try {
        if ((window as any)[METADATA_KEY]) (window as any)[METADATA_KEY] = {};
    } catch {}
}

const META = loaderMetadata();
const IS_LOADER = META?.IsLoader === true;
const CURRENT_VERSION = META?.LoadedVersion || (typeof __VERSION__ !== "undefined" ? __VERSION__ : "0.0.0");

let inFlightCheck: Promise<UpdateCheckResult> | null = null;
let lastCheckTime = 0;
let currentIntervalMs = DEFAULT_CHECK_INTERVAL_MS;
let currentBackoffMs = 0;
let checkTimer: ReturnType<typeof setTimeout> | null = null;
let schedulerStarted = false;
let isInstalling = false;
let activePromptKey: string | null = null;

export function parseVersion(version: string): VersionInfo | null {
    if (typeof version !== "string") return null;
    const match = version.trim().replace(/^v/i, "").match(/^(\d+)\.(\d+)\.(\d+)/);
    if (!match) return null;
    return {
        major: parseInt(match[1], 10),
        minor: parseInt(match[2], 10),
        patch: parseInt(match[3], 10),
        text: `${match[1]}.${match[2]}.${match[3]}`,
    };
}

export function compareVersions(a: VersionInfo, b: VersionInfo): number {
    if (a.major !== b.major) return a.major > b.major ? 1 : -1;
    if (a.minor !== b.minor) return a.minor > b.minor ? 1 : -1;
    if (a.patch !== b.patch) return a.patch > b.patch ? 1 : -1;
    return 0;
}

function getCurrentVersion(): VersionInfo {
    return parseVersion(CURRENT_VERSION) || { major: 0, minor: 0, patch: 0, text: CURRENT_VERSION };
}

export function getBuildHash(): string {
    return typeof __BUILD_HASH__ === "string" && !__BUILD_HASH__.startsWith("MEQ_BUILD_HASH_PLACEHOLDER")
        ? __BUILD_HASH__.toLowerCase()
        : "";
}

async function fetchWithTimeout(input: string, init: RequestInit = {}, timeoutMs = REQUEST_TIMEOUT_MS): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(input, { ...init, signal: controller.signal });
    } finally {
        clearTimeout(id);
    }
}

async function fetchSelfHostedRelease(): Promise<RemoteRelease | null> {
    try {
        const response = await fetchWithTimeout(`${UPDATE_API_URL}?action=version&_=${Date.now()}`);
        if (!response.ok) return null;
        const data = await response.json();
        const version = parseVersion(data?.version);
        if (!version) return null;
        return {
            version,
            downloadUrl: typeof data.download_url === "string" && data.download_url
                ? data.download_url
                : `${RELEASE_BASE_URL}/versions/v${version.text}/modern-eq.js`,
            releaseUrl: typeof data.release_notes_url === "string" && data.release_notes_url ? data.release_notes_url : RELEASES_URL,
            changelog: typeof data.changelog === "string" ? data.changelog : "",
        };
    } catch {
        return null;
    }
}

async function fetchGitHubLatestRelease(): Promise<RemoteRelease | null> {
    try {
        const response = await fetchWithTimeout(`${GITHUB_API_URL}/latest`, {
            headers: { Accept: "application/vnd.github.v3+json" },
        });
        if (!response.ok) return null;
        const release = await response.json();
        const version = parseVersion(release.tag_name);
        if (!version) return null;
        const jsAsset = Array.isArray(release.assets)
            ? release.assets.find((asset: any) => typeof asset?.name === "string" && asset.name.endsWith(".js"))
            : null;
        return {
            version,
            downloadUrl: jsAsset?.browser_download_url || "",
            releaseUrl: release.html_url || RELEASES_URL,
            changelog: typeof release.body === "string" ? release.body : "",
        };
    } catch {
        return null;
    }
}

async function fetchRemoteRelease(): Promise<RemoteRelease | null> {
    return (await fetchSelfHostedRelease()) || (await fetchGitHubLatestRelease());
}

async function resolveUpdateStatus(): Promise<UpdateCheckResult> {
    const current = getCurrentVersion();
    try {
        const remote = await fetchRemoteRelease();
        if (!remote) return { status: "error", current, message: "Update server could not be reached" };
        if (compareVersions(remote.version, current) > 0) {
            return { status: "update", current, remote, installable: IS_LOADER };
        }
        return { status: "current", current, remote };
    } catch (e) {
        logError("Update check failed:", e);
        return { status: "error", current, message: e instanceof Error ? e.message : "Unknown error" };
    }
}

function runCheck(): Promise<UpdateCheckResult> {
    if (!inFlightCheck) {
        lastCheckTime = Date.now();
        inFlightCheck = resolveUpdateStatus().finally(() => { inFlightCheck = null; });
    }
    return inFlightCheck;
}

function promptKey(result: UpdateCheckResult): string | null {
    return result.status === "update" ? `update:${result.remote.version.text}` : null;
}

function isSnoozed(key: string): boolean {
    if (storage.get(STORAGE_KEYS.skip) === key) return true;
    try {
        const raw = storage.get(STORAGE_KEYS.snooze);
        if (!raw) return false;
        const snooze = JSON.parse(raw);
        return snooze?.key === key && typeof snooze.until === "number" && snooze.until > Date.now();
    } catch {
        return false;
    }
}

function snooze(key: string, ms = SNOOZE_MS): void {
    storage.set(STORAGE_KEYS.snooze, JSON.stringify({ key, until: Date.now() + ms }));
}

function clearSnooze(): void {
    storage.remove(STORAGE_KEYS.snooze);
    storage.remove(STORAGE_KEYS.skip);
}

type ActionableResult = Extract<UpdateCheckResult, { status: "update" }>;

function installUpdate(result: ActionableResult): void {
    if (isInstalling) return;
    isInstalling = true;
    if (checkTimer !== null) {
        clearTimeout(checkTimer);
        checkTimer = null;
    }
    const pending: PendingUpdate = {
        version: result.remote.version.text,
        fromVersion: result.current.text,
        createdAt: Date.now(),
    };
    storage.set(STORAGE_KEYS.pending, JSON.stringify(pending));
    clearSnooze();
    toast({
        kind: "update",
        key: "meq-update",
        title: `Installing v${pending.version}…`,
        description: "Reloading Spotify.",
        duration: Infinity,
    });
    clearLoaderMetadata();
    setTimeout(() => window.location.reload(), 600);
}

function presentPrompt(result: ActionableResult, trigger: UpdateTrigger): void {
    const key = promptKey(result)!;
    if (activePromptKey === key && trigger === "auto") return;
    activePromptKey = key;

    let acted = false;

    const actions = result.installable
        ? [
            {
                label: "Update and reload",
                primary: true,
                onClick: () => { acted = true; installUpdate(result); },
            },
            { label: "Release notes", href: result.remote.releaseUrl },
        ]
        : [
            {
                label: "Get it on GitHub",
                primary: true,
                href: result.remote.releaseUrl,
                onClick: () => { acted = true; snooze(key); },
            },
        ];

    toast({
        kind: "update",
        key: "meq-update",
        title: `ModernEQ v${result.remote.version.text} is available`,
        description: result.installable
            ? `You're on v${result.current.text}. Updating reloads Spotify.`
            : `You're on v${result.current.text}. This copy was installed by hand.`,
        actions,
        duration: trigger === "manual" ? Infinity : 12000,
        onDismiss: () => { if (!acted) snooze(key); },
    });
}

export async function checkForUpdates(options: { trigger?: UpdateTrigger } | boolean = {}): Promise<UpdateCheckResult> {
    const trigger: UpdateTrigger = typeof options === "boolean"
        ? (options ? "manual" : "auto")
        : (options.trigger ?? "manual");

    const result = await runCheck();

    if (result.status === "error") increaseBackoff();
    else resetBackoff();

    const key = promptKey(result);
    if (result.status === "update" && key && !isInstalling) {
        if (trigger === "manual") {
            clearSnooze();
            presentPrompt(result, "manual");
        } else if (!isSnoozed(key)) {
            presentPrompt(result, "auto");
        }
    } else if (!key) {
        activePromptKey = null;
        if (trigger === "manual" && result.status === "current") {
            toast({
                kind: "success",
                key: "meq-update-check",
                title: "You're up to date",
                description: `v${result.current.text} is the latest ModernEQ.`,
            });
        } else if (trigger === "manual" && result.status === "error") {
            toast({
                kind: "error",
                key: "meq-update-check",
                title: "Couldn't check for updates",
                description: result.message,
            });
        }
    }

    if (schedulerStarted && !isInstalling) scheduleNextCheck();
    return result;
}

export async function getUpdateInfo(): Promise<{
    hasUpdate: boolean;
    currentVersion: string;
    latestVersion: string | null;
    releaseUrl: string | null;
} | null> {
    const result = await runCheck();
    if (result.status === "error") return null;
    return {
        hasUpdate: result.status === "update",
        currentVersion: result.current.text,
        latestVersion: result.remote.version.text,
        releaseUrl: result.remote.releaseUrl,
    };
}

export async function isUpdateAvailable(): Promise<boolean> {
    const info = await getUpdateInfo();
    return !!info?.hasUpdate;
}

function getScheduledDelay(): number {
    const jitter = Math.floor(Math.random() * SCHEDULE_JITTER_MS);
    return Math.max(MIN_CHECK_INTERVAL_MS, currentIntervalMs) + jitter + currentBackoffMs;
}

function scheduleNextCheck(forceDelayMs?: number): void {
    if (checkTimer !== null) clearTimeout(checkTimer);
    const delay = typeof forceDelayMs === "number" ? Math.max(1000, forceDelayMs) : getScheduledDelay();
    checkTimer = setTimeout(runScheduledCheck, delay);
}

function runScheduledCheck(): void {
    checkTimer = null;
    if (isInstalling) return;
    if (typeof document !== "undefined" && document.hidden) {
        scheduleNextCheck();
        return;
    }
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
        increaseBackoff();
        scheduleNextCheck();
        return;
    }
    checkForUpdates({ trigger: "auto" }).catch(() => scheduleNextCheck());
}

function increaseBackoff(): void {
    currentBackoffMs = currentBackoffMs === 0 ? 5 * 60 * 1000 : Math.min(MAX_BACKOFF_MS, currentBackoffMs * 2);
}

function resetBackoff(): void {
    currentBackoffMs = 0;
}

export function startUpdateChecker(intervalMs = DEFAULT_CHECK_INTERVAL_MS): void {
    currentIntervalMs = Math.max(MIN_CHECK_INTERVAL_MS, intervalMs);
    if (schedulerStarted) return;
    schedulerStarted = true;

    try {
        document.addEventListener("visibilitychange", () => {
            if (document.hidden || isInstalling || inFlightCheck) return;
            if (Date.now() - lastCheckTime >= MIN_CHECK_INTERVAL_MS) scheduleNextCheck(3000);
        });
        window.addEventListener("online", () => {
            if (isInstalling || inFlightCheck) return;
            resetBackoff();
            if (Date.now() - lastCheckTime >= MIN_CHECK_INTERVAL_MS) scheduleNextCheck(3000);
        });
    } catch {}

    scheduleNextCheck(INITIAL_CHECK_DELAY_MS);
}

function readPending(): PendingUpdate | null {
    try {
        const raw = storage.get(STORAGE_KEYS.pending);
        if (!raw) return null;
        const pending = JSON.parse(raw);
        if (!pending || typeof pending.version !== "string") return null;
        return pending as PendingUpdate;
    } catch {
        return null;
    }
}

export async function showPostUpdateChangelog(): Promise<void> {
    const pending = readPending();
    const lastVersion = storage.get(STORAGE_KEYS.lastVersion);

    storage.remove(STORAGE_KEYS.pending);
    storage.set(STORAGE_KEYS.lastVersion, CURRENT_VERSION);

    const current = getCurrentVersion();
    let fromVersion: string | null = null;

    if (pending && Date.now() - pending.createdAt < PENDING_TTL_MS) {
        const target = parseVersion(pending.version);
        if (!target || compareVersions(current, target) < 0) {
            toast({
                kind: "warning",
                title: "The update isn't applied yet",
                description: "Restart Spotify to finish updating.",
                actions: [{ label: "Reload now", primary: true, onClick: () => window.location.reload() }],
            });
            return;
        }
        fromVersion = pending.fromVersion;
    } else if (lastVersion) {
        const last = parseVersion(lastVersion);
        if (last && compareVersions(current, last) > 0) fromVersion = last.text;
    }

    if (fromVersion === null) return;

    toast({
        kind: "success",
        title: `You're on v${current.text}`,
        description: fromVersion && fromVersion !== current.text ? `Updated from v${fromVersion}.` : "ModernEQ is up to date.",
        duration: 9000,
        actions: [{ label: "What's new", href: `${RELEASES_URL}/tag/v${encodeURIComponent(current.text)}` }],
    });
}

export function dismissUpdatePrompts(): void {
    dismissToast("meq-update");
}

export const VERSION = CURRENT_VERSION;
export const REPO_URL = RELEASES_URL;
