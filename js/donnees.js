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
const DEMO_CLE = 'ardv-demo';
const DEMO_INITIAL = () => ({
  profil: null,
  numero: 41,
  avis: [
    { id: 'd1', numero: 41, auteur: 'Mark Redmond', etoiles: 5, texte: "Worthy of its 5 star review. Not because the food is exceptional although it's good. I allocate 5 stars for the welcome.", statut: 'fait', cree: new Date(Date.now() - 864e5).toISOString() },
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
export async function envoyerCode(email) {
  const { error } = await (await client()).auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: false } });
  if (error) throw versReseau(error);
}
export async function verifierCode(email, code) {
  const { error } = await (await client()).auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: 'email' });
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
    c.from('ardv_avis').select('*').eq('statut', 'a_repondre').order('cree', { ascending: false }),
    c.from('ardv_avis').select('*').eq('statut', 'fait').order('cree', { ascending: false }).limit(10),
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
export async function marquerFait(avisId, texteReponse) {
  if (estDemo()) {
    const d = demoLire();
    const a = d.avis.find(x => x.id === avisId); if (a) a.statut = 'fait';
    d.reponses.unshift({ texte: texteReponse, cree: new Date().toISOString() }); demoEcrire(d); return;
  }
  const c = await client();
  const r1 = await c.from('ardv_reponses').insert({ avis_id: avisId, texte: texteReponse });
  if (r1.error) throw versReseau(r1.error);
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

/* ---------- IA ---------- */
// Lève Error('quota' | 'ia' | 'connexion' | 'interdit' | 'reseau')
export async function appelIA(demande) {
  if (estDemo()) {
    await pause(700);
    const erreur = params.get('erreur');
    if (erreur) throw new Error(erreur);
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
