/**
 * ====================================================================
 * APPLICATION : OùQAC - Panel Communauté
 * FICHIER : nodeController.js (Controllers)
 * RÔLE : Contrôleur d'affichage des Nœuds
 * ====================================================================
 * * DESCRIPTION :
 * Ce fichier gère la création visuelle des points (salles, escaliers, etc.) 
 * pour l'interface communauté. Contrairement à la version Admin, les nœuds 
 * générés ici sont simplifiés, purement visuels, et statiques (non déplaçables 
 * et non cliquables directement sur la carte).
 * * FONCTIONS PRINCIPALES :
 * - renderNode(nodeData) : Prend les données brutes d'un nœud issues du 
 * fichier JSON (coordonnées, type, nom) et construit un marqueur Leaflet 
 * (`L.marker`). Il lui assigne une icône HTML personnalisée (un petit cercle 
 * dont la couleur est définie par le `CONFIG.TYPE_COLORS`).
 * * FLUX DE DONNÉES / TRAVAIL :
 * 1. Déclenchement : Appelée par `dataController.js` lors du chargement 
 * initial en itérant sur le tableau des nœuds du fichier `graph.json`.
 * 2. Instanciation : Le contrôleur crée l'objet Leaflet et lui attache 
 * les métadonnées (`userData`). 
 * 3. Stockage (Important) : Notez que la fonction n'ajoute pas directement 
 * le nœud à l'instance de la carte (`.addTo(map)` est absent). Elle se 
 * contente de le pousser dans le `state.nodes`. C'est ensuite le fichier 
 * `map.js` (via `filterMapElements`) qui prendra la responsabilité d'afficher 
 * ou masquer ces points selon ce que l'utilisateur recherche.
 **/

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
    });

    marker.userData = nodeData;
    state.nodes.push(marker);
}