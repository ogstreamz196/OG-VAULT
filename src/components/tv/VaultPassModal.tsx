import { Lock } from "lucide-react";
import { VIP_STORE_URL } from "./VipLock";

export function VaultPassModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div data-nav-scope className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/95 p-4 sm:items-center sm:p-10">
      <div className="glass relative w-full max-w-xl overflow-hidden rounded-3xl border-vip/50 p-6 text-center sm:p-10">
        <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full opacity-40 blur-3xl" style={{ background: "var(--vip)" }} />
        <button data-nav onClick={onClose} aria-label="Close" className="tv-focus absolute right-4 top-4 rounded-xl bg-secondary px-4 py-2 text-sm font-semibold">Close ✕</button>
        <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-vip/20">
          <Lock className="h-8 w-8 text-vip" />
        </div>
        <h2 className="relative mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">UNLOCK VIP ACCESS</h2>
        <p className="relative mt-2 text-base text-muted-foreground sm:text-lg">
          Scan this code with your phone camera to open <span className="font-bold text-foreground">ogbot.co.uk</span>, buy the Vault Pass from the store, then sign in here to unlock every VIP app.
        </p>
        <div className="relative mx-auto mt-6 w-full max-w-[17rem] rounded-3xl p-4 shadow-2xl" style={{ background: "#FFFFFF" }}>
          <img src="/vault-pass-qr.png" alt="Scan to open ogbot.co.uk" className="h-auto w-full" />
        </div>
        <p className="relative mt-4 text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground">Scan with your phone</p>
        <p className="relative mt-2 break-all text-lg font-bold text-glow">{VIP_STORE_URL.replace("https://", "")}</p>
        <a data-nav data-nav-autofocus href={VIP_STORE_URL} target="_blank" rel="noopener noreferrer" className="tv-focus relative mt-6 inline-block w-full rounded-xl bg-vip px-6 py-4 text-lg font-bold text-primary-foreground">
          Open ogbot.co.uk on this device
        </a>
      </div>
    </div>
  );
}
