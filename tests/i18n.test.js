import { test } from 'node:test';
import assert from 'node:assert/strict';
import { t, setLang, getLang } from '../js/i18n.js';

test('fr/en et repli', () => {
  setLang('fr'); assert.equal(t('tab.reviews'), 'Avis'); assert.equal(getLang(), 'fr');
  setLang('en'); assert.equal(t('tab.reviews'), 'Reviews');
  assert.equal(t('cle.inconnue'), 'cle.inconnue');
  assert.equal(t('reviews.count', { n: 3 }), '3 reviews to answer');
});

test('langue inconnue → anglais', () => {
  setLang('de'); assert.equal(getLang(), 'en');
});
