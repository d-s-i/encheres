# Cleaner — LOT-001

## Statut : PASS

Le rapport CRAP frais `.metrics/crap.edn` a été lu : toutes les fonctions affectées sont à **CRAP <= 6**, maximum 6,0. Le rapport LCOV actuel est `coverage/lcov.info`. `dryer` ne signale aucune duplication candidate ; `mutate --scan` a été exécuté sans exécuter de mutants. `uml-quality` a régénéré `.uml-viewer/quality.json` à partir du CRAP courant (aucune conclusion sur la mutation).

## Nettoyage réalisé

- Découpage conservant les interfaces publiques et erreurs existantes : extraction des caractéristiques dans `src/watch.mjs`, PDF dans `src/pdf-lots.mjs`, accès web et orchestration dans `src/lots.mjs`, formatage dans `bin/etudier-lots.mjs`.
- Découpage local des fonctions trop complexes (`extractWatch`, `pdfWatch`, `parseDetail`, `findLinks`, `formatResult`, etc.) en opérations cohérentes, sans changement du Gherkin ou de la procédure QA.
- Tests ciblés supplémentaires pour pagination, réponse HTTP/HTML inaccessible, annonce non liée ou hors vente, incohérence de lot, PDF sans montre et entrées invalides ; aucune assertion existante n'a été supprimée ou affaiblie.
- `.gitignore` exclut uniquement les artefacts locaux générés `coverage/`, `.metrics/` et `.uml-viewer/` en plus de `node_modules/`.

## Vérifications finales

- `pnpm test` : **PASS**, 16 tests unitaires.
- `pnpm acceptance` : **PASS**, 6 scénarios Gherkin.
- `crap "$HOME/nixos-config/node_modules/.bin/c8 --reporter=lcov --report-dir=coverage --clean --include='src/*.mjs' --include='bin/*.mjs' --include='scripts/*.mjs' node --test test/*.test.mjs .ai/tasks/LOT-001/acceptance/generated/*.test.mjs" src/lots.mjs src/pdf-lots.mjs src/watch.mjs bin/etudier-lots.mjs scripts/generate-acceptance.mjs` : **PASS**, rapport courant lu, maximum **6,0**.
- `dryer src/lots.mjs src/pdf-lots.mjs src/watch.mjs bin/etudier-lots.mjs scripts/generate-acceptance.mjs` : **PASS**, `.metrics/dry.edn` lu, 0 doublon candidat.
- `mutate --scan` sur les mêmes chemins : **PASS (scan seul)**, `src/lots.mjs` 55, `src/pdf-lots.mjs` 34, `src/watch.mjs` 14, `bin/etudier-lots.mjs` 14, `scripts/generate-acceptance.mjs` 0 sites. Aucun fichier n'atteint 100 sites. Ceci n'est pas un score de mutation.
- `uml-quality` après le rapport CRAP final : **PASS**, overlay rafraîchi. La QA externe et la mutation complète n'ont pas été exécutées.

## Points de vigilance

- L'exécutable `c8` disponible vient de `~/nixos-config/node_modules/.bin/` : cette mesure est valide sur cette machine mais le projet ne définit pas de commande de couverture autonome pour d'autres environnements.
- `findLinks` concentre encore la pagination web ; le hardener examinera ses sites de mutation et ses protections de provenance. La dépendance aux pages publiques et aux PDF textuels reste une limite connue de LOT-001.
- Le dépôt n'a pas de métadonnées Git : vérification du périmètre effectuée par lecture de fichiers, sans `git diff`.
