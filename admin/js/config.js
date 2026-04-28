/**
 * ====================================================================
 * APPLICATION : OùQAC - Panel Admin
 * FICHIER : config.js
 * RÔLE : Configuration spécifique et fusion partagée
 * ====================================================================
 * * DESCRIPTION :
 * Importe les constantes globales (SHARED_CONFIG) et les fusionne 
 * avec les options spécifiques au comportement d'édition (zoom, etc.).
 * * USAGE : 
 * Les coordonnées dans 'PLANS' sont destinées à être mises à jour via 
 * l'outil de calibrage présent dans 'map.js'.
 * ====================================================================
 */

import { SHARED_CONFIG } from '../../shared/js/config.js';

export const CONFIG = {
    ...SHARED_CONFIG, // On injecte toutes les variables communes
    APP_VERSION: "1.1.0",
    
    // Configuration de la carte (Spécifique Admin)
    MAP_OPTS: {
        zoomSnap: 1,
        zoomDelta: 1,
        maxZoom: 22,
        minZoom: 18,
        maxBoundsViscosity: 1.0 
    }
};