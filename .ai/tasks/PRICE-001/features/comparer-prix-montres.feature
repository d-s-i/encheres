Feature: PRICE-001-F01 Comparer les adjudications Crédit Municipal sur cinq ans aux annonces françaises Chrono24
  Background:
    Given une fiche de montre caractérisée par LOT-001 et une date d'analyse connue
    And les observations sont rattachées à des liens sources et à leur date de consultation

  Scenario: PRICE-001-S01 Retenir une adjudication comparable et ses frais historiques documentés
    Given le lot étudié est la TAG Heuer Carrera Calibre 16 CV2010-3 du 5 juin 2021
    And la date d'analyse est le 11 novembre 2026
    And le lot 288 Carrera CV2010-4 a été adjugé 1 900 € le 15 juin 2024 au Crédit Municipal
    And le catalogue daté de cette vente fixe 18 % TTC de frais acheteur sans majoration live pour les lots judiciaires
    When l'utilisateur demande la comparaison des prix du lot étudié
    Then le lot 288 apparaît comme comparable historique avec sa référence et son bracelet acier différents
    And le montant adjugé est indiqué comme 1 900 € hors frais et le coût en ligne hors transport comme 2 242 €
    And les liens de la fiche d'adjudication et du catalogue historique justifient ce calcul
    And l'adjudication du lot étudié du 5 juin 2021 ne compte pas dans la moyenne des cinq dernières années

  Scenario: PRICE-001-S02 Ne pas attribuer les frais de 2026 aux ventes antérieures
    Given une vente comparable de 2024 a des conditions contemporaines fixant 18 % TTC sans majoration live
    And les CGV du 24 avril 2026 fixent 18 % TTC plus 1,2 % TTC pour les achats live régis par elles
    When le coût d'achat en ligne de la vente 2024 est calculé
    Then seul le taux vérifié de cette vente de 2024 est utilisé
    And aucun supplément de 1,2 % tiré des CGV de 2026 n'est ajouté
    And les frais acheteur et les frais live ne sont pas comptés deux fois

  Scenario: PRICE-001-S03 Ne pas inventer un coût en ligne si les frais de vente historiques sont inconnus
    Given une adjudication comparable dans les cinq dernières années a un prix vérifié
    And aucune condition de frais applicable à sa vente n'a pu être vérifiée
    When la comparaison Crédit Municipal est calculée
    Then cette adjudication brute est affichée avec sa date et son lien
    And son coût d'achat en ligne est indiqué comme non vérifié
    And elle n'entre pas dans la moyenne des coûts d'achat en ligne vérifiés
    And le nombre de ventes retenues dans cette moyenne est indiqué

  Scenario: PRICE-001-S04 Calculer les trois annonces françaises les moins chères hors port
    Given les trois premières pages Chrono24 analysées incluent quatre annonces distinctes et disponibles de la même montre chez des vendeurs situés en France
    And leurs prix affichés hors port en euros sont 1 500 €, 1 650 €, 1 800 € et 2 300 €
    And les résultats contiennent aussi une montre d'un autre modèle, un accessoire, une annonce étrangère et un doublon
    When la comparaison Chrono24 est calculée
    Then seuls les trois prix d'annonces françaises comparables les plus bas de l'échantillon sont retenus
    And leur moyenne de prix affichés hors port est 1 650 € sur 3 annonces
    And chaque annonce retenue a son lien, son prix, son pays vendeur et ses différences pertinentes avec le lot
    And aucun de ces prix n'est présenté comme un prix de vente conclue

  Scenario: PRICE-001-S05 Afficher une moyenne partielle si une seule annonce française est vérifiée
    Given la recherche de Carrera CV2010-3 ne fournit aucune annonce française vérifiée
    And une recherche élargie au modèle Carrera Calibre 16 CV2010 fournit une seule annonce française vérifiée à 1 750 € hors port
    When la comparaison Chrono24 du lot 318 est calculée
    Then la moyenne est étiquetée « partielle : 1 annonce » et vaut 1 750 € hors port
    And la différence de référence, de bracelet et de contenu livré est indiquée
    And aucune annonce italienne à 1 690 € n'est incluse

  Scenario: PRICE-001-S06 Ne pas fabriquer de moyenne si aucun comparable n'est disponible
    Given aucune offre française Alfa Romeo 8954 ni adjudication Alfa Romeo dans les cinq dernières années n'a pu être vérifiée pour le lot 323
    When l'utilisateur demande la comparaison des prix du lot 323
    Then la moyenne Chrono24 et la moyenne du coût en ligne Crédit Municipal sont indiquées comme indisponibles avec un échantillon de zéro
    And les ventes Alfa Romeo de 2020 et du premier semestre 2021 ne sont pas utilisées pour remplir la fenêtre de cinq ans
    And une autre Chopard Mille Miglia sans correspondance Alfa Romeo n'est pas substituée

  Scenario: PRICE-001-S13 Limiter la recherche aux trois premières pages sans promettre un minimum mondial
    Given une recherche Panerai Luminor Marina triée par pertinence contient 5 pages et 10 annonces
    And les trois premières pages contiennent 6 annonces dont trois offres comparables de vendeurs français à 1 000 €, 1 300 € et 1 600 € hors port
    And une annonce française moins chère se trouve sur la quatrième page non analysée
    When la comparaison Chrono24 est calculée
    Then la moyenne de l'échantillon est 1 300 € sur 3 annonces françaises vérifiées
    And le résultat précise 3 pages et 6 annonces analysées sur 10 résultats, sans prétendre aux trois offres les moins chères de tout Chrono24
    And aucune fiche de la quatrième page n'est incluse

  Scenario: PRICE-001-S14 Ne pas confondre zéro offre dans l'échantillon avec zéro offre sur Chrono24
    Given les trois premières pages d'une recherche de 5 pages ne contiennent aucun vendeur français comparable
    And une annonce française comparable existe sur la quatrième page non analysée
    When la comparaison Chrono24 est calculée
    Then la moyenne est indisponible faute d'offre comparable dans l'échantillon des trois premières pages
    And le résultat ne prétend pas qu'aucune annonce française n'existe sur Chrono24

  Scenario: PRICE-001-S07 Signaler un accès empêché au lieu de prétendre qu'il n'y a aucune annonce
    Given la recherche Chrono24 est inaccessible à cause d'un défi de sécurité ou d'une erreur réseau
    When la comparaison Chrono24 est demandée
    Then la moyenne Chrono24 est indiquée comme non vérifiable pour cause d'accès
    And elle n'est pas présentée comme une moyenne sur zéro annonce
    And la recherche Crédit Municipal reste présentée séparément si elle a été vérifiée
