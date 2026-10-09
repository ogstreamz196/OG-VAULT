// D-pad / remote spatial navigation. Any element with [data-nav] is a focus target.
export type Dir = "up" | "down" | "left" | "right";

const KEY_DIR: Record<string, Dir> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

type Rect = { x: number; y: number; w: number; h: number };

/** Pick the best candidate in a direction. Pure for testability. */
export function pickNext(from: Rect, candidates: Rect[], dir: Dir): number {
  const cx = from.x + from.w / 2;
  const cy = from.y + from.h / 2;
  let best = -1;
  let bestScore = Infinity;
  candidates.forEach((r, i) => {
    const x = r.x + r.w / 2;
    const y = r.y + r.h / 2;
    const dx = x - cx;
    const dy = y - cy;
    let primary: number, secondary: number;
    if (dir === "right") { if (r.x < from.x + from.w - 2 || dx <= 0) return; primary = dx; secondary = Math.abs(dy); }
    else if (dir === "left") { if (r.x + r.w > from.x + 2 || dx >= 0) return; primary = -dx; secondary = Math.abs(dy); }
    else if (dir === "down") { if (r.y < from.y + from.h - 2 || dy <= 0) return; primary = dy; secondary = Math.abs(dx); }
    else { if (r.y + r.h > from.y + 2 || dy >= 0) return; primary = -dy; secondary = Math.abs(dx); }
    const score = primary + secondary * 2.5;
    if (score < bestScore) { bestScore = score; best = i; }
  });
  return best;
}

function targets(): HTMLElement[] {
  const scope = document.querySelector<HTMLElement>("[data-nav-scope]:last-of-type") ?? document.body;
  return Array.from(scope.querySelectorAll<HTMLElement>("[data-nav]")).filter(
    (el) => !el.hasAttribute("disabled") && el.offsetParent !== null,
  );
}

function toRect(el: HTMLElement): Rect {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
}

export function focusFirst() {
  const el = document.querySelector<HTMLElement>("[data-nav-autofocus]") ?? targets()[0];
  el?.focus({ preventScroll: false });
}

export function installSpatialNav(onBack: () => void): () => void {
  const handler = (e: KeyboardEvent) => {
    const active = document.activeElement as HTMLElement | null;
    const isField = !!active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA");

    if (e.key === "Escape" || e.key === "GoBack" || e.key === "BrowserBack" || (e.key === "Backspace" && !isField)) {
      e.preventDefault();
      onBack();
      return;
    }
    const dir = KEY_DIR[e.key];
    if (!dir) return;
    if (isField && (dir === "left" || dir === "right")) return;

    const list = targets();
    if (!active || !list.includes(active)) {
      e.preventDefault();
      focusFirst();
      return;
    }
    const others = list.filter((el) => el !== active);
    const idx = pickNext(toRect(active), others.map(toRect), dir);
    if (idx >= 0) {
      e.preventDefault();
      const next = others[idx]!;
      next.focus({ preventScroll: true });
      next.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
    }
  };
  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}
