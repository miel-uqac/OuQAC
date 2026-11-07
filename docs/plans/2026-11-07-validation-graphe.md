# Plan d'implémentation : validation du graphe

> **Pour les agents :** sous-compétence requise : superpowers:subagent-driven-development (recommandé) ou superpowers:executing-plans pour exécuter ce plan tâche par tâche. Les étapes utilisent des cases à cocher (`- [ ]`).

**Objectif :** détecter dans le panel admin les erreurs du graphe de navigation (références cassées, morceaux déconnectés, liaisons d'étage incorrectes, salles injoignables en PMR) et amener l'administrateur directement sur l'élément fautif.

**Architecture :** un module pur `shared/js/graphValidator.js` (aucune dépendance au DOM ni à Leaflet) prend le JSON du graphe et renvoie un rapport. Un contrôleur admin `validationController.js` lui fournit le graphe courant via `generateGraphData()` et affiche le rapport via `ui.js`. Les tests tournent avec le lanceur intégré de Node.

**Technologies :** JavaScript ES6 (modules), Leaflet 1.9.4 (déjà présent), `node:test` et `node:assert` (intégrés à Node 18+, aucune installation).

**Spécification :** [docs/specs/2026-11-07-validation-graphe-design.md](../specs/2026-11-07-validation-graphe-design.md)

## Contraintes globales

- Travailler sur la branche `feat/validation-graphe` (issue de `projet-libre-8web101`). **Aucun commit, push ni fusion sur `main`.** Vérifier avec `git branch --show-current` avant chaque commit.
- Identité git du dépôt : `Malo Besson <146385319+MaleauBSN@users.noreply.github.com>` (déjà configurée en local).
- Messages de commit en français, préfixés (`feat:`, `test:`, `docs:`, `fix:`), sans ligne `Co-Authored-By` : les commits sont uniquement au nom de Malo.
- Chaque nouveau fichier JS commence par un en-tête de commentaires au format des fichiers existants (APPLICATION, FICHIER, RÔLE, DESCRIPTION, FONCTIONS PRINCIPALES, FLUX DE DONNÉES / TRAVAIL).
- Commentaires et messages affichés en français ; les commentaires expliquent le « pourquoi ».
- Aucune dépendance npm, aucun `package.json`.
- Les tests se lancent depuis la racine du dépôt avec : `node --test tests/graphValidator.test.js` (passer le fichier explicitement : avec Node 26, `node --test tests/` cherche un fichier nommé `tests` et échoue).
- En mode PMR, seul `isPmr === false` exclut un chemin (même règle que `communaute/js/controllers/routeController.js`).

## Structure des fichiers

| Fichier | Action | Responsabilité |
|---|---|---|
| `shared/js/graphValidator.js` | Créer | Toutes les règles, logique pure. Export unique : `validateGraph(data)`. |
| `tests/graphValidator.test.js` | Créer | Tests unitaires par règle + test sur `graph/graph.json`. |
| `admin/js/controllers/ioController.js` | Modifier | Exporter `generateGraphData`. |
| `admin/js/controllers/validationController.js` | Créer | `runValidation()`, `focusIssue(issue)`. |
| `admin/js/views/ui.js` | Modifier | `renderValidationReport(report, onIssueClick)`, `hideValidationReport()`. |
| `admin/index.html` | Modifier | Bouton `#btn-validate-graph`, panneau `#panel-validation`. |
| `admin/style.css` | Modifier | Styles du bouton et du panneau. |
| `admin/js/main.js` | Modifier | Branchement des boutons. |
| `docs/validation-graphe.md` | Créer | Explication des règles, tests, ajout d'une règle. |
| `README.md` | Modifier | Mention de la validation et commande de test. |

### Contrat du rapport (utilisé par toutes les tâches)

```js
validateGraph(data) // data = { nodes: [...], paths: [...] } au format graph.json
// => {
//     valid: boolean,          // true si errorCount === 0
//     errorCount: number,
//     warningCount: number,
//     issues: Array<{
//         severity: 'error' | 'warning',
//         code: string,          // ex. 'NOEUD_ISOLE'
//         message: string,       // en français
//         nodeIds: Array<string>,
//         pathIds: Array<string>
//     }>                         // triés : erreurs d'abord, puis ordre de CODE_ORDER
// }
```

---

### Tâche 1 : Squelette du validateur et cas généraux

**Fichiers :**
- Créer : `shared/js/graphValidator.js`
- Créer : `tests/graphValidator.test.js`

**Interfaces :**
- Produit : `validateGraph(data)` (contrat ci-dessus) ; fonctions internes `makeIssue(severity, code, message, nodeIds = [], pathIds = [])`, `describeNode(node)` → `« nom » (étage X)`, `buildReport(issues)` ; constantes `NODE_TYPES`, `PATH_TYPES`, `VERTICAL_TYPES`, `ROOM_TYPES`, `CODE_ORDER`.

- [ ] **Étape 1 : écrire les tests qui échouent**

Créer `tests/graphValidator.test.js` :

```js
/**
 * ====================================================================
 * APPLICATION : OùQAC - Tests
 * FICHIER : graphValidator.test.js
 * RÔLE : Tests unitaires du validateur de graphe
 * ====================================================================
 * * DESCRIPTION :
 * Vérifie chaque règle de shared/js/graphValidator.js sur de petits graphes
 * construits à la main : un cas qui déclenche la règle, un cas proche qui ne
 * la déclenche pas. Vérifie aussi que le vrai graph/graph.json n'a pas
 * d'erreur de structure.
 * * LANCEMENT (depuis la racine du dépôt, Node 18 ou plus) :
 *   node --test tests/graphValidator.test.js
 * Aucune dépendance à installer : node:test et node:assert sont intégrés à Node.
 **/

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateGraph } from '../shared/js/graphValidator.js';

// ==========================================
// OUTILS DE CONSTRUCTION DE GRAPHES
// ==========================================

// Crée un nœud valide ; "extra" écrase les champs par défaut
function node(id, extra = {}) {
    return { id, name: id, type: 'couloir', floor: '1', lat: 48.42, lng: -71.05, ...extra };
}

// Crée un chemin valide entre a et b
function path(id, a, b, extra = {}) {
    return { id, startNode: a, endNode: b, type: 'indoor', distance: '5', isPmr: true, ...extra };
}

// Graphe de référence sans aucun problème :
// étage 1 : S1 - C1 - E1 (escalier) et C1 - A1 (ascenseur)
// étage 2 : E2 - C2 - A2, C2 - S2
// liaisons : E1-E2 (non PMR), A1-A2 (PMR)
function baseGraph() {
    return {
        nodes: [
            node('S1', { type: 'salle' }),
            node('C1'),
            node('E1', { type: 'escalier' }),
            node('A1', { type: 'ascenseur' }),
            node('E2', { type: 'escalier', floor: '2' }),
            node('A2', { type: 'ascenseur', floor: '2' }),
            node('C2', { floor: '2' }),
            node('S2', { type: 'salle', floor: '2' })
        ],
        paths: [
            path('p1', 'S1', 'C1'),
            path('p2', 'C1', 'E1'),
            path('p3', 'C1', 'A1'),
            path('p4', 'E1', 'E2', { isPmr: false }),
            path('p5', 'A1', 'A2'),
            path('p6', 'E2', 'C2'),
            path('p7', 'A2', 'C2'),
            path('p8', 'C2', 'S2')
        ]
    };
}

// Codes des problèmes d'un rapport, pour des assertions lisibles
function codes(report) {
    return report.issues.map(i => i.code);
}

// ==========================================
// CAS GÉNÉRAUX
// ==========================================

test('le graphe de référence est valide, sans avertissement', () => {
    const report = validateGraph(baseGraph());
    assert.deepEqual(report.issues, []);
    assert.equal(report.valid, true);
    assert.equal(report.errorCount, 0);
    assert.equal(report.warningCount, 0);
});

test('des données inexploitables donnent une seule erreur, sans exception', () => {
    for (const data of [null, undefined, {}, { nodes: [] }, { nodes: 'x', paths: [] }]) {
        const report = validateGraph(data);
        assert.equal(report.valid, false);
        assert.deepEqual(codes(report), ['DONNEE_INVALIDE']);
    }
});

test('un graphe vide est valide', () => {
    assert.equal(validateGraph({ nodes: [], paths: [] }).valid, true);
});
```

- [ ] **Étape 2 : lancer les tests et constater l'échec**

Lancer : `node --test tests/graphValidator.test.js`
Attendu : échec avec `ERR_MODULE_NOT_FOUND` (le fichier `shared/js/graphValidator.js` n'existe pas encore).

- [ ] **Étape 3 : écrire le squelette**

Créer `shared/js/graphValidator.js` :

```js
/**
 * ====================================================================
 * APPLICATION : OùQAC - Partagé (Admin & Communauté)
 * FICHIER : graphValidator.js
 * RÔLE : Vérification de la cohérence du graphe de navigation
 * ====================================================================
 * * DESCRIPTION :
 * Ce fichier contrôle le graphe (nœuds + chemins) avant qu'il ne serve au
 * calcul d'itinéraire. Un itinéraire faux vient presque toujours d'un graphe
 * faux : chemin vers un nœud supprimé, couloir déconnecté, escalier marqué
 * PMR... Le validateur détecte ces cas et les décrit en français.
 * Il ne dépend ni du DOM ni de Leaflet : il travaille sur l'objet JSON brut
 * (même format que graph/graph.json). Il est donc testable avec Node
 * (voir tests/graphValidator.test.js) et réutilisable partout.
 * * FONCTIONS PRINCIPALES :
 * - validateGraph(data) : Point d'entrée. Lance toutes les règles et renvoie
 * un rapport { valid, errorCount, warningCount, issues }.
 * - check...() : Une fonction par famille de règles (données, chemins,
 * connexité, étages, PMR, noms). Chacune ajoute ses problèmes au rapport.
 * - findComponents() : Calcule les composantes connexes du graphe (groupes de
 * nœuds reliés entre eux) par un parcours en largeur.
 * * FLUX DE DONNÉES / TRAVAIL :
 * 1. Entrée : un objet { nodes, paths } (fourni par generateGraphData() dans
 * le panel admin, ou lu depuis graph.json).
 * 2. Préparation : index des nœuds par id et liste des chemins "valides"
 * (extrémités existantes et différentes).
 * 3. Règles : chaque règle ajoute des problèmes { severity, code, message,
 * nodeIds, pathIds }.
 * 4. Sortie : le rapport trié (erreurs d'abord) est renvoyé à l'appelant,
 * qui décide comment l'afficher.
 * * RÉFÉRENCE : docs/validation-graphe.md (explication de chaque règle).
 **/

// ==========================================
// CONSTANTES
// ==========================================

// Types acceptés (mêmes listes que les sélecteurs du panel admin)
const NODE_TYPES = ['salle', 'couloir', 'escalier', 'ascenseur', 'wc'];
const PATH_TYPES = ['indoor', 'outdoor'];

// Types de nœuds qui permettent de changer d'étage
const VERTICAL_TYPES = ['escalier', 'ascenseur'];

// Types de nœuds considérés comme des destinations (recherche, PMR)
const ROOM_TYPES = ['salle', 'wc'];

// Ordre d'affichage des codes (= ordre des règles dans la spécification)
const CODE_ORDER = [
    'CHEMIN_NOEUD_INCONNU',
    'CHEMIN_BOUCLE',
    'CHEMIN_DOUBLON',
    'NOEUD_ISOLE',
    'GRAPHE_MORCELE',
    'ETAGE_SANS_ESCALIER',
    'ESCALIER_PMR',
    'SALLE_INACCESSIBLE_PMR',
    'SALLE_SANS_NOM',
    'NOM_DOUBLON',
    'DISTANCE_INVALIDE',
    'LIAISON_ETAGE_MANQUANTE',
    'DONNEE_INVALIDE'
];

// ==========================================
// POINT D'ENTRÉE
// ==========================================

/**
 * Valide un graphe au format graph.json.
 * @param {{nodes: Array, paths: Array}} data
 * @returns {{valid: boolean, errorCount: number, warningCount: number, issues: Array}}
 */
export function validateGraph(data) {
    const issues = [];

    // Garde-fou : sans tableaux de nœuds et de chemins, aucune règle n'a de sens
    if (!data || !Array.isArray(data.nodes) || !Array.isArray(data.paths)) {
        issues.push(makeIssue('error', 'DONNEE_INVALIDE',
            'Le graphe doit contenir un tableau "nodes" et un tableau "paths".'));
        return buildReport(issues);
    }

    // On ignore les entrées qui ne sont pas des objets (null, nombres...)
    const nodes = data.nodes.filter(n => n && typeof n === 'object');
    const paths = data.paths.filter(p => p && typeof p === 'object');

    // Index des nœuds par id pour des recherches rapides
    const nodesById = new Map();
    nodes.forEach(node => {
        if (node.id !== undefined && !nodesById.has(node.id)) nodesById.set(node.id, node);
    });

    // RÈGLES (ajoutées au fil des tâches suivantes)

    return buildReport(issues);
}

// ==========================================
// RÈGLES
// ==========================================

// ==========================================
// OUTILS
// ==========================================

// Nom lisible d'un nœud pour les messages : « P1-4 » (étage 1)
function describeNode(node) {
    if (!node) return 'inconnu';
    const name = typeof node.name === 'string' && node.name.trim() !== '' ? node.name.trim() : node.id;
    return `« ${name} » (étage ${node.floor ?? '?'})`;
}

function makeIssue(severity, code, message, nodeIds = [], pathIds = []) {
    return { severity, code, message, nodeIds, pathIds };
}

// Trie les problèmes (erreurs d'abord, puis ordre des règles) et compte
function buildReport(issues) {
    const rank = issue => (issue.severity === 'error' ? 0 : 1) * 100 + CODE_ORDER.indexOf(issue.code);
    const sorted = [...issues].sort((a, b) => rank(a) - rank(b));
    const errorCount = sorted.filter(i => i.severity === 'error').length;
    return {
        valid: errorCount === 0,
        errorCount,
        warningCount: sorted.length - errorCount,
        issues: sorted
    };
}
```

- [ ] **Étape 4 : lancer les tests et constater le succès**

Lancer : `node --test tests/graphValidator.test.js`
Attendu : `ℹ tests 3`, `ℹ pass 3`, `ℹ fail 0`.

- [ ] **Étape 5 : committer**

```bash
git branch --show-current   # doit afficher feat/validation-graphe
git add shared/js/graphValidator.js tests/graphValidator.test.js
git commit -m "feat: ajoute le squelette du validateur de graphe

Crée shared/js/graphValidator.js (point d'entrée validateGraph, format
du rapport, tri erreurs/avertissements) et ses premiers tests Node."
```

---

### Tâche 2 : Règles de structure (E1 à E5)

**Fichiers :**
- Modifier : `shared/js/graphValidator.js`
- Modifier : `tests/graphValidator.test.js`

**Interfaces :**
- Consomme : `makeIssue`, `describeNode`, `nodesById` (tâche 1).
- Produit : `checkPaths(paths, nodesById, issues)` → `validPaths` (chemins dont les extrémités existent et diffèrent) ; `checkConnectivity(nodes, validPaths, issues)` → `Set` des ids déjà signalés (isolés ou hors réseau principal) ; `findComponents(nodeIds, paths)` → tableau de composantes (tableaux d'ids), de la plus grande à la plus petite.

- [ ] **Étape 1 : écrire les tests qui échouent**

Ajouter à la fin de `tests/graphValidator.test.js` :

```js
// ==========================================
// ERREURS
// ==========================================

test('E1 CHEMIN_NOEUD_INCONNU : chemin vers un nœud supprimé', () => {
    const g = baseGraph();
    g.paths.push(path('pX', 'C1', 'FANTOME'));
    const issue = validateGraph(g).issues.find(i => i.code === 'CHEMIN_NOEUD_INCONNU');
    assert.ok(issue);
    assert.deepEqual(issue.pathIds, ['pX']);
    assert.deepEqual(issue.nodeIds, ['C1']);
});

test('E2 CHEMIN_BOUCLE : chemin d\'un nœud vers lui-même', () => {
    const g = baseGraph();
    g.paths.push(path('pX', 'C1', 'C1'));
    assert.ok(codes(validateGraph(g)).includes('CHEMIN_BOUCLE'));
});

test('E3 CHEMIN_DOUBLON : deux chemins entre les mêmes nœuds, dans les deux sens', () => {
    const g = baseGraph();
    g.paths.push(path('pX', 'C1', 'S1'));
    const issue = validateGraph(g).issues.find(i => i.code === 'CHEMIN_DOUBLON');
    assert.ok(issue);
    assert.deepEqual(issue.pathIds.sort(), ['p1', 'pX']);
});

test('E4 NOEUD_ISOLE : nœud sans chemin', () => {
    const g = baseGraph();
    g.nodes.push(node('X'));
    const issue = validateGraph(g).issues.find(i => i.code === 'NOEUD_ISOLE');
    assert.deepEqual(issue.nodeIds, ['X']);
});

test('E4 NOEUD_ISOLE : un nœud relié seulement par une boucle reste isolé', () => {
    const g = baseGraph();
    g.nodes.push(node('X'));
    g.paths.push(path('pX', 'X', 'X'));
    assert.ok(codes(validateGraph(g)).includes('NOEUD_ISOLE'));
});

test('E5 GRAPHE_MORCELE : groupe de nœuds coupé du réseau principal', () => {
    const g = baseGraph();
    g.nodes.push(node('X'), node('Y'));
    g.paths.push(path('pX', 'X', 'Y'));
    const issues = validateGraph(g).issues.filter(i => i.code === 'GRAPHE_MORCELE');
    assert.equal(issues.length, 1);
    assert.deepEqual(issues[0].nodeIds.sort(), ['X', 'Y']);
});

test('E5 : un nœud isolé n\'est pas signalé une seconde fois comme morceau', () => {
    const g = baseGraph();
    g.nodes.push(node('X'));
    assert.ok(!codes(validateGraph(g)).includes('GRAPHE_MORCELE'));
});
```

- [ ] **Étape 2 : lancer les tests et constater l'échec**

Lancer : `node --test tests/graphValidator.test.js`
Attendu : `ℹ pass 4`, `ℹ fail 6` (les tests E1, E2, E3, E4 ×2 et E5 échouent ; « E5 : un nœud isolé… » passe déjà car aucune règle ne tourne).

- [ ] **Étape 3 : écrire les règles**

Dans `shared/js/graphValidator.js`, remplacer la ligne `    // RÈGLES (ajoutées au fil des tâches suivantes)` par :

```js
    // RÈGLES
    const validPaths = checkPaths(paths, nodesById, issues);
    const unreachable = checkConnectivity(nodes, validPaths, issues);
```

Sous le bandeau `// RÈGLES` (juste avant le bandeau `// OUTILS`), ajouter :

```js
// E1, E2, E3 : références cassées, boucles, doublons.
// Renvoie la liste des chemins "valides" (extrémités existantes et différentes),
// seuls utilisés pour les calculs de connexité.
function checkPaths(paths, nodesById, issues) {
    const validPaths = [];
    const pathsByPair = new Map();

    paths.forEach(path => {
        const missing = [path.startNode, path.endNode].filter(id => !nodesById.has(id));
        if (missing.length > 0) {
            issues.push(makeIssue('error', 'CHEMIN_NOEUD_INCONNU',
                `Le chemin ${path.id} pointe vers un nœud inexistant (${missing.join(', ')}).`,
                [path.startNode, path.endNode].filter(id => nodesById.has(id)), [path.id]));
            return;
        }
        if (path.startNode === path.endNode) {
            issues.push(makeIssue('error', 'CHEMIN_BOUCLE',
                `Le chemin ${path.id} relie le nœud ${describeNode(nodesById.get(path.startNode))} à lui-même.`,
                [path.startNode], [path.id]));
            return;
        }
        validPaths.push(path);

        // Clé indépendante du sens : A-B et B-A sont la même paire
        const key = [path.startNode, path.endNode].sort().join('|');
        if (!pathsByPair.has(key)) pathsByPair.set(key, []);
        pathsByPair.get(key).push(path);
    });

    pathsByPair.forEach(group => {
        if (group.length < 2) return;
        const a = nodesById.get(group[0].startNode);
        const b = nodesById.get(group[0].endNode);
        issues.push(makeIssue('error', 'CHEMIN_DOUBLON',
            `${group.length} chemins relient ${describeNode(a)} et ${describeNode(b)}.`,
            [a.id, b.id], group.map(p => p.id)));
    });

    return validPaths;
}

// E4, E5 : nœuds isolés et morceaux de graphe déconnectés.
// Renvoie l'ensemble des ids déjà signalés (pour ne pas les re-signaler en E8).
function checkConnectivity(nodes, validPaths, issues) {
    const unreachable = new Set();
    const connected = new Set();
    validPaths.forEach(p => { connected.add(p.startNode); connected.add(p.endNode); });

    // E4 : aucun chemin valide ne touche ce nœud
    nodes.forEach(node => {
        if (!connected.has(node.id)) {
            unreachable.add(node.id);
            issues.push(makeIssue('error', 'NOEUD_ISOLE',
                `Le nœud ${describeNode(node)} n'est relié à aucun chemin.`, [node.id]));
        }
    });

    // E5 : la plus grande composante est le réseau principal, les autres sont signalées
    const components = findComponents([...connected], validPaths);
    components.slice(1).forEach(component => {
        component.forEach(id => unreachable.add(id));
        issues.push(makeIssue('error', 'GRAPHE_MORCELE',
            `${component.length} nœud(s) forment un groupe coupé du reste du réseau.`, component));
    });

    return unreachable;
}
```

Sous le bandeau `// OUTILS`, avant `describeNode`, ajouter :

