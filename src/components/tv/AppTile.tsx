import { useEffect, useState } from "react";
import { tierFromAudiences } from "@/lib/access";
import { Link } from "@tanstack/react-router";
import type { AppRow } from "@/lib/catalog";
import { installState, type InstallState } from "@/lib/installed";
import { AppIcon, TierBadge } from "./TvShell";

export function AppTile({ app }: { app: AppRow }) {
  const [state, setState] = useState<InstallState>("none");
  useEffect(() => setState(installState(app)), [app]);
  return (
    <Link data-nav to="/app/$id" params={{ id: app.id }} className="tv-focus glass relative w-40 sm:w-56 shrink-0 rounded-2xl p-4">
      {state !== "none" && (
        <span className={`absolute right-2 top-2 z-10 rounded-md px-2 py-0.5 text-xs font-extrabold ${state === "update" ? "bg-glow text-background" : "bg-secondary text-muted-foreground"}`}>
          {state === "update" ? "UPDATE" : "INSTALLED"}
        </span>
      )}
      <AppIcon title={app.title} url={app.icon_url} className="aspect-square w-full rounded-xl text-4xl" />
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="truncate text-lg font-semibold">{app.title}</span>
        <TierBadge tier={tierFromAudiences(app.audiences)} />
      </div>
      <span className="text-sm text-muted-foreground">v{app.version}</span>
    </Link>
  );
}
