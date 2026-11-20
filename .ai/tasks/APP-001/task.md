# APP-001 — Étudier une montre par formulaire et retrouver son tableau sauvegardé

## Demande d'origine
L'utilisateur veut une application avec un chatbot où indiquer la vente et le numéro de lot, une conversation Pi orchestrant l'étude en arrière-plan, et un tableau sauvegardé par lot reproduisant le modèle de son classeur Google Sheets. Cette tâche est la troisième des trois demandées.

## Décisions humaines ultérieures (16/11/2026)
- La première version n'a **pas besoin de chat IA ni de conversation Pi en arrière-plan** : les traitements LOT-001 et PRICE-001 sont déterministes. L'entrée retenue est un **formulaire** avec **lien de la vente Crédit Municipal et numéro du lot** ; l'application recherche elle-même les frais authentifiés et les annonces comparables. Plusieurs lots dans une vente peuvent être étudiés séparément, sous réserve de préciser l'interface lors de la spécification.
- Le résultat recherché est le « prix à ne pas dépasser » **hors frais**, uniquement lorsque la moyenne Chrono24 vérifiée et les frais acheteur + live **de la vente cible** sont disponibles. Sans source vérifiable, ne pas afficher de plafond inventé.
- L'utilisateur confirme que le tableau peut montrer **la photo du lot étudié en haut**, puis **sous le tableau les photos de chaque comparable analysé** : adjudication historique ou annonce Chrono24, avec lien source et identité de la source. Les annonces ne sont pas des achats conclus ; si une photo n'est plus accessible, la fiche et son lien restent visibles sans photo. Cette disposition a été proposée puis approuvée par « ok super, spécifie APP-001 AVEC ça ».
- La demande historique de chat avec Pi et la possibilité de PDF en entrée ne sont pas des exigences de cette première version par formulaire ; le PDF seul ne permet pas aujourd'hui de rattacher automatiquement les frais de la vente cible.

## Objectif compris après ces décisions
Permettre de lancer une étude de montre à partir du lien de sa vente et de son numéro de lot, consulter le tableau sourcé accompagné des photos disponibles, puis retrouver ses analyses sauvegardées.

## Acteur et périmètre proposé
- Acteur : utilisateur qui examine plusieurs lots dans différentes ventes.
- Recevoir le lien de la vente et le numéro du lot dans un formulaire, vérifier les entrées, puis effectuer l'étude LOT-001 et PRICE-001 sans IA à l'exécution.
- Afficher pour chaque étude un tableau avec les données du lot, les comparaisons disponibles, leurs provenances et les données manquantes, selon la structure visible dans la capture fournie. Les colonnes visibles sont : vente et numéro de lot, marque, type, boîtes, bracelet, mise à prix, prix Chrono24 moyen, moyenne des ventes Crédit municipal, plusieurs colonnes de ventes historiques datées et observations. Le nombre et les dates des colonnes de ventes historiques dans la capture ne constituent pas une limite fixe pour de nouvelles analyses.
- Sauvegarder et permettre de retrouver les analyses de lots ; distinguer au minimum les ventes lorsque leurs numéros de lot coïncident.
- Montrer clairement les erreurs d'accès aux sources ou l'insuffisance de comparables plutôt qu'un tableau chiffré fictif.

## Hors périmètre proposé
- Définition des algorithmes de collecte et de comparaison (LOT-001 et PRICE-001).
- Synchronisation ou modification du classeur Google Sheets, sauf demande ultérieure ; il sert ici de modèle visuel et fonctionnel.
- Choix du framework, du stockage, de l'API Pi ou de l'hébergement lors de l'initialisation.

## Contraintes confirmées
- La demande initiale partait d'un prompt et citait Pi en arrière-plan ; cette préférence a été **remplacée** par l'entrée formulaire (lien de vente + numéro de lot), sans chat IA requis. Chaque lot étudié doit rester consultable.
- La capture de `~/Images/Screenshots/screenshot-2026-11-02_00-47-47.png` fournit la structure visuelle de référence ; elle montre des valeurs historiques datées et des observations libres. La capture est une référence de présentation, pas une preuve de l'origine ni de la nature des prix sous-jacents.
- L'utilisateur craint que le fichier `.xlsx` d'origine soit infecté ; ne pas l'ouvrir ou le télécharger pour cette tâche. La capture suffit à documenter les colonnes visibles.

