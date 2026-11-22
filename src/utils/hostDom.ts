export const PROFILE_TRIGGER_SELECTOR = [
    '[data-testid="user-widget-link"]',
    '.main-userWidget-box',
    '.main-userWidget-boxCondensed',
].join(', ');

const PROFILE_AVATAR_SELECTOR = '[data-testid="user-widget-avatar"]';
const GLOBAL_NAV_SELECTOR = '#global-nav-bar, .Root__globalNav, .Root__top-bar, .main-topBar-container';
const MENU_ITEM_SELECTOR = '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]';

export function isRendered(element: Element | null | undefined): element is HTMLElement {
    if (!element || !element.isConnected) return false;
    const rect = (element as HTMLElement).getBoundingClientRect?.();
    return !rect || rect.width > 0 || rect.height > 0;
}

export function findProfileTrigger(doc: Document = document): HTMLElement | null {
    const direct = Array.from(doc.querySelectorAll<HTMLElement>(PROFILE_TRIGGER_SELECTOR));
    const rendered = direct.find(isRendered) ?? direct[0];
    if (rendered) return rendered;

    const avatar = doc.querySelector(PROFILE_AVATAR_SELECTOR);
    const avatarButton = avatar?.closest<HTMLElement>('button, [role="button"]');
    if (avatarButton) return avatarButton;

    const nav = doc.querySelector(GLOBAL_NAV_SELECTOR);
    if (!nav) return null;
    const expandable = Array.from(nav.querySelectorAll<HTMLElement>('button[aria-expanded], [role="button"][aria-expanded]'));
    return expandable[expandable.length - 1] ?? null;
}

export function profileTriggerContaining(element: Element | null): HTMLElement | null {
    if (!element) return null;
    const match = element.closest<HTMLElement>(PROFILE_TRIGGER_SELECTOR)
        ?? element.closest(PROFILE_AVATAR_SELECTOR)?.closest<HTMLElement>('button, [role="button"]');
    if (match) return match;
    const trigger = findProfileTrigger(element.ownerDocument);
    return trigger && trigger.contains(element) ? trigger : null;
}

function isTopLevelMenu(menu: Element): boolean {
    const depth = Number.parseInt(menu.getAttribute('data-depth') || '0', 10);
    if (depth > 0) return false;
    return !menu.parentElement?.closest('[role="menu"]');
}

export function findOpenProfileMenu(trigger: HTMLElement | null, doc: Document = document): HTMLElement | null {
    const menus = Array.from(doc.querySelectorAll<HTMLElement>('[role="menu"]'))
        .filter(menu => isRendered(menu) && isTopLevelMenu(menu));
    if (menus.length === 0) return null;

    const controls = trigger?.getAttribute('aria-controls');
    if (controls) {
        const controlled = doc.getElementById(controls);
        const menu = controlled?.matches('[role="menu"]') ? controlled : controlled?.querySelector<HTMLElement>('[role="menu"]');
        if (menu && menus.includes(menu)) return menu;
    }

    const label = trigger?.getAttribute('aria-label')?.trim();
    if (label) {
        const labelled = menus.find(menu => menu.getAttribute('aria-label')?.trim() === label);
        if (labelled) return labelled;
    }

    const labelledBy = (menu: HTMLElement) => {
        const id = menu.getAttribute('aria-labelledby');
        return id ? doc.getElementById(id) : null;
    };
    const ownedByTrigger = menus.find(menu => {
        const labeller = labelledBy(menu);
        return !!labeller && !!trigger && (labeller === trigger || trigger.contains(labeller));
    });
    if (ownedByTrigger) return ownedByTrigger;

    const inContextMenu = menus.filter(menu => menu.closest('#context-menu, [data-encore-id="popover"]'));
    if (inContextMenu.length === 1) return inContextMenu[0];
    return menus.length === 1 ? menus[0] : null;
}

export function menuItemsOf(menu: HTMLElement): HTMLElement[] {
    return Array.from(menu.querySelectorAll<HTMLElement>(MENU_ITEM_SELECTOR))
        .filter(item => item.parentElement?.closest('[role="menu"]') === menu);
}

export function menuRowOf(item: HTMLElement, menu: HTMLElement): HTMLElement {
    let row: HTMLElement = item;
    while (row.parentElement && row.parentElement !== menu && row.parentElement.getAttribute('role') !== 'group') {
        row = row.parentElement;
    }
    return row;
}
