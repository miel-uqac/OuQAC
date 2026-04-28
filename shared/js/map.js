/**
 * ====================================================================
 * APPLICATION : OùQAC - Shared
 * FICHIER : map.js
 * RÔLE : Boîte à outils cartographiques partagée
 * ====================================================================
 * * DESCRIPTION :
 * Ce fichier exporte des fonctions génériques permettant d'instancier 
 * et de manipuler Leaflet, en garantissant un socle commun pour les 
 * différents panels de l'application.
 * * FONCTIONS PRINCIPALES :
 * - createMapInstance() : Génère la carte avec ses options et son fond.
 * - createOverlays() : Précharge tous les SVG des plans en mémoire.
 * - updateFloorOverlays() : Met à jour visuellement les calques affichés.
 * * FLUX DE DONNÉES / TRAVAIL :
 * Importé par les fichiers map.js de "admin" et "communaute", il agit
 * comme un fournisseur de services sans altérer le state local.
 * ====================================================================
 */

export function createMapInstance(opts, bounds, coords) {
    const map = L.map('map', {
        ...opts,
        maxBounds: bounds
    }).setView(coords, 17);

    // Fond de carte OSM commun
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxNativeZoom: 19,
        maxZoom: 22,
        attribution: '© OpenStreetMap'
    }).addTo(map);

    return map;
}

export function createOverlays(plans) {
    const overlays = {};
    plans.forEach(plan => {
        overlays[plan.id] = L.imageOverlay.rotated(
            plan.url,
            L.latLng(plan.coords.topLeft),
            L.latLng(plan.coords.topRight),
            L.latLng(plan.coords.bottomLeft),
            { opacity: 1, interactive: false, zIndex: 100 }
        );
    });
    return overlays;
}

export function updateFloorOverlays(map, overlays, plans, floorId) {
    // Retire toutes les images de la carte
    Object.values(overlays).forEach(overlay => {
        if (map.hasLayer(overlay)) map.removeLayer(overlay);
    });

    // Ajoute uniquement les images correspondantes au nouvel étage
    plans.filter(p => String(p.floor) === String(floorId)).forEach(plan => {
        overlays[plan.id].addTo(map);
    });
}