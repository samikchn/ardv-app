// Petites fonctions pures pour parler à Gemini. Partagées par la fonction serveur (Deno) et les tests (Node).

// Alias tenu à jour par Google : sert de secours quand le modèle choisi a été arrêté (404).
export const MODELE_SECOURS = 'gemini-flash-latest';

export function modelesAEssayer(modeleChoisi) {
  const choisi = String(modeleChoisi || '').trim();
  return [...new Set([choisi, MODELE_SECOURS].filter(Boolean))];
}

// 404 : modèle inconnu → essayer le suivant. 400 : réglage refusé → réessayer sans réglage de réflexion.
export const doitReessayer = status => (status === 404 ? 'modele' : status === 400 ? 'sans-reflexion' : null);

export function corpsGemini({ system, user, image }, { reflexion = true } = {}) {
  const parts = [{ text: user }];
  if (image && image.base64) parts.push({ inline_data: { mime_type: image.mime || 'image/jpeg', data: image.base64 } });
  const generationConfig = { temperature: 0.9, maxOutputTokens: 2048 };
  // Pas de « réflexion » : elle mangerait les jetons de la réponse (réponse coupée ou vide)
  if (reflexion) generationConfig.thinkingConfig = { thinkingBudget: 0 };
  return {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts }],
    generationConfig,
  };
}

export function lireTexteGemini(json) {
  const candidat = json?.candidates?.[0];
  if (candidat?.finishReason && !['STOP', 'FINISH_REASON_UNSPECIFIED'].includes(candidat.finishReason)) throw new Error('réponse Gemini incomplète : ' + candidat.finishReason);
  const parts = candidat?.content?.parts;
  if (!Array.isArray(parts)) throw new Error('réponse Gemini vide');
  const texte = parts.filter(p => !p.thought).map(p => p.text || '').join('').trim();
  if (!texte) throw new Error('réponse Gemini vide');
  return texte;
}

export const mapGeminiError = status => (status === 429 ? 'quota' : 'ia');

export function estAutorise(email, liste) {
  const e = String(email || '').trim().toLowerCase();
  return !!e && liste.map(x => x.trim().toLowerCase()).includes(e);
}
