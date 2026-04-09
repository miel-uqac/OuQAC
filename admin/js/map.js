import { CONFIG } from './config.js';
import { state } from './state.js';

// ==========================================
// GESTION DE LA MAP
// ==========================================

// Initialisation de la carte avec fusion des options et des limites
export const map = L.map('map', {
    ...CONFIG.MAP_OPTS,        // On récupère zoomSnap, minZoom, maxBoundsViscosity...
    maxBounds: CONFIG.MAP_BOUNDS // On applique la restriction de zone
}).setView(CONFIG.UQAC_COORDS, 17);

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
    { opacity: 1, interactive: false, zIndex: 100 }
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

/*
// ==========================================
// OUTIL DE CALIBRAGE TEMPORAIRE (À SUPPRIMER APRÈS)
// ==========================================

// 1. Création d'une petite boîte UI pour afficher les coordonnées
const coordsBox = L.control({ position: 'bottomright' });
coordsBox.onAdd = function() {
    let div = L.DomUtil.create('div', 'info-coords');
    div.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    div.style.color = 'white';
    div.style.padding = '15px';
    div.style.borderRadius = '8px';
    div.style.fontFamily = 'monospace';
    div.style.fontSize = '12px';
    div.style.whiteSpace = 'pre-wrap';
    div.innerHTML = 'Bougez les marqueurs...';
    return div;
};
coordsBox.addTo(map);

// 2. Création des 3 marqueurs déplaçables aux positions initiales
let mTopLeft = L.marker(CONFIG.OVERLAY_COORDS.topLeft, { draggable: true }).addTo(map);
let mTopRight = L.marker(CONFIG.OVERLAY_COORDS.topRight, { draggable: true }).addTo(map);
let mBottomLeft = L.marker(CONFIG.OVERLAY_COORDS.bottomLeft, { draggable: true }).addTo(map);

// 3. Fonction pour mettre à jour l'image et le texte
function updateCalibration() {
    let tl = mTopLeft.getLatLng();
    let tr = mTopRight.getLatLng();
    let bl = mBottomLeft.getLatLng();

    // On déplace l'image en temps réel
    floorPlan.reposition(tl, tr, bl);

    // On met à jour le texte dans la boîte avec le format exact pour config.js
    document.querySelector('.info-coords').innerHTML = 
`topLeft: [${tl.lat.toFixed(6)}, ${tl.lng.toFixed(6)}],
topRight: [${tr.lat.toFixed(6)}, ${tr.lng.toFixed(6)}],
bottomLeft: [${bl.lat.toFixed(6)}, ${bl.lng.toFixed(6)}]`;
}

// 4. Écouter les mouvements des marqueurs
mTopLeft.on('drag', updateCalibration);
mTopRight.on('drag', updateCalibration);
mBottomLeft.on('drag', updateCalibration);

// Lancer une première fois pour initialiser le texte
updateCalibration();*/