import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { broadcastQuery, BroadcastBar } from "@/components/tv/BroadcastBar";

export function BroadcastCard() {
  const qc = useQueryClient();
  const { data } = useQuery(broadcastQuery);
  const [msg, setMsg] = useState("");
  const [active, setActive] = useState(false);
  const [style, setStyle] = useState("info");
  useEffect(() => { if (data) { setMsg(data.message); setActive(data.is_active); setStyle(data.style); } }, [data]);

  async function save() {
    const { error } = await supabase.from("store_broadcast").upsert({ id: 1, message: msg.trim(), is_active: active && !!msg.trim(), style, updated_at: new Date().toISOString() });
    if (error) toast.error(error.message); else { toast.success(active ? "Broadcast is live" : "Broadcast saved"); qc.invalidateQueries({ queryKey: ["broadcast"] }); }
  }

  return (
    <div className="glass space-y-3 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">📣 Store Broadcast</h3>
        <label className="flex items-center gap-2 text-sm"><Switch checked={active} onCheckedChange={setActive} />Show on store</label>
      </div>
      <Input value={msg} maxLength={200} placeholder="e.g. New IPTV update live in the VIP section" onChange={(e) => setMsg(e.target.value)} />
      <div className="flex flex-wrap gap-2">
        {["info", "vip", "alert"].map((s) => <Button key={s} size="sm" variant={style === s ? "default" : "secondary"} onClick={() => setStyle(s)}>{s === "info" ? "Info" : s === "vip" ? "VIP" : "Warning"}</Button>)}
        <Button size="sm" className="ml-auto" onClick={save}>Save</Button>
      </div>
      {msg.trim() && <BroadcastBar preview={{ message: msg, style }} />}
    </div>
  );
}
