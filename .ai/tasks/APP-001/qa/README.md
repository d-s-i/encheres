# QA externe APP-001 — interface publique

Depuis la racine du dépôt, après `pnpm install --frozen-lockfile` :

```sh
# Une fois seulement, ou pour rafraîchir les captures publiques ; consomme quelques lectures Packet.
node --env-file=.env .ai/tasks/APP-001/qa/scripts/capture.mjs
node .ai/tasks/APP-001/qa/scripts/preflight.mjs
node .ai/tasks/APP-001/qa/scripts/run.mjs
```

`preflight.mjs` vérifie **avant tout scénario** les 48 captures publiques du Crédit Municipal, de Packet et des photos, les deux catalogues PDF datés, leurs empreintes SHA-256 et les oracles de lots, prix, pays vendeurs et frais. Les captures PRICE-001 préexistantes sont réutilisées, et les captures APP supplémentaires sont décrites dans `fixtures/manifest.json`. Les réponses Packet projetées ne contiennent que les champs publics nécessaires et aucun contact vendeur ni clé API ; une lecture de capture nécessite `PCKT_API_KEY` local, **jamais saisie dans l'interface ni copiée dans les résultats**. Les prix fixes sont des oracles de replay horodatés, pas des prix actuels garantis.

`run.mjs` lance **le vrai `bin/app.mjs`** dans un répertoire temporaire isolé, avec la clé factice `qa-replay-only`, et l'utilise par le formulaire et les liens affichés dans Chromium. La couche HTTPS extérieure est rejouée par `scripts/replay.mjs`, sans injection de résultat dans les fonctions du produit, ni écriture directe dans sa sauvegarde. Le navigateur reçoit les photos publiques capturées par son transport externe ; les photos volontairement absentes simulent HTTP 404. La date est contrôlée par l'horloge de l'environnement QA ; la sauvegarde du scénario est supprimée via son bouton public, puis le répertoire temporaire est retiré. Aucune étude de l'utilisateur n'est touchée. Le mode `--scenario=S12` relance un cas particulier pour diagnostic ; **seule la commande sans filtre constitue la suite complète**.

Résultats : `qa/result.json` contient pour chaque cas la commande, les actions et réponses HTML complètes, les requêtes HTTPS et photos, les codes et le nettoyage. `qa/evidence/` conserve le défaut S12 initial, son rerun et la capture d'écran S14. Statuts : PASS/FAIL/ENVIRONMENT_ERROR/NOT_RUN ; exit 0 pour PASS, 1 pour FAIL, 2 pour blocage externe après préflight, 4 pour préflight incomplet (jamais classé comme environnement ou NOT_RUN). La QA indépendante est distincte de `pnpm acceptance`.
