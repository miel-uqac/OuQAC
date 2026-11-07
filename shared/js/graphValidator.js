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

    // RÈGLES
    const validPaths = checkPaths(paths, nodesById, issues);
    const unreachable = checkConnectivity(nodes, validPaths, issues);
    checkFloors(validPaths, nodesById, issues);
    checkPmr(nodes, validPaths, unreachable, issues);

    return buildReport(issues);
}

// ==========================================
// RÈGLES
// ==========================================

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

// ==========================================
// OUTILS
// ==========================================

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
