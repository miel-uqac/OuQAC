# Spécification : validation du graphe dans le panel admin

- **Auteur :** Malo Besson
- **Date :** 2026-11-07
- **Branche :** `feat/validation-graphe` (issue de `projet-libre-8web101`)
- **Statut :** implémentée

## 1. Contexte et objectif

OùQAC calcule les itinéraires avec A* sur un graphe (`graph/graph.json`) saisi à la main dans le panel admin. Un itinéraire faux vient presque toujours d'un graphe faux : un chemin qui pointe vers un nœud supprimé, un couloir déconnecté du reste, un escalier marqué accessible PMR, une salle injoignable en fauteuil.

Aujourd'hui, ces erreurs ne se voient qu'en testant un itinéraire. L'objectif est de les détecter **au moment de la saisie**, dans le panel admin, pour que la cartographie des pavillons (tâche de Nicolas et William) produise un graphe fiable.

Cette tâche correspond à la ligne « Script de validation du graphe (nœuds isolés, liens d'étage, PMR) » de la proposition de projet.

### Hors périmètre

- Le coût des changements d'étage (escalier ≠ ascenseur) : tâche de Noé. Le validateur ne juge donc pas les distances des liaisons entre étages, seulement leur validité numérique.
- Une version en ligne de commande ou une vérification automatique sur les PR (GitHub Action). L'architecture la rend possible plus tard sans réécriture.
- La correction automatique des erreurs : le validateur signale, l'humain corrige.

## 2. Données d'entrée

Le validateur reçoit un objet JavaScript au format de `graph.json`, celui que produit déjà `generateGraphData()` dans `admin/js/controllers/ioController.js` :

```js
{
    nodes: [ { id, name, type, floor, lat, lng } ],
    paths: [ { id, startNode, endNode, type, distance, isPmr } ]
}
```

| Champ | Valeurs attendues |
|---|---|
| `node.type` | `salle`, `couloir`, `escalier`, `ascenseur`, `wc` (liste du sélecteur du panel admin) |
| `node.floor` | chaîne non vide (ex. `"1"`) |
| `node.lat`, `node.lng` | nombres finis |
| `path.type` | `indoor`, `outdoor` |
| `path.distance` | nombre ou chaîne numérique strictement positive (le fichier actuel stocke des chaînes, ex. `"2.95"`) |
| `path.isPmr` | booléen ; seul `false` exclut le chemin en mode PMR, comme dans `communaute/js/controllers/routeController.js` |

## 3. Architecture

| Fichier | Rôle |
|---|---|
| `shared/js/graphValidator.js` (nouveau) | Logique pure. Exporte `validateGraph(data)`. Aucune dépendance au DOM ni à Leaflet, donc testable avec Node et réutilisable. |
| `admin/js/controllers/validationController.js` (nouveau) | Pont avec le panel admin : récupère le graphe courant via `generateGraphData()`, appelle `validateGraph`, demande l'affichage, et gère le clic sur un problème (changement d'étage, centrage, sélection). |
| `admin/js/views/ui.js` | Nouvelle fonction d'affichage du rapport (résumé + liste). |
| `admin/index.html`, `admin/style.css` | Bouton « Valider le graphe » dans `#actions` et panneau `#panel-validation`. |
| `admin/js/controllers/ioController.js` | Seule modification : `generateGraphData` devient exportée. |
| `admin/js/main.js` | Branchement du bouton sur le contrôleur. |

Chaque nouveau fichier JS commence par un en-tête de commentaires au même format que les fichiers existants (application, fichier, rôle, description, fonctions principales, flux de données).

### Contrat de `validateGraph(data)`

```js
const report = validateGraph(data);
// report = {
//     valid: true | false,      // true si aucune erreur (les avertissements n'empêchent pas la validité)
//     errorCount: 2,
//     warningCount: 3,
//     issues: [
//         {
//             severity: 'error' | 'warning',
//             code: 'NOEUD_ISOLE',
//             message: 'Le nœud « P1-4 » (étage 1) n\'est relié à aucun chemin.',
//             nodeIds: ['node_123'],   // nœuds concernés, éventuellement vide
//             pathIds: []              // chemins concernés, éventuellement vide
//         }
//     ]
// }
```

Les problèmes sont triés : erreurs d'abord, puis avertissements ; à gravité égale, dans l'ordre des règles ci-dessous. Les messages sont en français et nomment l'élément par son nom (ou son id s'il n'a pas de nom) et son étage.

Le validateur ne lève jamais d'exception sur des données mal formées : une entrée absente ou incohérente devient un problème `DONNEE_INVALIDE`. Si `data`, `data.nodes` ou `data.paths` n'est pas exploitable, le rapport contient une seule erreur `DONNEE_INVALIDE` et les autres règles ne sont pas évaluées.

## 4. Règles

### Erreurs (cassent ou faussent l'itinéraire)

