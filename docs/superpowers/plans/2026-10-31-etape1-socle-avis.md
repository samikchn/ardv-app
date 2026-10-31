# Étape 1 — Socle + Avis (mode « coller ») : plan de réalisation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** une appli iPhone installable qui connaît le restaurant, avec un bouton FR/EN, et qui écrit des réponses aux avis collés (texte ou capture), dans le style de Rafiza, via Gemini.

**Architecture :** une PWA en HTML/JS simple, sans compilation (même principe que Notre Jardin), hébergée sur GitHub Pages (pas Netlify : crédits). Supabase fournit la connexion par code e-mail, la base (fiche restaurant, avis, réponses, exemples) et une fonction serveur `ia` qui garde la clé Gemini secrète. La logique pure (textes, construction des demandes à l'IA, analyse des réponses) vit dans des modules ES testés avec `node --test`. Les écrans sont vérifiés par captures dans Edge sans fenêtre, en priorité basse.

**Tech Stack :** HTML/CSS/JS (modules ES), supabase-js v2 via CDN jsdelivr (version fixe), Supabase Edge Functions (Deno), API Gemini (`generativelanguage.googleapis.com`, modèle Flash avec images), Node 24 (`node --test`), Python `http.server` pour le serveur local, PowerShell + Edge sans fenêtre pour les captures.

**Spec :** `docs/2026-10-31-ardv-app-design.md` (§5, §6.1, §6.5, §7, §7 bis). Les étapes 2 à 5 auront leur propre plan, une fois celui-ci validé par Sami.

## Global Constraints

- iPhone d'abord : écran de 390 px, zones tactiles de 44 px minimum, contraste AA, mode sombre via `prefers-color-scheme`.
- Bouton FR / EN : chaque texte de l'interface passe par `t(clé)`. Langue par défaut : `en` (elle écrit surtout en anglais). Le choix est mémorisé dans `localStorage`, dans un try/catch.
- La clé Gemini ne doit **jamais** se trouver dans le dossier public : seulement dans le secret Supabase `GEMINI_API_KEY`. Le modèle est dans le secret `GEMINI_MODEL`. Vérifier le nom du modèle Flash actuel dans la doc Google (context7) au moment de l'étape 5.
- Gemini en formule gratuite : n'envoyer que le nécessaire (pas d'e-mails, pas de montants). Une erreur 429 devient le message « Réessaie dans une minute / Try again in a minute ».
- Deux comptes seulement peuvent entrer : `aurendezvous11@gmail.com` (Rafiza) et `(e-mail de Sami)` (Sami). La vérification se fait côté base (RLS) **et** dans la fonction `ia`.
- Signature des réponses : « L'équipe du Café Au Rendez-Vous » + `aurendezvous-saintdenis.fr`. Option « signer Rafiza ».
- Aucune publication automatique : la sortie se limite à **Copier**, **Autre version** et **Fait ✓**.
- Ménager le PC : Edge sans fenêtre en priorité basse, un seul à la fois, profil temporaire effacé ; arrêter le serveur local à la fin.
- Comptes en ligne : Sami se connecte à son compte Supabase ; Claude crée le projet (outil MCP Supabase, offre gratuite, après accord) et le dépôt GitHub public `samikchn/ardv-app` avec Pages (`gh`). Les scripts SQL qui insèrent des données sont lancés par Sami. Le dépôt étant public : jamais de clé secrète, de `donnees-privees/` ni de `a-lancer-2-exemples.sql` dedans.

## Review Focus

1. **Avis très long ou collé avec des restes de page** (« Répondre », « Lire la suite », emoji, sauts de ligne) : le nettoyage doit garder le texte du client et retirer ces restes. → test `nettoyerAvis` (Task 3).
2. **Avis dans une langue rare (norvégien) ou traduit par Google** (« (Translated by Google) … (Original) … ») : la réponse doit être dans la langue **originale**. → test `buildReviewPrompt` qui prend la partie « Original » (Task 3).
3. **Seulement des étoiles, sans texte** : la réponse doit rester chaleureuse, et le bouton « Écrire la réponse » ne doit pas être bloqué. → tests Task 3 et Task 6.
4. **Quota Gemini dépassé, ou réseau coupé dans le restaurant** : message clair, et le texte saisi est conservé (brouillon). → tests `mapGeminiError` (Task 4) et brouillon (Task 6).
5. **Une personne non autorisée reçoit le lien** : elle ne peut ni lire les données ni appeler l'IA. → test SQL de la RLS + test `estAutorise` (Tasks 4 et 5).

