import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPostPrompt, lireTextesPost, nomFichierPhoto } from '../js/posts-prompt.js';
import { DEFAULT_PROFILE } from '../js/profil.js';

test('demande de post : idée, nombre de photos, 3 plateformes, JSON', () => {
  const p = buildPostPrompt({ idee: 'crème brûlée maison du jour', profil: DEFAULT_PROFILE, nbPhotos: 2 });
  assert.match(p.user, /crème brûlée maison du jour/);
  assert.match(p.user, /2 photo/);
  assert.match(p.system, /google/i); assert.match(p.system, /instagram/i); assert.match(p.system, /facebook/i);
  assert.match(p.system, /JSON/);
  assert.match(p.system, /Basilique de Saint-Denis/);
});

test('version anglaise touristes en option', () => {
  const p = buildPostPrompt({ idee: 'x', profil: DEFAULT_PROFILE, nbPhotos: 0, anglais: true });
  assert.match(p.system, /English/);
});

test('lecture de la réponse JSON, même entourée de texte ou de ```', () => {
  const r = lireTextesPost('Voici :\n```json\n{"google":"G","instagram":"I #crepe","facebook":"F","nomFichier":"creme-brulee.jpg"}\n```');
  assert.deepEqual(r, { google: 'G', instagram: 'I #crepe', facebook: 'F', nomFichier: 'creme-brulee.jpg' });
});

test('réponse illisible → erreur claire', () => {
  assert.throws(() => lireTextesPost('désolé'), /illisible/);
});

test('nom de fichier photo propre pour Google', () => {
  assert.equal(nomFichierPhoto('Crème Brûlée maison !!.JPG'), 'creme-brulee-maison.jpg');
  assert.equal(nomFichierPhoto(''), 'photo-cafe-au-rendez-vous-saint-denis.jpg');
});
