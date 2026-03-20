import { map, setFloor, filterMapElements } from './map.js';
import { loadGraphData } from './controllers/dataController.js';
import * as RouteCtrl from './controllers/routeController.js';
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
    const minimizedRouteTrigger = document.getElementById('minimized-route-trigger'); // NOUVEAU
    
    const searchOverlay = document.getElementById('search-overlay');
    const routeOverlay = document.getElementById('route-overlay');
    
    const btnCloseSearch = document.getElementById('btn-close-search');
    const btnCloseRoute = document.getElementById('btn-close-route');
    const btnCancelRouteMini = document.getElementById('btn-cancel-route-mini'); // NOUVEAU
    
    const searchInput = document.getElementById('active-search-input');
    const mainSearchInput = searchTrigger.querySelector('input');
    const miniRouteText = document.getElementById('mini-route-text'); // NOUVEAU
    
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
    // LOGIQUE DE RÉDUCTION
    // ==========================================
    const minimizeSearchOverlay = () => {
        searchOverlay.classList.add('hidden');
        setTimeout(() => { searchOverlay.style.transform = ''; }, 200);
        
        // On conserve le texte dans la barre du bas
        mainSearchInput.value = searchInput.value;
        
        // Si on était en train de paramétrer un itinéraire, on retourne dessus
        if (state.startNode || state.endNode) {
            openRouteOverlay();
        }
    };

    const minimizeRouteOverlay = () => {
        routeOverlay.classList.add('hidden');
        setTimeout(() => { routeOverlay.style.transform = ''; }, 200);
        
        // On cache la barre de recherche classique et on affiche celle de l'itinéraire
        searchTrigger.classList.add('hidden');
        minimizedRouteTrigger.classList.remove('hidden');
        
        // On met à jour le texte de la barre réduite
        const startName = state.startNode ? state.startNode.userData.name : '...';
        const endName = state.endNode ? state.endNode.userData.name : '...';
        miniRouteText.value = `${startName} ➔ ${endName}`;
    };

    // ==========================================
    // LOGIQUE DE FERMETURE
    // ==========================================
    const closeSearchOverlay = () => {
        searchOverlay.classList.add('hidden');
        setTimeout(() => { searchOverlay.style.transform = ''; }, 200);
        
        searchInput.value = ''; // Reset la barre
        mainSearchInput.value = '';
        commonPlacesSection.classList.remove('hidden');
        searchResultsSection.classList.add('hidden');
        
        // Si on a annulé la recherche d'arrivée, on retourne sur l'itinéraire
        if (state.startNode || state.endNode) {
            openRouteOverlay();
        } else {
            state.targetNode = null;
            filterMapElements(state.currentFloor);
        }
    };

    const closeRouteOverlay = () => {
        routeOverlay.classList.add('hidden');
        setTimeout(() => { routeOverlay.style.transform = ''; }, 200);
        
        // Reset absolument tout
        state.startNode = null;
        state.endNode = null;
        state.targetNode = null;
        state.activeRouteNodes = [];
        state.activeRoutePaths = [];
        
        routeStartInput.value = '';
        routeEndInput.value = '';
        mainSearchInput.value = ''; 
        searchInput.value = '';
        
        // On remet la barre de recherche par défaut
        minimizedRouteTrigger.classList.add('hidden');
        searchTrigger.classList.remove('hidden');

        // Rafraîchit la carte
        filterMapElements(state.currentFloor);
    };

    // ==========================================
    // LOGIQUE D'OUVERTURE
    // ==========================================
    const openSearchOverlay = (target) => {
        // Si on change de contexte, on vide l'input
        if (currentSearchTarget !== target) {
            searchInput.value = '';
            commonPlacesSection.classList.remove('hidden');
            searchResultsSection.classList.add('hidden');
        }
        currentSearchTarget = target;
        
        routeOverlay.classList.add('hidden');
        minimizedRouteTrigger.classList.add('hidden');
        searchTrigger.classList.remove('hidden');

        searchOverlay.classList.remove('hidden');
        searchOverlay.style.transform = 'translateY(0)';
        
        searchInput.focus();
    };

    const openRouteOverlay = () => {
        searchOverlay.classList.add('hidden');
        minimizedRouteTrigger.classList.add('hidden');
        searchTrigger.classList.remove('hidden');
        
        routeOverlay.classList.remove('hidden');
        routeOverlay.style.transform = 'translateY(0)';
    };

    // Événements d'ouverture
    searchTrigger.addEventListener('click', () => openSearchOverlay('start'));
    routeStartInput.addEventListener('click', () => openSearchOverlay('start'));
    routeEndInput.addEventListener('click', () => openSearchOverlay('end'));
    
    // Rouvrir l'itinéraire si on clique sur la barre réduite
    minimizedRouteTrigger.addEventListener('click', (e) => {
        if (!e.target.closest('#btn-cancel-route-mini')) {
            openRouteOverlay();
        }
    });
    
    // Événements des croix
    btnCloseSearch.addEventListener('click', closeSearchOverlay);
    btnCloseRoute.addEventListener('click', closeRouteOverlay);
    btnCancelRouteMini.addEventListener('click', closeRouteOverlay);

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
            mainSearchInput.value = node.userData.name;
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
    const setupSwipeToClose = (overlayElement, minimizeCallback) => {
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
            // Si on a glissé vers le bas on réduit
            if (diff > 150) {
                minimizeCallback();
            } else {
                overlayElement.style.transform = 'translateY(0)';
            }
        });
    };

    // On applique les comportements de réduction au swipe
    setupSwipeToClose(searchOverlay, minimizeSearchOverlay);
    setupSwipeToClose(routeOverlay, minimizeRouteOverlay);

    // Clic en dehors (sur la carte) -> réduction
    map.on('click', () => {
        if (!floorMenu.classList.contains('hidden')) {
            floorMenu.classList.add('hidden');
            btnToggleFloors.classList.remove('hidden');
        }
        if (!searchOverlay.classList.contains('hidden')) minimizeSearchOverlay();
        if (!routeOverlay.classList.contains('hidden')) minimizeRouteOverlay();
    });

    // ==========================================
    // LANCEMENT ITINERAIRE
    // ==========================================
    document.getElementById('btn-lets-go').addEventListener('click', () => {
        if (!state.startNode || !state.endNode) {
            alert("Veuillez définir un départ et une arrivée avant de lancer l'itinéraire.");
            return;
        }

        // Lancement A*
        const route = RouteCtrl.calculateRoute(state.startNode, state.endNode);
        
        if (route) {
            // On sauvegarde le résultat pour la carte
            state.activeRouteNodes = route.nodes;
            state.activeRoutePaths = route.paths;
            
            // On REDUIT le panneau pour afficher l'itinéraire en petit en bas
            minimizeRouteOverlay();
            
            // On va à l'étage du départ
            const startFloor = state.startNode.userData.floor;
            setFloor(startFloor);
            
            // Met à jour visuellement le menu des étages sur le côté droit
            floorBtns.forEach(b => b.classList.remove('active'));
            const btnFloor = document.querySelector(`.floor-btn[data-floor="${startFloor}"]`);
            if (btnFloor) btnFloor.classList.add('active');

            // On dessine la carte
            filterMapElements(startFloor);
            
            // On fait voler la caméra vers le point de départ avec un peu de recul pour voir la ligne
            map.flyTo(state.startNode.getLatLng(), 18, {duration: 1});
        } else {
            alert("Oups ! Aucun itinéraire n'a pu être trouvé entre ces deux points. Vérifiez que les chemins sont bien connectés dans l'éditeur.");
        }
    });

    // ==========================================
    // GESTION DES OPTIONS D'ITINÉRAIRE
    // ==========================================
    const btnWalk = document.querySelector('.fa-person-walking').parentElement;
    const btnWheelchair = document.querySelector('.fa-wheelchair').parentElement;
    const btnOutdoor = document.querySelector('.fa-cloud-sun').parentElement;
    const btnIndoor = document.querySelector('.fa-house').parentElement;

    // Choix du mode de transport
    btnWalk.addEventListener('click', () => {
        btnWalk.classList.add('active');
        btnWheelchair.classList.remove('active');
        state.routePrefPmr = false;
    });

    btnWheelchair.addEventListener('click', () => {
        btnWheelchair.classList.add('active');
        btnWalk.classList.remove('active');
        state.routePrefPmr = true;
    });

    // Choix de l'environnement
    btnOutdoor.addEventListener('click', () => {
        btnOutdoor.classList.add('active');
        btnIndoor.classList.remove('active');
        state.routePrefEnvironment = 'outdoor';
    });

    btnIndoor.addEventListener('click', () => {
        btnIndoor.classList.add('active');
        btnOutdoor.classList.remove('active');
        state.routePrefEnvironment = 'indoor';
    });
});