// Écran Pubs : une carte par campagne (voyant + chiffres en mots simples), le résumé du coach du jour,
// une question au coach, et un bouton vers Google Ads. Lecture seule : rien n'est modifié dans le compte Ads.
import { t, getLang } from './i18n.js';
import { esc, toast, messageErreur, ICONES } from './ui.js';
import { voyant, ligneChiffres, buildCoachPrompt, euros } from './pubs.js';
import { lireImage } from './images.js';
import * as D from './donnees.js';

const URL_ADS = 'https://ads.google.com/aw/campaigns';
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
    ${pubs ? `<article class="ticket coach"><div class="ticket-tete"><span class="ticket-nom">${t('ads.coach')}</span></div><p class="ticket-texte" id="coach-texte">${pubs.coach && pubs.coach_date === new Date().toISOString().slice(0, 10) ? esc(pubs.coach) : `<span class="chargement">${t('ads.coachWriting')}</span>`}</p></article>` : ''}
    <ul class="pile">${campagnes.map(c => `<li><article class="ticket campagne">
      <div class="ticket-tete"><span class="voyant voyant-${voyant(c)}" aria-hidden="true"></span><span class="ticket-nom">${esc(c.nom)}</span></div>
      <p class="etat-campagne">${t('ads.state.' + voyant(c))}${c.budget ? ` · ${t('ads.budget', { b: euros(c.budget, langue) })}` : ''}</p>
      <p class="ligne-chiffres"><b>${t('ads.yesterday')}</b> ${esc(ligneChiffres(c.hier, langue))}</p>
      <p class="ligne-chiffres"><b>${t('ads.week')}</b> ${esc(ligneChiffres(c.semaine, langue))}</p>
    </article></li>`).join('')}</ul>
    <div class="action-fixe rangee-fixe">
      <a class="bouton bouton-trait bouton-sur-comptoir" href="${URL_ADS}" target="_blank" rel="noopener">${t('ads.open')}</a>
      <button type="button" class="bouton bouton-or" id="demander-coach">${ICONES.plume}${t('ads.ask')}</button>
    </div>`;

  main.querySelector('#demander-coach').addEventListener('click', () => ouvrirCoach(pubs));
  // Résumé du jour : une seule demande à l'IA par jour (formule gratuite)
  if (pubs && !(pubs.coach && pubs.coach_date === new Date().toISOString().slice(0, 10))) {
    const zone = main.querySelector('#coach-texte');
    try {
      const profil = await D.chargerProfil();
      const texte = await D.appelIA(buildCoachPrompt({ campagnes, termes: pubs.donnees?.termes, profil, langue }));
      zone.textContent = texte;
      D.enregistrerCoach(pubs.id, texte).catch(() => {});
    } catch (e) { zone.textContent = messageErreur(e); }
  }
}

function ouvrirCoach(pubs) {
  const etat = { question: '', image: null, reponse: '', erreur: '' };
  const feuille = document.createElement('div');
  feuille.className = 'feuille';
  feuille.setAttribute('role', 'dialog');
  feuille.setAttribute('aria-modal', 'true');
  feuille.setAttribute('aria-labelledby', 'c-titre');
  document.body.appendChild(feuille);
  document.body.style.overflow = 'hidden';
  const derriere = [document.getElementById('ecran'), document.querySelector('.onglets'), document.querySelector('.comptoir')];
  derriere.forEach(el => el && (el.inert = true));
  const fermer = () => { feuille.remove(); document.body.style.overflow = ''; derriere.forEach(el => el && (el.inert = false)); document.removeEventListener('keydown', echap); };
  const echap = e => { if (e.key === 'Escape') fermer(); };
  document.addEventListener('keydown', echap);

  const dessiner = (statut = '') => {
    feuille.innerHTML = `<article class="ticket">
      <div class="feuille-haut"><h2 id="c-titre">${t('ads.ask')}</h2><button type="button" class="fermer" aria-label="${t('reviews.close')}">×</button></div>
      <label class="champ"><span>${t('ads.question')}</span>
        <textarea id="c-question" rows="3" placeholder="${t('ads.questionPlaceholder')}">${esc(etat.question)}</textarea></label>
      <div class="rangee"><label class="bouton bouton-trait" for="c-image">${ICONES.photo}${t('reviews.photoBtn')}</label><input type="file" id="c-image" accept="image/*" hidden></div>
      ${etat.image ? `<div class="apercu-capture"><img src="${etat.image.url}" alt=""><span>${t('reviews.photoAdded')}</span></div>` : ''}
      ${etat.erreur ? `<p class="erreur" role="alert">${esc(etat.erreur)}</p>` : ''}
      ${statut === 'charge' ? `<p class="chargement" role="status">${t('ads.coachWriting')}</p>` : ''}
      ${etat.reponse ? `<div class="reponse">${esc(etat.reponse)}</div>` : ''}
      <button type="button" class="bouton bouton-or bouton-large" id="c-envoyer" ${statut === 'charge' ? 'disabled' : ''}>${t('ads.send')}</button>
    </article>`;
    const $ = s => feuille.querySelector(s);
    $('.fermer').addEventListener('click', fermer);
    $('#c-question').addEventListener('input', e => { etat.question = e.target.value; });
    $('#c-image').addEventListener('change', async e => { const f = e.target.files?.[0]; if (f) { try { etat.image = await lireImage(f); } catch { /* ignorée */ } dessiner(); } });
    $('#c-envoyer').addEventListener('click', async () => {
      if (!etat.question.trim() && !etat.image) { toast(t('ads.needQuestion')); return; }
      etat.erreur = ''; dessiner('charge');
      try {
        const profil = await D.chargerProfil();
        const demande = buildCoachPrompt({ campagnes: pubs?.donnees?.campagnes, termes: pubs?.donnees?.termes, question: etat.question + (etat.image ? '\n(Screenshot of her Google Ads screen attached.)' : ''), profil, langue: getLang() });
        etat.reponse = await D.appelIA(etat.image ? { ...demande, image: { mime: etat.image.mime, base64: etat.image.base64 } } : demande);
      } catch (e) { etat.erreur = messageErreur(e); }
      dessiner();
    });
  };
  dessiner();
}
