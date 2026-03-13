import { map, setFloor, filterMapElements } from './map.js';
import { loadGraphData } from './controllers/dataController.js';

document.addEventListener('DOMContentLoaded', () => {
    // Chargement automatique des données
    loadGraphData();

    // Gestion du menu des étages
    const btnToggleFloors = document.getElementById('btn-toggle-floors');
    const floorMenu = document.getElementById('floor-menu');
    const floorBtns = document.querySelectorAll('.floor-btn');

    // Ouvre/ferme le menu
    btnToggleFloors.addEventListener('click', () => {
        floorMenu.classList.remove('hidden');
        btnToggleFloors.classList.add('hidden'); // Cache l'icône
        
        // Trouver le bouton de l'étage actuel
        const activeBtn = floorMenu.querySelector('.floor-btn.active');
        
        if (activeBtn) {
            // On aligne le bouton actif tout en bas du menu
            floorMenu.scrollTop = (activeBtn.offsetTop + activeBtn.clientHeight) - floorMenu.clientHeight;
        } else {
            // si aucun n'est actif, on va en bas
            floorMenu.scrollTop = floorMenu.scrollHeight;
        }
    });

    // Clic sur un étage
    floorBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const selectedFloor = e.target.getAttribute('data-floor');
            
            // Mise à jour visuelle du menu
            floorBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            // Ferme le menu et réaffiche l'icône
            floorMenu.classList.add('hidden');
            btnToggleFloors.classList.remove('hidden');

            // Mise à jour de la carte
            setFloor(selectedFloor);
            filterMapElements(selectedFloor);
        });
    });

    // Ferme le menu si on clique sur la carte
    map.on('click', () => {
        if (!floorMenu.classList.contains('hidden')) {
            floorMenu.classList.add('hidden');
            btnToggleFloors.classList.remove('hidden'); // Réaffiche l'icône
        }
    });
});