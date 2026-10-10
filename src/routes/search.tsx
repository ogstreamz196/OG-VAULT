import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { catalogQuery } from "@/lib/catalog";
import { isCategoryLocked } from "@/lib/access";
import { useAuth } from "@/hooks/use-auth";
import { StoreGate } from "@/components/tv/StoreGate";
import { StoreHeader } from "@/components/tv/StoreHeader";
import { AppTile } from "@/components/tv/AppTile";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Search apps — 0G VAULT" },
      { name: "description", content: "Find any app in the 0G VAULT store with your remote." },
      { property: "og:title", content: "Search apps — 0G VAULT" },
      { property: "og:description", content: "Remote-friendly search across every 0G VAULT app." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <StoreGate onBack={() => {}}><Search /></StoreGate>,
});

const KEYS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("");

function Search() {
  const { isVip } = useAuth();
  const { data } = useQuery(catalogQuery);
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    if (!data) return [];
    const locked = new Set(data.categories.filter((c) => isCategoryLocked(c, isVip)).map((c) => c.id));
    const catName = new Map(data.categories.map((c) => [c.id, c.name.toLowerCase()]));
    const term = q.trim().toLowerCase();
    return data.apps.filter((a) => (!a.category_id || !locked.has(a.category_id)) && (!term ||
      a.title.toLowerCase().includes(term) || (a.package_name ?? "").toLowerCase().includes(term) || (a.category_id && catName.get(a.category_id)?.includes(term))));
  }, [data, q, isVip]);

  return (
    <div className="pb-20">
      <StoreHeader />
      <div className="px-4 sm:px-14 pt-8 space-y-6">
        <input data-nav value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search apps or categories…" className="tv-focus w-full rounded-2xl border border-border bg-card px-6 py-4 text-2xl" />
        <div className="hidden sm:grid grid-cols-12 gap-2 max-w-4xl">
          {KEYS.map((k) => (
            <button data-nav key={k} onClick={() => setQ((s) => s + k.toLowerCase())} className="tv-focus rounded-lg bg-secondary py-3 text-xl font-bold">{k}</button>
          ))}
          <button data-nav onClick={() => setQ((s) => s + " ")} className="tv-focus col-span-4 rounded-lg bg-secondary py-3 font-bold">Space</button>
          <button data-nav onClick={() => setQ((s) => s.slice(0, -1))} className="tv-focus col-span-4 rounded-lg bg-secondary py-3 font-bold">⌫ Delete</button>
          <button data-nav onClick={() => setQ("")} className="tv-focus col-span-4 rounded-lg bg-secondary py-3 font-bold">Clear</button>
        </div>
        <p className="text-muted-foreground">{results.length} app{results.length === 1 ? "" : "s"}</p>
        <div className="flex flex-wrap gap-6">{results.map((a) => <AppTile key={a.id} app={a} />)}</div>
      </div>
    </div>
  );
}