```js
/**
 * Composantes connexes par parcours en largeur (BFS).
 * @param {Array} nodeIds - ids des nœuds à répartir
 * @param {Array} paths - chemins valides à suivre (non orientés)
 * @returns {Array<Array>} composantes, de la plus grande à la plus petite
 */
function findComponents(nodeIds, paths) {
    // Liste d'adjacence : id -> voisins
    const neighbors = new Map(nodeIds.map(id => [id, []]));
    paths.forEach(p => {
        if (neighbors.has(p.startNode) && neighbors.has(p.endNode)) {
            neighbors.get(p.startNode).push(p.endNode);
            neighbors.get(p.endNode).push(p.startNode);
        }
    });

    const visited = new Set();
    const components = [];
    nodeIds.forEach(startId => {
        if (visited.has(startId)) return;
        const component = [];
        const queue = [startId];
        visited.add(startId);
        while (queue.length > 0) {
            const id = queue.shift();
            component.push(id);
            neighbors.get(id).forEach(next => {
                if (!visited.has(next)) {
                    visited.add(next);
                    queue.push(next);
                }
            });
        }
        components.push(component);
    });

    return components.sort((a, b) => b.length - a.length);
}
```

- [ ] **Étape 4 : lancer les tests et constater le succès**

Lancer : `node --test tests/graphValidator.test.js`
Attendu : `ℹ tests 10`, `ℹ pass 10`, `ℹ fail 0`.

