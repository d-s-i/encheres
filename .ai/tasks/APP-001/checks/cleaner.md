# Cleaner — APP-001 (F01/F02/F03)

## Statut : PASS

Baseline : `pnpm test` **107/107**, `pnpm acceptance` **35/35**. Après nettoyage : **108/108 unitaires**, **35/35 acceptation** ; interfaces, messages, sauvegardes, sécurité, images et affichages conservés. Pas de build/typecheck configuré.

- Couverture LCOV **fraîche** produite par `crap "$HOME/nixos-config/node_modules/.bin/c8 --reporter=lcov --report-dir=coverage --clean --include='src/*.mjs' --include='bin/*.mjs' --include='public/*.js' --include='scripts/*.mjs' node --test test/*.test.mjs .ai/tasks/LOT-001/acceptance/generated/*.test.mjs .ai/tasks/PRICE-001/acceptance/generated/*.test.mjs .ai/tasks/APP-001/acceptance/generated/*.test.mjs" src/app.mjs src/app-view.mjs src/app-images.mjs src/offer-images.mjs src/price-packet.mjs src/watch.mjs bin/app.mjs public/app.js scripts/generate-acceptance.mjs`. Rapports `coverage/lcov.info` et `.metrics/crap.edn` relus : **105 fonctions mesurées, CRAP maximal exact 6,0**. Initialement : `fields` **63,2**, `createApplication` **31,6**, `overviewRow` **29,4**, `lotImages` **11,2**, `historical` **8,0**, `cards` et `packetImages` **7,0** ; toutes les fonctions nouvelles/modifiées sont maintenant ≤ 6. Les scores finaux les plus hauts sont `createStudy`, `observation`, `overviewSaleNumber`, `productImage` et deux fonctions Packet à **6,0**. Un contrôle intermédiaire affichait `createApplication` à **6,027** malgré l'arrondi texte « 6,0 » ; elle a été localement redivisée avant le contrôle final.
- `dryer` sur les mêmes chemins : `.metrics/dry.edn` lu, **0 candidat**. Un rapprochement temporaire des formats de moyenne Chrono24/Crédit Municipal a été résolu en partageant uniquement la gestion commune des moyennes indisponibles, tout en gardant les libellés métier séparés.
- `mutate --scan` sur les mêmes chemins : **scan uniquement, aucun mutant exécuté**, 0 site (`bin/app.mjs`, `public/app.js`, `scripts/generate-acceptance.mjs`), 19 (`src/app-images.mjs`), 91 (`src/app-view.mjs`), 47 (`src/app.mjs`), 9 (`src/offer-images.mjs`), 88 (`src/price-packet.mjs`), 14 (`src/watch.mjs`). L'ancien `src/app.mjs` avait **146 sites** ; les fichiers de production revus sont maintenant tous sous 100. Ces nombres ne sont **pas** un score de mutation.
- `uml-quality` : conversion du CRAP courant **PASS**, `.uml-viewer/quality.json` actualisé. La **partie mutation** de l'overlay est **non vérifiée/périmée** : elle contient des snapshots antérieurs de LOT/PRICE et ne valide pas APP-001.

## Prochaine étape

- Architecte : examiner les frontières du serveur local / rendu HTML et les garanties de la persistance JSON si plusieurs processus utilisent le même répertoire. Aucun changement d'API publique effectué par le cleaner.
- Hardener : campagne de mutation APP-001 non exécutée ; 91 sites dans `app-view`, 47 dans `app`, et dépendances partagées Packet/watch déjà modifiées par des travaux antérieurs.
- QA externe : exécuter les scénarios APP-001 S01–S14 selon `qa/procedure.md`, indépendamment des 35 scénarios d'acceptation de développement.

## Changements effectués

- Fichiers modifiés : `src/app.mjs`, `src/app-images.mjs`, `src/offer-images.mjs`, `test/app.test.mjs`, `test/app-images.test.mjs` ; nouveau `src/app-view.mjs` ; suivi et rapport `.ai/tasks/APP-001/`.
- Refactorisations : rendu pur isolé du routage et de l'accès disque ; opérations HTTP séparées en consultation, création, suppression et distribution ; moyennes, cellules, cartes et coûts HTML ventilés en fonctions cohésives ; vérification d'identité et lecture des galeries HTML isolées. La clé Packet, les endpoints et la politique de comparaison n'ont pas changé.
- Tests améliorés : chemins image invalide, redirection étrangère, erreur réseau ; champs du lot absents et provenance historique inaccessible. Aucune assertion existante supprimée ou affaiblie.
- Duplication supprimée : traitement commun des moyennes indisponibles, sans fusionner les significations Chrono24 et Crédit Municipal.
- Complexité réduite : CRAP `fields` **63,2 → 4,0**, `createApplication` **31,6 → 2,0**, `overviewRow` **29,4 → 5,7**, `lotImages` **11,2 → 4,0**, `historical` **8,0 → 2,0**, `cards` **7,0 → 2,0**, `packetImages` **7,0 → 2,0**.

## Questions restantes

- Préoccupation architecturale : la sauvegarde JSON et le verrou `pending` protègent une instance locale ; cohérence et résistance aux écritures partielles entre processus à examiner avant tout déploiement multi-instance.
- Pour le hardener : sources et tests modifiés depuis les anciennes campagnes LOT/PRICE ; leurs résultats de mutation ne sont pas actuels pour les fonctions partagées. Les nouveaux fichiers APP-001 n'ont pas été mutés.
- Échecs de tests : **aucun** à la vérification finale. Un oubli d'import de `layout` pendant l'extraction a provoqué un timeout local temporaire ; corrigé avant les campagnes finales, avec tests repassés.
- Outillage manquant : **aucun** pour les contrôles demandés ; `crap --help` ne fournit pas une aide dans ce wrapper et a échoué avant toute mesure, puis la commande de couverture réelle a réussi. Aucun rapport périmé n'a servi à valider le CRAP.
- Attention humaine : une étude déjà sauvegardée est un instantané ; ce nettoyage ne la recalcule pas et n'actualise pas les annonces ou photographies externes disparues.
