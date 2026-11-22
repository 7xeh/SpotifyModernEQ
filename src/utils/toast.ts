export type ToastKind = "info" | "success" | "warning" | "error" | "update";

export interface ToastAction {
    label: string;
    primary?: boolean;
    href?: string;
    onClick?: (event: MouseEvent, handle: ToastHandle) => void;
}

export interface ToastOptions {
    kind?: ToastKind;
    title: string;
    description?: string;
    actions?: ToastAction[];
    duration?: number;
    key?: string;
    onDismiss?: () => void;
}

export interface ToastHandle {
    el: HTMLElement;
    close: (reason?: "dismiss" | "action" | "timeout" | "replace") => void;
    update: (patch: Partial<ToastOptions>) => void;
}

const MAX_VISIBLE = 3;
const STYLE_ID = "meq-toast-styles";
const REGION_ID = "meq-toast-region";

const DEFAULT_DURATION: Record<ToastKind, number> = {
    info: 4200,
    success: 4200,
    warning: 8000,
    error: 8000,
    update: Infinity,
};

const ACCENT: Record<ToastKind, string> = {
    info: "56, 189, 248",
    success: "30, 215, 96",
    warning: "245, 158, 11",
    error: "239, 68, 68",
    update: "139, 92, 246",
};

const ICONS: Record<ToastKind, string> = {
    info: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 7.2v3.9M8 4.9v.1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    success: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.4l2.9 2.9 6.1-6.3" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    warning: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.2l6.3 11H1.7z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M8 6.5v3.2M8 11.6v.1" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    error: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M5.8 5.8l4.4 4.4M10.2 5.8l-4.4 4.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    update: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 12.5V3.8M4.3 7.3L8 3.6l3.7 3.7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

const CLOSE_SVG = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';

const TOAST_CSS = `
#${REGION_ID} { position: fixed; left: 18px; bottom: 96px; z-index: 2147482500; display: flex; flex-direction: column; gap: 10px; width: min(360px, calc(100vw - 36px)); pointer-events: none; }
.meq-toast { --meq-toast-accent: 30,215,96; pointer-events: auto; position: relative; display: flex; gap: 12px; padding: 13px 14px 13px 15px; border-radius: 14px; overflow: hidden; color: var(--spice-text, #fff); background: linear-gradient(165deg, rgba(28,28,30,.98), rgba(18,18,20,.98)); border: 1px solid rgba(255,255,255,.1); box-shadow: 0 18px 44px -16px rgba(0,0,0,.72), inset 0 1px 0 rgba(255,255,255,.07); font-family: var(--font-family, CircularSp, sans-serif); }
.meq-toast-icon { flex: none; width: 20px; height: 20px; margin-top: 1px; color: rgb(var(--meq-toast-accent)); }
.meq-toast-icon svg { width: 100%; height: 100%; }
.meq-toast-body { flex: 1; min-width: 0; }
.meq-toast-title { font-size: 13.5px; font-weight: 750; line-height: 1.3; letter-spacing: -.1px; }
.meq-toast-count { margin-left: 6px; font-size: 11px; font-weight: 700; opacity: .55; }
.meq-toast-desc { margin-top: 3px; font-size: 12.5px; line-height: 1.45; opacity: .74; overflow-wrap: anywhere; }
.meq-toast-desc[hidden] { display: none; }
.meq-toast-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 11px; }
.meq-toast-actions[hidden] { display: none; }
.meq-toast-btn { appearance: none; border: 1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.06); color: inherit; border-radius: 8px; padding: 6px 12px; font: inherit; font-size: 12px; font-weight: 700; cursor: pointer; text-decoration: none; transition: background .12s; }
.meq-toast-btn:hover { background: rgba(255,255,255,.14); }
.meq-toast-btn-primary { background: rgb(var(--meq-toast-accent)); border-color: transparent; color: #000; }
.meq-toast-btn-primary:hover { filter: brightness(1.08); }
.meq-toast-x { flex: none; align-self: flex-start; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; border: none; background: none; color: inherit; opacity: .5; cursor: pointer; border-radius: 6px; padding: 0; }
.meq-toast-x svg { width: 14px; height: 14px; }
.meq-toast-x:hover { opacity: 1; background: rgba(255,255,255,.1); }
.meq-toast-timer { position: absolute; left: 0; right: 0; bottom: 0; height: 2px; background: rgba(255,255,255,.08); }
.meq-toast-timer[hidden] { display: none; }
.meq-toast-timer i { display: block; height: 100%; transform-origin: left center; background: rgb(var(--meq-toast-accent)); }
@media (prefers-reduced-motion: reduce) { .meq-toast { transition: none !important; } }
`;

interface LiveToast {
    handle: ToastHandle;
    options: ToastOptions;
    count: number;
    timer: ReturnType<typeof setTimeout> | null;
    startedAt: number;
    remaining: number;
    bar: HTMLElement;
    barAnim: Animation | null;
    closed: boolean;
}

const live: LiveToast[] = [];
const queue: ToastOptions[] = [];
let hovering = false;

function prefersReducedMotion(): boolean {
    try {
        return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
        return false;
    }
}

function canRender(): boolean {
    try {
        return typeof document !== "undefined" && !!document.body && !!document.head;
    } catch {
        return false;
    }
}

function fallback(options: ToastOptions): ToastHandle {
    try {
        Spicetify.showNotification?.(options.title, options.kind === "error" || options.kind === "warning");
    } catch {}
    const noop: ToastHandle = { el: null as unknown as HTMLElement, close: () => {}, update: () => {} };
    return noop;
}

function ensureStyles(): void {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = TOAST_CSS;
    document.head.appendChild(style);
}

function region(): HTMLElement {
    ensureStyles();
    let node = document.getElementById(REGION_ID);
    if (!node) {
        node = document.createElement("div");
        node.id = REGION_ID;
        node.setAttribute("role", "region");
        node.setAttribute("aria-label", "ModernEQ notifications");
        node.addEventListener("mouseenter", () => { hovering = true; live.forEach(pause); });
        node.addEventListener("mouseleave", () => { hovering = false; live.forEach(resume); });
        document.body.appendChild(node);
    }
    return node;
}

function pause(t: LiveToast): void {
    if (t.timer === null) return;
    clearTimeout(t.timer);
    t.timer = null;
    t.remaining -= Date.now() - t.startedAt;
    t.barAnim?.pause();
}

function resume(t: LiveToast): void {
    if (t.closed || !Number.isFinite(t.remaining) || t.timer !== null) return;
    t.startedAt = Date.now();
    t.timer = setTimeout(() => t.handle.close("timeout"), Math.max(400, t.remaining));
    t.barAnim?.play();
}

function startTimer(t: LiveToast, duration: number): void {
    if (t.timer !== null) clearTimeout(t.timer);
    t.timer = null;
    t.barAnim?.cancel();
    t.barAnim = null;
    t.remaining = duration;
    const inner = t.bar.firstElementChild as HTMLElement;
    if (!Number.isFinite(duration)) {
        t.bar.hidden = true;
        return;
    }
    t.bar.hidden = false;
    if (!prefersReducedMotion() && typeof inner.animate === "function") {
        t.barAnim = inner.animate([{ transform: "scaleX(1)" }, { transform: "scaleX(0)" }], { duration, easing: "linear", fill: "forwards" });
    }
    if (hovering) {
        t.barAnim?.pause();
        return;
    }
    t.startedAt = Date.now();
    t.timer = setTimeout(() => t.handle.close("timeout"), duration);
}

function fill(node: HTMLElement, t: LiveToast): void {
    const o = t.options;
    const kind = o.kind || "info";
    node.style.setProperty("--meq-toast-accent", ACCENT[kind]);
    node.setAttribute("role", kind === "error" || kind === "warning" ? "alert" : "status");
    (node.querySelector(".meq-toast-icon") as HTMLElement).innerHTML = ICONS[kind];
    const title = node.querySelector(".meq-toast-title") as HTMLElement;
    title.textContent = o.title;
    if (t.count > 1) {
        const badge = document.createElement("span");
        badge.className = "meq-toast-count";
        badge.textContent = `×${t.count}`;
        title.appendChild(badge);
    }
    const desc = node.querySelector(".meq-toast-desc") as HTMLElement;
    desc.textContent = o.description || "";
    desc.hidden = !o.description;
    const actions = node.querySelector(".meq-toast-actions") as HTMLElement;
    actions.innerHTML = "";
    const list = o.actions || [];
    list.forEach((action) => {
        const btn = document.createElement(action.href ? "a" : "button") as HTMLElement;
        btn.className = `meq-toast-btn${action.primary ? " meq-toast-btn-primary" : ""}`;
        btn.textContent = action.label;
        if (action.href) {
            (btn as HTMLAnchorElement).href = action.href;
            (btn as HTMLAnchorElement).target = "_blank";
            (btn as HTMLAnchorElement).rel = "noopener noreferrer";
        } else {
            (btn as HTMLButtonElement).type = "button";
        }
        btn.addEventListener("click", (event) => {
            action.onClick?.(event as MouseEvent, t.handle);
            t.handle.close("action");
        });
        actions.appendChild(btn);
    });
    actions.hidden = list.length === 0;
}

function mount(options: ToastOptions): ToastHandle {
    const host = region();
    const node = document.createElement("div");
    node.className = "meq-toast";
    node.innerHTML =
        '<span class="meq-toast-icon"></span>' +
        '<div class="meq-toast-body"><div class="meq-toast-title"></div><div class="meq-toast-desc"></div><div class="meq-toast-actions"></div></div>' +
        `<button class="meq-toast-x" type="button" aria-label="Dismiss">${CLOSE_SVG}</button>` +
        '<div class="meq-toast-timer"><i></i></div>';
    const bar = node.querySelector(".meq-toast-timer") as HTMLElement;

    const t: LiveToast = {
        handle: null as unknown as ToastHandle,
        options,
        count: 1,
        timer: null,
        startedAt: Date.now(),
        remaining: 0,
        bar,
        barAnim: null,
        closed: false,
    };

    t.handle = {
        el: node,
        update: (patch) => {
            t.options = { ...t.options, ...patch };
            fill(node, t);
            startTimer(t, t.options.duration ?? DEFAULT_DURATION[t.options.kind || "info"]);
        },
        close: (reason = "dismiss") => {
            if (t.closed) return;
            t.closed = true;
            if (t.timer !== null) clearTimeout(t.timer);
            t.barAnim?.cancel();
            const index = live.indexOf(t);
            if (index >= 0) live.splice(index, 1);
            if (reason === "dismiss") {
                try { t.options.onDismiss?.(); } catch {}
            }
            const done = () => {
                node.remove();
                flushQueue();
            };
            if (prefersReducedMotion() || reason === "replace" || typeof node.animate !== "function") {
                done();
                return;
            }
            const anim = node.animate([
                { opacity: 1, transform: "none" },
                { opacity: 0, transform: "translateX(-14px)" },
            ], { duration: 240, easing: "ease-in", fill: "forwards" });
            let settled = false;
            const once = () => { if (!settled) { settled = true; done(); } };
            anim.onfinish = once;
            setTimeout(once, 320);
        },
    };

    node.querySelector(".meq-toast-x")?.addEventListener("click", () => t.handle.close("dismiss"));

    fill(node, t);
    host.appendChild(node);
    live.push(t);
    startTimer(t, options.duration ?? DEFAULT_DURATION[options.kind || "info"]);

    if (!prefersReducedMotion() && typeof node.animate === "function") {
        node.animate([
            { opacity: 0, transform: "translateX(-12px)" },
            { opacity: 1, transform: "none" },
        ], { duration: 260, easing: "cubic-bezier(0.2, 0.9, 0.1, 1)" });
    }
    return t.handle;
}

function flushQueue(): void {
    while (queue.length && live.length < MAX_VISIBLE) {
        mount(queue.shift()!);
    }
}

export function toast(options: ToastOptions): ToastHandle {
    if (!canRender()) return fallback(options);

    if (options.key) {
        const existing = live.find((t) => t.options.key === options.key && !t.closed);
        if (existing) {
            existing.count += 1;
            existing.options = { ...existing.options, ...options };
            fill(existing.handle.el, existing);
            startTimer(existing, options.duration ?? DEFAULT_DURATION[options.kind || "info"]);
            return existing.handle;
        }
        const queued = queue.find((q) => q.key === options.key);
        if (queued) {
            Object.assign(queued, options);
            return { el: null as unknown as HTMLElement, close: () => {}, update: () => {} };
        }
    }

    if (live.length >= MAX_VISIBLE) {
        const evictable = live.find((t) => Number.isFinite(t.remaining));
        if (evictable) {
            evictable.handle.close("replace");
        } else {
            queue.push(options);
            return { el: null as unknown as HTMLElement, close: () => {}, update: () => {} };
        }
    }
    return mount(options);
}

export function dismissToast(key: string): void {
    live.filter((t) => t.options.key === key).forEach((t) => t.handle.close("replace"));
    for (let i = queue.length - 1; i >= 0; i--) {
        if (queue[i].key === key) queue.splice(i, 1);
    }
}

export function notify(message: string, isError = false): ToastHandle {
    return toast({ kind: isError ? "error" : "success", title: message });
}
