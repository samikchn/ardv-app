// Écran Posts : les posts préparés (tickets), et le ticket « nouveau post » : photos → idée → 3 textes → partager / rappel.
import { t, getLang } from './i18n.js';
import { esc, numero, toast, messageErreur, copier, ICONES } from './ui.js';
import { buildPostPrompt, lireTextesPost } from './posts-prompt.js';
import { sauverBrouillon, lireBrouillon, effacerBrouillon } from './brouillon.js';
import { lireImage } from './images.js';
import { activerRappels, etatRappels } from './rappels.js';
import * as D from './donnees.js';

const PLATEFORMES = [['google', 'posts.google'], ['instagram', 'posts.instagram'], ['facebook', 'posts.facebook']];
const quand = iso => new Date(iso).toLocaleString(getLang() === 'fr' ? 'fr-FR' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function carte(p, vignette) {
  const etat = p.statut === 'publie' ? t('posts.published') : p.rappel ? t('posts.planned', { quand: quand(p.rappel) }) : t('posts.draft');
  return `<article class="ticket${p.statut === 'publie' ? ' servi' : ''}" role="button" tabindex="0" data-post="${esc(p.id)}">
    <div class="ticket-tete"><span class="ticket-num">${numero(p.numero)}</span><span class="ticket-nom">${esc(etat)}</span></div>
    ${vignette ? `<img class="post-vignette" src="${esc(vignette)}" alt="" loading="lazy">` : ''}
    <p class="ticket-texte coupe">${esc(p.textes?.instagram || p.idee || '—')}</p>
    ${p.statut === 'publie' ? `<span class="tampon">${t('posts.published')}</span>` : ''}
  </article>`;
}

export async function afficherPosts(main) {
  let posts = [];
  let erreur = '';
  try { posts = await D.listerPosts(); } catch (e) { erreur = messageErreur(e); }
  const vignettes = await D.urlsPhotos(posts.map(p => p.photos?.[0]).filter(Boolean)).catch(() => []);
  let k = 0;
  const avecVignette = posts.map(p => [p, p.photos?.[0] ? vignettes[k++] : null]);
  const aFaire = avecVignette.filter(([p]) => p.statut !== 'publie');
  const faits = avecVignette.filter(([p]) => p.statut === 'publie').slice(0, 6);
  const rappels = etatRappels();
  main.innerHTML = `
    <h1 class="titre-ecran">${t('posts.title')}</h1>
    <p class="sous-titre">${t('posts.intro')}</p>
    ${erreur ? `<p class="erreur">${esc(erreur)}</p>` : ''}
    ${rappels === 'possible' ? `<p class="bandeau-rappel"><button type="button" class="bouton bouton-trait" id="activer-rappels">${t('posts.enableReminders')}</button></p>` : ''}
    ${aFaire.length ? `<ul class="pile">${aFaire.map(([p, v]) => `<li>${carte(p, v)}</li>`).join('')}</ul>` : `<p class="vide">${t('posts.empty')}</p>`}
    ${faits.length ? `<h2 class="servis-titre">${t('posts.published')}</h2><ul class="pile">${faits.map(([p, v]) => `<li>${carte(p, v)}</li>`).join('')}</ul>` : ''}
    <div class="action-fixe"><button type="button" class="bouton bouton-or bouton-large" id="nouveau-post">${ICONES.photo}${t('posts.new')}</button></div>`;

  const recharger = () => afficherPosts(main);
  main.querySelector('#nouveau-post').addEventListener('click', () => ouvrirPost(null, recharger));
  main.querySelector('#activer-rappels')?.addEventListener('click', async () => {
    try { await activerRappels(); toast(t('posts.remindersOn')); recharger(); } catch { toast(t('posts.remindersRefused')); }
  });
  main.querySelectorAll('[data-post]').forEach(el => {
    const ouvrir = () => ouvrirPost(posts.find(p => p.id === el.dataset.post), recharger);
    el.addEventListener('click', ouvrir);
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ouvrir(); } });
  });
}

