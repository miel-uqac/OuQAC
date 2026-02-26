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
        "0": "../plans/plan_bat.jpg",
        "1": "../plans/etage1.jpg",
        "2": "../plans/etage2.jpg"
    },

    // Coordonnées de l'overlay (Plan UQAC)
    OVERLAY_COORDS: {
        topLeft: [48.420607, -71.052667],
        topRight: [48.420174, -71.051671],
        bottomLeft: [48.419886, -71.053379]
    }
};