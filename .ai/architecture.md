# Architecture actuelle — étude de montres (LOT-001, PRICE-001 et APP-001)

État documenté après la réalisation des trois fonctions. APP-001 est une application locale ; sa QA externe reste à effectuer. Les décisions ci-dessous décrivent les frontières réellement présentes, pas un hébergement public futur.

## Flux et modules

```text
.pi/prompts/etudier-lots.md (aide conversationnelle Pi)
        ↓ demande à Pi de lancer la commande
bin/etudier-lots.mjs (arguments, lecture du PDF local, rendu Markdown)
        ↓ studyLots({ saleUrl | pdfBytes, numbers })
src/lots.mjs (validation des entrées, orchestration, recherche des annonces web)
        ├── cheerio + fetch HTTPS (pages Crédit Municipal de Paris)
        ├── src/pdf-lots.mjs (pdfjs-dist, texte des pages, sections de lots)
        └── src/watch.mjs (relevé déterministe des caractéristiques et normalisation)
```

`src/pdf-lots.mjs` dépend de `src/watch.mjs` ; `src/watch.mjs` ne dépend d'aucun outil d'entrée-sortie. Dans le flux utilisateur, `bin/etudier-lots.mjs` est le seul module qui lit un chemin de PDF local et formate la réponse utilisateur. `src/lots.mjs` injecte `fetchImpl` pour tester la lecture web sans réseau ; le PDF est fourni sous forme d'octets. L'extraction PDF et l'extraction web partagent `extractWatch` afin de conserver la même signification des champs. Pas de cycle d'import constaté.

