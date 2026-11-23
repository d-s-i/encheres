# QA Report — IMPORT-001 (préflight partiellement achevé)

## Status

**BLOCKED — pas de QA globale PASS.** Après décision humaine, les scénarios et la procédure utilisent les favoris observés : lots **201/202** de la vente Horlogerie Crédit Municipal, 1002/1003 chez Cap Enchères. Les cas « ordre seul 203 » et pagination restent des relectures contrôlées **à préparer**, sans dépôt d'ordre réel. La version de production Vercel sert encore l'ancienne UI ; le profil Chromium de test a été redémarré avec l'extension et la session Interencheres y est connectée (favoris Crédit Municipal 201/202 visibles), et l'utilisateur a ouvert la popup par la barre du navigateur. Cette étape live et un réimport idempotent local ont été observés, mais **sur les données utilisateur existantes**, pas sur une instance QA isolée. Le préflight requis pour S01–S09 et S11 est donc incomplet. Aucun scénario manquant n'est classé `NOT_RUN` ou `ENVIRONMENT_ERROR` pour masquer cette préparation.

## QA scenarios

| ID | Scenario | Result | Evidence |
|---|---|---|---|
| IMPORT-001-S12 | Choix du mode d'analyse | **PASS** | `node .ai/tasks/IMPORT-001/qa/scripts/manual-lot202.mjs` : Chromium isolé et application lancée via la commande publique, répertoire de travail temporaire ; les deux choix sont ouverts dans la modale, aucune étude avant soumission. |
| IMPORT-001-S13 | Étude manuelle dans la modale | **PASS** | Même commande : lot réel 202 issu du catalogue Crédit Municipal, modale ouverte pendant le traitement, résultat et lien de fiche, puis tableau contenant **PIAGET**, **modèle non indiqué**, sans comparaison inventée. Une étude de QA créée puis effacée avec le répertoire temporaire ; aucune étude utilisateur modifiée. Packet désactivé explicitement (pas de modèle). |
| IMPORT-001-S10 et retour d'import local | Smoke seulement, **pas verdict de scénario** | `node .ai/tasks/IMPORT-001/qa/scripts/smoke-local.mjs` sur l'instance utilisateur : tableau/modale visibles ; lien de retour proposant les lots 201/202 et confirmation annulée, zéro POST d'étude. Voir `qa/smoke-local.md`. Instance non isolée, donc pas PASS formel pour S10. |
| IMPORT-001-S01/S06/S07 | Smoke live, **pas verdict formel** | Popup de l'extension installée observée dans Chromium de test authentifié : **2 favoris Crédit Municipal, 1 vente « horlogerie »** ; les autres maisons favorites non proposées. Choix « Local », import idempotent 201/202, nouvel onglet `/?imported=…`, modale « Lancer l'analyse », confirmation annulée, tableau resté à 4 études. Instance locale utilisateur préexistante, donc préconditions QA isolée et études absentes non satisfaites. |
| IMPORT-001-S02–S05, S08/S09, S11 | Préflight incomplet, **non classés** | Cas ordre seul/pagination contrôlés et environnement Vercel Preview à jour restent à préparer ; analyses utilisateur interdites comme fixture. Les tests d'acceptation simulés ne remplacent pas ces observations. |

## Failures

| ID | Expected | Observed | Classification | Reproduced |
|---|---|---|---|---|
| S05 préflight Vercel | Version IMPORT-001 disponible dans un environnement Preview isolé | `https://encheres-kohl.vercel.app/` sert encore l'ancien formulaire ; aucun Preview à jour vérifié | Setup manquant, pas FAIL de la version locale | Oui, GET public du 22/11/2026 |
| Ancien instantané local 202 | Marque PIAGET et modèle explicitement inconnu | JSON utilisateur sauvegardé avant correctif : marque/modèle vides et erreur historique `trim` | Donnée historique périmée, **non corrigée sans autorisation de suppression** | Oui ; contraste avec PASS S13 sur un nouvel instantané isolé |

## Changes made

- QA scripts : `qa/scripts/smoke-local.mjs` (lecture seule), `qa/scripts/manual-lot202.mjs` (instance temporaire isolée via `bin/app.mjs`, nettoyage automatique), `qa/scripts/extension-local-smoke.mjs` (pour répéter le smoke réel après ouverture de la popup par l'utilisateur ; créé, **pas encore exécuté**).
- Manifest de provenance : `qa/fixtures/source-manifest.json` ; vrais liens favoris 201/202/1002/1003 distincts des scénarios ordre seul/pagination **synthétiques**.
- Spécification/acceptation et procédure : numéros des exemples adaptés **après accord humain** aux favoris authentiques 201/202 et Cap Enchères 1002 ; l'état ordre seul 203 et le lien de pagination sont expressément contrôlés/synthétiques, pas déclarés capturés du compte.
- Product files modifiés pendant cette invocation QA : aucun. L'ancienne étude utilisateur 202 n'a pas été supprimée.
- Aucun changement de configuration.

## Regression commands réellement exécutées

- `pnpm test` : **PASS 144/144**.
- `pnpm acceptance` : **PASS 48/48** (tests générés, distincts de la QA externe).
- `pnpm property` : **PASS 2/2**.
- `check-gherkin-dry .ai/tasks/IMPORT-001/acceptance/importer-favoris-vente.json .ai/tasks/IMPORT-001/acceptance/importer-favoris-vente-dry.json` : sortie valide, 8 alertes consultatives.
- `node .ai/tasks/IMPORT-001/qa/scripts/smoke-local.mjs` : **PASS smoke partiel** sans import ni étude.
- `node .ai/tasks/IMPORT-001/qa/scripts/manual-lot202.mjs` : **PASS S12 et S13** sur instance isolée ; résultat de QA temporaire nettoyé.
- Build/typecheck/lint non configurés. CRAP/DRY source et mutation non exécutés : responsabilités cleaner/hardener.

## Remaining issues

- Le profil Chromium de test a l'extension activée et la page Favoris authentifiée (Cap Enchères 1002/1003, Crédit Municipal 201/202). La popup et un réimport idempotent 201/202 ont été vérifiés via interface publique ; les liens observés ont été consignés dans `qa/fixtures/source-manifest.json` sans session ni HTML du compte. La QA formelle doit encore utiliser une **instance isolée**. Le lot 203 ordre seul et la pagination ne sont **pas observés réellement** : constituer une relecture contrôlée traçable, pas un ordre réel.
- Déployer **en Preview de QA** le code courant, sur stockage isolé ; la production est ancienne. Ne pas utiliser les études réelles comme fixtures.
- L'application locale utilisateur active a été démarrée avant le correctif `src/watch.mjs` ; ne pas l'arrêter sans accord. Le script S13 lance une instance isolée à jour et confirme le nouveau résultat PIAGET.
- L'ancienne étude 202 locale doit être supprimée et recréée volontairement pour changer son instantané ; cette opération n'est pas impliquée par les tests QA.

## Human decisions required

La décision d'adapter les numéros des scénarios et d'utiliser une relecture contrôlée est confirmée. Le profil QA avec session Interencheres et extension chargée est maintenant disponible. Pour terminer **S01–S09/S11**, il faut encore une instance d'application avec stockage QA isolé, des relectures contrôlées ordre seul/pagination et un environnement Vercel Preview à jour ; ne pas utiliser les études personnelles comme fixtures.
