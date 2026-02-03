// Coordonnées de l'UQAC (Pavillon Principal)
const UQAC_COORDS = [48.4204, -71.0526];

// Initialisation de la carte
const map = L.map('map').setView(UQAC_COORDS, 17); // 17 = niveau de zoom

// Ajout de la couche "tuile" (le fond OpenStreetMap)
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

// Petit test : marqueur sur l'entrée principal
// (Voir si ça fonctionne - à retirer)
L.marker(UQAC_COORDS).addTo(map)
    .bindPopup('UQAC - Pavillon Principal')
    .openPopup();