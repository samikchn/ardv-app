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
