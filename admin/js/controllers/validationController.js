/**
 * ====================================================================
 * APPLICATION : OùQAC - Panel Admin
 * FICHIER : validationController.js (Controllers)
 * RÔLE : Lancement de la validation du graphe et navigation vers les erreurs
 * ====================================================================
 * * DESCRIPTION :
 * Ce fichier fait le pont entre le validateur pur (shared/js/graphValidator.js)
 * et l'éditeur. Il récupère le graphe en cours d'édition, le fait valider,
 * demande à ui.js d'afficher le rapport, puis gère le clic sur un problème
 * pour amener l'administrateur directement sur l'élément fautif.
 * * FONCTIONS PRINCIPALES :
 * - runValidation() : Construit le JSON du graphe courant (même format que
 * l'export), appelle validateGraph() et affiche le rapport.
 * - focusIssue(issue) : Bascule sur l'étage concerné, centre la carte et
 * sélectionne le nœud (ou le chemin) cité par le problème.
 * * FLUX DE DONNÉES / TRAVAIL :
 * 1. Déclenchement : clic sur "Valider le graphe" (branché dans main.js).
 * 2. Lecture : generateGraphData() transforme state.nodes / state.paths
 * (objets Leaflet) en JSON brut.
 * 3. Calcul : validateGraph() renvoie { valid, errorCount, warningCount, issues }.
 * 4. Rendu : UI.renderValidationReport() affiche le panneau ; chaque ligne
 * cliquable rappelle focusIssue().
 **/

import { state } from '../state.js';
import { map, setFloor, filterMapElements } from '../map.js';
import { generateGraphData } from './ioController.js';
import * as NodeCtrl from './nodeController.js';
import * as PathCtrl from './pathController.js';
import * as UI from '../views/ui.js';
import { changeMode } from '../main.js';
import { validateGraph } from '../../../shared/js/graphValidator.js';

// Lance la validation sur le graphe en cours d'édition et affiche le rapport
export function runValidation() {
    const report = validateGraph(generateGraphData());
    UI.renderValidationReport(report, focusIssue);
}

// Amène la carte sur l'élément concerné par un problème
export function focusIssue(issue) {
    const node = state.nodes.find(n => issue.nodeIds.includes(n.userData.id));
    const path = state.paths.find(p => issue.pathIds.includes(p.userData.id));

    // Le problème concerne un nœud : on le sélectionne en mode "Nœuds"
    if (node) {
        showFloor(node.userData.floor);
        map.flyTo(node.getLatLng(), 19);
        changeMode('node', document.querySelectorAll('.btn-mode')[1]);
        NodeCtrl.selectNode(node);
        return;
    }

    // Sinon, il ne concerne qu'un chemin : on le sélectionne en mode "Chemins"
    if (path) {
        const start = state.nodes.find(n => n.userData.id === path.userData.startId);
        if (start) showFloor(start.userData.floor);
        map.flyTo(path.getBounds().getCenter(), 19);
        changeMode('path', document.querySelectorAll('.btn-mode')[2]);
        PathCtrl.selectPath(path);
    }
}

// Même enchaînement que le sélecteur d'étage de main.js
function showFloor(floor) {
    document.getElementById('sel-layer').value = floor;
    setFloor(floor);
    filterMapElements(floor);
}
