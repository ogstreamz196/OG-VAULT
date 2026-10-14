import { useEffect, useState } from "react";
import { canDownloadApp as canSeeApp, tierFromAudiences } from "@/lib/access";
import { useAuth } from "@/hooks/use-auth";
import { Lock } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { AppRow } from "@/lib/catalog";
import { installState, type InstallState } from "@/lib/installed";
import { AppIcon, TierBadge } from "./TvShell";

export function AppTile({ app, autoFocus = false }: { app: AppRow; autoFocus?: boolean }) {
  const [state, setState] = useState<InstallState>("none");
  useEffect(() => setState(installState(app)), [app]);
  const { level } = useAuth();
  const locked = !canSeeApp(level, app.audiences);
  const cat = (app as { categories?: { name: string } | null }).categories?.name;
  return (
    <Link data-nav data-nav-autofocus={autoFocus || undefined} to="/app/$id" params={{ id: app.id }} className="tv-focus glass group relative w-36 shrink-0 overflow-hidden rounded-2xl p-3 sm:w-56 sm:p-4">
      <div aria-hidden className="pointer-events-none absolute -top-10 left-1/2 h-24 w-32 -translate-x-1/2 rounded-full opacity-40 blur-2xl transition-opacity group-focus:opacity-90" style={{ background: "var(--glow)" }} />
      {state !== "none" && (
        <span className={`absolute right-2 top-2 z-10 rounded-md px-2 py-0.5 text-[10px] font-extrabold sm:text-xs ${state === "update" ? "animate-pulse bg-glow text-background" : "bg-secondary text-muted-foreground"}`}>
          {state === "update" ? "UPDATE" : "INSTALLED"}
        </span>
      )}
      <div className="relative">
        <AppIcon title={app.title} url={app.icon_url} className={`relative aspect-square w-full rounded-xl text-4xl shadow-lg ${locked ? "opacity-60" : ""}`} />
        {locked && (
          <span className="absolute inset-x-2 bottom-2 flex items-center justify-center gap-1.5 rounded-lg bg-vip/90 py-1 text-xs font-extrabold text-primary-foreground sm:text-sm"><Lock className="h-3.5 w-3.5" />VIP ONLY</span>
        )}
      </div>
      <div className="relative mt-3 flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-base font-semibold sm:text-lg">{app.title}</span>
        <TierBadge tier={tierFromAudiences(app.audiences)} />
      </div>
      <div className="relative mt-1 flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
        <span className="rounded bg-secondary px-1.5 py-0.5">v{app.version}</span>
        {cat && <span className="truncate">{cat}</span>}
        {app.file_size && <span className="ml-auto hidden shrink-0 sm:inline">{app.file_size}</span>}
      </div>
    </Link>
  );
}

export function TileSkeleton() {
  return (
    <div className="glass w-36 shrink-0 rounded-2xl p-3 sm:w-56 sm:p-4">
      <div className="skeleton aspect-square w-full rounded-xl" />
      <div className="skeleton mt-3 h-4 w-3/4 rounded" />
      <div className="skeleton mt-2 h-3 w-1/3 rounded" />
    </div>
  );
}
