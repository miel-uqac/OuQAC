// ==========================================
// CONFIGURATION
// ==========================================

export const CONFIG = {
    UQAC_COORDS: [48.4204, -71.0526],
    APP_VERSION: "1.1.0",
    
    // Configuration de la carte
    MAP_OPTS: {
        zoomSnap: 1,
        zoomDelta: 1,
        maxZoom: 22,
        minZoom: 18,
        // Rend la limite "solide"
        maxBoundsViscosity: 1.0 
    },

    // Limites de la carte [Coin Sud-Ouest, Coin Nord-Est]
    MAP_BOUNDS: [
        [48.416396, -71.060311], // Sud-Ouest
        [48.421910, -71.046623]  // Nord-Est
    ],
    
    // Couleurs
    TYPE_COLORS: {
        "salle": "#e74c3c",      // Rouge
        "couloir": "#3498db",    // Bleu
        "escalier": "#f1c40f",   // Jaune
        "ascenseur": "#9b59b6",  // Violet
        "wc": "#2ecc71"          // Vert
    },
    
    PATH_COLORS: {
        "indoor": "#3498db",  // Bleu
        "outdoor": "#2ecc71"  // Vert
    },

    // Plans des étages
    FLOORS: {
        "0": "../plans/pp/pp_nv1.svg",
        "1": "../plans/pp/pp_nv1.svg",
        "2": "../plans/pp/pp_nv1.svg",
    },

    // Coordonnées de l'overlay (Plan UQAC)
    OVERLAY_COORDS: {
        topLeft: [48.420673, -71.052806],
        topRight: [48.420125, -71.051561],
        bottomLeft: [48.419939, -71.053541]
    }
};