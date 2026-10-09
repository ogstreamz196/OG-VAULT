import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Logo } from "@/components/tv/TvShell";
import { AppsManager } from "@/components/admin/AppsManager";
import { CategoriesManager } from "@/components/admin/CategoriesManager";
import { VipManager } from "@/components/admin/VipManager";
import { M3uSettings } from "@/components/admin/M3uSettings";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin Portal — OG VAULT" },
      { name: "description", content: "Manage OG VAULT apps, media, APKs, categories, VIP codes and playlist rules." },
      { property: "og:title", content: "Admin Portal — OG VAULT" },
      { property: "og:description", content: "OGSTREAMZ management portal for the OG VAULT store." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return setIsAdmin(null);
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  if (user === undefined) return <div className="min-h-screen" />;
  if (!user) return <AuthForm />;
  if (isAdmin === null) return <p className="p-10 text-muted-foreground">Checking access…</p>;
  if (!isAdmin)
    return (
      <div className="mx-auto max-w-md space-y-4 p-10 text-center">
        <h1 className="text-2xl font-bold">No admin access</h1>
        <p className="text-muted-foreground">{user.email} is signed in but isn't an admin.</p>
        <Button onClick={() => supabase.auth.signOut()}>Sign out</Button>
      </div>
    );

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b px-8 py-4">
        <Logo />
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-glow">Open store</Link>
          <span>{user.email}</span>
          <Button size="sm" variant="secondary" onClick={() => supabase.auth.signOut()}>Sign out</Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-8">
        <Tabs defaultValue="apps">
          <TabsList className="mb-6">
            <TabsTrigger value="apps">Apps & Media</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="vip">VIP Codes</TabsTrigger>
            <TabsTrigger value="m3u">Playlist Rules</TabsTrigger>
          </TabsList>
          <TabsContent value="apps"><AppsManager /></TabsContent>
          <TabsContent value="categories"><CategoriesManager /></TabsContent>
          <TabsContent value="vip"><VipManager /></TabsContent>
          <TabsContent value="m3u"><M3uSettings /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function AuthForm() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = mode === "in"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/admin` } });
    setBusy(false);
    if (res.error) return toast.error(res.error.message);
    if (mode === "up" && !res.data.session) toast.success("Check your email to confirm your account, then sign in.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={submit} className="glass w-full max-w-sm space-y-4 rounded-2xl p-8">
        <Logo />
        <h1 className="text-xl font-bold">Admin {mode === "in" ? "sign in" : "sign up"}</h1>
        <div className="space-y-1.5"><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Password</Label><Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <Button className="w-full" disabled={busy}>{busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}</Button>
        <button type="button" className="w-full text-sm text-muted-foreground hover:text-glow" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "First time? Create the admin account" : "Have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}
