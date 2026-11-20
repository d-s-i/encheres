# Hardener — PRICE-001 (F01 et F02)

## Statut : PASS (mutants significatifs traités ; exceptions classées)

### Baseline et campagne
- Baseline avant modifications : `pnpm test` **64/64**, `pnpm acceptance` **21/21**, `pnpm property` **1/1**. Pas de compilation/typecheck/build configuré.
- Commande finale : `mutate --since-last-run --max-workers 1 --test-command "node --test test/*.test.mjs test/property/*.test.mjs .ai/tasks/LOT-001/acceptance/generated/*.test.mjs .ai/tasks/PRICE-001/acceptance/generated/*.test.mjs" --coverage-command "$HOME/nixos-config/node_modules/.bin/c8 --reporter=lcov --report-dir=coverage --clean --include='src/*.mjs' --include='bin/*.mjs' node --test test/*.test.mjs test/property/*.test.mjs .ai/tasks/LOT-001/acceptance/generated/*.test.mjs .ai/tasks/PRICE-001/acceptance/generated/*.test.mjs" src/price-credit.mjs src/price-matching.mjs src/price-selection.mjs src/price-packet.mjs src/watch.mjs src/price-fees.mjs src/price-ceiling.mjs src/prices.mjs bin/comparer-prix.mjs`. Première campagne **complète par fichier** (`--mutate-all`), puis reruns différentiels ; les snapshots par fichier et la commande finale constituent la campagne complète courante. Aucun fichier n'a été exclu à cause du score.
- Ressources : profil machine `mutate` limite à **1 worker** ; une tentative à 2 workers a échoué avant campagne (exit 2) ; une grande commande a expiré pendant le diagnostic, **sans être comptée comme valide**. Les neuf snapshots finaux sont complets et ont le même `tested-at` ; `.metrics/mutate/.uml-failed` absent.
- Résultat final : **393 sites, 346 tués, 47 survivants classés, 0 découvert, 0 timeout** ; score des mutations exécutées **88,0 %**. Exit **3 = campagne terminée avec survivants**, et non erreur de baseline.
- Par fichier (tués / survivants / découverts / sites) : `price-credit` 29/3/0/32 ; `price-matching` 30/3/0/33 ; `price-selection` 70/1/0/71 ; `price-packet` 73/15/0/88 ; `watch` 6/8/0/14 ; `price-fees` 69/12/0/81 ; `price-ceiling` 21/0/0/21 ; `prices` 8/0/0/8 ; `bin.comparer-prix` 40/5/0/45.

### Survivants individuellement inspectés

La colonne « équivalent » concerne les valeurs qui peuvent effectivement parvenir par les adaptateurs et le contrat approuvé. « Irrelevant » désigne une différence hors de ce contrat (entrée mal typée, chaîne vide interne non affichée, ou ordre des requêtes sans effet sur le résultat final). Aucun survivant restant n'est pris pour un test manquant de calcul de prix ou de provenance.

