import { useEffect, type ReactNode } from "react";
import { useRouter } from "@tanstack/react-router";
import { focusFirst, installSpatialNav } from "@/lib/spatial-nav";
import vaultEmblem from "@/assets/vault-emblem.webp.asset.json";
import brandLogo from "@/assets/og-streamz-brand.webp.asset.json";

export function TvShell({ children, onBack }: { children: ReactNode; onBack?: (() => void) | undefined }) {
  const router = useRouter();
  useEffect(() => {
    const off = installSpatialNav(() => {
      if (onBack) onBack();
      else if (window.history.length > 1) router.history.back();
    });
    const t = setTimeout(focusFirst, 120);
    return () => {
      off();
      clearTimeout(t);
    };
  }, [onBack, router]);
  return <div className="min-h-screen bg-background pb-24 text-foreground overflow-x-hidden sm:pb-0">{children}</div>;
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 sm:gap-3 ${className}`}>
      <img src={vaultEmblem.url} alt="0G Vault" width={80} height={80} decoding="async" className="h-16 w-16 shrink-0 object-contain sm:h-20 sm:w-20" />
      <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground sm:text-xs">by</span>
      <img src={brandLogo.url} alt="OGSTREAMZ" height={64} decoding="async" className="h-12 w-auto shrink-0 object-contain sm:h-16" />
    </div>
  );
}

export function TierBadge({ tier }: { tier: string }) {
  return tier === "vip" ? (
    <span className="rounded-md bg-vip px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-primary-foreground">VIP</span>
  ) : (
    <span className="rounded-md border border-glow/50 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-glow">Free</span>
  );
}

export function AppIcon({ title, url, className = "" }: { title: string; url: string | null; className?: string }) {
  if (url) return <img src={url} alt={title} className={`object-cover ${className}`} />;
  const initials = title.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className={`flex items-center justify-center font-display font-extrabold text-primary-foreground ${className}`} style={{ background: "var(--gradient-tile)" }}>
      {initials}
    </div>
  );
}
