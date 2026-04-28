/**
 * ====================================================================
 * APPLICATION : OùQAC - Panel Admin
 * FICHIER : map.js
 * RÔLE : Initialisation et gestion du moteur cartographique (Leaflet)
 * ====================================================================
 * * DESCRIPTION :
 * Utilise la boîte à outils `shared` pour créer la carte, puis lui 
 * greffe le comportement propre à l'admin : outil de calibrage 
 * multi-plans et filtrage visuel en mode édition.
 * * FONCTIONS PRINCIPALES :
 * - setFloor(floorId) : Met à jour le `state` et délègue l'affichage.
 * - filterMapElements(floorId) : Affiche TOUS les éléments de l'étage.
 * - Outil de calibrage (Multi-plans) : Widget rétractable permettant 
 * de déplacer les SVG en direct pour copier les coordonnées.
 * * FLUX DE DONNÉES / TRAVAIL :
 * 1. Initialise la map via les fonctions partagées.
 * 2. Gère les clics d'édition avec Leaflet.
 * ====================================================================
 */

import { CONFIG } from './config.js';
import { state } from './state.js';
import { createMapInstance, createOverlays, updateFloorOverlays } from '../../shared/js/map.js';

// ==========================================
// GESTION DE LA MAP
// ==========================================

export const map = createMapInstance(CONFIG.MAP_OPTS, CONFIG.MAP_BOUNDS, CONFIG.UQAC_COORDS);
const allOverlays = createOverlays(CONFIG.PLANS);

// On affiche le 1er étage dès le chargement de la page
setFloor("0");

// Fonctions de changement d'étage
export function setFloor(floorId) {
    state.currentFloor = floorId;
    updateFloorOverlays(map, allOverlays, CONFIG.PLANS, floorId);
}

// Fonction pour filtrer les nœuds/chemins (Spécifique Admin)
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
// OUTIL DE CALIBRAGE MULTI-PLANS (RÉTRACTABLE)
// ==========================================

let currentCalibPlanId = null;
let isCalibrationActive = false; // État du mode édition

// Marqueurs déplaçables
let mTopLeft = L.marker([0,0], { draggable: true });
let mTopRight = L.marker([0,0], { draggable: true });
let mBottomLeft = L.marker([0,0], { draggable: true });

// UI de calibrage
const coordsBox = L.control({ position: 'bottomright' });
coordsBox.onAdd = function() {
    let container = L.DomUtil.create('div', 'info-coords');
    container.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    container.style.color = 'white';
    container.style.padding = '15px';
    container.style.borderRadius = '8px';
    container.style.fontFamily = 'monospace';
    container.style.fontSize = '12px';
    container.style.minWidth = '200px';

    // Fonction interne pour redessiner le contenu selon l'état
    function renderUI() {
        if (!isCalibrationActive) {
            container.innerHTML = `<button id="btn-toggle-calib" style="width:100%; padding:8px; cursor:pointer; font-weight:bold; border-radius:4px; border:none;">🛠️ Calibrer les plans</button>`;
        } else {
            let selectHtml = `<select id="calib-select" style="width:100%; margin-bottom:10px; padding:5px; border-radius:4px;">`;
            CONFIG.PLANS.forEach(p => {
                selectHtml += `<option value="${p.id}" ${p.id === currentCalibPlanId ? 'selected' : ''}>${p.name}</option>`;
            });
            selectHtml += `</select>`;

            container.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <strong style="font-size:14px;">🛠️ Mode Calibrage</strong>
                    <button id="btn-toggle-calib" style="padding:4px 8px; cursor:pointer; background:#e74c3c; color:white; border:none; border-radius:4px;">Fermer</button>
                </div>
                ${selectHtml}
                <div id="calib-output" style="white-space: pre-wrap; margin-top:10px; color:#2ecc71;">Chargement...</div>
            `;
        }

        // Attache les événements après avoir recréé le HTML
        container.querySelector('#btn-toggle-calib').onclick = () => {
            isCalibrationActive = !isCalibrationActive;
            toggleCalibrationMode();
            renderUI();
        };

        if (isCalibrationActive) {
            container.querySelector('#calib-select').onchange = (e) => loadCalibrationPlan(e.target.value);
            if(currentCalibPlanId) updateCalibration();
        }
    }

    // Empêche le clic sur la box d'interagir avec la carte Leaflet
    L.DomEvent.disableClickPropagation(container);
    renderUI(); 
    return container;
};
coordsBox.addTo(map);

// Fonction pour activer/désactiver visuellement les marqueurs
function toggleCalibrationMode() {
    if (isCalibrationActive) {
        // Ajout à la carte
        mTopLeft.addTo(map);
        mTopRight.addTo(map);
        mBottomLeft.addTo(map);
        // Charge le premier plan si rien n'est sélectionné
        if (!currentCalibPlanId && CONFIG.PLANS.length > 0) loadCalibrationPlan(CONFIG.PLANS[0].id);
        else loadCalibrationPlan(currentCalibPlanId);
    } else {
        // Retrait de la carte
        mTopLeft.remove();
        mTopRight.remove();
        mBottomLeft.remove();
    }
}

// Charger les marqueurs sur un plan spécifique
function loadCalibrationPlan(planId) {
    currentCalibPlanId = planId;
    const plan = CONFIG.PLANS.find(p => p.id === planId);
    if (!plan) return;

    // Force la carte à aller sur le bon étage
    setFloor(plan.floor);
    
    // Synchronise l'interface déroulante principale
    const selLayer = document.getElementById('sel-layer');
    if (selLayer) selLayer.value = plan.floor;

    // Positionne les marqueurs sur l'image sélectionnée
    mTopLeft.setLatLng(plan.coords.topLeft);
    mTopRight.setLatLng(plan.coords.topRight);
    mBottomLeft.setLatLng(plan.coords.bottomLeft);
    
    if (isCalibrationActive) updateCalibration();
}

// Mettre à jour l'image et le texte lors du glissement
function updateCalibration() {
    if (!currentCalibPlanId || !isCalibrationActive) return;

    let tl = mTopLeft.getLatLng();
    let tr = mTopRight.getLatLng();
    let bl = mBottomLeft.getLatLng();

    // Déplace le plan ciblé
    allOverlays[currentCalibPlanId].reposition(tl, tr, bl);

    // Affiche le code exact à copier-coller
    const outputNode = document.getElementById('calib-output');
    if (outputNode) {
        outputNode.innerHTML = 
            `topLeft: [${tl.lat.toFixed(6)}, ${tl.lng.toFixed(6)}],
            topRight: [${tr.lat.toFixed(6)}, ${tr.lng.toFixed(6)}],
            bottomLeft: [${bl.lat.toFixed(6)}, ${bl.lng.toFixed(6)}]`;
    }
}

// Événements de déplacement
mTopLeft.on('drag', updateCalibration);
mTopRight.on('drag', updateCalibration);
mBottomLeft.on('drag', updateCalibration);