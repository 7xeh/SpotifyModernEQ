import { MENU_ICON } from "./icons";
import { openPanel } from "./panel";
import { warn } from "./debug";
import {
    findOpenProfileMenu,
    findProfileTrigger,
    menuItemsOf,
    menuRowOf,
    profileTriggerContaining,
} from "./hostDom";

const MENU_LABEL = "ModernEQ";
const MENU_ROW_ID = "meq-profile-menu-item";
const MENU_ROW_MARK = "data-meq-menu-row";
const MENU_OPEN_WINDOW_MS = 1500;
const MENU_POLL_INTERVAL_MS = 16;
const MENU_STRIPPED_ATTRIBUTES = [
    "id", "href", "target", "rel", "download",
    "aria-labelledby", "aria-describedby", "aria-controls", "aria-haspopup", "aria-expanded",
    "aria-checked", "aria-selected", "aria-current", "aria-disabled", "aria-label", "aria-keyshortcuts",
    "data-key", "data-testid", "data-hovered", "data-focused", "data-focus-visible", "data-pressed",
    "data-selected", "data-disabled", "data-open", "data-has-submenu", "data-react-aria-pressable",
    "data-collection", "data-rac",
];

let profileMenuWatch: { menu: HTMLElement; observer: MutationObserver } | null = null;
let profileMenuPollUntil = 0;
let profileMenuTimer: ReturnType<typeof setTimeout> | null = null;

function menuItemText(item: Element): string {
    return (item.textContent || "").replace(/\s+/g, " ").trim();
}

function isLeadingMenuIcon(svg: SVGElement, label: Element | null): boolean {
    return !(svg.parentElement instanceof SVGElement) && !!label
        && !!(svg.compareDocumentPosition(label) & Node.DOCUMENT_POSITION_FOLLOWING);
}

function findLabelElement(root: HTMLElement, text: string): HTMLElement | null {
    const elements = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))];
    return elements.reverse().find(element =>
        !(element instanceof SVGElement) && menuItemText(element) === text &&
        Array.from(element.childNodes).some(node => node.nodeType === Node.TEXT_NODE && !!node.textContent?.trim())
    ) ?? null;
}

function findEmptyLeadingSlot(item: HTMLElement, label: HTMLElement): HTMLElement | null {
    return Array.from(item.querySelectorAll<HTMLElement>("*")).find(element =>
        !(element instanceof SVGElement) && element.childNodes.length === 0 && !element.contains(label) &&
        !!(element.compareDocumentPosition(label) & Node.DOCUMENT_POSITION_FOLLOWING)
    ) ?? null;
}

function pickTemplateItem(items: HTMLElement[]): HTMLElement | null {
    const plain = items.filter(item =>
        item.getAttribute("role") === "menuitem" &&
        !item.hasAttribute("aria-haspopup") &&
        item.getAttribute("aria-disabled") !== "true" &&
        !item.querySelector("img, input, [role=menu]") &&
        menuItemText(item).length > 0
    );
    const score = (item: HTMLElement) => {
        const label = findLabelElement(item, menuItemText(item));
        const svgs = Array.from(item.querySelectorAll<SVGElement>("svg")).filter(svg => !(svg.parentElement instanceof SVGElement));
        const leading = svgs.some(svg => isLeadingMenuIcon(svg, label));
        const trailing = svgs.some(svg => !isLeadingMenuIcon(svg, label));
        return (item.tagName === "A" ? 0 : 2) + (leading ? 4 : 0) - (trailing ? 1 : 0);
    };
    return plain.sort((a, b) => score(b) - score(a))[0] ?? null;
}

