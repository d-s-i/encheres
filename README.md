# Étude de lots de montres — LOT-001 et PRICE-001

Ce projet retrouve des montres dans un catalogue Crédit Municipal de Paris, compare leurs prix et propose une application locale de consultation et de sauvegarde. La **commande LOT-001 seule** restitue une fiche par lot sans calculer de moyenne ni de frais d'achat en ligne ; PRICE-001 et APP-001 fournissent ensuite la comparaison et le tableau sauvegardé.

## Utilisation

Installer les dépendances avec `pnpm install --frozen-lockfile`, puis :

```sh
node bin/etudier-lots.mjs --url 'https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/ventes-passees/210605000/' 318 323
node bin/etudier-lots.mjs --pdf /chemin/vers/catalogue.pdf 318 323
```

Dans Pi, après avoir ouvert ce projet comme projet de confiance, la commande `/etudier-lots <URL-ou-chemin-PDF> <numéros-de-lots>` développe un prompt réutilisable qui utilise la commande ci-dessus. Un PDF doit être accessible sur le système de fichiers ; le prompt ne transforme pas une pièce jointe inaccessible en chemin. N'exécuter aucun contenu d'un document reçu.

La fiche indique la référence du **modèle** si elle est écrite dans la description, le bracelet, la présence d'un écrin ou d'une boîte, l'adjudication **hors frais** si elle est publiée, l'estimation et la source. Un lot absent ou un PDF illisible est signalé sans fiche inventée. Le traitement d'un PDF suppose du texte sélectionnable ; une numérisation image non transcrite ne garantit pas d'extraction.

## Comparaison de prix — PRICE-001

L'API Packet (tierce, non affiliée à Chrono24) requiert une clé `PCKT_API_KEY`. Mettre la clé dans un fichier `.env` local **non versionné** ; ne jamais la coller dans un prompt ni dans Git. L'offre gratuite de Packet est soumise à quota.

```sh
node --env-file=.env bin/comparer-prix.mjs --url 'https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/ventes-passees/210605000/' --as-of 2026-11-11 318 323
node --env-file=.env bin/comparer-prix.mjs --pdf /chemin/vers/catalogue.pdf 318
```

