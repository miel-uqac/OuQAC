/**
 * ====================================================================
 * APPLICATION : OùQAC - Panel Admin
 * FICHIER : map.js
 * RÔLE : Initialisation et gestion du moteur cartographique (Leaflet)
 * ====================================================================
 * * DESCRIPTION :
 * Ce fichier est responsable de tout ce qui touche directement à l'instance 
 * de la carte Leaflet. Il initialise la vue, gère le fond de carte (OSM) 
 * et s'occupe de la superposition des plans de l'université. Il intègre 
 * également un outil de calibrage visuel pour positionner ces plans.
 * * FONCTIONS PRINCIPALES :
 * - Initialisation : Création de la constante `map` avec les options de 
 * restrictions de zone et de zoom issues de config.js.
 * - Pré-chargement : Génération et stockage en mémoire de tous les calques 
 * d'images (overlays) pour éviter les temps de chargement lors des 
 * changements d'étages.
 * - setFloor(floorId) : Bascule l'affichage des images de fond. Retire 
 * tous les plans actifs et n'affiche que ceux liés au nouvel étage.
 * - filterMapElements(floorId) : Parcourt le state.js pour afficher ou 
 * masquer les nœuds et les chemins vectoriels selon l'étage actif.
 * - Outil de calibrage (Multi-plans) : Interface UI en bas à droite et 
 * marqueurs déplaçables permettant d'ajuster visuellement les coins 
 * (Haut-Gauche, Haut-Droit, Bas-Gauche) des plans et de générer 
 * automatiquement les coordonnées précises à copier dans config.js.
 * * FLUX DE DONNÉES / TRAVAIL :
 * 1. Au chargement, le fichier lit config.js pour instancier la carte et 
 * préparer les calques d'images en arrière-plan.
 * 2. Lors d'un changement d'étage déclenché par l'utilisateur (intercepté 
 * par main.js), setFloor() et filterMapElements() sont appelés.
 * 3. Ces fonctions lisent l'état global (state.js) pour masquer ce qui 
 * n'est plus pertinent et injecter (addTo) les nouveaux éléments visuels 
 * dans l'instance Leaflet, mettant ainsi la carte à jour.
 **/

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

// Pré-chargement de tous les calques d'images en mémoire
const allOverlays = {};
CONFIG.PLANS.forEach(plan => {
    allOverlays[plan.id] = L.imageOverlay.rotated(
        plan.url,
        L.latLng(plan.coords.topLeft),
        L.latLng(plan.coords.topRight),
        L.latLng(plan.coords.bottomLeft),
        { opacity: 1, interactive: false, zIndex: 100 }
    );
});

// Fonction pour changer l'étage
export function setFloor(floorId) {
    state.currentFloor = floorId;
    
    // Retire d'abord toutes les images de la carte
    Object.values(allOverlays).forEach(overlay => {
        if (map.hasLayer(overlay)) map.removeLayer(overlay);
    });

    // Ajoute uniquement les images correspondantes au nouvel étage
    CONFIG.PLANS.filter(p => p.floor === floorId).forEach(plan => {
        allOverlays[plan.id].addTo(map);
    });
}

// Fonction pour filtrer les nœuds/chemins (inchangée)
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

// ==========================================
// OUTIL DE CALIBRAGE MULTI-PLANS
// ==========================================

let currentCalibPlanId = null;

// UI de calibrage
const coordsBox = L.control({ position: 'bottomright' });
coordsBox.onAdd = function() {
    let div = L.DomUtil.create('div', 'info-coords');
    div.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    div.style.color = 'white';
    div.style.padding = '15px';
    div.style.borderRadius = '8px';
    div.style.fontFamily = 'monospace';
    div.style.fontSize = '12px';
    div.style.minWidth = '250px';

    // Création du select pour choisir le plan
    let selectHtml = `<select id="calib-select" style="width:100%; margin-bottom:10px; padding:5px;">`;
    CONFIG.PLANS.forEach(p => {
        selectHtml += `<option value="${p.id}">${p.name}</option>`;
    });
    selectHtml += `</select>`;

    div.innerHTML = selectHtml + '<div id="calib-output" style="white-space: pre-wrap;">Chargement...</div>';
    
    // Empêche le clic sur le menu déroulant d'interagir avec la carte Leaflet
    L.DomEvent.disableClickPropagation(div);
    return div;
};
coordsBox.addTo(map);

// Marqueurs déplaçables
let mTopLeft = L.marker([0,0], { draggable: true }).addTo(map);
let mTopRight = L.marker([0,0], { draggable: true }).addTo(map);
let mBottomLeft = L.marker([0,0], { draggable: true }).addTo(map);

// Charger les marqueurs sur un plan spécifique
function loadCalibrationPlan(planId) {
    currentCalibPlanId = planId;
    const plan = CONFIG.PLANS.find(p => p.id === planId);
    if (!plan) return;

    // Force la carte à aller sur le bon étage pour voir l'image qu'on calibre
    setFloor(plan.floor);
    
    // Optionnel : Synchronise l'interface déroulante principale si elle existe
    const selLayer = document.getElementById('sel-layer');
    if (selLayer) selLayer.value = plan.floor;

    // Positionne les marqueurs sur l'image sélectionnée
    mTopLeft.setLatLng(plan.coords.topLeft);
    mTopRight.setLatLng(plan.coords.topRight);
    mBottomLeft.setLatLng(plan.coords.bottomLeft);
    
    updateCalibration();
}

// Mettre à jour l'image et le texte lors du glissement
function updateCalibration() {
    if (!currentCalibPlanId) return;

    let tl = mTopLeft.getLatLng();
    let tr = mTopRight.getLatLng();
    let bl = mBottomLeft.getLatLng();

    // Déplace le plan ciblé
    allOverlays[currentCalibPlanId].reposition(tl, tr, bl);

    // Affiche le code exact à copier-coller dans config.js
    document.getElementById('calib-output').innerHTML = 
`topLeft: [${tl.lat.toFixed(6)}, ${tl.lng.toFixed(6)}],
topRight: [${tr.lat.toFixed(6)}, ${tr.lng.toFixed(6)}],
bottomLeft: [${bl.lat.toFixed(6)}, ${bl.lng.toFixed(6)}]`;
}

// Événements
document.getElementById('calib-select').addEventListener('change', (e) => {
    loadCalibrationPlan(e.target.value);
});

mTopLeft.on('drag', updateCalibration);
mTopRight.on('drag', updateCalibration);
mBottomLeft.on('drag', updateCalibration);

// Lancement automatique sur le premier plan de la liste
if (CONFIG.PLANS.length > 0) {
    loadCalibrationPlan(CONFIG.PLANS[0].id);
}