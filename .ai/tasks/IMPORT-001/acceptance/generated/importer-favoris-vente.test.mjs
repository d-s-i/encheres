// Generated from .ai/tasks/IMPORT-001/features/importer-favoris-vente.feature; do not edit manually.
import test from 'node:test';
import { runScenario } from '../../../../../test/favorite-acceptance-steps.mjs';
const scenarios = [
  {
    "name": "IMPORT-001-S01 Retrouver les favoris de la vente choisie sans lancer d'étude",
    "steps": [
      {
        "keyword": "Given",
        "text": "l'utilisateur est connecté sur le site Interencheres et a mis en favoris les lots 1002 et 1003 de la vente A"
      },
      {
        "keyword": "And",
        "text": "la vente B contient aussi un lot 1002 mis en favori"
      },
      {
        "keyword": "When",
        "text": "l'utilisateur choisit la vente A dans l'extension depuis la page Favoris et lance l'import direct"
      },
      {
        "keyword": "Then",
        "text": "l'application présente les lots 1002 et 1003 rattachés à la vente A"
      },
      {
        "keyword": "And",
        "text": "elle ne présente pas le lot 1002 de la vente B parmi les favoris importés de la vente A"
      },
      {
        "keyword": "And",
        "text": "aucune étude de prix n'est lancée par cet import"
      },
      {
        "keyword": "And",
        "text": "aucun raccourci javascript ou collage manuel de liste n'est nécessaire"
      }
    ],
    "examples": []
  },
  {
    "name": "IMPORT-001-S02 Exclure un lot suivi uniquement par un ordre d'achat",
    "steps": [
      {
        "keyword": "Given",
        "text": "la vente A affiche le lot 1002 mis en favori et le lot 1004 suivi uniquement par un ordre d'achat"
      },
      {
        "keyword": "When",
        "text": "l'utilisateur choisit la vente A dans l'extension depuis la page Favoris et lance l'import direct"
      },
      {
        "keyword": "Then",
        "text": "le lot 1002 apparaît parmi les favoris importés de la vente A"
      },
      {
        "keyword": "And",
        "text": "le lot 1004 n'apparaît pas parmi les favoris importés de la vente A"
      }
    ],
    "examples": []
  },
  {
    "name": "IMPORT-001-S03 Importer aussi les favoris des pages suivantes",
    "steps": [
      {
        "keyword": "Given",
        "text": "les favoris de la vente A sont répartis sur plusieurs pages du site Interencheres"
      },
      {
        "keyword": "And",
        "text": "le lot 1002 est sur la première page et le lot 1003 sur une page suivante"
      },
      {
        "keyword": "When",
        "text": "l'utilisateur choisit la vente A dans l'extension depuis la page Favoris et lance l'import direct"
      },
      {
        "keyword": "Then",
        "text": "les lots 1002 et 1003 apparaissent parmi les favoris importés de la vente A"
      },
      {
        "keyword": "And",
        "text": "l'application n'annonce pas un import complet si une page de favoris n'a pas été consultée"
      }
    ],
    "examples": []
  },
  {
    "name": "IMPORT-001-S04 Refuser de présenter un ordre ou un lot non vérifié comme favori",
    "steps": [
      {
        "keyword": "Given",
        "text": "la source de la vente A ne permet pas de distinguer un favori d'un lot suivi seulement par un ordre"
      },
      {
        "keyword": "When",
        "text": "l'utilisateur tente d'importer la vente A par l'extension depuis cette source ambiguë"
      },
      {
        "keyword": "Then",
        "text": "l'application n'ajoute aucun lot non identifié comme favori"
      },
      {
        "keyword": "And",
        "text": "elle indique que la liste des favoris de cette vente n'a pas pu être vérifiée"
      }
    ],
    "examples": []
  },
  {
    "name": "IMPORT-001-S05 Consulter les favoris importés sur l'application Vercel",
    "steps": [
      {
        "keyword": "Given",
        "text": "les lots 1002 et 1003 de la vente A ont été importés dans l'application Vercel"
      },
      {
        "keyword": "When",
        "text": "une autre personne ouvre l'application Vercel avec son adresse publique"
      },
      {
        "keyword": "Then",
        "text": "elle peut voir les favoris importés 1002 et 1003 de la vente A"
      },
      {
        "keyword": "And",
        "text": "elle ne voit aucune étude de prix créée par le seul import"
      }
    ],
    "examples": []
  },
  {
    "name": "IMPORT-001-S06 Installer l'extension sans boutique et ouvrir le choix de vente",
    "steps": [
      {
        "keyword": "Given",
        "text": "le dossier de l'extension est disponible sur la machine et Chromium est installé"
      },
      {
        "keyword": "When",
        "text": "l'utilisateur charge ce dossier comme extension non empaquetée dans Chromium"
      },
      {
        "keyword": "And",
        "text": "il ouvre la page Favoris de son compte Interencheres"
      },
      {
        "keyword": "Then",
        "text": "l'extension est disponible dans son navigateur et présente les ventes de ses favoris"
      },
      {
        "keyword": "And",
        "text": "la sélection d'une vente seule n'importe encore aucun lot"
      }
    ],
    "examples": []
  }
];
for (const scenario of scenarios) {
  test(scenario.name, async () => runScenario(scenario));
}
