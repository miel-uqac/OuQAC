import { map } from '../map.js';
import { state, removePathFromState } from '../state.js';
import { CONFIG } from '../config.js';
import * as UI from '../views/ui.js';

// ==========================================
// GESTION DES CHEMINS
// ==========================================

// Cette fonction sera appelée quand on clique sur un nœud en mode chemin
export function handleNodeClickForPath(node) {
    if (!state.pathStartNode) {
        // Premier clic : on sélectionne le point de départ
        state.pathStartNode = node;
        // On donne un petit effet visuel au nœud sélectionné
        const div = node.getElement()?.querySelector('div');
        if (div) div.style.border = "3px solid white"; // Feedback visuel
    } else {
        // Deuxième clic : on vérifie que ce n'est pas le même nœud
        if (state.pathStartNode === node) {
            resetPathSelection();
            return;
        }
        // Vérification création d'un chemin sur un chemin existant
        if (pathExists(state.pathStartNode.userData.id, node.userData.id)) {
            alert("Chemin déjà existant !");
            resetPathSelection();
            return;
        }
        // Création du chemin
        createPath(state.pathStartNode, node);
        resetPathSelection();
    }
}

// Reset le style du noeud séléctionné
export function resetPathSelection() {
    if (state.pathStartNode) {
        const div = state.pathStartNode.getElement()?.querySelector('div');
        if (div) div.style.border = "2px solid black";
    }
    state.pathStartNode = null;
}

// Vérifie si une polyline existe déjà entre deux IDs de nœuds
function pathExists(idA, idB) {
    return state.paths.some(p => {
        const s = p.userData.startId;
        const e = p.userData.endId;
        // On vérifie dans les deux sens (A->B ou B->A)
        return (s === idA && e === idB) || (s === idB && e === idA);
    });
}

export function createPath(nodeA, nodeB, existingData = null) {
    const latlngs = [nodeA.getLatLng(), nodeB.getLatLng()];
    // Calcul de la distance réelle en mètres
    const distanceMeters = map.distance(nodeA.getLatLng(), nodeB.getLatLng());

    const id = existingData ? existingData.id : "path_" + Date.now();
    const type = existingData ? existingData.type : "indoor";
    const pmr = existingData ? existingData.isPmr : true; // Attention nom variable JSON vs userData
    
    // On applique le style dynamiquement
    const polyline = L.polyline(latlngs, getPathStyle(type, pmr, false)).addTo(map);

    // Stockage des données personnalisées dans le chemin
    polyline.userData = {
        id: id,
        startId: nodeA.userData.id,
        endId: nodeB.userData.id,
        type: type,
        distAuto: distanceMeters.toFixed(2),
        distManual: existingData ? existingData.distance : "", // Peut écraser l'auto
        pmr: pmr,
        floor: nodeA.userData.floor
    };

    // Événement : Clic sur le polyline pour l'éditer
    polyline.on('click', (e) => {
        if (state.currentMode === 'path') {
            L.DomEvent.stopPropagation(e);
            selectPath(polyline);
        }
    });

    state.paths.push(polyline);
    if (!existingData) selectPath(polyline);
    return polyline;
}

export function selectPath(path) {
    // 1. Réinitialiser le style de tous les autres chemins
    state.paths.forEach(p => p.setStyle(getPathStyle(p.userData.type, p.userData.pmr, false)));
    
    // 2. Appliquer le style sélectionné
    state.selectedPath = path;
    path.setStyle(getPathStyle(path.userData.type, path.userData.pmr, true));
    path.bringToFront();

    // 3. Récupérer les noms des nœuds à partir de leurs IDs
    const nodeA = state.nodes.find(n => n.userData.id === path.userData.startId);
    const nodeB = state.nodes.find(n => n.userData.id === path.userData.endId);

    // 4. Remplissage du formulaire
    UI.fillPathForm(path, nodeA, nodeB);
}

// Récupérer style du chemin
export function getPathStyle(type, isPmr, isSelected) {
    return {
        color: isSelected ? "#ff3d3d" : (CONFIG.PATH_COLORS[type] || "#2c3e50"),
        weight: isSelected ? 7 : 5, // Plus épais si sélectionné
        opacity: isSelected ? 1 : 0.8,
        dashArray: isPmr ? null : '10, 15'
    };
}

// Mise à jour des chemins quand on déplace un nœud
export function updatePathsAttachedToNode(node) {
    // Si on déplace le nœud, on recalcule les chemins qui y sont rattachées
    state.paths.forEach(path => {
        if (path.userData.startId === node.userData.id || path.userData.endId === node.userData.id) {
            // On retrouve les deux nœuds pour mettre à jour les positions
            const nStart = state.nodes.find(n => n.userData.id === path.userData.startId);
            const nEnd = state.nodes.find(n => n.userData.id === path.userData.endId);
            if (nStart && nEnd) {
                path.setLatLngs([nStart.getLatLng(), nEnd.getLatLng()]);
                // Mise à jour distance auto
                path.userData.distAuto = map.distance(nStart.getLatLng(), nEnd.getLatLng()).toFixed(2);
            }
        }
    });
}

// Validation des modifications
export function validatePath() {
    if (state.selectedPath) {
        state.selectedPath.userData.type = document.getElementById('path-type').value;
        state.selectedPath.userData.distManual = document.getElementById('path-dist-manual').value;
        state.selectedPath.userData.pmr = document.getElementById('path-pmr').checked;
        
        // Appliquer le nouveau style
        state.selectedPath.setStyle(getPathStyle(state.selectedPath.userData.type, state.selectedPath.userData.pmr, true));
        alert("Chemin validé !");
    }
}

// Suppression du chemin séléctionné
export function deleteCurrentPath() {
    if (state.selectedPath) {
        map.removeLayer(state.selectedPath);
        removePathFromState(state.selectedPath);
        state.selectedPath = null;
        // Vider le formulaires
        UI.clearPathForm();
    }
}