function createMenuIcon(template: SVGElement | null): SVGElement {
    const graphic = new DOMParser().parseFromString(MENU_ICON, "image/svg+xml").documentElement;
    const icon = document.importNode(graphic, true) as unknown as SVGElement;
    icon.setAttribute("aria-hidden", "true");
    icon.setAttribute("focusable", "false");
    if (template) {
        for (const attribute of ["class", "data-encore-id", "style"]) {
            const value = template.getAttribute(attribute);
            if (value) icon.setAttribute(attribute, value);
        }
    } else {
        icon.setAttribute("style", "flex:0 0 16px;width:16px;height:16px;margin-inline-end:12px;vertical-align:middle;");
    }
    return icon;
}

function closeProfileMenu(trigger: HTMLElement | null, menu: HTMLElement): void {
    menu.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true, cancelable: true }));
    setTimeout(() => {
        if (trigger?.getAttribute("aria-expanded") === "true") trigger.click();
    }, 0);
}

function buildProfileMenuRow(templateItem: HTMLElement, templateRow: HTMLElement, menu: HTMLElement): HTMLElement | null {
    const templateText = menuItemText(templateItem);
    const row = templateRow.cloneNode(true) as HTMLElement;
    const item = templateRow === templateItem ? row : row.querySelector<HTMLElement>("[role=menuitem]");
    if (!item) return null;

    const templateLabel = findLabelElement(templateItem, templateText);
    const leadingTemplateIcon = Array.from(templateItem.querySelectorAll<SVGElement>("svg")).find(svg => isLeadingMenuIcon(svg, templateLabel)) ?? null;

    let label = findLabelElement(item, templateText);
    const leadingSlotIcon = Array.from(item.querySelectorAll<SVGElement>("svg")).find(svg => isLeadingMenuIcon(svg, label)) ?? null;
    const icon = createMenuIcon(leadingTemplateIcon);
    leadingSlotIcon?.replaceWith(icon);
    row.querySelectorAll("svg, img").forEach(node => {
        if (node !== icon && !icon.contains(node)) node.remove();
    });
    for (const element of [row, ...Array.from(row.querySelectorAll("*"))]) {
        MENU_STRIPPED_ATTRIBUTES.forEach(attribute => element.removeAttribute(attribute));
    }
    if (!label || !row.contains(label)) {
        item.textContent = "";
        label = document.createElement("span");
        label.className = "encore-text-body-small ellipsis-one-line";
        label.style.flex = "1";
        item.append(label);
    }
    label.textContent = MENU_LABEL;
    label.dir = "auto";
    if (!row.contains(icon)) {
        const slot = findEmptyLeadingSlot(item, label);
        if (slot) {
            icon.setAttribute("style", "width:16px;height:16px;display:block;");
            slot.append(icon);
        } else {
            label.before(icon);
        }
    }

    row.id = MENU_ROW_ID;
    row.setAttribute(MENU_ROW_MARK, "true");
    item.setAttribute("role", "menuitem");
    item.tabIndex = -1;
    if (item instanceof HTMLButtonElement) item.type = "button";

    const setState = (attribute: string, on: boolean) => {
        if (on) item.setAttribute(attribute, "true");
        else item.removeAttribute(attribute);
    };
    item.addEventListener("pointerenter", () => {
        setState("data-hovered", true);
        item.focus({ preventScroll: true });
    });
    item.addEventListener("pointerleave", () => setState("data-hovered", false));
    item.addEventListener("focus", () => setState("data-focused", true));
    item.addEventListener("blur", () => setState("data-focused", false));
    const activate = (event: Event) => {
        event.preventDefault();
        event.stopPropagation();
        closeProfileMenu(findProfileTrigger(), menu);
        setTimeout(openPanel, 60);
    };
    item.addEventListener("click", activate);
    item.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") activate(event);
    });
    return row;
}

