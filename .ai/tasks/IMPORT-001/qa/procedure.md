# QA externe — IMPORT-001-F01 : extension Chromium pour les favoris d'une vente

**Interface :** extension Chromium chargée localement, navigateur utilisateur connecté sur la page dédiée `https://www.interencheres.com/compte/favoris/`, et interface publiée de l'application sur Vercel. L'extension doit proposer de choisir une vente et d'importer directement, sans favori de navigateur `javascript:` ni copier-coller manuel. Ne jamais saisir un mot de passe Interencheres dans l'application, remettre une session au serveur, créer un ordre d'achat réel pour les besoins de la QA, ni appeler une interface privée. Faire les essais sur des ventes de contrôle distinctes des études personnelles ; ne pas effacer les favoris du compte réel sans accord. Le préflight doit identifier la vente, ses lots et l'état réel favori/ordre indépendamment du résultat de l'import. Les lots 1002/1003/1004 ci-dessous sont des **oracles de scénario**, non une affirmation sur la vente d'essai actuellement visible.

**Classification :** PASS si toutes les observations du scénario sont conformes ; FAIL si le produit échoue avec les sources contrôlées disponibles ; ENVIRONMENT_ERROR si l'accès à Interencheres ou l'instance Vercel nécessaire échoue après le préflight ; NOT_RUN si le jeu de contrôle requis n'a pas pu être constitué, avec motif explicite. Ne pas classer PASS une QA qui n'a vu qu'une page ou qui n'a pas distingué favori et ordre. Une réponse empêchant cette distinction est l'entrée attendue de S04, pas un prétexte pour inventer des favoris.

## QA-IMPORT-001-S01 — Import de la vente choisie sans étude

**Gherkin :** `IMPORT-001-F01` / `IMPORT-001-S01`. **Critère :** `AC-IMPORT-001-01` : seuls les favoris de la vente demandée sont visibles et aucune étude n'est créée.

### Purpose
Vérifier la séparation des ventes, y compris pour un même numéro de lot, et l'absence d'étude automatique.
### Preconditions
Extension chargée dans Chromium et site Interencheres connecté ; ventes A et B identifiées sur la page dédiée aux favoris, lots 1002 et 1003 favoris de A, lot 1002 favori de B ; aucune étude préexistante correspondante dans l'application de QA.
### Initial state
Liste des favoris importés vide pour A ; liste des études de QA vide.
### Actions
1. Ouvrir la page Favoris du compte Interencheres, vérifier indépendamment les lots 1002/1003 de A et le lot 1002 de B.
2. Ouvrir l'extension, choisir A puis cliquer sur son action d'import direct ; ouvrir ensuite la liste de l'application Vercel sans coller de données.
### Expected observations
Exactement les numéros 1002 et 1003 associés à A, aucun lot de B dans la sélection A ; aucune nouvelle étude, aucun prix de comparaison issu de l'import ; aucune étape ne demande de code `javascript:` ou de collage manuel.
### Failure conditions
Lot de B mêlé à A, lot favori de A absent, étude ou consultation de prix lancée par l'import.
### Cleanup
Supprimer les entrées de QA par l'interface publique ; garder les favoris sources sauf s'ils ont été créés exprès et que leur suppression est autorisée.

## QA-IMPORT-001-S02 — Exclusion de l'ordre seul

**Gherkin :** `IMPORT-001-F01` / `IMPORT-001-S02`. **Critère :** `AC-IMPORT-001-02` : un ordre seul n'est pas pris pour un favori.

### Purpose
Distinguer les deux états que le site réunit sous « Mes favoris et ordres ».
### Preconditions
Jeu de contrôle attestant, sans placer de nouvel ordre réel, que le lot 1002 est favori et le lot 1004 est suivi uniquement par un ordre dans la même vente A. Si ce jeu n'existe pas, préparer une capture/relecture autorisée à travers l'interface publique avant de lancer le scénario, ou le laisser NOT_RUN ; ne pas deviner l'état à partir de l'intitulé de l'onglet.
### Initial state
Aucun favori importé de A dans l'instance de QA.
### Actions
1. Vérifier indépendamment l'état du lot 1002 et du lot 1004 sur le site de contrôle.
2. Depuis la page dédiée Favoris, choisir A dans l'extension, déclencher l'import direct puis ouvrir la liste importée.
### Expected observations
1002 est affiché ; 1004 n'est pas affiché comme favori.
### Failure conditions
1004 est importé comme favori ou 1002 est omis malgré une source disponible.
### Cleanup
Retirer les entrées de QA par l'application ; ne toucher à aucun ordre réel.

