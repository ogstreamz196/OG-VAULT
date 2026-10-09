import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthState = {
  ready: boolean;
  user: User | null;
  username: string | null;
  isAdmin: boolean;
  isVip: boolean;
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
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const access = useQuery({
    queryKey: ["access", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const id = user!.id;
      const [profile, admin, vip] = await Promise.all([
        supabase.from("profiles").select("username").eq("id", id).maybeSingle(),
        supabase.rpc("has_role", { _user_id: id, _role: "admin" }),
        supabase.rpc("is_vip", { _user_id: id }),
      ]);
      return { username: profile.data?.username ?? null, isAdmin: !!admin.data, isVip: !!vip.data };
    },
  });

  const value: AuthState = {
    ready: ready && (!user || !access.isLoading),
    user,
    username: access.data?.username ?? (user?.user_metadata?.["full_name"] as string | undefined) ?? null,
    isAdmin: access.data?.isAdmin ?? false,
    isVip: access.data?.isVip ?? false,
    refreshAccess: () => qc.invalidateQueries({ queryKey: ["access"] }),
    signOut: async () => {
      await qc.cancelQueries();
      qc.removeQueries({ queryKey: ["access"] });
      await supabase.auth.signOut();
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}