- [ ] **Étape 5 : committer**

```bash
git branch --show-current   # doit afficher feat/validation-graphe
git add shared/js/graphValidator.js tests/graphValidator.test.js
git commit -m "feat: détecte les chemins cassés et les morceaux de graphe déconnectés

Règles E1 à E5 : chemin vers un nœud inexistant, boucle, doublon, nœud
isolé et composantes connexes séparées du réseau principal (BFS)."
```

---

### Tâche 3 : Règles d'étage et d'accessibilité PMR (E6 à E8)

**Fichiers :**
- Modifier : `shared/js/graphValidator.js`
- Modifier : `tests/graphValidator.test.js`

**Interfaces :**
- Consomme : `validPaths`, `unreachable`, `findComponents`, `VERTICAL_TYPES`, `ROOM_TYPES` (tâches 1 et 2).
- Produit : `checkFloors(validPaths, nodesById, issues)`, `checkPmr(nodes, validPaths, unreachable, issues)`.

- [ ] **Étape 1 : écrire les tests qui échouent**

Ajouter à la fin de `tests/graphValidator.test.js` :

```js
test('E6 ETAGE_SANS_ESCALIER : couloir relié à un autre étage', () => {
    const g = baseGraph();
    g.paths.push(path('pX', 'C1', 'C2'));
    const issue = validateGraph(g).issues.find(i => i.code === 'ETAGE_SANS_ESCALIER');
    assert.deepEqual(issue.pathIds, ['pX']);
});

test('E7 ESCALIER_PMR : liaison d\'escalier entre étages marquée PMR', () => {
    const g = baseGraph();
    g.paths.find(p => p.id === 'p4').isPmr = true;
    const issue = validateGraph(g).issues.find(i => i.code === 'ESCALIER_PMR');
    assert.deepEqual(issue.pathIds, ['p4']);
});

test('E7 : un escalier relié à un couloir du même étage peut rester PMR', () => {
    // p2 (C1 - E1) est PMR dans le graphe de référence, qui est valide
    assert.ok(!codes(validateGraph(baseGraph())).includes('ESCALIER_PMR'));
});

test('E8 SALLE_INACCESSIBLE_PMR : salle joignable seulement par un chemin non PMR', () => {
    const g = baseGraph();
    g.paths.find(p => p.id === 'p8').isPmr = false;   // C2 - S2
    const issue = validateGraph(g).issues.find(i => i.code === 'SALLE_INACCESSIBLE_PMR');
    assert.deepEqual(issue.nodeIds, ['S2']);
});

test('E8 : une salle déjà isolée n\'est pas re-signalée en PMR', () => {
    const g = baseGraph();
    g.nodes.push(node('X', { type: 'salle' }));
    assert.ok(!codes(validateGraph(g)).includes('SALLE_INACCESSIBLE_PMR'));
});
```

