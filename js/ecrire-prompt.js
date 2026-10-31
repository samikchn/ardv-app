// Écrire : modèles d'affiches, e-mails et lettres. Pur : testé avec node --test.
// Consignes tirées des conversations de Rafiza (affiches d'horaires, fermeture d'été, Cafés Folliet, UNIITÉ…).

import { contexteRestaurant } from './profil.js';

// champs : [clé, type] — les libellés sont dans i18n (write.f.<clé>)
export const MODELES = [
  { id: 'affiche-horaires', affiche: true, champs: [['horaires', 'texte'], ['depuis', 'ligne']],
    consigne: 'A shop-window poster announcing the opening hours. Big clear title, the hours laid out day by day, one warm sentence.' },
  { id: 'affiche-fermeture', affiche: true, champs: [['du', 'ligne'], ['au', 'ligne'], ['motif', 'ligne']],
    consigne: 'A shop-window poster announcing a temporary closure: dates very visible, reopening date, a warm thank-you to customers.' },
  { id: 'email-fournisseur', champs: [['fournisseur', 'ligne'], ['probleme', 'texte']],
    consigne: 'An email to a supplier about a problem. Firm and precise in the requests (what, by when), but respectful and collaborative in the closing.' },
  { id: 'email-uniite', champs: [['sujet', 'texte']],
    consigne: 'An email to UNIITÉ, the agency that manages the website, asking them to publish a new blog article WITHOUT deleting the previous ones. Include the full article (150-250 words, warm, local SEO) and, clearly labelled: Balise Title, Meta Description, photo file name, ALT text.' },
  { id: 'lettre-client', champs: [['client', 'ligne'], ['contexte', 'texte']],
    consigne: 'A letter or email to a customer (group booking, thanks, answer to a request). Warm, personal, clear on practical details.' },
  { id: 'offre-emploi', champs: [['poste', 'ligne'], ['details', 'texte']],
    consigne: 'A short job offer for the restaurant, friendly and clear: tasks, days/hours if given, how to apply. Never invent a salary.' },
];

export function buildEcrirePrompt(id, valeurs = {}, profil, langue = 'fr') {
  const m = MODELES.find(x => x.id === id);
  if (!m) throw new Error('modèle inconnu');
  const regles = [
    `Write in ${langue === 'fr' ? 'French' : 'English'}, in the owner's name (Rafiza, Café Au Rendez-Vous).`,
    m.consigne,
    'Short, warm, simple, human: it must never sound written by an AI. No bullet points unless the text is a list of hours.',
    'Never invent facts (prices, dates, names, promises) that are not given below or in the restaurant facts.',
    m.affiche
      ? 'Answer ONLY with a JSON object: {"titre": "short big title", "texte": "the poster text, line breaks allowed"}'
      : 'Answer with the text only (subject line first if it is an email: "Objet : …"), nothing before or after.',
  ];
  const system = regles.map(r => '- ' + r).join('\n') + '\n\nAbout the restaurant:\n' + contexteRestaurant(profil);
  const user = m.champs.map(([k]) => `${k}: ${valeurs[k] || '(not given)'}`).join('\n');
  return { system, user };
}

export function lireAffiche(texte) {
  const brut = String(texte || '');
  const d = brut.indexOf('{'), f = brut.lastIndexOf('}');
  if (d < 0 || f <= d) throw new Error('réponse illisible');
  try {
    const o = JSON.parse(brut.slice(d, f + 1));
    if (!o.titre && !o.texte) throw new Error();
    return { titre: String(o.titre || '').trim(), texte: String(o.texte || '').trim() };
  } catch { throw new Error('réponse illisible'); }
}
