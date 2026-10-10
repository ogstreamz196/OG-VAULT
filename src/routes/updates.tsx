import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { catalogQuery, type AppRow } from "@/lib/catalog";
import { installState, readLedger } from "@/lib/installed";
import { StoreGate } from "@/components/tv/StoreGate";
import { StoreHeader } from "@/components/tv/StoreHeader";
import { AppTile } from "@/components/tv/AppTile";

export const Route = createFileRoute("/updates")({
  head: () => ({
    meta: [
      { title: "Updates & installed apps — 0G VAULT" },
      { name: "description", content: "See which of your 0G VAULT apps have new versions ready to install." },
      { property: "og:title", content: "Updates — 0G VAULT" },
      { property: "og:description", content: "New versions of your installed apps, in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <StoreGate onBack={() => {}}><Updates /></StoreGate>,
});

function Updates() {
  const { data } = useQuery(catalogQuery);
  const [lists, setLists] = useState<{ updates: AppRow[]; installed: AppRow[] }>({ updates: [], installed: [] });
  useEffect(() => {
    if (!data) return;
    const ledger = readLedger();
    setLists({
      updates: data.apps.filter((a) => installState(a, ledger) === "update"),
      installed: data.apps.filter((a) => installState(a, ledger) === "installed"),
    });
  }, [data]);

  return (
    <div className="pb-20">
      <StoreHeader />
      <section className="mt-10 px-4 sm:px-14">
        <h1 className="text-3xl font-black text-glow">Updates available ({lists.updates.length})</h1>
        {lists.updates.length ? (
          <div className="mt-6 flex flex-wrap gap-6">{lists.updates.map((a) => <AppTile key={a.id} app={a} />)}</div>
        ) : (
          <p className="mt-4 text-xl text-muted-foreground">All your apps are up to date.</p>
        )}
      </section>
      <section className="mt-12 px-4 sm:px-14">
        <h2 className="text-2xl font-bold">Installed from 0G VAULT ({lists.installed.length})</h2>
        {lists.installed.length ? (
          <div className="mt-6 flex flex-wrap gap-6">{lists.installed.map((a) => <AppTile key={a.id} app={a} />)}</div>
        ) : (
          <p className="mt-4 text-lg text-muted-foreground">Nothing installed yet. <Link data-nav to="/" className="tv-focus rounded text-glow">Browse the store</Link></p>
        )}
      </section>
    </div>
  );
}