- [ ] **Étape 2 : lancer les tests et constater l'échec**

Lancer : `node --test tests/graphValidator.test.js`
Attendu : `ℹ fail 3` (E6, E7 et E8 échouent avec `TypeError: Cannot read properties of undefined` car `issue` est `undefined`).

- [ ] **Étape 3 : écrire les règles**

Dans `validateGraph`, sous la ligne `const unreachable = checkConnectivity(nodes, validPaths, issues);`, ajouter :

```js
    checkFloors(validPaths, nodesById, issues);
    checkPmr(nodes, validPaths, unreachable, issues);
```

Sous le bandeau `// RÈGLES`, après `checkConnectivity`, ajouter :

```js
// E6, E7 : liaisons entre étages
function checkFloors(validPaths, nodesById, issues) {
    validPaths.forEach(path => {
        const a = nodesById.get(path.startNode);
        const b = nodesById.get(path.endNode);
        if (a.floor === b.floor) return;

        // E6 : on ne change d'étage que par un escalier ou un ascenseur
        if (!VERTICAL_TYPES.includes(a.type) || !VERTICAL_TYPES.includes(b.type)) {
            issues.push(makeIssue('error', 'ETAGE_SANS_ESCALIER',
                `Le chemin ${path.id} change d'étage entre ${describeNode(a)} et ${describeNode(b)} sans passer par un escalier ou un ascenseur.`,
                [a.id, b.id], [path.id]));
        }
        // E7 : un escalier n'est jamais accessible en fauteuil.
        // Seul isPmr === false exclut un chemin en mode PMR (cf. routeController.js).
        if ((a.type === 'escalier' || b.type === 'escalier') && path.isPmr !== false) {
            issues.push(makeIssue('error', 'ESCALIER_PMR',
                `La liaison d'escalier ${path.id} entre ${describeNode(a)} et ${describeNode(b)} est marquée accessible PMR.`,
                [a.id, b.id], [path.id]));
        }
    });
}

// E8 : salles injoignables quand on ne garde que les chemins PMR
function checkPmr(nodes, validPaths, unreachable, issues) {
    const pmrPaths = validPaths.filter(p => p.isPmr !== false);
    const components = findComponents(nodes.map(n => n.id), pmrPaths);
    const mainComponent = new Set(components[0] || []);

    nodes.forEach(node => {
        if (!ROOM_TYPES.includes(node.type)) return;
        if (unreachable.has(node.id) || mainComponent.has(node.id)) return;
        issues.push(makeIssue('error', 'SALLE_INACCESSIBLE_PMR',
            `La salle ${describeNode(node)} est injoignable en mode PMR.`, [node.id]));
    });
}
```

- [ ] **Étape 4 : lancer les tests et constater le succès**

Lancer : `node --test tests/graphValidator.test.js`
Attendu : `ℹ tests 15`, `ℹ pass 15`, `ℹ fail 0`.

- [ ] **Étape 5 : committer**

```bash
git branch --show-current   # doit afficher feat/validation-graphe
git add shared/js/graphValidator.js tests/graphValidator.test.js
git commit -m "feat: vérifie les liaisons d'étage et l'accessibilité PMR

