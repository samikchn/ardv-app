// Le « cerveau » des avis : nettoie un avis collé et prépare la demande à l'IA.
// Pur (pas de réseau) : testé avec node --test.

import { contexteRestaurant } from './profil.js';

// Lignes parasites copiées avec l'avis (Google, TripAdvisor, Gmail…). Ancrées strictement :
// une phrase du client ne doit jamais être prise pour un reste de page.
const PARASITES = [
  /^répondre( aux avis| à l'avis)?$/i, /^reply$/i, /^lire (la suite|l'avis|plus)$/i, /^read more$/i,
  /^(plus|more)$/i, /^utile$/i, /^helpful$/i, /^partager$/i, /^share$/i, /^j'aime$/i, /^like$/i,
  /^(il y a (un|une|\d+)|\d+|a|an|one) (jours?|semaines?|mois|ans?|days?|weeks?|months?|years?)( ago)?$/i,
  /^nouveau$/i, /^new$/i, /^local guide( · \d+ (avis|reviews?))?( · \d+ photos?)?$/i,
  /^\d+ avis$/i, /^\d+ reviews?$/i, /^\d+ photos?$/i,
  /^voir l'original.*$/i, /^see original.*$/i, /^traduit par google$/i,
];
const LIGNE_ETOILES = /^[★☆⭐\uFE0F\s]+$/;
const MARQUE_TRADUCTION = /\((?:Translated by Google|Traduit par Google)\)\s*/i;
const MARQUE_ORIGINAL = /\((?:Original|Texte d'origine|Version originale)\)\s*/i;

export function nettoyerAvis(brut = '') {
  const lignes = String(brut).replace(/\r/g, '').split('\n').map(l => l.trim());

  // 1. En-tête : nom + étoiles, lus AVANT de couper la traduction
  let etoiles;
  let auteur;
  const reste = [];
  lignes.forEach((l, i) => {
    if (l && LIGNE_ETOILES.test(l)) {
      if (!etoiles) etoiles = Math.min(5, (l.match(/[★⭐]/g) || []).length) || undefined;
      return;
    }
    const suivante = lignes[i + 1] || '';
    if (!auteur && l && l.length <= 40 && suivante && LIGNE_ETOILES.test(suivante)) { auteur = l; return; }
    reste.push(l);
  });

  // 2. Traduction Google : on garde l'original quand il est là
  let texte = reste.join('\n').trim();
  let traduit = false;
  let traductionSeule = false;
  if (MARQUE_TRADUCTION.test(texte)) {
    traduit = true;
    const morceaux = texte.split(MARQUE_ORIGINAL);
    if (morceaux.length > 1) texte = morceaux.slice(1).join('\n').trim();
    else { texte = texte.replace(MARQUE_TRADUCTION, ''); traductionSeule = true; }
  }

  // 3. Restes de page
  texte = texte.split('\n').filter(l => !PARASITES.some(re => re.test(l.trim()))).join('\n')
    .replace(/\n{3,}/g, '\n\n').trim();

  const r = { texte, traduit };
  if (traductionSeule) r.traductionSeule = true;
  if (etoiles) r.etoiles = etoiles;
  if (auteur) r.auteur = auteur;
  return r;
}

// Les e-mails de Google ne donnent que le début des longs avis, terminé par « ... »
export const estCoupe = texte => /(\.\.\.|…)\s*$/.test(String(texte || ''));

export function debutsRecents(reponses = [], n = 30) {
  return reponses.slice(0, n).map(r => String(r).trim().split(/\s+/).slice(0, 6).join(' ')).filter(Boolean);
}

export function buildReviewPrompt({ avis, souvenir = '', profil, exemples = [], recentes = [], variante = 0, signerRafiza = false, avecCapture = false }) {
  const signature = signerRafiza ? 'Rafiza' : (profil.signature || "L'équipe du Café Au Rendez-Vous");
  const regles = [
    'You write the public reply of the restaurant to one customer review.',
    'Write in the same language as the review (French, English, Italian, German, Spanish, Norwegian…). If there is no text, reply in French.',
    'Warm, spontaneous, human. It must never sound written by an AI: no structure, no bullet points, no clichés, no exclamation marks in every sentence.',
    'Short: 2 to 5 sentences. End by inviting the customer to come back.',
    `Weave in naturally (never as a list) a few of these words for local Google search: ${(profil.motsCles || []).join(', ')}.`,
    'Thank the customer in a different way every time. Use the first name of the reviewer when it is known.',
    'If the review has only stars and no text, still thank warmly and personally (only stars is not a reason to be short or cold).',
    'Mention "Local Guide" or the reviewer\'s photos only if the review explicitly says so.',
    'If the review is negative: apologise honestly, without defending yourself or making excuses, and say what will be done.',
    'If team members are named (for example ' + (profil.equipe || []).join(', ') + '), thank them by name.',
    `Our motto, to let shine through, never quote: ${profil.devise || ''}`,
    signerRafiza
      ? 'Sign the reply "Rafiza" (the owner, personally), then the website on its own line.'
      : `Sign the reply "${signature}", then the website on its own line.`,
    `Website to put on the last line: ${profil.site || ''}`,
    'Answer with the reply text only, nothing before or after.',
  ];
  if (variante > 0) regles.push('This is another version: take a clearly different angle and different wording from the usual.');

  let system = regles.map(r => '- ' + r).join('\n');
  system += '\n\nAbout the restaurant:\n' + contexteRestaurant(profil);
  if (exemples.length) system += '\n\nReal replies the owner liked (match this tone, never copy them):\n' + exemples.map(e => '« ' + e + ' »').join('\n');
  if (recentes.length) system += '\n\nDo NOT start the reply like any of these recent replies:\n' + recentes.map(e => '- ' + e).join('\n');

  const morceaux = [];
  if (avis.auteur) morceaux.push('Reviewer: ' + avis.auteur);
  if (avis.etoiles) morceaux.push('Stars: ' + avis.etoiles + '/5');
  if (avis.texte) morceaux.push('Review text: ' + avis.texte);
  if (estCoupe(avis.texte)) morceaux.push('(This text was cut by Google: only the beginning is known. Reply warmly to what is written, never guess or invent what comes after.)');
  else if (avecCapture) morceaux.push('The review is in the attached screenshot: read the name, the stars and the text, then reply to it.');
  else morceaux.push('Review text: (no text, only stars)');
  if (avis.traductionSeule) morceaux.push("(This is Google's translation, the original was not copied: the customer's language is unknown. Reply in French, warmly, with one short sentence in English.)");
  else if (avis.traduit) morceaux.push('(The review was shown translated by Google; the text above is the original.)');
  if (souvenir) morceaux.push('The owner remembers this customer: ' + souvenir);
  return { system, user: morceaux.join('\n') };
}
