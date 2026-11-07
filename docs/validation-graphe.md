# Validation du graphe

Le validateur vérifie que le graphe de navigation (`graph/graph.json`) est cohérent avant qu'il ne serve au calcul d'itinéraire. Il signale les problèmes ; c'est à l'administrateur de les corriger dans le panel admin.

## Utilisation dans le panel admin

1. Ouvrir `admin/` (serveur local : `python3 -m http.server 8000`, puis `http://localhost:8000/admin/`).
2. Cliquer sur **Valider le graphe** (en bas de la barre latérale).
3. Le panneau affiche un résumé puis la liste des problèmes, erreurs d'abord.
4. Cliquer sur un problème pour aller directement au nœud ou au chemin concerné.

La validation porte sur le graphe en cours d'édition (celui que « Sauvegarder » exporterait).

## Erreurs et avertissements

- Une **erreur** casse ou fausse l'itinéraire : à corriger avant de publier le graphe.
- Un **avertissement** signale une donnée suspecte qui ne bloque pas le calcul.

## Les règles

### Erreurs

| Code | Ce qui est détecté | Pourquoi c'est un problème | Comment corriger |
|---|---|---|---|
| `CHEMIN_NOEUD_INCONNU` | Un chemin pointe vers un nœud qui n'existe pas. | Le chemin est ignoré au chargement : trou invisible dans le réseau. | Supprimer le chemin et le recréer entre les bons nœuds. |
| `CHEMIN_BOUCLE` | Un chemin relie un nœud à lui-même. | Chemin inutile, signe d'une erreur de clic. | Supprimer le chemin. |
| `CHEMIN_DOUBLON` | Deux chemins relient les mêmes nœuds. | A* peut prendre l'un ou l'autre ; si leurs propriétés diffèrent, le résultat est imprévisible. | Garder un seul chemin. |
| `NOEUD_ISOLE` | Un nœud n'est relié à aucun chemin. | Aucun itinéraire ne peut y arriver. | Le relier au couloir le plus proche, ou le supprimer. |
| `GRAPHE_MORCELE` | Un groupe de nœuds est coupé du reste du réseau. | Ces nœuds sont injoignables depuis le reste du campus. | Ajouter le chemin manquant entre le groupe et le réseau. |
| `ETAGE_SANS_ESCALIER` | Un chemin change d'étage sans relier deux escaliers ou ascenseurs. | Itinéraire physiquement impossible. | Relier les étages par des nœuds `escalier` ou `ascenseur`. |
| `ESCALIER_PMR` | Une liaison d'escalier entre étages est marquée PMR. | Le mode PMR ferait prendre un escalier à une personne en fauteuil. | Décocher « Accessible PMR » sur ce chemin. |
| `SALLE_INACCESSIBLE_PMR` | Une salle n'est joignable par aucun chemin PMR. | Le mode PMR ne trouvera pas d'itinéraire vers cette salle. | Vérifier sur le terrain s'il existe un accès (ascenseur, rampe) et l'ajouter ; sinon, le documenter. |

### Avertissements

| Code | Ce qui est détecté | Pourquoi c'est suspect |
|---|---|---|
| `SALLE_SANS_NOM` | Salle ou toilettes sans nom. | Introuvable par la recherche. |
| `NOM_DOUBLON` | Plusieurs nœuds portent le même nom. | La recherche ne sait pas lequel proposer. |
| `DISTANCE_INVALIDE` | Distance non numérique, nulle ou négative. | Le moteur la remplace par 1, ce qui fausse le calcul. |
| `LIAISON_ETAGE_MANQUANTE` | Escalier ou ascenseur relié à aucun autre étage. | Probable oubli de liaison verticale. |
| `DONNEE_INVALIDE` | Type inconnu, étage vide, coordonnées invalides, PMR non booléen, identifiant absent ou en double. | Données incohérentes, souvent après un import ou une édition manuelle du JSON. |

## Notions utilisées

- **Graphe** : des nœuds (salles, couloirs, escaliers, ascenseurs) reliés par des chemins. Les chemins ne sont pas orientés : on peut les parcourir dans les deux sens.
- **Composante connexe** : un groupe de nœuds tous joignables entre eux. Un graphe sain n'en a qu'une. Le validateur les calcule par un **parcours en largeur** (BFS) : on part d'un nœud, on visite ses voisins, puis les voisins des voisins, jusqu'à épuisement ; tout ce qui a été visité forme une composante.
- **Réseau principal** : la plus grande composante. Tout le reste est signalé.
- **Mode PMR** : le moteur d'itinéraire ignore les chemins marqués `isPmr: false`. Le validateur refait le calcul de composantes sur ce sous-graphe pour trouver les salles qui deviennent injoignables.

## Lancer les tests

Depuis la racine du dépôt (Node 18 ou plus, rien à installer) :

```bash
node --test tests/graphValidator.test.js
```

## Ajouter une règle

1. Dans `tests/graphValidator.test.js`, écrire un test qui construit un petit graphe déclenchant la règle (partir de `baseGraph()`), et un test proche qui ne la déclenche pas.
2. Lancer les tests : le nouveau doit échouer.
3. Dans `shared/js/graphValidator.js`, écrire une fonction `checkXxx(...)` sous le bandeau `RÈGLES`, l'appeler dans `validateGraph`, et ajouter son code dans `CODE_ORDER`.
4. Relancer les tests : tout doit passer.
5. Documenter la règle dans ce fichier.

## Constat sur les données actuelles (2026-11-07)

Le `graph.json` actuel n'a aucune erreur de structure. En revanche, les salles **V1-1010** et **V1-1260** sont injoignables en mode PMR : on n'y accède que par l'escalier `V2-Escalier-1 ↔ V1-Escalier-1` ou par le chemin non PMR `P1-Escalier-1 ↔ P1-Sortie-1`. À vérifier sur le terrain : s'il existe un accès adapté, l'ajouter au graphe ; sinon, documenter que ces salles ne sont pas accessibles.

## Fichiers

| Fichier | Rôle |
|---|---|
| `shared/js/graphValidator.js` | Les règles (logique pure, sans DOM). |
| `admin/js/controllers/validationController.js` | Lance la validation et navigue vers les problèmes. |
| `admin/js/views/ui.js` | Affiche le rapport (`renderValidationReport`). |
| `tests/graphValidator.test.js` | Tests unitaires. |
| `docs/specs/2026-11-07-validation-graphe-design.md` | Spécification de conception. |
