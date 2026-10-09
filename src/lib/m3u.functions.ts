import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { evaluateXtream, hostAllowed, toXtream, type M3uRules, type PlaylistInput } from "./m3u";

export const verifyPlaylist = createServerFn({ method: "POST" })
  .inputValidator((input: PlaylistInput) => {
    if (input.mode === "xtream") {
      if (!input.server?.trim() || !input.username?.trim() || !input.password) throw new Error("Fill in server, username and password");
      if (input.server.length > 500 || input.username.length > 200 || input.password.length > 200) throw new Error("Input too long");
    } else if (!input.url?.trim() || input.url.length > 1000) throw new Error("Enter a valid M3U link");
    return input;
  })
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string; expiresAt?: string | null; label?: string }> => {
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const sb = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (i, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(i, { ...init, headers: h });
        },
      },
    });
    const { data: row } = await sb.from("m3u_settings").select("*").eq("id", 1).maybeSingle();
    const rules: M3uRules = row ?? { enabled: true, require_active_status: true, reject_expired: true, allowed_hosts: [], min_connections: 0, timeout_ms: 8000 };
    if (!rules.enabled) return { ok: false, error: "Playlist login is currently disabled" };

    const target = data.mode === "xtream" ? toXtream(data)!.server : data.url;
    if (!hostAllowed(target, rules.allowed_hosts)) return { ok: false, error: "This provider is not supported" };

    const signal = AbortSignal.timeout(Math.min(Math.max(rules.timeout_ms, 2000), 20000));
    const creds = toXtream(data);
    try {
      if (creds) {
        const url = `${creds.server}/player_api.php?username=${encodeURIComponent(creds.username)}&password=${encodeURIComponent(creds.password)}`;
        const res = await fetch(url, { signal, headers: { "User-Agent": "OGVault/1.0" } });
        if (!res.ok) return { ok: false, error: `Provider responded ${res.status}` };
        const json = (await res.json().catch(() => null)) as { user_info?: Parameters<typeof evaluateXtream>[0] } | null;
        const r = evaluateXtream(json?.user_info, rules);
        return r.ok ? { ok: true, expiresAt: r.expiresAt, label: `${creds.username}@${new URL(creds.server).hostname}` } : r;
      }
      const res = await fetch(data.mode === "m3u" ? data.url : "", { signal, headers: { Range: "bytes=0-1023", "User-Agent": "OGVault/1.0" } });
      const text = (await res.text()).slice(0, 1024);
      if (!text.trimStart().startsWith("#EXTM3U")) return { ok: false, error: "That link is not a valid M3U playlist" };
      return { ok: true, expiresAt: null, label: new URL(data.mode === "m3u" ? data.url : "").hostname };
    } catch (e) {
      return { ok: false, error: e instanceof Error && e.name === "TimeoutError" ? "Provider timed out" : "Could not reach provider" };
    }
  });
