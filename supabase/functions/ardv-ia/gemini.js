// Petites fonctions pures pour parler à Gemini. Partagées par la fonction serveur (Deno) et les tests (Node).

// Alias tenus à jour par Google : secours quand le modèle choisi est arrêté (404) ou surchargé (503).
export const MODELES_SECOURS = ['gemini-flash-latest', 'gemini-flash-lite-latest'];

export function modelesAEssayer(modeleChoisi) {
  const choisi = String(modeleChoisi || '').trim();
  return [...new Set([choisi, ...MODELES_SECOURS].filter(Boolean))];
}

// 404 : modèle inconnu → suivant. 400 : réglage refusé → sans réglage de réflexion.
// 500/503 : surchargé → réessayer une fois après une pause, puis modèle suivant.
export function doitReessayer(status) {
  if (status === 404) return 'modele';
  if (status === 400) return 'sans-reflexion';
  if (status === 500 || status === 503) return 'surcharge';
  return null;
}

// Une capture (avis) ou plusieurs photos (posts)
export const imagesDe = ({ image, images }) => [...(image ? [image] : []), ...(Array.isArray(images) ? images : [])].filter(i => i && i.base64).slice(0, 4);

export function corpsGemini(demande, { reflexion = true } = {}) {
  const { system, user } = demande;
  const parts = [{ text: user }];
  for (const i of imagesDe(demande)) parts.push({ inline_data: { mime_type: i.mime || 'image/jpeg', data: i.base64 } });
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

export const mapGeminiError = status => (status === 429 || status === 503 ? 'quota' : 'ia');

export function estAutorise(email, liste) {
  const e = String(email || '').trim().toLowerCase();
  return !!e && liste.map(x => x.trim().toLowerCase()).includes(e);
}
