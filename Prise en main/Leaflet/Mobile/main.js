// 1. Initialisation de la carte
// On utilise fitWorld() pour voir le monde entier avant que la localisation ne soit trouvée
var map = L.map('map').fitWorld();

// 2. Ajout de la couche de tuiles (OpenStreetMap)
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
}).addTo(map);

// 3. Définition des événements AVANT de lancer la localisation

// Succès de la géolocalisation
function onLocationFound(e) {
    var radius = e.accuracy;

    // Ajoute un marqueur à la position trouvée
    L.marker(e.latlng).addTo(map)
        .bindPopup("Vous êtes à moins de " + radius + " mètres de ce point")
        .openPopup();

    // Ajoute un cercle représentant la zone de précision
    L.circle(e.latlng, radius).addTo(map);
}

// Échec de la géolocalisation
function onLocationError(e) {
    alert(e.message);
}

// Attachement des fonctions aux événements de la carte
map.on('locationfound', onLocationFound);
map.on('locationerror', onLocationError);

// 4. Lancement de la géolocalisation
// setView: true -> Zoome automatiquement sur la position trouvée
// maxZoom: 16 -> Définit le niveau de zoom maximum lors du centrage automatique
map.locate({setView: true, maxZoom: 16});