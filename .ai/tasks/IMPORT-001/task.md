# IMPORT-001 — Importer les lots favoris Interencheres d’une vente dans l’application sans lancer d’étude

## Demande d’origine

L’utilisateur veut retrouver dans l’application les lots qu’il a mis en favoris sur le **site web** Interencheres pour une vente choisie, sans copier chaque lien à la main. Après essai du parcours actuel par raccourci de navigateur et copier-coller (implémenté mais jugé trop compliqué), il demande de le **remplacer par une extension Chromium** : choisir une vente et importer directement ses lots depuis le navigateur connecté, sans copier de code ni de données. Un exemple de page de vente connectée et de fiche de lot présent dans le filtre « Mes favoris et ordres » est désormais observable dans le navigateur de recherche ; l’accès et l’exhaustivité des favoris de la vente cible restent à confirmer. La présente demande est de **créer la tâche**, pas d’implémenter l’import.

## Objectif compris

Permettre à l’utilisateur connecté à Interencheres dans son propre navigateur de transférer les identifiants/liens de ses lots favoris appartenant à la vente sélectionnée vers l’application d’études de montres. Les lots importés doivent être consultables avant toute décision de lancer une étude ; l’import seul ne lance aucune recherche de prix.

## Acteur et interface

Utilisateur du site web Interencheres et de l’application d’études (locale ou éventuellement déployée). Aujourd’hui, l’application demande un lien de vente Crédit Municipal et un numéro de lot et ne contient ni liste de favoris ni intégration Interencheres.

## Périmètre proposé

- Extension Chromium installable localement sans publication au Chrome Web Store : depuis la page dédiée aux favoris du compte Interencheres, l’utilisateur choisit une vente dans l’extension et déclenche l’import direct de ses **seuls lots favoris** dans l’application, sans raccourci `javascript:` ni copie-collage.
- Vérification de l’appartenance des lots à cette vente, signalement des liens non reconnus et des doublons, aperçu des lots importables avant confirmation.
- Présentation des lots importés séparément des études déjà réalisées, sans lancer automatiquement `studyLots`, Chrono24 ou Packet.
- Permettre de choisir ensuite les lots à étudier avec le flux existant, sans modifier les études enregistrées.

## Hors périmètre proposé

- Connexion du compte Interencheres côté serveur, collecte ou stockage d’identifiants, cookies ou jetons de session. Le transfert par l’extension ne doit transmettre que les données nécessaires aux lots de la vente choisie.
- Synchronisation permanente, accès via une API Interencheres non documentée, contournement de protections antibot.
- Recherches de prix automatiques, enchères ou actions sur le compte Interencheres.

## Contraintes confirmées

- L’utilisateur utilise les favoris du **site web**, pas de l’application mobile.
- Il confirme le choix d’une **extension Chromium** pour éviter le raccourci de navigateur et le copier-coller. Le transfert reste déclenché par lui depuis son navigateur connecté, sans clé API supposée ni identifiants de compte transmis à l’application. L’extension doit être installable depuis le dossier du projet via `chrome://extensions` → Mode développeur → Charger l’extension non empaquetée, puis réactualisable après mise à jour du projet. Elle est installée par profil Chromium, indépendamment du déploiement Vercel.
- La vente Crédit Municipal de Paris « HORLOGERIE » du 05/12/2026 est bien publiée sur Interencheres : `https://www.interencheres.com/art-decoration/horlogerie-692045`. Sa fiche du lot 221 `https://www.interencheres.com/art-decoration/horlogerie-692045/lot-89799810.html` affiche le même numéro, la même montre TUDOR Prince Oysterdate et l’estimation 800–1 200 € que le catalogue Crédit Municipal `261205000`. L’utilisateur précise que le lot 221 de cette vente n’est **ni en favori ni sous ordre** dans son compte ; sa fiche publique ne doit pas servir de preuve d’un favori. Aucun favori de cette vente n’a été confirmé dans le navigateur.
- Exemple observé sur une vente de démonstration, distincte de la vente Crédit Municipal cible : `https://www.interencheres.com/art-decoration/belle-vente-de-noel-chez-cap-encheres-689953?segment=interests` affiche « Mes favoris et ordres (2) », les lots 1002 et 1003 ; la fiche du lot 1002 est `https://www.interencheres.com/art-decoration/belle-vente-de-noel-chez-cap-encheres-689953/lot-89387123.html`. Ce filtre mélange explicitement favoris **et ordres**. Toutefois, la page dédiée du compte `https://www.interencheres.com/compte/favoris/` affiche séparément « Favoris - Ventes à venir (3) » et « Enchères et ordres d'achat » dans le menu ; elle regroupe les lots favoris par vente (un lot 152 dans une vente « Horlogerie », lots 1002 et 1003 dans la vente de démonstration). C’est une source visible qui distingue les favoris des ordres ; la pagination avec un grand nombre de favoris n’a pas encore été observée.
- L’utilisateur confirme **favoris uniquement**, et non les lots présents uniquement au titre d’un ordre d’achat. Il souhaite que l’import fonctionne **aussi sur Vercel** et accepte explicitement que les favoris importés y soient visibles par toute personne ayant l’URL. L’application Vercel est actuellement publique ; cette tâche ne requiert pas de protection d’accès supplémentaire.

