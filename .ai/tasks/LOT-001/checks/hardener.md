# Hardener Report — LOT-001

## Status

PASS pour la campagne **complète et lisible**, avec exceptions classées ci-dessous ; **ce n'est pas un score parfait**. Première tentative globale interrompue après 900 s : elle n'est pas comptée comme résultat. Chaque fichier a ensuite eu sa campagne complète, puis une passe différentielle globale sur les 4 fichiers après ajout des tests ; le marqueur de campagne incomplète a disparu. Aucun timeout dans les snapshots finaux.

## Baseline et vérifications finales

- `pnpm test` : PASS, 28 tests unitaires (16 avant renforcement).
- `pnpm acceptance` : PASS, 6 scénarios.
- `node --check` sur les modules : PASS. Pas de build, typecheck, tests de propriété ni mutation Gherkin configurés.
- `crap` avec couverture LCOV fraîche par `~/nixos-config/node_modules/.bin/c8` : PASS, maximum CRAP 6 ; `.metrics/crap.edn` lu.
- `dryer` : PASS, `.metrics/dry.edn` lu, aucun candidat.
- `uml-quality` : PASS, overlay rafraîchi depuis les rapports actuels.

## Mutation source

- Commande finale : `mutate --since-last-run --max-workers 1 --test-command 'node --test test/*.test.mjs .ai/tasks/LOT-001/acceptance/generated/*.test.mjs' --coverage-command "$HOME/nixos-config/node_modules/.bin/c8 --reporter=lcov --report-dir=coverage --clean --include='src/*.mjs' --include='bin/*.mjs' node --test test/*.test.mjs .ai/tasks/LOT-001/acceptance/generated/*.test.mjs" src/lots.mjs src/pdf-lots.mjs src/watch.mjs bin/etudier-lots.mjs`.
- Rapports complets : `.metrics/mutate/{lots,pdf-lots,watch,bin.etudier-lots}.edn`. `scripts/generate-acceptance.mjs` : 0 site selon le scan, hors campagne d'exécution.
- Limites de la machine : profil Nix `workers=1`, `cpu_quota=100%`, `memory_max=2G` ; `--max-workers 1` explicite. Pas de campagnes simultanées.
- **117 sites, 95 tués, 22 survivants, 0 découvert, 0 timeout, score 81,2 %.** Sortie `mutate` **3**, signifiant des survivants dans une campagne terminée, pas une erreur d'infrastructure.

## Survivants finaux — classement individuel

