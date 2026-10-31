# Appli « Au Rendez-Vous » — document de conception

Date : 31/10/2026 · Demandée par Sami pour sa mère, Rafiza (cadeau).

## 1. Pourquoi

Rafiza gère le **Café Au Rendez-Vous** (SAS REV) : crêperie bretonne et glacier artisanal, 11 Allée des 6 Chapelles, 93200 Saint-Denis, derrière la Basilique, dans une impasse piétonne. Presque tous ses nouveaux clients viennent d'Internet. Elle a 763 avis à 4,9/5. Site : aurendezvous-saintdenis.fr (géré par l'agence UNIITÉ, sans accès direct). E-mail : aurendezvous11@gmail.com. Horaires indicatifs : du mardi au vendredi 11h30–17h, samedi et dimanche 11h30–22h (ils changent : l'appli doit pouvoir les modifier).

Depuis avril 2026, elle utilise Claude (environ 30 conversations) pour toujours les mêmes tâches. Elle doit réexpliquer ses règles à chaque fois, coller les avis, et envoyer des captures d'écran de Google Ads (319 messages sur 575 dans ses conversations Ads). Elle se dit peu à l'aise avec le numérique et demande des explications « comme à une fille de dix ans ». Elle écrit surtout en anglais, mélangé de français.

**Réussite** = elle ouvre l'appli sur son iPhone, voit ce qui est nouveau (avis, chiffres des pubs), obtient un texte prêt à copier en 1 ou 2 taps, et n'a plus jamais à réexpliquer qui elle est.

## 2. Objectifs

1. **Avis** : afficher automatiquement les nouveaux avis Google et proposer une réponse dans ses règles.
2. **Posts** : à partir d'une photo et de quelques mots, préparer les textes pour la fiche Google, Instagram et Facebook, avec un rappel programmé.
3. **Pubs** : afficher automatiquement les chiffres de ses campagnes Google Ads en mots simples, avec un coach qui explique quoi faire.
4. **Écrire** : affiches (horaires, fermeture), e-mails (fournisseurs, UNIITÉ, clients), lettres.
5. Bouton **FR / EN** pour l'interface.

## 3. Non-objectifs

- **Aucune modification automatique** sur Google (ni réponse publiée, ni pub modifiée). L'appli affiche, prépare et ouvre le bon écran Google. Elle fait l'action elle-même.
- Aucune demande d'accès officielle à Google (pas d'API Business Profile, pas d'accès Google Ads API). **Décision de Sami : pas de formulaire.**
- Pas de publication automatique sur Instagram ou Facebook (pas d'API Meta).
- Pas de factures, de caisse, de commandes en cuisine ni de santé.
- Pas d'App Store.

## 4. Anti-objectifs (ce qui serait un échec même si « ça marche »)

- Des réponses qui sonnent « IA » ou qui se répètent d'un avis à l'autre.
- Une interface chargée, pleine de termes techniques, ou trop petite pour être lue facilement.
- Un coach pub qui conseille les stratégies automatiques (Smart, Maximiser les conversions, AI Max). Elle a perdu de l'argent avec, et elle les refuse.
- Une clé ou des données visibles par n'importe qui.

## 5. Décisions déjà prises

| Sujet | Décision | Par qui |
|---|---|---|
| Format | Appli web installable sur l'iPhone (PWA), même principe que Notre Jardin | Claude, accepté |
| IA | **Google Gemini** avec la clé de Sami (comme pour Jarvis) ; prendre un modèle Flash qui lit les images | Sami |
| Clé | Jamais dans le navigateur : gardée dans une fonction serveur | Claude |
| Serveur | Supabase (base, fonctions, notifications). Projet créé par Claude via l'outil Supabase, une fois Sami connecté à son compte | Claude / Sami |
| Hébergement | **GitHub Pages** (gratuit, sans crédits), compte GitHub `samikchn`. **Pas Netlify** (consomme des crédits). Le dépôt est public, donc aucun secret ni avis réel ne doit s'y trouver | Sami |
| Téléphone | **Google Pixel (Android, Chrome)**, pas un iPhone : installation par « Installer l'application », notifications web possibles sans App Store. Les mentions « iPhone » de ce document valent pour « son téléphone » | Sami |
| Langue | Bouton FR / EN | Sami |
| Accès Google | Pas de formulaire ni d'API officielle. Données récupérées par **deux scripts Google** collés une fois par Sami (il a le compte de sa mère sur son PC) | Sami |
| Modification | Lecture seule + bouton pour ouvrir Google | Sami |
| Photos | Elle prend les photos dans sa pellicule (iPhone) ou sur son PC | Sami |

## 6. Fonctionnement de chaque partie

### 6.1 Avis

**Source** : un script **Google Apps Script** sur le compte Gmail de Rafiza. Il tourne toutes les 15 minutes, lit les e-mails Google « Bravo, vous avez reçu un nouvel avis… » et envoie à l'appli : le nom, les étoiles, le début du texte, la date et le lien « Lire l'avis / Répondre ».

**Limite vérifiée** (capture du 31/10) : l'e-mail ne contient que **le début** de l'avis (coupé avec « … »), parfois traduit par Google. L'e-mail contient aussi un avis plus ancien « auquel vous n'avez pas encore répondu » : il faut le récupérer aussi, sans créer de doublon.

**Écran** : une liste « À répondre » (nom, étoiles, extrait, date). Quand elle touche un avis :
- l'appli génère une réponse à partir de l'extrait ;
- si l'extrait est coupé, un bandeau propose « Ouvrir l'avis complet » (lien Google) puis « Coller le texte complet », qui colle le presse-papiers en un tap et régénère la réponse ;
- un champ facultatif « Un souvenir de ce client ? » (dictée possible) ;
- des boutons **Copier**, **Autre version** et **Répondre sur Google** (ouvre le lien de l'e-mail) ;
- un bouton « Fait ✓ » pour sortir l'avis de la liste.

**Secours** : un bouton « Coller un avis » (texte ou capture), pour TripAdvisor ou n'importe quel autre site.

**Règles de réponse**, tirées de ses conversations et à mettre dans les instructions de l'IA :
- répondre dans la langue du client (français, anglais, italien, allemand, espagnol, norvégien…) ;
- ton chaleureux, spontané et humain, jamais structuré comme un modèle ; remercier de façon différente à chaque fois. Garder en mémoire les dernières réponses pour ne pas répéter les mêmes formules ;
- court ; inviter à revenir ;
- intégrer naturellement « crêperie », « Saint-Denis », « Basilique de Saint-Denis », « Café Au Rendez-Vous » ;
- signer « L'équipe du Café Au Rendez-Vous » + aurendezvous-saintdenis.fr. Exception : un avis exceptionnel peut être signé « Rafiza » (option) ;
- avis court ou seulement des étoiles : merci tout aussi chaleureux ;
- mentionner le statut Local Guide ou les photos seulement si c'est vrai ;
- avis négatif : excuse honnête, sans se défendre ni se justifier ; si la réponse arrive en retard, donner une raison crédible (affluence, fermeture d'été) ;
- prénoms de l'équipe cités par les clients (Sami/Samy, Chaima…) : les remercier publiquement ;
- devise : « la satisfaction du client d'abord, le commerce ensuite ».

### 6.2 Posts

- Choisir 1 à 4 photos, écrire ou dicter quelques mots (« crème brûlée maison du jour »).
- Sortie : 3 textes (Fiche Google, Instagram, Facebook), avec hashtags, ton convivial et familial, et les mots-clés locaux.
- Chaque texte a un bouton **Copier**. Bouton « Partager » : partage natif de l'iPhone avec la photo, pour l'ouvrir directement dans Instagram ou Facebook quand c'est possible.
- **Rappel** : choisir une date et une heure → notification sur l'iPhone (push web, comme Notre Jardin). En la touchant, elle retombe sur le post prêt à copier.
- Petit calendrier « posts prévus / publiés ».
- Bonus (choix du constructeur) : proposer un nom de fichier photo optimisé pour le référencement, comme elle le faisait pour les articles UNIITÉ.

### 6.3 Pubs (Google Ads)

**Source** : un **script Google Ads** (Outils → Scripts) collé une fois. Il tourne toutes les heures et envoie à l'appli, pour chaque campagne : son état (active, en pause, limitée, non éligible), le budget par jour, les dépenses, les clics, les impressions, le coût par clic, les appels, les itinéraires, les conversions (hier, 7 jours, 30 jours) et les principaux termes de recherche.

Campagnes connues : « Semaine V2 », « Weekend Dejeuner ARDV », « Weekend Diner ARDV » (lire les noms réels, sans les coder en dur). Note : le compte Ads du restaurant est le sien ; en octobre, elle a aussi aidé une amie (Beauté Bio d'Or), mais ce n'est pas dans le périmètre.

**Écran** :
- une carte par campagne : un voyant (vert = ça tourne, orange = limitée, rouge = arrêtée ou non éligible), puis « Hier : 12 clics · 3,40 € · 1 appel » ;
- une phrase simple générée par le coach (« Ça va. Le mot "glace artisanale" ramène le plus de monde. ») ;
- un bouton **Ouvrir dans Google Ads** ;
- un bouton **Demander au coach**, qui ouvre une conversation où l'IA voit les vrais chiffres. On peut aussi y joindre une capture.

**Règles du coach** :
- jamais d'enchères automatiques, de campagne Smart ni d'AI Max ; uniquement le CPC manuel ;
- mots-clés en correspondance exacte ; réseau Display et partenaires de recherche désactivés ; zone autour du restaurant ;
- exclusions déjà décidées : réunion, 974, livraison, uber eats, deliveroo, recette, emploi, stade de france ;
- enchères habituelles : 0,60 à 0,90 € ; « glace artisanale » est le meilleur mot-clé ; la Basilique attire mieux que le Stade de France ;
- les étapes sont expliquées très simplement, un clic à la fois, avec les noms exacts des menus Google en français.

### 6.4 Écrire

Modèles : affiche d'horaires, affiche de fermeture (sortie PDF A4 imprimable), e-mail fournisseur, e-mail UNIITÉ (demande de publication d'article avec titre, méta-description et texte ALT), lettre ou réponse à un client, offre d'emploi. Chaque modèle donne un formulaire court, puis un texte à copier ou un PDF.

### 6.5 Fiche restaurant (« ce que l'appli sait »)

Un écran modifiable : adresse, horaires, téléphone, site, signature, prénoms de l'équipe, spécialités, ton. Ces informations sont injectées dans toutes les demandes faites à l'IA. Pré-remplir avec les données de ce document.

## 7. Contraintes

- **iPhone d'abord** (environ 390 px), gros boutons, contraste fort, mode sombre ; fonctionne aussi sur PC.
- Notifications push : l'appli doit être installée sur l'écran d'accueil (iOS 16.4 ou plus).
- **Sécurité** : une seule utilisatrice. Les données (avis, chiffres) ne doivent être lisibles qu'après connexion. Les scripts Google envoient leurs données à une fonction serveur protégée par un secret partagé. La clé Gemini reste un secret côté serveur.
- **Confidentialité** : **décision de Sami : formule gratuite de Gemini**, en connaissance de cause (Google peut se servir des textes envoyés). N'envoyer à Gemini que le nécessaire : pas d'adresses e-mail, pas de noms de fournisseurs, pas de montants de factures. Rester sous les limites gratuites : regrouper les demandes, pas d'appel automatique en boucle, et générer la phrase du coach une fois par jour et par campagne (pas à chaque ouverture). Si la limite est atteinte, afficher un message clair (« Réessaie dans une minute »).
- **Rien n'est créé sur ses comptes Google sans Sami** : c'est lui qui colle les scripts et clique sur « Autoriser ». Claude fournit les scripts et le pas-à-pas.
- La connexion à l'appli est créée par Sami, pas par Claude.

## 7 bis. Choix faits par Claude (à vérifier par Sami)

- **Nouveau projet Supabase**, séparé de Notre Jardin, pour ne pas mélanger les données.
- **Deux comptes autorisés** : Rafiza et Sami (pour l'installation et le dépannage). Personne d'autre.
- **Langue des textes produits** : les réponses aux avis sont dans la langue du client ; les posts et les affiches sont en français, avec une petite version anglaise en option (pour les touristes) ; le coach et l'interface suivent le bouton FR/EN.
- **Exemples de ton** : extraire de l'export de ses conversations les réponses aux avis qu'elle a validées (environ 50 à 100). Elles servent d'exemples à l'IA et alimentent dès le départ la mémoire anti-répétition. Le fichier source est `conversations.json` (export claude.ai du 31/10).
- **Chiffres Ads** : le suivi des appels et des itinéraires a été configuré en septembre 2026 (d'après ses conversations). Le script lit ce qui existe, et l'appli masque une case quand la donnée manque. Compte Google Ads simple (pas de compte gestionnaire MCC), à confirmer lors de la pose du script.
- **Livraison étape par étape**, avec validation de Sami à chaque étape. Les étapes 2 et 4 attendent que Sami colle les scripts.

## 8. Laissé au constructeur

Le framework (en suivant Notre Jardin, du HTML/JS simple est acceptable), le modèle Gemini exact, le schéma de la base, la mise en page, la façon d'analyser les e-mails, la fréquence exacte des scripts, et la méthode de connexion la plus simple pour elle (lien magique par e-mail ou code).

## 9. Ordre de livraison proposé

1. Socle (PWA, connexion, fiche restaurant, FR/EN, fonction Gemini) + **Avis** en mode « coller ».
2. Script Gmail → avis automatiques.
3. **Posts** + rappels.
4. Script Google Ads + écran **Pubs** + coach.
5. **Écrire**.
