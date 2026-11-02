# Architecture actuelle — étude de montres (LOT-001)

État documenté après LOT-001. Ce fichier décrit l'implémentation existante, sans fixer l'architecture des tâches PRICE-001 et APP-001.

## Flux et modules

```text
.pi/prompts/etudier-lots.md (aide conversationnelle Pi)
        ↓ demande à Pi de lancer la commande
bin/etudier-lots.mjs (arguments, lecture du PDF local, rendu Markdown)
        ↓ studyLots({ saleUrl | pdfBytes, numbers })
src/lots.mjs (validation des entrées, orchestration, recherche des annonces web)
        ├── cheerio + fetch HTTPS (pages Crédit Municipal de Paris)
        ├── src/pdf-lots.mjs (pdfjs-dist, texte des pages, sections de lots)
        └── src/watch.mjs (relevé déterministe des caractéristiques et normalisation)
```

`src/pdf-lots.mjs` dépend de `src/watch.mjs` ; `src/watch.mjs` ne dépend d'aucun outil d'entrée-sortie. Dans le flux utilisateur, `bin/etudier-lots.mjs` est le seul module qui lit un chemin de PDF local et formate la réponse utilisateur. `src/lots.mjs` injecte `fetchImpl` pour tester la lecture web sans réseau ; le PDF est fourni sous forme d'octets. L'extraction PDF et l'extraction web partagent `extractWatch` afin de conserver la même signification des champs. Pas de cycle d'import constaté.

Le résultat de `studyLots` a la forme `{ watches, missing }`. Chaque montre comporte son numéro de lot et sa provenance (`source` : URL de l'annonce ou nom du PDF). Le même numéro peut appartenir à plusieurs ventes ; pour le web, l'URL de vente identifie le contexte et les liens d'annonces sont vérifiés dans ce contexte. Le PDF reste identifié par le document fourni, sans garantie d'identifiant de vente extrait. Les prix d'adjudication et estimations ne sont pas un coût d'achat final.

## Frontières et limites

- Le web est volontairement limité aux URL HTTPS de `www.creditmunicipal.fr`. Les sélecteurs HTML et la pagination sont propres au catalogue actuel ; des ventes aux structures différentes exigeront une validation et potentiellement une adaptation de l'entrée web.
- La lecture PDF n'exécute pas de contenu du document et attend un texte extractible ; un PDF uniquement image ne fournit pas de description. Le format texte extrait peut différer de l'ordre visuel des pages.
- `src/lots.mjs` regroupe actuellement l'orchestration avec l'adaptateur HTML de ce seul site. Cette dépendance est proportionnée à une source unique, mais si d'autres catalogues ou canaux sont ajoutés, séparer l'adaptateur de catalogue de l'orchestration avant que la politique applicative dépende de plusieurs formats de pages.
- `src/lots.mjs` réexporte `readPdf` et `extractWatch` pour préserver ses consommateurs existants. Ne pas ajouter à cette surface des détails internes des parseurs sans besoin utilisateur.
- Les tests unitaires injectent les pages publiques comme réponses contrôlées ; les tests d'acceptation sont générés à partir du Gherkin et passent par `run()` avec les mêmes contrats. La QA externe dans `.ai/tasks/LOT-001/qa/procedure.md` reste indépendante et non exécutée par ces tests.

## Vérification

`pnpm test` et `pnpm acceptance` sont les commandes projet. Il n'y a pour le moment ni compilation, ni typecheck, ni contrôle architectural automatisé configurés. Les rapports CRAP/DRY locaux de la phase cleaner ont été lus ; cette revue d'architecture n'a pas modifié le code couvert par ces rapports.
