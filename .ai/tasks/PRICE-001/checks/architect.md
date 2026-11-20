# Architect — PRICE-001 (F01 et F02)

## Statut : PASS — revue d'architecture ; rafraîchissement cleaner nécessaire

### Entrées examinées
- Demande humaine, critères et Gherkin F01 (9 scénarios) / F02 (6 scénarios) ; procédures QA `qa/procedure.md` et `qa/plafond-enchere.md`.
- Source réelle : `bin/comparer-prix.mjs`, `src/lots.mjs`, `src/pdf-lots.mjs`, `src/watch.mjs`, tous les modules `src/price-*.mjs` et `src/prices.mjs` ; tests unitaires et handlers d'acceptation.
- `.ai/architecture.md`, rapport cleaner `checks/cleaner.md`, `.metrics/crap.edn`, `.metrics/dry.edn` et `coverage/lcov.info` présents avant l'intervention. Aucune mutation complète ni QA externe disponible.

### Findings

| Gravité | Emplacement | Constat | Action |
|---|---|---|---|
| Moyenne | `src/prices.mjs` | Le calcul financier pur était importé via un orchestrateur dépendant des adaptateurs HTML/Packet/PDF. | Déplacé dans `src/price-ceiling.mjs`, réexporté sans changer l'API publique. Test de propriété séparé. |
| Moyenne | `src/price-fees.mjs` | La redirection du PDF historique pouvait pointer sur une autre origine ; celle du catalogue cible pouvait pointer vers un autre identifiant de vente sur le même domaine tout en restant attribuée au document initial. | Vérification de l'origine finale du PDF 2024 et de l'identité finale de vente du PDF cible ; tests de régression de provenance. |
| Faible | `src/price-packet.mjs` → `src/price-selection.mjs` | `sample` est porté par une propriété ajoutée au tableau de résultats ; une copie filtrée du tableau perdrait cette information et pourrait produire une conclusion non contextualisée. | Contrat documenté dans `.ai/architecture.md` ; pas de changement public non approuvé. |
| Risque externe | Packet et catalogues historiques | L'API tierce peut rendre HTTP 426 ou épuiser le quota ; seule la vente 2024 possède actuellement une source de frais historiques authentifiée. | Limites et politique d'indisponibilité conservées ; QA externe et arbitrage produit futur, pas de généralisation des taux. |

### Modifications
- `src/price-ceiling.mjs` : politique de plafond sur des centimes entiers, sans import ni IO ; `src/prices.mjs` conserve son interface via réexport.
- `src/price-fees.mjs` : provenance vérifiée lors des redirections PDF, sans nouveau taux ni nouvelle source.
- `test/property/bid-ceiling.test.mjs` et `pnpm property` : invariant du plafond maximal sans dépasser le budget après frais, **plus de 7 000 combinaisons déterministes**.
- `test/architecture.test.mjs` dans `pnpm test` : absence de cycle dans le sous-graphe PRICE-001 ; plafond pur sans import/IO ; sélection/matching sans import des adaptateurs.
- `.ai/architecture.md` et `README.md` : flux et commandes à jour.

### Vérification
- `pnpm test` : **PASS**, 64 tests (dont 2 contrôles d'architecture ciblés).
- `pnpm acceptance` : **PASS**, 21 scénarios (LOT-001 + PRICE-001).
- `pnpm property` : **PASS**, 1 test couvrant > 7 000 combinaisons.
- Contrôle déterministe du graphe (automatisé sous `pnpm test`) : **PASS**, pas de cycle ni dépendance interdite entre les modules PRICE listés.
- Typecheck / compilation / build : **non configurés**, non exécutés.
- CRAP/DRY : **rapports cleaner lus, mais devenus périmés** pour `src/prices.mjs`, `src/price-fees.mjs` et le nouveau `src/price-ceiling.mjs`. Le cleaner doit rafraîchir les mesures et le scan des sites de mutation avant le hardener. Aucun CRAP/DRY ni mutant complet lancé par l'architecte.
- QA indépendante : **non exécutée**.

### Décisions et risques restant ouverts
Aucune nouvelle décision humaine nécessaire pour cette revue. L'utilisateur a déjà accepté un échantillon Chrono24 de trois pages et un plafond théorique ; ne pas le présenter comme une valeur garantie du marché ni comme une enchère acceptée par le pas de la vente. Les cas d'absence de CGV historiques restent à préciser si leur exclusion réduit sensiblement l'échantillon réel. Les copies du tableau Packet doivent préserver la provenance `sample` tant que l'interface publique ne change pas.
