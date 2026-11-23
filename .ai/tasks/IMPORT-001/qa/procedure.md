# QA externe — IMPORT-001-F01 : extension Chromium pour les favoris d'une vente

**Interface :** utiliser une instance de QA isolée et jetable ; l'interface ne propose plus de suppression individuelle des favoris importés. Extension Chromium chargée localement, navigateur utilisateur connecté sur la page dédiée `https://www.interencheres.com/compte/favoris/`, et interface publiée de l'application sur Vercel. L'extension doit proposer de choisir une vente et d'importer directement, sans favori de navigateur `javascript:` ni copier-coller manuel. Ne jamais saisir un mot de passe Interencheres dans l'application, remettre une session au serveur, créer un ordre d'achat réel pour les besoins de la QA, ni appeler une interface privée. Faire les essais sur des ventes de contrôle distinctes des études personnelles ; ne pas effacer les favoris du compte réel sans accord. Le préflight doit identifier la vente, ses lots et l'état réel favori/ordre indépendamment du résultat de l'import. Les favoris **201/202** de la vente Horlogerie Crédit Municipal et **1002/1003** de Cap Enchères ont été observés dans le compte consultable. Le lot **203 suivi uniquement par ordre** et la pagination de la vente Crédit Municipal sont des **situations contrôlées à rejouer**, pas des observations du compte réel ; ne jamais placer un ordre pour les créer.

**Classification :** PASS si toutes les observations du scénario sont conformes ; FAIL si le produit échoue avec les sources contrôlées disponibles ; ENVIRONMENT_ERROR si l'accès à Interencheres ou l'instance Vercel nécessaire échoue après le préflight ; NOT_RUN si le jeu de contrôle requis n'a pas pu être constitué, avec motif explicite. Ne pas classer PASS une QA qui n'a vu qu'une page ou qui n'a pas distingué favori et ordre. Une réponse empêchant cette distinction est l'entrée attendue de S04, pas un prétexte pour inventer des favoris.

## QA-IMPORT-001-S01 — Import de la vente choisie sans étude

**Gherkin :** `IMPORT-001-F01` / `IMPORT-001-S01`. **Critère :** `AC-IMPORT-001-01` : le retour d'import propose une seule action « Lancer l'analyse » pour les favoris de la vente choisie, sans étude créée.

### Purpose
Vérifier la séparation des ventes, y compris pour un même numéro de lot, et l'absence d'étude automatique.
### Preconditions
Extension chargée dans Chromium et site Interencheres connecté ; vente A Crédit Municipal avec catalogue officiel publié et vente B d'une autre maison identifiées sur la page dédiée aux favoris, lots 201 et 202 favoris de A, lot 1002 favori de B ; aucune étude préexistante correspondante dans l'application de QA.
### Initial state
Aucun import affiché ; tableau des études de QA vide.
### Actions
1. Ouvrir la page Favoris du compte Interencheres, vérifier indépendamment les lots 201/202 de A et le lot 1002 de B.
2. Ouvrir l'extension, choisir A puis déclencher l'import direct ; vérifier l'onglet de retour ouvert sur l'application, sans lancer l'analyse. Depuis le bouton « Lancer l'analyse », relever les numéros proposés et annuler la confirmation.
### Expected observations
Le retour d'import ouvre la fenêtre modale sur « Lancer l'analyse » pour les deux lots favoris 201 et 202 de A, sans le lot 1002 de B ; la page principale n'affiche aucune liste de lots en attente ; aucune étude ni prix de comparaison n'est créé avant le clic confirmé. Aucun code `javascript:` ou collage manuel n'est demandé.
### Failure conditions
Lot de B mêlé à A, lot favori de A absent, étude ou consultation de prix lancée par l'import.
### Cleanup
Supprimer les entrées de QA par l'interface publique ; garder les favoris sources sauf s'ils ont été créés exprès et que leur suppression est autorisée.

## QA-IMPORT-001-S02 — Exclusion de l'ordre seul

**Gherkin :** `IMPORT-001-F01` / `IMPORT-001-S02`. **Critère :** `AC-IMPORT-001-02` : un ordre seul n'est pas pris pour un favori.