## Hypothèses explicites (à valider)

- La page dédiée « Favoris » du compte distingue visiblement les favoris des ordres et groupe les lots par vente. La vente Crédit Municipal cible et son lot 221 sont rapprochés publiquement ; aucun favori de cette vente n’a été confirmé. L’exhaustivité sur plusieurs pages de favoris n’a **pas été vérifiée** : en cas de page non consultée, la spécification interdit d’affirmer que l’import est complet.
- Le transfert direct par extension est maintenant une décision utilisateur. Les permissions exactes et le mécanisme de communication avec l’application sont des questions de conception et de sécurité, pas une autorisation de transmettre la session. Aucun accès API officiel documenté aux favoris n’a été trouvé dans le centre d’aide Interencheres ni sur sa page partenaire.

## Questions ouvertes bloquantes

1. **Non bloquant pour la spécification, à vérifier avant d’affirmer un import complet en production :** comment la page dédiée des favoris présente-t-elle plusieurs pages/charges différées lorsque le compte en possède davantage ? Le scénario S03 impose une complétude vérifiable ou un avertissement d’import incomplet.
2. La vente cible et le lot 221 sont rapprochés publiquement, mais l’utilisateur confirme que le lot 221 n’est pas favori. Ne pas l’ajouter au compte pour les tests ; utiliser les favoris existants des autres ventes pour vérifier l’extraction.

## Question d’architecture (pour le rôle compétent)

Déterminer, après observation de la page réelle et de ses conditions d’utilisation, le mécanisme d’extraction utilisateur et le format d’import adaptés sans donner accès au compte Interencheres au serveur.

## Révision de la spécification — extension à la place du raccourci

Fichiers : `features/importer-favoris-vente.feature` et `qa/procedure.md`. La première version par raccourci navigateur et collage a été remplacée par une extension Chromium locale. Les handlers d’acceptation et les tests générés ont été adaptés au nouveau parcours ; ils simulent une page de favoris connectée et une pagination avec lien « suivant » mais **ne remplacent pas une QA dans le vrai navigateur ni un déploiement Vercel**. La pagination réelle d’un grand compte reste non vérifiée ; la liste importée ne revendique jamais la complétude.

| Exigence humaine | Critère d’acceptation provisoire | Scénario | QA |
| --- | --- | --- | --- |
| Choisir la vente et importer directement via l’extension, sans recherches automatiques | AC-IMPORT-001-01 : seuls les favoris de la vente choisie apparaissent, sans étude créée ni copie-collage | IMPORT-001-S01 | QA-IMPORT-001-S01 |
| Favoris uniquement, pas les ordres seuls | AC-IMPORT-001-02 : ordre seul exclu | IMPORT-001-S02 | QA-IMPORT-001-S02 |
| Tous les favoris de la vente | AC-IMPORT-001-03 : toutes les pages accessibles couvertes, aucune complétude affirmée si une page manque | IMPORT-001-S03 | QA-IMPORT-001-S03 |
| Ne pas présenter des ordres non distinguables comme favoris | AC-IMPORT-001-04 : aucune importation non vérifiée, message explicite | IMPORT-001-S04 | QA-IMPORT-001-S04 |
| Les favoris peuvent être visibles publiquement sur Vercel | AC-IMPORT-001-05 : visibles depuis l’URL publique, sans étude créée | IMPORT-001-S05 | QA-IMPORT-001-S05 |
| Installer l’extension localement sans boutique | AC-IMPORT-001-06 : extension chargée via l’interface Chromium et disponible sur la page Favoris | IMPORT-001-S06 | QA-IMPORT-001-S06 |

Hypothèse de QA : disposer d’un compte ou jeu de relecture autorisé démontrant des lots favoris, un lot suivi uniquement par un ordre **sans passer d’ordre réel pour la QA**, et une vente paginée. Aucun exemple personnel actuel ne prouve ces états ; les numéros des scénarios sont des oracles de contrôle, pas les favoris réellement observés. Les erreurs d’environnement et les comportements produit sont séparés dans la procédure.

Validation de la version extension : `parse-gherkin` et `check-gherkin-dry` exécutés (6 scénarios, 8 alertes de proximité/synonymes revues) ; `pnpm test` et `pnpm acceptance` vérifiés par le coder. La QA externe Chromium/Vercel n’a pas été exécutée.

## Prochain rôle suggéré

Prochaine étape : QA externe avec l’extension chargée dans Chromium et l’application Vercel déployée. Confirmer que l’import n’exige pas de copier-coller, que seules les données de la vente choisie partent vers l’application, et que les paginations/chargements différés non reconnus sont signalés sans annoncer une complétude fictive. Ne jamais utiliser la liste mixte « favoris et ordres ».
