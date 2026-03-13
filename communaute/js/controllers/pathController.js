import { map } from '../map.js';
import { CONFIG } from '../config.js';
import { state } from '../state.js';

// Fonction pour dessiner un chemin
export function renderPath(pathData) {
    // On retrouve les deux nœuds correspondants
    const nodeA = state.nodes.find(n => n.userData.id === pathData.startNode);
    const nodeB = state.nodes.find(n => n.userData.id === pathData.endNode);

    if (nodeA && nodeB) {
        const latlngs = [nodeA.getLatLng(), nodeB.getLatLng()];
        const color = CONFIG.PATH_COLORS[pathData.type] || "#2c3e50";
        const dashArray = pathData.isPmr ? null : '5, 10';

        const polyline = L.polyline(latlngs, {
            color: color,
            weight: 4,
            opacity: 0.6,
            dashArray: dashArray,
            interactive: false
        });

        polyline.userData = pathData;
        state.paths.push(polyline);
    }
}