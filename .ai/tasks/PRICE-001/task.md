# PRICE-001 — Comparer les prix de montres équivalentes sur cinq ans et sur Chrono24

## Demande d'origine
Pour chaque lot identifié, l'utilisateur souhaite la moyenne du prix du même article sur les cinq dernières années, puis la moyenne sur Chrono24. Les comparables doivent avoir la même marque et le même type ; la description, la boîte et le bracelet peuvent affiner le rapprochement. Cette tâche est la deuxième des trois demandées.

## Objectif compris
Produire des comparaisons de prix transparentes et vérifiables pour la montre caractérisée par LOT-001, avec sources, période, échantillon et exclusions des faux comparables.

## Acteur et périmètre proposé
- Acteur : utilisateur qui estime la valeur d'un lot avant une enchère.
- Rechercher les adjudications comparables des ventes Crédit municipal des cinq dernières années et, séparément, les prix de ventes réalisées de montres comparables sur Chrono24, uniquement si ces données sont accessibles et vérifiables.
- Comparer marque, modèle/type et référence quand elle existe ; distinguer les caractéristiques qui changent la comparabilité (état, boîte, bracelet, etc.).
- Calculer et documenter séparément chaque moyenne avec devise, nombre d'observations, dates et liens des annonces ou résultats accessibles ; signaler l'absence de données fiables. Pour la comparaison Crédit municipal, distinguer le prix d'adjudication des frais acheteur et afficher le total selon le canal d'achat et les conditions applicables à la vente, sans double comptage.
- Rendre le résultat utilisable par APP-001 sans décider ici de sa présentation.

## Hors périmètre proposé
- Découverte du lot et extraction de sa fiche (LOT-001).
- Chat, tableau interactif et persistance (APP-001).
- Prix des annonces Chrono24 (prix demandés) présentés comme des transactions réalisées ; garantie d'un historique exhaustif sans source vérifiée.

## Contraintes confirmées
- L'utilisateur demande deux moyennes distinctes et un rapprochement au minimum par marque et type ; les libellés de lots ne suffisent pas.
- La moyenne historique porte uniquement sur les adjudications des ventes Crédit municipal des cinq dernières années.
- La moyenne Chrono24 doit porter exclusivement sur des prix de ventes réalisées, et non sur les prix demandés par les vendeurs.
- L'utilisateur souhaite comparer des coûts Crédit municipal incluant les frais acheteur. Les CGV actuellement affichées du Crédit Municipal de Paris (datées du 24/04/2026, https://www.creditmunicipal.fr/en/conditions-generales-de-vente/hotel-des-ventes/) indiquent 18 % TTC de frais acheteur sur le montant de l'adjudication, plus 1,2 % TTC sur ce même montant pour un achat en ligne via la plateforme live : soit 18 % en salle ou 19,2 % via cette plateforme, pour les ventes régies par ces CGV. Ce sont des frais, non une taxe unique de 19,2 %.
- L'utilisateur confirme vouloir le coût d'un achat en ligne : prendre le montant d'adjudication et les frais acheteur et de plateforme live applicables à la vente. Pour les CGV du 24/04/2026 citées ci-dessus, le coût est adjudication × 1,192 (18 % TTC + 1,2 % TTC calculés chacun sur l'adjudication).
- Le catalogue de montres du 20/06/2026 fourni par l'utilisateur (https://www.creditmunicipal.fr/en/ventes-aux-encheres/catalogue-des-ventes/ventes-passees/260620000/) affiche des prix libellés « Adjugé à » / « Sold for », distincts des estimations. Ne pas confondre le montant d'adjudication avec le coût final en ligne.

## Hypothèses explicites
- La période de cinq ans se rapporte à la date d'analyse, sauf indication contraire.
- Si une source ne fournit pas des prix de transactions réalisées vérifiables, sa moyenne sera indiquée comme indisponible plutôt que calculée à partir de prix affichés.
- Le canal d'achat retenu est la plateforme live (confirmé par l'utilisateur). Les CGV publiées au 24/04/2026 ne prouvent pas les taux applicables à toutes les ventes des cinq années précédentes. Vérifier les conditions propres à chaque vente lorsque disponibles et signaler explicitement toute hypothèse de taux. Les autres coûts éventuels (livraison, stockage) ne sont pas chiffrés dans cette comparaison sans indication spécifique.

## Questions non résolues
- Les taux et conditions applicables aux adjudications historiques restent à vérifier vente par vente.
- La vente exemple publie des adjudications, mais la couverture des ventes des cinq dernières années et les conditions d'accès aux prix de ventes réalisées Chrono24 n'ont pas été vérifiées. Si ces derniers sont indisponibles, l'absence de moyenne convient-elle ou faut-il une autre source ?

## Suite suggérée
Vérifier l'accès à chaque type de données avant de promettre une moyenne ; puis passer au specifier, qui peut expliciter le comportement « données indisponibles ». Ne pas inventer de prix ou remplacer silencieusement les ventes réalisées par des annonces.
