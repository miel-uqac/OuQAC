# Convention : on parle en « niveaux »

OùQAC désigne les étages par leur **niveau**, comme l'UQAC sur ses plans et dans ses codes de salle.

| Valeur dans les données (`floor`) | Affiché dans l'application | Sur place à l'UQAC |
|---|---|---|
| `"0"` | Niveau 0 | NIVEAU 0 |
| `"1"` | Niveau 1 | NIVEAU 1, salles `P1-…`, `V1-…` |
| `"2"` | Niveau 2 | NIVEAU 2, salles `P2-…` |

La valeur stockée et le texte affiché sont **le même nombre**. La salle `V1-1010` est au niveau 1 (`"floor": "1"`) et l'application l'affiche « Niveau 1 ».

## Pourquoi

Avant cette convention, l'interface affichait « Étage N+1 » (le niveau 0 apparaissait comme « Étage 1 », convention nord-américaine), alors que les instructions d'itinéraire affichaient la valeur brute. Pour la salle V1-1010 (`"floor": "1"`), le menu indiquait « Étage 2 » et l'instruction « jusqu'à l'étage 1 » : deux nombres différents pour le même endroit. Parler en niveaux supprime le décalage et correspond à ce que l'utilisateur lit sur les plans et les portes de l'UQAC.

## Où c'est appliqué

| Fichier | Texte |
|---|---|
| `admin/index.html` | Sélecteur « Niveau 0 » à « Niveau 7 », « Chemins vers autres niveaux » |
| `admin/js/views/ui.js` | Liste des nœuds et raccourcis inter-niveaux : « Niveau N » |
| `communaute/index.html` | Boutons de niveau 0 à 7 (avec `title` et `aria-label` « Niveau N ») |
| `communaute/js/controllers/routeController.js` | Instruction « Prendre l'ascenseur jusqu'au niveau N ». Les virages disent « Tourner à gauche près de P1-C1 » (et non plus « au niveau de », devenu ambigu) |
| `communaute/js/views/ui.js` | Info-bulle « Changement de niveau » |

## Pour la saisie du graphe

Dans le panel admin, choisir le niveau qui correspond au **premier chiffre du code de salle** : `P1-4000` → Niveau 1. Le niveau 0 est le rez-de-chaussée bas des plans « NIVEAU 0 ».
