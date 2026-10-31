// Petites aides d'affichage partagées par les écrans.
import { t } from './i18n.js';

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const etoiles = n => { const k = Math.max(0, Math.min(5, Math.round(+n || 0))); return k ? '★'.repeat(k) + '☆'.repeat(5 - k) : ''; };
export const numero = n => 'N° ' + String(n ?? 0).padStart(3, '0');

let minuteur;
export function toast(message) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.classList.add('visible');
  clearTimeout(minuteur);
  minuteur = setTimeout(() => el.classList.remove('visible'), 2200);
}

export function messageErreur(e) {
  const code = e?.message;
  return t(['quota', 'reseau', 'connexion', 'interdit'].includes(code) ? 'err.' + code : 'err.ia');
}

export async function copier(texte) {
  try { await navigator.clipboard.writeText(texte); return true; } catch { /* repli */ }
  const zone = document.createElement('textarea');
  zone.value = texte; zone.setAttribute('readonly', ''); zone.style.position = 'fixed'; zone.style.opacity = '0';
  document.body.appendChild(zone); zone.select();
  let ok = false; try { ok = document.execCommand('copy'); } catch { /* rien */ }
  zone.remove();
  return ok;
}

// Bloc « Une modification ? » commun à tous les textes générés par l'IA
export function blocModifier() {
  return `<div class="bloc-modifier">
    <label class="champ"><span>${t('ai.change')}</span>
      <textarea id="ia-consigne" rows="2" placeholder="${t('ai.changePlaceholder')}"></textarea></label>
    <button type="button" class="bouton bouton-trait bouton-large" id="ia-modifier">${ICONES.plume}${t('ai.apply')}</button>
  </div>`;
}

export const ICONES = {
  coller: '<svg aria-hidden="true" viewBox="0 0 24 24"><rect x="6" y="4" width="12" height="17" rx="1.5"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3"/></svg>',
  photo: '<svg aria-hidden="true" viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="12" cy="13" r="3.5"/><path d="M8.5 6 10 3.5h4L15.5 6"/></svg>',
  copier: '<svg aria-hidden="true" viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="13" rx="1.5"/><path d="M16 8V4.5A1.5 1.5 0 0 0 14.5 3h-9A1.5 1.5 0 0 0 4 4.5v11A1.5 1.5 0 0 0 5.5 17H8"/></svg>',
  autre: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4"/></svg>',
  plume: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17z"/><path d="m14.5 7.5 3 3"/></svg>',
  ok: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
};
