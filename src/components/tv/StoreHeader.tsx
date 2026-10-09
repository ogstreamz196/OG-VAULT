import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Logo } from "./TvShell";

export function StoreHeader() {
  const { username, isVip, isAdmin, signOut } = useAuth();
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 px-14 pt-8">
      <Link to="/" data-nav className="tv-focus rounded-lg"><Logo /></Link>
      <nav className="flex flex-wrap items-center gap-3">
        <Link data-nav to="/" className="tv-focus rounded-xl px-5 py-2.5 font-semibold text-muted-foreground" activeOptions={{ exact: true }} activeProps={{ className: "text-foreground" }}>Home</Link>
        <Link data-nav to="/category/$slug" params={{ slug: "og-vip-access" }} className="tv-focus rounded-xl px-5 py-2.5 font-semibold text-vip">OG VIP ACCESS</Link>
        {isAdmin && (
          <Link data-nav to="/admin" className="tv-focus rounded-xl border border-glow/60 px-5 py-2.5 font-bold text-glow">Boss Control Panel</Link>
        )}
        <span className={`rounded-full px-4 py-1.5 text-sm font-bold ${isVip ? "bg-vip text-primary-foreground" : "border border-glow/50 text-glow"}`}>
          {isAdmin ? "BOSS" : isVip ? "VIP" : "MEMBER"}{username ? ` · ${username}` : ""}
        </span>
        <button data-nav onClick={() => signOut()} className="tv-focus rounded-xl bg-secondary px-5 py-2.5 font-semibold">Sign out</button>
      </nav>
    </header>
  );
}
