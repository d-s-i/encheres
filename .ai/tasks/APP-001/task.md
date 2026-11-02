# APP-001 — Étudier un lot par chat et retrouver son tableau d'analyse sauvegardé

## Demande d'origine
L'utilisateur veut une application avec un chatbot où indiquer la vente et le numéro de lot, une conversation Pi orchestrant l'étude en arrière-plan, et un tableau sauvegardé par lot reproduisant le modèle de son classeur Google Sheets. Cette tâche est la troisième des trois demandées.

## Objectif compris
Permettre de lancer une étude depuis une demande en langage naturel, de consulter son tableau de résultats et de retrouver les études précédentes.

## Acteur et périmètre proposé
- Acteur : utilisateur qui examine plusieurs lots dans différentes ventes.
- Recevoir une demande décrivant l'enchère et son lot, la clarifier si elle est ambiguë, et lancer les étapes LOT-001 et PRICE-001 via une interaction avec Pi, sans présumer de la technique d'intégration.
- Afficher pour chaque étude un tableau avec les données du lot, les comparaisons disponibles, leurs provenances et les données manquantes, selon la structure visible dans la capture fournie. Les colonnes visibles sont : vente et numéro de lot, marque, type, boîtes, bracelet, mise à prix, prix Chrono24 moyen, moyenne des ventes Crédit municipal, plusieurs colonnes de ventes historiques datées et observations. Le nombre et les dates des colonnes de ventes historiques dans la capture ne constituent pas une limite fixe pour de nouvelles analyses.
- Sauvegarder et permettre de retrouver les analyses de lots ; distinguer au minimum les ventes lorsque leurs numéros de lot coïncident.
- Montrer clairement les erreurs d'accès aux sources ou l'insuffisance de comparables plutôt qu'un tableau chiffré fictif.

## Hors périmètre proposé
- Définition des algorithmes de collecte et de comparaison (LOT-001 et PRICE-001).
- Synchronisation ou modification du classeur Google Sheets, sauf demande ultérieure ; il sert ici de modèle visuel et fonctionnel.
- Choix du framework, du stockage, de l'API Pi ou de l'hébergement lors de l'initialisation.

## Contraintes confirmées
- L'expérience souhaitée part d'un prompt et aboutit à un tableau ; chaque lot étudié doit rester consultable. L'utilisateur cite expressément une conversation Pi en arrière-plan.
- La capture de `~/Images/Screenshots/screenshot-2026-11-02_00-47-47.png` fournit la structure visuelle de référence ; elle montre des valeurs historiques datées et des observations libres. La capture est une référence de présentation, pas une preuve de l'origine ni de la nature des prix sous-jacents.
- L'utilisateur craint que le fichier `.xlsx` d'origine soit infecté ; ne pas l'ouvrir ou le télécharger pour cette tâche. La capture suffit à documenter les colonnes visibles.

## Hypothèses explicites
- « Comme le tableau » signifie reproduire les informations et leur organisation utiles dans l'application, pas écrire dans Google Sheets ; ce point n'a pas été confirmé.
- LOT-001 et PRICE-001 livreront des résultats exploitables par l'interface ; leurs détails ne sont pas définis ici.

## Questions non bloquantes
- Faut-il une vue unique regroupant tous les lots comme sur la capture en plus d'un tableau par lot ? La demande explicite « tableau pour chaque lot » sert de comportement initial ; le specifier pourra documenter cette hypothèse.
- L'utilisateur confirme qu'il n'y a pas de formules dans le classeur. La capture n'établit pas la provenance des valeurs ni le sens précis des couleurs ; ne pas les inventer.
- L'utilisateur confirme que le tableau doit présenter le coût d'un achat en ligne. Les CGV du Crédit Municipal de Paris datées du 24/04/2026 précisent 18 % TTC de frais acheteur sur l'adjudication et 1,2 % TTC supplémentaires via la plateforme live (soit 19,2 % au total en ligne). Le tableau doit distinguer adjudication, taux et coût en ligne frais compris ; vérifier les conditions des ventes historiques et éviter les frais comptés deux fois. Les frais de livraison ou stockage ne sont pas inclus sans indication spécifique.
- L'application est exclusivement destinée à l'étude de montres ; les autres types de lots sont hors périmètre. Exemple de vente fourni : https://www.creditmunicipal.fr/en/ventes-aux-encheres/catalogue-des-ventes/ventes-passees/260620000/.

## Question d'architecture à traiter plus tard
- Quel mode d'intégration à Pi convient à l'application et à son environnement d'exécution ? Ne pas choisir avant d'avoir défini l'usage et les contraintes d'accès.

## Suite suggérée
Confier au specifier les comportements de chat, de sauvegarde et d'affichage à partir des colonnes visibles. L'implémentation du flux complet dépend des capacités livrées par LOT-001 et PRICE-001.
