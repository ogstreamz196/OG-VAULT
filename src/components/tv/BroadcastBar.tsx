import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const broadcastQuery = queryOptions({
  queryKey: ["broadcast"],
  staleTime: 60_000,
  refetchInterval: 120_000,
  queryFn: async () => (await supabase.from("store_broadcast").select("*").eq("id", 1).maybeSingle()).data,
});

export function BroadcastBar({ preview }: { preview?: { message: string; style: string } }) {
  const { data } = useQuery({ ...broadcastQuery, enabled: !preview });
  const b = preview ?? (data?.is_active && data.message ? data : null);
  if (!b) return null;
  const tone = b.style === "vip" ? "border-vip/70 text-vip" : b.style === "alert" ? "border-destructive text-destructive" : "border-glow/60 text-glow";
  return (
    <div className={`overflow-hidden rounded-xl border bg-card/80 py-2 text-sm font-bold sm:text-base ${tone}`} role="status">
      <div className="ticker whitespace-nowrap px-4">📣 {b.message}</div>
    </div>
  );
}
