Feature: IMPORT-001-F01 Importer uniquement les favoris Crédit Municipal avec une extension Chromium
  Scenario: IMPORT-001-S01 Retrouver les favoris de la vente choisie sans lancer d'étude
    Given l'utilisateur est connecté sur le site Interencheres et a mis en favoris les lots 201 et 202 de la vente A Crédit Municipal
    And la vente B Cap Enchères contient le lot 1002 mis en favori
    When l'utilisateur choisit la vente A dans l'extension depuis la page Favoris et lance l'import direct
    Then une fenêtre modale ouverte propose le bouton Lancer l'analyse pour les lots 201 et 202 de la vente A
    And le lot 1002 de la vente B n'est pas inclus dans cette analyse
    And aucune étude de prix n'est lancée par cet import
    And aucun raccourci javascript ou collage manuel de liste n'est nécessaire

  Scenario: IMPORT-001-S02 Exclure un lot suivi uniquement par un ordre d'achat
    Given la vente A affiche le lot 201 mis en favori et le lot 203 suivi uniquement par un ordre d'achat dans la source contrôlée
    When l'utilisateur choisit la vente A dans l'extension depuis la page Favoris et lance l'import direct
    Then l'analyse proposée contient le lot 201 de la vente A
    And le lot 203 n'est pas inclus dans cette analyse

  Scenario: IMPORT-001-S03 Importer aussi les favoris des pages suivantes
    Given les favoris de la vente A sont répartis sur plusieurs pages dans une source contrôlée
    And le lot 201 est sur la première page et le lot 202 sur une page suivante
    When l'utilisateur choisit la vente A dans l'extension depuis la page Favoris et lance l'import direct
    Then l'analyse proposée couvre les lots 201 et 202 de la vente A
    And l'application n'annonce pas un import complet si une page de favoris n'a pas été consultée

  Scenario: IMPORT-001-S04 Refuser de présenter un ordre ou un lot non vérifié comme favori
    Given la source de la vente A ne permet pas de distinguer un favori d'un lot suivi seulement par un ordre
    When l'utilisateur tente d'importer la vente A par l'extension depuis cette source ambiguë
    Then l'application n'ajoute aucun lot non identifié comme favori
    And elle indique que la liste des favoris de cette vente n'a pas pu être vérifiée

  Scenario: IMPORT-001-S05 Consulter les favoris importés sur l'application Vercel
    Given les lots 201 et 202 de la vente A ont été importés dans l'application Vercel
    When une autre personne ouvre le lien public de retour d'import de la vente A
    Then elle peut voir le bouton Lancer l'analyse de cette vente
    And elle ne voit aucune étude de prix créée par le seul import

  Scenario: IMPORT-001-S06 Installer l'extension sans boutique et ouvrir le choix de vente
    Given le dossier de l'extension est disponible sur la machine et Chromium est installé
    When l'utilisateur charge ce dossier comme extension non empaquetée dans Chromium
    And il ouvre la page Favoris de son compte Interencheres
    Then l'extension est disponible dans son navigateur et présente les ventes Crédit Municipal de ses favoris
    And la sélection d'une vente seule n'importe encore aucun lot

  Scenario: IMPORT-001-S07 Refuser les favoris d'une autre maison de ventes
    Given la page Favoris contient le lot 1002 d'une vente Cap Enchères et le lot 201 d'une vente Crédit Municipal
    When l'utilisateur ouvre l'extension depuis la page Favoris
    Then seule la vente Crédit Municipal est proposée à l'import
    And aucun lot de Cap Enchères n'est ajouté à l'application

  Scenario: IMPORT-001-S08 Étudier tous les favoris vérifiés d'une vente Crédit Municipal après confirmation
    Given les lots 201 et 202 favoris de la vente Crédit Municipal sont importés sans étude
    When l'utilisateur confirme le lancement de l'étude pour tous les lots de cette vente
    Then la progression dans la fenêtre modale indique le numéro du lot en cours et le nombre de lots traités
    And un indicateur animé et le temps écoulé restent visibles pendant l'étude de chaque lot
    And une étude distincte est sauvegardée pour les lots 201 et 202
    And l'import seul n'avait lancé aucune recherche de prix

  Scenario: IMPORT-001-S09 Continuer après un lot déjà étudié et un lot en échec
    Given les lots 201, 202 et 203 sont importés pour une vente Crédit Municipal dans une source contrôlée et le lot 201 a déjà son étude
    And le lot 203 ne peut pas être étudié
    When l'utilisateur lance l'étude pour tous les lots de cette vente
    Then le lot 202 est étudié sans modifier l'étude existante du lot 201
    And le bilan indique un lot créé, un déjà étudié et un échec pour le lot 203

  Scenario: IMPORT-001-S10 Montrer une seule action principale et le tableau directement en dessous
    Given les lots 201 et 202 favoris de la vente Crédit Municipal sont importés sans étude
    When l'utilisateur ouvre la page principale sans lien de retour d'import
    Then le bouton Commencer une nouvelle analyse précède le tableau visible et la fenêtre modale est fermée
    And aucun lot en attente ni liste de favoris n'est affiché sur la page principale
    And le formulaire manuel et l'aide à l'import restent cachés jusqu'au choix de l'utilisateur

  Scenario: IMPORT-001-S11 Retrouver une étude sauvegardée sans afficher les favoris en attente
    Given les lots 201 et 202 favoris de la vente Crédit Municipal sont importés et le lot 201 est déjà étudié
    When l'utilisateur ouvre la page principale sans lien de retour d'import
    Then l'étude du lot 201 apparaît dans le tableau visible avec un lien vers sa fiche
    And aucun accordéon ne masque le tableau des études
    And aucun bouton Lancer l'analyse n'apparaît sans lien de retour d'import

  Scenario: IMPORT-001-S12 Choisir comment commencer une nouvelle analyse
    Given la page principale est ouverte sans lien de retour d'import
    When l'utilisateur clique sur Commencer une nouvelle analyse
    Then une fenêtre modale lui propose Importer mes favoris ou Analyser un lot seul
    And aucune étude ne démarre par ce seul clic

  Scenario: IMPORT-001-S13 Garder la fenêtre modale pendant l'étude manuelle et afficher son résultat
    Given le lot 202 est identifiable dans une vente Crédit Municipal et n'a pas encore d'étude
    When l'utilisateur ouvre la fenêtre modale, choisit Analyser un lot seul et lance son étude
    Then le chargement et le temps écoulé restent dans la fenêtre modale pendant la recherche
    And une fois l'étude terminée la fenêtre modale indique le résultat avec un lien vers la fiche du lot
    And le bouton Voir le tableau termine le parcours
