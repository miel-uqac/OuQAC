import { map } from './map.js';
import { loadGraphData } from './controllers/dataController.js';

document.addEventListener('DOMContentLoaded', () => {
    // Chargement automatique des données du campus
    loadGraphData();
});