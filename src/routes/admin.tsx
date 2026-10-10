import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Logo } from "@/components/tv/TvShell";
import { AppsManager } from "@/components/admin/AppsManager";
import { CategoriesManager } from "@/components/admin/CategoriesManager";
import { VipManager } from "@/components/admin/VipManager";
import { MembersManager } from "@/components/admin/MembersManager";
import { OgVaultPassSyncCard } from "@/components/admin/OgVaultPassSyncCard";
import { R2StorageCard } from "@/components/admin/R2StorageCard";
import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";
import { RemoteActionsManager } from "@/components/admin/RemoteActionsManager";
import { BroadcastCard } from "@/components/admin/BroadcastCard";
import { isNative } from "@/lib/native-install";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Boss Control Panel — OG VAULT" },
      { name: "description", content: "Manage OG VAULT apps, media, APKs, categories, VIP codes and members." },
      { property: "og:title", content: "Boss Control Panel — OG VAULT" },
      { property: "og:description", content: "OGSTREAMZ boss control panel for the OG VAULT store." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { ready, user, isAdmin, username, signOut } = useAuth();
  if (!ready) return <div className="min-h-screen" />;
  if (isNative())
    return (
      <div className="mx-auto max-w-md space-y-4 p-10 text-center">
        <h1 className="text-2xl font-bold">Boss Controls are web only</h1>
        <p className="text-muted-foreground">Open vault.ogstreamz.co.uk/admin in a web browser to manage the store.</p>
        <Button asChild><Link to="/">Go to store</Link></Button>
      </div>
    );
  if (!user || !isAdmin)
    return (
      <div className="mx-auto max-w-md space-y-4 p-10 text-center">
        <h1 className="text-2xl font-bold">Boss access only</h1>
        <p className="text-muted-foreground">Sign in on the store with the boss Google account to open the control panel.</p>
        <Button asChild><Link to="/">Go to store</Link></Button>
      </div>
    );

  return (
    <div className="min-h-screen">
      <header className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="flex min-w-0 items-center justify-between gap-3 sm:justify-start sm:gap-4"><Logo /><span className="shrink-0 rounded-md border border-glow/60 px-2 py-0.5 text-[10px] font-bold text-glow sm:text-xs">BOSS CONTROLS</span></div>
        <div className="flex min-w-0 items-center gap-3 text-sm text-muted-foreground">
          <Link to="/" className="shrink-0 whitespace-nowrap hover:text-glow">‹ Store</Link>
          <span className="min-w-0 flex-1 truncate">{user.email ?? username}</span>
          <Button size="sm" variant="secondary" className="shrink-0" onClick={() => signOut()}>Sign out</Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-3 py-4 sm:p-8">
        <Tabs defaultValue="apps">
          <TabsList className="mb-6 flex h-auto w-full flex-nowrap justify-start overflow-x-auto [&>button]:shrink-0">
            <TabsTrigger value="apps">Apps & Media</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="vip">VIP Users & Codes</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="remote">Remote Tools</TabsTrigger>
          </TabsList>
          <TabsContent value="apps" className="space-y-6"><BroadcastCard /><R2StorageCard /><AppsManager /></TabsContent>
          <TabsContent value="categories"><CategoriesManager /></TabsContent>
          <TabsContent value="vip" className="space-y-6"><OgVaultPassSyncCard /><VipManager /></TabsContent>
          <TabsContent value="members"><MembersManager /></TabsContent>
          <TabsContent value="analytics"><AnalyticsDashboard /></TabsContent>
          <TabsContent value="remote"><RemoteActionsManager /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
