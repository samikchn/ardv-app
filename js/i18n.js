// Textes de l'interface en français et en anglais.
// t('cle', { n: 3 }) remplace {n} ; une clé absente d'une langue prend l'autre, puis la clé elle-même.

const TEXTES = {
  fr: {
    'app.title': 'Au Rendez-Vous',
    'app.subtitle': 'Ma boîte à outils',
    'tab.reviews': 'Avis',
    'tab.posts': 'Posts',
    'tab.ads': 'Pubs',
    'tab.write': 'Écrire',
    'tab.profile': 'Fiche',
    'soon.title': 'Bientôt',
    'soon.text': 'Cette partie arrive dans une prochaine version.',
    'demo.banner': 'Mode démo : rien n\'est enregistré en ligne.',

    'reviews.title': 'Avis',
    'reviews.count': '{n} avis à répondre',
    'reviews.count1': '1 avis à répondre',
    'reviews.empty': 'Aucun avis en attente. Bravo !',
    'reviews.paste': 'Coller un avis',
    'reviews.pasteHint': 'Copiez l\'avis sur Google ou TripAdvisor, puis collez-le ici.',
    'reviews.textLabel': 'Texte de l\'avis',
    'reviews.textPlaceholder': 'Collez l\'avis ici…',
    'reviews.pasteBtn': 'Coller',
    'reviews.photoBtn': 'Capture d\'écran',
    'reviews.photoAdded': 'Capture ajoutée',
    'reviews.photoRemove': 'Retirer',
    'reviews.stars': 'Étoiles',
    'reviews.name': 'Nom du client',
    'reviews.namePlaceholder': 'Ex. : Noëlle (facultatif)',
    'reviews.truncated': "Google n'envoie que le début de l'avis.",
    'reviews.openFull': "Ouvrir l'avis complet sur Google",
    'reviews.memory': 'Un souvenir de ce client ? (facultatif)',
    'reviews.memoryPlaceholder': 'Ex. : venue avec sa fille, a adoré la galette complète',
    'reviews.signRafiza': 'Signer « Rafiza » (avis exceptionnel)',
    'reviews.write': 'Écrire la réponse',
    'reviews.writing': 'J\'écris la réponse…',
    'reviews.answer': 'Réponse proposée',
    'reviews.copy': 'Copier',
    'reviews.copied': 'Copié !',
    'reviews.copyFailed': 'La copie n\'a pas marché : sélectionnez le texte et copiez-le à la main.',
    'reviews.retry': 'Réessayer',
    'err.chargement': 'L\'appli n\'a pas pu démarrer. Vérifiez internet puis rouvrez-la.',
    'reviews.other': 'Autre version',
    'reviews.done': 'Fait ✓',
    'reviews.doneToast': 'Avis classé. Merci !',
    'reviews.close': 'Fermer',
    'reviews.needText': 'Collez un avis, ajoutez une capture ou choisissez des étoiles.',
    'reviews.anon': 'Client',

    'profile.title': 'Fiche du restaurant',
    'profile.intro': 'Ces informations servent à toutes les réponses et tous les textes.',
    'profile.nom': 'Nom',
    'profile.adresse': 'Adresse',
    'profile.situation': 'Où nous trouver',
    'profile.site': 'Site internet',
    'profile.telephone': 'Téléphone',
    'profile.horaires': 'Horaires',
    'profile.specialites': 'Spécialités (une par ligne)',
    'profile.equipe': 'Équipe (un prénom par ligne)',
    'profile.signature': 'Signature des réponses',
    'profile.motsCles': 'Mots-clés Google (un par ligne)',
    'profile.devise': 'Notre devise',
    'profile.save': 'Enregistrer',
    'profile.saved': 'Enregistré ✓',

    'login.title': 'Connexion',
    'login.intro': 'Entrez votre adresse e-mail et votre mot de passe. Vous resterez connectée ensuite.',
    'login.password': 'Mot de passe',
    'login.submit': 'Se connecter',
    'login.email': 'Adresse e-mail',
    'login.bad': 'E-mail ou mot de passe incorrect. Vérifiez et réessayez.',
    'login.logout': 'Se déconnecter',

    'err.quota': 'L\'IA est très demandée. Réessayez dans une minute.',
    'err.reseau': 'Pas de connexion internet. Votre texte est gardé, réessayez plus tard.',
    'err.connexion': 'Vous n\'êtes plus connectée. Reconnectez-vous.',
    'err.interdit': 'Ce compte n\'a pas accès à l\'appli.',
    'err.ia': 'Petit souci avec l\'IA. Réessayez.',
  },
  en: {
    'app.title': 'Au Rendez-Vous',
    'app.subtitle': 'My toolbox',
    'tab.reviews': 'Reviews',
    'tab.posts': 'Posts',
    'tab.ads': 'Ads',
    'tab.write': 'Write',
    'tab.profile': 'Profile',
    'soon.title': 'Coming soon',
    'soon.text': 'This part is coming in a next version.',
    'demo.banner': 'Demo mode: nothing is saved online.',

    'reviews.title': 'Reviews',
    'reviews.count': '{n} reviews to answer',
    'reviews.count1': '1 review to answer',
    'reviews.empty': 'No review waiting. Well done!',
    'reviews.paste': 'Paste a review',
    'reviews.pasteHint': 'Copy the review on Google or TripAdvisor, then paste it here.',
    'reviews.textLabel': 'Review text',
    'reviews.textPlaceholder': 'Paste the review here…',
    'reviews.pasteBtn': 'Paste',
    'reviews.photoBtn': 'Screenshot',
    'reviews.photoAdded': 'Screenshot added',
    'reviews.photoRemove': 'Remove',
    'reviews.stars': 'Stars',
    'reviews.name': 'Customer name',
    'reviews.namePlaceholder': 'E.g. Noëlle (optional)',
    'reviews.truncated': 'Google only sends the start of the review.',
    'reviews.openFull': 'Open the full review on Google',
    'reviews.memory': 'A memory of this customer? (optional)',
    'reviews.memoryPlaceholder': 'E.g. came with her daughter, loved the galette',
    'reviews.signRafiza': 'Sign “Rafiza” (exceptional review)',
    'reviews.write': 'Write the reply',
    'reviews.writing': 'Writing the reply…',
    'reviews.answer': 'Suggested reply',
    'reviews.copy': 'Copy',
    'reviews.copied': 'Copied!',
    'reviews.copyFailed': 'Copy did not work: select the text and copy it by hand.',
    'reviews.retry': 'Try again',
    'err.chargement': 'The app could not start. Check the internet, then open it again.',
    'reviews.other': 'Another version',
    'reviews.done': 'Done ✓',
    'reviews.doneToast': 'Review filed. Thank you!',
    'reviews.close': 'Close',
    'reviews.needText': 'Paste a review, add a screenshot or pick the stars.',
    'reviews.anon': 'Customer',

    'profile.title': 'Restaurant profile',
    'profile.intro': 'This information is used for every reply and every text.',
    'profile.nom': 'Name',
    'profile.adresse': 'Address',
    'profile.situation': 'How to find us',
    'profile.site': 'Website',
    'profile.telephone': 'Phone',
    'profile.horaires': 'Opening hours',
    'profile.specialites': 'Specialities (one per line)',
    'profile.equipe': 'Team (one first name per line)',
    'profile.signature': 'Reply signature',
    'profile.motsCles': 'Google keywords (one per line)',
    'profile.devise': 'Our motto',
    'profile.save': 'Save',
    'profile.saved': 'Saved ✓',

    'login.title': 'Sign in',
    'login.intro': 'Enter your email address and your password. You will stay signed in.',
    'login.password': 'Password',
    'login.submit': 'Sign in',
    'login.email': 'Email address',
    'login.bad': 'Wrong email or password. Check and try again.',
    'login.logout': 'Sign out',

    'err.quota': 'The AI is busy. Try again in a minute.',
    'err.reseau': 'No internet connection. Your text is kept, try again later.',
    'err.connexion': 'You are signed out. Please sign in again.',
    'err.interdit': 'This account has no access to the app.',
    'err.ia': 'Small problem with the AI. Try again.',
  },
};

const CLE_STOCKAGE = 'ardv-langue';
let langue = 'en';
try { const l = globalThis.localStorage?.getItem(CLE_STOCKAGE); if (l === 'fr' || l === 'en') langue = l; } catch { /* stockage indisponible */ }
const abonnes = new Set();

export function t(cle, vars) {
  const autre = langue === 'fr' ? 'en' : 'fr';
  let s = TEXTES[langue][cle] ?? TEXTES[autre][cle] ?? cle;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
  return s;
}

export function setLang(l) {
  langue = l === 'fr' ? 'fr' : 'en';
  try { globalThis.localStorage?.setItem(CLE_STOCKAGE, langue); } catch { /* rien */ }
  abonnes.forEach(fn => fn(langue));
}

export const getLang = () => langue;
export const onLangChange = fn => { abonnes.add(fn); return () => abonnes.delete(fn); };