### Purpose
Distinguer les deux états que le site réunit sous « Mes favoris et ordres ».
### Preconditions
Jeu contrôlé autorisé présentant le lot 201 favori et le lot 203 suivi uniquement par un ordre dans la vente A, sans placer d'ordre réel. Ce jeu doit montrer distinctement la provenance de chaque état ; la page de favoris réelle observée ne contient pas d'ordre seul. Ne pas inférer un ordre à partir du titre de l'onglet commun.
### Initial state
Aucun favori importé de A dans l'instance de QA.
### Actions
1. Vérifier indépendamment l'état du lot 201 et du lot 203 sur le site de contrôle.
2. Depuis la page dédiée Favoris, choisir A dans l'extension, déclencher l'import direct et vérifier les numéros de l'analyse proposée au retour dans l'application, sans confirmer l'analyse.
### Expected observations
Seul 201 est inclus dans l'analyse proposée ; 203, suivi uniquement par ordre dans le jeu contrôlé, est exclu.
### Failure conditions
203 est importé comme favori ou 201 est omis malgré une source disponible.
### Cleanup
Retirer les entrées de QA par l'application ; ne toucher à aucun ordre réel.

## QA-IMPORT-001-S03 — Plusieurs pages

**Gherkin :** `IMPORT-001-F01` / `IMPORT-001-S03`. **Critère :** `AC-IMPORT-001-03` : les pages non consultées ne sont pas présentées comme importées.

### Purpose
Vérifier l'exhaustivité annoncée lorsque les favoris d'une vente dépassent une page.
### Preconditions
Relecture contrôlée de la vente A avec une première page contenant le favori 201 et une page suivante contenant le favori 202, dont les deux sources originales sont attestées dans le compte réel ; les liens de pagination sont synthétiques et ne doivent pas être présentés comme structure actuelle d'Interencheres. Aucune donnée de QA déjà importée.
### Initial state
Application sans analyse de la vente A ; aucun retour d'import affiché.
### Actions
1. Examiner indépendamment toutes les pages de favoris disponibles pour établir le nombre de pages et les numéros attendus ; ne pas créer d'ordre réel.
2. Revenir à la page Favoris, choisir A dans l'extension et lancer **une seule fois** l'import direct ; si une page ne peut pas être lue par l'extension, relever son avertissement et les lots obtenus.
### Expected observations
Si toutes les pages sont accessibles, l'analyse proposée couvre 201 et 202 ; une page absente n'est jamais annoncée comme un import complet.
### Failure conditions
Une page accessible est oubliée alors que l'import prétend être complet, ou un import incomplet est annoncé comme complet.
### Cleanup
Supprimer les entrées de QA depuis l'interface.

## QA-IMPORT-001-S04 — Source ambiguë

**Gherkin :** `IMPORT-001-F01` / `IMPORT-001-S04`. **Critère :** `AC-IMPORT-001-04` : l'ambiguïté n'invente pas de favoris.

### Purpose
Vérifier qu'une liste commune favoris/ordres dépourvue de preuve individuelle ne produit pas de faux favoris.
### Preconditions
Jeu de contrôle ou relecture autorisée d'une vente dont la liste « favoris et ordres » ne distingue pas publiquement les deux états ; aucun lot préexistant importé pour A.
### Initial state
Page de vente A et application ouvertes, import vide.
### Actions
1. Sur la source ambiguë « Mes favoris et ordres », ouvrir l'extension et tenter d'importer la vente A.
2. Vérifier le refus dans l'extension ou l'application, puis ouvrir la liste de l'application.
### Expected observations
Aucun lot non vérifié ajouté en tant que favori ; message indiquant que l'identification des favoris est impossible.
### Failure conditions
La liste commune est annoncée comme liste de favoris vérifiés, ou un lot non vérifié est ajouté comme favori.
### Cleanup
Aucun lot ne devrait avoir été ajouté ; supprimer toute donnée de contrôle restante par l'interface.

## QA-IMPORT-001-S05 — Visibilité Vercel

**Gherkin :** `IMPORT-001-F01` / `IMPORT-001-S05`. **Critère :** `AC-IMPORT-001-05` : le lien public de retour d'import présente l'action d'analyse sans étude automatique.

### Purpose
Vérifier la décision explicite de visibilité publique, distincte des analyses de prix.
### Preconditions
Instance Vercel de QA publique disponible, vente A et ses lots 201/202 favoris identifiés ; instance exempte d'étude de ces lots ; navigateur distinct non connecté à Interencheres pour la consultation.
### Initial state
Les deux favoris ont été importés via l'extension depuis le navigateur connecté sur la page dédiée aux favoris ; aucune étude enregistrée pour ces lots.
### Actions
1. Ouvrir le lien public de retour d'import de la vente A dans un navigateur distinct sans compte Interencheres.
2. Vérifier le bouton « Lancer l'analyse » et le tableau sans confirmer l'analyse.
### Expected observations
Le bouton « Lancer l'analyse » cible les deux lots favoris de A, sans liste de favoris persistante sur la page principale ; aucune étude de ces lots n'a été créée par l'import.
### Failure conditions
Bouton d'analyse absent sur le lien de retour, lots d'une autre vente inclus, ou études créées implicitement.
### Cleanup
Supprimer les entrées de QA par l'interface publique ; ne pas laisser de données de compte personnel sur l'instance de QA.

