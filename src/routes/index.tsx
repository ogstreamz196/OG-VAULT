import { tierFromAudiences } from "@/lib/access";
import { Lock } from "lucide-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { catalogQuery, type AppRow, type CategoryRow } from "@/lib/catalog";
import { isCategoryLocked } from "@/lib/access";
import { useAuth } from "@/hooks/use-auth";
import { TierBadge } from "@/components/tv/TvShell";
import { StoreGate } from "@/components/tv/StoreGate";
import { StoreHeader } from "@/components/tv/StoreHeader";
import { AppTile } from "@/components/tv/AppTile";

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
  component: () => (
    <StoreGate onBack={() => {}}>
      <Home />
    </StoreGate>
  ),
});

function Home() {
  const { isVip } = useAuth();
  const { data, isLoading, error } = useQuery(catalogQuery);
  const lockedCats = useMemo(() => new Set(data?.categories.filter((c) => isCategoryLocked(c, isVip)).map((c) => c.id)), [data, isVip]);
  const visible = useMemo(() => data?.apps.filter((a) => !a.category_id || !lockedCats.has(a.category_id)) ?? [], [data, lockedCats]);
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
      {isLoading && <p className="px-4 sm:px-14 pt-20 text-2xl text-muted-foreground">Loading the vault…</p>}
      {error && <p className="px-4 sm:px-14 pt-20 text-2xl text-vip">Couldn't load apps. Check your connection.</p>}

      {hero && (
        <section className="glass relative mx-4 sm:mx-14 mt-8 h-[340px] sm:h-[420px] overflow-hidden rounded-3xl">
          {hero.banner_url ? (
            <img src={hero.banner_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 75% 40%, color-mix(in oklab, var(--glow) 40%, transparent), transparent 50%), linear-gradient(120deg, var(--card), var(--primary))" }} />
          )}
          <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
          <div className="relative flex h-full max-w-2xl flex-col justify-center gap-4 p-6 sm:p-12">
            <div className="flex items-center gap-3"><span className="text-sm uppercase tracking-[0.3em] text-glow">Featured</span><TierBadge tier={tierFromAudiences(hero.audiences)} /></div>
            <h1 className="text-4xl sm:text-4xl sm:text-6xl font-extrabold leading-tight">{hero.title}</h1>
            <p className="line-clamp-3 text-xl text-muted-foreground">{hero.description}</p>
            <div className="flex gap-4 pt-2">
              <Link data-nav data-nav-autofocus to="/app/$id" params={{ id: hero.id }} className="tv-focus rounded-xl bg-primary px-8 py-4 text-lg font-bold text-primary-foreground">View & Install</Link>
              {featured.length > 1 && <button data-nav onClick={() => setSlide((s) => (s + 1) % featured.length)} className="tv-focus rounded-xl bg-secondary px-6 py-4 text-lg font-semibold">Next ›</button>}
            </div>
          </div>
        </section>
      )}

      {data && (
        <>
          {visible.length > 0 && <Row title="Recently Added" apps={visible.slice(0, 10)} />}
          {data.categories.map((c) => (
            <CategoryRowView key={c.id} category={c} apps={data.apps.filter((a) => a.category_id === c.id)} locked={lockedCats.has(c.id)} />
          ))}
        </>
      )}
    </div>
  );
}

function Row({ title, apps }: { title: string; apps: AppRow[] }) {
  return (
    <section className="mt-12">
      <h2 className="px-4 sm:px-14 text-2xl font-bold">{title}</h2>
      <div className="no-scrollbar flex gap-6 overflow-x-auto px-4 sm:px-14 py-6">{apps.map((a) => <AppTile key={a.id} app={a} />)}</div>
    </section>
  );
}

function CategoryRowView({ category, apps, locked }: { category: CategoryRow; apps: AppRow[]; locked: boolean }) {
  return (
    <section className="mt-12">
      <h2 className={`px-4 sm:px-14 text-2xl font-bold ${category.is_vip ? "text-vip" : ""}`}>{category.name}{category.is_vip && !locked ? " · Unlocked" : ""}</h2>
      <div className="no-scrollbar flex gap-6 overflow-x-auto px-4 sm:px-14 py-6">
        {locked ? (
          <Link data-nav to="/category/$slug" params={{ slug: category.slug }} className="tv-focus glass flex h-64 w-[85vw] sm:w-[34rem] shrink-0 items-center gap-6 rounded-2xl border-vip/60 p-8">
            <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-vip/20 text-4xl"><Lock className="h-9 w-9 text-vip" /></span>
            <span className="text-left">
              <span className="block text-2xl font-extrabold">VIP user area</span>
              <span className="mt-1 block text-lg text-muted-foreground">{apps.length ? `${apps.length} VIP app${apps.length > 1 ? "s" : ""} inside. ` : ""}Press OK to enter your VIP code.</span>
            </span>
          </Link>
        ) : (
          <>
            {apps.map((a) => <AppTile key={a.id} app={a} />)}
            <Link data-nav to="/category/$slug" params={{ slug: category.slug }} className="tv-focus glass flex w-40 sm:w-56 shrink-0 items-center justify-center rounded-2xl p-4 text-center text-lg font-semibold text-glow">
              {apps.length ? `Open ${category.name} ›` : "Coming soon — open category"}
            </Link>
          </>
        )}
      </div>
    </section>
  );
}
