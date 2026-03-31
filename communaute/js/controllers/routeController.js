import { state } from '../state.js';
import { map } from '../map.js';

// ==========================================
// GENERATIION DE L'ITINERAIRE
// ==========================================
// Construit la liste d'adjacence
function buildGraph() {
    const graph = new Map();

    // Initialise un tableau vide pour chaque nœud
    state.nodes.forEach(node => {
        graph.set(node.userData.id, []);
    });

    // Remplit les tableaux avec les connexions
    state.paths.forEach(path => {
        const u = path.userData.startNode;
        const v = path.userData.endNode;
        let cost = parseFloat(path.userData.distance) || 1;

        // --- Filtre PMR ---
        // Si l'utilisateur choisi PMR et que le chemin ne l'est pas, on l'ignore totalement
        if (state.routePrefPmr && path.userData.isPmr === false) {
            return; // Stoppe ici, ce chemin n'est pas ajouté au graphe
        }

        // --- Pénalité d'Environnement ---
        // On multiplie artificiellement le coût par 15 pour décourager A* de prendre ce chemin,
        // tout en le laissant disponible s'il n'y a absolument pas d'autre choix
        if (state.routePrefEnvironment === 'indoor' && path.userData.type === 'outdoor') {
            cost *= 15;
        } else if (state.routePrefEnvironment === 'outdoor' && path.userData.type === 'indoor') {
            cost *= 15;
        }

        if (graph.has(u)) graph.get(u).push({ target: v, path: path, cost: cost });
        if (graph.has(v)) graph.get(v).push({ target: u, path: path, cost: cost });
    });

    return graph;
}

// Calcul de l'heuristique entre un noeud A et B
function heuristic(idA, idB) {
    const nodeA = state.nodes.find(n => n.userData.id === idA);
    const nodeB = state.nodes.find(n => n.userData.id === idB);
    if (!nodeA || !nodeB) return 0;
    
    // Fonction native de Leaflet pour calculer la distance
    return map.distance(nodeA.getLatLng(), nodeB.getLatLng()); 
}

// L'algorithme A*
export function calculateRoute(startNode, endNode) {
    if (!startNode || !endNode) return null;

    const graph = buildGraph();
    const startId = startNode.userData.id;
    const endId = endNode.userData.id;

    const openSet = new Set([startId]); // Nœuds à évaluer
    const cameFrom = new Map(); // Pour reconstruire le chemin à la fin

    // Coût depuis le départ (G)
    const gScore = new Map();
    // Coût total estimé Départ -> Arrivée (F = G + Heuristique)
    const fScore = new Map();

    state.nodes.forEach(node => {
        gScore.set(node.userData.id, Infinity);
        fScore.set(node.userData.id, Infinity);
    });

    gScore.set(startId, 0);
    fScore.set(startId, heuristic(startId, endId));

    while (openSet.size > 0) {
        // Trouve le nœud dans openSet avec le F le plus bas
        let currentId = null;
        let lowestF = Infinity;
        
        for (const id of openSet) {
            const score = fScore.get(id);
            if (score < lowestF) {
                lowestF = score;
                currentId = id;
            }
        }

        // Si on est arrivé, on reconstruit le chemin
        if (currentId === endId) {
            return reconstructPath(cameFrom, currentId);
        }

        openSet.delete(currentId);
        const neighbors = graph.get(currentId) || [];
        
        // On analyse les voisins
        for (const neighbor of neighbors) {
            const neighborId = neighbor.target;
            const tentativeGScore = gScore.get(currentId) + neighbor.cost;

            // Si c'est un meilleur chemin vers ce voisin
            if (tentativeGScore < gScore.get(neighborId)) {
                cameFrom.set(neighborId, { prevId: currentId, path: neighbor.path });
                gScore.set(neighborId, tentativeGScore);
                fScore.set(neighborId, tentativeGScore + heuristic(neighborId, endId));
                openSet.add(neighborId);
            }
        }
    }

    return null; // Aucun chemin possible trouvé
}

// Remonte à l'envers depuis l'arrivée pour lister les étapes
function reconstructPath(cameFrom, currentId) {
    const pathNodes = [currentId];
    const pathEdges = [];

    while (cameFrom.has(currentId)) {
        const data = cameFrom.get(currentId);
        pathEdges.push(data.path);
        currentId = data.prevId;
        pathNodes.unshift(currentId); // On insère au début du tableau
    }

    return { nodes: pathNodes, paths: pathEdges };
}

// ==========================================
// GÉNÉRATEUR D'ÉTAPES TEXTUELLES
// ==========================================
export function generateItinerarySteps(route) {
    const steps = [];
    const nodes = route.nodes.map(id => state.nodes.find(n => n.userData.id === id));
    const paths = route.paths;

    if (nodes.length < 2) return steps;

    // Étape de départ
    steps.push(`Départ de ${nodes[0].userData.name || 'votre position'} (Étage ${nodes[0].userData.floor})`);

    let currentEnvironment = paths[0].userData.type; // 'indoor' ou 'outdoor'

    // On boucle sur tous les nœuds intermédiaires
    for (let i = 0; i < nodes.length - 1; i++) {
        const current = nodes[i];
        const next = nodes[i + 1];
        const path = paths[i];

        // Changement d'étage
        if (current.userData.floor !== next.userData.floor) {
            const transport = (current.userData.type === 'ascenseur' || next.userData.type === 'ascenseur') ? "l'ascenseur" : "les escaliers";
            steps.push(`Prendre ${transport} jusqu'à l'étage ${next.userData.floor}`);
            continue; // On passe à l'étape suivante pour ne pas spammer
        }

        // Changement d'environnement (Intérieur / Extérieur)
        if (path.userData.type !== currentEnvironment) {
            if (path.userData.type === 'outdoor') {
                steps.push(`Sortir du bâtiment`);
            } else {
                steps.push(`Entrer dans le bâtiment`);
            }
            currentEnvironment = path.userData.type;
        }

        // Point de repère (On ignore les simples "couloirs" sans nom pour ne pas polluer)
        // On s'assure aussi de ne pas annoncer l'arrivée en double (i + 1 !== nodes.length - 1)
        if (i + 1 !== nodes.length - 1 && next.userData.name && next.userData.type !== 'couloir') {
            steps.push(`Avancer jusqu'à ${next.userData.name}`);
        }
    }

    // L'arrivée
    steps.push(`Arrivée à ${nodes[nodes.length - 1].userData.name || 'votre destination'} (Étage ${nodes[nodes.length - 1].userData.floor})`);

    return steps;
}