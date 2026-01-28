// --- 1. Initialisation de la carte en mode "Simple" ---
// CRS.Simple transforme la projection : 
// 1 unité de carte = 1 pixel (au zoom 0)
var map = L.map('map', {
    crs: L.CRS.Simple,
    minZoom: -5 // Important pour pouvoir dézoomer et voir toute l'image
});

// --- 2. Définition des limites (Bounds) ---
// Pour votre plan de bâtiment, ce sera souvent simplement : 
// var bounds = [[0, 0], [hauteur_image, largeur_image]];
// Ici, on utilise les valeurs calées sur la grille de l'image Star Control II :
var bounds = [[-26.5, -25], [1021.5, 1023]];

// --- 3. Ajout de l'image (Le plan) ---
// J'utilise l'image distante du tutoriel Leaflet pour l'exemple.
// Remplacez cette URL par le chemin de votre propre image de plan (ex: 'images/mon-plan.jpg')
var image = L.imageOverlay('https://leafletjs.com/examples/crs-simple/uqm_map_full.png', bounds).addTo(map);

// Centre la vue pour englober toute l'image
map.fitBounds(bounds);


// --- 4. Fonction utilitaire pour coordonnées (x, y) ---
// Par défaut Leaflet attend [Latitude (y), Longitude (x)].
// Cette fonction permet d'écrire xy(x, y) de façon naturelle.
var yx = L.latLng;

var xy = function(x, y) {
    if (Array.isArray(x)) {    // Si on passe un tableau [x, y]
        return yx(x[1], x[0]);
    }
    return yx(y, x);  // Si on passe x, y séparément
};


// --- 5. Ajout de marqueurs avec notre système (x, y) ---

// Sol (Centre du système solaire dans le jeu)
var sol = xy(175.2, 145.0);
var deneb = xy(218.7, 8.3);
var mizar = xy(41.6, 130.1);
var kruegerZ = xy(13.4, 56.5);

L.marker(sol).addTo(map).bindPopup('Sol (Départ)');
L.marker(deneb).addTo(map).bindPopup('Deneb');
L.marker(mizar).addTo(map).bindPopup('Mizar');
L.marker(kruegerZ).addTo(map).bindPopup('Krueger-Z');

// --- 6. Tracer un chemin (Polyline) sur le plan ---
// Utile pour tracer des itinéraires dans un bâtiment
var travel = L.polyline([sol, deneb], { color: 'yellow' }).addTo(map);

// On zoom un peu sur le point de départ
map.setView(xy(120, 70), 1);