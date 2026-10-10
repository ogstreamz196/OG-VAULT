import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { aggregate, type EventRow } from "@/lib/telemetry";

const RANGES = { "24h": 1, "7d": 7, "30d": 30, all: 0 } as const;
type Range = keyof typeof RANGES;

function rateClass(r: number) {
  return r > 0.05 ? "text-destructive" : r >= 0.02 ? "text-glow" : "text-primary";
}

export function AnalyticsDashboard() {
  const [range, setRange] = useState<Range>("7d");
  const events = useQuery({
    queryKey: ["admin", "install-events", range],
    refetchInterval: 60_000,
    queryFn: async () => {
      let q = supabase.from("app_install_events").select("app_id,event_type,created_at,error_message,platform").order("created_at", { ascending: false }).limit(20000);
      const days = RANGES[range];
      if (days) q = q.gte("created_at", new Date(Date.now() - days * 864e5).toISOString());
      const { data, error } = await q;
      if (error) throw error;
      return data as EventRow[];
    },
  });
  const apps = useQuery({
    queryKey: ["admin", "apps-titles"],
    queryFn: async () => (await supabase.from("apps").select("id,title,package_name")).data ?? [],
  });

  const rows = events.data ?? [];
  const stats = useMemo(() => aggregate(rows), [rows]);
  const daily = useMemo(() => {
    const m = new Map<string, { d: number; f: number }>();
    for (const r of rows) {
      const k = r.created_at.slice(0, 10);
      const v = m.get(k) ?? { d: 0, f: 0 };
      if (r.event_type === "download_started") v.d++;
      if (r.event_type.endsWith("_failed")) v.f++;
      m.set(k, v);
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-30);
  }, [rows]);
  const max = Math.max(1, ...daily.map(([, v]) => v.d));
  const tot = stats.reduce((a, s) => ({ d: a.d + s.downloads, i: a.i + s.installs, f: a.f + s.failures }), { d: 0, i: 0, f: 0 });
  const starts = rows.filter((r) => r.event_type === "download_started");
  const stick = starts.filter((r) => r.platform === "firestick").length;
  const title = (id: string) => apps.data?.find((a) => a.id === id)?.title ?? "Deleted app";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(RANGES) as Range[]).map((r) => (
          <Button key={r} size="sm" variant={r === range ? "default" : "secondary"} onClick={() => setRange(r)}>{r === "all" ? "All time" : `Last ${r}`}</Button>
        ))}
        <Button size="sm" variant="outline" onClick={() => events.refetch()}>Refresh</Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        {[["Downloads", tot.d], ["Install attempts", tot.i], ["Failures", tot.f], ["Failure rate", tot.d ? `${((tot.f / tot.d) * 100).toFixed(1)}%` : "—"]].map(([k, v]) => (
          <Card key={k}><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{k}</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{v}</CardContent></Card>
        ))}
      </div>
      <Card>
        <CardHeader className="pb-2"><CardTitle>Where downloads come from</CardTitle></CardHeader>
        <CardContent>
          {starts.length === 0 ? <p className="text-muted-foreground">No downloads yet.</p> : (
            <>
              <div className="flex h-4 overflow-hidden rounded-full bg-secondary"><div className="bg-primary" style={{ width: `${(stick / starts.length) * 100}%` }} /></div>
              <div className="mt-2 flex justify-between text-sm"><span className="text-primary">Firestick / app: {stick} ({Math.round((stick / starts.length) * 100)}%)</span><span className="text-muted-foreground">Web browser: {starts.length - stick} ({Math.round(((starts.length - stick) / starts.length) * 100)}%)</span></div>
            </>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Downloads per day</CardTitle></CardHeader>
        <CardContent>
          {daily.length === 0 ? <p className="text-muted-foreground">No activity yet.</p> : (
            <div className="flex h-40 items-end gap-1">
              {daily.map(([day, v]) => (
                <div key={day} className="flex flex-1 flex-col items-center justify-end" title={`${day}: ${v.d} downloads, ${v.f} failures`}>
                  <div className="w-full rounded-t bg-primary" style={{ height: `${(v.d / max) * 100}%` }}>
                    <div className="w-full rounded-t bg-destructive" style={{ height: v.d ? `${(v.f / v.d) * 100}%` : 0 }} />
                  </div>
                  <span className="mt-1 text-[10px] text-muted-foreground">{day.slice(5)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>By app</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground"><tr><th className="py-2">App</th><th>Downloads</th><th>Completed</th><th>Installs</th><th>Failures</th><th>Fail rate</th><th>Last error</th></tr></thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.appId} className="border-t">
                  <td className="py-2 font-medium">{title(s.appId)}</td>
                  <td>{s.downloads}</td><td>{s.completed}</td><td>{s.installs}</td><td>{s.failures}</td>
                  <td className={`font-bold ${rateClass(s.failureRate)}`}>{(s.failureRate * 100).toFixed(1)}%</td>
                  <td className="max-w-xs truncate text-muted-foreground" title={s.lastError ?? ""}>{s.lastError ?? "—"}</td>
                </tr>
              ))}
              {stats.length === 0 && <tr><td colSpan={7} className="py-4 text-muted-foreground">No downloads in this period.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
