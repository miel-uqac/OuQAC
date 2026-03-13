import * as NodeCtrl from './nodeController.js';
import * as PathCtrl from './pathController.js';
import { state } from '../state.js';
import { filterMapElements } from '../map.js';

export async function loadGraphData() {
    try {
        // Chemin vers graph.json
        const response = await fetch('../graph/graph.json');
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        const data = await response.json();

        // On dessine tous les nœuds
        if (data.nodes) {
            data.nodes.forEach(nodeData => NodeCtrl.renderNode(nodeData));
        }

        // Ensuite on dessine les chemins
        if (data.paths) {
            data.paths.forEach(pathData => PathCtrl.renderPath(pathData));
        }

        // On filtre pour n'afficher que le RDC au chargement
        filterMapElements(state.currentFloor);

    } catch (error) {
        console.error("Impossible de charger le fichier graph.json :", error);
    }
}