// Accès aux données : Supabase quand config.js est rempli, sinon mode démo (stockage du téléphone).

import { fusionnerProfil } from './profil.js';

const CFG = globalThis.APP_CONFIG || {};
const params = new URLSearchParams(globalThis.location?.search || '');
export const estDemo = () => params.has('demo') || !CFG.supabaseUrl || !CFG.supabaseAnonKey;

// Une coupure réseau (restaurant, métro…) devient Error('reseau') pour afficher le bon message
const estCoupure = e => (globalThis.navigator && !navigator.onLine) || e instanceof TypeError || /fetch|network|load failed|réseau/i.test(e?.message || '');
const versReseau = e => (estCoupure(e) ? new Error('reseau') : e);

let _client = null;
async function client() {
  if (!_client) {
    let createClient;
    try { ({ createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm')); } catch { throw new Error('reseau'); }
    _client = createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true } });
  }
  return _client;
}

/* ---------- Démo : petit stockage local ---------- */
const DEMO_CLE = 'ardv-demo-2';
const DEMO_INITIAL = () => ({
  profil: null,
  numero: 42,
  avis: [
    { id: 'd1', numero: 41, auteur: 'Client démo', etoiles: 5, texte: 'Très bon accueil, galettes généreuses. On reviendra !', statut: 'fait', cree: new Date(Date.now() - 864e5).toISOString() },
    { id: 'd2', numero: 42, auteur: 'Camille D.', etoiles: 5, texte: 'Super crêperie juste derrière la Basilique, la galette complète était parfaite et le personnel adorable. Et...', lien: 'https://business.google.com/', statut: 'a_repondre', cree: new Date().toISOString() },
  ],
  reponses: [],
});
function demoLire() {
  try { return JSON.parse(globalThis.localStorage.getItem(DEMO_CLE)) || DEMO_INITIAL(); } catch { return DEMO_INITIAL(); }
}
function demoEcrire(d) { try { globalThis.localStorage.setItem(DEMO_CLE, JSON.stringify(d)); } catch { /* rien */ } }
const pause = ms => new Promise(r => setTimeout(r, ms));
const DEMO_EXEMPLES = [
  "Merci Giulia pour votre avis ! 😊 Ces deux petits mots nous font vraiment plaisir. On espère vous revoir bientôt au Café Au Rendez-Vous à Saint-Denis ! 🥞❤️",
];

/* ---------- Connexion ---------- */
export async function sessionActive() {
  if (estDemo()) return true;
  try {
    const { data } = await (await client()).auth.getSession();
    return !!data.session;
  } catch (e) { throw versReseau(e); }
}
export async function connexion(email, motDePasse) {
  const { error } = await (await client()).auth.signInWithPassword({ email: email.trim().toLowerCase(), password: motDePasse });
  if (error) throw versReseau(error);
}
export async function deconnexion() { if (!estDemo()) await (await client()).auth.signOut(); }

/* ---------- Fiche ---------- */
export async function chargerProfil() {
  if (estDemo()) return fusionnerProfil(demoLire().profil);
  const { data, error } = await (await client()).from('ardv_profil').select('data').eq('id', 1).maybeSingle();
  if (error) throw versReseau(error);
  return fusionnerProfil(data?.data);
}
export async function enregistrerProfil(profil) {
  if (estDemo()) { const d = demoLire(); d.profil = profil; demoEcrire(d); return; }
  const { error } = await (await client()).from('ardv_profil').upsert({ id: 1, data: profil, maj: new Date().toISOString() });
  if (error) throw versReseau(error);
}

