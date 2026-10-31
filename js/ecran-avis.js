// Écran Avis : la pile de tickets, et le ticket ouvert (coller → réponse → Copier / Autre version / Fait).
import { t } from './i18n.js';
import { esc, etoiles, numero, toast, messageErreur, copier, ICONES } from './ui.js';
import { nettoyerAvis, buildReviewPrompt, debutsRecents, estCoupe } from './avis-prompt.js';
import { sauverBrouillon, lireBrouillon, effacerBrouillon } from './brouillon.js';
import * as D from './donnees.js';
import { lireImage } from './images.js';

function carteTicket(a, servi = false) {
  return `<article class="ticket${servi ? ' servi' : ''}" ${servi ? '' : `role="button" tabindex="0" data-avis="${esc(a.id)}"`}>
    <div class="ticket-tete">
      <span class="ticket-num">${numero(a.numero)}</span>
      <span class="ticket-nom">${esc(a.auteur || t('reviews.anon'))}</span>
      <span class="etoiles" aria-label="${a.etoiles || 0}/5">${etoiles(a.etoiles)}</span>
    </div>
    <p class="ticket-texte coupe">${esc(a.texte) || '—'}</p>
    ${!servi && estCoupe(a.texte) ? `<span class="mention-coupe">${t('reviews.partial')}</span>` : ''}
    ${servi ? `<span class="tampon">${t('reviews.done').replace(' ✓', '')} ✓</span>` : ''}
  </article>`;
}

export async function afficherAvis(main) {
  let liste = { aRepondre: [], servis: [] };
  let erreur = '';
  try { liste = await D.listerAvis(); } catch (e) { erreur = messageErreur(e); }
  const n = liste.aRepondre.length;
  main.innerHTML = `
    <h1 class="titre-ecran">${t('reviews.title')}</h1>
    ${erreur ? `<p class="erreur">${esc(erreur)}</p>` : ''}
    <p class="compteur">${n === 1 ? t('reviews.count1') : t('reviews.count', { n })}</p>
    ${n ? `<ul class="pile">${liste.aRepondre.map(a => `<li>${carteTicket(a)}</li>`).join('')}</ul>` : `<p class="vide">${t('reviews.empty')}</p>`}
    ${liste.servis.length ? `<h2 class="servis-titre">${t('reviews.done').replace(' ✓', '')}</h2><ul class="pile">${liste.servis.map(a => `<li>${carteTicket(a, true)}</li>`).join('')}</ul>` : ''}
    <div class="action-fixe"><button type="button" class="bouton bouton-or bouton-large" id="coller-avis">${ICONES.coller}${t('reviews.paste')}</button></div>`;

  main.querySelector('#coller-avis').addEventListener('click', () => ouvrirTicket(null, () => afficherAvis(main)));
  main.querySelectorAll('[data-avis]').forEach(el => {
    const ouvrir = () => ouvrirTicket(liste.aRepondre.find(a => a.id === el.dataset.avis), () => afficherAvis(main));
    el.addEventListener('click', ouvrir);
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ouvrir(); } });
  });

  // Mode démo seulement : ouvrir un ticket depuis l'adresse, pour les captures de test
  const p = new URLSearchParams(location.search);
  if (D.estDemo() && p.get('ouvrir') === 'coller' && !afficherAvis.ouvert) {
    afficherAvis.ouvert = true;
    ouvrirTicket(null, () => afficherAvis(main), { texte: p.get('texte') || '', ecrire: p.has('ecrire') });
  }
}

