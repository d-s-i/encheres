Feature: LOT-001-F01 Identifier des montres à partir d'une vente Crédit Municipal de Paris
  Scenario: LOT-001-S01 Retrouver une montre depuis le lien de la vente
    Given la vente Montres de prestige du Crédit Municipal de Paris du 5 juin 2021 est accessible à https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/ventes-passees/210605000/
    When l'utilisateur demande le lot 318 de cette vente
    Then la fiche du lot 318 indique TAG HEUER, Carrera et la référence CV2010-3
    And la fiche du lot 318 indique un bracelet en caoutchouc et l'absence d'écrin
    And la fiche indique une adjudication de 1 500 € hors frais, distincte de l'estimation de 600 à 800 €
    And la fiche donne le lien de l'annonce du lot et permet de retrouver sa description d'origine

  Scenario: LOT-001-S02 Retrouver plusieurs montres sans mélanger leurs caractéristiques
    Given la vente Montres de prestige du Crédit Municipal de Paris du 5 juin 2021 est accessible à https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/ventes-passees/210605000/
    When l'utilisateur demande les lots 318 et 323 de cette vente
    Then deux fiches distinctes associent chacune son numéro de lot et son annonce d'origine
    And la fiche du lot 318 indique TAG HEUER, Carrera et la référence CV2010-3
    And la fiche du lot 318 indique un bracelet en caoutchouc et l'absence d'écrin
    And la fiche du lot 323 indique CHOPARD, Alfa Romeo et la référence 8954
    And la fiche du lot 323 indique un bracelet en caoutchouc et la présence d'un écrin et d'une surboîte

  Scenario: LOT-001-S03 Retrouver une montre depuis un catalogue PDF fourni
    Given l'utilisateur dispose d'un PDF lisible de la vente Montres de prestige du Crédit Municipal de Paris du 5 juin 2021 contenant le lot 318
    When l'utilisateur fournit ce PDF et demande le lot 318
    Then la fiche du lot 318 indique TAG HEUER, Carrera et la référence CV2010-3
    And la fiche du lot 318 indique un bracelet en caoutchouc et l'absence d'écrin
    And la fiche identifie le PDF fourni comme source de la description du lot

  Scenario: LOT-001-S04 Signaler un numéro de lot absent de la vente fournie
    Given la vente Montres de prestige du Crédit Municipal de Paris du 5 juin 2021 est accessible à https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/ventes-passees/210605000/
    When l'utilisateur demande le lot 99999 de cette vente
    Then le résultat indique qu'aucun lot 99999 n'a été trouvé dans cette vente
    And aucune fiche de montre ni caractéristique inventée n'est présentée pour le lot 99999

  Scenario: LOT-001-S05 Signaler que la source fournie est illisible
    Given l'utilisateur dispose d'un fichier PDF illisible comme document de vente
    When l'utilisateur fournit ce PDF et demande le lot 318
    Then le résultat indique qu'il est impossible de lire le PDF fourni
    And aucune fiche de montre ni caractéristique inventée n'est présentée pour le lot 318

  Scenario: LOT-001-S06 Ne pas inventer une référence de modèle absente
    Given la vente d'horlogerie Crédit Municipal de Paris du 20 juin 2026 est accessible à https://www.creditmunicipal.fr/en/ventes-aux-encheres/catalogue-des-ventes/ventes-passees/260620000/
    When l'utilisateur demande le lot 262 de cette vente
    Then la fiche du lot 262 indique OMEGA, Seamaster Professionnal et un bracelet en acier
    And la fiche indique la présence d'une boîte et que la référence de modèle n'est pas renseignée
    And la fiche donne le lien de l'annonce du lot et permet de retrouver sa description d'origine
