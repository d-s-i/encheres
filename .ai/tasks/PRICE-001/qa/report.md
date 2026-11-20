# QA Report — PRICE-001 (F01 et F02)

## Status

**PASS pour la QA** — 15/15 scénarios exécutés par la vraie CLI avec réponses HTTPS contrôlées, préflight des 12 captures publiques validé ; contrôles complémentaires sur trois demandes réelles et les fiches Packet des offres retenues. Un défaut mineur d'affichage de l'état a été corrigé et recontrôlé ; **la mutation du fichier CLI modifié est désormais périmée et doit être rafraîchie par le hardener**. La clé n'a été ni enregistrée ni affichée. Les prix réels observés ont changé depuis les exemples de spécification ; les résultats attendus conditionnels de la procédure ont été appliqués.

## QA scenarios

Les commandes exactes, entrées, sorties **intégrales**, codes de retour et URL consultées sont conservés dans [`result.json`](result.json) ; contrôles live et sorties complètes dans [`live-check.json`](live-check.json). La commande de reproduction et le protocole de captures sont dans [`README.md`](README.md). Les cas S01–S07/S13/S14 relèvent de F01 ; S08–S12/S15 de F02.

| ID | Scénario | Résultat | Preuve |
|---|---|---|---|
| QA-PRICE-001-S01 | 2024 : adjudication 1 900 €, frais vérifiés 18 %, coût 2 242 € | PASS | CLI, lot 288 et catalogue 2024 capturés, lot 318 hors fenêtre |
| QA-PRICE-001-S02 | Taux 2026 non rétroactif | PASS | CLI : 18 % + 0 % et non 1,2 % sur 2024 |
| QA-PRICE-001-S03 | Frais 2022 inconnus, exclusion du dénominateur | PASS | CLI : lot 368 brut 1 650 €, coût non vérifié, moyenne 1 vente |
| QA-PRICE-001-S04 | Classement FR hors port, doublons/accessoire/autre modèle | PASS | CLI et journal des six fiches ouvertes : 1 500/1 650/1 800 €, moyenne 1 650 €, état visible après correction |
| QA-PRICE-001-S05 | Une offre contrôlée puis recontrôle du marché courant | PASS | Replay : partielle 1 750 € ; **live** : 3 offres vérifiées à 1 750/1 780/1 790 €, moyenne 1 773,33 € sur 3 pages/150 annonces |
| QA-PRICE-001-S06 | Chopard Alfa Romeo sans comparable | PASS | Replay et **live** : 0 moyenne historique vérifiée, 0 offre FR parmi 3 résultats Packet (UA, IT, CH) |
| QA-PRICE-001-S07 | Packet HTTP 426 n'efface pas l'adjudication | PASS | CLI replay : source inaccessible, coût historique 2 242 € préservé |
| QA-PRICE-001-S13 | Trois pages sur cinq, minimum local | PASS | CLI/journal : 3 pages/6 annonces sur 10, moyenne 1 300 €, aucune requête page 4 |
| QA-PRICE-001-S14 | Zéro dans l'échantillon, pas dans le marché | PASS | CLI/journal : 0 parmi 6 inspectées, offre page 4 non demandée, limite affichée |
| QA-PRICE-001-S08 | Plafond sur frais cible et prix demandés | PASS | Replay : 4 345/1,192 → 3 645,13 € ; **live** : 3 933/1,192 → 3 299,49 €, vendeur FR vérifié sur les trois fiches |
| QA-PRICE-001-S09 | Arrondi inférieur | PASS | 3 645,13×1,192 ≤ 4 345 et 3 645,14×1,192 > 4 345 ; live 3 299,49×1,192 ≤ 3 933 < 3 299,50×1,192 |
| QA-PRICE-001-S10 | Frais cible absents dans la réponse publique contrôlée | PASS | CLI : moyenne Chrono disponible, coût historique affiché, aucun plafond chiffré |
| QA-PRICE-001-S11 | Moyenne inaccessible faute d'offres dans l'échantillon | PASS | CLI : plafond indisponible, 3 pages/6 annonces sur 10, sans estimation substituée |
| QA-PRICE-001-S15 | Plafond indicatif sur trois pages | PASS | CLI/journal : 1 300/1,192 → 1 090,60 €, limite d'échantillon explicitée, pas de page 4 |
| QA-PRICE-001-S12 | Source bloquée ≠ plafond à 0 € | PASS | CLI : Packet HTTP 426, plafond non vérifiable, résultats historiques distincts |

### Préflight et régressions