| Emplacement | Mutation | Classement et justification | Action |
|---|---|---|---|
| `bin/comparer-prix.mjs:7` | `?? → \|\|` | Équivalent : `differences` est objet ou absent ; `{}` est truthy. | Accepter |
| `bin/comparer-prix.mjs:10` | `?? → \|\|` | Équivalent : référence historique extraite non vide ou nulle. | Accepter |
| `bin/comparer-prix.mjs:20` | `?? → \|\|` | Équivalent : référence Packet non vide ou normalisée à `null`. | Accepter |
| `bin/comparer-prix.mjs:61` | `?? → \|\|` | Équivalent : libellés d'erreur statiques non vides ou clé absente. | Accepter |
| `bin/comparer-prix.mjs:65` | `?? → \|\|` | Équivalent : référence du lot extraite non vide ou nulle. | Accepter |
| `src/price-credit.mjs:15` | `?? → \|\|` | Irrelevant : seule la présentation d'un hypothétique HTTP `status=0` changerait ; réponses HTTP prises en charge utilisent un code non nul. | Accepter |
| `src/price-credit.mjs:34` | `1 → 0` | Équivalent : `Math.max(previous, fallback)` reçoit toujours `previous >= 1`. | Accepter |
| `src/price-credit.mjs:64` | `match[1] → match[0]` | Équivalent : `money()` supprime le préfixe non numérique et retrouve le même prix unique. | Accepter |
| `src/price-fees.mjs:16` | `match[1] → match[0]` | Équivalent : en-têtes « 2. FRAIS DE VENTE » et « 3. MODE DE PAIEMENT » n'ajoutent pas de taux à la section ; même taux 18 %. | Accepter |
| `src/price-fees.mjs:16` | `?? → \|\|` | Équivalent : groupe de section non vide ou absent ; fallback `''`. | Accepter |
| `src/price-fees.mjs:20` | `match[1] → match[0]` | Équivalent : ajout des en-têtes 6/7 sans autre mention de non-majoration. | Accepter |
| `src/price-fees.mjs:20` | `?? → \|\|` | Équivalent : groupe non vide ou absent ; fallback `''`. | Accepter |
| `src/price-fees.mjs:47` | `match[1] → match[0]` | Équivalent : l'expression `/(\d{9})/` capture la même chaîne que sa correspondance entière. | Accepter |
| `src/price-fees.mjs:64` | `?? → \|\|` | Équivalent : `match()` renvoie un tableau truthy ou `null` ; fallback `[]`. | Accepter |
| `src/price-fees.mjs:65` | `?? → \|\|` | Équivalent : `find()` renvoie un objet URL truthy ou `undefined` ; fallback `null`. | Accepter |
| `src/price-fees.mjs:78` | `match[1] → match[0]` | Équivalent : l'en-tête de section 2 ne contient pas de taux acheteur ; `parsedRate` lit le même taux. | Accepter |
| `src/price-fees.mjs:78` | `?? → \|\|` | Équivalent : groupe de section non vide ou absent ; fallback `''`. | Accepter |
| `src/price-fees.mjs:86` | `match[1] → match[0]` | Équivalent : en-tête de section 6 sans taux live, même montant retenu. | Accepter |
| `src/price-fees.mjs:86` | `?? → \|\|` | Équivalent : groupe non vide ou absent ; fallback `''`. | Accepter |
| `src/price-fees.mjs:93` | `\|\| → &&` | Équivalent sur taux extraits : les regex sans signe ne produisent pas de valeurs négatives ; les cas non finis sont rejetés plus tôt. | Accepter |
| `src/price-matching.mjs:7` | `match[1] → match[0]` | Équivalent : `^(CV\d{4})` couvre intégralement son groupe unique. | Accepter |
| `src/price-matching.mjs:18` | `?? → \|\|` | Équivalent : description textuelle non vide ou `null` ; interpoler `''` donne le même résultat. | Accepter |
| `src/price-matching.mjs:35` | `?? → \|\|` | Équivalent : même propriété pour la description des Carrera. | Accepter |
| `src/price-packet.mjs:6` | `Math.max(0, wait) → Math.max(1, wait)` | Irrelevant : ajoute au plus 1 ms à la première requête ; cadence entre requêtes contrôlée par un test (>= 1 s). | Accepter |
| `src/price-packet.mjs:13` | `?? → \|\|` | Équivalent : vendeur est un objet truthy ou absent. | Accepter |
| `src/price-packet.mjs:16` (attributeGroups) | `?? → \|\|` | Équivalent : schéma Packet tableau truthy ou `null`. | Accepter |
| `src/price-packet.mjs:16` (attributes) | `?? → \|\|` | Équivalent : attributs tableau truthy ou `null`. | Accepter |
| `src/price-packet.mjs:17` (name) | `?? → \|\|` | Équivalent : champ texte ou absent, `''` ne satisfait pas le motif bracelet. | Accepter |
| `src/price-packet.mjs:17` (label) | `?? → \|\|` | Équivalent : même test sur le libellé. | Accepter |
| `src/price-packet.mjs:19` | `?? → \|\|` | Irrelevant : matière vide `''` deviendrait `null` dans l'objet normalisé ; les deux sont omises des différences affichées. | Accepter |
| `src/price-packet.mjs:23` | `?? → \|\|` | Équivalent : scope textuel vide ou absent ne correspond ni à `WatchOnly` ni à `Box`. | Accepter |
| `src/price-packet.mjs:26` | `?? → \|\|` | Équivalent : disponibilité vide ou absente ne correspond pas à « en stock ». | Accepter |
| `src/price-packet.mjs:29` | `?? → \|\|` | Équivalent : `price` est objet truthy ou absent ; un nombre à la place est hors schéma. | Accepter |
| `src/price-packet.mjs:36` (modelName) | `?? → \|\|` | Équivalent : chaîne vide ou absente donne la même interpolation. | Accepter |
| `src/price-packet.mjs:36` (title) | `?? → \|\|` | Équivalent : même justification pour le titre. | Accepter |
| `src/price-packet.mjs:39` | `?? → \|\|` | Irrelevant : état interne vide `''` vs `null`, non utilisé dans les prix, la comparabilité ni le Markdown. | Accepter |
| `src/price-packet.mjs:49` | `?? → \|\|` | Irrelevant : seul le libellé d'un hypothétique HTTP `status=0` changerait. | Accepter |
| `src/price-packet.mjs:122` | tri `- → +` | Irrelevant pour la comparaison : toutes les fiches françaises candidates sont ouvertes, puis `selectOffers` trie les prix effectivement vérifiés ; une erreur de fiche rend la source inaccessible dans les deux ordres. L'ordre de requêtes peut varier. | Accepter |
| `src/price-selection.mjs:76` | `?? → \|\|` | Équivalent : `sample` est un objet truthy ou absent ; fallback `null`. | Accepter |
| `src/watch.mjs:1` | `?? → \|\|` | Équivalent pour entrée texte ou absente ; les nombres/booleans ne sont pas des descriptions de lot. | Accepter |
| `src/watch.mjs:2` | `?? → \|\|` | Équivalent pour chaîne de prix ou valeur absente ; nombre brut hors contrat de `money`. | Accepter |
| `src/watch.mjs:5` (optional trim) | `?. → .` | Irrelevant : lorsqu'un nom correspond à la regex, les groupes capturés existent ; sinon la première garde évite cet accès. | Accepter |
| `src/watch.mjs:5` (fallback) | `?? → \|\|` | Équivalent : groupe capturé non vide ou absent, fallback `null`. | Accepter |
| `src/watch.mjs:15` (optional replace) | `?. → .` | Irrelevant : toute référence capturée par le motif `+` est non vide ; le premier accès optionnel protège l'absence de correspondance. | Accepter |
| `src/watch.mjs:15` (fallback) | `?? → \|\|` | Équivalent : référence extraite non vide ou absente. | Accepter |
| `src/watch.mjs:19` (optional lower-case) | `?. → .` | Irrelevant : matière de bracelet capturée non vide ou absente ; accès initial optionnel protège l'absence de capture. | Accepter |
| `src/watch.mjs:19` (fallback) | `?? → \|\|` | Équivalent : matière extraite non vide ou absente. | Accepter |