/* ---------- Avis ---------- */
export async function listerAvis() {
  if (estDemo()) {
    const d = demoLire();
    const tri = [...d.avis].sort((a, b) => b.numero - a.numero);
    return { aRepondre: tri.filter(a => a.statut === 'a_repondre'), servis: tri.filter(a => a.statut === 'fait').slice(0, 10) };
  }
  const c = await client();
  const [a, s] = await Promise.all([
    c.from('ardv_avis').select('*').eq('statut', 'a_repondre').neq('source', 'ignore').order('cree', { ascending: false }),
    c.from('ardv_avis').select('*').eq('statut', 'fait').neq('source', 'ignore').order('cree', { ascending: false }).limit(10),
  ]);
  if (a.error) throw versReseau(a.error);
  if (s.error) throw versReseau(s.error);
  return { aRepondre: a.data, servis: s.data };
}
export async function ajouterAvis({ auteur = null, etoiles = null, texte = '' }) {
  if (estDemo()) {
    const d = demoLire();
    d.numero += 1;
    const avis = { id: 'd' + d.numero, numero: d.numero, auteur, etoiles, texte, statut: 'a_repondre', cree: new Date().toISOString() };
    d.avis.push(avis); demoEcrire(d); return avis;
  }
  const { data, error } = await (await client()).from('ardv_avis').insert({ auteur, etoiles, texte, source: 'colle' }).select().single();
  if (error) throw versReseau(error);
  return data;
}
// Avis coupé par Google : on garde le texte complet collé par Rafiza
export async function majTexteAvis(avisId, texte) {
  if (estDemo()) { const d = demoLire(); const a = d.avis.find(x => x.id === avisId); if (a) a.texte = texte; demoEcrire(d); return; }
  const { error } = await (await client()).from('ardv_avis').update({ texte }).eq('id', avisId);
  if (error) throw versReseau(error);
}
export async function marquerFait(avisId, texteReponse) {
  if (estDemo()) {
    const d = demoLire();
    const a = d.avis.find(x => x.id === avisId); if (a) a.statut = 'fait';
    if (texteReponse) d.reponses.unshift({ texte: texteReponse, cree: new Date().toISOString() });
    demoEcrire(d); return;
  }
  const c = await client();
  // Réponse vide = « j'y ai déjà répondu » ailleurs : on classe seulement le ticket
  if (texteReponse) {
    const r1 = await c.from('ardv_reponses').insert({ avis_id: avisId, texte: texteReponse });
    if (r1.error) throw versReseau(r1.error);
  }
  const r2 = await c.from('ardv_avis').update({ statut: 'fait' }).eq('id', avisId);
  if (r2.error) throw versReseau(r2.error);
}
export async function chargerExemples() {
  if (estDemo()) return DEMO_EXEMPLES;
  const { data, error } = await (await client()).from('ardv_exemples').select('texte');
  if (error) throw versReseau(error);
  const tous = data.map(x => x.texte);
  for (let i = tous.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [tous[i], tous[j]] = [tous[j], tous[i]]; }
  return tous.slice(0, 12);
}
export async function chargerReponsesRecentes() {
  if (estDemo()) return demoLire().reponses.slice(0, 30).map(r => r.texte);
  const { data, error } = await (await client()).from('ardv_reponses').select('texte').order('cree', { ascending: false }).limit(30);
  if (error) throw versReseau(error);
  return data.map(x => x.texte);
}

