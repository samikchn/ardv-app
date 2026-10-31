// Écran Pubs : une carte par campagne (voyant + chiffres en mots simples), un bouton vers Google Ads,
// et « Demander à Claude » : la question est préparée avec les vrais chiffres, puis ouverte dans son Claude habituel
// (qui connaît tout son historique : bien meilleur qu'un coach sans contexte). Lecture seule : rien n'est modifié.
import { t, getLang } from './i18n.js';
import { esc, toast, messageErreur, copier, ICONES } from './ui.js';
import { voyant, ligneChiffres, questionPourClaude, euros } from './pubs.js';
import * as D from './donnees.js';

const URL_ADS = 'https://ads.google.com/aw/campaigns';
const URL_CLAUDE = 'https://claude.ai/new';
const ilYa = iso => {
  const min = Math.round((Date.now() - new Date(iso)) / 60e3);
  if (min < 60) return t('ads.minutesAgo', { n: Math.max(1, min) });
  const h = Math.round(min / 60);
  return h < 48 ? t('ads.hoursAgo', { n: h }) : new Date(iso).toLocaleDateString(getLang() === 'fr' ? 'fr-FR' : 'en-GB');
};

export async function afficherPubs(main) {
  let pubs = null;
  let erreur = '';
  try { pubs = await D.dernieresPubs(); } catch (e) { erreur = messageErreur(e); }
  const campagnes = pubs?.donnees?.campagnes || [];
  const langue = getLang();
  main.innerHTML = `
    <h1 class="titre-ecran">${t('ads.title')}</h1>
    <p class="sous-titre">${pubs ? t('ads.updated', { quand: ilYa(pubs.recu) }) : t('ads.intro')}</p>
    ${erreur ? `<p class="erreur">${esc(erreur)}</p>` : ''}
    ${!pubs && !erreur ? `<p class="vide">${t('ads.empty')}</p>` : ''}
    <ul class="pile">${campagnes.map(c => `<li><article class="ticket campagne">
      <div class="ticket-tete"><span class="voyant voyant-${voyant(c)}" aria-hidden="true"></span><span class="ticket-nom">${esc(c.nom)}</span></div>
      <p class="etat-campagne">${t('ads.state.' + voyant(c))}${c.budget ? ` · ${t('ads.budget', { b: euros(c.budget, langue) })}` : ''}</p>
      <p class="ligne-chiffres"><b>${t('ads.yesterday')}</b> ${esc(ligneChiffres(c.hier, langue))}</p>
      <p class="ligne-chiffres"><b>${t('ads.week')}</b> ${esc(ligneChiffres(c.semaine, langue))}</p>
    </article></li>`).join('')}</ul>
    <div class="action-fixe rangee-fixe">
      <a class="bouton bouton-trait bouton-sur-comptoir" href="${URL_ADS}" target="_blank" rel="noopener">${t('ads.open')}</a>
      <button type="button" class="bouton bouton-or" id="demander-claude">${ICONES.plume}${t('ads.askClaude')}</button>
    </div>`;

  main.querySelector('#demander-claude').addEventListener('click', () => ouvrirQuestion(pubs));
}

function ouvrirQuestion(pubs) {
  const feuille = document.createElement('div');
  feuille.className = 'feuille';
  feuille.setAttribute('role', 'dialog');
  feuille.setAttribute('aria-modal', 'true');
  feuille.setAttribute('aria-labelledby', 'q-titre');
  document.body.appendChild(feuille);
  document.body.style.overflow = 'hidden';
  const derriere = [document.getElementById('ecran'), document.querySelector('.onglets'), document.querySelector('.comptoir')];
  derriere.forEach(el => el && (el.inert = true));
  const fermer = () => { feuille.remove(); document.body.style.overflow = ''; derriere.forEach(el => el && (el.inert = false)); document.removeEventListener('keydown', echap); };
  const echap = e => { if (e.key === 'Escape') fermer(); };
  document.addEventListener('keydown', echap);

  feuille.innerHTML = `<article class="ticket">
    <div class="feuille-haut"><h2 id="q-titre">${t('ads.askClaude')}</h2><button type="button" class="fermer" aria-label="${t('reviews.close')}">×</button></div>
    <p class="aide">${t('ads.claudeIntro')}</p>
    <label class="champ"><span>${t('ads.question')}</span>
      <textarea id="q-question" rows="3" placeholder="${t('ads.questionPlaceholder')}"></textarea></label>
    <button type="button" class="bouton bouton-or bouton-large" id="q-ouvrir">${t('ads.openClaude')}</button>
  </article>`;
  feuille.querySelector('.fermer').addEventListener('click', fermer);
  feuille.querySelector('#q-ouvrir').addEventListener('click', async () => {
    const texte = questionPourClaude({ campagnes: pubs?.donnees?.campagnes, termes: pubs?.donnees?.termes, question: feuille.querySelector('#q-question').value.trim(), langue: getLang() });
    await copier(texte); // au cas où Claude n'aurait pas repris la question : elle n'a qu'à coller
    window.open(`${URL_CLAUDE}?q=${encodeURIComponent(texte)}`, '_blank', 'noopener');
    toast(t('ads.claudeHint'));
    fermer();
  });
  feuille.querySelector('#q-question').focus();
}