function ouvrirTicket(avisExistant, apresFermeture, test = {}) {
  const cle = avisExistant ? avisExistant.id : 'nouveau';
  const etat = {
    texte: avisExistant ? avisExistant.texte : (test.texte || lireBrouillon('avis-texte')),
    etoiles: avisExistant?.etoiles || null,
    auteur: avisExistant?.auteur || null,
    souvenir: lireBrouillon('avis-souvenir-' + cle),
    signerRafiza: false,
    image: null,
    reponse: lireBrouillon('avis-reponse-' + cle),
    variante: 0,
    avis: avisExistant,
  };
  const feuille = document.createElement('div');
  feuille.className = 'feuille';
  feuille.setAttribute('role', 'dialog');
  feuille.setAttribute('aria-modal', 'true');
  feuille.setAttribute('aria-labelledby', 'f-titre');
  const derriere = [document.getElementById('ecran'), document.querySelector('.onglets'), document.querySelector('.comptoir')];
  derriere.forEach(el => el && (el.inert = true));
  document.body.appendChild(feuille);
  document.body.style.overflow = 'hidden';
  const avant = document.activeElement;

  const fermer = () => {
    feuille.remove(); document.body.style.overflow = '';
    derriere.forEach(el => el && (el.inert = false));
    document.removeEventListener('keydown', echap);
    avant?.focus?.(); apresFermeture?.();
  };
  const echap = e => { if (e.key === 'Escape') fermer(); };
  document.addEventListener('keydown', echap);

  const dessiner = (statut = '') => {
    const titre = avisExistant ? `${numero(avisExistant.numero)} · ${esc(avisExistant.auteur || t('reviews.anon'))}` : t('reviews.paste');
    feuille.innerHTML = `<article class="ticket">
      <div class="feuille-haut"><h2 id="f-titre">${titre}</h2><button type="button" class="fermer" aria-label="${t('reviews.close')}">×</button></div>
      ${avisExistant ? '' : `<p class="aide">${t('reviews.pasteHint')}</p>`}
      ${avisExistant && estCoupe(etat.texte) ? `<div class="bandeau-coupe">
        <p><b>${t('reviews.truncated')}</b></p>
        ${avisExistant.lien ? `<a class="bouton bouton-trait bouton-large" href="${esc(avisExistant.lien)}" target="_blank" rel="noopener">${t('reviews.step1')}</a>` : ''}
        <button type="button" class="bouton bouton-or bouton-large" id="f-coller-complet">${ICONES.coller}${t('reviews.step2')}</button>
        <p class="aide">${t('reviews.howToCopy')}</p>
      </div>` : avisExistant?.lien ? `<p class="aide"><a class="lien-avis" href="${esc(avisExistant.lien)}" target="_blank" rel="noopener">${t('reviews.openFull')}</a></p>` : ''}
      <label class="champ"><span>${t('reviews.textLabel')}</span>
        <textarea id="f-texte" placeholder="${t('reviews.textPlaceholder')}">${esc(etat.texte)}</textarea></label>
      <div class="rangee">
        <button type="button" class="bouton bouton-trait" id="f-coller">${ICONES.coller}${t('reviews.pasteBtn')}</button>
        <label class="bouton bouton-trait" for="f-image">${ICONES.photo}${t('reviews.photoBtn')}</label>
        <input type="file" id="f-image" accept="image/*" hidden>
      </div>
      ${etat.image ? `<div class="apercu-capture"><img src="${etat.image.url}" alt=""><span>${t('reviews.photoAdded')}</span><button type="button" class="bouton bouton-trait" id="f-retirer">${t('reviews.photoRemove')}</button></div>` : ''}
      <label class="champ"><span>${t('reviews.name')}</span>
        <input id="f-nom" value="${esc(etat.auteur || '')}" placeholder="${t('reviews.namePlaceholder')}" autocomplete="off"></label>
      <span class="champ"><span>${t('reviews.stars')}</span></span>
      <div class="choix-etoiles" role="group" aria-label="${t('reviews.stars')}">
        ${[1, 2, 3, 4, 5].map(i => `<button type="button" data-etoile="${i}" aria-label="${i}/5" aria-pressed="${etat.etoiles >= i}">★</button>`).join('')}
      </div>
      <label class="champ"><span>${t('reviews.memory')}</span>
        <input id="f-souvenir" value="${esc(etat.souvenir)}" placeholder="${t('reviews.memoryPlaceholder')}"></label>
      <label class="case"><input type="checkbox" id="f-rafiza" ${etat.signerRafiza ? 'checked' : ''}>${t('reviews.signRafiza')}</label>
      ${statut === 'erreur-saisie' ? `<p class="erreur">${t('reviews.needText')}</p>` : ''}
      ${etat.erreur ? `<p class="erreur" role="alert">${esc(etat.erreur)}</p>` : ''}
      ${statut === 'charge' ? `<p class="chargement" role="status">${t('reviews.writing')}</p>` : ''}
      ${etat.reponse ? `
        <p class="reponse-titre">${t('reviews.answer')}</p>
        <div class="reponse" id="f-reponse">${esc(etat.reponse)}</div>
        <div class="rangee">
          <button type="button" class="bouton bouton-or" id="f-copier">${ICONES.copier}${t('reviews.copy')}</button>
          <button type="button" class="bouton bouton-trait" id="f-autre">${ICONES.autre}${t('reviews.other')}</button>
        </div>
        <button type="button" class="bouton bouton-encre bouton-large" id="f-fait">${t('reviews.done')}</button>`
        : `<button type="button" class="bouton bouton-or bouton-large" id="f-ecrire" ${statut === 'charge' ? 'disabled' : ''}>${ICONES.plume}${t('reviews.write')}</button>
          ${avisExistant ? `<button type="button" class="bouton bouton-trait bouton-large" id="f-deja" style="margin-top:10px">${t('reviews.alreadyAnswered')}</button>` : ''}`}
    </article>`;
    brancher();
  };

  const brancher = () => {
    const $ = s => feuille.querySelector(s);
    $('.fermer').addEventListener('click', fermer);
    $('#f-texte').addEventListener('input', e => { etat.texte = e.target.value; if (!avisExistant) sauverBrouillon('avis-texte', etat.texte); });
    $('#f-souvenir').addEventListener('input', e => { etat.souvenir = e.target.value; sauverBrouillon('avis-souvenir-' + cle, etat.souvenir); });
    $('#f-rafiza').addEventListener('change', e => { etat.signerRafiza = e.target.checked; });
    $('#f-nom').addEventListener('input', e => { etat.auteur = e.target.value.trim() || null; });
    $('#f-coller').addEventListener('click', async () => {
      try { const txt = await navigator.clipboard.readText(); if (txt) { etat.texte = txt; if (!avisExistant) sauverBrouillon('avis-texte', txt); dessiner(); } } catch { $('#f-texte').focus(); }
    });
    $('#f-image').addEventListener('change', async e => {
      const f = e.target.files?.[0]; if (!f) return;
      try { etat.image = await lireImage(f); } catch { etat.image = null; }
      dessiner();
    });
    $('#f-retirer')?.addEventListener('click', () => { etat.image = null; dessiner(); });
    feuille.querySelectorAll('[data-etoile]').forEach(b => b.addEventListener('click', () => {
      const n = +b.dataset.etoile; etat.etoiles = etat.etoiles === n ? null : n; dessiner();
    }));
    $('#f-ecrire')?.addEventListener('click', () => ecrire());
    $('#f-coller-complet')?.addEventListener('click', async () => {
      let txt = '';
      try { txt = await navigator.clipboard.readText(); } catch { /* refusé */ }
      const n = nettoyerAvis(txt);
      if (!n.texte || n.texte.length < 5) { toast(t('reviews.pasteManual')); $('#f-texte').focus(); return; }
      etat.texte = n.texte;
      avisExistant.texte = n.texte;
      D.majTexteAvis(avisExistant.id, n.texte).catch(() => {});
      toast(t('reviews.fullAdded'));
      dessiner();
    });
    $('#f-deja')?.addEventListener('click', async () => {
      try { await D.marquerFait(avisExistant.id, ''); toast(t('reviews.doneToast')); fermer(); } catch (e) { etat.erreur = messageErreur(e); dessiner(); }
    });
    $('#f-autre')?.addEventListener('click', () => { etat.variante += 1; ecrire(); });
    $('#f-copier')?.addEventListener('click', async () => {
      const ok = await copier(etat.reponse);
      toast(ok ? t('reviews.copied') : t('reviews.copyFailed'));
    });
    $('#f-fait')?.addEventListener('click', async () => {
      try {
        let avis = etat.avis;
        if (!avis) {
          const n = nettoyerAvis(etat.texte);
          avis = await D.ajouterAvis({ auteur: etat.auteur || n.auteur, etoiles: etat.etoiles || n.etoiles || null, texte: n.texte });
          etat.avis = avis; // si « Fait » échoue ensuite, on ne recrée pas le ticket
        }
        await D.marquerFait(avis.id, etat.reponse);
        ['avis-souvenir-', 'avis-reponse-'].forEach(k => effacerBrouillon(k + cle));
        if (!avisExistant) effacerBrouillon('avis-texte');
        toast(t('reviews.doneToast'));
        fermer();
      } catch (e) { etat.erreur = messageErreur(e); dessiner(); }
    });
  };

  const ecrire = async () => {
    const n = nettoyerAvis(etat.texte);
    if (!etat.auteur && n.auteur) etat.auteur = n.auteur; // nom lu dans le texte collé
    const avis = { ...n, etoiles: etat.etoiles || n.etoiles, auteur: etat.auteur || n.auteur };
    if (!avis.texte && !avis.etoiles && !etat.image) { dessiner('erreur-saisie'); return; }
    if (!etat.etoiles && n.etoiles) etat.etoiles = n.etoiles; // étoiles lues dans le texte collé
    etat.erreur = '';
    dessiner('charge');
    try {
      const [profil, exemples, recentes] = await Promise.all([D.chargerProfil(), D.chargerExemples().catch(() => []), D.chargerReponsesRecentes().catch(() => [])]);
      const demande = buildReviewPrompt({ avis, souvenir: etat.souvenir, profil, exemples, recentes: debutsRecents(recentes), variante: etat.variante, signerRafiza: etat.signerRafiza, avecCapture: !!etat.image });
      etat.reponse = await D.appelIA(etat.image ? { ...demande, image: { mime: etat.image.mime, base64: etat.image.base64 } } : demande);
      sauverBrouillon('avis-reponse-' + cle, etat.reponse);
      dessiner();
      feuille.querySelector('#f-reponse')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (e) {
      etat.erreur = messageErreur(e);
      dessiner();
    }
  };

  dessiner();
  if (test.ecrire) ecrire();
  else feuille.querySelector(avisExistant ? '#f-ecrire' : '#f-texte')?.focus();
}
