import { CONFIG } from './config.js';

// Initialisation de la carte
export const map = L.map('map', {
    ...CONFIG.MAP_OPTS,
    maxBounds: CONFIG.MAP_BOUNDS
}).setView(CONFIG.UQAC_COORDS, 17);

// Fond de carte OSM
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxNativeZoom: 19,
    maxZoom: 22,
    attribution: '© OpenStreetMap'
}).addTo(map);