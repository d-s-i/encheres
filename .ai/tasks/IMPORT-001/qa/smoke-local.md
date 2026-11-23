# IMPORT-001 — QA locale partielle du 22/11/2026

## Exécution

- Commande reproductible : `node .ai/tasks/IMPORT-001/qa/scripts/smoke-local.mjs`.
- Interface : `http://127.0.0.1:3000/`, Chromium isolé sans accès au profil personnel ni aux cookies Interencheres.
- Le script ne soumet **aucune** étude ni import, annule la confirmation groupée et ne consomme pas le quota Packet.

## Observations vérifiées

- **PASS partiel S10** : tableau des études visible, aucune liste de lots en attente sur l'accueil ; modale initialement fermée.
- **PASS partiel S12** : « Commencer une nouvelle analyse » ouvre la modale ; les choix « Importer mes favoris » et « Analyser un lot seul » y sont accessibles ; fermeture possible.
- **PASS partiel S01/S05 local seulement** : le lien de retour `/?imported=<vente Interencheres>` ouvre la modale avec les lots **201 et 202** (favoris locaux préexistants), « Lancer l'analyse » ouvre une confirmation ; confirmation annulée, zéro POST `/studies` et aucun nouvel enregistrement.
- **Défaut observé hors périmètre du smoke (LOT-001 / PRICE-001)** : dans le tableau local, la marque et le modèle du **lot 202** sont vides, tandis que [sa fiche officielle](https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/261205000/piagetmontre-bracelet-de-forme-ronde-boitier-en/) l'identifie comme **PIAGET**. La sauvegarde locale du lot 202 contient `brand: null`, `model: null`, et la comparaison historique signale `Cannot read properties of null (reading 'trim')`. Le parseur `src/watch.mjs` attend un titre avec virgule et modèle ; « PIAGET » seul ne satisfait pas ce format. Le lot 201 possède une fiche sauvegardée, mais sa moyenne Chrono24 est indiquée « non vérifiable » (`Packet : résultats instables ou incomplets`). Ces montants ne doivent pas être présentés comme une comparaison vérifiée.

## Non vérifié — ne pas classer la QA complète PASS

- Installation/usage de l'extension **dans le même profil que la session Interencheres** et import réel depuis ce profil : profil du navigateur de QA non connecté.
- Analyse réelle S08/S09/S13 avec sources contrôlées : aucun nouveau POST envoyé, afin de ne pas modifier les études utilisateur ou consommer le quota Packet. Les études 201/202 observées avaient été créées avant ce smoke.
- Cas d'ordre seul et de favoris paginés : jeu de compte contrôlé absent.
- Vercel de production : sert encore une version antérieure du parcours ; non évalué pour cette révision.

**Correctif de code après ce smoke :** `src/watch.mjs` reconnaît maintenant la marque seule en tête de « PIAGET Montre bracelet… », sans inventer de modèle ; `src/prices.mjs` n'interroge plus les comparables quand le modèle manque, et `src/app-view.mjs` indique « modèle non indiqué ». Une relecture réseau de la fiche officielle du lot 202 avec le code modifié confirme `brand: PIAGET`, `model: null`, et aucune moyenne ni plafond inventés. Les anciens JSON sauvegardés **ne sont pas réécrits** : l'étude existante du lot 202 présente encore le défaut tant qu'elle n'est pas supprimée puis recréée volontairement.

**Conclusion :** smoke UI local partiellement réussi, QA complète non exécutée ; correctif du parseur et des comparaisons vérifié hors persistance, revalidation externe de l'étude 202 encore à faire.
