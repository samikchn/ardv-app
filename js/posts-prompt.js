// Le « cerveau » des posts : prépare la demande à l'IA (3 textes : fiche Google, Instagram, Facebook) et lit sa réponse.
// Pur (pas de réseau) : testé avec node --test. Règles tirées des conversations de Rafiza (mai 2026).

import { contexteRestaurant } from './profil.js';

export function buildPostPrompt({ idee = '', profil, nbPhotos = 0, anglais = false }) {
  const regles = [
    'You write social media posts for this restaurant, in French, in the owner\'s voice.',
    'Tone: warm, convivial, family-friendly, simple and human. It must never sound written by an AI. No bullet points, no lists, no headings inside the posts.',
    `Weave in naturally, never as a list, the restaurant's ranking: ${profil.classement || ''}`,
    `Weave in naturally a few of these local keywords (not all of them): ${(profil.motsClesPosts || profil.motsCles || []).join(', ')}.`,
    'google: a Google Business Profile post, 80 to 150 words, no hashtags, ends with a gentle invitation to come.',
    'instagram: 2 to 4 short sentences with a few emojis, then a blank line, then 8 to 12 relevant hashtags (local + food).',
    'facebook: shorter than the Google post (40 to 80 words), friendly, 1 or 2 emojis, at most 3 hashtags.',
    'nomFichier: a short SEO file name for the main photo, lowercase, words separated by dashes, ending in .jpg, mentioning the dish and "saint-denis".',
    anglais ? 'Add at the end of each post one short sentence in English for tourists visiting the Basilica.' : 'Write everything in French.',
    'Never invent prices, opening hours, promotions or dishes that are not in the owner\'s idea or in the restaurant facts.',
    'Answer ONLY with a JSON object: {"google": "...", "instagram": "...", "facebook": "...", "nomFichier": "..."}',
  ];
  const system = regles.map(r => '- ' + r).join('\n') + '\n\nAbout the restaurant:\n' + contexteRestaurant(profil);
  const user = [
    `The owner's idea for the post: ${idee || '(no text: describe what the photos show)'}`,
    nbPhotos ? `${nbPhotos} photo(s) attached: describe what you really see (dish, ice cream, terrace…), never guess what is not visible.` : 'No photo attached.',
  ].join('\n');
  return { system, user };
}

export function lireTextesPost(texte) {
  const brut = String(texte || '');
  const debut = brut.indexOf('{');
  const fin = brut.lastIndexOf('}');
  if (debut < 0 || fin <= debut) throw new Error('réponse illisible');
  let o;
  try { o = JSON.parse(brut.slice(debut, fin + 1)); } catch { throw new Error('réponse illisible'); }
  const champ = k => String(o[k] || '').trim();
  const r = { google: champ('google'), instagram: champ('instagram'), facebook: champ('facebook'), nomFichier: nomFichierPhoto(champ('nomFichier')) };
  if (!r.google && !r.instagram && !r.facebook) throw new Error('réponse illisible');
  return r;
}

export function nomFichierPhoto(nom) {
  const base = String(nom || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\.(jpe?g|png|webp|heic)$/i, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return (base || 'photo-cafe-au-rendez-vous-saint-denis') + '.jpg';
}
