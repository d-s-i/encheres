# QA Report — APP-001 (F01/F02/F03)

## Status

**PASS** — préflight complet de **48 réponses publiques capturées** et **14/14 scénarios externes** exécutés par les formulaires et liens de l'application réelle dans Chromium ; un défaut produit S12 a été reproduit, corrigé minimalement, puis revérifié seul et dans la suite complète. Aucun achat ni transaction. Les études de l'utilisateur dans `data/` n'ont pas été modifiées.

**Commande :** `node .ai/tasks/APP-001/qa/scripts/run.mjs` (exit 0). Le préflight indépendant est `node .ai/tasks/APP-001/qa/scripts/preflight.mjs`. [`result.json`](result.json) conserve **pour chacun des 14 cas** les commandes, pages HTML intégrales, actions/sorties du navigateur, requêtes HTTPS, réponses image, sortie serveur et nettoyage. Captures/oracles : `fixtures/manifest.json` et les captures PRICE-001 réutilisées ; procédure de reproduction : [`README.md`](README.md). Les montants fixes sont ceux des réponses publiques capturées/contrôlées, pas des cours garantis aujourd'hui.

## QA scenarios

| ID | Scénario | Résultat | Preuve |
|---|---|---|---|
| QA-APP-001-S01 | Vente + lot → tableau sourcé, photo, moyenne 4 345 € / 2 et plafond 3 645,13 € | PASS | Formulaire Chromium, lot 268, catalogue cible et 2024, photo chargée ; `result.json` |
| QA-APP-001-S02 | Fiches/photos des trois comparables réellement retenus | PASS | Galerie et liens : historique 246 et deux annonces françaises, images publiques chargées ; aucune fiche étrangère |
| QA-APP-001-S03 | Image lot et comparable devenues inaccessibles | PASS | 404 contrôlés ; repli visible, autres photos et prix/URLs inchangés |
| QA-APP-001-S04 | Packet 426 et frais historiques inconnus | PASS | Ligne sauvegardée ; coût brut sans frais inventés, moyenne/plafond non vérifiables |
| QA-APP-001-S05 | Lot 99999 absent | PASS | Parcours complet des cinq pages publiques capturées ; message d'absence, aucune ligne créée |
| QA-APP-001-S11 | Deux adjudications datées 2022/2024 | PASS | 1 650 € sans coût vérifié, 1 900 € avec coût 2 242 € ; photos et sources propres |
| QA-APP-001-S06 | Rouvrir sans recalcul malgré nouvelles sources | PASS | Fermeture/redémarrage serveur + navigateur, prix/date anciens inchangés et 0 nouvelle requête HTTPS |
| QA-APP-001-S07 | Doublon bloqué avant collecte | PASS | Formulaire et lien vers l'instantané ; 0 nouvelle requête HTTPS et une seule ligne |
| QA-APP-001-S08 | Supprimer puis refaire l'étude | PASS | Actions publiques ; prix mis à jour 3 933 €, plafond 3 299,49 €, nouvelle date, une seule ligne |
| QA-APP-001-S09 | Numéro 268 dans deux ventes différentes | PASS | Vente 2026 Monaco + vente 2022 Chopard Happy Sport ; deux lignes, fiches et photos distinctes |
| QA-APP-001-S10 | Suppression isolée après redémarrage | PASS | Seule la première ligne disparaît ; seconde fiche et photo encore consultables |
| QA-APP-001-S12 | Grille multi-lots Excel et colonnes datées | PASS **après correction** | Lots 268/343, colonnes 2022/2023/2024, liens des deux annonces retenues ; rerun [`S12-rerun`](evidence/APP-001-S12-rerun.json) |
| QA-APP-001-S13 | Cellules/moyennes absentes sans invention | PASS | Chopard Alfa Romeo : 0 lien et moyennes indisponibles ; autre lot brut sans coût historique fictif |
| QA-APP-001-S14 | Largeur 1 357 px et six dates historiques | PASS | Page : 1 342 px de contenu pour une fenêtre 1 357 px ; quatre colonnes datées, deux dates en fiche, [capture](evidence/APP-001-S14.png) |

