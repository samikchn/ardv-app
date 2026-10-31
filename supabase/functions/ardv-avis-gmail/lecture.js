// Lit un e-mail Google « nouvel avis » (version texte) et en sort les avis : nom, étoiles, début du texte, lien.
// Pur : testé avec node --test. Format vérifié sur les vrais e-mails Google reçus le 31/10/2026 :
// paragraphes séparés par des lignes vides, lignes longues coupées (finissant par deux espaces), lien seul sur sa ligne.

// Une ligne « Répondre … » termine chaque avis ; son lien mène à la réponse sur Google.
const REPONDRE = /^(répondre( aux avis| à l'avis| à l’avis)?|reply( to review)?)\s*(<[^>]*>)?\s*$/i;
// Lignes qui ne font jamais partie d'un avis
const BORNES = [
  /vous avez reçu un nouvel avis/i, /you('ve| have) (got|received) a new review/i,
  /^lire l['’]avis/i, /^read (the )?review/i,
  /^voici (un|des) avis auquel/i, /^here('s| is| are) .*review/i,
  /^répondre aux avis des clients/i, /^replying to reviews/i,
  /^répondez publiquement/i, /^les avis peuvent/i, /^nous (ferons|informerons)/i, /^afficher tous les avis/i,
  /^votre établissement a récemment reçu/i, /^\d+ avis avec \d/i, /^see all reviews/i, /^we('ll| will) let/i,
];
const LIEN_SEUL = /^<https?:[^>]+>$/;

// Seuls les liens vers Google sont gardés (un e-mail piégé ne doit pas mener vers une fausse page de connexion)
const estHoteGoogle = h => h === 'google.com' || h.endsWith('.google.com') || h === 'g.page';
const lienDe = ligne => {
  const m = ligne.match(/<(https:\/\/[^>\s]+)>/);
  if (!m) return null;
  try { return estHoteGoogle(new URL(m[1]).hostname) ? m[1] : null; } catch { return null; }
};

// L'e-mail doit venir de Google (adresse @google.com ou @*.google.com)
export function estExpediteurGoogle(de) {
  const m = String(de || '').match(/<?([^<>\s]+@([^<>\s]+?))>?\s*$/);
  return !!m && estHoteGoogle(m[2].toLowerCase());
}

export function cleAvis(auteur, texte) {
  const norme = s => String(s || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  return (norme(auteur) + '|' + norme(texte).slice(0, 60)).slice(0, 120);
}

export function lireEmailAvis({ sujet = '', texte = '' }) {
  // Recoller les lignes coupées (Google termine une ligne coupée par deux espaces), puis découper en paragraphes
  const propre = String(texte).replace(/\r/g, '').replace(/[ \t]{2,}\n(?=\S)/g, ' ');
  // Une ligne « Répondre… » ou de Google forme toujours un paragraphe à elle seule, même sans ligne vide autour
  const isolee = propre.split('\n').map(l => (REPONDRE.test(l.trim()) || BORNES.some(re => re.test(l.trim())) ? `\n${l}\n` : l)).join('\n');
  const paragraphes = isolee.split(/\n\s*\n/).map(p => p.split('\n').map(l => l.trim()).filter(Boolean).join('\n')).filter(Boolean);
  const avis = [];
  let bloc = [];
  for (const para of paragraphes) {
    if (LIEN_SEUL.test(para)) continue;
    if (REPONDRE.test(para)) {
      // Le nom est la première ligne du bloc, le reste est le texte de l'avis
      const lignes = bloc.join('\n\n').split('\n');
      const auteur = (lignes.shift() || '').trim();
      const corps = lignes.join('\n').replace(/^\n+/, '').trim();
      if (auteur && corps && auteur.length <= 60) avis.push({ auteur, texte: corps, lien: lienDe(para), etoiles: null });
      bloc = [];
      continue;
    }
    if (BORNES.some(re => re.test(para))) { bloc = []; continue; }
    bloc.push(para);
  }
  // Étoiles : « nouvel avis avec 5 étoile(s) » (sujet ou corps) pour le premier avis ;
  // résumé « 2 avis avec 5 étoiles » : la même note pour tous quand le compte correspond.
  const nouvel = (String(sujet).match(/(\d)\s*étoile|(\d)[- ]star/i) || propre.match(/nouvel avis avec (\d)/i) || []).slice(1).find(Boolean);
  if (avis.length && nouvel) avis[0].etoiles = Math.min(5, +nouvel);
  const resumes = [...propre.matchAll(/(\d+) avis avec (\d) étoiles?/gi)];
  if (resumes.length === 1 && +resumes[0][1] === avis.length) avis.forEach(a => { a.etoiles = Math.min(5, +resumes[0][2]); });
  return avis.map(a => ({ ...a, cle: cleAvis(a.auteur, a.texte) }));
}
