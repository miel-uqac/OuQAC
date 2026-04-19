/**
 * ====================================================================
 * APPLICATION : OùQAC - Panel Admin
 * FICHIER : ioController.js (Controllers)
 * RÔLE : Gestionnaire d'Entrées/Sorties (Sauvegarde et Importation)
 * ====================================================================
 * * DESCRIPTION :
 * Ce contrôleur est responsable de la persistance des données. Il permet 
 * de convertir l'état actuel de la carte (graphe de nœuds et chemins) en 
 * un format de données standardisé (JSON) pour le sauvegarder, l'exporter, 
 * ou le restaurer.
 * * FONCTIONS PRINCIPALES :
 * - generateGraphData() : Formate les données brutes du state.js (Leaflet) 
 * en un objet JavaScript propre et structuré, incluant des métadonnées 
 * (date, version de l'app).
 * - exportGraph() & importGraph(event) : Gèrent respectivement le téléchargement 
 * du fichier `graph.json` vers la machine de l'utilisateur, et la lecture 
 * d'un fichier externe pour écraser et remplacer le graphe actuel.
 * - saveToLocalStorage() & loadFromLocalStorage() : Gèrent la sauvegarde 
 * automatique en cache dans le navigateur. Évite de perdre tout son travail 
 * si l'utilisateur rafraîchit la page par erreur.
 * * FLUX DE DONNÉES / TRAVAIL :
 * 1. Sauvegarde/Export : Le contrôleur lit le `state.js`, extrait les coordonnées 
 * et propriétés (`userData`) de chaque élément Leaflet, puis sérialise le tout en JSON.
 * 2. Import/Chargement : À la réception d'un JSON (fichier ou LocalStorage), le 
 * contrôleur ordonne un nettoyage complet (`resetState`), puis itère sur 
 * les données lues. Il délègue la recréation visuelle aux contrôleurs 
 * spécifiques (NodeCtrl.createNode et PathCtrl.createPath) et demande à 
 * l'UI de se rafraîchir.
 **/

import { state, resetState } from '../state.js';
import { map, filterMapElements } from '../map.js';
import * as NodeCtrl from './nodeController.js';
import * as PathCtrl from './pathController.js';
import * as UI from '../views/ui.js';
import { CONFIG } from '../config.js';

// ==========================================
// FONCTION UTILITAIRE
// ==========================================
function generateGraphData() {
    return {
        metadata: {
            name: "OùQAC - Map Data",
            date: new Date().toLocaleString('fr-CA'),
            version: CONFIG.APP_VERSION,
            university: "UQAC"
        },
        nodes: state.nodes.map(n => ({
            id: n.userData.id,
            name: n.userData.name,
            type: n.userData.type,
            floor: n.userData.floor,
            lat: n.getLatLng().lat,
            lng: n.getLatLng().lng
        })),
        paths: state.paths.map(p => ({
            id: p.userData.id,
            startNode: p.userData.startId,
            endNode: p.userData.endId,
            type: p.userData.type,
            distance: p.userData.distManual || p.userData.distAuto,
            isPmr: p.userData.pmr
        }))
    };
}

// ==========================================
// EXPORT / IMPORT FICHIER JSON
// ==========================================

export function exportGraph() {
    const graphData = generateGraphData(); // On appelle la fonction ici

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(graphData, null, 4));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "graph.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

export function importGraph(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            // 1. Nettoyage
            state.nodes.forEach(n => map.removeLayer(n));
            state.paths.forEach(p => map.removeLayer(p));
            resetState();

            // 2. Reconstuction des nœuds
            data.nodes.forEach(nData => {
                const node = NodeCtrl.createNode(nData.lat, nData.lng, nData);
                NodeCtrl.refreshNodeStyle(node, false);
            });

            // 3. Reconstruction des chemins
            data.paths.forEach(pData => {
                const nodeA = state.nodes.find(n => n.userData.id === pData.startNode);
                const nodeB = state.nodes.find(n => n.userData.id === pData.endNode);
                if (nodeA && nodeB) {
                    PathCtrl.createPath(nodeA, nodeB, pData);
                }
            });

            // Refresh UI
            filterMapElements(state.currentFloor);
            UI.updateRoomList();
            alert(`Importation réussie : ${data.nodes.length} nœuds.`);

        } catch (err) {
            console.error(err);
            alert("Erreur JSON invalide.");
        }
    };
    reader.readAsText(file);
}

// ==========================================
// SAUVEGARDE AUTOMATIQUE (LOCAL STORAGE)
// ==========================================

export function saveToLocalStorage() {
    const graphData = generateGraphData();

    localStorage.setItem('ouqac_map_data', JSON.stringify(graphData));
    console.log("Sauvegarde automatique effectuée.");
}

export function loadFromLocalStorage() {
    const dataStr = localStorage.getItem('ouqac_map_data');
    if (!dataStr) return false; // Pas de données sauvegardées

    try {
        const data = JSON.parse(dataStr);
        
        // Nettoyage avant de charger
        state.nodes.forEach(n => map.removeLayer(n));
        state.paths.forEach(p => map.removeLayer(p));
        resetState();

        // Reconstruction des nœuds
        data.nodes.forEach(nData => {
            const node = NodeCtrl.createNode(nData.lat, nData.lng, nData);
            NodeCtrl.refreshNodeStyle(node, false);
        });

        // Reconstruction des chemins
        data.paths.forEach(pData => {
            const nodeA = state.nodes.find(n => n.userData.id === pData.startNode);
            const nodeB = state.nodes.find(n => n.userData.id === pData.endNode);
            if (nodeA && nodeB) {
                PathCtrl.createPath(nodeA, nodeB, pData);
            }
        });

        filterMapElements(state.currentFloor);
        UI.updateRoomList();
        console.log("Données chargées depuis le cache local.");
        return true;

    } catch (err) {
        console.error("Erreur de chargement du localStorage :", err);
        return false;
    }
}