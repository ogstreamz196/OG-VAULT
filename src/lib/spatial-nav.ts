// D-pad / remote spatial navigation. Any element with [data-nav] is a focus target.
// A [data-nav-scope] element (a modal) traps navigation while it is on screen.
export type Dir = "up" | "down" | "left" | "right";

const KEY_DIR: Record<string, Dir> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

type Rect = { x: number; y: number; w: number; h: number };

/**
 * Pick the best candidate in a direction. Pure for testability.
 * Up/down moves to the nearest row first, then the closest item in it, so a wide banner or
 * the header is never skipped. Left/right stays on the current row while it has items.
 */
export function pickNext(from: Rect, candidates: Rect[], dir: Dir): number {
  const cx = from.x + from.w / 2;
  const cy = from.y + from.h / 2;
  const vertical = dir === "up" || dir === "down";
  const ahead: { i: number; gap: number; primary: number; secondary: number; overlaps: boolean }[] = [];
  candidates.forEach((r, i) => {
    const dx = r.x + r.w / 2 - cx;
    const dy = r.y + r.h / 2 - cy;
    let gap: number, primary: number;
    if (dir === "right") { if (r.x < from.x + from.w - 2 || dx <= 0) return; gap = r.x - (from.x + from.w); primary = dx; }
    else if (dir === "left") { if (r.x + r.w > from.x + 2 || dx >= 0) return; gap = from.x - (r.x + r.w); primary = -dx; }
    else if (dir === "down") { if (r.y < from.y + from.h - 2 || dy <= 0) return; gap = r.y - (from.y + from.h); primary = dy; }
    else { if (r.y + r.h > from.y + 2 || dy >= 0) return; gap = from.y - (r.y + r.h); primary = -dy; }
    const overlaps = vertical
      ? r.x < from.x + from.w && r.x + r.w > from.x
      : r.y < from.y + from.h && r.y + r.h > from.y;
    ahead.push({ i, gap: Math.max(0, gap), primary, secondary: Math.abs(vertical ? dx : dy), overlaps });
  });
  if (!ahead.length) return -1;

  let pool = ahead;
  if (vertical) {
    const nearest = Math.min(...ahead.map((c) => c.gap));
    const band = Math.max(16, from.h * 0.6);
    pool = ahead.filter((c) => c.gap <= nearest + band);
  } else if (ahead.some((c) => c.overlaps)) {
    pool = ahead.filter((c) => c.overlaps);
  }
  let best = pool[0]!;
  for (const c of pool) {
    const score = vertical ? c.secondary + c.gap * 0.5 : c.primary + c.secondary * 2.5;
    const bestScore = vertical ? best.secondary + best.gap * 0.5 : best.primary + best.secondary * 2.5;
    if (score < bestScore) best = c;
  }
  return best.i;
}

/** The innermost open modal, else the whole page. */
function currentScope(): HTMLElement {
  const scopes = document.querySelectorAll<HTMLElement>("[data-nav-scope]");
  return scopes[scopes.length - 1] ?? document.body;
}

function targets(scope = currentScope()): HTMLElement[] {
  return Array.from(scope.querySelectorAll<HTMLElement>("[data-nav]")).filter(
    (el) => !el.hasAttribute("disabled") && el.getClientRects().length > 0,
  );
}

function toRect(el: HTMLElement): Rect {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
}

/** Stable identity for an element across re-renders, used to restore focus on Back. */
function navKey(el: Element): string | null {
  return el.getAttribute("data-nav-id") ?? el.getAttribute("href");
}

const MEMORY_KEY = "ogvault.nav-focus";
function readMemory(): Record<string, string> {
  try { return JSON.parse(sessionStorage.getItem(MEMORY_KEY) ?? "{}"); } catch { return {}; }
}
function remember(el: Element) {
  const key = navKey(el);
  if (!key) return;
  try { sessionStorage.setItem(MEMORY_KEY, JSON.stringify({ ...readMemory(), [location.pathname]: key })); } catch { /* storage blocked */ }
}

/** Centre the element inside its horizontally scrolling row, if it sits in one. */
function centerInRow(el: HTMLElement, behavior: ScrollBehavior) {
  for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
    const ox = getComputedStyle(a).overflowX;
    if ((ox === "auto" || ox === "scroll") && a.scrollWidth > a.clientWidth) {
      const ar = a.getBoundingClientRect();
      const er = el.getBoundingClientRect();
      a.scrollBy({ left: er.left + er.width / 2 - (ar.left + ar.width / 2), behavior });
      return;
    }
  }
}

