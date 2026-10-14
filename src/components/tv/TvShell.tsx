import { useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "@tanstack/react-router";
import { installSpatialNav, type BackHandler } from "@/lib/spatial-nav";
import brandLogo from "@/assets/og-streamz-brand.webp.asset.json";

/**
 * Wraps every store screen with remote navigation. Back runs `onBack` when given; otherwise it
 * steps back through the store and returns to Home, and returns false on Home so the native
 * app exits (Fire TV convention).
 */
export function TvShell({ children, onBack }: { children: ReactNode; onBack?: BackHandler | undefined }) {
  const router = useRouter();
  // Install once per screen; a fresh onBack each render must not reset focus handling.
  const backRef = useRef(onBack);
  backRef.current = onBack;
  useEffect(() => {
    return installSpatialNav(() => {
      if (backRef.current) return backRef.current();
      if (window.location.pathname === "/") return false;
      if (router.history.canGoBack()) router.history.back();
      else router.navigate({ to: "/" });
    });
  }, [router]);
  return <div className="min-h-screen bg-background pb-24 text-foreground overflow-x-hidden sm:pb-0">{children}</div>;
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 sm:gap-3 ${className}`}>
      <img src="/og-vault-logo.webp" alt="0G Vault" width={80} height={80} decoding="async" className="h-16 w-16 shrink-0 rounded-xl object-cover sm:h-20 sm:w-20" />
      <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground sm:text-xs">by</span>
      <img src={brandLogo.url} alt="OGSTREAMZ" height={80} decoding="async" className="h-16 w-auto max-w-[60vw] shrink-0 object-contain sm:h-20" />
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
