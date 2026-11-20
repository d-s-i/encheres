# QA externe — PRICE-001-F02 : plafond d'enchère hors frais

Interface publique : la commande utilisateur de comparaison de prix (et, si elle existe, la commande Pi correspondante), pas les modules internes. Chaque cas part d'une nouvelle demande et affiche les sources, la date d'analyse, la moyenne Chrono24 et les frais appliqués. Ne jamais saisir la clé Packet dans la conversation. Dans l'environnement de QA, utiliser une date d'analyse **antérieure à la vente ciblée** ; pour l'exemple du 05/12/2026, `--as-of 2026-11-15`. Les prix Chrono24 étant variables, les montants des annonces sont à **revérifier** avant de faire une assertion numérique.

Statuts : `PASS` si les observations correspondent aux sources consultées et au calcul ; `FAIL` si les sources sont disponibles mais que le produit affiche un plafond faux, sans origine, ou fabriqué ; `ENVIRONMENT_ERROR` si une source nécessaire (catalogue, annonces, API) est inaccessible indépendamment du produit ; `NOT_RUN` si le cas n'a pas été exécuté. Un refus d'accès ou quota Packet rendu honnêtement « non vérifiable » est **le résultat attendu de S12**, et non un zéro offre.

## QA-PRICE-001-S08 — Plafond du lot 268

### Purpose
Vérifier PRICE-001-S08 : coût acheteur final ≤ moyenne des prix d'annonces, en utilisant les frais **de la vente cible** et non ceux des ventes historiques.