---

### Task 1 : Squelette PWA, langues, outils de test

**Files :**
- Create : `index.html`, `style.css`, `manifest.json`, `sw.js`, `icon.svg`, `icon-180.png`, `icon-512.png`, `config.js`
- Create : `js/i18n.js`, `js/app.js` (routeur à onglets : Avis · Posts · Pubs · Écrire · Fiche ; seuls Avis et Fiche sont actifs, les autres affichent « Bientôt / Coming soon »)
- Create : `outils/serveur-local.py` (port **5174**), `outils/edge-commun.ps1` (copié et adapté de Notre Jardin), `outils/capture.ps1`, `tester-en-local.bat`, `.claude/launch.json`, `.gitignore`, `package.json` (`"type":"module"`, script `test: node --test tests/`)
- Test : `tests/i18n.test.js`

**Interfaces :**
- Produces : `t(cle: string, vars?: object): string`, `setLang(l: 'fr'|'en'): void`, `getLang(): 'fr'|'en'`, `onLangChange(fn)`. Une clé manquante dans une langue → texte de l'autre langue ; absente des deux → la clé elle-même.
- Produces : `window.APP_CONFIG = { supabaseUrl, supabaseAnonKey }`. Vide = **mode démo** : données locales, IA simulée par des réponses d'exemple.

- [ ] **Step 1 :** `git init` dans `C:\Users\kouch\Documents\ardv-app` (sert aussi de sauvegarde). `.gitignore` : `*.json` dans `donnees-privees/`, `node_modules/`.
- [ ] **Step 2 : test qui échoue**, `tests/i18n.test.js` :
```js
test('fr/en et repli', () => {
  setLang('fr'); assert.equal(t('tab.reviews'), 'Avis');
  setLang('en'); assert.equal(t('tab.reviews'), 'Reviews');
  assert.equal(t('cle.inconnue'), 'cle.inconnue');
  assert.equal(t('reviews.count', { n: 3 }), '3 reviews to answer');
});
```
- [ ] **Step 3 :** `npm test` → FAIL (module introuvable).
- [ ] **Step 4 :** écrire `js/i18n.js`, puis le squelette : en-tête « Café Au Rendez-Vous », bouton FR|EN en haut à droite, barre d'onglets en bas. Palette tirée de l'enseigne qu'elle a choisie : bleu indigo + or (`--indigo:#2B2F77`, `--or:#F5C542`), fond crème en clair et indigo profond en sombre. Typographie lisible, 17 px minimum pour le corps du texte. Charger la compétence `impeccable` avant de dessiner l'interface.
- [ ] **Step 5 :** `npm test` → PASS. Puis `powershell -File outils/capture.ps1 -Url "http://localhost:5174/?demo" -Sortie captures/t1.png` (390×844) : regarder la capture, en clair et en sombre.
- [ ] **Step 6 :** commit `feat: squelette PWA + FR/EN`.

### Task 2 : Fiche restaurant

**Files :** Create `js/profil.js`, `js/ecran-fiche.js` · Test `tests/profil.test.js`

