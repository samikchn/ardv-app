import { test } from 'node:test';
import assert from 'node:assert/strict';
import { voyant, ligneChiffres, questionPourClaude, euros, jourLocal } from '../js/pubs.js';

const C = { nom: 'Weekend Diner ARDV', statut: 'ENABLED', etat: 'LIMITED', budget: 5,
  hier: { clics: 12, impressions: 340, cout: 3.4, conversions: 1, appels: 1 }, semaine: { clics: 60, cout: 21.5, conversions: 4, appels: 2 } };

test('voyant : vert / orange / rouge', () => {
  assert.equal(voyant({ statut: 'ENABLED', etat: 'ELIGIBLE' }), 'vert');
  assert.equal(voyant({ statut: 'ENABLED', etat: 'LIMITED' }), 'orange');
  assert.equal(voyant({ statut: 'ENABLED', etat: 'LEARNING' }), 'orange');
  assert.equal(voyant({ statut: 'PAUSED', etat: 'PAUSED' }), 'rouge');
  assert.equal(voyant({ statut: 'ENABLED', etat: 'NOT_ELIGIBLE' }), 'rouge');
});

test('euros à la française', () => {
  assert.equal(euros(3.4, 'fr'), '3,40 €');
  assert.equal(euros(0, 'en'), '€0.00');
});

test('ligne de chiffres simple', () => {
  assert.equal(ligneChiffres(C.hier, 'fr'), '12 clics · 3,40 € · 1 appel');
  assert.equal(ligneChiffres({ clics: 1, cout: 0.5, appels: 0 }, 'fr'), '1 clic · 0,50 €');
  assert.equal(ligneChiffres({ clics: 2, cout: 1, appels: 3 }, 'en'), '2 clicks · €1.00 · 3 calls');
});

test('question pour Claude : vrais chiffres, termes, sa question, en français', () => {
  const q = questionPourClaude({ campagnes: [C], termes: [{ terme: 'glace artisanale près de moi', clics: 5, cout: 2 }], question: 'Pourquoi peu de clients le soir ?', langue: 'fr' });
  assert.match(q, /Weekend Diner ARDV/);
  assert.match(q, /12 clics · 3,40 € · 1 appel/);
  assert.match(q, /glace artisanale près de moi/);
  assert.match(q, /Pourquoi peu de clients le soir \?/);
  assert.match(q, /Google Ads/);
});

test('question pour Claude sans question : demande un point simple', () => {
  assert.match(questionPourClaude({ campagnes: [C], langue: 'fr' }), /que dois-je/i);
});

test('revue 2 : jour local (pas UTC) pour le résumé du coach', () => {
  const d = new Date(2026, 10, 1, 0, 30); // 1er nov. 00h30 heure locale
  assert.equal(jourLocal(d), '2026-11-01');
});
