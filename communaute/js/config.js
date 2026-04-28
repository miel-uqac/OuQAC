/**
 * ====================================================================
 * APPLICATION : OùQAC - Panel Communauté
 * FICHIER : config.js
 * RÔLE : Configuration spécifique et fusion partagée
 * ====================================================================
 * * DESCRIPTION :
 * Importe les constantes globales (SHARED_CONFIG) et les fusionne 
 * avec les options optimisées pour l'expérience mobile (Zoom très fin, 
 * désactivation des boutons natifs).
 * ====================================================================
 */

import { SHARED_CONFIG } from '../../shared/js/config.js';

export const CONFIG = {
    ...SHARED_CONFIG, // On injecte toutes les variables communes
    
    // Configuration de la carte (Spécifique Communauté - Mobile)
    MAP_OPTS: {
        zoomSnap: 0,
        zoomDelta: 0.25,
        maxZoom: 22,
        minZoom: 16,
        maxBoundsViscosity: 1.0,
        zoomControl: false // Désactivé pour un look mobile natif
    }
};