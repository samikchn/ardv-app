// Écran Écrire : modèles (affiches, e-mails, lettres) → quelques champs → texte prêt à copier, ou affiche à imprimer.
import { t, getLang } from './i18n.js';
import { esc, toast, messageErreur, copier, ICONES } from './ui.js';
import { MODELES, buildEcrirePrompt, lireAffiche } from './ecrire-prompt.js';
import * as D from './donnees.js';

export function afficherEcrire(main) {
  main.innerHTML = `
    <h1 class="titre-ecran">${t('write.title')}</h1>
    <p class="sous-titre">${t('write.intro')}</p>
    <ul class="pile">${MODELES.map((m, i) => `<li><article class="ticket modele" role="button" tabindex="0" data-modele="${m.id}">
      <div class="ticket-tete"><span class="ticket-num">${String(i + 1).padStart(2, '0')}</span><span class="ticket-nom">${t('write.m.' + m.id)}</span></div>
      <p class="ticket-texte">${t('write.d.' + m.id)}</p>
    </article></li>`).join('')}</ul>`;
  main.querySelectorAll('[data-modele]').forEach(el => {
    const ouvrir = () => ouvrirModele(MODELES.find(m => m.id === el.dataset.modele));
    el.addEventListener('click', ouvrir);
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ouvrir(); } });
  });
}

function ouvrirModele(modele) {
  const etat = { valeurs: {}, resultat: null, erreur: '', noirBlanc: true };
  const feuille = document.createElement('div');
  feuille.className = 'feuille';
  feuille.setAttribute('role', 'dialog');
  feuille.setAttribute('aria-modal', 'true');
  feuille.setAttribute('aria-labelledby', 'e-titre');
  document.body.appendChild(feuille);
  document.body.style.overflow = 'hidden';
  const derriere = [document.getElementById('ecran'), document.querySelector('.onglets'), document.querySelector('.comptoir')];
  derriere.forEach(el => el && (el.inert = true));
  const fermer = () => { feuille.remove(); document.body.style.overflow = ''; derriere.forEach(el => el && (el.inert = false)); document.removeEventListener('keydown', echap); };
  const echap = e => { if (e.key === 'Escape') fermer(); };
  document.addEventListener('keydown', echap);

  const dessiner = (statut = '') => {
    const r = etat.resultat;
    feuille.innerHTML = `<article class="ticket">
      <div class="feuille-haut"><h2 id="e-titre">${t('write.m.' + modele.id)}</h2><button type="button" class="fermer" aria-label="${t('reviews.close')}">×</button></div>
      ${modele.champs.map(([k, type]) => `<label class="champ"><span>${t('write.f.' + k)}</span>
        ${type === 'texte' ? `<textarea data-champ="${k}" rows="3">${esc(etat.valeurs[k] || '')}</textarea>` : `<input data-champ="${k}" value="${esc(etat.valeurs[k] || '')}">`}</label>`).join('')}
      ${etat.erreur ? `<p class="erreur" role="alert">${esc(etat.erreur)}</p>` : ''}
      ${statut === 'charge' ? `<p class="chargement" role="status">${t('write.writing')}</p>` : ''}
      <button type="button" class="bouton ${r ? 'bouton-trait' : 'bouton-or'} bouton-large" id="e-ecrire" ${statut === 'charge' ? 'disabled' : ''}>${ICONES.plume}${r ? t('posts.rewrite') : t('write.write')}</button>
      ${r && modele.affiche ? `
        <label class="case"><input type="checkbox" id="e-nb" ${etat.noirBlanc ? 'checked' : ''}>${t('write.bw')}</label>
        <div class="affiche${etat.noirBlanc ? ' nb' : ''}" id="affiche"><p class="affiche-nom">Café Au Rendez-Vous</p><h3>${esc(r.titre)}</h3><p class="affiche-texte">${esc(r.texte)}</p><p class="affiche-pied">Crêperie &amp; Glacier Artisanaux · Saint-Denis</p></div>
        <button type="button" class="bouton bouton-or bouton-large" id="e-imprimer">${t('write.print')}</button>` : ''}
      ${r && !modele.affiche ? `
        <textarea class="reponse post-texte" id="e-texte" rows="12">${esc(r)}</textarea>
        <button type="button" class="bouton bouton-or bouton-large" id="e-copier">${ICONES.copier}${t('reviews.copy')}</button>` : ''}
    </article>`;
    const $ = s => feuille.querySelector(s);
    $('.fermer').addEventListener('click', fermer);
    feuille.querySelectorAll('[data-champ]').forEach(z => z.addEventListener('input', () => { etat.valeurs[z.dataset.champ] = z.value; }));
    $('#e-ecrire').addEventListener('click', ecrire);
    $('#e-texte')?.addEventListener('input', e => { etat.resultat = e.target.value; });
    $('#e-copier')?.addEventListener('click', async () => toast((await copier(etat.resultat)) ? t('reviews.copied') : t('reviews.copyFailed')));
    $('#e-imprimer')?.addEventListener('click', imprimer);
    $('#e-nb')?.addEventListener('change', e => { etat.noirBlanc = e.target.checked; dessiner(); });
  };

  const ecrire = async () => {
    if (!Object.values(etat.valeurs).some(v => String(v).trim())) { toast(t('write.needFields')); return; }
    etat.erreur = '';
    dessiner('charge');
    try {
      const profil = await D.chargerProfil();
      const texte = await D.appelIA(buildEcrirePrompt(modele.id, etat.valeurs, profil, getLang()));
      etat.resultat = modele.affiche ? lireAffiche(texte) : texte;
    } catch (e) { etat.erreur = e.message === 'réponse illisible' ? t('err.ia') : messageErreur(e); }
    dessiner();
  };

  // Impression A4 (ou « Enregistrer en PDF ») : seule l'affiche est imprimée
  const imprimer = () => {
    const copie = feuille.querySelector('#affiche').cloneNode(true);
    copie.id = 'affiche-impression';
    document.body.appendChild(copie);
    const nettoyer = () => { copie.remove(); window.removeEventListener('afterprint', nettoyer); };
    window.addEventListener('afterprint', nettoyer);
    window.print();
    setTimeout(nettoyer, 60e3);
  };

  dessiner();
}