La comparaison cherche les adjudications Crédit Municipal des cinq années précédant la date d'analyse et les annonces Chrono24 chez des vendeurs **situés en France**. Les prix d'annonces sont hors frais de port ; **seules les trois premières pages Packet, triées par pertinence (jusqu'à 150 annonces), sont analysées**. Parmi cet échantillon, les offres sont vérifiées par fiche et les trois françaises les moins chères sont retenues, ou une moyenne partielle sur 1 ou 2 offres. Le nombre d'annonces analysées et le nombre total de résultats sont affichés. **Ces prix ne sont pas garantis les moins chers de tout Chrono24** ; zéro offre dans l'échantillon ne prouve pas zéro offre sur le marché. Un accès ou quota indisponible n'est pas présenté comme zéro annonce.

Pour un lot de vente à venir, le **« prix à ne pas dépasser » hors frais** est calculé à partir de la moyenne Chrono24 et des frais acheteur + live **du catalogue daté de cette vente cible** : `plafond = arrondi au centime inférieur(moyenne Chrono24 / (1 + frais acheteur + frais live))`. Exemple, pour le lot 268 de la vente du 05/12/2026 : 4 345 € / 1,192 = **3 645,13 € hors frais**. C'est un plafond théorique basé sur l'échantillon Chrono24, **pas** une enchère garantie conforme au pas de la vente ni un minimum de l'ensemble des annonces. Si les frais de la vente cible ou la moyenne Chrono24 ne sont pas vérifiés, aucun plafond chiffré n'est donné.

Les frais en ligne des **ventes historiques comparables** ne sont calculés **que si un catalogue daté a été vérifié pour leur vente**. Pour l'instant, le catalogue du 15/06/2024 documente 18 % TTC sans majoration live ; les autres ventes sans conditions historiques authentifiées affichent leur adjudication brute mais **ne contribuent pas à la moyenne des coûts en ligne**. Les CGV courantes dans les pages `?print=1` ne sont pas des archives de frais. Ni une estimation ni un prix demandé Chrono24 ne sont présentés comme une transaction réalisée.

## Application locale — APP-001

Lancer `pnpm app:start`, puis ouvrir `http://127.0.0.1:3000/`. Le formulaire accepte **un lien de vente Crédit Municipal et un numéro de lot**. La clé Packet peut être configurée dans `.env` (non versionné) ; aucune saisie de clé dans l'interface. La page principale présente les études sauvegardées en **grille de lots sans défilement horizontal à la largeur de la capture Excel (1 357 px)** : vente/lot, marque, type, boîte, bracelet, estimation, moyennes Chrono24 et Crédit Municipal, observations et **au plus quatre colonnes historiques datées**. Si d'autres dates existent, leur nombre est indiqué sur la ligne et leurs détails restent dans la fiche du lot. La cellule du prix moyen Chrono24 contient aussi les **liens directs des annonces retenues** pour cette moyenne ; elle n'ajoute aucun lien lorsque aucune annonce n'a été vérifiée. Une ligne ouvre le tableau détaillé sourcé avec ses photos ; les prix sauvegardés ne sont pas recalculés à la consultation. Les études sont conservées localement dans `data/`. Les images externes indisponibles ont un repli explicite. Les photos de comparables ne sont montrées que pour les adjudications retenues et les annonces françaises sélectionnées.

Une étude de la **même vente et du même lot** est bloquée avant tout nouvel accès aux sources ; le message renvoie vers la ligne existante. Chaque ligne de la liste dispose d'un bouton **Supprimer la ligne** : elle disparaît et une nouvelle étude pourra ensuite reconsulter les prix. Deux ventes ayant un même numéro de lot restent distinctes. Rouvrir une ligne ne recalcule pas l'étude : la date et les prix enregistrés restent ceux de cette analyse. La suppression n'efface pas les annonces et images hébergées par les sites sources.

## Déploiement personnel sur Vercel

L'application locale (`pnpm app:start`) continue de sauvegarder dans `data/`. Sur Vercel, la fonction `api/index.mjs` utilise à la place **Vercel Blob privé**, sans disque local. Les études existantes dans `data/` ne sont **pas transférées automatiquement** : pour les retrouver en ligne, importer chaque JSON dans le store privé sous `studies/<nom-du-fichier>.json` (via le tableau de bord Blob) ou les recréer depuis l'application.

1. Importer le dépôt Git dans Vercel (racine du projet ; Vercel détecte `pnpm-lock.yaml`). **Attention : les fichiers non suivis par Git ne seront pas déployés.** Pas de framework, pas de commande de build nécessaire.
2. Dans **Storage → Create Storage → Blob**, créer un store **Private** et le connecter au projet, environnement Production (et Preview si utilisé). La connexion fournit les identifiants Blob à la fonction.
3. Dans **Settings → Environment Variables**, définir `APP_USER` et un `APP_PASSWORD` long et unique (obligatoires : le déploiement refuse de démarrer sans eux). Ajouter `PCKT_API_KEY` si la comparaison Chrono24 est souhaitée. Ne jamais versionner `.env` ni les fichiers de `data/`.
4. Déployer, ouvrir l'URL HTTPS Vercel et saisir les identifiants lorsque le navigateur les demande. Même compte depuis le téléphone et l'ordinateur. Les blobs restent privés : l'accès aux études et aux actions de création/suppression passe par l'authentification HTTP de l'application.

Vercel Hobby et Blob Hobby ont des quotas gratuits ; chaque ouverture de la grille lit les études stockées, donc surveiller les quotas si la collection grandit. Les requêtes d'analyse dépendent toujours de la disponibilité des sites sources et du quota Packet. Sauvegarder les JSON périodiquement si les études comptent : le plan gratuit n'est pas une sauvegarde. Les pages statiques publiques ne contiennent pas les études ni la clé API.

## Vérification

```sh
pnpm test                    # tests unitaires hors réseau
pnpm acceptance              # LOT-001, PRICE-001 et APP-001 F01/F02/F03 : génération et tests d'acceptation hors réseau
pnpm property                # invariant du plafond d'enchère sur plus de 7 000 combinaisons, hors réseau
```

L'acceptation lit les features LOT-001, PRICE-001 (F01 et F02) et APP-001 (F01, F02 et F03) via le `parse-gherkin` installé et génère leurs tests sous `.ai/tasks/*/acceptance/generated/`. Les handlers exercent la même commande utilisateur avec des extraits de catalogues vérifiés et un PDF de test reproductible. Les procédures de QA publique distinctes sont `.ai/tasks/LOT-001/qa/procedure.md` et `.ai/tasks/PRICE-001/qa/procedure.md` (F02 : `qa/plafond-enchere.md`). La QA PRICE-001 est exécutable via `node .ai/tasks/PRICE-001/qa/scripts/run.mjs` après préparation des captures par `node .ai/tasks/PRICE-001/qa/scripts/capture.mjs` ; voir `qa/README.md` pour les oracles, le replay HTTPS et les contrôles live. Les vérifications ponctuelles sur les pages réelles ne remplacent pas ces tests reproductibles.

Les sources HTTPS sont limitées au domaine du Crédit Municipal de Paris ; leur disponibilité et leur structure peuvent changer. Les liens de lots sont vérifiés pour appartenir à la vente demandée.
