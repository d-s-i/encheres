// Generated from .ai/tasks/IMPORT-001/features/importer-favoris-vente.feature; do not edit manually.
import test from 'node:test';
import { runScenario } from '../../../../../test/favorite-acceptance-steps.mjs';
const scenarios = [
  {
    "name": "IMPORT-001-S01 Retrouver les favoris de la vente choisie sans lancer d'étude",
    "steps": [
      {
        "keyword": "Given",
        "text": "l'utilisateur est connecté sur le site Interencheres et a mis en favoris les lots 201 et 202 de la vente A Crédit Municipal"
      },
      {
        "keyword": "And",
        "text": "la vente B Cap Enchères contient le lot 1002 mis en favori"
      },
      {
        "keyword": "When",
        "text": "l'utilisateur choisit la vente A dans l'extension depuis la page Favoris et lance l'import direct"
      },
      {
        "keyword": "Then",
        "text": "une fenêtre modale ouverte propose le bouton Lancer l'analyse pour les lots 201 et 202 de la vente A"
      },
      {
        "keyword": "And",
        "text": "le lot 1002 de la vente B n'est pas inclus dans cette analyse"
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
        "text": "la vente A affiche le lot 201 mis en favori et le lot 203 suivi uniquement par un ordre d'achat dans la source contrôlée"
      },
      {
        "keyword": "When",
        "text": "l'utilisateur choisit la vente A dans l'extension depuis la page Favoris et lance l'import direct"
      },
      {
        "keyword": "Then",
        "text": "l'analyse proposée contient le lot 201 de la vente A"
      },
      {
        "keyword": "And",
        "text": "le lot 203 n'est pas inclus dans cette analyse"
      }
    ],
    "examples": []
  },
  {
    "name": "IMPORT-001-S03 Importer aussi les favoris des pages suivantes",
    "steps": [
      {
        "keyword": "Given",
        "text": "les favoris de la vente A sont répartis sur plusieurs pages dans une source contrôlée"
      },
      {
        "keyword": "And",
        "text": "le lot 201 est sur la première page et le lot 202 sur une page suivante"
      },
      {
        "keyword": "When",
        "text": "l'utilisateur choisit la vente A dans l'extension depuis la page Favoris et lance l'import direct"
      },
      {
        "keyword": "Then",
        "text": "l'analyse proposée couvre les lots 201 et 202 de la vente A"
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
        "text": "les lots 201 et 202 de la vente A ont été importés dans l'application Vercel"
      },
      {
        "keyword": "When",
        "text": "une autre personne ouvre le lien public de retour d'import de la vente A"
      },
      {
        "keyword": "Then",
        "text": "elle peut voir le bouton Lancer l'analyse de cette vente"
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
        "text": "l'extension est disponible dans son navigateur et présente les ventes Crédit Municipal de ses favoris"
      },
      {
        "keyword": "And",
        "text": "la sélection d'une vente seule n'importe encore aucun lot"
      }
    ],
    "examples": []
  },
  {
    "name": "IMPORT-001-S07 Refuser les favoris d'une autre maison de ventes",
    "steps": [
      {
        "keyword": "Given",
        "text": "la page Favoris contient le lot 1002 d'une vente Cap Enchères et le lot 201 d'une vente Crédit Municipal"
      },
      {
        "keyword": "When",
        "text": "l'utilisateur ouvre l'extension depuis la page Favoris"
      },
      {
        "keyword": "Then",
        "text": "seule la vente Crédit Municipal est proposée à l'import"
      },
      {
        "keyword": "And",
        "text": "aucun lot de Cap Enchères n'est ajouté à l'application"
      }
    ],
    "examples": []
  },
  {
    "name": "IMPORT-001-S08 Étudier tous les favoris vérifiés d'une vente Crédit Municipal après confirmation",
    "steps": [
      {
        "keyword": "Given",
        "text": "les lots 201 et 202 favoris de la vente Crédit Municipal sont importés sans étude"
      },
      {
        "keyword": "When",
        "text": "l'utilisateur confirme le lancement de l'étude pour tous les lots de cette vente"
      },
      {
        "keyword": "Then",
        "text": "la progression dans la fenêtre modale indique le numéro du lot en cours et le nombre de lots traités"
      },
      {
        "keyword": "And",
        "text": "un indicateur animé et le temps écoulé restent visibles pendant l'étude de chaque lot"
      },
      {
        "keyword": "And",
        "text": "une étude distincte est sauvegardée pour les lots 201 et 202"
      },
      {
        "keyword": "And",
        "text": "l'import seul n'avait lancé aucune recherche de prix"
      }
    ],
    "examples": []
  },
  {
    "name": "IMPORT-001-S09 Continuer après un lot déjà étudié et un lot en échec",
    "steps": [
      {
        "keyword": "Given",
        "text": "les lots 201, 202 et 203 sont importés pour une vente Crédit Municipal dans une source contrôlée et le lot 201 a déjà son étude"
      },
      {
        "keyword": "And",
        "text": "le lot 203 ne peut pas être étudié"
      },
      {
        "keyword": "When",
        "text": "l'utilisateur lance l'étude pour tous les lots de cette vente"
      },
      {
        "keyword": "Then",
        "text": "le lot 202 est étudié sans modifier l'étude existante du lot 201"
      },
      {
        "keyword": "And",
        "text": "le bilan indique un lot créé, un déjà étudié et un échec pour le lot 203"
      }
    ],
    "examples": []
  },
  {
    "name": "IMPORT-001-S10 Montrer une seule action principale et le tableau directement en dessous",
    "steps": [
      {
        "keyword": "Given",
        "text": "les lots 201 et 202 favoris de la vente Crédit Municipal sont importés sans étude"
      },
      {
        "keyword": "When",
        "text": "l'utilisateur ouvre la page principale sans lien de retour d'import"
      },
      {
        "keyword": "Then",
        "text": "le bouton Commencer une nouvelle analyse précède le tableau visible et la fenêtre modale est fermée"
      },
      {
        "keyword": "And",
        "text": "aucun lot en attente ni liste de favoris n'est affiché sur la page principale"
      },
      {
        "keyword": "And",
        "text": "le formulaire manuel et l'aide à l'import restent cachés jusqu'au choix de l'utilisateur"
      }
    ],
    "examples": []
  },
  {
    "name": "IMPORT-001-S11 Retrouver une étude sauvegardée sans afficher les favoris en attente",
    "steps": [
      {
        "keyword": "Given",
        "text": "les lots 201 et 202 favoris de la vente Crédit Municipal sont importés et le lot 201 est déjà étudié"
      },
      {
        "keyword": "When",
        "text": "l'utilisateur ouvre la page principale sans lien de retour d'import"
      },
      {
        "keyword": "Then",
        "text": "l'étude du lot 201 apparaît dans le tableau visible avec un lien vers sa fiche"
      },
      {
        "keyword": "And",
        "text": "aucun accordéon ne masque le tableau des études"
      },
      {
        "keyword": "And",
        "text": "aucun bouton Lancer l'analyse n'apparaît sans lien de retour d'import"
      }
    ],
    "examples": []
  },
  {
    "name": "IMPORT-001-S12 Choisir comment commencer une nouvelle analyse",
    "steps": [
      {
        "keyword": "Given",
        "text": "la page principale est ouverte sans lien de retour d'import"
      },
      {
        "keyword": "When",
        "text": "l'utilisateur clique sur Commencer une nouvelle analyse"
      },
      {
        "keyword": "Then",
        "text": "une fenêtre modale lui propose Importer mes favoris ou Analyser un lot seul"
      },
      {
        "keyword": "And",
        "text": "aucune étude ne démarre par ce seul clic"
      }
    ],
    "examples": []
  },
  {
    "name": "IMPORT-001-S13 Garder la fenêtre modale pendant l'étude manuelle et afficher son résultat",
    "steps": [
      {
        "keyword": "Given",
        "text": "le lot 202 est identifiable dans une vente Crédit Municipal et n'a pas encore d'étude"
      },
      {
        "keyword": "When",
        "text": "l'utilisateur ouvre la fenêtre modale, choisit Analyser un lot seul et lance son étude"
      },
      {
        "keyword": "Then",
        "text": "le chargement et le temps écoulé restent dans la fenêtre modale pendant la recherche"
      },
      {
        "keyword": "And",
        "text": "une fois l'étude terminée la fenêtre modale indique le résultat avec un lien vers la fiche du lot"
      },
      {
        "keyword": "And",
        "text": "le bouton Voir le tableau termine le parcours"
      }
    ],
    "examples": []
  }
];
for (const scenario of scenarios) {
  test(scenario.name, async () => runScenario(scenario));
}
