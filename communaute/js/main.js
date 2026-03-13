import { map, setFloor, filterMapElements } from './map.js';
import { loadGraphData } from './controllers/dataController.js';
import { state } from './state.js';

document.addEventListener('DOMContentLoaded', () => {
    // Chargement automatique des données du campus
    loadGraphData();

    // ==========================================
    // GESTION DU MENU DES ÉTAGES
    // ==========================================
    const btnToggleFloors = document.getElementById('btn-toggle-floors');
    const floorMenu = document.getElementById('floor-menu');
    const floorBtns = document.querySelectorAll('.floor-btn');

    // Ouvre le menu
    btnToggleFloors.addEventListener('click', () => {
        floorMenu.classList.remove('hidden');
        btnToggleFloors.classList.add('hidden'); // Cache l'icône
        
        // Trouver le bouton de l'étage actuel
        const activeBtn = floorMenu.querySelector('.floor-btn.active');
        
        if (activeBtn) {
            // On aligne le bouton actif tout en bas du menu visible
            floorMenu.scrollTop = (activeBtn.offsetTop + activeBtn.clientHeight) - floorMenu.clientHeight;
        } else {
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


    // ==========================================
    // GESTION DE L'OVERLAY RECHERCHE
    // ==========================================
    const searchTrigger = document.getElementById('main-search-trigger');
    const searchOverlay = document.getElementById('search-overlay');
    const btnCloseSearch = document.getElementById('btn-close-search');
    const searchInput = document.getElementById('active-search-input');
    const mainSearchInput = searchTrigger.querySelector('input');
    
    const commonPlacesSection = document.getElementById('common-places');
    const searchResultsSection = document.getElementById('search-results');
    const dynamicResultsList = document.getElementById('dynamic-results-list');

    // Fonction pour fermer l'overlay
    const closeSearchOverlay = () => {
        searchOverlay.classList.add('hidden');
        searchInput.value = ''; // Réinitialise la recherche
        commonPlacesSection.classList.remove('hidden');
        searchResultsSection.classList.add('hidden');
        
        // Nettoie le transform du swipe
        setTimeout(() => { searchOverlay.style.transform = ''; }, 200);
    };

    // Ouvre l'overlay
    searchTrigger.addEventListener('click', () => {
        searchOverlay.classList.remove('hidden');
        searchOverlay.style.transform = 'translateY(0)'; // S'assure de son placement
        searchInput.focus(); // Ouvre automatiquement le clavier
    });

    // Ferme l'overlay via la croix
    btnCloseSearch.addEventListener('click', closeSearchOverlay);

    // Fermeture via un click sur la map
    map.on('click', () => {
        // Clic pour fermer le menu des étages
        if (!floorMenu.classList.contains('hidden')) {
            floorMenu.classList.add('hidden');
            btnToggleFloors.classList.remove('hidden');
        }
        
        // Clic pour fermer la recherche
        if (!searchOverlay.classList.contains('hidden')) {
            closeSearchOverlay();
        }
    });

    // Gestion du swipe pour fermer
    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    searchOverlay.addEventListener('touchstart', (e) => {
        const activeList = searchOverlay.querySelector('.location-list:not(.hidden)');
        const isHeader = e.target.closest('.search-overlay-header') || e.target.closest('.drag-handle');
        
        // On ne déclenche le swipe que s'il touche le haut de l'overlay
        if (activeList && activeList.scrollTop > 0 && !isHeader) return; 

        startY = e.touches[0].clientY;
        currentY = startY;
        isDragging = true;
        searchOverlay.style.transition = 'none'; // Désactive la transition pendant le swipe
    }, {passive: true});

    searchOverlay.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        currentY = e.touches[0].clientY;
        const diff = currentY - startY;

        // Si le doigt va vers le bas on déplace l'overlay
        if (diff > 0) {
            searchOverlay.style.transform = `translateY(${diff}px)`;
        }
    }, {passive: true});

    searchOverlay.addEventListener('touchend', () => {
        if (!isDragging) return;
        isDragging = false;
        searchOverlay.style.transition = 'transform 0.2s ease-out'; // Réactive la transition
        
        const diff = currentY - startY;
        
        // Si on a glissé vers le bas de plus de 200 pixels on ferme
        if (diff > 200) {
            closeSearchOverlay();
        } else {
            // Sinon l'overlay remonte à sa place
            searchOverlay.style.transform = 'translateY(0)';
        }
    });

    // ==========================================
    // LOGIQUE DE RECHERCHE
    // ==========================================
    const selectLocation = (node) => {
        state.targetNode = node; 
        
        closeSearchOverlay();
        
        // Met à jour l'étage visuel du menu des étages
        floorBtns.forEach(b => b.classList.remove('active'));
        const btnFloor = document.querySelector(`.floor-btn[data-floor="${node.userData.floor}"]`);
        if (btnFloor) btnFloor.classList.add('active');

        // Met à jour la carte et les filtres
        setFloor(node.userData.floor);
        filterMapElements(node.userData.floor);
        
        // Aller au noeud
        map.flyTo(node.getLatLng(), 19, { duration: 1.5 });
        
        mainSearchInput.value = node.userData.name;
    };

    // Tape dans la barre de recherche
    searchInput.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase().trim();
        
        if (val === '') {
            commonPlacesSection.classList.remove('hidden');
            searchResultsSection.classList.add('hidden');
        } else {
            commonPlacesSection.classList.add('hidden');
            searchResultsSection.classList.remove('hidden');
            
            // Cherche les salles correspondantes
            const filtered = state.nodes.filter(n => 
                n.userData.name.toLowerCase().includes(val) && n.userData.type === 'salle'
            );
            
            dynamicResultsList.innerHTML = '';
            
            if (filtered.length === 0) {
                dynamicResultsList.innerHTML = '<div class="location-item" style="font-weight:normal; color:#888;">Aucun résultat</div>';
            } else {
                filtered.forEach(node => {
                    const div = document.createElement('div');
                    div.className = 'location-item';
                    div.textContent = node.userData.name; 
                    
                    div.addEventListener('click', () => selectLocation(node));
                    dynamicResultsList.appendChild(div);
                });
            }
        }
    });

    // TODO: Clic sur un lieu courant
    document.querySelectorAll('#common-places .location-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const name = e.target.textContent;
            // On essaie de trouver un nœud qui a exactement ce nom
            const node = state.nodes.find(n => n.userData.name.toLowerCase() === name.toLowerCase());
        });
    });
});