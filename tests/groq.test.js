import { test } from 'node:test';
import assert from 'node:assert/strict';
import { corpsGroq, lireTexteGroq, modelesGroq, ordreFournisseurs } from '../supabase/functions/ardv-ia/groq.js';

test('Groq : corps au format OpenAI, sans image', () => {
  const c = corpsGroq({ system: 'S', user: 'U' }, 'llama-3.3-70b-versatile');
  assert.equal(c.model, 'llama-3.3-70b-versatile');
  assert.deepEqual(c.messages[0], { role: 'system', content: 'S' });
  assert.deepEqual(c.messages[1], { role: 'user', content: 'U' });
});

test('Groq : avec image → contenu en parties', () => {
  const c = corpsGroq({ system: 'S', user: 'U', image: { mime: 'image/jpeg', base64: 'AAA' } }, 'x');
  assert.equal(c.messages[1].content[1].image_url.url, 'data:image/jpeg;base64,AAA');
});

test('Groq : modèles texte et image', () => {
  assert.ok(modelesGroq(false).length >= 2);
  assert.ok(modelesGroq(true).every(m => /scout|maverick|vision/i.test(m)));
});

test('Groq : lecture de la réponse', () => {
  assert.equal(lireTexteGroq({ choices: [{ message: { content: ' Merci ! ' }, finish_reason: 'stop' }] }), 'Merci !');
  assert.throws(() => lireTexteGroq({ choices: [{ message: { content: 'Merci p' }, finish_reason: 'length' }] }));
  assert.throws(() => lireTexteGroq({}));
});

test('ordre : Gemini puis Groq seulement si la clé Groq existe', () => {
  assert.deepEqual(ordreFournisseurs({ gemini: 'k', groq: '' }), ['gemini']);
  assert.deepEqual(ordreFournisseurs({ gemini: 'k', groq: 'g' }), ['gemini', 'groq']);
  assert.deepEqual(ordreFournisseurs({ gemini: '', groq: 'g' }), ['groq']);
});

test('Groq : plusieurs photos', () => {
  const c = corpsGroq({ system: 'S', user: 'U', images: [{ mime: 'image/jpeg', base64: 'A' }, { mime: 'image/jpeg', base64: 'B' }] }, 'x');
  assert.equal(c.messages[1].content.length, 3);
});
