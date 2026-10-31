// Petites fonctions pures pour parler à Gemini. Partagées par la fonction serveur (Deno) et les tests (Node).

export function corpsGemini({ system, user, image }) {
  const parts = [{ text: user }];
  if (image && image.base64) parts.push({ inline_data: { mime_type: image.mime || 'image/jpeg', data: image.base64 } });
  return {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts }],
    generationConfig: { temperature: 0.9, maxOutputTokens: 1024, thinkingConfig: { thinkingBudget: 0 } },
  };
}

export function lireTexteGemini(json) {
  const candidat = json?.candidates?.[0];
  if (candidat?.finishReason && !['STOP', 'FINISH_REASON_UNSPECIFIED'].includes(candidat.finishReason)) throw new Error('réponse Gemini incomplète : ' + candidat.finishReason);
  const parts = candidat?.content?.parts;
  if (!Array.isArray(parts)) throw new Error('réponse Gemini vide');
  const texte = parts.map(p => p.text || '').join('').trim();
  if (!texte) throw new Error('réponse Gemini vide');
  return texte;
}

export const mapGeminiError = status => (status === 429 ? 'quota' : 'ia');

export function estAutorise(email, liste) {
  const e = String(email || '').trim().toLowerCase();
  return !!e && liste.map(x => x.trim().toLowerCase()).includes(e);
}
