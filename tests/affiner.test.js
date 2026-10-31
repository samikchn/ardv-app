import { test } from 'node:test';
import assert from 'node:assert/strict';
import { avecModification } from '../js/affiner.js';

const demande = { system: 'S', user: 'Review text: Top' };

test('modification : version actuelle + consigne, le reste garde ses règles', () => {
  const d = avecModification(demande, 'Merci beaucoup Marie !', 'plus court, ajoute un merci à Chaima');
  assert.equal(d.system, 'S');
  assert.match(d.user, /Review text: Top/);
  assert.match(d.user, /Merci beaucoup Marie !/);
  assert.match(d.user, /plus court, ajoute un merci à Chaima/);
  assert.match(d.user, /keep everything else/i);
});

test('modification d\'un post (JSON) : la version actuelle est donnée en JSON', () => {
  const d = avecModification({ system: 'S', user: 'idea' }, { google: 'G', instagram: 'I', facebook: 'F' }, 'moins d\'emojis');
  assert.match(d.user, /"instagram":"I"/);
});

test('consigne vide → demande inchangée', () => {
  assert.deepEqual(avecModification(demande, 'X', '   '), demande);
});

test('les photos jointes sont gardées', () => {
  const d = avecModification({ system: 'S', user: 'U', images: [{ base64: 'A' }] }, 'X', 'plus long');
  assert.equal(d.images.length, 1);
});
