import { tierFromAudiences } from "@/lib/access";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { catalogQuery, type AppRow, type CategoryRow } from "@/lib/catalog";
import { appsForCategory } from "@/lib/access";
import { TierBadge } from "@/components/tv/TvShell";
import { StoreGate } from "@/components/tv/StoreGate";
import { StoreHeader } from "@/components/tv/StoreHeader";
import { AppTile, TileSkeleton } from "@/components/tv/AppTile";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "0G VAULT — OGSTREAMZ App Store for Firestick" },
      { name: "description", content: "Browse and install OGSTREAMZ apps on your Firestick with a remote-friendly app store." },
      { property: "og:title", content: "0G VAULT — OGSTREAMZ App Store" },
      { property: "og:description", content: "The remote-friendly APK store for Firestick by OGSTREAMZ." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <StoreGate>
      <Home />
    </StoreGate>
  ),
});

function Home() {
  const { data, isLoading, error } = useQuery(catalogQuery);
  const visible = useMemo(() => data?.apps ?? [], [data]);
  const featured = visible.filter((a) => a.is_featured);
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    if (featured.length < 2) return;
    const t = setInterval(() => setSlide((s) => (s + 1) % featured.length), 7000);
    return () => clearInterval(t);
  }, [featured.length]);
  const hero = featured[slide % Math.max(featured.length, 1)];

  return (
    <div className="pb-20">
      <StoreHeader />
      {isLoading && (
        <div aria-label="Loading the vault">
          <div className="skeleton mx-4 mt-8 h-[18.75rem] rounded-3xl sm:mx-14 sm:h-[min(26.25rem,50vh)]" />
          {[0, 1].map((r) => (
            <section key={r} className="mt-12">
              <div className="skeleton mx-4 h-6 w-48 rounded sm:mx-14" />
              <div className="no-scrollbar flex gap-4 overflow-hidden px-4 py-6 sm:gap-6 sm:px-14">{Array.from({ length: 6 }, (_, i) => <TileSkeleton key={i} />)}</div>
            </section>
          ))}
        </div>
      )}
      {error && <p className="px-4 sm:px-14 pt-20 text-2xl text-vip">Couldn't load apps. Check your connection.</p>}

      {hero && (
        <section className="glass relative mx-4 mt-8 flex min-h-[21.25rem] overflow-hidden rounded-3xl sm:mx-14 sm:min-h-[min(26.25rem,50vh)]">
          {hero.banner_url ? (
            <img src={hero.banner_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 75% 40%, color-mix(in oklab, var(--glow) 40%, transparent), transparent 50%), linear-gradient(120deg, var(--card), var(--primary))" }} />
          )}
          <div aria-hidden className="animate-ambient pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full opacity-60 blur-3xl" style={{ background: "var(--glow)" }} />
          <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
          <div className="relative flex max-w-2xl flex-col justify-center gap-4 p-6 sm:gap-3 sm:p-8 lg:gap-4 lg:p-10">
            <div className="flex items-center gap-3"><span className="text-sm uppercase tracking-[0.3em] text-glow">Featured</span><TierBadge tier={tierFromAudiences(hero.audiences)} /></div>
            <h1 className="text-3xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">{hero.title}</h1>
            <p className="line-clamp-3 text-base text-muted-foreground sm:line-clamp-2 sm:text-lg lg:text-xl">{hero.description}</p>
            <div className="flex flex-wrap gap-2 text-xs font-semibold sm:text-sm">
              <span className="rounded-full bg-secondary px-3 py-1">v{hero.version}</span>
              {hero.file_size && <span className="rounded-full bg-secondary px-3 py-1">{hero.file_size}</span>}
              <span className="rounded-full bg-secondary px-3 py-1">Build {hero.build_number}</span>
            </div>
            <div className="flex gap-4 pt-2">
              <Link data-nav data-nav-autofocus to="/app/$id" params={{ id: hero.id }} className="tv-focus rounded-xl bg-primary px-6 py-3 text-base font-bold sm:px-8 sm:py-4 sm:text-lg text-primary-foreground">View & Install</Link>
              {featured.length > 1 && <button data-nav onClick={() => setSlide((s) => (s + 1) % featured.length)} className="tv-focus rounded-xl bg-secondary px-6 py-4 text-lg font-semibold">Next ›</button>}
            </div>
          </div>
          {featured.length > 1 && (
            <div className="absolute bottom-4 right-6 flex gap-2">
              {featured.map((f, i) => <span key={f.id} className={`h-1.5 rounded-full transition-all ${i === slide % featured.length ? "w-8 bg-glow" : "w-3 bg-muted-foreground/40"}`} />)}
            </div>
          )}
        </section>
      )}

      {data && (
        <>
          {visible.length > 0 && <Row title="Recently Added" apps={visible.slice(0, 10)} />}
          {data.categories.map((c) => (
            <CategoryRowView key={c.id} category={c} apps={appsForCategory(data.apps, c)} />
          ))}
        </>
      )}
    </div>
  );
}

function Row({ title, apps }: { title: string; apps: AppRow[] }) {
  return (
    <section className="mt-12">
      <h2 className="px-4 sm:px-14 text-xl sm:text-2xl font-bold">{title}</h2>
      <div className="no-scrollbar flex gap-4 sm:gap-6 overflow-x-auto px-4 sm:px-14 py-6">{apps.map((a) => <AppTile key={a.id} app={a} />)}</div>
    </section>
  );
}

function CategoryRowView({ category, apps }: { category: CategoryRow; apps: AppRow[] }) {
  return (
    <section className="mt-12">
      <h2 className={`px-4 sm:px-14 text-xl sm:text-2xl font-bold ${category.is_vip ? "text-vip" : ""}`}>{category.is_vip ? "👑 " : ""}{category.name}</h2>
      <div className="no-scrollbar flex gap-4 sm:gap-6 overflow-x-auto px-4 sm:px-14 py-6">
        {apps.map((a) => <AppTile key={a.id} app={a} />)}
        <Link data-nav to="/category/$slug" params={{ slug: category.slug }} className={`tv-focus glass flex w-40 sm:w-56 shrink-0 items-center justify-center rounded-2xl p-4 text-center text-lg font-semibold ${category.is_vip ? "text-vip" : "text-glow"}`}>
          {apps.length ? `Open ${category.name} ›` : "Coming soon — open category"}
        </Link>
      </div>
    </section>
  );
}
