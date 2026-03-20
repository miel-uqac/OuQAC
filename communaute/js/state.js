// ==========================================
// ÉTAT GLOBAL (STATE)
// ==========================================

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