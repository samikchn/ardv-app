// Connexion par code à 6 chiffres reçu par e-mail (un lien ouvrirait Safari au lieu de l'appli installée).
import { t } from './i18n.js';
import { esc } from './ui.js';
import * as D from './donnees.js';

export function afficherConnexion(main, quandConnecte) {
  let email = '';
  let etape = 'email';
  let message = '';
  let erreur = false;

  const dessiner = () => {
    main.innerHTML = `
      <h1 class="titre-ecran">${t('login.title')}</h1>
      <p class="sous-titre">${t('login.intro')}</p>
      <form class="ticket" id="connexion">
        <label class="champ"><span>${t('login.email')}</span>
          <input type="email" name="email" autocomplete="email" inputmode="email" required value="${esc(email)}" ${etape === 'code' ? 'readonly' : ''}></label>
        ${etape === 'code' ? `<label class="champ"><span>${t('login.code')}</span>
          <input name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required></label>` : ''}
        ${message ? `<p class="${erreur ? 'erreur' : 'aide'}" role="status">${esc(message)}</p>` : ''}
        <button class="bouton bouton-or bouton-large" type="submit">${etape === 'code' ? t('login.verify') : t('login.send')}</button>
      </form>`;
    const form = main.querySelector('#connexion');
    form.querySelector(etape === 'code' ? '[name=code]' : '[name=email]').focus();
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const f = new FormData(form);
      try {
        if (etape === 'email') {
          email = String(f.get('email'));
          await D.envoyerCode(email);
          etape = 'code'; message = t('login.sent'); erreur = false;
        } else {
          await D.verifierCode(email, String(f.get('code')));
          quandConnecte(); return;
        }
      } catch (e) {
        const coupure = !navigator.onLine || e instanceof TypeError || /fetch|network/i.test(e?.message || '') || e?.message === 'reseau';
        message = coupure ? t('err.reseau') : etape === 'code' ? t('login.bad') : t('err.interdit'); erreur = true;
      }
      dessiner();
    });
  };
  dessiner();
}
