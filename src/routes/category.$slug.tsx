import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { catalogQuery } from "@/lib/catalog";
import { appsForCategory } from "@/lib/access";
import { StoreGate } from "@/components/tv/StoreGate";
import { StoreHeader } from "@/components/tv/StoreHeader";
import { useAuth } from "@/hooks/use-auth";
import { VipLock } from "@/components/tv/VipLock";
import { AppTile } from "@/components/tv/AppTile";

export const Route = createFileRoute("/category/$slug")({
  head: () => ({
    meta: [
      { title: "Category — 0G VAULT" },
      { name: "description", content: "Browse apps in this 0G VAULT category." },
      { property: "og:title", content: "Category — 0G VAULT" },
      { property: "og:description", content: "Browse a category of OGSTREAMZ apps on 0G VAULT." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CategoryPage,
});

function CategoryPage() {
  return (
    <StoreGate>
      <CategoryBody />
    </StoreGate>
  );
}

function CategoryBody() {
  const { slug } = Route.useParams();
  const { isVip } = useAuth();
  const { data, isLoading } = useQuery(catalogQuery);
  const cat = data?.categories.find((c) => c.slug === slug);
  const apps = data && cat ? appsForCategory(data.apps, cat) : [];

  return (
    <div className="pb-20">
      <StoreHeader />
      <div className="px-4 sm:px-14 pt-10">
        {isLoading && <p className="text-2xl text-muted-foreground">Loading…</p>}
        {data && !cat && (
          <div className="space-y-6"><p className="text-2xl">Category not found.</p><Link data-nav to="/" className="tv-focus inline-block rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground">Back to store</Link></div>
        )}
        {cat && (
          <>
            <h1 className={`text-3xl sm:text-5xl font-extrabold ${cat.is_vip ? "text-vip" : ""}`}>{cat.name}</h1>
            {cat.is_vip && !isVip && <div className="pt-8"><VipLock title={cat.name} /></div>}
            {apps.length ? (
              <div className="flex flex-wrap gap-6 py-8">{apps.map((a, i) => <AppTile key={a.id} app={a} autoFocus={i === 0 && !(cat.is_vip && !isVip)} />)}</div>
            ) : (
              <p className="pt-8 text-2xl text-muted-foreground">No apps here yet — check back soon.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
