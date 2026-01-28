// --- Configuration de la carte ---
// zoomSnap: 0 -> Le zoom ne "saute" pas à l'entier le plus proche (ex: on peut être à 1.42 de zoom)
// zoomDelta: 0.25 -> Les boutons +/- changent le zoom par pas de 0.25 au lieu de 1
var map = L.map('map', {
    zoomSnap: 0,
    zoomDelta: 0.25,
    center: [0, 0], // Centré sur l'équateur (latitude 0, longitude 0)
    zoom: 0         // Zoom initial à 0 (monde entier)
});

// --- Ajout des tuiles (Tile Layer) ---
// Utilisation des tuiles CartoDB Positron (comme dans le guide)
var cartodbAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attribution">CARTO</a>';

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
    attribution: cartodbAttribution,
    maxZoom: 19 
}).addTo(map);

// --- Ajout de l'échelle (Scale Control) ---
// Permet de voir la distorsion des distances (projection cylindrique)
L.control.scale().addTo(map);


// --- Événements pour démonstration ---
// Affiche le niveau de zoom actuel dans la console à chaque changement
map.on('zoomend', function() {
    console.log("Niveau de zoom actuel : " + map.getZoom());
});

// --- Exemple d'animation (Optionnel) ---
// Décommentez le code ci-dessous pour voir l'effet de distorsion d'échelle automatiquement

setInterval(function(){
    map.setView([0, 0]); // Retour à l'équateur
    setTimeout(function(){
        map.setView([60, 0]); // Saut vers 60° Nord (l'échelle change)
    }, 2000);
}, 4000);
