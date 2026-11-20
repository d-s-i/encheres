Feature: APP-001-F03 Reprendre la structure du tableau Excel pour toutes les études sauvegardées
  Scenario: APP-001-S12 Présenter les lots sauvegardés en lignes et les ventes historiques en colonnes datées
    Given deux études de montres sont sauvegardées pour les lots 268 et 343 de la vente du 5 décembre 2026
    And le lot 268 a des comparables historiques vendus le 15 juin 2024 et le 11 juin 2022
    And le lot 343 a un comparable historique vendu le 9 décembre 2023
    When l'utilisateur ouvre la grille des études
    Then un tableau présente une ligne par lot avec vente et numéro, marque, type, boîtes, bracelet, estimation, prix moyen Chrono24, moyenne des coûts Crédit Municipal et observations
    And les ventes historiques disposent de colonnes distinctes datées du 11 juin 2022, du 9 décembre 2023 et du 15 juin 2024
    And chaque valeur historique est associée à son lot et distingue adjudication hors frais et coût en ligne vérifié ou non vérifié
    And la cellule Chrono24 du lot 268 contient les liens directs des deux annonces retenues sans annonce non retenue
    And chaque ligne permet d'ouvrir la fiche avec ses photos et de supprimer uniquement cette étude

  Scenario: APP-001-S13 Ne pas remplir artificiellement une case historique ou un prix moyen indisponible
    Given une analyse sauvegardée du lot 323 Chopard Alfa Romeo ne contient ni adjudication historique admissible ni annonce française vérifiée
    And une autre analyse sauvegardée contient une adjudication historique datée avec frais inconnus
    When l'utilisateur ouvre la grille des études
    Then la ligne du lot 323 indique des moyennes indisponibles sans montant inventé
    And sa case dans la colonne de la vente historique de l'autre lot reste vide ou indique une absence de donnée
    And sa cellule Chrono24 sans annonce retenue ne contient aucun lien d'annonce
    And l'autre ligne affiche le montant adjugé hors frais mais aucun coût en ligne prétendu vérifié

  Scenario: APP-001-S14 Tenir la grille sur la largeur de la capture sans défilement horizontal
    Given plusieurs lots sauvegardés totalisent six dates distinctes de ventes historiques
    And l'écran a la largeur de 1 357 pixels de la capture Excel
    When l'utilisateur ouvre la grille des études
    Then la grille et la page restent visibles dans cette largeur sans défilement horizontal
    And au plus quatre dates historiques récentes occupent des colonnes dans la grille
    And les autres ventes restent accessibles dans la fiche détaillée du lot avec une indication de leur présence sur sa ligne
    And les textes trop longs de la grille sont abrégés sans modifier les chiffres enregistrés dans la fiche détaillée
