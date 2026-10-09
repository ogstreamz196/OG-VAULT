import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  title: z.string().min(1).max(200),
  category: z.string().max(100).optional().default(""),
  features: z.string().max(4000).optional().default(""),
  changelog: z.string().max(4000).optional().default(""),
});

/** Boss-only: writes store copy with the boss's own Groq key — no Lovable credits. */
export const generateStoreCopy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) return { error: "Boss access only" };
    const key = process.env["GROQ_API_KEY"];
    if (!key) return { error: "Groq key is not set up yet." };

    const prompt = `App: ${data.title}\nCategory: ${data.category || "n/a"}\nKey features:\n${data.features || "n/a"}\nRaw changelog:\n${data.changelog || "n/a"}\n\nReturn JSON only: {"description": string, "release_notes": string}. description: 2 short engaging paragraphs plus a bullet list of features ("• "), for an Android TV / Firestick app store, no hype claims. release_notes: max 5 concise bullets ("• ") written for users.`;
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: "You write polished app store copy. Reply with JSON only." },
            { role: "user", content: prompt },
          ],
        }),
      });
      if (res.status === 401 || res.status === 400 || res.status === 403) {
        const t = await res.text();
        console.error("Groq error", res.status, t);
        return { error: /api key/i.test(t) ? "Groq rejected the API key — replace it in chat." : `Groq error (${res.status})` };
      }
      if (res.status === 429) return { error: "Groq is busy or your Groq limits ran out. Try again shortly." };
      if (!res.ok) return { error: `Groq error (${res.status})` };
      const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const raw = j.choices?.[0]?.message?.content ?? "";
      const parsed = JSON.parse(raw.replace(/^```(json)?|```$/g, "").trim()) as { description?: string; release_notes?: string };
      return { description: parsed.description ?? "", releaseNotes: parsed.release_notes ?? "" };
    } catch (e) {
      console.error("generateStoreCopy failed", e);
      return { error: "Couldn't reach Groq. Try again." };
    }
  });
