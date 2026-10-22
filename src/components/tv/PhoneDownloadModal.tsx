import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Smartphone } from "lucide-react";
import { createPhoneDownloadLink } from "@/lib/phone-link.functions";
import { encodeQr, qrSvgPath } from "@/lib/qr";

type Link = { url: string; expiresAt: number };

/** QR code that downloads this one app straight to the viewer's Android phone. */
export function PhoneDownloadModal({ appId, title, version, onClose }: { appId: string; title: string; version: string; onClose: () => void }) {
  const issue = useServerFn(createPhoneDownloadLink);
  const [link, setLink] = useState<Link | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  async function load() {
    setError(null);
    setLink(null);
    try {
      const r = await issue({ data: { appId } });
      if (!r.ok) return setError(r.error);
      setLink({ url: new URL(r.path, window.location.origin).toString(), expiresAt: r.expiresAt });
    } catch {
      setError("Couldn't create the download link. Check your connection and try again.");
    }
  }
  useEffect(() => { void load(); }, [appId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const qr = useMemo(() => {
    if (!link) return null;
    const modules = encodeQr(link.url);
    return { path: qrSvgPath(modules), size: modules.length + 8 };
  }, [link]);
  const secondsLeft = link ? Math.max(0, Math.round((link.expiresAt - now) / 1000)) : 0;
  const expired = !!link && secondsLeft === 0;

  return (
    <div data-nav-scope className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/95 p-4 sm:items-center sm:p-10">
      <div className="glass relative w-full max-w-xl overflow-hidden rounded-3xl border-glow/50 p-6 text-center sm:grid sm:max-w-3xl sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-8 sm:p-8 sm:text-left">
        <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full opacity-40 blur-3xl" style={{ background: "var(--glow)" }} />
        <button data-nav data-nav-dismiss onClick={onClose} aria-label="Close" className="tv-focus absolute right-4 top-4 z-10 rounded-xl bg-secondary px-4 py-2 text-sm font-semibold">Close ✕</button>

        <div className="relative sm:order-2">
          <div className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-glow/20 sm:mx-0"><Smartphone className="h-6 w-6 text-glow" /></div>
          <h2 className="relative mt-3 text-2xl font-extrabold tracking-tight sm:pr-24 sm:text-3xl">Download to your Android phone</h2>
          <p className="relative mt-1 text-lg font-semibold">{title} <span className="text-muted-foreground">v{version}</span></p>
          <ol className="relative mx-auto mt-3 max-w-md space-y-2 text-left text-base text-muted-foreground sm:mx-0">
            {["Open your phone's camera and point it at the code", "Tap the link that appears", "The download starts straight away — open it to install"].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-glow text-sm font-bold text-background">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          {(error || expired) && (
            <button data-nav data-nav-autofocus onClick={() => void load()} className="tv-focus relative mt-5 w-full rounded-xl bg-primary px-6 py-3 text-lg font-bold text-primary-foreground">
              {expired ? "Make a new code" : "Try again"}
            </button>
          )}
        </div>

        <div className="relative sm:order-1">
          <div className="relative mx-auto mt-6 flex aspect-square w-full max-w-[17rem] items-center justify-center rounded-3xl bg-white p-2 shadow-2xl sm:mt-0 sm:w-[min(16rem,46vh)]">
            {qr && !expired ? (
              <svg viewBox={`0 0 ${qr.size} ${qr.size}`} role="img" aria-label={`QR code to download ${title} to your phone`} className="h-full w-full" shapeRendering="crispEdges">
                <path d={qr.path} fill="#000" />
              </svg>
            ) : (
              <p className="px-6 text-center text-sm font-semibold text-neutral-700">{error ?? (expired ? "This code has expired" : "Creating a secure link…")}</p>
            )}
          </div>
          <p className="relative mt-3 text-center text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground">
            {link && !expired ? `Code works for ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}` : "Scan with your phone"}
          </p>
        </div>
      </div>
    </div>
  );
}
