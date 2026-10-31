// Écran Fiche : ce que l'appli sait du restaurant, modifiable.
import { t } from './i18n.js';
import { esc, toast, messageErreur } from './ui.js';
import * as D from './donnees.js';

const CHAMPS = ['nom', 'adresse', 'situation', 'site', 'telephone', 'horaires', 'signature', 'devise'];
const LISTES = ['specialites', 'equipe', 'motsCles'];

export async function afficherFiche(main) {
  let profil;
  try { profil = await D.chargerProfil(); } catch (e) { main.innerHTML = `<p class="erreur">${esc(messageErreur(e))}</p>`; return; }
  main.innerHTML = `
    <h1 class="titre-ecran">${t('profile.title')}</h1>
    <p class="sous-titre">${t('profile.intro')}</p>
    <form class="ticket" id="fiche">
      ${CHAMPS.map(c => `<label class="champ"><span>${t('profile.' + c)}</span><input name="${c}" value="${esc(profil[c])}"></label>`).join('')}
      ${LISTES.map(c => `<label class="champ"><span>${t('profile.' + c)}</span><textarea name="${c}" rows="4">${esc((profil[c] || []).join('\n'))}</textarea></label>`).join('')}
      <button class="bouton bouton-or bouton-large" type="submit">${t('profile.save')}</button>
    </form>
    <p style="text-align:center;margin:20px 0"><button type="button" class="bouton bouton-trait" id="sortir" style="color:#FBF6E9;border-color:rgba(251,246,233,.4)">${t('login.logout')}</button></p>`;

  main.querySelector('#fiche').addEventListener('submit', async e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const nouveau = { ...profil };
    CHAMPS.forEach(c => { nouveau[c] = String(f.get(c) || '').trim(); });
    LISTES.forEach(c => { nouveau[c] = String(f.get(c) || '').split('\n').map(s => s.trim()).filter(Boolean); });
    try { await D.enregistrerProfil(nouveau); toast(t('profile.saved')); } catch (err) { toast(messageErreur(err)); }
  });
  const sortir = main.querySelector('#sortir');
  if (D.estDemo()) sortir.hidden = true;
  sortir.addEventListener('click', async () => { await D.deconnexion(); location.reload(); });
}