Règles E6 à E8 : changement d'étage hors escalier/ascenseur, escalier
marqué PMR, salle injoignable quand on ne garde que les chemins PMR."
```

---

### Tâche 4 : Avertissements (W1 à W5)

**Fichiers :**
- Modifier : `shared/js/graphValidator.js`
- Modifier : `tests/graphValidator.test.js`

**Interfaces :**
- Consomme : `nodes`, `paths`, `validPaths`, `nodesById`, constantes de type (tâches 1 et 2).
- Produit : `checkData(nodes, paths, issues)`, `checkNames(nodes, issues)`, `checkDistances(paths, issues)`, `checkVerticalLinks(nodes, validPaths, nodesById, issues)`.

- [ ] **Étape 1 : écrire les tests qui échouent**

Ajouter à la fin de `tests/graphValidator.test.js` :

```js
// ==========================================
// AVERTISSEMENTS
// ==========================================

test('W1 SALLE_SANS_NOM : salle au nom vide ou fait d\'espaces', () => {
    const g = baseGraph();
    g.nodes.find(n => n.id === 'S1').name = '   ';
    const report = validateGraph(g);
    assert.ok(codes(report).includes('SALLE_SANS_NOM'));
    assert.equal(report.valid, true); // un avertissement ne rend pas le graphe invalide
});

test('W1 : un couloir sans nom est normal', () => {
    const g = baseGraph();
    g.nodes.find(n => n.id === 'C1').name = '';
    assert.ok(!codes(validateGraph(g)).includes('SALLE_SANS_NOM'));
});

test('W2 NOM_DOUBLON : deux nœuds portent le même nom', () => {
    const g = baseGraph();
    g.nodes.find(n => n.id === 'S2').name = 'S1 ';
    const issue = validateGraph(g).issues.find(i => i.code === 'NOM_DOUBLON');
    assert.deepEqual(issue.nodeIds.sort(), ['S1', 'S2']);
});

test('W3 DISTANCE_INVALIDE : distance vide, texte, nulle ou négative', () => {
    for (const distance of ['', 'abc', '0', -3, null, undefined]) {
        const g = baseGraph();
        g.paths.find(p => p.id === 'p1').distance = distance;
        assert.ok(codes(validateGraph(g)).includes('DISTANCE_INVALIDE'), `distance ${distance}`);
    }
});

test('W3 : une distance numérique en texte est acceptée', () => {
    const g = baseGraph();
    g.paths.find(p => p.id === 'p1').distance = '2.95';
    assert.ok(!codes(validateGraph(g)).includes('DISTANCE_INVALIDE'));
});

test('W4 LIAISON_ETAGE_MANQUANTE : ascenseur sans liaison vers un autre étage', () => {
    const g = baseGraph();
    g.nodes.push(node('A3', { type: 'ascenseur' }));
    g.paths.push(path('pX', 'C1', 'A3'));
    const issue = validateGraph(g).issues.find(i => i.code === 'LIAISON_ETAGE_MANQUANTE');
    assert.deepEqual(issue.nodeIds, ['A3']);
});

test('W5 DONNEE_INVALIDE : type inconnu, étage vide, coordonnées et PMR invalides, id en double', () => {
    const g = baseGraph();
    g.nodes.find(n => n.id === 'C1').type = 'cafeteria';
    g.nodes.find(n => n.id === 'C2').floor = '';
    g.nodes.find(n => n.id === 'S1').lat = 'abc';
    g.paths.find(p => p.id === 'p1').isPmr = 'oui';
    g.paths.find(p => p.id === 'p2').id = 'p1';
    const issues = validateGraph(g).issues.filter(i => i.code === 'DONNEE_INVALIDE');
    assert.equal(issues.length, 5);
    assert.ok(issues.every(i => i.severity === 'warning'));
});

test('les erreurs sont listées avant les avertissements', () => {
    const g = baseGraph();
    g.nodes.find(n => n.id === 'S1').name = '';     // avertissement
    g.nodes.push(node('X'));                        // erreur (isolé)
    const report = validateGraph(g);
    assert.deepEqual(report.issues.map(i => i.severity), ['error', 'warning']);
});
```

- [ ] **Étape 2 : lancer les tests et constater l'échec**

Lancer : `node --test tests/graphValidator.test.js`
Attendu : `ℹ fail 6` (W1, W2, W3 « distance vide… », W4, W5 et « les erreurs sont listées… » échouent ; les deux tests « …est normal / …est acceptée » passent déjà).

- [ ] **Étape 3 : écrire les règles**

Dans `validateGraph`, remplacer le bloc des règles par l'ordre final :

```js
    // RÈGLES
    checkData(nodes, paths, issues);
    const validPaths = checkPaths(paths, nodesById, issues);
    const unreachable = checkConnectivity(nodes, validPaths, issues);
    checkFloors(validPaths, nodesById, issues);
    checkPmr(nodes, validPaths, unreachable, issues);
    checkNames(nodes, issues);
    checkDistances(paths, issues);
    checkVerticalLinks(nodes, validPaths, nodesById, issues);
```

Sous le bandeau `// RÈGLES`, en tout premier (avant `checkPaths`), ajouter :

```js
// W5 : champs manquants, types inconnus, ids en double
function checkData(nodes, paths, issues) {
    const seenNodeIds = new Set();
    nodes.forEach(node => {
        const label = describeNode(node);
        if (node.id === undefined || node.id === null || node.id === '') {
            issues.push(makeIssue('warning', 'DONNEE_INVALIDE', `Un nœud n'a pas d'identifiant (${label}).`));
        } else if (seenNodeIds.has(node.id)) {
            issues.push(makeIssue('warning', 'DONNEE_INVALIDE', `L'identifiant ${node.id} est utilisé par plusieurs nœuds.`, [node.id]));
        } else {
            seenNodeIds.add(node.id);
        }
        if (!NODE_TYPES.includes(node.type)) {
            issues.push(makeIssue('warning', 'DONNEE_INVALIDE', `Le nœud ${label} a un type inconnu : "${node.type}".`, [node.id]));
        }
        if (typeof node.floor !== 'string' || node.floor.trim() === '') {
            issues.push(makeIssue('warning', 'DONNEE_INVALIDE', `Le nœud ${label} n'a pas d'étage.`, [node.id]));
        }
        if (!Number.isFinite(node.lat) || !Number.isFinite(node.lng)) {
            issues.push(makeIssue('warning', 'DONNEE_INVALIDE', `Le nœud ${label} a des coordonnées invalides.`, [node.id]));
        }
    });

    const seenPathIds = new Set();
    paths.forEach(path => {
        if (path.id === undefined || path.id === null || path.id === '') {
            issues.push(makeIssue('warning', 'DONNEE_INVALIDE', 'Un chemin n\'a pas d\'identifiant.'));
        } else if (seenPathIds.has(path.id)) {
            issues.push(makeIssue('warning', 'DONNEE_INVALIDE', `L'identifiant ${path.id} est utilisé par plusieurs chemins.`, [], [path.id]));
        } else {
            seenPathIds.add(path.id);
        }
        if (!PATH_TYPES.includes(path.type)) {
            issues.push(makeIssue('warning', 'DONNEE_INVALIDE', `Le chemin ${path.id} a un type inconnu : "${path.type}".`, [], [path.id]));
        }
        if (typeof path.isPmr !== 'boolean') {
            issues.push(makeIssue('warning', 'DONNEE_INVALIDE', `Le chemin ${path.id} n'indique pas s'il est accessible PMR.`, [], [path.id]));
        }
    });
}
```

Sous le bandeau `// RÈGLES`, après `checkPmr`, ajouter :

