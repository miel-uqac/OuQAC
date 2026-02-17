import { state, resetState } from '../state.js';
import { map, filterMapElements } from '../map.js';
import * as NodeCtrl from './nodeController.js';
import * as PathCtrl from './pathController.js';
import * as UI from '../views/ui.js';
import { CONFIG } from '../config.js';

export function exportGraph() {
    const graphData = {
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