# QA exécutable PRICE-001

Depuis la racine du dépôt :

```sh
node .ai/tasks/PRICE-001/qa/scripts/capture.mjs  # initialiser / rafraîchir les réponses publiques HTTPS
node .ai/tasks/PRICE-001/qa/scripts/run.mjs      # 15 scénarios F01/F02 via la vraie commande CLI
```

`capture.mjs` récupère les annonces officielles 2021/2022/2024/2026 et les catalogues PDF 2024/2026 ; le manifest contient les URL, tailles et SHA-256, **aucune clé API**. `run.mjs` vérifie **avant tout scénario** la complétude, les empreintes et des oracles indépendants (Cheerio et PDF.js) : dates, lots, adjudications, taux du catalogue et lien PDF. Une capture manquante ou invalide bloque la préparation (exit 4), jamais `ENVIRONMENT_ERROR` ni `NOT_RUN`. Les réponses Packet des scénarios contrôlés sont générées par `scripts/replay.mjs` selon la procédure et incluent pagination, pays vendeur, doublon, accessoire, absence de catalogue et erreur 426. Un préchargement Node intercepte **uniquement les réponses HTTPS externes** ; la commande `node bin/comparer-prix.mjs --url ...` et tous les modules produit exécutent leur chemin normal. Aucun serveur, transaction, base de données ou clé réelle n'est utilisé dans le replay. Statuts scénario : PASS, FAIL ; résultat JSON complet dans `result.json` (commandes, stdout/stderr, URLs et codes HTTP). Exit 0 = PASS, 1 = FAIL, 4 = préflight incomplet. Les fichiers temporaires sont effacés.

Contrôle complémentaire de prix **réels et variables**, en utilisant la clé `.env` locale sans l'imprimer :

```sh
node --env-file=.env bin/comparer-prix.mjs --url 'https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/ventes-passees/210605000/' --as-of 2026-11-11 318 323
node --env-file=.env bin/comparer-prix.mjs --url 'https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/261205000/' --as-of 2026-11-15 268
```

Les sorties complètes des exécutions QA et les vérifications indépendantes des fiches `/product` sont dans `live-check.json`. Les exemples 1 750 €/4 345 € du Gherkin sont **des valeurs de scénario contrôlé**, pas des garanties de prix courant. Recontrôler les fiches et le quota Packet à chaque nouveau passage live ; ne pas reproduire des prix périmés comme oracles.
