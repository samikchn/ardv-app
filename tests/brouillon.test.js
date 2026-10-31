import { test } from 'node:test';
import assert from 'node:assert/strict';

test('brouillon : écrit puis relu', async () => {
  const store = new Map();
  globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
  const { sauverBrouillon, lireBrouillon, effacerBrouillon } = await import('../js/brouillon.js?a');
  sauverBrouillon('avis', 'x');
  assert.equal(lireBrouillon('avis'), 'x');
  effacerBrouillon('avis');
  assert.equal(lireBrouillon('avis'), '');
});

test('brouillon : stockage cassé → ne plante pas', async () => {
  globalThis.localStorage = { getItem() { throw new Error('bloqué'); }, setItem() { throw new Error('bloqué'); }, removeItem() { throw new Error('bloqué'); } };
  const { sauverBrouillon, lireBrouillon } = await import('../js/brouillon.js?b');
  sauverBrouillon('avis', 'x');
  assert.equal(lireBrouillon('avis'), '');
});