### Corrections et vérifications finales
- Tests unitaires étendus dans `test/prices.test.mjs`, `test/plafond.test.mjs`, `test/prices-cli.test.mjs` : période des cinq ans et bornes de date, taux nuls/infinis, vendeur pays FR, identité du produit, HTML/PDF malformé, catalogue daté, comportement sur zéro ou incomplet, ordre de l'échantillon, cadence Packet. La propriété du plafond existante est conservée.
- `src/price-packet.mjs` : une fiche sans marque ou modèle n'est plus présentée implicitement comme « zéro comparable », mais signalée comme source incomplète ; référence vide normalisée à `null`. `bin/comparer-prix.mjs` : accord « 1 annonce française » dans la sortie. Ces changements ont été testés et les fonctions modifiées re-mutées.
- Commandes finales : `pnpm test` **87/87**, `pnpm acceptance` **21/21**, `pnpm property` **1/1**. Gherkin mutation **non configurée**.
- Régression qualité : `crap` avec couverture LCOV fraîche, `.metrics/crap.edn` lu : **maximum 6,0** ; `dryer` `.metrics/dry.edn` lu : **0 candidat**. `uml-quality` **PASS** pour la conversion du CRAP et des snapshots PRICE-001 actuels ; **partie mutation LOT-001 de l'overlay non vérifiée/périmée**, séparément du résultat CRAP courant.
- Risques restants : prix Chrono24 limités à trois pages triées par pertinence (décision utilisateur), frais historiques vérifiés seulement pour le catalogue 2024, réponses Packet parfois HTTP 426 ; la QA externe demeure non exécutée.
