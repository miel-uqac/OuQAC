// --- ÉTAPE 1 : Création des marqueurs pour le groupe "Villes" ---
var littleton = L.marker([39.61, -105.02]).bindPopup('This is Littleton, CO.'),
    denver    = L.marker([39.74, -104.99]).bindPopup('This is Denver, CO.'),
    aurora    = L.marker([39.73, -104.8]).bindPopup('This is Aurora, CO.'),
    golden    = L.marker([39.77, -105.23]).bindPopup('This is Golden, CO.');

// On regroupe ces marqueurs dans un LayerGroup
var cities = L.layerGroup([littleton, denver, aurora, golden]);


// --- ÉTAPE 2 : Définition des fonds de carte (Base Layers) ---
var osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
});

var osmHOT = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors, Tiles style by HOT hosted by OSM France'
});


// --- ÉTAPE 3 : Initialisation de la carte ---
// Note : on ajoute 'osm' et 'cities' par défaut dans l'option 'layers'
var map = L.map('map', {
    center: [39.73, -104.99],
    zoom: 10,
    layers: [osm, cities]
});


// --- ÉTAPE 4 : Configuration du menu de contrôle ---

// Objet contenant les fonds de carte (boutons radio - un seul à la fois)
var baseMaps = {
    "OpenStreetMap": osm,
    "<span style='color: red'>OpenStreetMap.HOT</span>": osmHOT // Exemple avec du style HTML dans le nom
};

// Objet contenant les calques superposés (cases à cocher - plusieurs possibles)
var overlayMaps = {
    "Cities": cities
};

// Création du contrôle et ajout à la carte
var layerControl = L.control.layers(baseMaps, overlayMaps).addTo(map);


// --- ÉTAPE 5 : Ajout dynamique de nouvelles couches (Bonus du guide) ---

// Création de nouveaux marqueurs "Parcs"
var crownHill = L.marker([39.75, -105.09]).bindPopup('This is Crown Hill Park.'),
    rubyHill = L.marker([39.68, -105.00]).bindPopup('This is Ruby Hill Park.');

var parks = L.layerGroup([crownHill, rubyHill]);

// Création d'un nouveau fond de carte "OpenTopoMap"
var openTopoMap = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    maxZoom: 17,
    attribution: 'Map data: © OpenStreetMap contributors, SRTM | Map style: © OpenTopoMap (CC-BY-SA)'
});

// Ajout dynamique de ces nouvelles couches dans le menu existant
layerControl.addBaseLayer(openTopoMap, "OpenTopoMap");
layerControl.addOverlay(parks, "Parks");