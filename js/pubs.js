// Pubs Google Ads : chiffres en mots simples et demande au coach. Pur : testé avec node --test.
// Règles du coach tirées des conversations de Rafiza (mai–sept. 2026).

const ROUGE = ['PAUSED', 'REMOVED', 'NOT_ELIGIBLE', 'ENDED', 'NOT_STARTED', 'PENDING'];
const ORANGE = ['LIMITED', 'LEARNING', 'MISCONFIGURED'];

// Date du jour en heure locale (AAAA-MM-JJ) : le résumé du coach est fait une fois par jour
export const jourLocal = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

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

// Le coaching se fait avec son Claude habituel (qui connaît tout son historique) :
// l'appli prépare juste la question avec les vrais chiffres, prête à coller.
export function questionPourClaude({ campagnes = [], termes = [], question = '', langue = 'fr' }) {
  const fr = langue === 'fr';
  const lignes = campagnes.map(c => `- ${c.nom} (${fr ? { vert: 'tourne', orange: 'limitée', rouge: 'arrêtée' }[voyant(c)] : voyant(c)}, budget ${euros(c.budget, langue)}/${fr ? 'jour' : 'day'}) : ${fr ? 'hier' : 'yesterday'} ${ligneChiffres(c.hier, langue)} ; 7 ${fr ? 'jours' : 'days'} ${ligneChiffres(c.semaine, langue)}`);
  const t = termes.slice(0, 10).map(x => `- « ${x.terme} » : ${x.clics} clics, ${euros(x.cout, langue)}`);
  return [
    fr ? 'Voici les chiffres de mes campagnes Google Ads (Café Au Rendez-Vous) :' : 'Here are my Google Ads campaign figures (Café Au Rendez-Vous):',
    ...(lignes.length ? lignes : [fr ? '(pas encore de chiffres)' : '(no figures yet)']),
    ...(t.length ? ['', fr ? 'Ce que les gens ont tapé (7 jours) :' : 'Search terms (7 days):', ...t] : []),
    '',
    question || (fr ? 'Que dois-je changer ? Explique-moi simplement, étape par étape, en respectant mes règles habituelles.' : 'What should I change? Explain simply, step by step, following my usual rules.'),
  ].join('\n');
}
