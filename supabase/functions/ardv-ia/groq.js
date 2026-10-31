// Secours Groq (API au format OpenAI), utilisé quand Gemini est surchargé. Pur : testé avec node --test.
// Plusieurs modèles par ordre de préférence : Groq en retire régulièrement, on passe au suivant.

import { imagesDe } from './gemini.js';

const TEXTE = ['llama-3.3-70b-versatile', 'openai/gpt-oss-120b', 'qwen/qwen3-32b'];
const IMAGE = ['meta-llama/llama-4-scout-17b-16e-instruct', 'meta-llama/llama-4-maverick-17b-128e-instruct'];

export const modelesGroq = avecImage => (avecImage ? IMAGE : TEXTE);

export function corpsGroq(demande, modele) {
  const { system, user } = demande;
  const images = imagesDe(demande);
  const contenu = images.length
    ? [{ type: 'text', text: user }, ...images.map(i => ({ type: 'image_url', image_url: { url: `data:${i.mime || 'image/jpeg'};base64,${i.base64}` } }))]
    : user;
  return {
    model: modele,
    messages: [{ role: 'system', content: system }, { role: 'user', content: contenu }],
    temperature: 0.9,
    max_completion_tokens: 2048,
  };
}

export function lireTexteGroq(json) {
  const choix = json?.choices?.[0];
  if (choix?.finish_reason && choix.finish_reason !== 'stop') throw new Error('réponse Groq incomplète : ' + choix.finish_reason);
  const texte = String(choix?.message?.content || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  if (!texte) throw new Error('réponse Groq vide');
  return texte;
}

// Gemini d'abord (la clé déjà en place), Groq en secours dès que sa clé existe.
export function ordreFournisseurs({ gemini, groq }) {
  return [gemini && 'gemini', groq && 'groq'].filter(Boolean);
}
