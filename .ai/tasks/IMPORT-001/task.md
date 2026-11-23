# IMPORT-001 — Importer les lots favoris Interencheres d’une vente dans l’application sans lancer d’étude

## Demande d’origine

L’utilisateur veut retrouver dans l’application les lots qu’il a mis en favoris sur le **site web** Interencheres pour une vente choisie, sans copier chaque lien à la main. Après essai du parcours actuel par raccourci de navigateur et copier-coller (implémenté mais jugé trop compliqué), il demande de le **remplacer par une extension Chromium** : choisir une vente et importer directement ses lots depuis le navigateur connecté, sans copier de code ni de données. Un exemple de page de vente connectée et de fiche de lot présent dans le filtre « Mes favoris et ordres » est désormais observable dans le navigateur de recherche ; l’accès et l’exhaustivité des favoris de la vente cible restent à confirmer. La présente demande est de **créer la tâche**, pas d’implémenter l’import.

## Objectif compris

Permettre à l’utilisateur connecté à Interencheres dans son propre navigateur de transférer les identifiants/liens de ses lots favoris appartenant à la vente sélectionnée vers l’application d’études de montres. Les lots importés doivent être consultables avant toute décision de lancer une étude ; l’import seul ne lance aucune recherche de prix.

## Acteur et interface

Utilisateur du site web Interencheres et de l’application d’études (locale ou éventuellement déployée). Aujourd’hui, l’application demande un lien de vente Crédit Municipal et un numéro de lot et ne contient ni liste de favoris ni intégration Interencheres.

## Périmètre proposé

- Extension Chromium installable localement sans publication au Chrome Web Store : depuis la page dédiée aux favoris du compte Interencheres, l’utilisateur choisit **uniquement une vente Crédit Municipal vérifiée** dans l’extension et déclenche l’import direct de ses lots favoris, sans raccourci `javascript:` ni copie-collage. La vente est rapprochée d’un catalogue Crédit Municipal publié par organisateur, date et intitulé ; les autres maisons ou une correspondance incertaine sont refusées.
- Vérification de l’appartenance des lots à cette vente, signalement des liens non reconnus et des doublons, aperçu des lots importables avant confirmation.
- L’accueil montre un bouton principal « Commencer une nouvelle analyse » ; son premier clic ouvre une fenêtre modale avec « Importer mes favoris » ou « Analyser un lot seul ». Le formulaire manuel, son chargement et son résultat restent dans cette modale jusqu'à la fin. Le tableau des études déjà sauvegardées reste visible en dessous lorsque la modale est fermée. Aucune carte ou liste permanente des favoris/« lots en attente » n’est présentée.
- L’import d’une vente Crédit Municipal ne déclenche pas de prix : l’extension ouvre ensuite l’application sur le lien public de retour de cette vente avec **la modale déjà affichée** ; seul son bouton « Lancer l’analyse » lance les études séquentielles après confirmation, avec indicateur animé, lot courant, temps écoulé et bilan dans cette modale (succès, doublons, échecs). L'extension indique aussi les étapes de lecture des favoris, vérification de la vente et envoi vers l'application, avec animation pendant l'attente. Les favoris importés restent stockés sans être affichés sur la page principale ; réimporter cette vente permet de relancer après interruption en ignorant les études déjà enregistrées. L’aide d’import reste secondaire, consultable après le choix d’import.
- Permettre de choisir ensuite les lots à étudier avec le flux existant, sans modifier les études enregistrées.

## Hors périmètre proposé

- Connexion du compte Interencheres côté serveur, collecte ou stockage d’identifiants, cookies ou jetons de session. Le transfert par l’extension ne doit transmettre que les données nécessaires aux lots de la vente choisie.
- Synchronisation permanente, accès via une API Interencheres non documentée, contournement de protections antibot.
- Recherches de prix déclenchées **au moment de l’import**, enchères ou actions sur le compte Interencheres. Les études groupées après confirmation sont dans le périmètre.

## Contraintes confirmées

