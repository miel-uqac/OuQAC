export const CONFIG = {
    UQAC_COORDS: [48.4204, -71.0526],
    MAP_OPTS: {
        zoomSnap: 0,
        zoomDelta: 0.25,
        maxZoom: 22,
        minZoom: 16,
        maxBoundsViscosity: 1.0,
        zoomControl: false // On désactive le + et - par défaut pour un look mobile
    },
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
};