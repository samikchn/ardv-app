import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PROFILE, contexteRestaurant } from '../js/profil.js';

test('le contexte contient les infos clés et aucun e-mail', () => {
  const c = contexteRestaurant(DEFAULT_PROFILE);
  assert.match(c, /Basilique de Saint-Denis/);
  assert.match(c, /aurendezvous-saintdenis\.fr/);
  assert.match(c, /Chaima/);
  assert.ok(!c.includes('@'));
});

test('un profil incomplet ne plante pas', () => {
  const c = contexteRestaurant({ nom: 'X' });
  assert.match(c, /X/);
});
