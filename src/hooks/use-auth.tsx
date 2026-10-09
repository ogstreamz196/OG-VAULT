import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Level } from "@/lib/access";

type AuthState = {
  ready: boolean;
  user: User | null;
  username: string | null;
  isAdmin: boolean;
  isVip: boolean;
  level: Level;
  refreshAccess: () => void;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { setUser(data.user); setReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      setUser(session?.user ?? null);
      setReady(true);
      if (event === "SIGNED_IN") { qc.invalidateQueries({ queryKey: ["catalog"] }); qc.invalidateQueries({ queryKey: ["app"] }); }
    });
    return () => sub.subscription.unsubscribe();
  }, [qc]);

  const access = useQuery({
    queryKey: ["access", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const id = user!.id;
      const [profile, lvl] = await Promise.all([
        supabase.from("profiles").select("username").eq("id", id).maybeSingle(),
        supabase.rpc("user_level", { _user_id: id }),
      ]);
      const level = ((lvl.data as string | null) ?? "guest") as Level;
      return { username: profile.data?.username ?? null, level, isAdmin: level === "admin", isVip: level === "vip" || level === "admin" };
    },
  });

  const value: AuthState = {
    ready: ready && (!user || !access.isLoading),
    user,
    username: access.data?.username ?? (user?.user_metadata?.["full_name"] as string | undefined) ?? null,
    isAdmin: access.data?.isAdmin ?? false,
    isVip: access.data?.isVip ?? false,
    level: access.data?.level ?? (user ? "guest" : "none"),
    refreshAccess: () => { qc.invalidateQueries({ queryKey: ["access"] }); qc.invalidateQueries({ queryKey: ["catalog"] }); qc.invalidateQueries({ queryKey: ["app"] }); },
    signOut: async () => {
      await qc.cancelQueries();
      await supabase.auth.signOut();
      qc.clear();
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}
