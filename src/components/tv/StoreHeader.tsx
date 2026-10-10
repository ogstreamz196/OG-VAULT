import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { catalogQuery } from "@/lib/catalog";
import { installState, readLedger } from "@/lib/installed";
import { Logo } from "./TvShell";

const pill = "tv-focus rounded-xl px-3 py-2 text-sm sm:px-5 sm:py-2.5 sm:text-base font-semibold";

export function StoreHeader() {
  const { username, isVip, isAdmin, level, signOut } = useAuth();
  const { data } = useQuery(catalogQuery);
  const [updates, setUpdates] = useState(0);
  useEffect(() => {
    if (!data) return;
    const l = readLedger();
    setUpdates(data.apps.filter((a) => installState(a, l) === "update").length);
  }, [data]);
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 px-4 sm:px-14 pt-8">
      <Link to="/" data-nav className="tv-focus rounded-lg"><Logo /></Link>
      <nav className="flex flex-wrap items-center gap-3">
        <Link data-nav to="/" className="tv-focus hidden rounded-xl px-5 py-2.5 font-semibold text-muted-foreground sm:inline-block" activeOptions={{ exact: true }} activeProps={{ className: "text-foreground" }}>Home</Link>
        <Link data-nav to="/search" className={`${pill} text-muted-foreground`} activeProps={{ className: "text-foreground" }}>🔍 Search</Link>
        <Link data-nav to="/updates" className={`${pill} ${updates ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Updates{updates ? ` (${updates})` : ""}</Link>
        <Link data-nav to="/category/$slug" params={{ slug: "og-vip-access" }} className={`${pill} text-vip`}>OG VIP ACCESS</Link>
        <Link data-nav to="/tools" className={`${pill} text-muted-foreground`}>Tools</Link>
        {isAdmin && (
          <Link data-nav to="/admin" className="tv-focus rounded-xl border border-glow/60 px-3 py-2 text-sm sm:px-5 sm:py-2.5 sm:text-base font-bold text-glow">Boss Control Panel</Link>
        )}
        <span className={`rounded-full px-4 py-1.5 text-sm font-bold ${isVip ? "bg-vip text-primary-foreground" : "border border-glow/50 text-glow"}`}>
          {isAdmin ? "BOSS" : isVip ? "VIP" : level === "guest" ? "GUEST" : "FREE"}{username ? ` · ${username}` : ""}
        </span>
        <button data-nav onClick={() => signOut()} className="tv-focus rounded-xl bg-secondary px-3 py-2 text-sm sm:px-5 sm:py-2.5 sm:text-base font-semibold">Sign out</button>
      </nav>
    </header>
  );
}
