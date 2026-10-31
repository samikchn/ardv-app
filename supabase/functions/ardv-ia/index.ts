// Au Rendez-Vous — fonction « ardv-ia » (Supabase Edge Function)
// Reçoit { system, user, image? } d'une personne connectée et autorisée, appelle Gemini, renvoie { texte }.
// La clé Gemini ne quitte jamais le serveur. Le contenu des avis n'est jamais écrit dans les journaux.
// Secrets : GEMINI_API_KEY, GEMINI_MODEL, EMAILS_AUTORISES (séparés par des virgules).

import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { corpsGemini, lireTexteGemini, mapGeminiError, estAutorise } from "./gemini.js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
const AUTORISES = (Deno.env.get("EMAILS_AUTORISES") || "").split(",").filter(Boolean);
const MODELE = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";
const CLE = Deno.env.get("GEMINI_API_KEY") || "";
const TAILLE_MAX = 6_000_000; // ~ une capture d'écran redimensionnée

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ erreur: "ia" }, 405);

  const jeton = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!jeton) return json({ erreur: "connexion" }, 401);
  const { data, error } = await supabase.auth.getUser(jeton);
  if (error || !data?.user) return json({ erreur: "connexion" }, 401);
  if (!data.user.email_confirmed_at || !estAutorise(data.user.email, AUTORISES)) return json({ erreur: "interdit" }, 403);

  const brut = await req.text();
  if (brut.length > TAILLE_MAX) return json({ erreur: "ia" }, 413);
  let demande: { system?: string; user?: string; image?: { mime: string; base64: string } };
  try { demande = JSON.parse(brut); } catch { return json({ erreur: "ia" }, 400); }
  if (typeof demande.system !== "string" || typeof demande.user !== "string") return json({ erreur: "ia" }, 400);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELE}:generateContent`;
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": CLE },
      body: JSON.stringify(corpsGemini(demande as { system: string; user: string })),
    });
    if (!r.ok) {
      console.log(`Gemini a répondu ${r.status}`);
      return json({ erreur: mapGeminiError(r.status) }, r.status === 429 ? 429 : 502);
    }
    return json({ texte: lireTexteGemini(await r.json()) });
  } catch (e) {
    console.log("appel Gemini impossible :", (e as Error).message);
    return json({ erreur: "ia" }, 502);
  }
});
