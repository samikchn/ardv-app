// Réduit une photo (capture ou pellicule) pour l'envoyer vite : { mime, base64, url, blob }
export async function lireImage(fichier, taille = 1280) {
  const bitmap = await createImageBitmap(fichier);
  const echelle = Math.min(1, taille / Math.max(bitmap.width, bitmap.height));
  const toile = document.createElement('canvas');
  toile.width = Math.round(bitmap.width * echelle); toile.height = Math.round(bitmap.height * echelle);
  toile.getContext('2d').drawImage(bitmap, 0, 0, toile.width, toile.height);
  const url = toile.toDataURL('image/jpeg', 0.85);
  const blob = await new Promise(r => toile.toBlob(r, 'image/jpeg', 0.85));
  return { mime: 'image/jpeg', base64: url.split(',')[1], url, blob };
}

// Images collées (Ctrl+V sur ordinateur, « Coller » du clavier sur téléphone)
export const imagesDuCollage = e => [...(e.clipboardData?.files || [])].filter(f => f.type.startsWith('image/'));

// Bouton « Coller une image » : lit une image dans le presse-papiers (null s'il n'y en a pas ou si c'est refusé)
export async function imageDuPressePapiers() {
  try {
    for (const item of await navigator.clipboard.read()) {
      const type = item.types.find(x => x.startsWith('image/'));
      if (type) return new File([await item.getType(type)], 'capture.png', { type });
    }
  } catch { /* refusé ou pas d'image */ }
  return null;
}
