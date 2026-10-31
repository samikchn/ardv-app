// Au Rendez-Vous — fonction « ardv-pubs » (Supabase Edge Function)
// Reçoit les chiffres envoyés toutes les heures par le script du compte Google Ads (lecture seule) et les garde.
// Protégée par le jeton « ads » (table ardv_jetons). On garde les 200 derniers envois.

import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ erreur: "methode" }, 405);
  const { data: j } = await admin.from("ardv_jetons").select("jeton").eq("nom", "ads").maybeSingle();
  if (!j?.jeton || req.headers.get("x-ardv-jeton") !== j.jeton) return json({ erreur: "interdit" }, 403);

  let corps: { campagnes?: unknown[]; termes?: unknown[]; date?: string };
  try { corps = await req.json(); } catch { return json({ erreur: "corps" }, 400); }
  const donnees = {
    date: corps.date || new Date().toISOString(),
    campagnes: Array.isArray(corps.campagnes) ? corps.campagnes.slice(0, 30) : [],
    termes: Array.isArray(corps.termes) ? corps.termes.slice(0, 30) : [],
  };
  const { error } = await admin.from("ardv_pubs").insert({ donnees });
  if (error) { console.log("erreur :", error.message); return json({ erreur: "base" }, 500); }

  // Ménage : seuls les 200 derniers envois sont utiles
  const { data: vieux } = await admin.from("ardv_pubs").select("id").order("id", { ascending: false }).range(200, 1000);
  if (vieux?.length) await admin.from("ardv_pubs").delete().in("id", vieux.map((v) => v.id));
  console.log(`${donnees.campagnes.length} campagne(s) reçue(s)`);
  return json({ ok: true, campagnes: donnees.campagnes.length });
});
