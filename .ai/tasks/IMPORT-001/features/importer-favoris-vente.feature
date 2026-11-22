Feature: IMPORT-001-F01 Importer uniquement les lots favoris d'une vente Interencheres dans l'application
  Scenario: IMPORT-001-S01 Retrouver les favoris de la vente choisie sans lancer d'étude
    Given l'utilisateur est connecté sur le site Interencheres et a mis en favoris les lots 1002 et 1003 de la vente A
    And la vente B contient aussi un lot 1002 mis en favori
    When l'utilisateur importe les favoris de la vente A dans l'application
    Then l'application présente les lots 1002 et 1003 rattachés à la vente A
    And elle ne présente pas le lot 1002 de la vente B parmi les favoris importés de la vente A
    And aucune étude de prix n'est lancée par cet import

  Scenario: IMPORT-001-S02 Exclure un lot suivi uniquement par un ordre d'achat
    Given la vente A affiche le lot 1002 mis en favori et le lot 1004 suivi uniquement par un ordre d'achat
    When l'utilisateur importe les favoris de la vente A dans l'application
    Then le lot 1002 apparaît parmi les favoris importés de la vente A
    And le lot 1004 n'apparaît pas parmi les favoris importés de la vente A

  Scenario: IMPORT-001-S03 Importer aussi les favoris des pages suivantes
    Given les favoris de la vente A sont répartis sur plusieurs pages du site Interencheres
    And le lot 1002 est sur la première page et le lot 1003 sur une page suivante
    When l'utilisateur importe les favoris de la vente A dans l'application
    Then les lots 1002 et 1003 apparaissent parmi les favoris importés de la vente A
    And l'application n'annonce pas un import complet si une page de favoris n'a pas été consultée

  Scenario: IMPORT-001-S04 Refuser de présenter un ordre ou un lot non vérifié comme favori
    Given la source de la vente A ne permet pas de distinguer un favori d'un lot suivi seulement par un ordre
    When l'utilisateur importe les favoris de la vente A dans l'application
    Then l'application n'ajoute aucun lot non identifié comme favori
    And elle indique que la liste des favoris de cette vente n'a pas pu être vérifiée

  Scenario: IMPORT-001-S05 Consulter les favoris importés sur l'application Vercel
    Given les lots 1002 et 1003 de la vente A ont été importés dans l'application Vercel
    When une autre personne ouvre l'application Vercel avec son adresse publique
    Then elle peut voir les favoris importés 1002 et 1003 de la vente A
    And elle ne voit aucune étude de prix créée par le seul import
