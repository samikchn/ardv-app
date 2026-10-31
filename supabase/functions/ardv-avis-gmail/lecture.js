// Lit un e-mail Google « nouvel avis » (version texte) et en sort les avis : nom, étoiles, début du texte, lien.
// Pur : testé avec node --test. Format reconstitué depuis une capture : à ajuster sur les vrais e-mails reçus.

// Une ligne « Répondre … » termine chaque avis ; son lien mène à la réponse sur Google.
const REPONDRE = /^(répondre( aux avis| à l'avis| à l’avis)?|reply( to review)?)\s*(<[^>]*>)?\s*$/i;
// Lignes qui ne font jamais partie d'un avis
const BORNES = [
  /vous avez reçu un nouvel avis/i, /you('ve| have) (got|received) a new review/i,
  /^lire l['’]avis/i, /^read (the )?review/i,
  /^voici (un|des) avis auquel/i, /^here('s| is| are) .*review/i,
  /^répondre aux avis des clients/i, /^replying to reviews/i,
];

const lienDe = ligne => {
  const m = ligne.match(/<(https:\/\/[^>\s]+)>/);
  return m ? m[1] : null;
};

export function cleAvis(auteur, texte) {
  const norme = s => String(s || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  return (norme(auteur) + '|' + norme(texte).slice(0, 60)).slice(0, 120);
}

export function lireEmailAvis({ sujet = '', texte = '' }) {
  const etoilesSujet = (String(sujet).match(/(\d)\s*étoile|(\d)[- ]star/i) || []).slice(1).find(Boolean);
  const lignes = String(texte).replace(/\r/g, '').split('\n').map(l => l.trim());
  const avis = [];
  let bloc = [];
  for (const ligne of lignes) {
    if (REPONDRE.test(ligne)) {
      const utiles = bloc.filter(Boolean);
      if (utiles.length >= 2) {
        const [auteur, ...reste] = utiles;
        avis.push({ auteur, texte: reste.join('\n'), lien: lienDe(ligne), etoiles: null });
      }
      bloc = [];
      continue;
    }
    if (BORNES.some(re => re.test(ligne))) { bloc = []; continue; }
    bloc.push(ligne);
  }
  // Les étoiles du sujet concernent le nouvel avis : le premier de l'e-mail
  if (avis.length && etoilesSujet) avis[0].etoiles = Math.min(5, +etoilesSujet);
  return avis.map(a => ({ ...a, cle: cleAvis(a.auteur, a.texte) }));
}
