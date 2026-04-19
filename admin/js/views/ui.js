/**
 * ====================================================================
 * APPLICATION : OùQAC - Panel Admin
 * FICHIER : ui.js (Views)
 * RÔLE : Gestionnaire de l'interface utilisateur (Manipulation du DOM)
 * ====================================================================
 * * DESCRIPTION :
 * Ce fichier est responsable de toute la manipulation visuelle de l'interface 
 * HTML de l'éditeur (hors carte Leaflet). Il isole la logique liée aux 
 * formulaires et aux listes dynamiques pour garder les contrôleurs propres.
 * * FONCTIONS PRINCIPALES :
 * - fillNodeForm(node) & fillPathForm(path, nodeA, nodeB) : Remplissent les 
 * formulaires du panneau d'édition avec les données (userData) de l'élément 
 * sélectionné. 
 * `fillNodeForm` détecte également de façon dynamique si le nœud possède 
 * des connexions vers d'autres étages (ascenseurs/escaliers) et crée des 
 * raccourcis cliquables.
 * - clearNodeForm() & clearPathForm() : Vident et réinitialisent les champs 
 * des panneaux d'édition lorsqu'un élément est désélectionné.
 * - updateRoomList() : Gère le moteur de recherche de la barre latérale. 
 * Elle filtre la liste globale des nœuds (state.nodes) selon le texte saisi 
 * et le type sélectionné, puis génère une liste de résultats cliquables 
 * permettant de "téléporter" la caméra sur la salle correspondante.
 * * FLUX DE DONNÉES / TRAVAIL :
 * 1. Déclenchement : Une fonction de `main.js` ou d'un Contrôleur appelle 
 * une méthode de `ui.js` (ex: lors d'un clic sur la carte ou d'une saisie textuelle).
 * 2. Lecture : `ui.js` lit les propriétés des objets Leaflet fournis ou 
 * interroge le `state` global.
 * 3. Rendu : Il modifie directement les éléments de la page web (via 
 * document.getElementById, innerHTML, value).
 * 4. Interaction : Pour les éléments générés à la volée (comme les résultats 
 * de recherche), il attache de nouveaux écouteurs d'événements qui 
 * rappelleront les Contrôleurs ou `main.js` lors d'un clic utilisateur.
 **/

import { state } from '../state.js';
import { map, setFloor, filterMapElements } from '../map.js';
import * as NodeCtrl from '../controllers/nodeController.js';
import * as PathCtrl from '../controllers/pathController.js';
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

    // Remplissage des chemins inter-étages
    const interfloorContainer = document.getElementById('node-interfloor-container');
    const interfloorList = document.getElementById('node-interfloor-list');
    interfloorList.innerHTML = '';

    // Filtrer les chemins qui relient ce nœud à un autre étage
    const interfloorPaths = state.paths.filter(p => {
        if (p.userData.startId !== node.userData.id && p.userData.endId !== node.userData.id) return false;
        const nA = state.nodes.find(n => n.userData.id === p.userData.startId);
        const nB = state.nodes.find(n => n.userData.id === p.userData.endId);
        return nA && nB && nA.userData.floor !== nB.userData.floor;
    });

    if (interfloorPaths.length > 0) {
        interfloorContainer.classList.remove('hidden');
        
        interfloorPaths.forEach(p => {
            const isStart = p.userData.startId === node.userData.id;
            const otherNodeId = isStart ? p.userData.endId : p.userData.startId;
            const otherNode = state.nodes.find(n => n.userData.id === otherNodeId);
            
            const otherName = otherNode ? (otherNode.userData.name || "Sans nom") : "?";
            const otherFloor = otherNode ? otherNode.userData.floor : "?";

            const item = document.createElement('div');
            item.className = 'room-item';
            item.innerHTML = `➔ Vers <b>${otherName}</b> <br><small>Étage ${otherFloor} (${p.userData.type})</small>`;
            item.style.border = "1px solid #ddd";
            item.style.marginBottom = "5px";
            item.style.borderRadius = "4px";

            item.addEventListener('click', () => {
                // Bascule en mode Chemin et sélectionne ce chemin
                const btnPath = document.querySelectorAll('.btn-mode')[2];
                changeMode('path', btnPath);
                PathCtrl.selectPath(p);
                clearNodeForm();
                state.selectedNode = null;
            });

            interfloorList.appendChild(item);
        });
    } else {
        interfloorContainer.classList.add('hidden');
    }
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
    document.getElementById('path-dist-auto').value = path.userData.distAuto;
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
export function updateRoomList() {
    const container = document.getElementById('room-list');
    const textFilter = document.getElementById('search-room').value.toLowerCase();
    const typeFilter = document.getElementById('search-type').value;
    
    container.innerHTML = "";

    const filteredNodes = state.nodes.filter(node => {
        const name = (node.userData.name || "").toLowerCase();
        const matchesSearch = name.includes(textFilter);
        const matchesType = typeFilter === "all" || node.userData.type === typeFilter;
        
        // On n'affiche que les nœuds qui ont un nom et qui correspondent aux filtres
        return matchesSearch && matchesType && node.userData.name.trim() !== "";
    });

    if (filteredNodes.length === 0) {
        container.innerHTML = '<div class="room-item">Aucun nœud trouvé</div>';
        return;
    }

    filteredNodes.forEach(node => {
        const nodeFloor = node.userData.floor;
        const item = document.createElement('div');
        item.className = 'room-item';
        // Affichage de l'étage pour plus de clarté dans la liste
        item.innerHTML = `<b>${node.userData.name}</b> <small>(${node.userData.type} - Étage ${nodeFloor})</small>`;
        
        item.addEventListener('click', () => {
            // Redirection vers le nœud
            map.flyTo(node.getLatLng(), 19);
            setFloor(nodeFloor);
            filterMapElements(nodeFloor);
            // On bascule en mode node
            const btnNode = document.querySelectorAll('.btn-mode')[1]; 
            changeMode('node', btnNode);
            NodeCtrl.selectNode(node);
        });

        container.appendChild(item);
    });
}