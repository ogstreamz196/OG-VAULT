import { Link } from "@tanstack/react-router";
import type { AppRow } from "@/lib/catalog";
import { AppIcon, TierBadge } from "./TvShell";

export function AppTile({ app }: { app: AppRow }) {
  return (
    <Link data-nav to="/app/$id" params={{ id: app.id }} className="tv-focus glass w-40 sm:w-56 shrink-0 rounded-2xl p-4">
      <AppIcon title={app.title} url={app.icon_url} className="aspect-square w-full rounded-xl text-4xl" />
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="truncate text-lg font-semibold">{app.title}</span>
        <TierBadge tier={app.tier} />
      </div>
      <span className="text-sm text-muted-foreground">v{app.version}</span>
    </Link>
  );
}
