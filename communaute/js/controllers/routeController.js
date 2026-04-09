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
        pathEdges.unshift(data.path); 
        currentId = data.prevId;
        pathNodes.unshift(currentId);
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

    // Fonction utilitaire pour calculer le cap vers le prochain point
    const getBearing = (p1, p2) => {
        const dLat = p2.lat - p1.lat;
        const dLng = p2.lng - p1.lng;
        
        // Calcul du cap en degrés
        const bearing = (Math.atan2(dLng, dLat) * 180) / Math.PI; 
        
        return -bearing; 
    };

    let currentEnvironment = paths[0].userData.type;

    // Étape de départ
    steps.push({
        text: `Départ de ${nodes[0].userData.name || 'votre position'}`,
        node: nodes[0],
        pathIndex: 0,
        angle: getBearing(nodes[0].getLatLng(), nodes[1].getLatLng())
    });

    for (let i = 0; i < nodes.length - 1; i++) {
        const current = nodes[i];
        const next = nodes[i + 1];
        const path = paths[i];
        const currentAngle = getBearing(current.getLatLng(), next.getLatLng());

        // Changement d'étage
        if (current.userData.floor !== next.userData.floor) {
            const transport = (current.userData.type === 'ascenseur' || next.userData.type === 'ascenseur') ? "l'ascenseur" : "les escaliers";
            steps.push({
                text: `Prendre ${transport} jusqu'à l'étage ${next.userData.floor}`,
                node: current,
                pathIndex: i,
                angle: currentAngle
            });
            continue; 
        }

        // Changement d'environnement
        if (path.userData.type !== currentEnvironment) {
            steps.push({
                text: path.userData.type === 'outdoor' ? `Sortir du bâtiment` : `Entrer dans le bâtiment`,
                node: current,
                pathIndex: i,
                angle: currentAngle
            });
            currentEnvironment = path.userData.type;
        }

        // Calcul direction (Virages)
        if (i > 0) {
            const prev = nodes[i - 1];
            if (prev.userData.floor === current.userData.floor) {
                const angle1 = Math.atan2(current.getLatLng().lat - prev.getLatLng().lat, current.getLatLng().lng - prev.getLatLng().lng) * 180 / Math.PI;
                const angle2 = Math.atan2(next.getLatLng().lat - current.getLatLng().lat, next.getLatLng().lng - current.getLatLng().lng) * 180 / Math.PI;
                
                let diff = angle2 - angle1;
                while (diff > 180) diff -= 360;
                while (diff < -180) diff += 360;

                let turnInstruction = null;
                if (diff >= 30 && diff <= 150) turnInstruction = "Tourner à gauche";
                else if (diff <= -30 && diff >= -150) turnInstruction = "Tourner à droite";
                else if (diff > 150 || diff < -150) turnInstruction = "Faire demi-tour";

                if (turnInstruction) {
                    const locationContext = current.userData.name ? ` au niveau de ${current.userData.name}` : '';
                    steps.push({
                        text: `${turnInstruction}${locationContext}`,
                        node: current,
                        pathIndex: i,
                        angle: currentAngle
                    });
                }
            }
        }

        // Point de repère
        if (i + 1 !== nodes.length - 1 && next.userData.name && next.userData.type !== 'couloir') {
            const lastStep = steps.length > 0 ? steps[steps.length - 1].text : "";
            if (!lastStep.includes(`au niveau de ${next.userData.name}`)) {
                steps.push({
                    text: `Avancer jusqu'à ${next.userData.name}`,
                    node: current,
                    pathIndex: i,
                    angle: currentAngle
                });
            }
        }
    }

    // L'arrivée
    steps.push({
        text: `Arrivée à ${nodes[nodes.length - 1].userData.name || 'votre destination'}`,
        node: nodes[nodes.length - 1],
        pathIndex: paths.length - 1,
        angle: 0
    });

    return steps;
}