- `node .ai/tasks/PRICE-001/qa/scripts/capture.mjs` : 12 réponses HTTPS publiques (annonces officielles et deux PDF), manifest URL/SHA-256/tailles ; toutes recontrôlées par `run.mjs` **avant** les scénarios. Contenu oracle lu indépendamment au moyen de Cheerio et PDF.js (dates/numéros/montants, frais datés, lien du catalogue). Les réponses Packet synthétiques correspondent aux scénarios contrôlés, pas à des annonces actuelles.
- `node .ai/tasks/PRICE-001/qa/scripts/run.mjs` : **PASS 15/15** ; aucune source, module privé ni injection de fonction du produit invoquée, seule la couche HTTPS est rejouée lors de l'exécution de `node bin/comparer-prix.mjs`. Répertoire temporaire supprimé après chaque suite ; aucune enchère.
- Contrôles live via `node --env-file=.env bin/comparer-prix.mjs --url ... --as-of ...` pour lots 318, 323 et 268. Contrôle indépendant de six fiches `/product` Packet et de la recherche Chopard : HTTP 200, prix EUR, pays FR pour les six annonces retenues, stock/disponibilité confirmés. Le lot 268 a été rejoué en live **après** la correction d'affichage : 3 933 € de moyenne, plafond 3 299,49 €, états de trois offres visibles. Prix réels variables ; le 15/11/2026 était la date **d'analyse passée en argument**, la consultation est datée dans `live-check.json`.
- `parse-gherkin` + `check-gherkin-dry` sur F01 et F02 : **PASS**, pas de contradiction entre features, critères et procédures ; avis DRY conservés. `pnpm test` **87/87**, `pnpm acceptance` **21/21**, `pnpm property` **1/1**. Build/typecheck non configurés. Régression qualité : `crap` LCOV frais, maximum **6,0**, et `dryer` **0 candidat**. Aucune mutation exécutée par QA.

## Failures

Un défaut produit d'affichage a été confirmé puis réparé ; les autres échecs du **premier lancement du runner** étaient des erreurs de vérification QA, corrigées puis reproduites avec succès sur toute la suite :

| ID | Attendu | Observé | Classification | Reproduit après correction |
|---|---|---|---|---|
| S01/S06/S07 | Libellé CLI et coût historique corrects | Assertions QA avec apostrophe typographique alors que la CLI écrit `'` | Défaut du runner QA ; assertions corrigées | Oui, PASS |
| S04 | Prix retenus 1 500/1 650/1 800 € | Recherche textuelle « 500 € » également présente dans « 1 500 € » | Défaut du runner QA ; assertion ancrée au début de ligne | Oui, PASS |
| S08/S09/S15 | Plafonds calculés et affichés | Assertion QA recevait un objet au lieu de sa sortie texte | Défaut du runner QA ; lecture de `stdout` | Oui, PASS |
| S10 | Moyenne disponible, frais cible inconnus | Replay sans jeu Packet pour le mode `no_fees`, affichait « erreur réseau » | Défaut du replay QA ; même jeu Monaco maintenu | Oui, PASS |
| S04 / affichage de l'état | Préserver l'état connu des offres, sans inventer celui du lot | La sortie CLI avant correction omettait `condition` malgré une fiche Packet « Très bon » ; voir `/tmp/price-qa-first.log` et les sorties antérieures dans `live-check.json` | **Défaut produit** de rendu : `bin/comparer-prix.mjs` ; test de sortie et assertion QA ajoutés. Commande : `node bin/comparer-prix.mjs --url <vente 2021> --as-of 2026-11-11 318` avec replay `mode=rank` | Oui : suite QA 15/15 + CLI lot 268 live après correction |

Commandes et sorties de la première tentative : `/tmp/price-qa-first.log` (journal local), comparaison reproductible dans `result.json` final. Le défaut d'état a entraîné la modification minimale du rendu CLI et d'un test unitaire. Aucune condition du Gherkin n'a été affaiblie.

## Changes made

- QA scripts created or updated: `qa/scripts/capture.mjs`, `qa/scripts/replay.mjs`, `qa/scripts/run.mjs` ; `qa/README.md`, `qa/fixtures/manifest.json` et douze captures publiques ; `qa/result.json`, `qa/live-check.json`, `qa/report.md`.
- Product files changed: `bin/comparer-prix.mjs` — affiche l'état de l'offre quand disponible, sinon « non renseigné », sans inférer l'état du lot source.
- Test files changed: `test/prices-cli.test.mjs` — contrôle états connu et absent ; l'assertion publique de S04 dans le runner QA exige désormais « état : Très bon ».
- Configuration changed: **aucune** ; `.env` demeure ignoré par Git.

## Remaining issues

- Packet et les annonces restent volatils : le relevé antérieur « 1 offre Carrera / 2 offres Monaco » est devenu **3 offres / 3 offres** au passage live. Les prix contrôlés ne couvrent que les trois premières pages, triées par pertinence ; ils ne garantissent pas le minimum du marché entier.
- Les seuls frais historiques automatiquement authentifiés restent ceux de la vente du 15/06/2024. Les coûts des autres adjudications ne doivent pas entrer dans la moyenne vérifiée.
- L'état des offres est maintenant affiché, mais l'état du lot cible n'est pas renseigné (lot 318) : une **différence d'état** ne peut être déterminée. Couverture de l'état de la montre cible à clarifier lors d'une évolution de la caractérisation LOT-001, sans déduire un état absent.
- La correction du rendu dans `bin/comparer-prix.mjs` et le test ajouté ont rendu le snapshot de **mutation CLI** du hardener antérieur périmé. QA n'a pas exécuté de mutation (hors de son rôle) ; solliciter un rafraîchissement hardener avant de réaffirmer son score global.

## Human decisions required

- Aucune pour déclarer cette QA sur les scénarios approuvés. Un arbitrage ultérieur serait nécessaire si l'utilisateur souhaite comparer les **états** malgré l'absence d'état caractérisé pour le lot source, ou augmenter la couverture Chrono24 au-delà des trois pages déjà approuvées.
