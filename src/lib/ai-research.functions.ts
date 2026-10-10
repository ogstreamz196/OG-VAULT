import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Boss-only: Groq compound model searches the web for an app and writes store copy. */
export const researchApp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ title: z.string().max(200).optional().default(""), packageName: z.string().max(200).optional().default("") }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) return { error: "Boss access only" };
    const key = process.env["GROQ_API_KEY"];
    if (!key) return { error: "Groq key is not set up yet." };
    if (!data.title && !data.packageName) return { error: "Need a title or package name to search" };

    const prompt = `Search the web for the Android app${data.title ? ` "${data.title}"` : ""}${data.packageName ? ` (package name ${data.packageName})` : ""}. Find what it actually does.
Reply with ONLY a JSON object, no other text: {"title": string, "description": string, "features": string}
title: the app's real public name. description: 2 short paragraphs then a bullet list ("• ") of features, written for an Android TV / Firestick app store, factual, no hype. features: key features one per line. If you can't find it, return empty strings.`;
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "groq/compound", messages: [{ role: "user", content: prompt }] }),
      });
      if (res.status === 429) return { error: "Groq is busy, try again shortly." };
      if (!res.ok) { console.error("researchApp", res.status, await res.text()); return { error: `Web search failed (${res.status})` }; }
      const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const raw = j.choices?.[0]?.message?.content ?? "";
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) return { error: "Couldn't find this app online" };
      const p = JSON.parse(m[0]) as { title?: string; description?: string; features?: string };
      if (!p.description) return { error: "Couldn't find this app online" };
      return { title: p.title ?? "", description: p.description, features: p.features ?? "" };
    } catch (e) {
      console.error("researchApp failed", e);
      return { error: "Couldn't reach the web search. Try again." };
    }
  });
