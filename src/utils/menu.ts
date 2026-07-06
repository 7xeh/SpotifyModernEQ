import { MENU_ICON } from "./icons";
import { openPanel } from "./panel";

function injectMenuItem(): void {
    const menus = document.querySelectorAll("ul[role=menu]");
    menus.forEach((menu) => {
        if (menu.querySelector(".meq-menu-item")) return;
        const items = [...menu.querySelectorAll("[role=menuitem], [role=menuitemcheckbox]")];
        const isProfileMenu = items.some((e) => /private session|log out/i.test(e.textContent || ""));
        if (!isProfileMenu) return;
        const template = items.find((e) => !e.querySelector("svg")) || items[0];
        const li = template?.closest("li");
        if (!li) return;
        const clone = li.cloneNode(true) as HTMLElement;
        clone.classList.add("meq-menu-item");
        const btn = (clone.querySelector("[role=menuitem], [role=menuitemcheckbox]") || clone) as HTMLElement;
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
            document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
            setTimeout(openPanel, 60);
        };
        menu.insertBefore(clone, menu.firstChild);
    });
}

export function startMenuObserver(): void {
    new MutationObserver(injectMenuItem).observe(document.body, { childList: true, subtree: true });
}
