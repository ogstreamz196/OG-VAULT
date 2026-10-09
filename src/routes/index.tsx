import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { catalogQuery, type AppRow } from "@/lib/catalog";
import { clearSession, getSession, type VaultSession } from "@/lib/vault-session";
import { AppIcon, Logo, TierBadge, TvShell } from "@/components/tv/TvShell";
import { LoginGate } from "@/components/tv/LoginGate";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OG VAULT — OGSTREAMZ App Store for Firestick" },
      { name: "description", content: "Browse and install OGSTREAMZ apps on your Firestick with a remote-friendly app store." },
      { property: "og:title", content: "OG VAULT — OGSTREAMZ App Store" },
      { property: "og:description", content: "The remote-friendly APK store for Firestick by OGSTREAMZ." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StoreHome,
});

function StoreHome() {
  const [session, setSess] = useState<VaultSession | null | undefined>(undefined);
  useEffect(() => setSess(getSession()), []);

  if (session === undefined) return <div className="min-h-screen bg-background" />;
  if (!session)
    return (
      <TvShell key="gate" onBack={() => {}}>
        <LoginGate onDone={setSess} />
      </TvShell>
    );
  return (
    <TvShell key="home" onBack={() => {}}>
      <Home session={session} onLogout={() => { clearSession(); setSess(null); }} />
    </TvShell>
  );
}

function Home({ session, onLogout }: { session: VaultSession; onLogout: () => void }) {
  const { data, isLoading, error } = useQuery(catalogQuery);
  const featured = useMemo(() => data?.apps.filter((a) => a.is_featured) ?? [], [data]);
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    if (featured.length < 2) return;
    const t = setInterval(() => setSlide((s) => (s + 1) % featured.length), 7000);
    return () => clearInterval(t);
  }, [featured.length]);
  const hero = featured[slide % Math.max(featured.length, 1)];

  return (
    <div className="pb-20">
      <header className="flex items-center justify-between px-14 pt-8">
        <Logo />
        <div className="flex items-center gap-4">
          <span className={`rounded-full px-4 py-1.5 text-sm font-bold ${session.kind === "vip" ? "bg-vip text-primary-foreground" : "border border-glow/50 text-glow"}`}>
            {session.kind === "vip" ? "VIP ACCESS" : "FREE TIER"}
          </span>
          <button data-nav onClick={onLogout} className="tv-focus rounded-xl bg-secondary px-5 py-2.5 font-semibold text-secondary-foreground">Sign out</button>
        </div>
      </header>

      {isLoading && <p className="px-14 pt-20 text-2xl text-muted-foreground">Loading the vault…</p>}
      {error && <p className="px-14 pt-20 text-2xl text-vip">Couldn't load apps. Check your connection.</p>}

      {hero && (
        <section className="relative mx-14 mt-8 h-[420px] overflow-hidden rounded-3xl glass">
          {hero.banner_url ? (
            <img src={hero.banner_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 75% 40%, color-mix(in oklab, var(--glow) 40%, transparent), transparent 50%), linear-gradient(120deg, var(--card), var(--primary))" }} />
          )}
          <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
          <div className="relative flex h-full max-w-2xl flex-col justify-center gap-4 p-12">
            <div className="flex items-center gap-3"><span className="text-sm uppercase tracking-[0.3em] text-glow">Featured</span><TierBadge tier={hero.tier} /></div>
            <h1 className="text-6xl font-extrabold leading-tight">{hero.title}</h1>
            <p className="line-clamp-3 text-xl text-muted-foreground">{hero.description}</p>
            <div className="flex gap-4 pt-2">
              <Link data-nav data-nav-autofocus to="/app/$id" params={{ id: hero.id }} className="tv-focus rounded-xl bg-primary px-8 py-4 text-lg font-bold text-primary-foreground">View & Install</Link>
              {featured.length > 1 && (
                <button data-nav onClick={() => setSlide((s) => (s + 1) % featured.length)} className="tv-focus rounded-xl bg-secondary px-6 py-4 text-lg font-semibold">Next ›</button>
              )}
            </div>
          </div>
          {featured.length > 1 && (
            <div className="absolute bottom-6 right-8 flex gap-2">
              {featured.map((f, i) => <span key={f.id} className={`h-2 rounded-full transition-all ${i === slide % featured.length ? "w-8 bg-glow" : "w-2 bg-muted-foreground/50"}`} />)}
            </div>
          )}
        </section>
      )}

      {data && (
        <>
          <Row title="Recently Added" apps={data.apps.slice(0, 10)} />
          {data.categories.map((c) => {
            const apps = data.apps.filter((a) => a.category_id === c.id);
            return apps.length ? <Row key={c.id} title={c.name} apps={apps} /> : null;
          })}
          {data.apps.length === 0 && <p className="px-14 pt-16 text-2xl text-muted-foreground">No apps yet. Check back soon.</p>}
        </>
      )}
    </div>
  );
}

function Row({ title, apps }: { title: string; apps: AppRow[] }) {
  return (
    <section className="mt-12">
      <h2 className="px-14 text-2xl font-bold">{title}</h2>
      <div className="no-scrollbar flex gap-6 overflow-x-auto px-14 py-6">
        {apps.map((a) => (
          <Link key={a.id} data-nav to="/app/$id" params={{ id: a.id }} className="tv-focus glass group w-56 shrink-0 rounded-2xl p-4">
            <AppIcon title={a.title} url={a.icon_url} className="aspect-square w-full rounded-xl text-4xl" />
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="truncate text-lg font-semibold">{a.title}</span>
              <TierBadge tier={a.tier} />
            </div>
            <span className="text-sm text-muted-foreground">v{a.version}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
