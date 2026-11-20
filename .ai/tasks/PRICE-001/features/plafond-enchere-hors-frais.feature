Feature: PRICE-001-F02 Afficher un prix à ne pas dépasser hors frais pour enchérir sur une montre
  Scenario: PRICE-001-S08 Calculer le plafond à partir de la moyenne Chrono24 et des frais de la vente ciblée
    Given le lot 268 TAG Heuer Monaco de la vente du 5 décembre 2026 est à venir
    And la moyenne partielle des prix demandés Chrono24 hors port est de 4 345 € sur 2 annonces françaises
    And le catalogue daté de la vente ciblée fixe 18 % TTC de frais acheteur et 1,2 % TTC de frais live sur l'adjudication
    When l'utilisateur demande l'analyse du lot 268 pour un achat en ligne
    Then le « prix à ne pas dépasser » est de 3 645,13 € hors frais Crédit Municipal
    And le résultat indique la moyenne Chrono24 partielle et les frais de la vente ciblée utilisés pour ce plafond
    And le coût estimé avec ces frais ne dépasse pas 4 345 €
    And les 3 700 € adjugés hors frais d'un autre lot en 2024 ne sont pas présentés comme le plafond

  Scenario: PRICE-001-S09 Arrondir le plafond vers le bas sans franchir la valeur de référence
    Given la moyenne partielle des prix demandés Chrono24 hors port est de 4 345 € sur 2 annonces françaises
    And le catalogue daté de la vente ciblée fixe 18 % TTC de frais acheteur et 1,2 % TTC de frais live sur l'adjudication
    When l'utilisateur demande le « prix à ne pas dépasser »
    Then le plafond affiché est 3 645,13 € hors frais
    And une enchère à 3 645,14 € dépasserait 4 345 € frais compris

  Scenario: PRICE-001-S10 Ne pas calculer de plafond avec les frais d'une autre vente
    Given la moyenne partielle des prix demandés Chrono24 hors port est de 4 345 € sur 2 annonces françaises
    And seuls les frais d'une ancienne vente comparable sont connus, pas ceux de la vente ciblée
    When l'utilisateur demande le « prix à ne pas dépasser »
    Then le plafond est indiqué comme indisponible faute de frais vérifiés pour la vente ciblée
    And aucun taux d'une vente ancienne n'est appliqué au lot étudié

  Scenario: PRICE-001-S11 Ne pas inventer de plafond sans moyenne d'annonces
    Given aucune annonce Chrono24 comparable de vendeur français n'est disponible après une recherche aboutie
    And les frais de la vente ciblée sont vérifiés
    When l'utilisateur demande le « prix à ne pas dépasser »
    Then le plafond est indiqué comme indisponible faute de moyenne Chrono24
    And aucune adjudication historique ni estimation de la montre ne remplace cette moyenne

  Scenario: PRICE-001-S15 Signaler qu'un plafond fondé sur les trois premières pages est indicatif
    Given la moyenne des trois annonces françaises vérifiées dans les trois premières pages est de 1 300 € hors port
    And la recherche compte 5 pages et 10 annonces, dont seulement 6 ont été analysées
    And la vente ciblée applique 18 % TTC de frais acheteur et 1,2 % TTC de frais live
    When l'utilisateur demande le « prix à ne pas dépasser »
    Then le plafond calculé est 1 090,60 € hors frais sur la base de l'échantillon
    And le résultat précise que des offres moins chères peuvent exister après la troisième page

  Scenario: PRICE-001-S12 Distinguer une recherche Chrono24 inaccessible d'un prix nul
    Given la recherche Chrono24 est inaccessible et ne permet pas de vérifier une moyenne
    And les frais de la vente ciblée sont vérifiés
    When l'utilisateur demande le « prix à ne pas dépasser »
    Then le plafond est indiqué comme non vérifiable faute d'accès à Chrono24
    And aucun montant de zéro euro n'est affiché comme plafond