## Hypothèses explicites
- « Comme le tableau » signifie reproduire les informations et leur organisation utiles dans l'application, pas écrire dans Google Sheets ; ce point n'a pas été confirmé.
- LOT-001 et PRICE-001 livreront des résultats exploitables par l'interface ; leurs détails ne sont pas définis ici.

## Questions non bloquantes
- La vue unique regroupant les lots, initialement non tranchée, est demandée explicitement dans la décision ultérieure sur la structure de l'Excel ci-dessous.
- L'utilisateur confirme qu'il n'y a pas de formules dans le classeur. La capture n'établit pas la provenance des valeurs ni le sens précis des couleurs ; ne pas les inventer.
- L'utilisateur confirme que le tableau doit présenter le coût d'un achat en ligne. Les CGV du Crédit Municipal de Paris datées du 24/04/2026 précisent 18 % TTC de frais acheteur sur l'adjudication et 1,2 % TTC supplémentaires via la plateforme live (soit 19,2 % au total en ligne). Le tableau doit distinguer adjudication, taux et coût en ligne frais compris ; vérifier les conditions des ventes historiques et éviter les frais comptés deux fois. Les frais de livraison ou stockage ne sont pas inclus sans indication spécifique.
- L'application est exclusivement destinée à l'étude de montres ; les autres types de lots sont hors périmètre. Exemple de vente fourni : https://www.creditmunicipal.fr/en/ventes-aux-encheres/catalogue-des-ventes/ventes-passees/260620000/.

## Questions d'architecture à traiter plus tard
- Définir l'interface et le stockage après approbation du comportement de sauvegarde ; ne pas imposer d'intégration à Pi pour cette première version.

## Décision humaine sur la sauvegarde (16/11/2026)
- « Non on bloque si l'analyse a déjà été faite, et on peut supprimer une ligne pour recommencer. » Une étude sauvegardée correspond à **une vente + un numéro de lot** ; une seconde analyse du même couple est refusée tant que la ligne existe. Supprimer cette ligne rend une nouvelle étude possible. L'affichage d'une étude sauvegardée reprend les résultats enregistrés sans refaire automatiquement une analyse, puisque le nouveau calcul passe par supprimer puis recommencer.

## Périmètre de la première version et hypothèses non critiques
- Le formulaire reçoit **un lot à la fois**, identifiable par son lien de vente et son numéro ; l'utilisateur peut répéter l'action pour d'autres lots. La vue globale des études sauvegardées affiche une ligne par lot avec accès à sa fiche détaillée et à sa suppression.
- Les chiffres des annonces Chrono24 sont des prix demandés ; seul le coût historique avec frais authentifiés et le plafond hors frais cible vérifié sont chiffrés. L'intitulé « mise à prix » de la capture ne doit pas transformer une **estimation** en mise à prix attestée.
- Seuls les comparables affichés dans l'étude sont accompagnés de photos : adjudications historiques retenues et annonces Chrono24 sélectionnées dans l'échantillon ; aucune promesse d'afficher les images des 150 annonces simplement inspectées. Si une photo disparaît, conserver le lien de la fiche et le résultat enregistré.
- Aucune synchronisation Google Sheets ni reproduction de ses couleurs/formules n'est exigée. Le mode de conservation/affichage technique des photos et du tableau reste un choix d'implémentation, sans exiger de les copier ou de les héberger.

## Critères d'acceptation et traçabilité

