/**
 * ====================================================================
 * APPLICATION : OùQAC - Panel Communauté
 * FICHIER : pathController.js (Controllers)
 * RÔLE : Contrôleur d'affichage des Chemins (Lignes de navigation)
 * ====================================================================
 * * DESCRIPTION :
 * Ce fichier est responsable de la création en mémoire des segments (lignes) 
 * qui relient les différentes salles ou noeuds. Tout comme pour les nœuds, 
 * ces chemins sont créés de manière statique et non-interactive pour l'interface 
 * publique (l'utilisateur ne peut pas cliquer dessus pour les modifier).
 * * FONCTIONS PRINCIPALES :
 * - renderPath(pathData) : Reçoit les données d'un chemin (issues du JSON). 
 * Elle recherche d'abord les objets nœuds de départ et d'arrivée dans le 
 * `state.nodes` pour récupérer leurs coordonnées exactes. Ensuite, elle génère 
 * une `Polyline` Leaflet stylisée (couleur basée sur le type, ligne pleine 
 * ou pointillée selon l'accessibilité PMR).
 * * FLUX DE DONNÉES / TRAVAIL :
 * 1. Déclenchement : Appelée par `dataController.js` après que tous les nœuds 
 * aient été générés en mémoire.
 * 2. Liaison : La fonction fait le lien entre les données brutes (ID des nœuds) 
 * et les objets cartographiques réels (Markers) pour tracer la ligne.
 * 3. Stockage (Important) : Comme pour `nodeController.js`, la ligne n'est pas 
 * ajoutée directement à la carte (`addTo(map)` est absent). Elle est sauvegardée 
 * dans `state.paths`. L'affichage final ou la mise en surbrillance d'un itinéraire 
 * sera pris en charge ultérieurement par `filterMapElements` dans `map.js`.
 **/

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