**Interfaces :**
- Produces : `DEFAULT_PROFILE` (objet), `contexteRestaurant(profil): string` (bloc de texte injecté dans chaque demande à l'IA), `chargerProfil(): Promise<profil>`, `enregistrerProfil(profil): Promise<void>`. Hors mode démo, les données vont dans la table `profil` (Task 5) ; sinon dans le stockage local.
- Champs de `DEFAULT_PROFILE` (valeurs du spec §1 et §6.1) : `nom:'Café Au Rendez-Vous'`, `adresse:'11 Allée des 6 Chapelles, 93200 Saint-Denis'`, `situation:'derrière la Basilique de Saint-Denis, impasse piétonne'`, `site:'aurendezvous-saintdenis.fr'`, `telephone:'09 84 47 70 16'`, `horaires:'Mar–Ven 11h30–17h · Sam–Dim 11h30–22h'`, `specialites:['galettes et crêpes bretonnes','glaces artisanales','smoothies','café barista','crème brûlée maison']`, `equipe:['Rafiza','Sami','Chaima']`, `signature:"L'équipe du Café Au Rendez-Vous"`, `motsCles:['crêperie','Saint-Denis','Basilique de Saint-Denis','Café Au Rendez-Vous']`, `devise:'La satisfaction du client d\'abord, le commerce ensuite.'`.

- [ ] **Step 1 : test qui échoue** : `contexteRestaurant(DEFAULT_PROFILE)` contient `'Basilique de Saint-Denis'`, `'aurendezvous-saintdenis.fr'` et `'Chaima'`, et **ne contient pas** `'@'` (pas d'e-mail envoyé à l'IA).
- [ ] **Step 2 :** `npm test` → FAIL.
- [ ] **Step 3 :** implémenter, puis l'écran Fiche : champs modifiables, listes en puces modifiables, bouton « Enregistrer ».
- [ ] **Step 4 :** `npm test` → PASS + capture de l'écran Fiche.
- [ ] **Step 5 :** commit `feat: fiche restaurant`.

### Task 3 : Le « cerveau » des avis (nettoyage + construction de la demande)

**Files :** Create `js/avis-prompt.js` · Test `tests/avis-prompt.test.js`

**Interfaces :**
- Produces : `nettoyerAvis(brut: string): { texte: string, auteur?: string, etoiles?: number, traduit: boolean }`
- Produces : `buildReviewPrompt({ avis, souvenir?, profil, exemples: string[], recentes: string[], variante: number, signerRafiza: boolean }): { system: string, user: string }`
- Produces : `debutsRecents(reponses: string[], n = 30): string[]`, qui renvoie les 6 premiers mots de chaque réponse récente (les formules à ne pas répéter).

Les règles du spec §6.1 sont recopiées **mot pour mot** dans `system` (langue du client, ton humain jamais structuré, court, invitation à revenir, mots-clés naturels, signature, étoiles seules = merci chaleureux, Local Guide seulement si c'est indiqué, négatif = excuse honnête sans se défendre, retard = raison crédible, remercier les prénoms de l'équipe cités, devise). Sortie demandée : **uniquement le texte de la réponse**.

- [ ] **Step 1 : tests qui échouent :**
```js
test('nettoie les restes de page', () => {
  const r = nettoyerAvis('NOËLLE\n★★★★★\nSuper crêpes !\nRépondre aux avis');
  assert.equal(r.texte, 'Super crêpes !'); assert.equal(r.etoiles, 5); assert.equal(r.auteur, 'NOËLLE');
});
test('traduit par Google → garde l\'original', () => {
  const r = nettoyerAvis('(Translated by Google) Excellent, fast service.\n\n(Original)\nExcellent, service rapide.');
  assert.equal(r.texte, 'Excellent, service rapide.'); assert.equal(r.traduit, true);
});
test('étoiles seules acceptées', () => {
  const p = buildReviewPrompt({ avis: { texte: '', etoiles: 5 }, profil: DEFAULT_PROFILE, exemples: [], recentes: [], variante: 0, signerRafiza: false });
  assert.match(p.user, /5/); assert.match(p.system, /étoiles seules|only stars/i);
});
test('signature et anti-répétition', () => {
  const p = buildReviewPrompt({ avis: { texte: 'Top' }, profil: DEFAULT_PROFILE, exemples: ['Ex A'], recentes: ['Merci infiniment pour'], variante: 1, signerRafiza: false });
  assert.match(p.system, /L'équipe du Café Au Rendez-Vous/); assert.match(p.system, /Merci infiniment pour/); assert.match(p.system, /Ex A/);
});
test('signer Rafiza', () => { /* signerRafiza:true → system contient « Rafiza » comme signature */ });
test('souvenir transmis', () => { /* souvenir:'venue avec sa fille' → présent dans user */ });
```
- [ ] **Step 2 :** `npm test` → FAIL.
- [ ] **Step 3 :** implémenter (pur, sans réseau). `variante > 0` ajoute « propose un angle différent de la version précédente ».
- [ ] **Step 4 :** `npm test` → PASS.
- [ ] **Step 5 :** commit `feat: construction des réponses aux avis`.

### Task 4 : Fonction serveur `ia` (Gemini)

**Files :** Create `supabase/functions/ia/index.ts`, `supabase/functions/ia/gemini.js` (pur, partagé) · Test `tests/gemini.test.js`

**Interfaces :**
- Produces (HTTP) : `POST /functions/v1/ia` avec l'en-tête `Authorization: Bearer <jeton utilisateur>`, corps `{ system: string, user: string, image?: { mime: string, base64: string } }`. Réponses : `200 { texte }` ; `401 { erreur:'connexion' }` ; `403 { erreur:'interdit' }` ; `429 { erreur:'quota' }` ; `502 { erreur:'ia' }`.
- Produces (`gemini.js`) : `corpsGemini({system,user,image}): object` (format `contents` + `systemInstruction`), `lireTexteGemini(json): string`, `mapGeminiError(status: number): 'quota'|'ia'`, `estAutorise(email: string, liste: string[]): boolean` (insensible à la casse, sans espaces).
- Secrets : `GEMINI_API_KEY`, `GEMINI_MODEL`, `EMAILS_AUTORISES` (`aurendezvous11@gmail.com,(e-mail de Sami)`).

- [ ] **Step 1 : tests qui échouent :** `mapGeminiError(429) === 'quota'` ; `mapGeminiError(500) === 'ia'` ; `estAutorise(' AurendezVous11@gmail.com ', [...]) === true` ; `estAutorise('x@y.fr', [...]) === false` ; `lireTexteGemini({candidates:[{content:{parts:[{text:'Bonjour'}]}}]}) === 'Bonjour'` ; `lireTexteGemini({})` lève une erreur ; `corpsGemini` avec une image ajoute une partie `inline_data`.
- [ ] **Step 2 :** `npm test` → FAIL. **Step 3 :** implémenter `gemini.js`, puis `index.ts` (vérifie le jeton avec `supabase.auth.getUser`, puis `estAutorise`, puis appelle Gemini ; ne journalise jamais le contenu des avis). **Step 4 :** `npm test` → PASS.
- [ ] **Step 5 :** commit `feat: fonction ia (Gemini)`. Le déploiement se fait à la Task 7.

### Task 5 : Base Supabase + exemples de ton

**Files :** Create `supabase/a-lancer-1-schema.sql`, `outils/extraire-exemples.py`, `supabase/a-lancer-2-exemples.sql` (généré, **non versionné** : il contient des avis réels) · Test `tests/extraire.test.js` (lance le script Python sur `tests/fixtures/mini-export.json`)

**Interfaces :**
- Tables : `profil(id int primary key default 1, data jsonb, maj timestamptz)` ; `avis(id uuid, source text, auteur text, etoiles int, texte text, lien text, statut text check in ('a_repondre','fait'), cree timestamptz)` ; `reponses(id uuid, avis_id uuid null, texte text, cree timestamptz)` ; `exemples(id serial, texte text)` ; `autorises(email text primary key)`, remplie avec les 2 e-mails.
- RLS sur toutes les tables : `exists(select 1 from autorises where email = auth.jwt()->>'email')`.
- `extraire-exemples.py <conversations.json> <sortie.sql>` : parcourt les conversations dont le nom contient « avis » ou « review » et prend les réponses de l'assistant qui contiennent « Au Rendez-Vous ». Il en extrait le texte de la réponse (le bloc entre la salutation et la signature) et en garde au maximum 100, sans doublons. Il écrit des `insert into exemples(texte) values (...)` en échappant les `'`.

- [ ] **Step 1 : test qui échoue :** sur la fixture (2 conversations, dont une hors sujet), la sortie contient exactement 2 `insert`, une apostrophe correctement échappée (`''`), et rien qui vienne de la conversation hors sujet.
- [ ] **Step 2 :** FAIL → **Step 3 :** implémenter (lancer avec `python -I`) → **Step 4 :** PASS.
- [ ] **Step 5 :** générer `a-lancer-2-exemples.sql` depuis `donnees-privees/conversations.json` (copié depuis Téléchargements) ; vérifier le nombre de lignes et en lire 5 au hasard.
- [ ] **Step 6 :** commit (sans le .sql d'exemples) `feat: schéma + extraction des exemples`.

### Task 6 : Connexion + écran Avis (mode coller)

**Files :** Create `js/supabase.js`, `js/connexion.js`, `js/ecran-avis.js`, `js/brouillon.js` · Test `tests/brouillon.test.js` + captures

**Interfaces :**
- Consumes : `t`, `chargerProfil`, `nettoyerAvis`, `buildReviewPrompt`, `debutsRecents`, la route `ia`.
- Produces : `appelIA({system,user,image?}): Promise<string>`, qui lève `Error('quota'|'ia'|'connexion'|'interdit'|'reseau')`. En mode démo, renvoie une réponse d'exemple après 600 ms.
- Produces : `chargerExemples(): Promise<string[]>` (12 tirés au hasard dans `exemples`) et `chargerReponsesRecentes(): Promise<string[]>` (30 dernières de `reponses`), passés à `buildReviewPrompt`. En mode démo : 3 exemples codés en dur.
- Produces : `sauverBrouillon(cle, valeur)` / `lireBrouillon(cle)` (localStorage, try/catch).
- Connexion : **code à 6 chiffres reçu par e-mail** (`signInWithOtp` + `verifyOtp` type `email`), pas de lien magique : sur iPhone, un lien ouvre Safari et non l'appli installée.

Écran Avis : liste « À répondre » (vide en étape 1, sauf ceux collés et pas encore marqués « Fait »), puis un gros bouton **Coller un avis**. Dans la feuille qui s'ouvre :
- une zone de texte et un bouton « 📋 Coller » (presse-papiers) ;
- un bouton « Capture d'écran » (`<input type=file accept=image/*>`, image redimensionnée à 1280 px max, puis envoyée à l'IA avec la consigne de lire l'avis) ;
- un champ « Un souvenir de ce client ? » et une case « Signer Rafiza » ;
- le bouton **Écrire la réponse**.

Résultat : la réponse en grand, puis **Copier**, **Autre version** (variante+1) et **Fait ✓** (enregistre la réponse dans `reponses` et l'avis en statut `fait`).

- [ ] **Step 1 : test qui échoue :** `sauverBrouillon('avis','x')` puis `lireBrouillon('avis') === 'x'`. Avec un localStorage qui lève une erreur, `lireBrouillon` renvoie `''` sans planter.
- [ ] **Step 2 :** FAIL → **Step 3 :** implémenter brouillon, connexion et écran → **Step 4 :** `npm test` PASS.
- [ ] **Step 5 : captures** en mode démo (390×844, clair et sombre, FR et EN) : liste vide, feuille « coller », réponse affichée, erreur quota simulée (`?demo&erreur=quota`) avec texte conservé. Regarder chaque capture.
- [ ] **Step 6 :** relecture de code (superpowers:requesting-code-review), puis commit `feat: connexion + écran avis`.

### Task 7 : Mise en ligne (avec Sami) et vérification réelle

**Files :** Create `MISE-EN-LIGNE.md` (pas-à-pas très simple)

- [ ] **Step 1 :** Supabase : vérifier les projets existants (`list_projects` ; l'offre gratuite en permet 2 actifs), puis créer le projet « ardv » (région Europe) avec `create_project`, après accord de Sami. Appliquer `a-lancer-1-schema.sql` (`apply_migration` : uniquement la structure). Rédiger `MISE-EN-LIGNE.md` pour ce qui reste à Sami :
  1. lancer `a-lancer-2-exemples.sql` dans l'éditeur SQL ;
  2. ajouter les secrets `GEMINI_API_KEY`, `GEMINI_MODEL`, `EMAILS_AUTORISES` ;
  3. Auth : activer l'e-mail OTP et désactiver l'inscription ouverte.
- [ ] **Step 2 :** remplir `config.js` (URL + clé publique via `get_project_url` / `get_publishable_keys`), déployer la fonction `ia` (`deploy_edge_function`), puis lancer `get_advisors` (sécurité) et corriger ce qui est signalé.
- [ ] **Step 3 :** vérifier avec `curl` sans jeton → 401. Avec la vraie appli en local + compte de Sami : coller l'avis de NOËLLE de la capture du 31/10, obtenir une réponse en français qui contient la signature. Coller un avis norvégien → réponse en norvégien.
- [ ] **Step 4 :** GitHub Pages : vérifier avec `git ls-files` qu'aucun fichier privé n'est suivi, puis créer le dépôt public `samikchn/ardv-app` (`gh repo create --public --source . --push`, après accord de Sami) et activer Pages sur la branche `main` (`gh api repos/samikchn/ardv-app/pages -X POST -f "source[branch]=main" -f "source[path]=/"`). Ouvrir `https://samikchn.github.io/ardv-app/` et vérifier que l'appli charge (chemins relatifs, `start_url: "./"`, portée du service worker).
- [ ] **Step 5 :** Sami installe l'appli sur l'iPhone de Rafiza (Partager → Sur l'écran d'accueil), se connecte avec le code, fait un essai complet.
- [ ] **Step 6 :** arrêter le serveur local, effacer les profils temporaires, mettre à jour la mémoire du projet, commit `docs: mise en ligne`.
