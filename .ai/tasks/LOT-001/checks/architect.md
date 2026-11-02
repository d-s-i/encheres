# Architecture — LOT-001

## Statut : PASS

Inspection de l'ensemble des modules concernés, de leurs imports, des tests unitaires et d'acceptation, des critères LOT-001 et du rapport du cleaner. La structure actuelle est proportionnée à une source web et un type de PDF textuel : aucune modification du code ou du contrat public n'est nécessaire pour cette tranche. L'architecture actuelle est documentée dans `.ai/architecture.md`.

| Sévérité | Emplacement | Constat | Action |
| --- | --- | --- | --- |
| Information | `src/watch.mjs` | Extraction déterministe et normalisation sans dépendance IO ; utilisée par les deux sources. | Conserver cette dépendance dirigée vers la politique pure. |
| Information | `src/lots.mjs`, `src/pdf-lots.mjs`, `bin/etudier-lots.mjs` | La CLI lit un PDF local ; l'orchestration accepte les octets ou une URL et injecte `fetchImpl` pour les tests ; pas de cycle d'import constaté. | Contrat suffisant pour LOT-001. |
| Vigilance future | `src/lots.mjs` | L'orchestration dépend aussi des détails HTML (Cheerio, sélecteurs et pagination) du seul catalogue pris en charge. | Si une autre source arrive, isoler l'adaptateur de catalogue avant de multiplier les formats. Aucun remaniement anticipé ici. |
| Vigilance future | `src/pdf-lots.mjs` | Le PDF textuel est traité par sections ; l'ordre du texte extrait peut ne pas suivre l'ordre visuel d'autres catalogues. | Vérifier des documents réels avant d'étendre la prise en charge ; ne pas promettre l'OCR. |

La propriété intéressante « une permutation des numéros demandés ne mélange ni les montres ni leur provenance » est déjà exercée partiellement par les exemples 318/323 et les tests d'entrées invalides. Le périmètre actuel ne justifie pas de créer une infrastructure de tests de propriétés : il n'y a ni framework ni commande de propriétés configurés, et des exemples vérifiables restent plus clairs pour deux sources concrètes.

## Vérification

- `pnpm test` : PASS, 16 tests.
- `pnpm acceptance` : PASS, 6 scénarios générés depuis le Gherkin.
- `node --check` sur les modules source et CLI : PASS ; aucune commande de compilation, build ou typecheck n'est configurée.
- Vérification d'architecture : inspection des imports et des frontières ; aucune commande automatisée existante, aucun nouveau contrôle ajouté (le graphe est petit et stable pour LOT-001).
- Rapport cleaner `.ai/tasks/LOT-001/checks/cleaner.md` et `.metrics/crap.edn` / `.metrics/dry.edn` consultés ; max CRAP 6, 0 doublon candidat au moment du cleaner.
- Rapports CRAP/DRY **non invalidés** : seuls `.ai/architecture.md` et ce rapport ont été créés, aucun fichier source ou de test modifié par l'architecte.
- Mutation complète et QA indépendante non exécutées : hors rôle.