```js
// W1, W2 : salles sans nom et noms en double
function checkNames(nodes, issues) {
    const nodesByName = new Map();
    nodes.forEach(node => {
        const name = typeof node.name === 'string' ? node.name.trim() : '';
        if (name === '') {
            if (ROOM_TYPES.includes(node.type)) {
                issues.push(makeIssue('warning', 'SALLE_SANS_NOM',
                    `Une salle n'a pas de nom (${describeNode(node)}).`, [node.id]));
            }
            return;
        }
        if (!nodesByName.has(name)) nodesByName.set(name, []);
        nodesByName.get(name).push(node.id);
    });

    nodesByName.forEach((ids, name) => {
        if (ids.length > 1) {
            issues.push(makeIssue('warning', 'NOM_DOUBLON',
                `${ids.length} nœuds portent le nom « ${name} ».`, ids));
        }
    });
}

// W3 : distances non numériques ou non positives
function checkDistances(paths, issues) {
    paths.forEach(path => {
        const distance = Number(path.distance);
        if (path.distance === '' || path.distance === null || !Number.isFinite(distance) || distance <= 0) {
            issues.push(makeIssue('warning', 'DISTANCE_INVALIDE',
                `Le chemin ${path.id} a une distance invalide : "${path.distance}".`, [], [path.id]));
        }
    });
}

// W4 : escaliers et ascenseurs sans liaison vers un autre étage
function checkVerticalLinks(nodes, validPaths, nodesById, issues) {
    const linkedToOtherFloor = new Set();
    validPaths.forEach(path => {
        const a = nodesById.get(path.startNode);
        const b = nodesById.get(path.endNode);
        if (a.floor !== b.floor) {
            linkedToOtherFloor.add(a.id);
            linkedToOtherFloor.add(b.id);
        }
    });

    nodes.forEach(node => {
        if (VERTICAL_TYPES.includes(node.type) && !linkedToOtherFloor.has(node.id)) {
            issues.push(makeIssue('warning', 'LIAISON_ETAGE_MANQUANTE',
                `Le nœud ${describeNode(node)} (${node.type}) n'est relié à aucun autre étage.`, [node.id]));
        }
    });
}
```

- [ ] **Étape 4 : lancer les tests et constater le succès**

Lancer : `node --test tests/graphValidator.test.js`
Attendu : `ℹ tests 23`, `ℹ pass 23`, `ℹ fail 0`.

- [ ] **Étape 5 : committer**

```bash
git branch --show-current   # doit afficher feat/validation-graphe
git add shared/js/graphValidator.js tests/graphValidator.test.js
git commit -m "feat: ajoute les avertissements du validateur

Règles W1 à W5 : salle sans nom, nom en double, distance invalide,
escalier/ascenseur sans liaison d'étage, données mal formées."
```

---

### Tâche 5 : Validation du vrai graph.json

**Fichiers :**
- Modifier : `tests/graphValidator.test.js`

**Contexte :** un essai préalable (2026-11-07) a montré que le `graph/graph.json` actuel n'a aucune erreur de structure, mais que deux salles sont injoignables en mode PMR : `V1-1010` et `V1-1260`. On n'y accède que par l'escalier `V2-Escalier-1 ↔ V1-Escalier-1` ou par le chemin non PMR `P1-Escalier-1 ↔ P1-Sortie-1`. C'est un vrai défaut des données (ou de la réalité du bâtiment), à signaler à l'équipe, pas un bug du validateur. Le test fige cette liste pour détecter toute régression.

- [ ] **Étape 1 : écrire le test**

Ajouter à la fin de `tests/graphValidator.test.js` :

```js
// ==========================================
// DONNÉES RÉELLES
// ==========================================

// Le graph.json actuel contient deux salles injoignables en mode PMR
// (V1-1010 et V1-1260 : on n'y accède que par des escaliers). C'est un vrai
// défaut des données, découvert par ce validateur le 2026-11-07, à corriger
// dans le panel admin. Ce test vérifie donc l'absence d'erreurs de structure
// (E1 à E7) et fige la liste des salles PMR connues pour repérer toute régression.
test('le graph.json du dépôt n\'a pas d\'erreur de structure', () => {
    const url = new URL('../graph/graph.json', import.meta.url);
    const data = JSON.parse(readFileSync(url, 'utf8'));
    const errors = validateGraph(data).issues.filter(i => i.severity === 'error');

    const structural = errors.filter(i => i.code !== 'SALLE_INACCESSIBLE_PMR');
    assert.deepEqual(structural, []);

    const pmrRooms = errors
        .filter(i => i.code === 'SALLE_INACCESSIBLE_PMR')
        .map(i => data.nodes.find(n => n.id === i.nodeIds[0]).name)
        .sort();
    assert.deepEqual(pmrRooms, ['V1-1010', 'V1-1260']);
});
```

- [ ] **Étape 2 : lancer les tests**

Lancer : `node --test tests/graphValidator.test.js`
Attendu : `ℹ tests 24`, `ℹ pass 24`, `ℹ fail 0`. Si le test échoue, afficher le rapport complet pour comprendre :

```bash
node --input-type=module -e "import {validateGraph} from './shared/js/graphValidator.js'; import fs from 'fs'; const r = validateGraph(JSON.parse(fs.readFileSync('graph/graph.json','utf8'))); r.issues.forEach(i => console.log(i.severity, i.code, i.message))"
```

- [ ] **Étape 3 : committer**

```bash
git branch --show-current   # doit afficher feat/validation-graphe
git add tests/graphValidator.test.js
git commit -m "test: valide le graph.json actuel du dépôt

