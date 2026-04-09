import { CONFIG } from './config.js';
import { state } from './state.js';

// Initialisation de la carte
export const map = L.map('map', {
    ...CONFIG.MAP_OPTS,
    maxBounds: CONFIG.MAP_BOUNDS
}).setView(CONFIG.UQAC_COORDS, 17);

// Fond de carte OSM
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxNativeZoom: 19,
    maxZoom: 22,
    attribution: '© OpenStreetMap'
}).addTo(map);

// Gestion du plan d'étage
const floorPlan = L.imageOverlay.rotated(
    CONFIG.FLOORS["0"],
    L.latLng(CONFIG.OVERLAY_COORDS.topLeft),
    L.latLng(CONFIG.OVERLAY_COORDS.topRight),
    L.latLng(CONFIG.OVERLAY_COORDS.bottomLeft),
    { opacity: 1, interactive: false, zIndex: 100 }
).addTo(map);

// Fonctions de filtrage
export function setFloor(floorId) {
    state.currentFloor = floorId;
    const imageUrl = CONFIG.FLOORS[floorId];
    if (imageUrl) {
        floorPlan.setUrl(imageUrl);
        floorPlan.setOpacity(1);
    } else {
        floorPlan.setOpacity(0); // Cache le plan s'il n'existe pas encore
    }
}

export function filterMapElements(floorId) {
    // Filtrage des nœuds
    state.nodes.forEach(node => {
        const isTarget = state.targetNode === node;
        const isStart = state.startNode === node;
        const isEnd = state.endNode === node;
        const inRoute = state.activeRouteNodes.includes(node.userData.id);

        // On affiche si c'est la cible OU dans l'itinéraire, ET que c'est sur le bon étage
        if ((isTarget || isStart || isEnd || inRoute) && String(node.userData.floor) === String(floorId)) {
            if (!map.hasLayer(node)) node.addTo(map);
        } else {
            map.removeLayer(node);
        }
    });

    // Filtrage des chemins
    state.paths.forEach(path => {
        const inRoute = state.activeRoutePaths.includes(path);
        
        // On n'affiche QUE les chemins qui font partie de l'itinéraire calculé
        if (inRoute) {
            const startNode = state.nodes.find(n => n.userData.id === path.userData.startNode);
            const endNode = state.nodes.find(n => n.userData.id === path.userData.endNode);
            
            const startFloor = startNode ? String(startNode.userData.floor) : null;
            const endFloor = endNode ? String(endNode.userData.floor) : null;

            if (startFloor === String(floorId) || endFloor === String(floorId)) {
                if (!map.hasLayer(path)) path.addTo(map);
                
                // On stylise le chemin
                path.setStyle({ color: '#ff6b00', weight: 6, opacity: 1, dashArray: null });
                path.bringToFront();
            } else {
                map.removeLayer(path);
            }
        } else {
            map.removeLayer(path);
        }
    });
}