## QA-IMPORT-001-S06 — Installation locale de l'extension et choix d'une vente

**Gherkin :** `IMPORT-001-F01` / `IMPORT-001-S06`. **Critère :** `AC-IMPORT-001-06` : l'extension est chargeable sans boutique et montre les ventes favorites sans importer par simple sélection.

### Purpose
Vérifier le parcours d'installation confirmé par l'utilisateur et la présence du choix de vente.
### Preconditions
Chromium installé, dossier de l'extension livré dans le projet et compte Interencheres de contrôle disposant de favoris dans au moins deux ventes ; profil Chromium de QA isolé, instance Vercel de QA vide.
### Initial state
Extension absente du profil de QA ; aucun favori importé dans l'application de QA.
### Actions
1. Ouvrir `chrome://extensions` dans Chromium, activer Mode développeur puis charger le dossier de l'extension avec « Charger l'extension non empaquetée ».
2. Ouvrir la page dédiée Favoris du compte Interencheres connecté, puis l'extension ; observer son indicateur animé pendant la lecture et la vérification des ventes, relever les ventes proposées et sélectionner A sans cliquer sur « Importer ».
3. Ouvrir l'application Vercel et vérifier sa liste d'import.
### Expected observations
L'extension apparaît parmi les extensions chargées ; elle permet de choisir uniquement les ventes Crédit Municipal vérifiées de la page Favoris ; sélectionner A sans déclencher l'import ne crée aucun favori importé dans l'application.
### Failure conditions
Extension non chargeable malgré un dossier valide, ventes favorites absentes, ou import déclenché par simple sélection.
### Cleanup
Décharger l'extension du profil de QA ; ne pas modifier les favoris du compte source.

## QA-IMPORT-001-S07 — Refus d'une autre maison

**Gherkin :** `IMPORT-001-F01` / `IMPORT-001-S07`. **Critère :** `AC-IMPORT-001-07` : les ventes non Crédit Municipal ne sont ni proposées ni enregistrées.

### Purpose
Empêcher l'attribution d'un lot d'une autre maison au catalogue Crédit Municipal.
### Preconditions
Une vente Crédit Municipal datée et publiée et une vente Cap Enchères apparaissent toutes deux dans la page Favoris du compte de QA ; leurs organisateurs et lots sont vérifiés séparément sur les pages publiques.
### Initial state
Aucun de ces favoris n'a été importé dans l'application de QA.
### Actions
1. Depuis la page Favoris connectée, ouvrir l'extension et observer les ventes proposées.
2. Vérifier la liste dans l'application sans lancer d'étude.
### Expected observations
Seule la vente Crédit Municipal vérifiée est proposée ; aucun lot Cap Enchères n'apparaît dans la liste importée.
### Failure conditions
Une vente d'une autre maison est proposée/importée, ou un numéro de lot identique d'une autre vente est assimilé à celui du Crédit Municipal.
### Cleanup
Ne modifier aucun favori source ; retirer les entrées de QA via l'application si nécessaire.

## QA-IMPORT-001-S08 — Études groupées après confirmation

**Gherkin :** `IMPORT-001-F01` / `IMPORT-001-S08`. **Critère :** `AC-IMPORT-001-08` : l'import n'analyse rien ; la confirmation lance une étude par lot avec progression.

