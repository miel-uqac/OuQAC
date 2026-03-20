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
    // VARIABLES DES OVERLAYS ET ÉTATS
    // ==========================================
    const searchTrigger = document.getElementById('main-search-trigger');
    const searchOverlay = document.getElementById('search-overlay');
    const routeOverlay = document.getElementById('route-overlay');
    
    const btnCloseSearch = document.getElementById('btn-close-search');
    const btnCloseRoute = document.getElementById('btn-close-route');
    
    const searchInput = document.getElementById('active-search-input');
    const routeStartInput = document.getElementById('route-start-input');
    const routeEndInput = document.getElementById('route-end-input');
    
    const commonPlacesSection = document.getElementById('common-places');
    const searchResultsSection = document.getElementById('search-results');
    const dynamicResultsList = document.getElementById('dynamic-results-list');

    // États de l'application
    let currentSearchTarget = 'start'; // 'start' ou 'end'
    state.startNode = null;
    state.endNode = null;

    // ==========================================
    // LOGIQUE D'OUVERTURE / FERMETURE
    // ==========================================
    const openSearchOverlay = (target) => {
        currentSearchTarget = target;
        routeOverlay.classList.add('hidden');
        searchOverlay.classList.remove('hidden');
        searchOverlay.style.transform = 'translateY(0)';
        
        searchInput.value = ''; // Reset la barre
        commonPlacesSection.classList.remove('hidden');
        searchResultsSection.classList.add('hidden');
        searchInput.focus();
    };

    const closeSearchOverlay = () => {
        searchOverlay.classList.add('hidden');
        setTimeout(() => { searchOverlay.style.transform = ''; }, 200);
        
        // Si on a annulé la recherche d'arrivée, on retourne sur l'itinéraire
        if (state.startNode) {
            routeOverlay.classList.remove('hidden');
        }
    };

    const openRouteOverlay = () => {
        searchOverlay.classList.add('hidden');
        routeOverlay.classList.remove('hidden');
        routeOverlay.style.transform = 'translateY(0)';
    };

    const closeRouteOverlay = () => {
        routeOverlay.classList.add('hidden');
        setTimeout(() => { routeOverlay.style.transform = ''; }, 200);
        // Reset la recherche si on ferme tout
        state.startNode = null;
        state.endNode = null;
        routeStartInput.value = '';
        routeEndInput.value = '';
        document.querySelector('#main-search-trigger input').value = ''; // Reset la barre principale
    };

    // Événements des boutons
    searchTrigger.addEventListener('click', () => openSearchOverlay('start'));
    routeStartInput.addEventListener('click', () => openSearchOverlay('start'));
    routeEndInput.addEventListener('click', () => openSearchOverlay('end'));
    
    btnCloseSearch.addEventListener('click', closeSearchOverlay);
    btnCloseRoute.addEventListener('click', closeRouteOverlay);

    // ==========================================
    // SÉLECTION D'UN LIEU
    // ==========================================
    const selectLocation = (node) => {
        // Mise à jour de la carte (focus sur le point)
        floorBtns.forEach(b => b.classList.remove('active'));
        const btnFloor = document.querySelector(`.floor-btn[data-floor="${node.userData.floor}"]`);
        if (btnFloor) btnFloor.classList.add('active');
        
        setFloor(node.userData.floor);
        // Exception: On dit au state local que c'est le target pour l'afficher
        state.targetNode = node; 
        filterMapElements(node.userData.floor);
        map.flyTo(node.getLatLng(), 19, { duration: 1.5 });

        // Traitement selon ce qu'on cherchait
        if (currentSearchTarget === 'start') {
            state.startNode = node;
            routeStartInput.value = node.userData.name;
            document.querySelector('#main-search-trigger input').value = node.userData.name;
            openRouteOverlay(); // Ouvre le menu itinéraire
        } else if (currentSearchTarget === 'end') {
            state.endNode = node;
            routeEndInput.value = node.userData.name;
            openRouteOverlay(); // Retour au menu itinéraire
        }
    };

    // ==========================================
    // MOTEUR DE RECHERCHE
    // ==========================================
    searchInput.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase().trim();
        if (val === '') {
            commonPlacesSection.classList.remove('hidden');
            searchResultsSection.classList.add('hidden');
        } else {
            commonPlacesSection.classList.add('hidden');
            searchResultsSection.classList.remove('hidden');
            
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

    // ==========================================
    // SWIPE DOWN GÉNÉRIQUE & CLIC CARTE
    // ==========================================
    const setupSwipeToClose = (overlayElement, closeCallback) => {
        let startY = 0, currentY = 0, isDragging = false;

        overlayElement.addEventListener('touchstart', (e) => {
            const activeList = overlayElement.querySelector('.location-list:not(.hidden)');
            const isHeader = e.target.closest('.search-overlay-header') || e.target.closest('.drag-handle') || e.target.closest('.route-header');
            
            // Permet le défilement de la liste sans fermer l'overlay
            if (activeList && activeList.scrollTop > 0 && !isHeader) return; 

            startY = e.touches[0].clientY;
            currentY = startY;
            isDragging = true;
            overlayElement.style.transition = 'none';
        }, {passive: true});

        overlayElement.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            currentY = e.touches[0].clientY;
            const diff = currentY - startY;
            if (diff > 0) overlayElement.style.transform = `translateY(${diff}px)`;
        }, {passive: true});

        overlayElement.addEventListener('touchend', () => {
            if (!isDragging) return;
            isDragging = false;
            overlayElement.style.transition = 'transform 0.2s ease-out';
            
            const diff = currentY - startY;
            if (diff > 150) {
                closeCallback();
            } else {
                overlayElement.style.transform = 'translateY(0)';
            }
        });
    };

    // Application du Swipe aux deux overlays
    setupSwipeToClose(searchOverlay, closeSearchOverlay);
    setupSwipeToClose(routeOverlay, closeRouteOverlay);

    // Clic en dehors (sur la carte)
    map.on('click', () => {
        if (!floorMenu.classList.contains('hidden')) {
            floorMenu.classList.add('hidden');
            btnToggleFloors.classList.remove('hidden');
        }
        if (!searchOverlay.classList.contains('hidden')) closeSearchOverlay();
        if (!routeOverlay.classList.contains('hidden')) closeRouteOverlay();
    });
});