- L’utilisateur utilise les favoris du **site web**, pas de l’application mobile.
- Il confirme le choix d’une **extension Chromium** pour éviter le raccourci de navigateur et le copier-coller. Le transfert reste déclenché par lui depuis son navigateur connecté, sans clé API supposée ni identifiants de compte transmis à l’application. L’extension doit être installable depuis le dossier du projet via `chrome://extensions` → Mode développeur → Charger l’extension non empaquetée, puis réactualisable après mise à jour du projet. Elle est installée par profil Chromium, indépendamment du déploiement Vercel.
- La vente Crédit Municipal de Paris « HORLOGERIE » du 05/12/2026 est bien publiée sur Interencheres : `https://www.interencheres.com/art-decoration/horlogerie-692045`. Sa fiche du lot 221 `https://www.interencheres.com/art-decoration/horlogerie-692045/lot-89799810.html` affiche le même numéro, la même montre TUDOR Prince Oysterdate et l’estimation 800–1 200 € que le catalogue Crédit Municipal `261205000`. L’utilisateur précise que le lot 221 de cette vente n’est **ni en favori ni sous ordre** dans son compte ; sa fiche publique ne doit pas servir de preuve d’un favori. Aucun favori de cette vente n’a été confirmé dans le navigateur.
- Exemple observé sur une vente de démonstration, distincte de la vente Crédit Municipal cible : `https://www.interencheres.com/art-decoration/belle-vente-de-noel-chez-cap-encheres-689953?segment=interests` affiche « Mes favoris et ordres (2) », les lots 1002 et 1003 ; la fiche du lot 1002 est `https://www.interencheres.com/art-decoration/belle-vente-de-noel-chez-cap-encheres-689953/lot-89387123.html`. Ce filtre mélange explicitement favoris **et ordres**. Toutefois, la page dédiée du compte `https://www.interencheres.com/compte/favoris/` affiche séparément « Favoris - Ventes à venir (3) » et « Enchères et ordres d'achat » dans le menu ; elle regroupe les lots favoris par vente (un lot 152 dans une vente « Horlogerie », lots 1002 et 1003 dans la vente de démonstration). C’est une source visible qui distingue les favoris des ordres ; la pagination avec un grand nombre de favoris n’a pas encore été observée.
- L’utilisateur confirme **favoris uniquement**, puis précise **ventes Crédit Municipal uniquement**. Il souhaite que l’import fonctionne **aussi sur Vercel** et accepte explicitement que les favoris importés y soient visibles par toute personne ayant l’URL. Il confirme le parcours « importer, puis lancer l’étude de tous les lots avec chargement » : aucune analyse sans ce second clic. L’application Vercel est actuellement publique ; cette tâche ne requiert pas de protection d’accès supplémentaire.

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
| Choisir la vente et importer directement via l’extension, sans recherches automatiques | AC-IMPORT-001-01 : retour d’import avec bouton d’analyse pour la seule vente choisie, sans étude créée ni copie-collage | IMPORT-001-S01 | QA-IMPORT-001-S01 |
| Favoris uniquement, pas les ordres seuls | AC-IMPORT-001-02 : ordre seul exclu | IMPORT-001-S02 | QA-IMPORT-001-S02 |
| Tous les favoris de la vente | AC-IMPORT-001-03 : toutes les pages accessibles couvertes, aucune complétude affirmée si une page manque | IMPORT-001-S03 | QA-IMPORT-001-S03 |
| Ne pas présenter des ordres non distinguables comme favoris | AC-IMPORT-001-04 : aucune importation non vérifiée, message explicite | IMPORT-001-S04 | QA-IMPORT-001-S04 |
| L’import peut être consulté publiquement sur Vercel | AC-IMPORT-001-05 : lien public de retour affichant le bouton, sans étude créée | IMPORT-001-S05 | QA-IMPORT-001-S05 |
| Installer l’extension localement sans boutique | AC-IMPORT-001-06 : extension chargée via l’interface Chromium et disponible sur la page Favoris | IMPORT-001-S06 | QA-IMPORT-001-S06 |
| Limiter l’import aux ventes Crédit Municipal vérifiées | AC-IMPORT-001-07 : les autres maisons ne sont ni proposées ni importées | IMPORT-001-S07 | QA-IMPORT-001-S07 |
| Étudier tous les lots après confirmation | AC-IMPORT-001-08 : études séquentielles, indicateur animé, lot courant et temps écoulé, distincts de l’import | IMPORT-001-S08 | QA-IMPORT-001-S08 |
| Ne pas écraser les doublons ni arrêter au premier échec | AC-IMPORT-001-09 : bilan des créations, doublons et échecs | IMPORT-001-S09 | QA-IMPORT-001-S09 |
| Un seul bouton principal et pas de lots en attente à l’accueil | AC-IMPORT-001-10 : action « Commencer une nouvelle analyse », modale fermée, tableau visible, aucun favori en attente affiché | IMPORT-001-S10 | QA-IMPORT-001-S10 |
| Retrouver les études sauvegardées sans affichage persistant des favoris | AC-IMPORT-001-11 : tableau visible, aucune carte de favoris ou bouton d’analyse hors lien de retour | IMPORT-001-S11 | QA-IMPORT-001-S11 |
| Choisir l’import ou l’analyse d’un seul lot | AC-IMPORT-001-12 : deux options dans la modale après clic principal, sans recherche automatique | IMPORT-001-S12 | QA-IMPORT-001-S12 |
| Étudier un lot manuellement dans la modale | AC-IMPORT-001-13 : chargement et résultat dans la modale, fiche sourcée accessible après succès | IMPORT-001-S13 | QA-IMPORT-001-S13 |

Décision humaine pour la QA : les favoris **201/202** de la vente Crédit Municipal et **1002/1003** de Cap Enchères sont observés dans le compte consultable ; les scénarios ont été adaptés à ces numéros. Le lot 203 « ordre seul » et la pagination sont des cas à préparer en **relecture contrôlée** sans créer d’ordre réel et sans les présenter comme des observations actuelles du site. Les études déjà sauvegardées de l’utilisateur ne servent pas d’instance QA isolée. Les erreurs d’environnement et les comportements produit sont séparés dans la procédure.

Validation de la version extension, du parcours groupé et de l’interface simplifiée : `parse-gherkin` et `check-gherkin-dry` exécutés (13 scénarios, alertes de proximité/synonymes revues, aucune répétition dans un scénario) ; `pnpm test` et `pnpm acceptance` vérifiés par le coder. La QA externe Chromium/Vercel n’a pas été exécutée.

## Prochain rôle suggéré

Prochaine étape : QA externe avec l’extension rechargée dans Chromium et la nouvelle application déployée. Confirmer que seules les ventes Crédit Municipal sont importées, que l’étude groupée n’est lancée qu’après confirmation et affiche le suivi/bilan, et que les paginations/chargements différés non reconnus ne sont jamais présentés comme un import complet. Ne jamais utiliser la liste mixte « favoris et ordres ».
