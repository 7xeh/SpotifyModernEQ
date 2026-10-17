import { MENU_ICON } from "./icons";
import { openPanel } from "./panel";

const PROFILE_BUTTON = '[data-testid="user-widget-link"]';

function profileButton(): HTMLElement | null {
    return (document.querySelector(PROFILE_BUTTON)
        || document.querySelector('[aria-haspopup=menu][aria-expanded=true]')) as HTMLElement | null;
}

function closeProfileMenu(): void {
    // Pre-1.3.5 builds close the menu on Escape. From 1.3.5 the menu is a React Aria
    // collection that ignores it, and only a second click on the avatar closes it.
    document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    setTimeout(() => {
        const profile = profileButton();
        if (profile?.getAttribute("aria-expanded") === "true") profile.click();
    }, 30);
}

function isProfileMenu(items: Element[]): boolean {
    // Locale-independent: the profile menu always contains the Profile link (href="/user/...").
    if (items.some((e) => (e.getAttribute("href") || "").startsWith("/user/"))) return true;
    // Fallback for markup changes: English label match.
    return items.some((e) => /private session|log out/i.test(e.textContent || ""));
}

function injectMenuItem(): void {
    const menus = document.querySelectorAll("ul[role=menu]");
    menus.forEach((menu) => {
        if (menu.querySelector(".meq-menu-item")) return;
        const items = [...menu.querySelectorAll("[role=menuitem], [role=menuitemcheckbox]")];
        if (!isProfileMenu(items)) return;
        const template = items.find((e) => !e.querySelector("svg")) || items[0];
        const li = template?.closest("li");
        if (!li) return;
        const clone = li.cloneNode(true) as HTMLElement;
        clone.classList.add("meq-menu-item");
        const btn = (clone.querySelector("[role=menuitem], [role=menuitemcheckbox]") || clone) as HTMLElement;
        btn.removeAttribute("href");
        btn.querySelectorAll("svg").forEach((s) => s.remove());
        const label = ([...btn.querySelectorAll("span, div")] as HTMLElement[])
            .find((e) => e.childElementCount === 0 && (e.textContent || "").trim()) || btn;
        label.textContent = "ModernEQ";
        const iconWrap = document.createElement("span");
        iconWrap.className = "meq-menu-icon";
        iconWrap.innerHTML = MENU_ICON;
        btn.style.display = "flex";
        btn.style.alignItems = "center";
        btn.insertBefore(iconWrap, btn.firstChild);
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeProfileMenu();
            setTimeout(openPanel, 80);
        };
        menu.insertBefore(clone, menu.firstChild);
    });
}

export function startMenuObserver(): void {
    const observer = new MutationObserver(() => {
        if (!document.querySelector("ul[role=menu]")) return;
        try {
            injectMenuItem();
        } catch (e) {
            console.warn("[ModernEQ] menu injection failed", e);
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
}
