# Architect — APP-001 (F01/F02/F03)

## Statut : PASS

Revue de structure de l'application locale à utilisateur unique. Aucun module de production ni contrat public n'a été modifié ; les frontières actuelles sont proportionnées au déploiement demandé. Les risques multi-processus et d'accès public sont documentés, pas présentés comme résolus. QA externe et mutation source restent à faire.

## Entrées examinées

- Demandes humaines et décisions successives : formulaire vente + lot, photographies sourcées, instantané sauvegardé, blocage jusqu'à suppression, grille de largeur 1 357 px et liens directs vers les annonces ; `task.md` et Gherkin F01 (6), F02 (5), F03 (3).
- Critères d'acceptation et procédure `qa/procedure.md` S01–S14 ; tests unitaires APP, handlers d'acceptation et commandes `pnpm test`, `pnpm acceptance`, `pnpm property`.
- Code réel : `bin/app.mjs`, `src/app.mjs`, `src/app-view.mjs`, `src/app-images.mjs`, `src/offer-images.mjs`, `src/lots.mjs`, `src/prices.mjs`, adaptateurs de prix, sélection et calcul pur ; graphe des imports testé.
- Pas de rapport de coder dédié dans `checks/` ; état et vérifications du coder lus dans `state.json`. Rapport cleaner `checks/cleaner.md`, `.metrics/crap.edn` (max 6,0 sur 105 fonctions), `.metrics/dry.edn` (0 candidat), `coverage/lcov.info` (lignes APP : app 91/93, vue 128/128, images 33/33, normalisation 12/12), `.uml-viewer/quality.json` lus. La mutation de l'overlay provient de snapshots antérieurs LOT/PRICE ; pas de campagne APP-001.

## Findings

| Gravité | Emplacement | Constat | Action |
|---|---|---|---|
| Faible, frontière correcte | `src/app.mjs` → `src/app-view.mjs`, `src/app-images.mjs`, LOT/PRICE | Serveur HTTP et persistance à la périphérie ; rendu et politique des URL d'images sans IO ni dépendance inverse. Le résultat `{watch,r,images}` est enregistré comme instantané et restitué sans nouveau calcul. Pas de cycle observé. | Documenter le flux et ajouter des contrôles déterministes du graphe et de l'absence d'IO dans la vue. |
| Moyenne pour un futur déploiement multi-processus, non bloquante en local | `src/app.mjs` (ensemble `pending`, accès `exists`, écriture `wx`, fichier JSON) | `pending` ne couvre qu'une instance. Deux instances partageant `data/` peuvent effectuer deux collectes avant que l'écriture exclusive n'en refuse une. Une lecture peut rencontrer un JSON partiel après interruption d'écriture. | Garder l'interface locale à instance unique ; documenter la limite. Authentification, store transactionnel et protocole d'écriture atomique à concevoir **seulement** si le déploiement change. |
| Moyenne si exposition réseau | `bin/app.mjs`, `src/app.mjs` | Serveur par défaut en loopback, sans authentification ; `HOST` peut changer l'écoute. Les études et leur suppression sont visibles à toute personne qui atteint le serveur. | Ne pas exposer l'application publiquement sans décision produit et contrôle d'accès. |
| Risque externe déjà approuvé | `src/price-packet.mjs`, `src/app-images.mjs`, instantanés | Les URL d'annonces et photos peuvent expirer ; l'ouverture d'une étude ne revalide pas son prix ni son lien, conformément au contrat de sauvegarde figée. L'accès Packet peut devenir indisponible. | Garder date, source et distinction prix demandés/adjudications ; QA indépendante à réaliser. |

## Modifications

- `.ai/architecture.md` : graphe APP-001, frontières, identité vente + lot et limites de persistance locale documentés ; remarques obsolètes sur APP non conçu corrigées.
- `test/architecture.test.mjs` : deux contrôles ajoutés aux deux existants : graphe APP + PRICE sans cycle ni import d'adaptateur d'application par la politique des prix ; rendu et normalisation des images sans import/IO.
- `test/property/study-identity.test.mjs` : propriété sur **27 identités distinctes** (3 ventes × 9 lots), absence de collision de lignes, doublon sans nouvel appel de collecte, suppression isolée et nouveau résultat pour le couple libéré ; aucune transaction réelle ni requête externe. Le test financier existant demeure séparé.
- Aucun changement de production, de spécification, de QA ou d'acceptation.

## Vérification

- `pnpm test` : **PASS**, 110/110 (dont 4 contrôles d'architecture).
- `pnpm acceptance` : **PASS**, 35/35.
- `pnpm property` : **PASS**, 2/2 (plafond financier et identité/suppression APP-001).
- `node --test test/architecture.test.mjs` : **PASS**, 4/4.
- Typecheck, compilation et build : **NOT RUN**, non configurés dans `package.json`.
- CRAP/DRY : rapports cleaner revus ; **aucun fichier/fonction de production modifié** ici, donc pas invalidés par la revue. Les nouveaux tests d'architecture ne font qu'inspecter les sources ; le nouveau test de propriété est lancé séparément, hors de la commande de couverture cleaner. Aucun CRAP/DRY relancé par l'architecte.
- Source mutation et QA externe : **NOT RUN**, autres rôles.

## Risques restant ouverts

- Une persistance multi-processus ou un hébergement partagé demanderait un contrôle d'accès et des garanties transactionnelles absents de cette application locale. L'écriture exclusive évite l'écrasement, pas une lecture de fichier partiel ni une double collecte interprocessus.
- Les photos externes et liens d'annonce peuvent disparaître ; l'étude sauvegardée conserve leurs URL et les prix de sa date, pas leur disponibilité actuelle.
- La QA externe APP-001 F01/F02/F03 doit vérifier le navigateur réel, les images, les sources et la largeur sans défilement ; l'acceptation de développement ne suffit pas.

## Décisions humaines requises

Aucune pour cette architecture **locale à utilisateur unique**. Demander une décision distincte avant exposition publique ou exécution multi-instance.
