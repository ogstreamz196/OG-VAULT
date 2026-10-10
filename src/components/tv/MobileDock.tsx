import { Link } from "@tanstack/react-router";
import { Home, Search, RefreshCw, Wrench } from "lucide-react";

const item = "relative flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-semibold text-muted-foreground";
const active = { className: "text-glow" };

export function MobileDock({ updates }: { updates: number }) {
  return (
    <nav className="dock fixed inset-x-3 bottom-3 z-40 flex rounded-2xl px-2 sm:hidden" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0px)" }}>
      <Link to="/" className={item} activeOptions={{ exact: true }} activeProps={active}><Home className="h-5 w-5" />Store</Link>
      <Link to="/search" className={item} activeProps={active}><Search className="h-5 w-5" />Search</Link>
      <Link to="/updates" className={item} activeProps={active}>
        <RefreshCw className="h-5 w-5" />Updates
        {updates > 0 && <span className="absolute right-[22%] top-1 rounded-full bg-vip px-1.5 text-[10px] font-bold text-primary-foreground">{updates}</span>}
      </Link>
      <Link to="/tools" className={item} activeProps={active}><Wrench className="h-5 w-5" />Tools</Link>
    </nav>
  );
}
