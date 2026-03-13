import { map } from '../map.js';
import { CONFIG } from '../config.js';
import { state } from '../state.js';

// Fonction pour dessiner le noeud
export function renderNode(nodeData) {
    const color = CONFIG.TYPE_COLORS[nodeData.type] || "#000";
    
    const circleIcon = L.divIcon({
        className: 'custom-node-icon',
        html: `<div style="background-color: ${color}; width: 10px; height: 10px; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 3px rgba(0,0,0,0.5);"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
    });

    const marker = L.marker([nodeData.lat, nodeData.lng], {
        icon: circleIcon,
        interactive: false
    }).addTo(map);

    marker.userData = nodeData;
    state.nodes.push(marker);
}