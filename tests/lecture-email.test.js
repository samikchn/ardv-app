import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lireEmailAvis, cleAvis, estExpediteurGoogle } from '../supabase/functions/ardv-avis-gmail/lecture.js';

// Reconstitué depuis la capture de l'e-mail Google du 31/10 (à ajuster sur les vrais e-mails reçus)
const TEXTE = `Bravo, vous avez reçu un nouvel avis avec 5 étoile(s)
Lire l'avis <https://business.google.com/reviews?hl=fr&r=abc>

NOËLLE
(Translated by Google) Excellent, fast service. Quality products. Very friendly staff. And...
Répondre aux avis <https://business.google.com/reviews/reply?r=abc>

Répondre aux avis des clients permet de renforcer la confiance. Nous informerons NOËLLE que vous lui avez répondu.

Voici un avis auquel vous n'avez pas encore répondu :

Mark Redmond
Worthy of its 5 star review. Not because the food is exceptional although it's good. I allocate 5...
Répondre à l'avis <https://business.google.com/reviews/reply?r=def>
`;

test('e-mail Google : deux avis, nom, texte, lien', () => {
  const avis = lireEmailAvis({ sujet: 'Bravo, vous avez reçu un nouvel avis avec 5 étoile(s)', texte: TEXTE });
  assert.equal(avis.length, 2);
  assert.equal(avis[0].auteur, 'NOËLLE');
  assert.equal(avis[0].etoiles, 5);
  assert.match(avis[0].texte, /^\(Translated by Google\) Excellent/);
  assert.equal(avis[0].lien, 'https://business.google.com/reviews/reply?r=abc');
  assert.equal(avis[1].auteur, 'Mark Redmond');
  assert.equal(avis[1].etoiles, null);
  assert.match(avis[1].texte, /^Worthy of its 5 star/);
});

test('clé anti-doublon : même avis dans deux e-mails = même clé', () => {
  assert.equal(cleAvis('Mark Redmond', 'Worthy of its 5 star review.'), cleAvis(' mark redmond', 'Worthy  of its 5 star review...'));
  assert.notEqual(cleAvis('Mark', 'A'), cleAvis('Mark', 'B'));
});

test('e-mail sans avis reconnaissable → liste vide (rien d\'inventé)', () => {
  assert.deepEqual(lireEmailAvis({ sujet: 'Votre fiche a été vue 300 fois', texte: 'Statistiques du mois\nVoir plus' }), []);
});

test('lien non https ignoré', () => {
  const t = 'Nouvel avis\nJean\nSuper\nRépondre à l\'avis <javascript:alert(1)>';
  const avis = lireEmailAvis({ sujet: 'nouvel avis avec 4 étoile(s)', texte: t });
  assert.equal(avis[0].lien, null);
});

test('revue 2 : seuls les liens Google sont gardés', () => {
  const t = (url) => lireEmailAvis({ sujet: 'nouvel avis avec 5 étoile(s)', texte: `Jean\nSuper\nRépondre à l'avis <${url}>` })[0].lien;
  assert.equal(t('https://business.google.com/reviews/x'), 'https://business.google.com/reviews/x');
  assert.equal(t('https://g.page/r/abc'), 'https://g.page/r/abc');
  assert.equal(t('https://google.com.arnaque.fr/login'), null);
  assert.equal(t('https://faux-google.com/x'), null);
});

test('revue 2 : expéditeur Google exigé', () => {
  assert.equal(estExpediteurGoogle('Google Business Profile <businessprofile-noreply@google.com>'), true);
  assert.equal(estExpediteurGoogle('noreply@google.com'), true);
  assert.equal(estExpediteurGoogle('Pirate <nouvel.avis@gmail.com>'), false);
  assert.equal(estExpediteurGoogle('x@google.com.evil.fr'), false);
});
