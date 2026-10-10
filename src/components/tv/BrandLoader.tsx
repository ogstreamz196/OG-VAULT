import brand from "@/assets/og-streamz-brand.webp.asset.json";

/** Full-screen OG-STREAMZ splash used wherever the app is waiting. Lightweight: one 55KB image + CSS pulse. */
export function BrandLoader({ label = "Opening the vault…" }: { label?: string }) {
  return (
    <div role="status" aria-label={label} className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6">
      <div className="relative w-full max-w-[min(80vw,28rem)]">
        <div className="animate-portal-pulse absolute -inset-4 rounded-[2rem] opacity-60 blur-2xl" style={{ background: "radial-gradient(circle, color-mix(in oklab, var(--glow) 45%, transparent), transparent 70%)" }} />
        <img src={brand.url} alt="OG-STREAMZ" width={640} height={418} decoding="async" fetchPriority="high" className="relative w-full rounded-2xl" />
      </div>
      <div className="h-1 w-40 overflow-hidden rounded-full bg-muted"><div className="skeleton h-full w-full" /></div>
      <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">{label}</p>
    </div>
  );
}
