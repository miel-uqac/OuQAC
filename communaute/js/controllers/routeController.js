import { state } from '../state.js';
import { map } from '../map.js';

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
        // On récupère la distance du JSON ou on met 1 par défaut
        const cost = parseFloat(path.userData.distance) || 1;

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