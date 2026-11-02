# Procédure QA — LOT-001

## Interface et environnement
L'agent QA opère par l'interface utilisateur de demande d'étude de lots (conversation Pi avant APP-001) et la fonction publique permettant de fournir un PDF. Il utilise un navigateur pour vérifier les annonces ; aucun accès aux fonctions internes ou au stockage n'est requis. Chaque cas démarre une nouvelle demande.

Vente principale : https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/ventes-passees/210605000/ (Montres de prestige, 5 juin 2021). Vérifier l'accès public à cette vente et aux deux annonces avant les cas S01 à S04 :
- Lot 318 : https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/ventes-passees/210605000/tag-heuer-carrera-montre-dhomme-ronde-en-acier-3/ ; TAG HEUER Carrera, référence CV2010-3, caoutchouc, sans écrin ni papiers ; adjugé 1 500 € hors frais, estimation 600 à 800 €.
- Lot 323 : https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/ventes-passees/210605000/chopard-alfa-romeo-montre-dhomme-en-acier-avec/ ; CHOPARD Alfa Romeo, référence 8954, bracelet caoutchouc, écrin et surboîte ; adjugé 3 600 € hors frais.

Pour S03, imprimer dans le navigateur en PDF la page du lot 318 ; vérifier visuellement que le numéro 318, le titre, la référence, le bracelet et « Sans écrin ni papiers » sont lisibles. La création de ce document de test est externe au produit. Le fournir comme « PDF de la vente » ; si le PDF produit est tronqué ou illisible, le corriger avant QA.

Statuts de chaque cas : PASS si tous les résultats attendus sont observés ; FAIL si l'entrée et ses sources sont valides mais que la réponse manque ou contredit un attendu ; ENVIRONMENT_ERROR si l'interface, la source distante ou le document de test prérequis est inaccessible indépendamment du produit ; NOT_RUN si le cas n'a pas été exécuté. Dans S05, la détection du PDF délibérément illisible est un comportement attendu, pas une erreur d'environnement.

# QA-LOT-001-S01 — Retrouver une montre depuis le lien de la vente

## Purpose
Vérifier LOT-001-F01 / LOT-001-S01 : identité, caractéristiques et distinction adjudication/estimation.

## Preconditions
Interface fonctionnelle et accès public à la vente du 5 juin 2021 et à l'annonce 318.

## Initial state
Nouvelle demande ; aucune vente ni lot présélectionné.

## Actions
1. Fournir le lien de la vente principale.
2. Demander le lot 318.
3. Ouvrir le lien d'annonce présenté par la fiche.

## Expected observations
- Fiche associée au 5 juin 2021 et au lot 318 : TAG HEUER Carrera, référence CV2010-3, bracelet caoutchouc, sans écrin.
- Adjudication 1 500 € hors frais, distincte de l'estimation 600 à 800 € ; 1 500 € n'est pas présenté comme coût d'achat en ligne.
- Le lien mène à l'annonce exacte du lot 318 et sa description y est consultable.

## Failure conditions
Lot, vente, identité, référence, bracelet, boîte, nature du prix ou source erronés ou manquants malgré un catalogue accessible.

## Cleanup
Terminer la demande ; LOT-001 n'exige aucune suppression de données persistées.

# QA-LOT-001-S02 — Retrouver deux montres sans les confondre

## Purpose
Vérifier LOT-001-F01 / LOT-001-S02 : séparation des caractéristiques et des sources de deux lots.

## Preconditions
Vente principale et annonces 318 et 323 consultables publiquement.

## Initial state
Nouvelle demande, aucun lot présélectionné.

## Actions
1. Fournir le lien de la vente principale.
2. Demander ensemble les lots 318 et 323.
3. Ouvrir les deux liens source rendus.

## Expected observations
- Exactement une fiche 318 et une fiche 323, toutes deux associées à la vente du 5 juin 2021.
- 318 : TAG HEUER Carrera, CV2010-3, bracelet caoutchouc, absence d'écrin.
- 323 : CHOPARD Alfa Romeo, 8954, bracelet caoutchouc, écrin et surboîte présents.
- Chaque lien mène à l'annonce du numéro correspondant ; les éléments de l'un n'apparaissent pas comme caractéristiques de l'autre.