| Emplacement | Mutation | Classement et justification | Action |
| --- | --- | --- | --- |
| `src/lots.mjs:35` | `auctionPrice` capture `1→0` | Équivalent : le texte complet « Adjugé à 1 500 € » ne contient aucun chiffre supplémentaire hors montant, et `money` supprime les caractères non numériques. | Aucune. |
| `src/lots.mjs:70` | `pageCount` `&&→||` | Exception, pagination malformée : un entier inférieur à la page courante peut modifier la borne de boucle ; les paginations valides ont leur dernière page ≥ la courante. | Reconsidérer si une source réelle présente un dernier lien erroné. |
| `src/lots.mjs:70` | `pageCount` `>→>=` | Équivalent : quand les valeurs sont égales, retourner `possible` ou `current` renvoie le même entier. | Aucune. |
| `src/lots.mjs:139` | `studyLots` `??→||` | Exception d'entrée interne : seule la métadonnée `pdfName=''` diffère ; la commande publique interdit un chemin PDF vide, et absence de nom produit le même libellé par défaut. | Vérifier le contrat si `studyLots` devient une API publique indépendante de la CLI. |
| `src/pdf-lots.mjs:40` | `pdfDescription` `??→||` | Équivalent sur ce parseur : capture `(.+?)` non vide ou repli sur la section. | Aucune. |
| `src/pdf-lots.mjs:46` | `pdfPrices` capture `1→0` (adjudication) | Équivalent : la capture entière inclut le seul nombre du prix ; `money` en retire le libellé. La capture d'estimation distincte a été tuée par assertion des deux bornes. | Aucune. |
| `src/pdf-lots.mjs:36` | `pdfTitle` capture `1→0` | Équivalent au résultat exposé : le préfixe « Lot n°318 » ajouté par la capture entière est retiré par `watchName`, sans modifier marque/modèle. | Aucune. |
| `src/pdf-lots.mjs:36` | `pdfTitle` `??→||` | Équivalent : capture du titre non vide ou repli sur `''`. | Aucune. |
| `src/pdf-lots.mjs:26` | `readPdf` `?.→.` | Exception d'environnement : `loadingTask` existe après import réussi ; si l'import PDF.js lui-même échoue, le mutant change l'erreur finale, mais cette installation ne peut plus lire aucun PDF. | À reconsidérer si la gestion d'une installation incomplète devient un contrat utilisateur. |
| `src/pdf-lots.mjs:24` | `useSystemFonts true→false` | Équivalent pour les PDF **textuels vérifiés** : cette option PDF.js règle le repli des polices non incorporées ; `readPdf` ne fait aucun rendu, seulement `getTextContent`. | Tester des PDF aux polices atypiques si leur support est ajouté. |
| `src/pdf-lots.mjs:24` | `disableFontFace true→false` | Équivalent pour l'extraction de texte vérifiée : PDF.js décrit ce réglage comme le choix du moteur de rendu des glyphes ; aucun rendu n'est effectué. | Même suivi que ci-dessus. |
| `src/pdf-lots.mjs:32` | `sectionForLot` `??→||` | Équivalent : l'index de la section suivante est strictement supérieur à celui de la section choisie ; en absence de suivant, repli sur `pdfText.length`. | Aucune. |
| `src/watch.mjs:1` | `text` `??→||` | Équivalent pour les chaînes issues du catalogue : chaîne vide et absence donnent toutes deux `''` avant normalisation. | Aucune. |
| `src/watch.mjs:2` | `money` `??→||` | Équivalent pour les prix fournis en chaîne : chaîne vide ou absence se normalise en montant 0 via `Number('')`. | Aucune. |
| `src/watch.mjs:5` | `namePart` `?.→.` | Équivalent sur les titres reconnus : groupe requis non vide ; sur titre non reconnu, le premier chaînage facultatif interrompt déjà l'évaluation. | Aucune. |
| `src/watch.mjs:5` | `namePart` `??→||` | Équivalent : partie de titre non vide ou `null` ; la marque/modèle absents sont testés. | Aucune. |
| `src/watch.mjs:15` | `watchReference` `?.→.` | Équivalent pour la regex actuelle : premier chaînage facultatif traite l'absence ; la capture existante est non vide. | Aucune. |
| `src/watch.mjs:15` | `watchReference` `??→||` | Équivalent : capture de référence non vide ou `null`. | Aucune. |
| `src/watch.mjs:19` | `watchBracelet` `?.→.` | Équivalent pour la regex actuelle : premier chaînage facultatif traite l'absence ; matière capturée toujours non vide. | Aucune. |
| `src/watch.mjs:19` | `watchBracelet` `??→||` | Équivalent : matière non vide ou `null`. | Aucune. |
| `bin/etudier-lots.mjs:20` | `formatWatch` référence `??→||` | Exception d'entrée interne : la référence produite par l'extracteur est non vide ou `null`, jamais chaîne vide ; la commande ne transmet pas de fiche fabriquée. | Revoir si le rendu devient une API acceptant des fiches arbitraires. |
| `bin/etudier-lots.mjs:21` | `formatWatch` bracelet `??→||` | Même justification : matière extraite non vide ou `null` ; pas d'entrée publique de fiche brute. | Même suivi. |

## Modifications

- Tests ciblés ajoutés dans `test/lots.test.mjs` : indépendance de la vente/numéro, arrêt après lots trouvés, dernière page autorisée, HTML invalide, source hors vente, montant et description PDF, limite de taille PDF, absence d'invention, arguments CLI et métadonnées manquantes.
- **Aucun code de production modifié** ; aucun critère d'acceptation ni scénario Gherkin modifié.
- Les mutants équivalents ne sont pas comptés comme tués. Les exceptions sont documentées et liées aux entrées non prises en charge ou à la défaillance d'une dépendance ; la QA devra rester indépendante.
