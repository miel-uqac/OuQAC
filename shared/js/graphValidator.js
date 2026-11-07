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
