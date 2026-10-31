import { test } from 'node:test';
import assert from 'node:assert/strict';
import { corpsGemini, lireTexteGemini, mapGeminiError, estAutorise, modelesAEssayer, doitReessayer } from '../supabase/functions/ardv-ia/gemini.js';

const LISTE = ['maman@example.com', 'sami@example.com'];

test('surcharge Gemini → message « très demandée »', () => {
  assert.equal(mapGeminiError(503), 'quota');
});

test('erreurs Gemini', () => {
  assert.equal(mapGeminiError(429), 'quota');
  assert.equal(mapGeminiError(500), 'ia');
  assert.equal(mapGeminiError(400), 'ia');
});

test('liste des comptes autorisés', () => {
  assert.equal(estAutorise(' MaMan@Example.com ', LISTE), true);
  assert.equal(estAutorise('x@y.fr', LISTE), false);
  assert.equal(estAutorise('', LISTE), false);
  assert.equal(estAutorise(undefined, LISTE), false);
});

test('lecture de la réponse', () => {
  assert.equal(lireTexteGemini({ candidates: [{ content: { parts: [{ text: 'Bon' }, { text: 'jour' }] } }] }), 'Bonjour');
  assert.throws(() => lireTexteGemini({}));
});

test('corps de la demande, avec image', () => {
  const c = corpsGemini({ system: 'S', user: 'U', image: { mime: 'image/jpeg', base64: 'AAA' } });
  assert.equal(c.systemInstruction.parts[0].text, 'S');
  const parts = c.contents[0].parts;
  assert.equal(parts[0].text, 'U');
  assert.deepEqual(parts[1], { inline_data: { mime_type: 'image/jpeg', data: 'AAA' } });
});

test('corps sans image', () => {
  const c = corpsGemini({ system: 'S', user: 'U' });
  assert.equal(c.contents[0].parts.length, 1);
});

test('revue relue : pas de réflexion qui mange la réponse', () => {
  const c = corpsGemini({ system: 'S', user: 'U' });
  assert.equal(c.generationConfig.thinkingConfig.thinkingBudget, 0);
});

test('revue relue : réponse coupée refusée', () => {
  assert.throws(() => lireTexteGemini({ candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: 'Merci pour' }] } }] }));
});

test('modèle arrêté → repli sur gemini-flash-latest', () => {
  assert.deepEqual(modelesAEssayer('gemini-2.5-flash'), ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-flash-lite-latest']);
  assert.deepEqual(modelesAEssayer(''), ['gemini-flash-latest', 'gemini-flash-lite-latest']);
  assert.deepEqual(modelesAEssayer(' gemini-flash-latest '), ['gemini-flash-latest', 'gemini-flash-lite-latest']);
});

test('réessayer : 404 → modèle suivant, 400 → sans réglage de réflexion, 429 → non', () => {
  assert.equal(doitReessayer(404), 'modele');
  assert.equal(doitReessayer(400), 'sans-reflexion');
  assert.equal(doitReessayer(429), null);
  assert.equal(doitReessayer(503), 'surcharge');
  assert.equal(doitReessayer(500), 'surcharge');
  assert.equal(doitReessayer(403), null);
});

test('corps sans réglage de réflexion', () => {
  const c = corpsGemini({ system: 'S', user: 'U' }, { reflexion: false });
  assert.equal(c.generationConfig.thinkingConfig, undefined);
});

test('plusieurs photos (posts)', () => {
  const c = corpsGemini({ system: 'S', user: 'U', images: [{ mime: 'image/jpeg', base64: 'A' }, { mime: 'image/png', base64: 'B' }] });
  assert.equal(c.contents[0].parts.length, 3);
  assert.equal(c.contents[0].parts[2].inline_data.mime_type, 'image/png');
});
