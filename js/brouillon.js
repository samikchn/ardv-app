// Garde ce qu'elle a tapé (réseau coupé, appli fermée…). Ne plante jamais si le stockage est bloqué.

const PREFIXE = 'ardv-brouillon-';

export function sauverBrouillon(cle, valeur) {
  try { globalThis.localStorage.setItem(PREFIXE + cle, typeof valeur === 'string' ? valeur : JSON.stringify(valeur)); } catch { /* rien */ }
}

export function lireBrouillon(cle) {
  try { return globalThis.localStorage.getItem(PREFIXE + cle) ?? ''; } catch { return ''; }
}

export function effacerBrouillon(cle) {
  try { globalThis.localStorage.removeItem(PREFIXE + cle); } catch { /* rien */ }
}
