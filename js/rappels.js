// Rappels de posts : abonnement aux notifications de ce téléphone (Android/Chrome, appli installée ou non).
import * as D from './donnees.js';

const CLE_PUBLIQUE = (globalThis.APP_CONFIG || {}).vapidPublicKey || '';

const enOctets = b64 => {
  const s = atob((b64 + '='.repeat((4 - b64.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, c => c.charCodeAt(0));
};

// 'possible' : on peut proposer le bouton · 'actif' : déjà accepté · 'impossible' : navigateur/démo/refusé
export function etatRappels() {
  if (D.estDemo() || !CLE_PUBLIQUE || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'impossible';
  if (Notification.permission === 'granted') return 'actif';
  if (Notification.permission === 'denied') return 'impossible';
  return 'possible';
}

export async function activerRappels() {
  if (await Notification.requestPermission() !== 'granted') throw new Error('refus');
  const reg = await navigator.serviceWorker.ready;
  const abonnement = (await reg.pushManager.getSubscription())
    || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: enOctets(CLE_PUBLIQUE) });
  await D.enregistrerAbonnement(abonnement.toJSON());
}

// Déjà accepté : on renouvelle l'abonnement en silence (il peut changer)
export async function rafraichirRappels() {
  if (etatRappels() !== 'actif') return;
  try { await activerRappels(); } catch { /* rien */ }
}
