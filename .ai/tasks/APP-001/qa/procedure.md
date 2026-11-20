# QA externe — APP-001 : tableau de montre sauvegardé, photos et suppression

## Interface publique et préflight commun

Exercer **l'application livrée** par ses formulaires, la liste des études sauvegardées et les tableaux consultables ; ne pas appeler de modules internes ni écrire directement dans le stockage. Le formulaire de la première version demande le **lien de vente Crédit Municipal et un numéro de lot**, sans chat ni clé Packet à saisir. Ouvrir et fermer l'application comme un utilisateur ; après chaque scénario, supprimer uniquement les lignes créées par la QA par l'action publique « supprimer ». Ne jamais enchérir ni effectuer d'achat.

Préparer **avant tout scénario** une instance de QA isolée et réinitialisable via ses actions publiques, une clé Packet configurée hors de l'interface si la recherche en a besoin, une horloge d'analyse contrôlée pour les oracles datés, et des **réponses HTTPS publiques contrôlées** (catalogue de vente, fiches de lots, PDF datés, pages et fiches d'annonces, images accessibles ou refusées). Une passerelle de replay de réponses publiques vers l'interface normale est acceptable ; une injection de résultats dans les fonctions, une écriture directe dans le stockage ou un endpoint de test interne ne l'est pas. Capturer un manifeste indépendant avec URL, statut HTTP, horodatage, empreinte, lots, prix, taux et identité de chaque image. Vérifier les oracles avant d'exécuter : lot 268 cible, vente future au 15/11/2026, catalogue cible 18 % + 1,2 % live ; lot historique 246 du 15/06/2024 adjugé 3 700 € avec 18 % sans live ; pour S11, lots historiques 368 du 11/06/2022 à 1 650 € (frais inconnus) et 288 du 15/06/2024 à 1 900 € (coût vérifié 2 242 €) ; deux fiches françaises 4 100 € et 4 590 € disponibles ; images propres à chaque fiche. Ne pas présenter ces prix contrôlés comme cours actuels. Préparer un second jeu de prix à 3 800 €, 3 899 € et 4 100 € (moyenne 3 933 €), le même catalogue cible et une date contrôlée ultérieure **mais avant le 05/12/2026** ; préparer deux ventes distinctes contenant chacune une montre portant le numéro 268 pour S09/S10. Prévoir les réponses images en erreur et le refus Packet pour les scénarios concernés. Si un oracle ou une route manque, **terminer la préparation** plutôt que classer la QA `ENVIRONMENT_ERROR`/`NOT_RUN`.

`PASS` : résultat visible conforme aux oracles ; `FAIL` : comportement produit contraire lorsque le préflight et les sources répondent ; `ENVIRONMENT_ERROR` : source, navigateur ou outil externe indisponible **après** préflight complet ; `NOT_RUN` : seulement après préparation complète et motif approuvé par l'humain. Enregistrer pour chaque scénario l'action publique, sorties/captures, requêtes image/source pertinentes, dates et liens ; un échec d'image attendu dans S03 est une condition de test, pas une erreur d'environnement. La disponibilité réelle des prix peut changer : ne contrôler les montants fixes qu'avec les réponses capturées et vérifiées ; sur le site réel, relever les prix courants et calculer l'oracle à partir des annonces effectivement admissibles.

## QA-APP-001-S01 — Étudier et afficher la fiche complète

**Gherkin :** `APP-001-F01` / `APP-001-S01` ; **critère :** `AC-APP-F01-1`.

### Purpose
Vérifier l'entrée à deux champs, la fiche de lot, la séparation prix demandés/adjudications/coûts/plafond et la photo principale.
### Preconditions
Jeu cible 268 et oracles documentés par le préflight, horloge au 15/11/2026, aucune ligne sauvegardée pour cette vente/lot.
### Initial state
Application ouverte sur le formulaire vide et liste sans ce lot.
### Actions
1. Saisir l'URL de la vente du 05/12/2026 et le lot `268`, lancer l'étude.
2. Ouvrir le tableau créé, comparer indépendamment ses champs, sources et photo à la capture officielle, puis revenir à la liste.
### Expected observations
Une ligne sauvegardée ; tableau identifiant vente, lot, marque, modèle, boîte, bracelet et estimation si publiée, photo du **lot 268** au-dessus ; date d'analyse 15/11/2026, différences de référence/boîte/bracelet observées sans inventer l'état du lot ; adjudication 3 700 € le 15/06/2024, coût attesté 4 366 € avec source des frais ; moyenne **partielle** de prix demandés 4 345 € / 2 annonces françaises hors port, taille et limite de l'échantillon ; plafond hors frais **3 645,13 €** avec provenance des frais de la vente cible. L'estimation ne se transforme pas en adjudication ou en « mise à prix » non attestée.
### Failure conditions
Photo d'un autre lot, source omise, moyenne présentée comme ventes conclues ou marché entier, coût 2024 à 19,2 %, plafond déduit de 3 700 €, tableau absent ou non sauvegardé.
### Cleanup
Supprimer la ligne créée via l'application.

## QA-APP-001-S02 — Photos des comparables affichés

**Gherkin :** `APP-001-F01` / `APP-001-S02` ; **critère :** `AC-APP-F01-2`.

### Purpose
Vérifier l'association des images et des liens à chacun des trois comparables affichés, sans les attribuer à une vente réalisée pour Chrono24.
### Preconditions
Jeu S01 avec une ou plusieurs images accessibles pour chacun du lot 246 et des deux annonces ; au moins une annonce inspectée non retenue dispose d'une image distincte.
### Initial state
Analyse du lot 268 sauvegardée ; aucune photo cachée par un refus HTTP.
### Actions
1. Ouvrir son tableau par la ligne sauvegardée et parcourir la zone située **sous** le tableau.
2. Comparer chaque photo et son lien à la fiche publique correspondante ; compter les fiches visibles.
### Expected observations
Trois fiches de comparables : une adjudication datée avec son prix brut, coût/taux connus ou mention non vérifié, deux **annonces** avec prix demandés hors port. Chacune a ses images accessibles et le lien de **sa propre** source ; les images d'annonces non retenues ne sont pas attribuées aux comparables.
### Failure conditions
Photo permutée, fiche ou lien absent, annonce étiquetée « achat conclu », image d'une annonce simplement inspectée affichée comme comparable sélectionné.
### Cleanup
Supprimer l'étude de QA.

## QA-APP-001-S03 — Images disparues après la sauvegarde

**Gherkin :** `APP-001-F01` / `APP-001-S03` ; **critère :** `AC-APP-F01-3`.

### Purpose
Vérifier le repli lorsque la photo du lot et une photo de comparable cessent d'être accessibles.
### Preconditions
Captures et liens déjà vérifiés au préflight ; la passerelle répond normalement puis refuse **uniquement** les deux URL d'images désignées ; les fiches et les autres images restent accessibles.
### Initial state
Étude déjà enregistrée avec toutes les photos accessibles ; application fermée.
### Actions
1. Rendre les deux images inaccessibles par la réponse contrôlée ; rouvrir l'application et cette étude via la liste.
2. Observer les emplacements d'images, les montants enregistrés et les liens source.
### Expected observations
Mention image indisponible aux deux emplacements, aucune image substituée ; tableau, prix enregistrés et fiches/liens restent consultables, autres images affichées.
### Failure conditions
Tableau disparu ou recalculé, lien source absent, image d'un autre lot affichée, disparition des autres photos.
### Cleanup
Rétablir les réponses images et supprimer l'étude via l'application.

## QA-APP-001-S04 — Comparaison partielle lors d'un refus Packet

**Gherkin :** `APP-001-F01` / `APP-001-S04` ; **critère :** `AC-APP-F01-4`.

### Purpose
Ne pas inventer une moyenne ni un plafond lorsqu'une source d'annonces est inaccessible.
### Preconditions
Vente et lot vérifiables ; comparable historique à adjudication brute vérifiée mais frais historiques inconnus ; Packet répond par erreur d'accès contrôlée.
### Initial state
Aucune analyse de cette vente/lot dans la liste.
### Actions
1. Soumettre lien de vente et lot dans le formulaire ; consulter le tableau et la ligne créée.
### Expected observations
Ligne sauvegardée et lot décrit ; comparable historique brut avec date et lien, coût en ligne « non vérifié », moyenne Chrono24 et plafond « non vérifiables : accès empêché » ; aucun montant 0 ou frais imaginé.
### Failure conditions
Tableau vide inventé, taux courant appliqué à l'historique, plafond chiffré, résultat partiel perdu.
### Cleanup
Rétablir Packet ; supprimer la ligne.

## QA-APP-001-S05 — Numéro de lot absent

**Gherkin :** `APP-001-F01` / `APP-001-S05` ; **critère :** `AC-APP-F01-5`.

### Purpose
Vérifier que seul un lot identifié est sauvegardé.
### Preconditions
Vente accessible et vérification indépendante de l'absence du lot `99999` dans toutes ses pages ; liste de QA propre.
### Initial state
Formulaire ouvert, aucun résultat associé à ce numéro.
### Actions
1. Soumettre le lien de la vente et `99999` ; inspecter la liste des analyses.
### Expected observations
« Lot introuvable dans cette vente » ; aucune ligne ni photo/tableau pour `99999`.
### Failure conditions
Ligne créée, fiche inventée ou lot d'une autre vente substitué.
### Cleanup
Aucune ligne attendue ; si la QA détecte une ligne fautive, conserver la preuve puis la supprimer via l'application.

## QA-APP-001-S11 — Plusieurs ventes historiques datées

**Gherkin :** `APP-001-F01` / `APP-001-S11` ; **critère :** `AC-APP-F01-6`.

### Purpose
Vérifier que la grille accepte plusieurs ventes datées sans appliquer de frais non authentifiés à l'une d'elles.
### Preconditions
Vente du 05/06/2021 lot 318 accessible ; adjudications contrôlées : lot 368 du 11/06/2022 à 1 650 € sans frais historiques vérifiés, lot 288 du 15/06/2024 à 1 900 € et catalogue daté attestant 18 % acheteur sans live ; au moins une photo accessible de chaque comparable.
### Initial state
Aucune ligne sauvegardée pour cette vente/lot ; horloge d'analyse fixée au 11/11/2026.
### Actions
1. Entrer la vente du 05/06/2021 et le lot `318` dans le formulaire, lancer et ouvrir son tableau.
2. Comparer les deux lignes historiques, la moyenne et les fiches avec leurs annonces et photos capturées indépendamment.
### Expected observations
Deux adjudications séparées avec dates, liens et prix hors frais exacts ; coût 2022 « non vérifié », coût 2024 2 242 € avec frais documentés ; **moyenne des coûts en ligne vérifiés 2 242 € / 1 vente**, sans application du taux live 2026 à 2022 ni 2024 ; deux fiches historiques sous le tableau, avec leurs photos accessibles.
### Failure conditions
Une vente manquante, colonnes de dates fixes qui écrasent une vente, coût historique fabriqué, moyenne calculée sur deux ventes ou image d'une autre vente attribuée au comparable.
### Cleanup
Supprimer la ligne de QA via la liste publique.

## QA-APP-001-S06 — Réouverture d'une analyse figée

**Gherkin :** `APP-001-F02` / `APP-001-S06` ; **critère :** `AC-APP-F02-1`.

### Purpose
Prouver la persistance après fermeture et l'absence de recalcul lors de la consultation.
### Preconditions
Jeux de réponses anciennes/nouvelles vérifiés, horloge fixe au 15/11/2026 pour l'étude, puis date ultérieure ; application relançable sans effacer les études.
### Initial state
Une seule ligne vente cible/lot 268 sauvegardée avec moyenne 4 345 € et ses sources.
### Actions
1. Modifier le jeu de réponses externes vers les nouveaux prix ; fermer puis rouvrir l'application et la ligne du lot 268.
### Expected observations
Même date d'analyse 15/11/2026, moyenne **4 345 €**, liens et autres résultats sauvegardés ; pas de seconde ligne ni de nouvelle moyenne calculée lors de l'ouverture.
### Failure conditions
Étude disparue à la réouverture ou moyenne modifiée à partir des nouveaux prix.
### Cleanup
Supprimer la ligne via l'application.

## QA-APP-001-S07 — Étude déjà existante bloquée

**Gherkin :** `APP-001-F02` / `APP-001-S07` ; **critère :** `AC-APP-F02-2`.

### Purpose
Bloquer une deuxième analyse du même couple vente/lot sans remplacer la première.
### Preconditions
Étude existante à 4 345 €, nouveau jeu externe à 3 933 € disponible.
### Initial state
Une ligne vente du 05/12/2026 + lot 268 enregistrée, datée du 15/11/2026.
### Actions
1. Ressaisir le même lien de vente et `268` dans le formulaire ; demander une étude, puis consulter la ligne existante.
### Expected observations
Message de doublon avec accès à l'étude existante ; une seule ligne pour le couple, date et moyenne de **4 345 €** inchangées ; pas de nouvelle étude.
### Failure conditions
Deux lignes, écrasement par 3 933 €, nouvelle date affichée comme date de l'analyse existante.
### Cleanup
Supprimer la ligne d'essai via l'application.

## QA-APP-001-S08 — Supprimer et recommencer

**Gherkin :** `APP-001-F02` / `APP-001-S08` ; **critère :** `AC-APP-F02-3`.

### Purpose
Faire de la suppression le seul moyen de refaire volontairement l'étude du même lot.
### Preconditions
Étude ancienne 4 345 € enregistrée ; jeu externe nouveau vérifié 3 800/3 899/4 100 € FR, moyenne 3 933 €, catalogue cible 18 %+1,2 % ; date d'analyse ultérieure avant la vente cible.
### Initial state
Une ligne ancienne pour vente cible + lot 268 ; autres lignes de QA absentes.
### Actions
1. Supprimer la ligne ancienne par l'action visible dans la liste ; constater qu'elle ne s'ouvre plus.
2. Ressaisir lien et `268`, relancer l'étude et inspecter la nouvelle ligne et ses sources.
### Expected observations
Une seule **nouvelle** ligne pour ce couple ; moyenne **3 933 €**, plafond **3 299,49 € hors frais**, date et liens du second jeu ; aucun chiffre de l'ancienne étude réutilisé. Après fermeture/réouverture la nouvelle ligne reste consultable.
### Failure conditions
Ancienne étude encore accessible, doublon malgré suppression, nouveau résultat contenant 4 345 €, plafond incorrect.
### Cleanup
Supprimer la nouvelle ligne via l'application.

## QA-APP-001-S09 — Même numéro dans deux ventes

**Gherkin :** `APP-001-F02` / `APP-001-S09` ; **critère :** `AC-APP-F02-4`.

### Purpose
Vérifier que le numéro seul n'est pas l'identifiant de sauvegarde.
### Preconditions
Deux ventes distinctes de montres préparées avec une fiche de lot `268` et des images/liens distincts ; toutes les sources attendues vérifiées indépendamment.
### Initial state
Aucune étude de ces deux ventes dans l'application.
### Actions
1. Étudier le lot `268` dans chaque vente par le formulaire ; ouvrir successivement les deux lignes de la liste.
### Expected observations
Deux lignes identifiées par vente et numéro ; chaque ligne ouvre **son** tableau, ses photos et liens de vente, sans mélanger les données.
### Failure conditions
Seconde vente bloquée comme doublon, fusion de lignes ou sources/photos croisées.
### Cleanup
Supprimer les deux lignes par la liste publique.

## QA-APP-001-S12 — Grille de lots et colonnes historiques datées

**Gherkin :** `APP-001-F03` / `APP-001-S12` ; **critère :** `AC-APP-F03-1`.

### Purpose
Comparer la structure de la vue globale aux colonnes visibles de la capture Excel, sans reprendre ses taux ni inventer le sens des couleurs.
### Preconditions
Deux ventes/analyses contrôlées pour les lots 268 et 343 du 05/12/2026 ; deux annonces françaises retenues pour la moyenne Chrono24 du lot 268 avec URL de fiches vérifiées, et au moins une annonce inspectée non retenue ; comparables historiques datés du 11/06/2022, 09/12/2023 et 15/06/2024 avec fiches, frais connus ou inconnus vérifiés indépendamment, images associées aux bons lots.
### Initial state
Aucune ligne de QA ; créer les deux études par le formulaire public.
### Actions
1. Ouvrir la page principale et relever en-têtes et lignes de la grille.
2. Vérifier séparément la date, l'adjudication hors frais, les frais documentés et la source de chaque cellule historique ; cliquer sur chaque ligne pour voir ses propres photos, puis constater la présence d'un bouton de suppression par ligne.
### Expected observations
Une ligne pour le lot 268 et une pour le 343 ; colonnes vente/lot, marque, type, boîte, bracelet, **estimation** (ne pas affirmer qu'il s'agit d'une mise à prix vérifiée), moyenne des prix demandés Chrono24, moyenne des coûts en ligne Crédit Municipal, observations, trois colonnes portant chacune la date constatée. Chaque cellule historique est attachée au bon lot, avec adjudication hors frais et coût vérifié ou indication « non vérifié ». La cellule Chrono24 du lot 268 affiche les **deux liens directs** vers ses annonces effectivement retenues, ni la recherche générale ni une annonce exclue ; ces liens et ceux des lignes ouvrent les fiches correspondantes. La fiche détaillée conserve photos et provenance ; aucune coloration n'est utilisée comme preuve d'une catégorie sans sens documenté.
### Failure conditions
Liste à puces au lieu d'une grille de lots, dates historiques figées ou ventes mélangées, estimation présentée comme mise à prix attestée, frais inventés, lien d'annonce Chrono24 absent ou erroné, lien/photo d'un autre lot, bouton supprimant plusieurs lignes.
### Cleanup
Supprimer les deux lignes créées via leurs boutons dans la grille.

## QA-APP-001-S13 — Cellules et moyennes absentes

**Gherkin :** `APP-001-F03` / `APP-001-S13` ; **critère :** `AC-APP-F03-2`.

### Purpose
Vérifier que l'alignement de la grille ne transforme pas une valeur manquante en prix fictif.
### Preconditions
Jeu contrôlé avec lot 323 Chopard Alfa Romeo sans comparable historique ni annonce française admissible ; autre lot ayant une adjudication datée de vente historique sans conditions de frais vérifiées.
### Initial state
Deux études créées par le formulaire, leurs sources indépendamment vérifiées et une unique date historique issue de l'autre lot.
### Actions
1. Ouvrir la grille et comparer la colonne historique et les deux moyennes sur chaque ligne.
### Expected observations
Lot 323 : deux moyennes « indisponible », **aucun lien d'annonce dans sa cellule Chrono24** et cellule datée vide/« — » ; autre lot : adjudication brute hors frais, coût en ligne « non vérifié » et aucune moyenne de coût fabriquée.
### Failure conditions
Zéro présenté comme prix vérifié, adjudication de l'autre lot reportée sur la ligne 323, taux d'une autre vente appliqué au coût inconnu.
### Cleanup
Supprimer les deux études de QA par l'interface publique.

## QA-APP-001-S14 — Grille sur une largeur d'écran sans défilement horizontal

**Gherkin :** `APP-001-F03` / `APP-001-S14` ; **critère :** `AC-APP-F03-3`.

### Purpose
Confirmer que la grille inspirée de la capture Excel tient sur une page écran de même largeur, même si les ventes historiques ont plus de quatre dates.
### Preconditions
Capture de référence vérifiée à **1 357 × 698 px** ; navigateur public réglé à 1 357 px de large, zoom 100 %. Captures/réponses publiques contrôlées de lots présentant au total six dates historiques distinctes, dont deux dates anciennes propres à l'un des lots ; manifeste contenant chiffres complets, dates et liens des six ventes. Préparer une observation et une adresse source assez longues pour éprouver la troncature.
### Initial state
Études sauvegardées et visibles dans la grille ; aucune route ni fixture manquante au préflight.
### Actions
1. Ouvrir l'application en navigateur à 1 357 px de large et consulter la grille sans zoomer ni modifier la feuille de style.
2. Mesurer la largeur visible de la page et de la grille par les propriétés publiques du navigateur ou constater visuellement si un balayage horizontal est nécessaire ; compter les dates affichées.
3. Ouvrir la fiche d'un lot ayant une date non affichée et vérifier sa vente, son montant complet et son lien source.
### Expected observations
Aucun défilement horizontal de la page ou du tableau à cette largeur ; **au plus quatre** colonnes datées, correspondant aux quatre dates historiques les plus récentes ; les dates supplémentaires sont annoncées sur la ligne du lot concerné. Les valeurs complètes des ventes masquées et les observations longues restent disponibles sur la fiche, sans chiffre altéré par la version condensée.
### Failure conditions
Défilement horizontal, colonne trop étroite qui recouvre une autre cellule, dates omises sans indication, montant historique ou observation perdus dans la fiche détaillée.
### Cleanup
Supprimer les lignes de QA via leurs boutons.

## QA-APP-001-S10 — Suppression isolée

**Gherkin :** `APP-001-F02` / `APP-001-S10` ; **critère :** `AC-APP-F02-5`.

### Purpose
Prouver qu'une suppression ne détruit pas l'autre étude ayant le même numéro.
### Preconditions
Mêmes deux ventes vérifiées que S09 ; réponse photos toujours accessible.
### Initial state
Deux lignes de lot `268` pour deux ventes distinctes, toutes deux enregistrées.
### Actions
1. Supprimer la ligne de la première vente dans la liste ; rouvrir la seconde, puis fermer/relancer l'application et y retourner.
### Expected observations
Seule la ligne de la première vente a disparu ; le tableau et les photos de la seconde restent accessibles après relance.
### Failure conditions
Les deux lignes disparaissent ou les données de la seconde sont altérées.
### Cleanup
Supprimer la seconde ligne par la liste.
