// Au Rendez-Vous — fonction « ardv-ia » (Supabase Edge Function)
// Reçoit { system, user, image? } d'une personne connectée et autorisée, appelle Gemini, renvoie { texte }.
// La clé Gemini ne quitte jamais le serveur. Le contenu des avis n'est jamais écrit dans les journaux.
// Secrets : GEMINI_API_KEY, GEMINI_MODEL, EMAILS_AUTORISES (séparés par des virgules), GROQ_API_KEY (secours, facultatif).

import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { corpsGemini, lireTexteGemini, mapGeminiError, estAutorise, modelesAEssayer, doitReessayer } from "./gemini.js";
import { corpsGroq, lireTexteGroq, modelesGroq, ordreFournisseurs } from "./groq.js";

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
const CLE_GROQ = Deno.env.get("GROQ_API_KEY") || "";
const BUDGET_MS = 45_000;      // Supabase coupe vers 2 min : on répond toujours bien avant
const APPEL_MAX_MS = 15_000;   // un fournisseur qui ne répond pas en 15 s est considéré surchargé
const RESERVE_GROQ_MS = 12_000;
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

  // Gemini (modèle choisi puis alias de secours), puis Groq si sa clé existe. Jamais plus de 45 s au total.
  const fin = Date.now() + BUDGET_MS;
  const fournisseurs = ordreFournisseurs({ gemini: CLE, groq: CLE_GROQ });
  let dernier = 502;
  const appel = async (url: string, headers: Record<string, string>, corps: unknown, reserve: number) => {
    const delai = Math.min(APPEL_MAX_MS, fin - Date.now() - reserve);
    if (delai < 2000) return null; // plus le temps : on laisse la place au suivant
    try {
      return await fetch(url, { method: "POST", headers, body: JSON.stringify(corps), signal: AbortSignal.timeout(delai) });
    } catch (e) {
      console.log(`appel sans réponse (${(e as Error).name})`);
      dernier = 503;
      return null;
    }
  };

  for (const fournisseur of fournisseurs) {
    const reserve = fournisseur === "gemini" && fournisseurs.includes("groq") ? RESERVE_GROQ_MS : 0;
    if (fournisseur === "gemini") {
      for (const modele of MODELES) {
        for (let reflexion = true; ; ) {
          const r = await appel(`https://generativelanguage.googleapis.com/v1beta/models/${modele}:generateContent`,
            { "Content-Type": "application/json", "x-goog-api-key": CLE },
            corpsGemini(demande as { system: string; user: string }, { reflexion }), reserve);
          if (!r) break;
          if (r.ok) { try { return json({ texte: lireTexteGemini(await r.json()) }); } catch (e) { console.log((e as Error).message); break; } }
          console.log(`Gemini a répondu ${r.status} (modèle ${modele})`);
          dernier = r.status;
          if (doitReessayer(r.status) === "sans-reflexion" && reflexion) { reflexion = false; continue; }
          break;
        }
        if (dernier === 429) break; // quota du jour épuisé : inutile d'essayer les autres modèles Gemini
      }
    } else {
      for (const modele of modelesGroq(!!demande.image)) {
        const r = await appel("https://api.groq.com/openai/v1/chat/completions",
          { "Content-Type": "application/json", Authorization: `Bearer ${CLE_GROQ}` },
          corpsGroq(demande as { system: string; user: string }, modele), 0);
        if (!r) break;
        if (r.ok) { try { return json({ texte: lireTexteGroq(await r.json()) }); } catch (e) { console.log((e as Error).message); continue; } }
        console.log(`Groq a répondu ${r.status} (modèle ${modele})`);
        dernier = r.status;
      }
    }
  }
  return json({ erreur: mapGeminiError(dernier) }, dernier === 429 ? 429 : 502);
});