function placeProfileMenuRow(row: HTMLElement, menu: HTMLElement, rows: HTMLElement[]): void {
    const hasLink = (candidate: HTMLElement, selector: string) => candidate.matches(selector) || !!candidate.querySelector(selector);
    const settingsRow = rows.find(candidate => hasLink(candidate, 'a[href$="/preferences"], a[href*="/preferences?"]'));
    if (settingsRow) {
        settingsRow.after(row);
        return;
    }
    const firstLinkRow = rows.find(candidate => hasLink(candidate, "a[href]"));
    if (firstLinkRow) {
        firstLinkRow.before(row);
        return;
    }
    const lastRow = rows[rows.length - 1];
    if (lastRow && rows.length > 1) lastRow.before(row);
    else menu.append(row);
}

function ensureProfileMenuRow(menu: HTMLElement): void {
    const owned = document.getElementById(MENU_ROW_ID);
    const items = menuItemsOf(menu).filter(item => !item.closest(`#${MENU_ROW_ID}`));
    if (items.some(item => menuItemText(item) === MENU_LABEL)) {
        owned?.remove();
        return;
    }
    if (owned && menu.contains(owned)) return;
    owned?.remove();

    const templateItem = pickTemplateItem(items);
    if (!templateItem) return;
    const row = buildProfileMenuRow(templateItem, menuRowOf(templateItem, menu), menu);
    if (!row) return;
    placeProfileMenuRow(row, menu, items.map(item => menuRowOf(item, menu)));
}

function unwatchProfileMenu(): void {
    profileMenuWatch?.observer.disconnect();
    profileMenuWatch = null;
}

function watchOpenProfileMenu(menu: HTMLElement): void {
    if (profileMenuWatch?.menu === menu) return;
    unwatchProfileMenu();
    const observer = new MutationObserver(() => {
        if (!menu.isConnected) {
            unwatchProfileMenu();
            return;
        }
        try {
            ensureProfileMenuRow(menu);
        } catch (e) {
            warn("menu injection failed", e);
        }
    });
    observer.observe(menu, { childList: true, subtree: true });
    profileMenuWatch = { menu, observer };
}

function syncProfileMenu(): boolean {
    if (profileMenuWatch && !profileMenuWatch.menu.isConnected) unwatchProfileMenu();
    const trigger = findProfileTrigger();
    const expanded = trigger?.getAttribute("aria-expanded") ?? null;
    const polling = performance.now() < profileMenuPollUntil;
    const mayBeOpen = expanded === "true" || (expanded === null && polling);
    const menu = mayBeOpen ? findOpenProfileMenu(trigger) : null;
    if (!menu) {
        if (!mayBeOpen) {
            document.getElementById(MENU_ROW_ID)?.remove();
            unwatchProfileMenu();
        }
        return false;
    }
    watchOpenProfileMenu(menu);
    try {
        ensureProfileMenuRow(menu);
    } catch (e) {
        warn("menu injection failed", e);
    }
    return !!document.getElementById(MENU_ROW_ID) || menuItemsOf(menu).some(item => menuItemText(item) === MENU_LABEL);
}

function scheduleProfileMenuSync(windowMs: number = MENU_OPEN_WINDOW_MS): void {
    profileMenuPollUntil = Math.max(profileMenuPollUntil, performance.now() + windowMs);
    if (profileMenuTimer) return;
    const tick = () => {
        profileMenuTimer = null;
        const placed = syncProfileMenu();
        if (!placed && performance.now() < profileMenuPollUntil) profileMenuTimer = setTimeout(tick, MENU_POLL_INTERVAL_MS);
    };
    profileMenuTimer = setTimeout(tick, 0);
}

export function startMenuObserver(): void {
    new MutationObserver((records) => {
        if (records.some(record => !!profileTriggerContaining(record.target as Element))) scheduleProfileMenuSync();
    }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ["aria-expanded"] });

    const onIntent = (event: Event) => {
        if (event instanceof KeyboardEvent && !["Enter", " ", "ArrowDown"].includes(event.key)) return;
        if (profileTriggerContaining(event.target as Element | null)) scheduleProfileMenuSync();
    };
    document.addEventListener("click", onIntent, true);
    document.addEventListener("keydown", onIntent, true);
    syncProfileMenu();
}