/* ---------- Posts ---------- */
// post : { id?, idee, textes: {google, instagram, facebook, nomFichier}, photos: [chemins] , rappel: ISO|null, statut }
export async function listerPosts() {
  if (estDemo()) {
    const d = demoLire();
    return (d.posts || []).sort((a, b) => b.numero - a.numero);
  }
  const { data, error } = await (await client()).from('ardv_posts').select('*').order('cree', { ascending: false }).limit(40);
  if (error) throw versReseau(error);
  return data;
}
export async function envoyerPhotos(photos) {
  // photos : [{ blob, url }] → chemins dans l'espace privé (en démo : les petites images elles-mêmes)
  if (estDemo()) return photos.map(p => p.url);
  const c = await client();
  const chemins = [];
  for (const p of photos) {
    const chemin = `posts/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const { error } = await c.storage.from('ardv-photos').upload(chemin, p.blob, { contentType: 'image/jpeg' });
    if (error) throw versReseau(error);
    chemins.push(chemin);
  }
  return chemins;
}
export async function urlsPhotos(chemins = []) {
  if (estDemo() || !chemins.length) return chemins;
  const { data, error } = await (await client()).storage.from('ardv-photos').createSignedUrls(chemins, 3600);
  if (error) throw versReseau(error);
  return data.map(x => x.signedUrl || null); // null : photo introuvable
}
export async function enregistrerPost(post) {
  const ligne = { idee: post.idee || '', textes: post.textes || {}, photos: post.photos || [], rappel: post.rappel || null, statut: post.statut || 'prevu' };
  // Le rappel ne repart que pour un nouveau post ou si sa date a changé (sinon il sonnerait deux fois)
  if (!post.id || post.rappelChange) ligne.rappel_envoye = false;
  if (estDemo()) {
    const d = demoLire(); d.posts = d.posts || [];
    if (post.id) Object.assign(d.posts.find(p => p.id === post.id) || {}, ligne);
    else { d.numeroPost = (d.numeroPost || 0) + 1; d.posts.push({ ...ligne, id: 'p' + d.numeroPost, numero: d.numeroPost, cree: new Date().toISOString() }); }
    demoEcrire(d); return;
  }
  const c = await client();
  const r = post.id ? await c.from('ardv_posts').update(ligne).eq('id', post.id) : await c.from('ardv_posts').insert(ligne);
  if (r.error) throw versReseau(r.error);
}
export async function marquerPublie(id) {
  if (estDemo()) { const d = demoLire(); const p = (d.posts || []).find(x => x.id === id); if (p) p.statut = 'publie'; demoEcrire(d); return; }
  const { error } = await (await client()).from('ardv_posts').update({ statut: 'publie' }).eq('id', id);
  if (error) throw versReseau(error);
}

/* ---------- Pubs (chiffres envoyés par le script Google Ads) ---------- */
const DEMO_PUBS = () => ({
  id: 1, recu: new Date(Date.now() - 20 * 60e3).toISOString(),
  donnees: {
    date: new Date().toISOString(),
    campagnes: [
      { nom: 'Semaine V2', statut: 'ENABLED', etat: 'ELIGIBLE', budget: 6, hier: { clics: 9, impressions: 210, cout: 6.1, conversions: 2, appels: 1 }, semaine: { clics: 51, cout: 38.4, conversions: 9, appels: 4 } },
      { nom: 'Weekend Dejeuner ARDV', statut: 'ENABLED', etat: 'LIMITED', budget: 7, hier: { clics: 14, impressions: 380, cout: 7, conversions: 3, appels: 2 }, semaine: { clics: 40, cout: 21, conversions: 6, appels: 3 } },
      { nom: 'Weekend Diner ARDV', statut: 'PAUSED', etat: 'PAUSED', budget: 5, hier: { clics: 0, cout: 0 }, semaine: { clics: 6, cout: 3.2, conversions: 0 } },
    ],
    termes: [{ terme: 'glace artisanale près de moi', clics: 12, cout: 7.9 }, { terme: 'crêperie saint-denis', clics: 9, cout: 5.4 }],
  },
});
export async function dernieresPubs() {
  if (estDemo()) { const d = demoLire(); return d.pubs || DEMO_PUBS(); }
  const { data, error } = await (await client()).from('ardv_pubs').select('*').order('id', { ascending: false }).limit(1).maybeSingle();
  if (error) throw versReseau(error);
  return data;
}
/* ---------- Notifications ---------- */
export async function enregistrerAbonnement(abonnement) {
  if (estDemo()) return;
  const c = await client();
  const { data } = await c.auth.getUser();
  const { error } = await c.from('ardv_push').upsert({ endpoint: abonnement.endpoint, email: data.user?.email || '', abonnement });
  if (error) throw versReseau(error);
}

/* ---------- IA ---------- */
// Lève Error('quota' | 'ia' | 'connexion' | 'interdit' | 'reseau')
export async function appelIA(demande) {
  if (estDemo()) {
    await pause(700);
    const erreur = params.get('erreur');
    if (erreur) throw new Error(erreur);
    if (/"titre"/.test(demande.system)) return JSON.stringify({ titre: 'Fermeture estivale', texte: 'Le Café Au Rendez-Vous sera fermé\ndu 10 au 24 août.\n\nRéouverture le mardi 25 août à 11h30.\nMerci de votre fidélité et bel été à tous !' });
    if (/Answer with the text only/.test(demande.system)) return 'Objet : Livraisons de café interrompues\n\nBonjour,\n\nDepuis trois semaines, nous ne recevons plus nos livraisons…\n\nBien cordialement,\nRafiza — Café Au Rendez-Vous';
    if (/"instagram"/.test(demande.system)) return JSON.stringify({
      google: "Une douceur maison vous attend aujourd'hui au Café Au Rendez-Vous, juste derrière la Basilique Cathédrale de Saint-Denis. Notre crème brûlée est préparée chaque matin, avec sa fine couche de sucre caramélisé qui craque sous la cuillère. Venez la goûter en terrasse, au calme de l'Allée des 6 Chapelles. On vous attend avec le sourire !",
      instagram: "Le petit craquement du caramel… 😍 Notre crème brûlée maison vous attend aujourd'hui, juste derrière la Basilique ✨\n\n#crêperiesaintdenis #saintdenis #basiliquesaintdenis #cremebrulee #faitmaison #galettesbretonnes #glacierartisanal #paris93",
      facebook: "Crème brûlée maison du jour 😋 Préparée ce matin, à savourer en terrasse derrière la Basilique de Saint-Denis. À tout à l'heure !",
      nomFichier: 'creme-brulee-maison-creperie-saint-denis.jpg',
    });
    const fr = !/\b(the|and|was|good|great|food)\b/i.test(demande.user);
    return fr
      ? "Merci beaucoup pour ce joli message ! 😊 C'est toujours un bonheur de vous accueillir dans notre petite crêperie, juste derrière la Basilique de Saint-Denis. On vous attend vite pour une nouvelle galette !\n\nL'équipe du Café Au Rendez-Vous\naurendezvous-saintdenis.fr"
      : "Thank you so much for your lovely words! 😊 Welcoming you to our little crêperie right behind the Basilique de Saint-Denis was a real pleasure. We can't wait to see you again for another galette!\n\nL'équipe du Café Au Rendez-Vous\naurendezvous-saintdenis.fr";
  }
  const c = await client();
  const { data } = await c.auth.getSession();
  if (!data.session) throw new Error('connexion');
  if (globalThis.navigator && !navigator.onLine) throw new Error('reseau');
  let r;
  try {
    r = await fetch(`${CFG.supabaseUrl}/functions/v1/ardv-ia`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}`, apikey: CFG.supabaseAnonKey },
      body: JSON.stringify(demande),
    });
  } catch { throw new Error('reseau'); }
  const corps = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(corps.erreur || 'ia');
  return corps.texte;
}
