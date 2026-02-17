import { CONFIG } from './config.js';
import { state } from './state.js';

// ==========================================
// GESTION DE LA MAP
// ==========================================

// Initialisation de la carte
export const map = L.map('map', CONFIG.MAP_OPTS).setView(CONFIG.UQAC_COORDS, 17);

// Fond de carte OSM
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxNativeZoom: 19,
    maxZoom: 22,
    attribution: '© OpenStreetMap'
}).addTo(map);

// Gestion du plan d'étage (ImageOverlay)
const floorPlan = L.imageOverlay.rotated(
    CONFIG.FLOORS["0"],
    L.latLng(CONFIG.OVERLAY_COORDS.topLeft),
    L.latLng(CONFIG.OVERLAY_COORDS.topRight),
    L.latLng(CONFIG.OVERLAY_COORDS.bottomLeft),
    { opacity: 0.7, interactive: false, zIndex: 100 }
).addTo(map);

// Fonction pour changer l'étage
export function setFloor(floorId) {
    state.currentFloor = floorId;
    const imageUrl = CONFIG.FLOORS[floorId];
    if (imageUrl) {
        floorPlan.setUrl(imageUrl);
    }
}

// Fonction utilitaire pour filtrer l'affichage (Vue)
export function filterMapElements(floorId) {
    state.nodes.forEach(node => {
        if (node.userData.floor === floorId) {
            if (!map.hasLayer(node)) node.addTo(map);
        } else {
            map.removeLayer(node);
        }
    });

    state.paths.forEach(path => {
        if (path.userData.floor === floorId) {
            if (!map.hasLayer(path)) path.addTo(map);
        } else {
            map.removeLayer(path);
        }
    });
}