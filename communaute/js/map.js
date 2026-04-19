/**
 * ====================================================================
 * APPLICATION : OùQAC - Panel Communauté
 * FICHIER : map.js
 * RÔLE : Moteur cartographique et affichage contextuel de l'itinéraire
 * ====================================================================
 * * DESCRIPTION :
 * Ce fichier initialise et gère l'instance de la carte Leaflet pour l'application 
 * publique. Contrairement au panel d'administration qui affiche tout le réseau, 
 * ce module est pensé pour une vue "utilisateur" : il masque le graphe par défaut 
 * et ne révèle dynamiquement que les éléments pertinents (la salle recherchée ou 
 * le tracé du GPS).
 * * FONCTIONS PRINCIPALES :
 * - Initialisation et Pré-chargement : Instancie la carte avec les restrictions 
 * de zone (config.js) et met en cache les plans architecturaux (overlays) pour 
 * assurer une transition fluide et instantanée entre les étages.
 * - setFloor(floorId) : Gère le basculement visuel des images de fond. Elle retire 
 * le plan de l'ancien étage et affiche celui du nouveau.
 * - filterMapElements(floorId) : C'est le filtre d'affichage conditionnel. Au lieu 
 * d'afficher tous les nœuds et chemins, il vérifie le `state` global pour ne montrer 
 * QUE le point de départ, d'arrivée, les étapes de la route, ou la cible d'une 
 * recherche selon l'étage. Les chemins affichés sont restreints à ceux de l'itinéraire 
 * actif (`activeRoutePaths`) et sont stylisés dynamiquement (tracé épais orange).
 * * FLUX DE DONNÉES / TRAVAIL :
 * 1. Au chargement : La carte se lance, précharge les plans, mais reste vierge 
 * de tout marqueur ou ligne.
 * 2. Déclenchement : L'utilisateur lance une recherche ou démarre la navigation 
 * via `main.js`, modifiant ainsi les variables `activeRouteNodes` ou `targetNode` 
 * dans le `state.js`.
 * 3. Rendu : Les fonctions de changement d'étage ou d'interface appellent 
 * `filterMapElements`. Celle-ci compare les données du `state` avec l'étage 
 * actuel, puis injecte (`addTo`) ou retire (`removeLayer`) chirurgicalement 
 * les éléments de l'instance Leaflet pour guider visuellement l'utilisateur.
 **/

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

// Fonctions de changement d'étage
export function setFloor(floorId) {
    state.currentFloor = floorId;
    
    // On retire d'abord toutes les images de la carte
    Object.values(allOverlays).forEach(overlay => {
        if (map.hasLayer(overlay)) map.removeLayer(overlay);
    });

    // On ajoute uniquement les images qui correspondent au nouvel étage demandé
    CONFIG.PLANS.filter(p => String(p.floor) === String(floorId)).forEach(plan => {
        allOverlays[plan.id].addTo(map);
    });
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