Le résultat de `studyLots` a la forme `{ watches, missing }`. Chaque montre comporte son numéro de lot et sa provenance (`source` : URL de l'annonce ou nom du PDF). Le même numéro peut appartenir à plusieurs ventes ; pour le web, l'URL de vente identifie le contexte et les liens d'annonces sont vérifiés dans ce contexte. Le PDF reste identifié par le document fourni, sans garantie d'identifiant de vente extrait. Les prix d'adjudication et estimations ne sont pas un coût d'achat final.

## Frontières et limites

- Le web est volontairement limité aux URL HTTPS de `www.creditmunicipal.fr`. Les sélecteurs HTML et la pagination sont propres au catalogue actuel ; des ventes aux structures différentes exigeront une validation et potentiellement une adaptation de l'entrée web.
- La lecture PDF n'exécute pas de contenu du document et attend un texte extractible ; un PDF uniquement image ne fournit pas de description. Le format texte extrait peut différer de l'ordre visuel des pages.
- `src/lots.mjs` regroupe actuellement l'orchestration avec l'adaptateur HTML de ce seul site. Cette dépendance est proportionnée à une source unique, mais si d'autres catalogues ou canaux sont ajoutés, séparer l'adaptateur de catalogue de l'orchestration avant que la politique applicative dépende de plusieurs formats de pages.
- `src/lots.mjs` réexporte `readPdf` et `extractWatch` pour préserver ses consommateurs existants. Ne pas ajouter à cette surface des détails internes des parseurs sans besoin utilisateur.
- Les tests unitaires injectent les pages publiques comme réponses contrôlées ; les tests d'acceptation sont générés à partir du Gherkin et passent par `run()` avec les mêmes contrats. La QA externe dans `.ai/tasks/LOT-001/qa/procedure.md` a été exécutée séparément ; le correctif ultérieur de références dans `src/watch.mjs` exige une vérification ciblée de fraîcheur.

## PRICE-001 — flux, dépendances et contrats

```text
.pi/prompts/comparer-prix.md → bin/comparer-prix.mjs (CLI, PDF local, Markdown)
                          ├→ studyLots (LOT-001, source du lot cible)
                          └→ src/prices.mjs (comparaison et orchestration)
                                ├→ src/price-credit.mjs (recherche HTML des ventes passées)
                                ├→ src/price-packet.mjs (recherche Packet, 3 pages max, détails vendeur)
                                ├→ src/price-fees.mjs (catalogues PDF datés, provenance des taux)
                                ├→ src/price-selection.mjs (fenêtre temporelle, comparabilité, moyennes)
                                │      └→ src/price-matching.mjs (marque, modèle, variantes)
                                └→ src/price-ceiling.mjs (calcul financier pur)
```

La commande et la fonction `compareWatch(watch, options)` conservent leurs interfaces. `src/prices.mjs` réexporte les fonctions utilisées par les consommateurs existants, notamment `calculateBidCeiling`, désormais implémentée dans `src/price-ceiling.mjs` **sans dépendance réseau, PDF, UI ou variable d'environnement**. La règle de plafond est pure et se vérifie sur des centimes entiers ; la clé Packet reste à la frontière `src/price-packet.mjs` via `PCKT_API_KEY`, jamais dans la politique financière. Les adaptateurs reçoivent `fetchImpl` pour les tests hors réseau ; l'orchestration accepte les fonctions de recherche et de frais en injection. Aucun cycle d'import dans le sous-graphe PRICE-001 examiné.

La sortie est un objet `{ credit, chrono, ceiling, lot, brand, model, reference, asOf }` avec provenance par comparable ; `bin/comparer-prix.mjs` le transforme en Markdown. `searchPacket` fournit à la sélection des offres normalisées et un relevé d'échantillon (`sample` sur son tableau de résultats). Cette représentation reste fragile si un futur consommateur copie ou filtre le tableau avant `selectOffers` : conserver les deux ensemble ou envisager un contrat explicite `{ offers, sample }` dans une évolution **approuvée** de l'API. Ne pas changer l'interface publique ni présenter l'échantillon comme les trois prix mondiaux les moins chers sans décision humaine.

Les frais historiques ne sont calculés qu'avec le catalogue daté vérifié du 15/06/2024 ; les autres ventes restent brutes si leurs conditions sont inconnues. L'adaptateur refuse une redirection du PDF historique vers une autre origine. Le plafond pour la vente cible exige le PDF lié à *cette* vente et ses taux en ligne ; une redirection du PDF vers un autre identifiant de vente est refusée. `?print=1` réutilise les CGV courantes et n'est pas une archive. L'API Packet n'offre pas de tri/préfiltrage vendeur FR pour ce flux ; trois premières pages triées par pertinence au maximum, fiches FR contrôlées, quota et indisponibilité distingués d'une recherche aboutie et vide. HTML/PDF et Packet sont des frontières externes volatiles, à soumettre à la QA indépendante.

## Vérification

`pnpm test`, `pnpm acceptance` et `pnpm property` sont les commandes projet. Le test de propriété déterministe `test/property/bid-ceiling.test.mjs`, lancé séparément, vérifie sur plus de 7 000 combinaisons que le plafond en centimes est maximal sans dépasser la moyenne après frais, sans accès réseau. `pnpm test` inclut aussi `test/architecture.test.mjs`, vérification ciblée des cycles d'import PRICE-001 et de l'indépendance du calcul de plafond et de la sélection vis-à-vis des adaptateurs. Aucune compilation, typecheck ou build n'est configurée. Les rapports de qualité antérieurs de PRICE-001 sont périmés pour les sources partagées modifiées depuis ; le rapport cleaner APP-001 (`.ai/tasks/APP-001/checks/cleaner.md`) établit CRAP ≤ 6 et DRY 0 pour ses chemins examinés, avant toute éventuelle modification de production par l'architecte.

## APP-001 — application locale et frontière des études sauvegardées

```text
bin/app.mjs (processus HTTP local, 127.0.0.1:3000 par défaut)
    ↓ src/app.mjs (formulaire, routage, identité vente + lot, orchestration)
        ├→ studyLots → sources Crédit Municipal
        ├→ compareWatch → recherche de prix, frais et plafond
        ├→ src/app-images.mjs → images des fiches officielles ; offres déjà normalisées
        ├→ src/app-view.mjs → rendu HTML pur, échappement et liens autorisés
        └→ fichiers JSON locaux dans data/ (instantanés par étude)
src/price-packet.mjs → src/offer-images.mjs (normalisation pure d'URL d'images)
```

Le formulaire public reçoit le lien HTTPS de la vente et un numéro de lot ; l'URL de vente est normalisée et l'identité de l'étude est dérivée de ce couple. La commande `pnpm app:start` charge facultativement la clé Packet depuis `.env`, sans la transmettre au navigateur. `createApplication` reçoit des ports de collecte, comparaison, images, horloge et répertoire de données injectables ; l'adaptateur HTTP et la persistance JSON restent à la frontière, sans dépendance inverse depuis les règles de prix ou le rendu. Le rendu `app-view` et la normalisation `offer-images` n'importent ni filesystem ni réseau ; leur absence de cycle avec le graphe prix est contrôlée par `test/architecture.test.mjs` sous `pnpm test`.

Le fichier d'étude contient `{id, watch, r, images}` : données du lot, comparaison sourcée et URL d'images, figées à la date d'analyse. Rouvrir la ligne ne refait aucune recherche ; supprimer la ligne puis soumettre à nouveau est la seule façon de recalculer volontairement. Le serveur bloque le même couple avant toute collecte, avec un ensemble `pending` **propre à une instance** et une écriture `wx` évitant qu'une autre instance écrase un fichier existant. La grille n'affiche que quatre dates historiques récentes au maximum à largeur 1 357 px ; les autres ventes restent dans la fiche détaillée. Les URL d'images peuvent cesser de répondre sans invalider les prix sauvegardés.

**Limites de déploiement :** le répertoire JSON local, son verrou mémoire et l'absence d'authentification sont proportionnés à une application locale à utilisateur unique. Une exécution multi-processus peut recalculer en double avant que l'écriture exclusive rejette l'un des résultats ; un fichier partiellement écrit peut être visible si le processus s'interrompt. Ne pas exposer l'application publiquement ni promettre de garantie transactionnelle multi-utilisateur sans décision d'architecture dédiée. La QA externe APP-001 doit vérifier indépendamment l'interface, les sources et les images, et ne saurait être remplacée par `pnpm acceptance`.

La propriété `test/property/study-identity.test.mjs`, lancée avec `pnpm property`, vérifie 27 identités vente + lot distinctes, le refus des doublons sans nouveau travail de collecte, la suppression isolée et la création d'un nouvel instantané pour le même couple. Le test de plafond financier existant reste dans cette commande ; aucun test de mutation source ni QA externe n'est déclenché par ces contrôles d'architecture.