| Critère | Comportement observable | Gherkin → QA |
|---|---|---|
| AC-APP-F01-1 | Formulaire vente + lot ; fiche sourcée, tableau par lot, photo du lot, moyenne de prix demandés distincte des adjudications/coûts historiques, plafond hors frais vérifié et date d'analyse. | `APP-001-S01` → `QA-APP-001-S01` |
| AC-APP-F01-2 | Sous le tableau, photos et liens propres aux adjudications et annonces **retenues**, annonces distinctes des ventes conclues. | `APP-001-S02` → `QA-APP-001-S02` |
| AC-APP-F01-3 | Image manquante : repli explicite, sans perte du tableau ni de la fiche sourcée. | `APP-001-S03` → `QA-APP-001-S03` |
| AC-APP-F01-4 | Source Chrono24 inaccessible et frais historiques inconnus : étude partielle sauvegardée, coûts/moyenne/plafond non vérifiables, aucun chiffre fictif. | `APP-001-S04` → `QA-APP-001-S04` |
| AC-APP-F01-5 | Lot absent de la vente : message clair et aucune analyse sauvegardée. | `APP-001-S05` → `QA-APP-001-S05` |
| AC-APP-F01-6 | Plusieurs comparables historiques : chaque date, prix, lien et photo sont distincts ; seul un coût attesté entre dans la moyenne. | `APP-001-S11` → `QA-APP-001-S11` |
| AC-APP-F02-1 | Liste consultable après fermeture/réouverture ; instantané enregistré sans recalcul automatique. | `APP-001-S06` → `QA-APP-001-S06` |
| AC-APP-F02-2 | Un couple vente + lot déjà sauvegardé bloque une nouvelle analyse et conserve la ligne existante. | `APP-001-S07` → `QA-APP-001-S07` |
| AC-APP-F02-3 | Supprimer la ligne permet une nouvelle analyse du même couple sur des sources reconsultées. | `APP-001-S08` → `QA-APP-001-S08` |
| AC-APP-F02-4 | Deux ventes distinctes ayant le même numéro de lot conservent deux analyses et leurs sources distinctes. | `APP-001-S09` → `QA-APP-001-S09` |
| AC-APP-F02-5 | Supprimer une ligne ne supprime pas l'étude d'une autre vente portant le même numéro. | `APP-001-S10` → `QA-APP-001-S10` |
| AC-APP-F03-1 | Vue globale avec une ligne par lot, colonnes principales de la capture, colonnes historiques datées et liens directs vers chaque annonce Chrono24 retenue dans sa cellule de prix. | `APP-001-S12` → `QA-APP-001-S12` |
| AC-APP-F03-2 | Cellules et moyennes manquantes non inventées, aucun faux lien d'annonce ; frais historiques inconnus distincts de l'adjudication. | `APP-001-S13` → `QA-APP-001-S13` |
| AC-APP-F03-3 | À la largeur de la capture (1 357 px), pas de défilement horizontal ; quatre colonnes historiques au maximum dans la grille, autres ventes signalées et consultables sur la fiche. | `APP-001-S14` → `QA-APP-001-S14` |

**Slices :** `APP-001-F01` (formulaire, tableau et photos), `APP-001-F02` (sauvegarde, blocage et suppression), puis `APP-001-F03` (grille globale inspirée de l'image Excel). Gherkin : `features/analyser-lot-et-photos.feature`, `features/sauvegarder-et-recommencer.feature`, `features/tableau-global-excel.feature` ; QA : `qa/procedure.md`.

## Décision humaine ultérieure — structure Excel (16/11/2026)
- L'utilisateur demande que l'application **reprenne la structure de l'image** : vue globale de lots en lignes, colonnes vente/lot, marque, type, boîtes, bracelet, prix Chrono24 moyen, moyenne Crédit Municipal, ventes historiques datées, observations. La capture affiche aussi « mise à prix » : si la seule donnée connue est une estimation, la présenter comme **estimation**, pas comme mise à prix vérifiée. Les dates historiques varient selon les études ; ne pas figer les quatre dates visibles dans la capture. La fiche détaillée par lot et ses photos restent accessibles depuis chaque ligne. Ne pas inventer le sens des fonds bleus et gris.
- Précision humaine ultérieure : la grille doit tenir **sur la largeur d'une page écran, sans défilement horizontal**. La capture mesure 1 357 px de large. Pour préserver la lisibilité, montrer au plus les quatre dates historiques les plus récentes dans la grille ; si des ventes plus anciennes existent, indiquer les dates supplémentaires sur la ligne et conserver toutes leurs valeurs dans la fiche du lot. Les lignes peuvent défiler verticalement ; ce n'est pas une exigence de format d'impression.

## Décision humaine ultérieure — liens Chrono24 dans la grille
- La colonne du prix moyen Chrono24 affiche, dans **la même cellule**, les liens directs des annonces retenues pour calculer cette moyenne (au plus trois), sans lien pour une recherche vide ou bloquée. Les liens pointent vers les annonces, pas vers les images ni la page de recherche ; les fiches détaillées conservent les prix, états et photos. Les liens existants apparaissent également pour les études sauvegardées avant cette amélioration, sans recalculer leur moyenne.

## Questions non bloquantes restantes
- Souhaite-t-il plus tard saisir des observations manuelles, en plus des observations sourcées ? L'édition manuelle n'est pas requise ici.
