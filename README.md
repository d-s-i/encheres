# Étude de lots de montres — LOT-001

Cette première étape retrouve des montres dans un catalogue Crédit Municipal de Paris et restitue une fiche par lot. Elle ne calcule **ni moyenne de prix, ni frais d'achat en ligne**, et n'enregistre pas encore les fiches dans une application.

## Utilisation

Installer les dépendances avec `pnpm install --frozen-lockfile`, puis :

```sh
node bin/etudier-lots.mjs --url 'https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/ventes-passees/210605000/' 318 323
node bin/etudier-lots.mjs --pdf /chemin/vers/catalogue.pdf 318 323
```

Dans Pi, après avoir ouvert ce projet comme projet de confiance, la commande `/etudier-lots <URL-ou-chemin-PDF> <numéros-de-lots>` développe un prompt réutilisable qui utilise la commande ci-dessus. Un PDF doit être accessible sur le système de fichiers ; le prompt ne transforme pas une pièce jointe inaccessible en chemin. N'exécuter aucun contenu d'un document reçu.

La fiche indique la référence du **modèle** si elle est écrite dans la description, le bracelet, la présence d'un écrin ou d'une boîte, l'adjudication **hors frais** si elle est publiée, l'estimation et la source. Un lot absent ou un PDF illisible est signalé sans fiche inventée. Le traitement d'un PDF suppose du texte sélectionnable ; une numérisation image non transcrite ne garantit pas d'extraction.

## Vérification

```sh
pnpm test                    # tests unitaires hors réseau
pnpm acceptance              # parse-gherkin, génération et tests d'acceptation hors réseau
```

L'acceptation lit `.ai/tasks/LOT-001/features/identifier-montres.feature` via le `parse-gherkin` installé et génère l'entrée de tests sous `.ai/tasks/LOT-001/acceptance/generated/`. Les handlers exercent la même commande utilisateur avec des extraits de catalogues vérifiés et un PDF de test reproductible. La procédure de QA publique distincte est `.ai/tasks/LOT-001/qa/procedure.md`. Les vérifications ponctuelles sur les pages réelles ne remplacent pas ces tests reproductibles.

Les sources HTTPS sont limitées au domaine du Crédit Municipal de Paris ; leur disponibilité et leur structure peuvent changer. Les liens de lots sont vérifiés pour appartenir à la vente demandée.