## QA-IMPORT-001-S03 — Plusieurs pages

**Gherkin :** `IMPORT-001-F01` / `IMPORT-001-S03`. **Critère :** `AC-IMPORT-001-03` : les pages non consultées ne sont pas présentées comme importées.

### Purpose
Vérifier l'exhaustivité annoncée lorsque les favoris d'une vente dépassent une page.
### Preconditions
Vente de contrôle avec au moins deux pages de favoris ; 1002 favori en première page et 1003 favori sur une page suivante ; quantité de pages et de favoris contrôlée depuis le parcours public du site. Aucune donnée de QA déjà importée.
### Initial state
Application sur la liste de favoris de A vide.
### Actions
1. Examiner indépendamment toutes les pages de favoris disponibles pour établir le nombre de pages et les numéros attendus ; ne pas créer d'ordre réel.
2. Revenir à la page Favoris, choisir A dans l'extension et lancer **une seule fois** l'import direct ; si une page ne peut pas être lue par l'extension, relever son avertissement et les lots obtenus.
### Expected observations
Si toutes les pages sont accessibles : 1002 et 1003 sont présents. Si une page ne peut pas être consultée : l'interface ne revendique pas « tous les favoris importés ».
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

**Gherkin :** `IMPORT-001-F01` / `IMPORT-001-S05`. **Critère :** `AC-IMPORT-001-05` : les favoris importés sur Vercel sont visibles à l'URL publique, sans étude automatique.

### Purpose
Vérifier la décision explicite de visibilité publique, distincte des analyses de prix.
### Preconditions
Instance Vercel de QA publique disponible, vente A et ses lots 1002/1003 favoris identifiés ; instance exempte d'étude de ces lots ; navigateur distinct non connecté à Interencheres pour la consultation.
### Initial state
Les deux favoris ont été importés via l'extension depuis le navigateur connecté sur la page dédiée aux favoris ; aucune étude enregistrée pour ces lots.
### Actions
1. Ouvrir l'URL publique Vercel dans le navigateur distinct sans compte Interencheres.
2. Consulter la liste de favoris et la liste d'études.
### Expected observations
1002 et 1003 sont visibles comme favoris de A ; aucune étude de ces deux lots n'a été créée par l'import.
### Failure conditions
Favoris absents pour ce visiteur, ou études créées implicitement.
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
2. Ouvrir la page dédiée Favoris du compte Interencheres connecté, puis l'extension ; relever les ventes proposées et sélectionner A sans cliquer sur « Importer ».
3. Ouvrir l'application Vercel et vérifier sa liste d'import.
### Expected observations
L'extension apparaît parmi les extensions chargées ; elle permet de choisir les ventes visibles de la page Favoris ; sélectionner A sans déclencher l'import ne crée aucun favori importé dans l'application.
### Failure conditions
Extension non chargeable malgré un dossier valide, ventes favorites absentes, ou import déclenché par simple sélection.
### Cleanup
Décharger l'extension du profil de QA ; ne pas modifier les favoris du compte source.

## Hypothèses et questions restantes

La page dédiée « Favoris » du compte sépare déjà visiblement les favoris des ordres ; la pagination d'un grand compte n'a pas été observée. La QA doit établir indépendamment les lots attendus avant d'affirmer l'exhaustivité ; une page absente ne doit jamais être traitée comme une liste complète. L'extension locale et le déploiement Vercel sont deux environnements distincts ; le transfert ne transmet ni mot de passe, ni cookie, ni jeton de session. Les lots importés sont publics sur Vercel par choix de l'utilisateur.