## Failure conditions
Fiche manquante ou supplémentaire, inversion de numéros ou de sources, référence ou boîte attribuée au mauvais lot.

## Cleanup
Terminer la demande.

# QA-LOT-001-S03 — Retrouver le lot 318 depuis un PDF

## Purpose
Vérifier LOT-001-F01 / LOT-001-S03 : le PDF fourni est une source suffisante et identifiable.

## Preconditions
L'interface accepte un PDF. Le PDF préparé selon « Interface et environnement » contient effectivement les informations du lot 318 et peut être ouvert dans un lecteur PDF.

## Initial state
Nouvelle demande, sans lien de vente présélectionné.

## Actions
1. Fournir le PDF préparé via l'interface publique.
2. Demander le lot 318.
3. Examiner la fiche et l'indication de provenance.

## Expected observations
- La fiche indique TAG HEUER Carrera, CV2010-3, bracelet caoutchouc et absence d'écrin pour le lot 318.
- Le PDF fourni est identifiable comme source de la description ; aucun autre lot n'est substitué.

## Failure conditions
PDF valide rejeté, information du lot incorrecte, provenance absente ou source exclusivement externe présentée comme venant du PDF.

## Cleanup
Retirer le document de la conversation ou fermer la demande selon les possibilités publiques de l'interface ; ne pas exiger de purge interne.

# QA-LOT-001-S04 — Numéro de lot inexistant

## Purpose
Vérifier LOT-001-F01 / LOT-001-S04 : ne pas inventer un lot.

## Preconditions
La vente principale est accessible. Vérifier avec la recherche publique du catalogue que le lot 99999 n'y figure pas.

## Initial state
Nouvelle demande, aucun lot présélectionné.

## Actions
1. Fournir le lien de la vente principale.
2. Demander le lot 99999.

## Expected observations
- La réponse signale explicitement que le lot 99999 n'a pas été trouvé dans cette vente.
- Aucune fiche ni attribut de montre n'est inventé pour ce lot.

## Failure conditions
Lot emprunté à une autre vente, résultat inventé ou absence non signalée.

## Cleanup
Terminer la demande.

# QA-LOT-001-S05 — PDF volontairement illisible

## Purpose
Vérifier LOT-001-F01 / LOT-001-S05 : document invalide signalé sans fabrication d'une fiche.

## Preconditions
L'interface accepte un PDF. Préparer hors du produit un fichier `vente-illisible.pdf` dont le contenu est uniquement `Ceci n'est pas un document PDF`. Ce document est réservé au cas négatif.

## Initial state
Nouvelle demande, sans lien de vente présélectionné.

## Actions
1. Fournir `vente-illisible.pdf` comme PDF de vente.
2. Demander le lot 318.

## Expected observations
- L'interface ou la réponse indique que le document est invalide ou illisible.
- Aucune fiche n'est attribuée à ce document pour le lot 318.

## Failure conditions
Fiche présentée comme issue du faux PDF, ou rejet sans explication pour l'utilisateur.

## Cleanup
Retirer le document ou fermer la demande par l'interface publique.

# QA-LOT-001-S06 — Référence de modèle non indiquée

## Purpose
Vérifier LOT-001-F01 / LOT-001-S06 : une référence absente n'est pas déduite d'un numéro de boîtier.

## Preconditions
Accès public à la vente d'horlogerie du 20 juin 2026 : https://www.creditmunicipal.fr/en/ventes-aux-encheres/catalogue-des-ventes/ventes-passees/260620000/ . Le lot 262 est OMEGA Seamaster Professionnal, bracelet acier, boîte présente ; la description donne un numéro de boîtier mais aucune référence de modèle.

## Initial state
Nouvelle demande, aucun lot présélectionné.

## Actions
1. Fournir le lien de la vente du 20 juin 2026.
2. Demander le lot 262.
3. Ouvrir l'annonce source présentée.

## Expected observations
- La fiche 262 indique OMEGA Seamaster Professionnal, bracelet acier, boîte présente.
- La référence de modèle est explicitement non renseignée ; le numéro de boîtier 89415867 n'est pas présenté comme référence de modèle.
- Le lien source donne accès à la description de ce lot.

## Failure conditions
Référence inventée, numéro de boîtier substitué à la référence, boîte ou bracelet erroné, mauvais lien source.

## Cleanup
Terminer la demande.
