// Au Rendez-Vous — fonction « ardv-avis-gmail » (Supabase Edge Function)
// Reçoit les e-mails « nouvel avis » envoyés par le script Gmail de Rafiza, les garde bruts (pour améliorer la lecture)
// et crée les tickets à répondre. Protégée par un jeton secret (table ardv_jetons), pas par une connexion.
// Corps : { emails: [{ id, sujet, date, texte }] }  ou  { retraiter: true } pour relire tous les e-mails gardés.

import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { lireEmailAvis } from "./lecture.js";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

type Email = { id: string; sujet?: string; date?: string; texte?: string };

async function creerAvis(e: Email) {
  const avis = lireEmailAvis({ sujet: e.sujet || "", texte: e.texte || "" });
  if (!avis.length) return 0;
  const lignes = avis.map((a) => ({
    source: "gmail", cle: a.cle, auteur: a.auteur.slice(0, 80), etoiles: a.etoiles, texte: a.texte.slice(0, 4000),
    lien: a.lien, cree: e.date || new Date().toISOString(),
  }));
  const { data, error } = await admin.from("ardv_avis").upsert(lignes, { onConflict: "cle", ignoreDuplicates: true }).select("id");
  if (error) throw error;
  return data?.length || 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ erreur: "methode" }, 405);
  const { data: j } = await admin.from("ardv_jetons").select("jeton").eq("nom", "gmail").maybeSingle();
  if (!j?.jeton || req.headers.get("x-ardv-jeton") !== j.jeton) return json({ erreur: "interdit" }, 403);

  let corps: { emails?: Email[]; retraiter?: boolean };
  try { corps = await req.json(); } catch { return json({ erreur: "corps" }, 400); }

  try {
    let emails: Email[] = [];
    if (corps.retraiter) {
      const { data, error } = await admin.from("ardv_emails").select("id, sujet, date, texte").order("date");
      if (error) throw error;
      emails = data as Email[];
    } else {
      emails = (corps.emails || []).filter((e) => e && typeof e.id === "string").slice(0, 100);
      if (emails.length) {
        const { error } = await admin.from("ardv_emails").upsert(emails.map((e) => ({
          id: e.id, sujet: (e.sujet || "").slice(0, 300), date: e.date || null, texte: (e.texte || "").slice(0, 20000),
        })), { onConflict: "id" });
        if (error) throw error;
      }
    }
    let nouveaux = 0;
    for (const e of emails) {
      const n = await creerAvis(e);
      nouveaux += n;
      await admin.from("ardv_emails").update({ nb_avis: lireEmailAvis({ sujet: e.sujet || "", texte: e.texte || "" }).length }).eq("id", e.id);
    }
    console.log(`${emails.length} e-mail(s) lus, ${nouveaux} nouvel(s) avis`);
    return json({ emails: emails.length, nouveaux });
  } catch (e) {
    console.log("erreur :", (e as Error).message);
    return json({ erreur: "base" }, 500);
  }
});
