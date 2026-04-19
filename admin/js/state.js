/**
 * ====================================================================
 * APPLICATION : OùQAC - Panel Admin
 * FICHIER : state.js
 * RÔLE : Gestionnaire d'état global (Mémoire de l'application)
 * ====================================================================
 * * DESCRIPTION :
 * Ce fichier fait office de "source de vérité" (Single Source of Truth) 
 * pour l'application. Il centralise et stocke l'état actuel de l'interface 
 * et les données en cours de manipulation, permettant à tous les autres 
 * modules de partager une base d'informations commune.
 * * FONCTIONS PRINCIPALES :
 * - Objet `state` : Structure de données qui conserve les variables globales 
 * essentielles (le mode actif, les tableaux des nœuds et chemins, les éléments 
 * actuellement sélectionnés, et l'étage visionné).
 * - removeNodeFromState(node) / removePathFromState(path) : Fonctions 
 * utilitaires qui permettent de filtrer et de supprimer proprement des éléments 
 * spécifiques des listes sans casser les références du tableau.
 * - resetState() : Vide entièrement la mémoire de l'application (particulièrement 
 * utile lors de l'importation d'un nouveau fichier de sauvegarde externe).
 * * STRUCTURE DE L'ÉTAT :
 * - Mode actuel (Navigation, Édition de points ou de chemins).
 * - Collections d'objets (Nœuds et Chemins) affichés sur la carte.
 * - Références de sélection (Quel élément est actuellement édité ?).
 * - Étage courant.
 * * NOTE : Tous les contrôleurs importent cet objet pour lire ou 
 * modifier la donnée en temps réel.
 * ====================================================================
 */

export const state = {
    currentMode: 'view', // 'view', 'node', 'path'
    nodes: [],           // Tableau des Markers
    paths: [],           // Tableau des Polylines
    
    // Sélection actuelle
    selectedNode: null,
    
    selectedPath: null,
    pathStartNode: null, // Premier clic pour création chemin

    currentFloor: "0"
};

// Fonctions utilitaires pour manipuler le state proprement
export function removeNodeFromState(node) {
    state.nodes = state.nodes.filter(n => n !== node);
}

export function removePathFromState(path) {
    state.paths = state.paths.filter(p => p !== path);
}

export function resetState() {
    state.nodes = [];
    state.paths = [];
    state.selectedNode = null;
    state.selectedPath = null;
}