// Connexion par e-mail + mot de passe (comptes créés par Sami dans Supabase). La session reste ouverte ensuite.
import { t } from './i18n.js';
import { esc } from './ui.js';
import * as D from './donnees.js';

export function afficherConnexion(main, quandConnecte) {
  let email = '';
  let message = '';

  const dessiner = () => {
    main.innerHTML = `
      <h1 class="titre-ecran">${t('login.title')}</h1>
      <p class="sous-titre">${t('login.intro')}</p>
      <form class="ticket" id="connexion">
        <label class="champ"><span>${t('login.email')}</span>
          <input type="email" name="email" autocomplete="username" inputmode="email" required value="${esc(email)}"></label>
        <label class="champ"><span>${t('login.password')}</span>
          <input type="password" name="motdepasse" autocomplete="current-password" required></label>
        ${message ? `<p class="erreur" role="alert">${esc(message)}</p>` : ''}
        <button class="bouton bouton-or bouton-large" type="submit">${t('login.submit')}</button>
      </form>`;
    const form = main.querySelector('#connexion');
    form.querySelector(email ? '[name=motdepasse]' : '[name=email]').focus();
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const f = new FormData(form);
      email = String(f.get('email'));
      try {
        await D.connexion(email, String(f.get('motdepasse')));
        quandConnecte();
        return;
      } catch (err) {
        const coupure = !navigator.onLine || err instanceof TypeError || /fetch|network/i.test(err?.message || '') || err?.message === 'reseau';
        message = coupure ? t('err.reseau') : t('login.bad');
      }
      dessiner();
    });
  };
  dessiner();
}
