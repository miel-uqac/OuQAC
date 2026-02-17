import { map } from '../map.js';
import { state, removeNodeFromState } from '../state.js';
import { CONFIG } from '../config.js';
import * as UI from '../views/ui.js';
import * as PathCtrl from './pathController.js'; // Pour mettre à jour les chemins liés

// ==========================================
// GESTION DES NOEUDS
// ==========================================

export function createNode(lat, lng, existingData = null) {
    const id = existingData ? existingData.id : "node_" + Date.now();
    const type = existingData ? existingData.type : "salle";
    const floor = existingData ? existingData.floor : state.currentFloor;
    const name = existingData ? existingData.name : "";

    // Création d'une icône personnalisée en forme de cercle
    const circleIcon = L.divIcon({
        className: 'custom-node-icon',
        html: getNodeHtml(type),
        iconSize: [16, 16],
        iconAnchor: [8, 8]
    });

    // On crée un Marker standard avec notre icon
    const marker = L.marker([lat, lng], {
        icon: circleIcon,
        draggable: true
    }).addTo(map);

    // Stockage des données personnalisées dans l'objet marker
    marker.userData = { id, name, type, floor };

    // --- Events ---
    // Clic sur le marker pour l'éditer / Pour créer un chemin
    marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        // On choisi quelle action de séléction faire
        handleNodeClick(marker);
    });

    // Mise à jour dynamique des chemins connectés
    marker.on('drag', () => {
        PathCtrl.updatePathsAttachedToNode(marker);
    });

    // Drag & Drop
    marker.on('dragend', () => {
        // Lancer les actions de séléctions quand on drag
        handleNodeClick(marker);
        // Mettre à jour les informations dynamiquement
        UI.fillNodeForm(marker);
    });

    state.nodes.push(marker);

    // Si c'est une création manuelle (pas un import), on le sélectionne
    if (!existingData) {
        state.nodeIsTemporary = true; // Nouveau nœud = temporaire
        selectNode(marker);
    }
    
    return marker;
}

function getNodeHtml(type) {
    const color = CONFIG.TYPE_COLORS[type] || "#000";
    return `<div style="background-color: ${color}; width: 12px; height: 12px; border: 2px solid black; border-radius: 50%;"></div>`;
}

export function handleNodeClick(node) {
    // On test dans quel mode on est :
    // node -> édition du marker
    // path -> création du chemin
    if (state.currentMode === 'node') {
        // Si on clique sur un nœud existant, il perd son statut temporaire
        if (state.selectedNode !== node) state.nodeIsTemporary = false;
        selectNode(node);
    } else if (state.currentMode === 'path') {
        PathCtrl.handleNodeClickForPath(node);
    }
}

export function selectNode(node) {
    // 1. Réinitialiser le style de tous les autres nœuds
    state.nodes.forEach(n => refreshNodeStyle(n, false));
    
    // 2. Appliquer le contour blanc au nœud sélectionné
    state.selectedNode = node;
    refreshNodeStyle(node, true);
    
    // Remplissage du formulaire latéral
    UI.fillNodeForm(node);
}

export function refreshNodeStyle(node, isSelected) {
    const color = CONFIG.TYPE_COLORS[node.userData.type] || "#000";
    const div = node.getElement()?.querySelector('div');
    if (div) {
        div.style.backgroundColor = color;
        div.style.border = isSelected ? "3px solid white" : "2px solid black";
        if (isSelected) div.style.boxShadow = "0 0 5px rgba(0,0,0,0.5)";
        else div.style.boxShadow = "none";
    }
}

// Validation des modifications
export function validateNode() {
    if (state.selectedNode) {
        state.selectedNode.userData.name = document.getElementById('node-name').value;
        state.selectedNode.userData.type = document.getElementById('node-type').value;
        state.nodeIsTemporary = false;
        
        refreshNodeStyle(state.selectedNode, true);
        UI.updateRoomList();
        alert("Nœud enregistré !");
    }
}

// Suppression du noeud sélectionné
export function deleteCurrentNode() {
    if (state.selectedNode) {
        map.removeLayer(state.selectedNode);
        removeNodeFromState(state.selectedNode);
        state.selectedNode = null;
        UI.clearNodeForm();
        UI.updateRoomList();
    }
}