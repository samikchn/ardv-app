import { test } from 'node:test';
import assert from 'node:assert/strict';
import { voyant, ligneChiffres, buildCoachPrompt, euros } from '../js/pubs.js';
import { DEFAULT_PROFILE } from '../js/profil.js';

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

test('coach : ses règles, les vrais chiffres, jamais de stratégie automatique', () => {
  const p = buildCoachPrompt({ campagnes: [C], termes: [{ terme: 'glace artisanale près de moi', clics: 5, cout: 2 }], question: 'Pourquoi peu de clients le soir ?', profil: DEFAULT_PROFILE, langue: 'fr' });
  assert.match(p.system, /manual CPC/i);
  assert.match(p.system, /never.*(Smart|automatic)/i);
  assert.match(p.system, /exact match/i);
  assert.match(p.user, /Weekend Diner ARDV/);
  assert.match(p.user, /glace artisanale près de moi/);
  assert.match(p.user, /Pourquoi peu de clients le soir/);
  assert.match(p.system, /French/);
});
