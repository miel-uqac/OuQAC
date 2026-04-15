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
        maxBoundsViscosity: 1.0 
    },

    // Limites de la carte [Coin Sud-Ouest, Coin Nord-Est]
    MAP_BOUNDS: [
        [48.416396, -71.060311], 
        [48.421910, -71.046623]  
    ],
    
    // Couleurs
    TYPE_COLORS: {
        "salle": "#e74c3c",
        "couloir": "#3498db",
        "escalier": "#f1c40f",
        "ascenseur": "#9b59b6",
        "wc": "#2ecc71"
    },
    
    PATH_COLORS: {
        "indoor": "#3498db",
        "outdoor": "#2ecc71"
    },

    // Liste de tous les plans
    PLANS: [
        {
            id: "pp_nv0",
            name: "Pavillon Principal (Nv 0)",
            floor: "0",
            url: "../plans/pp/pp_nv0.svg",
            coords: {
                topLeft: [48.419997, -71.051156],
                topRight: [48.419180, -71.051982],
                bottomLeft: [48.420787, -71.052983]
            }
        },
        {
            id: "ph_nv0",
            name: "Pavillon Humanités (Nv 0)",
            floor: "0",
            url: "../plans/ph/ph_nv0.svg",
            coords: {
                topLeft: [48.419674, -71.051518],
                topRight: [48.420256, -71.050923],
                bottomLeft: [48.419450, -71.051006]
            }
        },
        {
            id: "pp_nv1",
            name: "Pavillon Principal (Nv 1)",
            floor: "1",
            url: "../plans/pp/pp_nv1.svg",
            coords: {
                topLeft: [48.420000, -71.051121],
                topRight: [48.419171, -71.051926],
                bottomLeft: [48.420823, -71.053004]
            }
        },
        {
            id: "ph_nv1",
            name: "Pavillon Humanités (Nv 1)",
            floor: "1",
            url: "../plans/ph/ph_nv1.svg",
            coords: {
                topLeft: [48.419702, -71.051524],
                topRight: [48.420286, -71.050926],
                bottomLeft: [48.419481, -71.050995]
            }
        },
        {
            id: "pss_nv1",
            name: "Pavillon Sciences Santé (Nv 1)",
            floor: "1",
            url: "../plans/pss/pss_nv1.svg",
            coords: {
                topLeft: [48.421362, -71.053267],
                topRight: [48.421818, -71.052795],
                bottomLeft: [48.421162, -71.052825]
            }
        },
        {
            id: "pp_nv2",
            name: "Pavillon Principal (Nv 2)",
            floor: "2",
            url: "../plans/pp/pp_nv2.svg",
            coords: {
                topLeft: [48.420000, -71.051121],
                topRight: [48.419171, -71.051926],
                bottomLeft: [48.420823, -71.053004]
            }
        },
        {
            id: "ph_nv2",
            name: "Pavillon Humanités (Nv 2)",
            floor: "2",
            url: "../plans/ph/ph_nv2.svg",
            coords: {
                topLeft: [48.419716, -71.051481],
                topRight: [48.420250, -71.050935],
                bottomLeft: [48.419519, -71.051001]
            }
        },
        {
            id: "pss_nv2",
            name: "Pavillon Sciences Santé (Nv 2)",
            floor: "2",
            url: "../plans/pss/pss_nv2.svg",
            coords: {
                topLeft: [48.421362, -71.053267],
                topRight: [48.421824, -71.052812],
                bottomLeft: [48.421173, -71.052849]
            }
        },
    ]
};