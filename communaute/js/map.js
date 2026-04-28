/**
 * ====================================================================
 * APPLICATION : OùQAC - Panel Communauté
 * FICHIER : map.js
 * RÔLE : Moteur cartographique et affichage contextuel de l'itinéraire
 * ====================================================================
 * * DESCRIPTION :
 * Utilise la boîte à outils `shared` pour créer la carte, mais y 
 * applique une logique d'affichage "utilisateur final". Le graphe 
 * complet est masqué par défaut, seuls les résultats et itinéraires 
 * sont dévoilés dynamiquement.
 * * FONCTIONS PRINCIPALES :
 * - setFloor(floorId) : Met à jour le `state` et délègue l'affichage.
 * - filterMapElements(floorId) : Affiche UNIQUEMENT les nœuds cibles
 * ou les chemins appartenant à l'itinéraire calculé (tracé orange).
 * * FLUX DE DONNÉES / TRAVAIL :
 * Rendu piloté par les événements utilisateur dans main.js et le state.
 * ====================================================================
 */

import { CONFIG } from './config.js';
import { state } from './state.js';
import { createMapInstance, createOverlays, updateFloorOverlays } from '../../shared/js/map.js';

// Initialisation via la boîte à outils partagée
export const map = createMapInstance(CONFIG.MAP_OPTS, CONFIG.MAP_BOUNDS, CONFIG.UQAC_COORDS);
const allOverlays = createOverlays(CONFIG.PLANS);

// On affiche le 1er étage dès le chargement de la page
setFloor("0");

// Fonctions de changement d'étage
export function setFloor(floorId) {
    state.currentFloor = floorId;
    updateFloorOverlays(map, allOverlays, CONFIG.PLANS, floorId);
}

// Fonction de filtrage (Spécifique Communauté)
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

    // Filtrage des chemins (Tracé du GPS)
    state.paths.forEach(path => {
        const inRoute = state.activeRoutePaths.includes(path);
        
        // On n'affiche que les chemins qui font partie de l'itinéraire calculé
        if (inRoute) {
            const startNode = state.nodes.find(n => n.userData.id === path.userData.startNode);
            const endNode = state.nodes.find(n => n.userData.id === path.userData.endNode);
            
            const startFloor = startNode ? String(startNode.userData.floor) : null;
            const endFloor = endNode ? String(endNode.userData.floor) : null;

            if (startFloor === String(floorId) || endFloor === String(floorId)) {
                if (!map.hasLayer(path)) path.addTo(map);
                
                // On stylise le chemin actif
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