// Date locale pour <input type="datetime-local">
const versChamp = iso => { if (!iso) return ''; const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

async function ouvrirPost(existant, apresFermeture) {
  const etat = {
    idee: existant ? existant.idee : lireBrouillon('post-idee'),
    photos: [],                       // nouvelles photos { url, blob, mime, base64 }
    chemins: [],  // photos déjà enregistrées (chemins) et leurs adresses d'affichage, dans le même ordre
    urls: [],
    textes: existant?.textes && Object.keys(existant.textes).length ? existant.textes : null,
    rappel: existant?.rappel || null,
    anglais: false,
    erreur: '',
  };
  if (existant?.photos?.length) {
    const urls = await D.urlsPhotos(existant.photos).catch(() => []);
    existant.photos.forEach((c, i) => { if (urls[i]) { etat.chemins.push(c); etat.urls.push(urls[i]); } });
  }
  const feuille = document.createElement('div');
  feuille.className = 'feuille';
  feuille.setAttribute('role', 'dialog');
  feuille.setAttribute('aria-modal', 'true');
  feuille.setAttribute('aria-labelledby', 'p-titre');
  document.body.appendChild(feuille);
  document.body.style.overflow = 'hidden';
  const derriere = [document.getElementById('ecran'), document.querySelector('.onglets'), document.querySelector('.comptoir')];
  derriere.forEach(el => el && (el.inert = true));
  const fermer = () => {
    feuille.remove(); document.body.style.overflow = '';
    derriere.forEach(el => el && (el.inert = false));
    document.removeEventListener('keydown', echap);
    apresFermeture?.();
  };
  const echap = e => { if (e.key === 'Escape') fermer(); };
  document.addEventListener('keydown', echap);

  const vignettes = () => [...etat.urls, ...etat.photos.map(p => p.url)];

  const dessiner = (statut = '') => {
    feuille.innerHTML = `<article class="ticket">
      <div class="feuille-haut"><h2 id="p-titre">${existant ? numero(existant.numero) : t('posts.new')}</h2><button type="button" class="fermer" aria-label="${t('reviews.close')}">×</button></div>
      <div class="post-photos">
        ${vignettes().map((u, i) => `<figure><img src="${esc(u)}" alt=""><button type="button" class="retirer-photo" data-i="${i}" aria-label="${t('reviews.photoRemove')}">×</button></figure>`).join('')}
        ${vignettes().length < 4 ? `<label class="ajout-photo" for="p-photos">${ICONES.photo}<span>${t('posts.addPhotos')}</span></label>` : ''}
        <input type="file" id="p-photos" accept="image/*" multiple hidden>
      </div>
      <label class="champ"><span>${t('posts.idea')}</span>
        <textarea id="p-idee" rows="3" placeholder="${t('posts.ideaPlaceholder')}">${esc(etat.idee)}</textarea></label>
      <label class="case"><input type="checkbox" id="p-anglais" ${etat.anglais ? 'checked' : ''}>${t('posts.english')}</label>
      ${statut === 'vide' ? `<p class="erreur">${t('posts.needIdea')}</p>` : ''}
      ${etat.erreur ? `<p class="erreur" role="alert">${esc(etat.erreur)}</p>` : ''}
      ${statut === 'charge' ? `<p class="chargement" role="status">${t('posts.writing')}</p>` : ''}
      <button type="button" class="bouton ${etat.textes ? 'bouton-trait' : 'bouton-or'} bouton-large" id="p-ecrire" ${statut === 'charge' ? 'disabled' : ''}>${ICONES.plume}${etat.textes ? t('posts.rewrite') : t('posts.write')}</button>
      ${etat.textes ? `
        ${PLATEFORMES.map(([k, cle]) => `
          <p class="reponse-titre">${t(cle)}</p>
          <textarea class="reponse post-texte" data-plateforme="${k}" rows="6">${esc(etat.textes[k] || '')}</textarea>
          <div class="rangee"><button type="button" class="bouton bouton-or" data-copier="${k}">${ICONES.copier}${t('reviews.copy')}</button>
          ${k !== 'google' && navigator.share ? `<button type="button" class="bouton bouton-trait" data-partager="${k}">${t('posts.share')}</button>` : ''}</div>`).join('')}
        ${etat.textes.nomFichier ? `<p class="aide">${t('posts.fileName')} <b>${esc(etat.textes.nomFichier)}</b></p>` : ''}
        <label class="champ"><span>${t('posts.reminder')}</span>
          <input type="datetime-local" id="p-rappel" value="${versChamp(etat.rappel)}"></label>
        <button type="button" class="bouton bouton-encre bouton-large" id="p-enregistrer">${t('posts.save')}</button>
        ${existant && existant.statut !== 'publie' ? `<button type="button" class="bouton bouton-trait bouton-large" id="p-publie" style="margin-top:10px">${t('posts.markPublished')}</button>` : ''}` : ''}
    </article>`;
    brancher();
  };

  const brancher = () => {
    const $ = s => feuille.querySelector(s);
    $('.fermer').addEventListener('click', fermer);
    $('#p-idee').addEventListener('input', e => { etat.idee = e.target.value; if (!existant) sauverBrouillon('post-idee', etat.idee); });
    $('#p-anglais').addEventListener('change', e => { etat.anglais = e.target.checked; });
    $('#p-photos').addEventListener('change', async e => {
      for (const f of [...(e.target.files || [])].slice(0, 4 - vignettes().length)) {
        try { etat.photos.push(await lireImage(f, 1024)); } catch { /* photo illisible : ignorée */ }
      }
      dessiner();
    });
    feuille.querySelectorAll('.retirer-photo').forEach(b => b.addEventListener('click', () => {
      const i = +b.dataset.i;
      if (i < etat.urls.length) { etat.urls.splice(i, 1); etat.chemins.splice(i, 1); } else etat.photos.splice(i - etat.urls.length, 1);
      dessiner();
    }));
    feuille.querySelectorAll('.post-texte').forEach(z => z.addEventListener('input', () => { etat.textes[z.dataset.plateforme] = z.value; }));
    feuille.querySelectorAll('[data-copier]').forEach(b => b.addEventListener('click', async () => {
      toast((await copier(etat.textes[b.dataset.copier] || '')) ? t('reviews.copied') : t('reviews.copyFailed'));
    }));
    feuille.querySelectorAll('[data-partager]').forEach(b => b.addEventListener('click', () => partager(b.dataset.partager)));
    $('#p-ecrire').addEventListener('click', ecrire);
    $('#p-rappel')?.addEventListener('change', e => { etat.rappel = e.target.value ? new Date(e.target.value).toISOString() : null; });
    $('#p-enregistrer')?.addEventListener('click', enregistrer);
    $('#p-publie')?.addEventListener('click', async () => {
      try { await D.marquerPublie(existant.id); toast(t('posts.published')); fermer(); } catch (e) { etat.erreur = messageErreur(e); dessiner(); }
    });
  };

  const ecrire = async () => {
    if (!etat.idee.trim() && !vignettes().length) { dessiner('vide'); return; }
    etat.erreur = '';
    dessiner('charge');
    try {
      const profil = await D.chargerProfil();
      const demande = buildPostPrompt({ idee: etat.idee, profil, nbPhotos: etat.photos.length, anglais: etat.anglais });
      const images = etat.photos.map(p => ({ mime: p.mime, base64: p.base64 }));
      etat.textes = lireTextesPost(await D.appelIA(images.length ? { ...demande, images } : demande));
    } catch (e) {
      etat.erreur = e.message === 'réponse illisible' ? t('err.ia') : messageErreur(e);
    }
    dessiner();
  };

  const enregistrer = async () => {
    try {
      const nouveaux = await D.envoyerPhotos(etat.photos);
      await D.enregistrerPost({ id: existant?.id, idee: etat.idee, textes: etat.textes, photos: [...etat.chemins, ...nouveaux], rappel: etat.rappel, rappelChange: etat.rappel !== (existant?.rappel || null), statut: existant?.statut || 'prevu' });
      if (!existant) effacerBrouillon('post-idee');
      toast(etat.rappel ? t('posts.savedWithReminder') : t('posts.saved'));
      fermer();
    } catch (e) { etat.erreur = messageErreur(e); dessiner(); }
  };

  // Les photos déjà enregistrées sont téléchargées dès l'ouverture : au moment du partage, tout est prêt
  // (Android n'autorise le partage que juste après le toucher, sans attente réseau).
  const nomPhoto = i => (i ? `${i}-` : '') + (etat.textes?.nomFichier || 'photo-cafe-au-rendez-vous-saint-denis.jpg');
  etat.blobsEnregistres = [];
  Promise.all(etat.urls.map(u => fetch(u).then(r => (r.ok ? r.blob() : null)).catch(() => null)))
    .then(b => { etat.blobsEnregistres = b; });

  // Partage natif Android : photos + texte → Instagram / Facebook s'ouvrent avec tout prêt
  const partager = plateforme => {
    const texte = etat.textes[plateforme] || '';
    const blobs = [...etat.blobsEnregistres.filter(Boolean), ...etat.photos.map(p => p.blob)];
    const fichiers = blobs.map((b, i) => new File([b], nomPhoto(i), { type: 'image/jpeg' }));
    const donnees = fichiers.length && navigator.canShare?.({ files: fichiers }) ? { files: fichiers, text: texte } : { text: texte };
    const envoi = navigator.share(donnees); // tout de suite, sans attendre : sinon Android refuse
    copier(texte); // Instagram ignore souvent le texte partagé : il reste dans le presse-papiers
    envoi.then(() => toast(t('posts.sharedHint')))
      .catch(e => { if (e?.name !== 'AbortError') toast(t('posts.shareFailed')); });
  };

  dessiner();
}
