# Backlog

## Validated — APP-001 (mutation deferred)

- [x] APP-001-F01 — Formulaire vente + lot, tableau sauvegardé sourcé et photos des comparables.
- [x] APP-001-F02 — Doublon bloqué avant collecte, consultation figée, suppression d'une ligne et nouvelle analyse.
- [x] APP-001-F03 — Grille globale tenant dans 1 357 px sans défilement horizontal, jusqu'à quatre colonnes historiques datées, autres ventes en fiche ; liens directs des annonces retenues dans la cellule Chrono24. 111 tests unitaires, 35 scénarios d'acceptation et 2 tests de propriété PASS après le correctif QA S12.
- [x] APP-001 — Cleaner PASS : CRAP ≤ 6 avec couverture fraîche, DRY 0 doublon, scan de mutation uniquement (tous les fichiers revus < 100 sites).
- [x] APP-001 — Architect PASS : graphe sans cycle, rendu et normalisation d'images sans IO ; propriété de sauvegarde et suppression sur 27 couples vente/lot.
- [x] APP-001 — QA externe 14/14 PASS dans Chromium après préflight de 48 captures publiques ; défaut S12 sur « sous- compteurs » corrigé et revérifié, CRAP/DRY de régression frais PASS.
- [x] APP-001 — Validé explicitement par l'utilisateur après QA externe 14/14 ; aucune mutation source APP exécutée.
- [ ] APP-001 — Dette technique non bloquante : campagne de mutation source différée, à lancer seulement si souhaitée.

## Validated — non-blocking technical debt

- [x] PRICE-001 — Validé par l'utilisateur après QA externe 15/15 et contrôles live ; 87 unitaires/21 acceptation/propriété PASS, CRAP ≤ 6 et DRY 0. Validation fonctionnelle sans attendre la mutation.
- [ ] PRICE-001 — Rafraîchir sa QA ciblée et les métriques générales après les changements du CLI, `src/watch.mjs` et du rapprochement Monaco `sous- compteurs` ; l'ancien score de mutation est périmé.

## Ready for mutation refresh

- [ ] LOT-001 — Rafraîchir QA ciblée et métriques de `src/watch.mjs` après le correctif vérifié des références `CAW 2111`, `CS 2110` et `CW211A.Boîtier`.