### Preconditions
Le [catalogue de la vente du 05/12/2026](https://www.creditmunicipal.fr/app/uploads/sales/261205000/generate-catalogue-261205000.pdf) est disponible et ses sections 2 et 6 mentionnent 18 % TTC de frais acheteur et 1,2 % TTC pour le live. Les annonces du même modèle chez des vendeurs français sont consultables. L'interface accepte un lien de vente et une date d'analyse.

### Initial state
Nouvelle demande ; aucun plafond déjà calculé. Date d'analyse : 15/11/2026 ; lot étudié : [lot 268, TAG Heuer Monaco CAW2111](https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/261205000/tag-heuer-monaco-montre-bracelet-de-forme-carre/), sans adjudication à cette date.

### Actions
1. Vérifier sur le PDF la date et les frais **du 05/12/2026**. Consulter chaque fiche Chrono24 française retenue et recalculer la moyenne des annonces disponibles hors port ; noter le nombre réel de fiches.
2. Lancer l'analyse publique avec l'URL `https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/261205000/`, le lot `268` et `--as-of 2026-11-15`.
3. Multiplier le plafond affiché par `1,192`, et comparer à la moyenne Chrono24 effectivement affichée et vérifiée. Vérifier que les [3 700 € adjugés au lot 246 en 2024](https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/ventes-passees/240615000/tag-heuer-monaco-montre-dhomme-de-forme-carree/) restent identifiés comme une autre adjudication, pas comme le plafond.

### Expected observations
- Plafond **hors frais** = moyenne Chrono24 / 1,192, arrondie au centime inférieur ; la moyenne reste clairement « prix demandés » et « partielle » si moins de trois annonces.
- Si les [annonces à 4 100 €](https://www.chrono24.fr/tagheuer/tag-heuer-monaco-calibre-12--id48909624.htm) et [4 590 €](https://www.chrono24.fr/tagheuer/monaco-chronographe-automatique-39mm--id48704080.htm) sont toujours les seules admissibles : moyenne partielle **4 345 € / 2 annonces** et plafond **3 645,13 € hors frais**. Sinon utiliser les prix et le nombre réellement observés : ne pas exiger ces montants devenus obsolètes.
- Origine du prix moyen et des frais de la vente ciblée visibles ; le coût au plafond ne dépasse pas la moyenne. Si la recherche Chrono24 comportait plus de trois pages, la base et le plafond sont **explicitement étiquetés comme fondés uniquement sur les trois premières pages**, sans prétendre au prix minimum du marché entier.

### Failure conditions
Application des frais de 2024 (18 % sans live) au lot cible, simple soustraction de 19,2 % de la moyenne, confusion entre lot 246 et lot 268, ou plafond sans les données sources.

### Cleanup
Terminer la demande, sans achat ni inscription à une enchère.

## QA-PRICE-001-S09 — Arrondi conservateur

### Purpose
Vérifier PRICE-001-S09 : ne jamais arrondir vers le haut un plafond qui pourrait dépasser la valeur Chrono24 frais compris.

### Preconditions
Même catalogue et mêmes accès que S08 ; un résultat avec division non entière au centime est disponible (l'exemple du 15/11/2026 remplit cette condition).

### Initial state
Nouvelle analyse indépendante du lot 268, au 15/11/2026 ; pas de valeur présélectionnée.

### Actions
1. Relancer l'analyse publique comme dans S08.
2. Calculer indépendamment `floor((moyenne_chrono / 1,192) × 100) / 100` ; tester aussi `(plafond + 0,01) × 1,192` avec les prix réellement observés.

### Expected observations
- Plafond égal à l'arrondi inférieur, coût correspondant ≤ moyenne.
- Pour une moyenne vérifiée de **4 345 €** : **3 645,13 €** ; à **3 645,14 €**, le coût non arrondi excéderait 4 345 €. Ces deux montants ne deviennent pas des oracles pour des annonces qui ont changé.

### Failure conditions
Arrondi supérieur ou pourcentage soustrait directement de la moyenne ; prix décrit comme montant forcément autorisé par le pas d'enchère.

### Cleanup
Terminer la demande ; aucune enchère réelle.

## QA-PRICE-001-S10 — Frais du lot cible inconnus

### Purpose
Vérifier PRICE-001-S10 : ne jamais utiliser les frais d'une autre vente pour proposer un plafond.

### Preconditions
Disposer, **par l'interface publique**, d'un lot de vente à venir identifiable dont la moyenne des annonces est consultable mais dont les conditions d'achat live de sa vente ne sont pas vérifiables. Une fiche PDF fournie par l'utilisateur est acceptable si elle indique l'identité de la vente et du lot, mais pas ses frais ; ne pas fabriquer une source officielle. Si aucun cas public adéquat n'est disponible, classer `NOT_RUN` et demander à la QA un environnement public contrôlé ; ne pas lire ou modifier le stockage interne.

### Initial state
Nouvelle demande, sans taux de frais fixé pour la vente cible ; des ventes historiques peuvent avoir leurs propres frais attestés.

### Actions
1. Fournir le lien ou le PDF par la commande publique et lancer l'analyse du lot avec une date antérieure à sa vente.
2. Vérifier dans les sources que les conditions de la vente cible sont effectivement absentes, distinctes des CGV de ventes comparables.

### Expected observations
Plafond « indisponible : frais de la vente ciblée non vérifiés », même si un coût en ligne historique est affiché pour un autre lot. Aucun transfert du taux 2024 vers le lot cible.

### Failure conditions
Un montant de plafond est déduit des conditions d'une autre vente ou d'un texte `?print=1` commun à toutes les années.

### Cleanup
Terminer la demande ; retirer le PDF de test si applicable.

## QA-PRICE-001-S11 — Pas d'annonce admissible

### Purpose
Vérifier PRICE-001-S11 : aucune estimation ni adjudication passée ne remplace la moyenne d'annonces demandée par l'utilisateur.

### Preconditions
Disposer d'un lot de vente à venir avec conditions live vérifiées, et confirmer qu'une recherche Chrono24 accessible ne fournit aucune offre comparable de vendeur français **dans les trois premières pages analysées**. Si ces préconditions ne peuvent être réunies publiquement, classer `NOT_RUN` ; ne pas assimiler une recherche bloquée à zéro annonce.

### Initial state
Nouvelle demande, vente et frais attestés, zéro annonce admissible constatée indépendamment.

### Actions
1. Vérifier sur les sources le lot, l'estimation éventuelle et les conditions de sa vente.
2. Lancer l'analyse publique de ce lot et consulter le statut Chrono24 obtenu.

### Expected observations
Plafond indisponible faute de moyenne Chrono24 dans l'échantillon. Aucun montant d'estimation ou d'adjudication historique n'est substitué ; si la recherche avait plus de trois pages, ne pas conclure à zéro offre française sur tout le site.

### Failure conditions
Plafond chiffré à partir d'une estimation, d'une annonce étrangère ou d'une vente historique alors que la recherche d'annonces françaises est aboutie et vide.

### Cleanup
Terminer la demande sans enchérir.

## QA-PRICE-001-S15 — Plafond basé sur un échantillon non exhaustif

### Purpose
Vérifier PRICE-001-S15 : le plafond calculé à partir des trois premières pages est correctement chiffré **et étiqueté comme indicatif**.

### Preconditions
Environnement public de test disposant d'une recherche de 5 pages et 10 annonces, dont les trois premières contiennent trois offres françaises vérifiées à 1 000, 1 300 et 1 600 € ; conditions de la vente cible : 18 % + 1,2 % live, avec source datée. Sinon classer `NOT_RUN` (pas de raccourci via un module privé).

### Initial state
Nouvelle demande de comparaison d'un lot à venir, date d'analyse antérieure à sa vente ; aucune recherche déjà ouverte.

### Actions
1. Vérifier par l'interface publique les résultats et leurs pays vendeur sur les trois premières pages, et établir la moyenne **1 300 €** hors port.
2. Lancer l'analyse du lot via la commande publique.
3. Vérifier les mentions de couverture et recalculer `floor((1 300 / 1,192) × 100) / 100`.

### Expected observations
Plafond **1 090,60 € hors frais**, base « échantillon des trois premières pages », **3 pages/6 annonces analysées sur 10 résultats**, et avertissement que des offres moins chères peuvent se trouver après la page 3. Le résultat ne se présente pas comme un minimum mondial.

### Failure conditions
Plafond calculé sur d'autres pages, absence de mention de couverture, ou prix présenté comme un maximum garanti par l'ensemble du marché.

### Cleanup
Terminer la demande sans enchérir.

## QA-PRICE-001-S12 — Accès Chrono24 impossible

### Purpose
Vérifier PRICE-001-S12 : distinguer impossibilité d'accès et prix nul.

### Preconditions
Même vente cible avec frais vérifiés ; l'environnement public de test doit pouvoir reproduire un accès API Packet indisponible (quota ou échec réseau), sans révéler la clé ni utiliser des fonctions privées. Sinon `NOT_RUN` ; n'occasionner aucune dépense ou transaction.

### Initial state
Nouvelle demande, aucune moyenne Chrono24 vérifiable et frais de vente cible accessibles.

### Actions
1. Déclencher l'indisponibilité de la source dans l'environnement QA public.
2. Lancer l'analyse du lot via la commande publique.

### Expected observations
Plafond « non vérifiable : accès à Chrono24 impossible », aucun plafond à 0 € ; les autres résultats d'adjudications restent indépendants.

### Failure conditions
Prix nul affiché comme plafond ou reprise d'un chiffre précédent alors que les annonces ne sont pas consultables.

### Cleanup
Rétablir l'accès API pour les autres cas ; aucune modification de l'état de la vente.
