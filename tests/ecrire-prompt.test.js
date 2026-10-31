import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MODELES, buildEcrirePrompt, lireAffiche } from '../js/ecrire-prompt.js';
import { DEFAULT_PROFILE } from '../js/profil.js';

test('les 6 modèles existent, chacun avec des champs', () => {
  assert.deepEqual(MODELES.map(m => m.id), ['affiche-horaires', 'affiche-fermeture', 'email-fournisseur', 'email-uniite', 'lettre-client', 'offre-emploi']);
  MODELES.forEach(m => assert.ok(m.champs.length >= 1, m.id));
});

test('affiche de fermeture : dates reprises, réponse JSON demandée', () => {
  const p = buildEcrirePrompt('affiche-fermeture', { du: '10 août', au: '24 août', motif: 'congés' }, DEFAULT_PROFILE, 'fr');
  assert.match(p.user, /10 août/); assert.match(p.user, /24 août/);
  assert.match(p.system, /JSON/);
});

test('e-mail UNIITÉ : titre, méta-description et texte ALT demandés', () => {
  const p = buildEcrirePrompt('email-uniite', { sujet: 'glace fraise-citron' }, DEFAULT_PROFILE, 'fr');
  assert.match(p.system, /Meta Description/i); assert.match(p.system, /ALT/);
});

test('e-mail fournisseur : ferme mais respectueux', () => {
  const p = buildEcrirePrompt('email-fournisseur', { fournisseur: 'Cafés X', probleme: 'livraisons arrêtées' }, DEFAULT_PROFILE, 'fr');
  assert.match(p.system, /firm/i); assert.match(p.system, /respectful/i);
});

test('modèle inconnu → erreur', () => {
  assert.throws(() => buildEcrirePrompt('nimporte', {}, DEFAULT_PROFILE, 'fr'));
});

test('lecture affiche', () => {
  assert.deepEqual(lireAffiche('```json\n{"titre":"Fermeture estivale","texte":"Du 10 au 24 août"}\n```'), { titre: 'Fermeture estivale', texte: 'Du 10 au 24 août' });
  assert.throws(() => lireAffiche('rien'));
});
