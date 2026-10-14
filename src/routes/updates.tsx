import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { catalogQuery } from "@/lib/catalog";
import { useInstallStates } from "@/hooks/use-install-states";
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
  component: () => <StoreGate><Updates /></StoreGate>,
});

function Updates() {
  const { data } = useQuery(catalogQuery);
  const stateOf = useInstallStates();
  const apps = data?.apps ?? [];
  const lists = {
    updates: apps.filter((a) => stateOf(a) === "update"),
    installed: apps.filter((a) => stateOf(a) === "installed"),
  };

  return (
    <div className="pb-20">
      <StoreHeader />
      <section className="mt-10 px-4 sm:px-14">
        <h1 className="text-3xl font-black text-glow">Updates available ({lists.updates.length})</h1>
        {lists.updates.length ? (
          <div className="mt-6 flex flex-wrap gap-6">{lists.updates.map((a, i) => <AppTile key={a.id} app={a} autoFocus={i === 0} />)}</div>
        ) : (
          <p className="mt-4 text-xl text-muted-foreground">All your apps are up to date.</p>
        )}
      </section>
      <section className="mt-12 px-4 sm:px-14">
        <h2 className="text-2xl font-bold">Installed from 0G VAULT ({lists.installed.length})</h2>
        {lists.installed.length ? (
          <div className="mt-6 flex flex-wrap gap-6">{lists.installed.map((a, i) => <AppTile key={a.id} app={a} autoFocus={i === 0 && !lists.updates.length} />)}</div>
        ) : (
          <p className="mt-4 text-lg text-muted-foreground">Nothing installed yet. <Link data-nav data-nav-autofocus={!lists.updates.length || undefined} to="/" className="tv-focus rounded text-glow">Browse the store</Link></p>
        )}
      </section>
    </div>
  );
}