### Purpose
Vérifier l'action volontaire séparée de l'import, le suivi visible et l'identité de chaque étude.
### Preconditions
Vente Crédit Municipal cible accessible avec deux montres favorites 201 et 202 ; catalogue/frais et réponses de comparaison contrôlées dans l'environnement QA ; lot 202 à modèle non indiqué, sans prix ou plafond inventé ; aucune étude préexistante de ces lots.
### Initial state
Favoris importés, onglet de retour d'import ouvert par l'extension avec la fenêtre modale déjà affichée sur le seul bouton « Lancer l'analyse » ; tableau des études vide derrière.
### Actions
1. Vérifier que l'import seul n'a produit aucune étude.
2. Cliquer sur « Lancer l'analyse » dans l'onglet de retour d'import et confirmer le nombre indiqué.
3. Garder la fenêtre modale ouverte, observer la progression et le bilan dans cette fenêtre, puis choisir « Voir les études » pour consulter le tableau.
### Expected observations
La progression reste dans la fenêtre modale, identifie chaque lot et le nombre traité ; un indicateur animé et un temps écoulé (total et lot courant) restent visibles pendant l'attente d'une réponse, puis l'animation cesse au bilan ; les études 201 et 202 sont sauvegardées sous la même vente officielle ; le bilan indique deux études créées, aucune recherche avant la confirmation.
### Failure conditions
Étude déclenchée à l'import, lot d'une autre vente analysé, double analyse d'un même lot, absence de progression ou bilan erroné.
### Cleanup
Supprimer via l'interface les études et favoris créés par la QA ; ne pas supprimer ceux de l'utilisateur.

## QA-IMPORT-001-S09 — Doublon et erreur dans le lot suivant

**Gherkin :** `IMPORT-001-F01` / `IMPORT-001-S09`. **Critère :** `AC-IMPORT-001-09` : un doublon et un lot impossible n'empêchent pas le traitement des autres.

### Purpose
Vérifier la reprise et le bilan sans écraser une étude précédente.
### Preconditions
Relecture contrôlée avec les favoris 201, 202 et 203 de la vente Crédit Municipal ; étude 201 existante dans l'instance QA avec date/source enregistrées ; lot 203 rendu indisponible par une réponse contrôlée, sans l'ajouter aux favoris réels ; lot 202 accessible.
### Initial state
Seul le lot 201 possède déjà une étude ; les trois favoris du jeu contrôlé sont importés.
### Actions
1. Depuis le lien de retour d'import de cette vente, cliquer « Lancer l'analyse » et confirmer l'analyse des trois lots ; aucun compteur « en attente » n'est affiché avant ce clic.
2. Attendre le bilan dans la fenêtre modale, choisir « Voir les études », consulter le tableau et rouvrir le lot 201.
### Expected observations
Une nouvelle étude 202, identifiée comme PIAGET sans modèle ni moyenne inventée ; étude 201 inchangée (prix, date, source) ; aucun tableau inventé pour 203 ; bilan « 1 créé, 1 déjà étudié, 1 échec » avec numéro 203.
### Failure conditions
Étude 201 recalculée, 203 présenté comme réussi, abandon avant 202 ou bilan sans échec identifié.
### Cleanup
Supprimer seulement les études et favoris de QA créés ; conserver l'étude 201 préexistante si elle n'appartient pas au jeu de QA.

## QA-IMPORT-001-S10 — Accueil sans lots en attente

**Gherkin :** `IMPORT-001-F01` / `IMPORT-001-S10`. **Critère :** `AC-IMPORT-001-10` : un seul bouton principal, tableau visible, aucun état « lots en attente » affiché.

### Purpose
Vérifier que l'import ne laisse pas de tableau ou carte de favoris visible en permanence.
### Preconditions
Application de QA avec une vente Crédit Municipal importée mais aucune étude enregistrée.
### Initial state
Page principale fermée ; aucun lien de retour d'import utilisé pour l'ouverture.
### Actions
1. Ouvrir l'adresse racine de l'application, sans paramètre de retour d'import.
2. Vérifier le bouton principal et le tableau des études, sans cliquer sur l'analyse.
### Expected observations
« Commencer une nouvelle analyse » est le seul bouton principal ; le tableau complet reste visible dessous ; aucun compteur de lots en attente ni liste de favoris, formulaire manuel ou aide d'import affichés avant un choix.
### Failure conditions
Carte de vente importée persistante, formulaire manuel affiché d'emblée, tableau masqué, analyse déclenchée.
### Cleanup
Détruire l'instance QA isolée.

## QA-IMPORT-001-S11 — Étude sauvegardée sans écran d'attente

**Gherkin :** `IMPORT-001-F01` / `IMPORT-001-S11`. **Critère :** `AC-IMPORT-001-11` : le tableau visible contient les études déjà réalisées, sans inventer une liste d'attente.

