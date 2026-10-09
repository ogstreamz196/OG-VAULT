import { useEffect, type ReactNode } from "react";
import { useRouter } from "@tanstack/react-router";
import { focusFirst, installSpatialNav } from "@/lib/spatial-nav";

export function TvShell({ children, onBack }: { children: ReactNode; onBack?: () => void }) {
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
  return <div className="min-h-screen bg-background text-foreground overflow-x-hidden">{children}</div>;
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-baseline gap-2 font-display ${className}`}>
      <span className="text-3xl font-extrabold tracking-tight text-foreground">
        OG<span className="text-glow">VAULT</span>
      </span>
      <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">by OGSTREAMZ</span>
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