**Contradictions :** aucune entre les critères approuvés, les trois fichiers Gherkin et la procédure. `parse-gherkin` et `check-gherkin-dry` ont été exécutés sur F01 (6), F02 (5), F03 (3) : **PASS, 0 constat consultatif** ; le pipeline `pnpm acceptance` demeure distinct de la QA navigateur.

**Régressions finales :** `pnpm test` **111/111**, `pnpm acceptance` **35/35**, `pnpm property` **2/2**. Aucun build/typecheck configuré. `crap` avec couverture LCOV régénérée et sources APP/PRICE touchées : `.metrics/crap.edn` lu, **maximum 6,0** ; `dryer` `.metrics/dry.edn` lu, **0 candidat**. `uml-quality` a actualisé la conversion du CRAP ; les snapshots de mutation LOT/PRICE restent périmés et APP-001 n'a **pas** subi de mutation (décision de report par l'utilisateur).

## Failures

| ID | Attendu | Observé | Classification | Reproduit |
|---|---|---|---|---|
| QA-APP-001-S12 (première campagne) | Lot 268 : vente comparable du 10/12/2022 en colonne datée, 4 800 € hors frais ; fiche publique du lot 302 attestant deux « sous- compteurs ». | La fiche publique capturée a été consultée (HTTP 200), mais le comparateur a écarté cette vente : colonne 2022 absente ; seules dates 2023/2024 visibles. | **Défaut produit**, source `src/price-matching.mjs` : le motif `sous-compteur` ne reconnaissait pas l'espace après le tiret. Correction minimale `/sous-\s*compteur/`, test `test/prices.test.mjs`. Preuve originale : [`APP-001-S12-before-fix.json`](evidence/APP-001-S12-before-fix.json) avec commande, HTML et toutes requêtes. | Oui : test ciblé rouge puis vert, [`rerun S12`](evidence/APP-001-S12-rerun.json) PASS et suite finale 14/14 PASS. |

## Changes made

- QA scripts created or updated: `qa/scripts/capture.mjs`, `preflight.mjs`, `replay.mjs`, `browser.mjs`, `run.mjs` ; `qa/fixtures/` (captures et manifeste), `qa/evidence/`, `qa/result.json`, `qa/README.md`, `qa/report.md`.
- Product files changed: **`src/price-matching.mjs` uniquement**, pour reconnaître `sous- compteurs` dans une description officielle de Monaco ; aucune politique de comparabilité ou règle de prix modifiée.
- Test files changed: `test/prices.test.mjs` : régression de comparaison Monaco sur le texte public du catalogue 2022.
- Configuration changed: aucune ; stockage QA isolé dans un répertoire temporaire, horloge/réponses HTTPS externes contrôlées et clé factice Packet. Aucun fichier `.env` ni étude utilisateur modifiés.

## Remaining issues

- Les liens et photos d'annonces peuvent expirer ; les tableaux sauvegardés sont des instantanés et leur ouverture ne vérifie pas les annonces à nouveau. L'essai réel sur une annonce déjà sauvegardée ayant ensuite retourné Packet 404 ne prouve pas une vente conclue.
- La version locale n'a ni authentification ni garantie transactionnelle multi-processus ; ne pas l'exposer publiquement en l'état (rapport architecte).
- Le rapport cleaner antérieur à ce tour est **périmé pour `src/price-matching.mjs`**. Les contrôles CRAP/DRY de régression QA ont été rafraîchis et lus, mais cleaner/architect/hardener demeurent propriétaires de leurs validations respectives. Mutation APP-001 non exécutée conformément au choix utilisateur.

## Human decisions required

- Aucune pour les 14 scénarios approuvés. Une décision distincte est nécessaire avant hébergement partagé/public ou si l'utilisateur souhaite modifier la politique d'instantané des études.
