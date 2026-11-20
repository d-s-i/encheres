# Cleaner — PRICE-001 (F01 et F02)

## Statut : PASS

Nettoyage local sans changement de comportement : 62 tests unitaires et 21 scénarios d'acceptation passent. Couverture LCOV **fraîche** dans `coverage/lcov.info` ; `.metrics/crap.edn` lu après le dernier changement : **CRAP maximum 6,0** pour les fonctions examinées (seuil <= 6). `dryer` : aucun candidat de duplication dans `.metrics/dry.edn` lu. `mutate --scan` : scan seulement, **aucun mutant exécuté**.

## Changements

- `src/prices.mjs` reste le point d'entrée public et réexporte les mêmes fonctions ; politique de comparaison extraite dans `src/price-matching.mjs` et `src/price-selection.mjs`, accès aux adjudications dans `src/price-credit.mjs`, accès Packet et lecture des fiches dans `src/price-packet.mjs`. Cette séparation locale ramène `src/prices.mjs` de **289** sites de mutation initiaux à **29** (tous les nouveaux fichiers sont sous 100).
- `src/price-fees.mjs` : validation de provenance, date et taux des catalogues isolée en petites fonctions sans changer les conditions applicables ; `bin/comparer-prix.mjs` : rendu des trois blocs et validation d'arguments séparés, format public conservé.
- Tests ajoutés dans `test/prices.test.mjs`, `test/plafond.test.mjs` et `test/prices-cli.test.mjs` : branches erreur HTTP/pagination, identité du vendeur, accessoire/stock, provenance des frais, entrées CLI URL/PDF, échantillon et plafonds. Aucune assertion existante supprimée ou affaiblie.

## Vérifications finales

- `pnpm test` : **PASS**, 62/62.
- `pnpm acceptance` : **PASS**, 21/21 (LOT-001 et PRICE-001).
- `crap "$HOME/nixos-config/node_modules/.bin/c8 --reporter=lcov --report-dir=coverage --clean --include='src/*.mjs' --include='bin/*.mjs' --include='scripts/*.mjs' node --test test/*.test.mjs .ai/tasks/LOT-001/acceptance/generated/*.test.mjs .ai/tasks/PRICE-001/acceptance/generated/*.test.mjs" src/prices.mjs src/price-matching.mjs src/price-selection.mjs src/price-credit.mjs src/price-packet.mjs src/price-fees.mjs bin/comparer-prix.mjs src/watch.mjs scripts/generate-acceptance.mjs` : **PASS**, rapport `.metrics/crap.edn` lu, maximum 6,0. `c8` est disponible localement depuis `~/nixos-config/node_modules/.bin/`, sans dépendance ajoutée au dépôt.
- `dryer` sur les mêmes fichiers : **PASS**, 0 doublon candidat ; `.metrics/dry.edn` lu.
- `mutate --scan` sur les mêmes fichiers : **PASS (scan seulement)** : `bin/comparer-prix.mjs` 45, `scripts/generate-acceptance.mjs` 0, `src/price-credit.mjs` 32, `src/price-fees.mjs` 78, `src/price-matching.mjs` 33, `src/price-packet.mjs` 88, `src/price-selection.mjs` 71, `src/prices.mjs` 29, `src/watch.mjs` 14 sites. Aucun fichier ne dépasse 100 ; ces nombres ne sont **pas** un score de mutation.
- `uml-quality` : **PASS**, `.uml-viewer/quality.json` actualisé sur la base CRAP courante. Les données de mutation anciennes de LOT-001 présentes dans cet overlay restent périmées et ne valident **pas** le hardening.

## À transmettre

- Architecte : examiner la dépendance aux formats HTML/PDF du Crédit Municipal et au service Packet à quota/HTTP 426, sans élargir automatiquement l'échantillon approuvé de trois pages.
- Hardener : mutation complète non exécutée ; examiner en priorité les 88 sites de `src/price-packet.mjs` et les 78 sites de `src/price-fees.mjs`.
- QA indépendante : procédure non exécutée ; ne pas interpréter les prix d'annonces comme des ventes réelles ni le plafond théorique comme une enchère acceptée par le pas d'enchère.
