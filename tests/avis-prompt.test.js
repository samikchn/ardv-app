import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nettoyerAvis, buildReviewPrompt, debutsRecents } from '../js/avis-prompt.js';
import { DEFAULT_PROFILE } from '../js/profil.js';

const base = { profil: DEFAULT_PROFILE, exemples: [], recentes: [], variante: 0, signerRafiza: false };

test('nettoie les restes de page', () => {
  const r = nettoyerAvis('NOËLLE\n★★★★★\nSuper crêpes !\nRépondre aux avis');
  assert.equal(r.texte, 'Super crêpes !');
  assert.equal(r.etoiles, 5);
  assert.equal(r.auteur, 'NOËLLE');
});

test("traduit par Google → garde l'original", () => {
  const r = nettoyerAvis('(Translated by Google) Excellent, fast service.\n\n(Original)\nExcellent, service rapide.');
  assert.equal(r.texte, 'Excellent, service rapide.');
  assert.equal(r.traduit, true);
});

test('texte simple gardé tel quel', () => {
  const r = nettoyerAvis('  Très bon accueil, on reviendra.\n\nMerci !  ');
  assert.equal(r.texte, 'Très bon accueil, on reviendra.\n\nMerci !');
  assert.equal(r.traduit, false);
});

test('mentions TripAdvisor / Google retirées', () => {
  const r = nettoyerAvis('Délicieux !\nLire la suite\nUtile\nPartager\nil y a 2 jours');
  assert.equal(r.texte, 'Délicieux !');
});

test('étoiles seules acceptées', () => {
  const p = buildReviewPrompt({ ...base, avis: { texte: '', etoiles: 5 } });
  assert.match(p.user, /5/);
  assert.match(p.system, /only stars/i);
});

test('signature, exemples et anti-répétition', () => {
  const p = buildReviewPrompt({ ...base, avis: { texte: 'Top' }, exemples: ['Ex A'], recentes: ['Merci infiniment pour'], variante: 1 });
  assert.match(p.system, /L'équipe du Café Au Rendez-Vous/);
  assert.match(p.system, /Merci infiniment pour/);
  assert.match(p.system, /Ex A/);
  assert.match(p.system, /different angle/i);
});

test('signer Rafiza', () => {
  const p = buildReviewPrompt({ ...base, avis: { texte: 'Top' }, signerRafiza: true });
  assert.match(p.system, /Sign the reply "Rafiza"/);
});

test('souvenir transmis', () => {
  const p = buildReviewPrompt({ ...base, avis: { texte: 'Top' }, souvenir: 'venue avec sa fille' });
  assert.match(p.user, /venue avec sa fille/);
});

test('langue du client demandée', () => {
  const p = buildReviewPrompt({ ...base, avis: { texte: 'Veldig god crêpe!' } });
  assert.match(p.system, /same language as the review/i);
});

test('débuts récents = 6 premiers mots', () => {
  assert.deepEqual(debutsRecents(['Merci infiniment pour votre très joli message !', '  Bonjour Marie, quel plaisir ']), ['Merci infiniment pour votre très joli', 'Bonjour Marie, quel plaisir']);
});

test('revue relue : phrases du client jamais prises pour des dates', () => {
  assert.equal(nettoyerAvis('A must after visiting the Basilica on a Sunday').texte, 'A must after visiting the Basilica on a Sunday');
  assert.equal(nettoyerAvis('Il y a une super ambiance, on revient chaque semaine').texte, 'Il y a une super ambiance, on revient chaque semaine');
  assert.equal(nettoyerAvis('Délicieux\nil y a 2 semaines\na week ago').texte, 'Délicieux');
});

test('revue relue : traduction sans original → langue inconnue signalée', () => {
  const r = nettoyerAvis('(Translated by Google) Very good crêpe.');
  assert.equal(r.texte, 'Very good crêpe.');
  assert.equal(r.traductionSeule, true);
  const p = buildReviewPrompt({ ...base, avis: r });
  assert.match(p.user, /language is unknown/i);
  assert.doesNotMatch(p.user, /text above is the original/);
});

test('revue relue : nom et étoiles gardés quand il y a un original', () => {
  const r = nettoyerAvis('NOËLLE\n★★★★★\n(Translated by Google) Excellent.\n\n(Original)\nExcellent, service rapide.');
  assert.equal(r.texte, 'Excellent, service rapide.');
  assert.equal(r.auteur, 'NOËLLE');
  assert.equal(r.etoiles, 5);
});

test('revue relue : étoiles limitées à 5, emoji avec sélecteur reconnu', () => {
  assert.equal(nettoyerAvis('⭐⭐⭐⭐⭐⭐\nTop').etoiles, 5);
  assert.equal(nettoyerAvis('⭐️⭐️⭐️⭐️\nTop').etoiles, 4);
});

test('revue relue : capture → pas de « only stars » contradictoire', () => {
  const p = buildReviewPrompt({ ...base, avis: { texte: '' }, avecCapture: true });
  assert.doesNotMatch(p.user, /only stars/);
  assert.match(p.user, /screenshot/);
});
