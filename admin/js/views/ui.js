import { state } from '../state.js';
import { map } from '../map.js';
import * as NodeCtrl from '../controllers/nodeController.js';
import { changeMode } from '../main.js';

// ==========================================
// GESTION INTERFACE
// ==========================================

// Mise à jour des inputs du formulaire Nœud
export function fillNodeForm(node) {
    if (!node) return;
    document.getElementById('node-id').value = node.userData.id;
    document.getElementById('node-name').value = node.userData.name;
    document.getElementById('node-type').value = node.userData.type;
    const pos = node.getLatLng();
    document.getElementById('node-coords').value = `${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`;
}

export function clearNodeForm() {
    document.getElementById('node-id').value = "";
    document.getElementById('node-name').value = "";
    document.getElementById('node-type').value = "salle";
    document.getElementById('node-coords').value = "";
}

// Mise à jour des inputs du formulaire Chemin
export function fillPathForm(path, nodeA, nodeB) {
    document.getElementById('path-form').classList.remove('hidden');
    document.getElementById('path-node-a').value = nodeA ? nodeA.userData.name || "Sans nom" : "?";
    document.getElementById('path-node-b').value = nodeB ? nodeB.userData.name || "Sans nom" : "?";
    document.getElementById('path-id').value = path.userData.id;
    document.getElementById('path-type').value = path.userData.type;
    document.getElementById('path-dist-auto').value = path.userData.distAuto + " m";
    document.getElementById('path-dist-manual').value = path.userData.distManual;
    document.getElementById('path-pmr').checked = path.userData.pmr;
}

export function clearPathForm() {
    document.getElementById('path-node-a').value = "";
    document.getElementById('path-node-b').value = "";
    document.getElementById('path-id').value = "";
    document.getElementById('path-type').value = "indoor";
    document.getElementById('path-dist-auto').value = "";
    document.getElementById('path-dist-manual').value = "";
    document.getElementById('path-pmr').checked = false;
    document.getElementById('path-form').classList.add('hidden');
}

// Gestion de la liste des salles (Sidebar)
export function updateRoomList(filter = "") {
    const container = document.getElementById('room-list');
    container.innerHTML = "";

    const salles = state.nodes.filter(node => {
        const name = (node.userData.name || "").toLowerCase();
        const matchesSearch = name.includes(filter);
        const isSalle = node.userData.type === 'salle';
        return matchesSearch && isSalle && node.userData.name !== "";
    });

    if (salles.length === 0) {
        container.innerHTML = '<div class="room-item">Aucune salle trouvée</div>';
        return;
    }

    salles.forEach(node => {
        const item = document.createElement('div');
        item.className = 'room-item';
        item.innerHTML = `<b>${node.userData.name}</b> <small>(${node.userData.type})</small>`;
        
        item.addEventListener('click', () => {
            map.flyTo(node.getLatLng(), 19);
            // On bascule en mode node via le contrôleur principal simulé
            const btnNode = document.querySelectorAll('.btn-mode')[1]; 
            changeMode('node', btnNode);
            NodeCtrl.selectNode(node);
        });

        container.appendChild(item);
    });
}