### Purpose
Retrouver un lot déjà étudié sans exposer les favoris non analysés sur la page principale.
### Preconditions
Favoris 201 et 202 importés, étude 201 enregistrée, aucune étude 202 dans l'instance QA isolée.
### Initial state
Page principale fermée ; lien de retour d'import absent.
### Actions
1. Ouvrir l'adresse racine de l'application.
2. Ouvrir la ligne du lot 201 dans le tableau, puis revenir à la racine.
### Expected observations
Le tableau contient la ligne sourcée du lot 201 sans accordéon ; aucune liste de favoris « en attente » ni bouton « Lancer l'analyse » sans lien de retour d'import.
### Failure conditions
L'étude 201 absente, grille masquée, lot 202 affiché comme étude ou bouton d'analyse groupée affiché spontanément.
### Cleanup
Détruire l'instance QA isolée.

## QA-IMPORT-001-S12 — Choix du mode d'analyse

**Gherkin :** `IMPORT-001-F01` / `IMPORT-001-S12`. **Critère :** `AC-IMPORT-001-12` : le bouton principal dévoile les deux modes sans analyser de lot.

### Purpose
Vérifier le parcours demandé pour démarrer une analyse.
### Preconditions
Page principale disponible, aucun lien de retour d'import ni étude de QA.
### Initial state
Seul le bouton « Commencer une nouvelle analyse » et le tableau vide sont visibles.
### Actions
1. Cliquer sur « Commencer une nouvelle analyse » et relever les choix proposés.
2. Choisir successivement « Importer mes favoris » puis « Analyser un lot seul », en revenant au choix entre les deux, sans soumettre de formulaire.
### Expected observations
La fenêtre modale s'ouvre et contient les deux choix ; l'option import montre le lien Interencheres et son aide, l'option lot seul montre le formulaire dans cette même fenêtre ; aucune étude n'est créée par ces seuls clics.
### Failure conditions
Fenêtre modale absente, choix incomplet, recherche lancée sans confirmation ou champ de vente Interencheres mélangé au formulaire manuel.
### Cleanup
Recharger la page, détruire l'instance de QA si besoin.

## QA-IMPORT-001-S13 — Étude manuelle dans la fenêtre modale

**Gherkin :** `IMPORT-001-F01` / `IMPORT-001-S13`. **Critère :** `AC-IMPORT-001-13` : la fenêtre modale reste ouverte jusqu'à la réponse de l'étude d'un seul lot.

### Purpose
Vérifier le chargement et le résultat manuel sans navigation prématurée hors de la fenêtre.
### Preconditions
Vente Crédit Municipal de QA accessible avec le lot 202 PIAGET identifiable ; modèle non publié, aucune comparaison de prix inventée ; aucune étude 202 préexistante dans l'instance QA isolée. La QA locale peut démarrer l'application par la commande publique `node bin/app.mjs` depuis un répertoire temporaire vide et un port libre : les fichiers de données de l'utilisateur restent intacts, et `PCKT_API_KEY` doit être absent pour ce cas sans modèle. Client Chromium avec JavaScript disponible et instance de QA isolée.
### Initial state
Page principale ouverte, fenêtre modale fermée, aucune ligne d'étude pour ce lot.
### Actions
1. Cliquer sur « Commencer une nouvelle analyse », choisir « Analyser un lot seul », remplir la vente et le lot 202 puis lancer l'étude.
2. Pendant la collecte, vérifier que la fenêtre reste ouverte et montre le temps écoulé ; après la réponse, vérifier son bilan et son lien vers la fiche.
3. Cliquer sur « Voir le tableau » et consulter la ligne sauvegardée.
### Expected observations
Fenêtre modale ouverte pendant la collecte avec indicateur animé et temps écoulé croissant ; aucun tableau fictif ni navigation avant le résultat ; message de réussite avec lien vers la fiche du lot 202, puis tableau indiquant PIAGET et « modèle non indiqué » sans moyenne fictive après sortie de la fenêtre.
### Failure conditions
Fenêtre fermée avant la réponse, chargement absent, résultat annoncé trop tôt, lien vers un autre lot ou étude non sauvegardée.
### Cleanup
Supprimer l'étude de QA via l'interface et détruire l'instance isolée.

## Hypothèses et questions restantes

La page dédiée « Favoris » du compte sépare déjà visiblement les favoris des ordres ; la pagination d'un grand compte n'a pas été observée. La QA doit établir indépendamment les lots attendus avant d'affirmer l'exhaustivité ; une page absente ne doit jamais être traitée comme une liste complète. L'extension locale et le déploiement Vercel sont deux environnements distincts ; le transfert ne transmet ni mot de passe, ni cookie, ni jeton de session. Les lots importés sont publics sur Vercel par choix de l'utilisateur.
