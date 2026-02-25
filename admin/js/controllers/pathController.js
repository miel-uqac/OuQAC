import { map } from '../map.js';
import { state, removePathFromState } from '../state.js';
import { CONFIG } from '../config.js';
import * as UI from '../views/ui.js';
import * as IOCtrl from './ioController.js';

// ==========================================
// VARIABLES LOCALES
// ==========================================
let highlightLayer = null; // Stocke la "bordure" rouge temporaire
let labeledNodes = [];     // Stocke les nœuds qui ont actuellement une étiquette (A/B)

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

        // Définition des const utiles
        const startId = state.pathStartNode.userData.id;
        const endId = node.userData.id;
        const startFloor = state.pathStartNode.userData.floor;
        const endFloor = node.userData.floor;
        const startType = state.pathStartNode.userData.type;
        const endType = node.userData.type;
        const verticalTypes = ["escalier", "ascenseur"];

        // On cherche le chemin existant
        const existingPath = pathExists(startId, endId);

        // Vérification création d'un chemin sur un chemin existant
        if (existingPath) {
            // Si le chemin existe, on le sélectionne simplement
            selectPath(existingPath);
            resetPathSelection(); // On nettoie le point de départ
            return;
        }

        // Vérification création de chemin entre deux étages sur des noeuds autres qu'un escalier ou ascenseur
        if (startFloor !== endFloor && (!verticalTypes.includes(startType) || !verticalTypes.includes(endType))) {
            resetPathSelection();
            return;
        }
        // Sinon, création du chemin
        createPath(state.pathStartNode, node);
        resetPathSelection();
        IOCtrl.saveToLocalStorage();
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

// Fonction pour retirer la ligne rouge et les étiquettes
export function clearHighlight() {
    if (highlightLayer) {
        map.removeLayer(highlightLayer);
        highlightLayer = null;
    }
    
    // On retire les étiquettes A/B des nœuds
    labeledNodes.forEach(node => {
        node.unbindTooltip();
    });
    labeledNodes = []; // On vide la liste
}

// Vérifie si une polyline existe déjà entre deux IDs de nœuds
function pathExists(idA, idB) {
    return state.paths.find(p => {
        const s = p.userData.startId;
        const e = p.userData.endId;
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
    const polyline = L.polyline(latlngs, getPathStyle(type, pmr)).addTo(map);

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
    // 1. Nettoyage
    clearHighlight();

    // 2. Création de la surbrillance (Le calque rouge EN DESSOUS)
    highlightLayer = L.polyline(path.getLatLngs(), {
        color: '#ff3e3e',
        weight: 10,
        opacity: 1
    }).addTo(map);

    // 3. Selection state
    state.selectedPath = path;

    // 4. On s'assure que le chemin garde son style normal (bleu/vert)
    path.setStyle(getPathStyle(path.userData.type, path.userData.pmr));
    path.bringToFront();

    // 5. Formulaire
    const nodeA = state.nodes.find(n => n.userData.id === path.userData.startId);
    const nodeB = state.nodes.find(n => n.userData.id === path.userData.endId);
    UI.fillPathForm(path, nodeA, nodeB);

    // 6. Tooltips
    if (nodeA) {
        nodeA.bindTooltip("<b>A</b>", { permanent: true, direction: 'top', className: 'label-path-node' }).openTooltip();
        labeledNodes.push(nodeA);
    }
    if (nodeB) {
        nodeB.bindTooltip("<b>B</b>", { permanent: true, direction: 'top', className: 'label-path-node' }).openTooltip();
        labeledNodes.push(nodeB);
    }
}

// Récupérer style du chemin
export function getPathStyle(type, isPmr) {
    return {
        color: CONFIG.PATH_COLORS[type] || "#2c3e50", // Toujours la couleur du type
        weight: 7, // Toujours l'épaisseur standard
        opacity: 0.8,
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

                // Si ce chemin est celui actuellement sélectionné, on bouge aussi la ligne rouge
                if (state.selectedPath === path && highlightLayer) {
                    highlightLayer.setLatLngs(newLatLngs);
                }
            }
        }
    });
}

// Mis à jour des modifications
export function updateCurrentPath() {
    if (state.selectedPath) {
        // 1. Mise à jour des données
        state.selectedPath.userData.type = document.getElementById('path-type').value;
        state.selectedPath.userData.distManual = document.getElementById('path-dist-manual').value;
        state.selectedPath.userData.pmr = document.getElementById('path-pmr').checked;
        
        // 2. Mise à jour du style visuel
        state.selectedPath.setStyle(getPathStyle(
            state.selectedPath.userData.type, 
            state.selectedPath.userData.pmr
        ));

        // 3. On force le chemin à revenir au premier plan
        state.selectedPath.bringToFront();
        IOCtrl.saveToLocalStorage();
    }
}

// Suppression du chemin séléctionné
export function deleteCurrentPath() {
    if (state.selectedPath) {
        clearHighlight();
        map.removeLayer(state.selectedPath);
        removePathFromState(state.selectedPath);
        state.selectedPath = null;
        // Vider le formulaires
        UI.clearPathForm();
        IOCtrl.saveToLocalStorage();
    }
}