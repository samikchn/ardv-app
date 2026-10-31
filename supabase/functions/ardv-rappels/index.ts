// Au Rendez-Vous — fonction « ardv-rappels » (Supabase Edge Function)
// Appelée toutes les 5 minutes par une tâche planifiée (pg_cron) : envoie une notification pour chaque post
// dont l'heure de rappel est passée, sur tous les téléphones abonnés. Protégée par le jeton « cron » (table ardv_jetons).

import * as webpush from "jsr:@negrel/webpush@0.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

let serveur: webpush.ApplicationServer | null = null;
async function serveurPush(cles: string) {
  if (!serveur) {
    const vapid = await webpush.importVapidKeys(JSON.parse(cles));
    serveur = await webpush.ApplicationServer.new({ contactInformation: "mailto:aurendezvous11@gmail.com", vapidKeys: vapid });
  }
  return serveur;
}

Deno.serve(async (req) => {
  const { data: jetons } = await admin.from("ardv_jetons").select("nom, jeton").in("nom", ["cron", "vapid"]);
  const jeton = (n: string) => jetons?.find((j) => j.nom === n)?.jeton;
  if (!jeton("cron") || req.headers.get("x-ardv-jeton") !== jeton("cron")) return json({ erreur: "interdit" }, 403);

  const { data: posts, error } = await admin.from("ardv_posts").select("id, numero, idee, textes")
    .eq("statut", "prevu").eq("rappel_envoye", false).lte("rappel", new Date().toISOString()).limit(10);
  if (error) return json({ erreur: error.message }, 500);
  if (!posts?.length) return json({ envoyes: 0 });

  const { data: abonnes } = await admin.from("ardv_push").select("endpoint, abonnement");
  const s = await serveurPush(jeton("vapid")!);
  let envoyes = 0;
  for (const p of posts) {
    const extrait = String(p.idee || p.textes?.instagram || "").slice(0, 90);
    const message = JSON.stringify({ title: "C'est l'heure de publier 📸", body: extrait || "Votre post est prêt.", tag: `post-${p.id}`, url: "./?onglet=posts" });
    for (const a of abonnes || []) {
      try {
        await s.subscribe(a.abonnement as webpush.PushSubscription).pushTextMessage(message, { ttl: 6 * 3600, urgency: webpush.Urgency.High });
        envoyes++;
      } catch (e) {
        // Téléphone désabonné (appli désinstallée, notifications coupées) : on l'oublie
        if (e instanceof webpush.PushMessageError && e.isGone()) await admin.from("ardv_push").delete().eq("endpoint", a.endpoint);
        else console.log("notification impossible :", (e as Error).message);
      }
    }
    await admin.from("ardv_posts").update({ rappel_envoye: true }).eq("id", p.id);
  }
  console.log(`${posts.length} rappel(s), ${envoyes} notification(s)`);
  return json({ rappels: posts.length, envoyes });
});
