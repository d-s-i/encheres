# LOT-001 — Retrouver et caractériser une montre à partir d'un lot d'enchères Crédit municipal

## Demande d'origine
L'utilisateur souhaite indiquer dans une conversation quelle enchère Crédit municipal et quel numéro de lot étudier, afin de retrouver la montre et ses caractéristiques. Il demande de créer trois tâches correspondant aux trois étapes proposées.

## Objectif compris
Permettre à l'utilisateur d'obtenir une fiche de montre traçable à partir d'une vente identifiée et d'un numéro de lot, indépendamment des différences de libellés entre catalogues.

## Acteur et périmètre proposé
- Acteur : utilisateur qui analyse des lots de montres.
- Entrée proposée : lien ou identification non ambiguë de la vente, et numéro de lot ; la manière de formuler cette entrée reste ouverte.
- Retrouver un lot de montre dans une vente identifiée du Crédit Municipal de Paris et conserver son lien, son titre et sa description disponibles. Vente principale choisie pour les tests : https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/ventes-passees/210605000/ (Montres de prestige du 5 juin 2021, lots 318 et 323 accessibles). La vente du 20 juin 2026 initialement fournie reste une source complémentaire pour vérifier une référence absente : https://www.creditmunicipal.fr/en/ventes-aux-encheres/catalogue-des-ventes/ventes-passees/260620000/ (lot 262).
- Extraire les attributs explicitement attestés : marque, modèle/type, référence si présente, état, présence de boîte, matière du bracelet ; signaler les attributs non indiqués ou ambigus sans les inventer.
- Ne pas utiliser le seul numéro de lot comme identifiant universel d'une montre.
- Rendre exploitables les attributs et leur provenance pour PRICE-001.

## Hors périmètre proposé
- Bijoux et autres objets qui ne sont pas des montres.
- Calcul des prix et recherche Chrono24 (PRICE-001).
- Chat, affichage et sauvegarde des analyses (APP-001).
- Prise en charge garantie de tous les catalogues Crédit municipal sans exemplaires ni vérification d'accès.

## Contraintes confirmées
Les noms et numéros de lots diffèrent selon les ventes et les plateformes ; le rapprochement doit se fonder sur les caractéristiques de la montre. L'application demandée est exclusivement consacrée aux montres.

## Décisions humaines complémentaires
- L'utilisateur fournit soit un PDF de vente, soit le lien de la vente, puis un ou plusieurs numéros de lots ; après avoir identifié la vente du 5 juin 2021 correspondant à son tableau, il a choisi les lots 318 et 323 comme exemples principaux. Leurs annonces indiquent respectivement TAG HEUER Carrera, référence CV2010-3, adjudication 1 500 € hors frais, sans écrin ; et CHOPARD Alfa Romeo, référence 8954, adjudication 3 600 € hors frais, avec écrin et surboîte. La vente de 2021 sert uniquement à tester l'identification : elle ne modifie pas la période glissante de cinq ans définie pour PRICE-001.
- Le résultat prime sur une méthode particulière : privilégier les outils déterministes quand ils donnent les meilleurs résultats ; étudier et, au besoin, tester plusieurs méthodes plutôt qu'imposer une architecture dans la spécification.

## Hypothèses explicites
- Avant la livraison de l'application APP-001, la conversation Pi est l'interface publique permettant de soumettre une vente et ses lots et de consulter la réponse. C'est cohérent avec la demande initiale d'une conversation Pi, mais le mécanisme précis n'est pas imposé.
- « Référence » désigne la référence du modèle, et non le numéro de série du boîtier ; si elle n'est pas mentionnée, la fiche l'indique sans l'inventer.
- Le PDF utilisé pour les essais doit être lisible et contenir la description des lots attendus ; l'acceptation d'un PDF ne présuppose pas un format de catalogue unique.
- LOT-001 expose l'adjudication telle que publiée, explicitement hors frais ; la conversion en coût d'achat en ligne relève de PRICE-001.

## Questions non bloquantes
- Quelles restrictions d'accès s'appliquent aux catalogues et PDF des autres ventes ? Les annonces 318 et 323 de la vente exemple sont publiquement consultables, mais la couverture complète n'a pas été vérifiée.
- Les autres ventes auront-elles des PDF dont la structure exige un traitement particulier ? À étudier empiriquement avec des exemplaires supplémentaires.

## Critères d'acceptation et traçabilité
- AC-LOT-001-01 : avec le lien de la vente du 5 juin 2021 et le lot 318, la fiche montre l'identité et les caractéristiques attestées, l'annonce source et le prix d'adjudication hors frais distinct de l'estimation. Scénario LOT-001-S01 ; procédure QA-LOT-001-S01.
- AC-LOT-001-02 : les lots 318 et 323 de la même vente donnent des fiches distinctes sans échange des caractéristiques. Scénario LOT-001-S02 ; procédure QA-LOT-001-S02.
- AC-LOT-001-03 : avec un PDF lisible fourni par l'utilisateur, la fiche du lot 318 restitue les caractéristiques vérifiables et attribue la provenance au document fourni. Scénario LOT-001-S03 ; procédure QA-LOT-001-S03.
- AC-LOT-001-04 : un lot absent est signalé sans fiche inventée. Scénario LOT-001-S04 ; procédure QA-LOT-001-S04.
- AC-LOT-001-05 : un PDF illisible est signalé sans fiche inventée. Scénario LOT-001-S05 ; procédure QA-LOT-001-S05.
- AC-LOT-001-06 : une référence de modèle absente d'une annonce n'est pas inventée et n'est pas confondue avec le numéro de boîtier. Scénario LOT-001-S06 (lot 262 de la vente 2026) ; procédure QA-LOT-001-S06.

## Hors critères de LOT-001
- L'état de la montre peut être relevé s'il est explicitement décrit, mais aucun diagnostic de son fonctionnement ou de son état n'est requis par la demande humaine pour cette étape.
- Aucune exigence de performance chiffrée ou d'algorithme de reconnaissance n'a été donnée. Le choix des méthodes et les tests comparatifs relèvent de l'implémentation ; leurs résultats seront vérifiés contre les scénarios publics, sans transformer une préférence technique en critère d'acceptation.

## Livrables de spécification
- `.ai/tasks/LOT-001/features/identifier-montres.feature` (LOT-001-F01).
- `.ai/tasks/LOT-001/qa/procedure.md` (QA-LOT-001-S01 à QA-LOT-001-S06).
- Vérifications APS relancées après le changement des exemples : parse réussi et rapport DRY Gherkin relu (8 rapprochements consultatifs entre scénarios et valeurs différentes ; aucun doublon accidentel dans un scénario).

## Suite suggérée
Revue humaine des critères puis approbation explicite avant l'implémentation ; ne pas présumer de la disponibilité de toutes les ventes ni d'un taux de frais pour LOT-001.
