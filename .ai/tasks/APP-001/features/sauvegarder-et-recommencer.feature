Feature: APP-001-F02 Retrouver, bloquer et supprimer les analyses de lots
  Scenario: APP-001-S06 Retrouver le tableau enregistré sans recalcul automatique
    Given une étude de la vente du 5 décembre 2026 et du lot 268 est sauvegardée avec une moyenne de 4 345 €
    And la date d'analyse enregistrée est le 15 novembre 2026 avec les sources et photos disponibles
    And les annonces consultables affichent désormais d'autres prix
    When l'utilisateur ferme puis rouvre l'application et consulte la ligne de ce lot
    Then son tableau enregistré affiche encore la date du 15 novembre 2026, la moyenne de 4 345 € et ses liens sources
    And aucune nouvelle moyenne ni nouvelle analyse du même lot n'est créée par cette consultation

  Scenario: APP-001-S07 Bloquer une analyse déjà sauvegardée pour la même vente et le même lot
    Given une étude de la vente du 5 décembre 2026 et du lot 268 est sauvegardée avec une moyenne de 4 345 €
    And les prix des sources ont changé depuis son enregistrement
    When l'utilisateur saisit de nouveau le lien de cette vente et le numéro de lot 268 puis demande une étude
    Then l'application indique que ce lot de cette vente a déjà été analysé et permet de retrouver le tableau existant
    And la liste conserve une seule ligne pour cette vente et ce lot, sans remplacer les montants ni la date enregistrés

  Scenario: APP-001-S08 Supprimer une ligne et recommencer l'analyse du même lot
    Given une étude de la vente du 5 décembre 2026 et du lot 268 est sauvegardée avec une moyenne de 4 345 €
    And les sources contrôlées fournissent désormais une moyenne vérifiée de 3 933 € et les mêmes frais cibles de 18 % et 1,2 % live
    When l'utilisateur supprime la ligne de cette étude puis relance le formulaire pour cette vente et ce lot
    Then l'ancienne étude n'est plus consultable depuis la liste des analyses
    And une seule nouvelle ligne est sauvegardée pour cette vente et ce lot avec la moyenne de 3 933 € et le plafond de 3 299,49 € hors frais
    And les sources et la date de la nouvelle analyse correspondent aux données reconsultées, sans reprendre les anciens montants

  Scenario: APP-001-S09 Distinguer un même numéro de lot dans deux ventes différentes
    Given le lot 268 existe dans deux ventes distinctes de montres avec des sources vérifiables
    When l'utilisateur étudie ce lot dans chacune des deux ventes
    Then la liste contient deux lignes identifiées chacune par sa vente et son numéro de lot
    And chaque ligne mène au tableau et aux photos de sa propre vente, sans mélanger les sources

  Scenario: APP-001-S10 Supprimer une ligne sans toucher à l'étude de l'autre vente
    Given deux analyses de lots numéro 268 sont sauvegardées pour des ventes distinctes
    When l'utilisateur supprime la ligne de la première vente
    Then seule cette ligne n'est plus consultable
    And l'étude de la seconde vente et ses photos restent consultables
