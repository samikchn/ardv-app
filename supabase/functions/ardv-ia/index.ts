// Au Rendez-Vous — fonction « ardv-ia » (Supabase Edge Function)
// Reçoit { system, user, image? } d'une personne connectée et autorisée, appelle Gemini, renvoie { texte }.
// La clé Gemini ne quitte jamais le serveur. Le contenu des avis n'est jamais écrit dans les journaux.
// Secrets : GEMINI_API_KEY, GEMINI_MODEL, EMAILS_AUTORISES (séparés par des virgules).

import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { corpsGemini, lireTexteGemini, mapGeminiError, estAutorise, modelesAEssayer, doitReessayer } from "./gemini.js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
const AUTORISES = (Deno.env.get("EMAILS_AUTORISES") || "").split(",").filter(Boolean);
const MODELES = modelesAEssayer(Deno.env.get("GEMINI_MODEL"));
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

  // Essaie le modèle choisi, puis l'alias de secours ; sans réglage de réflexion si Google le refuse.
  try {
    let dernier = 502;
    const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
    for (const modele of MODELES) {
      let surchargeDejaVue = false;
      for (let reflexion = true; ; ) {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modele}:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": CLE },
          body: JSON.stringify(corpsGemini(demande as { system: string; user: string }, { reflexion })),
        });
        if (r.ok) return json({ texte: lireTexteGemini(await r.json()) });
        console.log(`Gemini a répondu ${r.status} (modèle ${modele}, réflexion ${reflexion ? "réglée" : "par défaut"})`);
        dernier = r.status;
        const suite = doitReessayer(r.status);
        if (suite === "sans-reflexion" && reflexion) { reflexion = false; continue; }
        if (suite === "surcharge" && !surchargeDejaVue) { surchargeDejaVue = true; await pause(1500); continue; }
        if (suite) break;
        return json({ erreur: mapGeminiError(r.status) }, r.status === 429 ? 429 : 502);
      }
    }
    return json({ erreur: mapGeminiError(dernier) }, 502);
  } catch (e) {
    console.log("appel Gemini impossible :", (e as Error).message);
    return json({ erreur: "ia" }, 502);
  }
});