| # | Code | Condition | Pourquoi |
|---|---|---|---|
| E1 | `CHEMIN_NOEUD_INCONNU` | `startNode` ou `endNode` ne correspond à aucun nœud. | Le chemin est ignoré au chargement ; le réseau a un trou invisible. |
| E2 | `CHEMIN_BOUCLE` | `startNode === endNode`. | Chemin sans effet, signe d'une erreur de clic. |
| E3 | `CHEMIN_DOUBLON` | Deux chemins relient la même paire de nœuds (dans un sens ou dans l'autre). Un problème par paire, listant tous les chemins concernés. | A* peut prendre l'un ou l'autre ; si leurs propriétés diffèrent (PMR, distance), le résultat devient imprévisible. |
| E4 | `NOEUD_ISOLE` | Le nœud n'est l'extrémité d'aucun chemin valide. | Aucun itinéraire ne peut partir de ce nœud ni y arriver. |
| E5 | `GRAPHE_MORCELE` | Le graphe a plusieurs composantes connexes (en ignorant les nœuds isolés, déjà signalés par E4). La plus grande composante est considérée comme le réseau principal ; chaque autre composante produit un problème listant ses nœuds. | Ces nœuds sont injoignables depuis le reste du campus. |
| E6 | `ETAGE_SANS_ESCALIER` | Un chemin relie deux étages différents et au moins une extrémité n'est ni `escalier` ni `ascenseur`. | Le panel admin l'interdit à la création, mais un import JSON ou une modification de type peut l'introduire. |
| E7 | `ESCALIER_PMR` | Un chemin relie deux étages différents, au moins une extrémité est un `escalier`, et `isPmr` n'est pas `false`. | Le mode PMR ferait emprunter un escalier à une personne en fauteuil. |
| E8 | `SALLE_INACCESSIBLE_PMR` | En ne gardant que les chemins PMR (`isPmr !== false`), une salle (`salle` ou `wc`) n'appartient pas à la plus grande composante. Les salles déjà signalées par E4 ou E5 sont ignorées. Un problème par salle. | La salle est joignable à pied mais pas en fauteuil : le mode PMR échouera. |

« Chemin valide » pour E4, E5 et E8 : chemin dont les deux extrémités existent et sont différentes (les chemins E1 et E2 sont exclus du calcul de connexité).

### Avertissements (suspects, n'empêchent pas le calcul)

| # | Code | Condition | Pourquoi |
|---|---|---|---|
| W1 | `SALLE_SANS_NOM` | Nœud de type `salle` ou `wc` dont le nom est vide (après suppression des espaces). | Introuvable par la recherche. |
| W2 | `NOM_DOUBLON` | Plusieurs nœuds portent le même nom non vide (comparaison après suppression des espaces, sensible à la casse). Un problème par nom. | La recherche ne sait pas lequel proposer. |
| W3 | `DISTANCE_INVALIDE` | `Number(distance)` n'est pas un nombre fini strictement positif. | Le moteur d'itinéraire remplace alors la distance par 1, ce qui fausse le calcul. |
| W4 | `LIAISON_ETAGE_MANQUANTE` | Nœud `escalier` ou `ascenseur` sans aucun chemin valide vers un autre étage. | Probable oubli de liaison verticale. |
| W5 | `DONNEE_INVALIDE` | Type de nœud ou de chemin inconnu, `id` absent, `floor` vide, `lat`/`lng` non numériques, `isPmr` non booléen, ou `id` en double. | Données incohérentes, souvent issues d'un import ou d'une édition manuelle du JSON. |

## 5. Interface du panel admin

- Un bouton **« Valider le graphe »** est ajouté dans la zone `#actions`, à côté de « Sauvegarder » et « Importer ».
- Un clic affiche le panneau `#panel-validation` dans la barre latérale, avec :
  - un résumé : « Graphe valide » (vert) ou « 2 erreurs, 3 avertissements » (rouge ou orange) ;
  - la liste des problèmes, chaque ligne affichant la gravité (couleur + libellé), le message, et étant cliquable si elle concerne au moins un nœud ou un chemin ;
  - un bouton pour fermer le panneau.
- Un clic sur un problème :
  1. passe la carte à l'étage du premier nœud concerné (même enchaînement que le sélecteur d'étage : mise à jour du `<select>`, `setFloor`, `filterMapElements`) ;
  2. centre la carte sur ce nœud ;
  3. le sélectionne avec la fonction existante (`NodeCtrl.selectNode`), ou sélectionne le chemin (`PathCtrl.selectPath`) si le problème ne concerne qu'un chemin.
- La validation est relancée à chaque clic sur le bouton (pas de validation automatique en continu, pour garder le panel réactif et le comportement prévisible).

## 6. Tests

- Fichier `tests/graphValidator.test.js`, exécuté avec le lanceur intégré de Node : `node --test tests/`. Aucune dépendance à installer.
- Pour chaque règle : un petit graphe construit dans le test qui la déclenche, et un graphe proche qui ne la déclenche pas.
- Un test sur le vrai `graph/graph.json` : il ne doit contenir aucune erreur de structure (E1 à E7). Le premier passage du validateur (2026-11-07) a révélé deux salles injoignables en mode PMR, `V1-1010` et `V1-1260` ; le test fige cette liste en attendant la correction des données.
- Un test de robustesse : `validateGraph(null)`, `validateGraph({})` et des champs manquants ne lèvent pas d'exception.
- Vérification manuelle dans le navigateur : ouvrir le panel admin, valider le graphe actuel, puis créer volontairement un nœud isolé et une liaison d'escalier PMR, et vérifier qu'ils sont signalés et que le clic recentre la carte.

## 7. Documentation

- **Locale :** cette spécification, et `docs/validation-graphe.md` qui explique chaque règle avec un exemple, comment lancer les tests, et comment ajouter une règle.
- **Code :** en-têtes de fichiers et commentaires sur chaque règle (le « pourquoi », pas seulement le « quoi »).
- **GitHub (après accord de Malo) :** description de PR détaillée vers `projet-libre-8web101`, et page Wiki « Validation du graphe » reprenant `docs/validation-graphe.md`.

## 8. Branches

- `projet-libre-8web101` : branche d'intégration de l'équipe, créée depuis `main`.
- `feat/validation-graphe` : cette tâche, créée depuis `projet-libre-8web101`, fusionnée par PR relue par un coéquipier.
- Aucun commit, push ni fusion sur `main`.