function reveal(el: HTMLElement, smooth: boolean) {
  const behavior: ScrollBehavior = smooth ? "smooth" : "auto";
  const r = el.getBoundingClientRect();
  // Anything that fits on the first screen keeps the page at the top, so the header stays in view.
  if (!el.closest("[data-nav-scope]") && r.bottom + window.scrollY <= window.innerHeight - 16) {
    window.scrollTo({ top: 0, behavior });
    centerInRow(el, behavior);
    return;
  }
  el.scrollIntoView({ block: "center", inline: "center", behavior });
}

function focusEl(el: HTMLElement, smooth = false) {
  el.focus({ preventScroll: true });
  reveal(el, smooth);
}

/** Initial focus inside the current scope: last-remembered element, then autofocus, then first. */
function pickInitial(useMemory: boolean): HTMLElement | undefined {
  const list = targets();
  if (useMemory && currentScope() === document.body) {
    const key = readMemory()[location.pathname];
    const hit = key ? list.find((el) => navKey(el) === key) : undefined;
    if (hit) return hit;
  }
  return list.find((el) => el.hasAttribute("data-nav-autofocus")) ?? list[0];
}

export function focusFirst() {
  const el = pickInitial(false);
  if (el) focusEl(el);
}

/** Back handler: return false when there is nowhere to go back to (the native app then exits). */
export type BackHandler = () => boolean | void;

declare global {
  interface Window { __ogVaultBack?: () => "handled" | "exit" }
}

export function installSpatialNav(onBack: BackHandler): () => void {
  let touched = false; // the user has moved focus themselves; stop auto-placing it
  let returnTo: HTMLElement | null = null; // focus to restore when a modal closes
  let scope = currentScope();

  const placeInitial = () => {
    if (touched) return;
    const active = document.activeElement as HTMLElement | null;
    const list = targets();
    const el = pickInitial(true);
    if (!el) return;
    // Keep moving focus as content streams in until a real target (memory/autofocus) lands.
    const settled = active && list.includes(active) && (navKey(active) === readMemory()[location.pathname] || active.hasAttribute("data-nav-autofocus"));
    if (!settled && el !== active) focusEl(el);
  };

  const back = (): "handled" | "exit" => (onBack() === false ? "exit" : "handled");

  const handler = (e: KeyboardEvent) => {
    const active = document.activeElement as HTMLElement | null;
    const isField = !!active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA");

    if (e.key === "Escape" || e.key === "GoBack" || e.key === "BrowserBack" || (e.key === "Backspace" && !isField)) {
      e.preventDefault();
      touched = true;
      back();
      return;
    }
    const dir = KEY_DIR[e.key];
    if (!dir) return;
    if (isField && (dir === "left" || dir === "right")) return;

    touched = true;
    const list = targets();
    if (!active || !list.includes(active)) {
      e.preventDefault();
      focusFirst();
      return;
    }
    e.preventDefault();
    const others = list.filter((el) => el !== active);
    const idx = pickNext(toRect(active), others.map(toRect), dir);
    if (idx >= 0) focusEl(others[idx]!, !e.repeat);
  };

  const onFocus = (e: FocusEvent) => {
    const el = e.target as HTMLElement;
    if (touched && el?.hasAttribute?.("data-nav") && !el.closest("[data-nav-scope]")) remember(el);
  };

  // Modals opening/closing and catalog data arriving both show up as DOM changes.
  const observer = new MutationObserver(() => {
    const next = currentScope();
    if (next !== scope) {
      const opened = next !== document.body && (scope === document.body || !next.contains(scope));
      if (opened) {
        returnTo = document.activeElement as HTMLElement | null;
        scope = next;
        focusFirst();
      } else {
        scope = next;
        if (returnTo?.isConnected && targets().includes(returnTo)) focusEl(returnTo);
        else focusFirst();
        returnTo = null;
      }
      return;
    }
    // Focus fell off (e.g. the button became disabled or unmounted): put it back somewhere sensible.
    const active = document.activeElement;
    if (touched && (!active || active === document.body)) focusFirst();
    else placeInitial();
  });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["disabled"] });
  const onPointer = () => { touched = true; };
  const stopAuto = setTimeout(() => { touched = true; }, 5000);
  const first = setTimeout(placeInitial, 60);

  window.__ogVaultBack = back;
  window.addEventListener("keydown", handler);
  window.addEventListener("pointerdown", onPointer);
  document.addEventListener("focusin", onFocus);
  return () => {
    observer.disconnect();
    window.removeEventListener("pointerdown", onPointer);
    clearTimeout(stopAuto);
    clearTimeout(first);
    if (window.__ogVaultBack === back) delete window.__ogVaultBack;
    window.removeEventListener("keydown", handler);
    document.removeEventListener("focusin", onFocus);
  };
}
