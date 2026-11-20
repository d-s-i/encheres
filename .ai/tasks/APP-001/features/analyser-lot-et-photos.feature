Feature: APP-001-F01 Analyser un lot de montre et présenter un tableau sourcé avec photos
  Scenario: APP-001-S01 Étudier une montre depuis le lien de vente et son numéro de lot
    Given la vente du 5 décembre 2026 contient le lot 268 TAG Heuer Monaco CAW2111
    And sa fiche, ses photos et les conditions datées de la vente sont consultables
    And deux annonces comparables de vendeurs français sont vérifiées à 4 100 € et 4 590 € hors port
    And une adjudication historique comparable de 2024 est vérifiée à 3 700 € hors frais avec 18 % de frais et aucune majoration live
    When l'utilisateur saisit le lien de cette vente et le numéro du lot indiqué dans le formulaire puis lance l'étude
    Then un tableau sauvegardé identifie la vente, le lot, la marque, le modèle, la boîte, le bracelet et l'estimation lorsqu'elle est publiée
    And la photo disponible du lot étudié apparaît au-dessus du tableau avec le lien de sa fiche source
    And le tableau distingue la moyenne partielle Chrono24 de 4 345 € sur 2 prix demandés hors port, l'adjudication historique de 3 700 € et son coût vérifié de 4 366 € avec la date et les liens sources
    And le prix à ne pas dépasser est de 3 645,13 € hors frais sur la base des taux vérifiés de la vente ciblée
    And la date d'analyse, les différences observées entre le lot et les comparables et la limite de couverture des annonces sont visibles

  Scenario: APP-001-S02 Montrer les photos des comparables effectivement présentés
    Given une analyse du lot 268 présente une adjudication historique et deux annonces Chrono24 comparables
    And la fiche de chaque comparable fournit au moins une photo accessible
    When l'utilisateur ouvre le tableau de cette analyse
    Then une fiche pour chacun de ces trois comparables apparaît sous le tableau avec ses photos accessibles et son lien source
    And la fiche historique indique sa date, son adjudication et ses frais vérifiés ou non vérifiés
    And les deux fiches Chrono24 indiquent des prix demandés hors port et ne sont pas présentées comme des ventes conclues
    And les annonces simplement inspectées mais non retenues ne sont pas présentées comme des comparables du tableau

  Scenario: APP-001-S03 Une image indisponible ne fait pas disparaître la fiche sourcée
    Given une étude sauvegardée possède une photo du lot et une photo pour chaque comparable présenté
    And la photo du lot et celle d'un comparable ne sont plus accessibles
    When l'utilisateur rouvre cette étude
    Then le tableau, les prix sauvegardés et les liens vers les fiches sources restent visibles
    And les deux emplacements concernés indiquent une image indisponible sans afficher une image d'un autre lot
    And les photos toujours accessibles des autres comparables restent visibles

  Scenario: APP-001-S04 Conserver un résultat partiel sans inventer les prix indisponibles
    Given la vente et le lot 268 sont vérifiables avec un comparable historique dont les frais sont inconnus
    And la source des annonces Chrono24 refuse l'accès au moment de l'analyse
    When l'utilisateur lance l'étude depuis le formulaire
    Then le tableau du lot est sauvegardé avec son adjudication historique brute et son coût en ligne non vérifié
    And la moyenne Chrono24 et le prix à ne pas dépasser sont indiqués comme non vérifiables faute d'accès
    And aucun zéro ou tarif supposé ne remplace ces montants indisponibles

  Scenario: APP-001-S05 Refuser un lot ou une vente introuvable sans créer d'étude fictive
    Given aucune étude n'existe pour une vente donnée et le numéro de lot 99999
    And ce lot n'est pas dans cette vente accessible
    When l'utilisateur saisit le lien de cette vente et le numéro du lot indiqué dans le formulaire puis lance l'étude
    Then l'application indique que le lot est introuvable dans cette vente
    And aucun tableau ni ligne sauvegardée n'est créé pour ce lot

  Scenario: APP-001-S11 Présenter plusieurs adjudications datées sans inventer leurs coûts
    Given le lot 318 Carrera de la vente du 5 juin 2021 est identifiable
    And deux comparables historiques sont adjugés à 1 650 € le 11 juin 2022 et 1 900 € le 15 juin 2024
    And seul le catalogue de la vente de 2024 vérifie un coût en ligne de 2 242 € pour son lot comparable
    When l'utilisateur étudie le lot 318 depuis le formulaire
    Then le tableau présente séparément les deux adjudications avec leur date, leur montant hors frais et leur lien source
    And le coût de 2022 est non vérifié tandis que le coût de 2024 est de 2 242 € frais compris
    And la moyenne des coûts en ligne vérifiés compte une seule vente et vaut 2 242 €
    And les fiches des deux ventes historiques et leurs photos accessibles apparaissent sous le tableau
