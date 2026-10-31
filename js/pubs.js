// Pubs Google Ads : chiffres en mots simples et demande au coach. Pur : testé avec node --test.
// Règles du coach tirées des conversations de Rafiza (mai–sept. 2026).

import { contexteRestaurant } from './profil.js';

const ROUGE = ['PAUSED', 'REMOVED', 'NOT_ELIGIBLE', 'ENDED', 'NOT_STARTED', 'PENDING'];
const ORANGE = ['LIMITED', 'LEARNING', 'MISCONFIGURED'];

export function voyant({ statut, etat }) {
  if (statut !== 'ENABLED' || ROUGE.includes(etat)) return 'rouge';
  if (ORANGE.includes(etat)) return 'orange';
  return 'vert';
}

export const euros = (n, langue = 'fr') =>
  new Intl.NumberFormat(langue === 'fr' ? 'fr-FR' : 'en-GB', { style: 'currency', currency: 'EUR' }).format(+n || 0).replace(/ | /g, ' ');

export function ligneChiffres(p = {}, langue = 'fr') {
  const mot = (n, fr, frs, en, ens) => `${n} ${langue === 'fr' ? (n > 1 ? frs : fr) : (n === 1 ? en : ens)}`;
  const morceaux = [mot(+p.clics || 0, 'clic', 'clics', 'click', 'clicks'), euros(p.cout, langue)];
  if (+p.appels > 0) morceaux.push(mot(+p.appels, 'appel', 'appels', 'call', 'calls'));
  return morceaux.join(' · ');
}

export function buildCoachPrompt({ campagnes = [], termes = [], question = '', profil, langue = 'fr' }) {
  const regles = [
    'You are the Google Ads coach of a small crêperie. The owner is not technical: explain like to a ten-year-old, short, one step at a time, with the exact French names of the Google Ads menus.',
    `Answer in ${langue === 'fr' ? 'French' : 'English'}.`,
    'Her rules, always respected: manual CPC only; never recommend Smart campaigns, automatic bidding (Maximize clicks/conversions) or AI Max — she lost money with them.',
    'Keywords in exact match (with brackets); Display Network and Search Partners off; location targeting close to the restaurant.',
    'Usual bids: 0.60 € to 0.90 €. Excluded keywords already decided: réunion, 974, livraison, uber eats, deliveroo, recette, emploi, stade de france.',
    '"glace artisanale" is her best keyword; the Basilique de Saint-Denis attracts better than the Stade de France.',
    'Base every statement on the figures given. If a figure is missing, say so instead of guessing. Never invent figures.',
    'If everything is fine, say it in one sentence. Otherwise give at most 3 concrete actions, most useful first.',
  ];
  const system = regles.map(r => '- ' + r).join('\n') + '\n\nAbout the restaurant:\n' + contexteRestaurant(profil);
  const lignes = campagnes.map(c => `- ${c.nom}: état ${c.statut}/${c.etat}, budget ${c.budget ?? '?'} €/jour, hier ${JSON.stringify(c.hier || {})}, 7 jours ${JSON.stringify(c.semaine || {})}`);
  const t = termes.slice(0, 15).map(x => `- "${x.terme}" : ${x.clics} clics, ${x.cout} €`);
  const user = [
    'Campaigns:', ...(lignes.length ? lignes : ['(no data)']),
    'Top search terms (7 days):', ...(t.length ? t : ['(no data)']),
    question ? `Her question: ${question}` : 'Give a short daily summary.',
  ].join('\n');
  return { system, user };
}
