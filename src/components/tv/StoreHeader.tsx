import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { LogOut, Crown } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { catalogQuery } from "@/lib/catalog";
import { useInstallStates } from "@/hooks/use-install-states";
import { Logo } from "./TvShell";
import { BroadcastBar } from "./BroadcastBar";
import { MobileDock } from "./MobileDock";
import { isNative } from "@/lib/native-install";

const pill = "tv-focus hidden rounded-xl px-5 py-2.5 font-semibold sm:inline-block";

export function StoreHeader() {
  const { username, isVip, isAdmin, level, signOut } = useAuth();
  const { data } = useQuery(catalogQuery);
  const stateOf = useInstallStates();
  const updates = (data?.apps ?? []).filter((a) => stateOf(a) === "update").length;
  const [web, setWeb] = useState(false);
  useEffect(() => setWeb(!isNative()), []);
  const role = isAdmin ? "BOSS" : isVip ? "VIP" : level === "guest" ? "GUEST" : "FREE";
  return (
    <>
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 pt-5 sm:flex sm:flex-wrap sm:justify-between sm:gap-4 sm:px-14 sm:pt-8">
        <Link to="/" data-nav className="tv-focus min-w-0 rounded-lg"><Logo /></Link>
        <nav className="flex shrink-0 items-center gap-2 sm:flex-wrap sm:gap-3">
          <Link data-nav to="/" className={`${pill} text-muted-foreground`} activeOptions={{ exact: true }} activeProps={{ className: "text-foreground" }}>Home</Link>
          <Link data-nav to="/search" className={`${pill} text-muted-foreground`} activeProps={{ className: "text-foreground" }}>🔍 Search</Link>
          <Link data-nav to="/updates" className={`${pill} ${updates ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Updates{updates ? ` (${updates})` : ""}</Link>
          <Link data-nav to="/tools" className={`${pill} text-muted-foreground`}>Tools</Link>
          <Link data-nav to="/category/$slug" params={{ slug: "og-vip-access" }} className="tv-focus flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-bold text-vip sm:px-5 sm:py-2.5 sm:text-base">
            <Crown className="h-4 w-4" /><span className="hidden sm:inline">OG VIP ACCESS</span><span className="sm:hidden">VIP</span>
          </Link>
          {isAdmin && web && (
            <Link data-nav to="/admin" className="tv-focus rounded-xl border border-glow/60 px-2.5 py-2 text-sm font-bold text-glow sm:px-5 sm:py-2.5 sm:text-base">Boss<span className="hidden sm:inline"> Control Panel</span></Link>
          )}
          <span title={username ?? ""} className={`hidden max-w-[14rem] truncate rounded-full px-4 py-1.5 text-sm font-bold sm:inline-block ${isVip ? "bg-vip text-primary-foreground" : "border border-glow/50 text-glow"}`}>
            {role}{username ? ` · ${username}` : ""}
          </span>
          <button data-nav aria-label="Sign out" onClick={() => signOut()} className="tv-focus flex items-center gap-2 rounded-xl bg-secondary px-2.5 py-2 text-sm font-semibold sm:px-5 sm:py-2.5 sm:text-base">
            <LogOut className="h-4 w-4" /><span className="hidden sm:inline">Sign out</span>
          </button>
        </nav>
      </header>
      <div className="mt-3 flex items-center gap-2 px-4 sm:hidden">
        <span className={`truncate rounded-full px-3 py-1 text-xs font-bold ${isVip ? "bg-vip text-primary-foreground" : "border border-glow/50 text-glow"}`}>{role}{username ? ` · ${username}` : ""}</span>
      </div>
      <div className="px-4 pt-4 sm:px-14"><BroadcastBar /></div>
      <MobileDock updates={updates} />
    </>
  );
}