Aucune erreur de structure. Le validateur révèle deux salles
injoignables en mode PMR (V1-1010, V1-1260), accessibles seulement
par escalier : défaut de données à corriger dans le panel admin."
```

---

### Tâche 6 : Intégration au panel admin

**Fichiers :**
- Modifier : `admin/js/controllers/ioController.js:41` (`function generateGraphData()`)
- Créer : `admin/js/controllers/validationController.js`
- Modifier : `admin/js/views/ui.js` (en-tête + fin de fichier)
- Modifier : `admin/index.html` (zone `#actions`)
- Modifier : `admin/style.css` (section boutons d'action)
- Modifier : `admin/js/main.js` (imports + bloc `// Import / Export`)

**Interfaces :**
- Consomme : `validateGraph(data)` (tâches 1 à 4) ; `generateGraphData()` ; `setFloor(floorId)`, `filterMapElements(floorId)`, `map` (`admin/js/map.js`) ; `NodeCtrl.selectNode(node)`, `PathCtrl.selectPath(path)` ; `changeMode(mode, btn)` (`admin/js/main.js`). Les nœuds sont des marqueurs Leaflet avec `userData = { id, name, type, floor }` ; les chemins sont des polylignes avec `userData = { id, startId, endId, ... }`.
- Produit : `runValidation()`, `focusIssue(issue)` ; `UI.renderValidationReport(report, onIssueClick)`, `UI.hideValidationReport()`.

Pas de test automatique pour cette tâche (DOM + Leaflet) : vérification manuelle à l'étape 7.

- [ ] **Étape 1 : exporter generateGraphData**

Dans `admin/js/controllers/ioController.js`, remplacer :

```js
function generateGraphData() {
```

par :

```js
// Exportée : réutilisée par validationController.js pour valider le graphe courant
export function generateGraphData() {
```

- [ ] **Étape 2 : créer le contrôleur**

Créer `admin/js/controllers/validationController.js` :

```js
/**
 * ====================================================================
 * APPLICATION : OùQAC - Panel Admin
 * FICHIER : validationController.js (Controllers)
 * RÔLE : Lancement de la validation du graphe et navigation vers les erreurs
 * ====================================================================
 * * DESCRIPTION :
 * Ce fichier fait le pont entre le validateur pur (shared/js/graphValidator.js)
 * et l'éditeur. Il récupère le graphe en cours d'édition, le fait valider,
 * demande à ui.js d'afficher le rapport, puis gère le clic sur un problème
 * pour amener l'administrateur directement sur l'élément fautif.
 * * FONCTIONS PRINCIPALES :
 * - runValidation() : Construit le JSON du graphe courant (même format que
 * l'export), appelle validateGraph() et affiche le rapport.
 * - focusIssue(issue) : Bascule sur l'étage concerné, centre la carte et
 * sélectionne le nœud (ou le chemin) cité par le problème.
 * * FLUX DE DONNÉES / TRAVAIL :
 * 1. Déclenchement : clic sur "Valider le graphe" (branché dans main.js).
 * 2. Lecture : generateGraphData() transforme state.nodes / state.paths
 * (objets Leaflet) en JSON brut.
 * 3. Calcul : validateGraph() renvoie { valid, errorCount, warningCount, issues }.
 * 4. Rendu : UI.renderValidationReport() affiche le panneau ; chaque ligne
 * cliquable rappelle focusIssue().
 **/

import { state } from '../state.js';
import { map, setFloor, filterMapElements } from '../map.js';
import { generateGraphData } from './ioController.js';
import * as NodeCtrl from './nodeController.js';
import * as PathCtrl from './pathController.js';
import * as UI from '../views/ui.js';
import { changeMode } from '../main.js';
import { validateGraph } from '../../../shared/js/graphValidator.js';

// Lance la validation sur le graphe en cours d'édition et affiche le rapport
export function runValidation() {
    const report = validateGraph(generateGraphData());
    UI.renderValidationReport(report, focusIssue);
}

// Amène la carte sur l'élément concerné par un problème
export function focusIssue(issue) {
    const node = state.nodes.find(n => issue.nodeIds.includes(n.userData.id));
    const path = state.paths.find(p => issue.pathIds.includes(p.userData.id));

    // Le problème concerne un nœud : on le sélectionne en mode "Nœuds"
    if (node) {
        showFloor(node.userData.floor);
        map.flyTo(node.getLatLng(), 19);
        changeMode('node', document.querySelectorAll('.btn-mode')[1]);
        NodeCtrl.selectNode(node);
        return;
    }

    // Sinon, il ne concerne qu'un chemin : on le sélectionne en mode "Chemins"
    if (path) {
        const start = state.nodes.find(n => n.userData.id === path.userData.startId);
        if (start) showFloor(start.userData.floor);
        map.flyTo(path.getBounds().getCenter(), 19);
        changeMode('path', document.querySelectorAll('.btn-mode')[2]);
        PathCtrl.selectPath(path);
    }
}

// Même enchaînement que le sélecteur d'étage de main.js
function showFloor(floor) {
    document.getElementById('sel-layer').value = floor;
    setFloor(floor);
    filterMapElements(floor);
}
```

- [ ] **Étape 3 : ajouter l'affichage dans ui.js**

Dans l'en-tête de `admin/js/views/ui.js`, juste avant la ligne ` * * FLUX DE DONNÉES / TRAVAIL :`, ajouter :

```js
 * - renderValidationReport(report, onIssueClick) & hideValidationReport() :
 * Affichent / masquent le rapport du validateur de graphe. Chaque problème
 * lié à un nœud ou un chemin devient cliquable (onIssueClick).
```

À la fin de `admin/js/views/ui.js`, ajouter :

```js
// ==========================================
// RAPPORT DE VALIDATION DU GRAPHE
// ==========================================

// Affiche le rapport renvoyé par validateGraph() dans le panneau dédié.
// onIssueClick(issue) est appelé quand on clique sur un problème localisable.
export function renderValidationReport(report, onIssueClick) {
    const panel = document.getElementById('panel-validation');
    const summary = document.getElementById('validation-summary');
    const list = document.getElementById('validation-list');

    // Résumé coloré : vert si aucun problème, orange si seulement des avertissements, rouge sinon
    if (report.issues.length === 0) {
        summary.textContent = 'Graphe valide : aucun problème détecté.';
        summary.className = 'validation-ok';
    } else {
        summary.textContent = `${report.errorCount} erreur(s), ${report.warningCount} avertissement(s)`;
        summary.className = report.valid ? 'validation-warning' : 'validation-error';
    }

    list.innerHTML = '';
    report.issues.forEach(issue => {
        const item = document.createElement('div');
        item.className = `validation-item validation-item-${issue.severity}`;

        // textContent (et non innerHTML) : les noms de salles viennent des données
        const label = document.createElement('b');
        label.textContent = issue.severity === 'error' ? 'Erreur' : 'Avertissement';
        item.appendChild(label);
        item.appendChild(document.createTextNode(` : ${issue.message}`));

        // Seuls les problèmes qui citent un nœud ou un chemin sont cliquables
        if (issue.nodeIds.length > 0 || issue.pathIds.length > 0) {
            item.classList.add('validation-item-clickable');
            item.title = 'Afficher sur la carte';
            item.addEventListener('click', () => onIssueClick(issue));
        }
        list.appendChild(item);
    });

    panel.classList.remove('hidden');
}

export function hideValidationReport() {
    document.getElementById('panel-validation').classList.add('hidden');
}
```

- [ ] **Étape 4 : ajouter le bouton et le panneau dans index.html**

Dans `admin/index.html`, remplacer :

```html
            <div id="actions">
                <button class="btn-action" id="btn-save">Sauvegarder</button>
                <button class="btn-action" id="btn-import">Importer</button>
```

par :

```html
            <div id="panel-validation" class="hidden">
                <div id="validation-header">
                    <h3>Validation du graphe</h3>
                    <button id="btn-close-validation" title="Fermer le rapport">×</button>
                </div>
                <div id="validation-summary"></div>
                <div id="validation-list"></div>
            </div>

            <div id="actions">
                <button class="btn-action" id="btn-save">Sauvegarder</button>
                <button class="btn-action" id="btn-import">Importer</button>
                <button class="btn-action" id="btn-validate-graph">Valider le graphe</button>
```

- [ ] **Étape 5 : ajouter les styles**

Dans `admin/style.css`, sous la ligne `#btn-import { --btn-color: #FF9800; }`, ajouter :

```css
#btn-validate-graph { --btn-color: #4CAF50; }

/* --- Rapport de validation du graphe --- */
#panel-validation { max-height: 40vh; overflow-y: auto; padding: 10px 15px; border-top: 1px solid #ddd; background: #fafafa; }
#validation-header { display: flex; justify-content: space-between; align-items: center; }
#validation-header h3 { margin: 0; font-size: 1rem; }
#btn-close-validation { border: none; background: none; font-size: 1.3rem; cursor: pointer; }
#validation-summary { margin: 8px 0; padding: 6px; border-radius: 4px; font-weight: bold; }
.validation-ok { background: #e8f5e9; color: #2e7d32; }
.validation-warning { background: #fff3e0; color: #e65100; }
.validation-error { background: #ffebee; color: #c62828; }
.validation-item { padding: 6px; border-left: 4px solid; margin-bottom: 4px; font-size: 0.85rem; background: white; }
.validation-item-error { border-color: #f44336; }
.validation-item-warning { border-color: #FF9800; }
.validation-item-clickable { cursor: pointer; }
.validation-item-clickable:hover { background: #f3f3f3; }
```

- [ ] **Étape 6 : brancher les boutons dans main.js**

Dans `admin/js/main.js`, sous la ligne `import * as IOCtrl from './controllers/ioController.js';`, ajouter :

```js
import * as ValidationCtrl from './controllers/validationController.js';
```

Sous la ligne `    document.getElementById('import-file').onchange = IOCtrl.importGraph;`, ajouter :

```js

    // Validation du graphe
    document.getElementById('btn-validate-graph').onclick = ValidationCtrl.runValidation;
    document.getElementById('btn-close-validation').onclick = UI.hideValidationReport;
```

- [ ] **Étape 7 : vérifier dans le navigateur**

Lancer un serveur local depuis la racine du dépôt : `python3 -m http.server 8000`, puis ouvrir `http://localhost:8000/admin/`.

Vérifier, dans l'ordre :
1. La console du navigateur n'affiche aucune erreur au chargement.
2. Importer `graph/graph.json` (bouton « Importer »), puis cliquer sur « Valider le graphe ».
3. Attendu : résumé rouge « 2 erreur(s), 0 avertissement(s) », deux lignes `SALLE_INACCESSIBLE_PMR` pour V1-1010 et V1-1260.
4. Cliquer sur la ligne V1-1010 : la carte passe à l'étage du nœud, se centre dessus, le mode « Nœuds » s'active et le formulaire affiche V1-1010.
5. En mode « Nœuds », créer un nœud dans le vide, revalider : une erreur `NOEUD_ISOLE` apparaît en tête de liste.
6. Fermer le panneau avec « × » : il disparaît.
7. Recharger la page (le graphe revient du localStorage) et revalider : même résultat qu'au point 5.

- [ ] **Étape 8 : relancer les tests unitaires**

Lancer : `node --test tests/graphValidator.test.js`
Attendu : `ℹ pass 24`, `ℹ fail 0`.

- [ ] **Étape 9 : committer**

```bash
git branch --show-current   # doit afficher feat/validation-graphe
git add admin/js/controllers/ioController.js admin/js/controllers/validationController.js admin/js/views/ui.js admin/index.html admin/style.css admin/js/main.js
git commit -m "feat: intègre la validation du graphe au panel admin

Bouton « Valider le graphe » et panneau de rapport. Un clic sur un
problème bascule sur l'étage, centre la carte et sélectionne le nœud
ou le chemin concerné."
```

---

### Tâche 7 : Documentation locale

**Fichiers :**
- Créer : `docs/validation-graphe.md`
- Modifier : `docs/specs/2026-11-07-validation-graphe-design.md` (section 6 et statut)
- Modifier : `README.md` (section « Panel Administrateur » et section « Contribuer au projet »)

- [ ] **Étape 1 : écrire docs/validation-graphe.md**

Créer `docs/validation-graphe.md` :

````markdown
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
````

- [ ] **Étape 2 : mettre à jour la spécification**

Dans `docs/specs/2026-11-07-validation-graphe-design.md`, remplacer :

```markdown
- **Statut :** conception validée, en attente de relecture
```

par :

```markdown
- **Statut :** implémentée
```

et remplacer :

```markdown
- Un test sur le vrai `graph/graph.json` : il ne doit contenir aucune erreur (vérifié à la main le 2026-11-07 : 48 nœuds, 50 chemins, graphe connexe, pas de nœud isolé).
```

par :

```markdown
- Un test sur le vrai `graph/graph.json` : il ne doit contenir aucune erreur de structure (E1 à E7). Le premier passage du validateur (2026-11-07) a révélé deux salles injoignables en mode PMR, `V1-1010` et `V1-1260` ; le test fige cette liste en attendant la correction des données.
```

- [ ] **Étape 3 : mettre à jour le README**

Dans `README.md`, sous la ligne `* **Import/Export JSON :** Sauvegarde et chargement de la topologie du campus en un clic.`, ajouter :

```markdown
* **Validation du graphe :** Détection des nœuds isolés, morceaux déconnectés, liaisons d'étage incorrectes et salles injoignables en mode PMR, avec navigation directe vers l'élément fautif ([documentation](docs/validation-graphe.md)).
```

Dans `README.md`, juste avant la ligne `📖 **Avant de plonger dans le code :**`, ajouter :

````markdown
### 3. Lancer les tests
Les tests du validateur de graphe utilisent le lanceur intégré à Node.js (version 18 ou plus, aucune installation de paquet) :
```bash
node --test tests/graphValidator.test.js
```

````

- [ ] **Étape 4 : committer**

```bash
git branch --show-current   # doit afficher feat/validation-graphe
git add docs/validation-graphe.md docs/specs/2026-11-07-validation-graphe-design.md README.md
git commit -m "docs: documente le validateur de graphe

Explique chaque règle (quoi, pourquoi, comment corriger), les notions
de graphe utilisées, les tests et l'ajout d'une règle. Mentionne la
fonctionnalité et la commande de test dans le README."
```

---

### Tâche 8 : Publication sur GitHub (après accord explicite de Malo)

Chaque étape de cette tâche publie quelque chose : **demander l'accord de Malo avant chacune**.

- [ ] **Étape 1 : pousser la branche d'équipe et la branche de travail**

```bash
git push -u origin projet-libre-8web101
git push -u origin feat/validation-graphe
```

Attendu : deux nouvelles branches sur `miel-uqac/OuQAC`. Vérifier que `main` n'apparaît pas dans la sortie.

- [ ] **Étape 2 : ouvrir la PR vers la branche d'équipe**

```bash
gh pr create --repo miel-uqac/OuQAC --base projet-libre-8web101 --head feat/validation-graphe \
  --title "Validation du graphe dans le panel admin" \
  --body-file docs/plans/pr-validation-graphe.md
```

Le fichier `docs/plans/pr-validation-graphe.md` est rédigé à cette étape (résumé, règles, constat PMR, comment tester, lien vers `docs/validation-graphe.md`) et relu par Malo.

Vérifier que la base de la PR est bien `projet-libre-8web101` et non `main`.

- [ ] **Étape 3 : page Wiki**

Créer la page Wiki « Validation du graphe » sur `miel-uqac/OuQAC` à partir de `docs/validation-graphe.md` (cloner `https://github.com/miel-uqac/OuQAC.wiki.git` dans un dossier séparé, ajouter `Validation-du-graphe.md`, committer, pousser).

- [ ] **Étape 4 : prévenir l'équipe**

Proposer à Malo un message pour l'équipe : nouvelle branche `projet-libre-8web101` à utiliser comme base, PR à relire, constat PMR sur V1-1010 et V1-1260 à vérifier sur le terrain par Nicolas et William.
