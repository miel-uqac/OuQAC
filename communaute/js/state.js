/**
 * ====================================================================
 * APPLICATION : OùQAC - Panel Communauté
 * FICHIER : state.js
 * RÔLE : Gestionnaire d'État (Single Source of Truth)
 * ====================================================================
 * * DESCRIPTION :
 * Ce fichier centralise la "mémoire vive" de l'application utilisateur.
 * Contrairement à l'Admin, il stocke non seulement les données du campus,
 * mais aussi les paramètres dynamiques liés au trajet et au guidage.
 * * STRUCTURE DE L'ÉTAT :
 * - Données Globales : Collections des nœuds, chemins et étage actuel.
 * - Contexte de Recherche : Cible isolée (targetNode) lors d'une recherche.
 * - Données d'Itinéraire : Points de départ (startNode) et d'arrivée (endNode).
 * - Cache de Navigation : Tableaux des identifiants (nodes/paths) formant
 * le chemin actif calculé par l'algorithme de pathfinding.
 * - Préférences Utilisateur : Paramètres d'accessibilité (PMR) et 
 * préférences d'environnement (Indoor/Outdoor).
 * * NOTE : Tous les contrôleurs importent cet objet pour lire ou 
 * modifier la donnée en temps réel.
 * ====================================================================
 */

export const state = {
    nodes: [],
    paths: [],
    currentFloor: "0",
    targetNode: null,
    
    // Variables pour l'itinéraire
    startNode: null,
    endNode: null,
    activeRouteNodes: [], // Contiendra les  nœuds du chemin
    activeRoutePaths: [],  // Contiendra les paths du chemin

    // Préférences de l'itinéraire
    routePrefPmr: false,           // false = marche, true = fauteuil
    routePrefEnvironment: 'indoor' // 'indoor' ou 'outdoor'
};