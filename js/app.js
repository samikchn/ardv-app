// Point d'entrée : langue, onglets, connexion.
import { t, setLang, getLang, onLangChange } from './i18n.js';
import { estDemo, sessionActive } from './donnees.js';
import { afficherAvis } from './ecran-avis.js';
import { afficherFiche } from './ecran-fiche.js';
import { afficherConnexion } from './connexion.js';

const main = document.getElementById('ecran');
const onglets = [...document.querySelectorAll('[data-onglet]')];
let ongletCourant = 'avis';
try { const o = localStorage.getItem('ardv-onglet'); if (o) ongletCourant = o; } catch { /* rien */ }

function traduirePage() {
  document.documentElement.lang = getLang();
  document.querySelectorAll('[data-t]').forEach(el => { el.textContent = t(el.dataset.t); });
  document.querySelectorAll('[data-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === getLang())));
}

function bientot() {
  main.innerHTML = `<article class="ticket bientot"><h2>${t('soon.title')}</h2><p>${t('soon.text')}</p></article>`;
}

async function afficher(nom) {
  try { await afficherEcran(nom); } catch (e) {
    const cle = e?.message === 'reseau' ? 'err.reseau' : 'err.chargement';
    main.innerHTML = `<article class="ticket bientot"><p class="erreur" role="alert">${t(cle)}</p><button type="button" class="bouton bouton-or" id="reessayer">${t('reviews.retry')}</button></article>`;
    main.querySelector('#reessayer').addEventListener('click', () => afficher(nom));
  }
}

async function afficherEcran(nom) {
  ongletCourant = nom;
  try { localStorage.setItem('ardv-onglet', nom); } catch { /* rien */ }
  onglets.forEach(b => { if (b.dataset.onglet === nom) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  if (!(await sessionActive())) { document.querySelector('.onglets').hidden = true; afficherConnexion(main, () => { document.querySelector('.onglets').hidden = false; afficher(ongletCourant); }); return; }
  if (nom === 'avis') await afficherAvis(main);
  else if (nom === 'fiche') await afficherFiche(main);
  else bientot();
  window.scrollTo(0, 0);
}

document.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)));
onLangChange(() => { traduirePage(); afficher(ongletCourant); });
onglets.forEach(b => b.addEventListener('click', () => afficher(b.dataset.onglet)));

document.getElementById('bandeau-demo').hidden = !estDemo();
traduirePage();
afficher(ongletCourant).then(() => {
  // Mode démo : mesure pour les tests (largeur de l'écran / largeur du contenu)
  if (estDemo() && location.search.includes('mesure')) {
    const pre = document.createElement('pre'); pre.id = 'mesure';
    pre.textContent = `${innerWidth}/${document.documentElement.scrollWidth}`;
    document.body.appendChild(pre);
  }
});

if ('serviceWorker' in navigator && !estDemo()) navigator.serviceWorker.register('sw.js').catch(() => {});
