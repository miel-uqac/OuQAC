import { map, setFloor, filterMapElements } from './map.js';
import { loadGraphData } from './controllers/dataController.js';
import * as RouteCtrl from './controllers/routeController.js';
import * as UI from './views/ui.js';
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

    btnToggleFloors.addEventListener('click', () => {
        floorMenu.classList.remove('hidden');
        btnToggleFloors.classList.add('hidden'); 
        const activeBtn = floorMenu.querySelector('.floor-btn.active');
        if (activeBtn) {
            floorMenu.scrollTop = (activeBtn.offsetTop + activeBtn.clientHeight) - floorMenu.clientHeight;
        } else {
            floorMenu.scrollTop = floorMenu.scrollHeight;
        }
    });

    floorBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const selectedFloor = e.target.getAttribute('data-floor');
            UI.updateFloorMenuUI(selectedFloor);
            
            floorMenu.classList.add('hidden');
            btnToggleFloors.classList.remove('hidden');

            setFloor(selectedFloor);
            filterMapElements(selectedFloor);
        });
    });

    // ==========================================
    // VARIABLES DES OVERLAYS ET ÉTATS
    // ==========================================
    const searchTrigger = document.getElementById('main-search-trigger');
    const minimizedRouteTrigger = document.getElementById('minimized-route-trigger');
    const searchOverlay = document.getElementById('search-overlay');
    const routeOverlay = document.getElementById('route-overlay');
    const btnCloseSearch = document.getElementById('btn-close-search');
    const btnCloseRoute = document.getElementById('btn-close-route');
    const btnCancelRouteMini = document.getElementById('btn-cancel-route-mini');
    const searchInput = document.getElementById('active-search-input');
    const mainSearchInput = searchTrigger.querySelector('input');
    const miniRouteText = document.getElementById('mini-route-text');
    const routeStartInput = document.getElementById('route-start-input');
    const routeEndInput = document.getElementById('route-end-input');
    const commonPlacesSection = document.getElementById('common-places');
    const searchResultsSection = document.getElementById('search-results');
    const dynamicResultsList = document.getElementById('dynamic-results-list');

    let currentSearchTarget = 'start'; 
    state.startNode = null;
    state.endNode = null;

    // ==========================================
    // GESTION DE L'HISTORIQUE (BOUTON RETOUR)
    // ==========================================
    const setOverlayHash = () => {
        if (window.location.hash !== '#active') history.pushState(null, null, '#active');
    };

    const clearOverlayHash = (skipHistory) => {
        if (!skipHistory && window.location.hash === '#active') history.back();
    };

    window.addEventListener('popstate', () => {
        if (window.location.hash === '') {
            if (!searchOverlay.classList.contains('hidden')) minimizeSearchOverlay(true);
            else if (!routeOverlay.classList.contains('hidden')) minimizeRouteOverlay(true);
        }
    });

    // ==========================================
    // LOGIQUE DE RÉDUCTION & FERMETURE
    // ==========================================
    const minimizeSearchOverlay = (skipHistory = false) => {
        clearOverlayHash(skipHistory);
        searchOverlay.classList.add('hidden');
        setTimeout(() => { searchOverlay.style.transform = ''; }, 200);
        mainSearchInput.value = searchInput.value;
        if (state.startNode || state.endNode) openRouteOverlay();
    };

    const minimizeRouteOverlay = (skipHistory = false) => {
        clearOverlayHash(skipHistory);
        routeOverlay.classList.add('hidden');
        setTimeout(() => { routeOverlay.style.transform = ''; }, 200);
        searchTrigger.classList.add('hidden');
        minimizedRouteTrigger.classList.remove('hidden');
        const startName = state.startNode ? state.startNode.userData.name : '...';
        const endName = state.endNode ? state.endNode.userData.name : '...';
        miniRouteText.value = `${startName} ➔ ${endName}`;
    };

    const closeSearchOverlay = (skipHistory = false) => {
        clearOverlayHash(skipHistory);
        searchOverlay.classList.add('hidden');
        setTimeout(() => { searchOverlay.style.transform = ''; }, 200);
        searchInput.value = ''; 
        mainSearchInput.value = '';
        commonPlacesSection.classList.remove('hidden');
        searchResultsSection.classList.add('hidden');
        if (state.startNode || state.endNode) openRouteOverlay();
        else {
            state.targetNode = null;
            filterMapElements(state.currentFloor);
        }
    };

    const closeRouteOverlay = (skipHistory = false) => {
        clearOverlayHash(skipHistory);
        routeOverlay.classList.add('hidden');
        setTimeout(() => { routeOverlay.style.transform = ''; }, 200);
        
        state.startNode = null;
        state.endNode = null;
        state.targetNode = null;
        state.activeRouteNodes = [];
        state.activeRoutePaths = [];
        
        routeStartInput.value = '';
        routeEndInput.value = '';
        mainSearchInput.value = ''; 
        searchInput.value = '';
        
        minimizedRouteTrigger.classList.add('hidden');
        searchTrigger.classList.remove('hidden');
        filterMapElements(state.currentFloor);
    };

    const openSearchOverlay = (target) => {
        setOverlayHash();
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
        setOverlayHash();
        searchOverlay.classList.add('hidden');
        minimizedRouteTrigger.classList.add('hidden');
        searchTrigger.classList.remove('hidden');
        routeOverlay.classList.remove('hidden');
        routeOverlay.style.transform = 'translateY(0)';
    };

    searchTrigger.addEventListener('click', () => openSearchOverlay('start'));
    routeStartInput.addEventListener('click', () => openSearchOverlay('start'));
    routeEndInput.addEventListener('click', () => openSearchOverlay('end'));
    
    minimizedRouteTrigger.addEventListener('click', (e) => {
        if (!e.target.closest('#btn-cancel-route-mini')) openRouteOverlay();
    });
    
    btnCloseSearch.addEventListener('click', () => closeSearchOverlay());
    btnCloseRoute.addEventListener('click', () => closeRouteOverlay());
    btnCancelRouteMini.addEventListener('click', () => closeRouteOverlay());

    // ==========================================
    // SÉLECTION D'UN LIEU & MOTEUR DE RECHERCHE
    // ==========================================
    const selectLocation = (node) => {
        UI.updateFloorMenuUI(node.userData.floor);
        setFloor(node.userData.floor);
        state.targetNode = node; 
        filterMapElements(node.userData.floor);
        map.flyTo(node.getLatLng(), 19, { duration: 1.5 });

        if (currentSearchTarget === 'start') {
            state.startNode = node;
            routeStartInput.value = node.userData.name;
            mainSearchInput.value = node.userData.name;
            openRouteOverlay(); 
        } else if (currentSearchTarget === 'end') {
            state.endNode = node;
            routeEndInput.value = node.userData.name;
            openRouteOverlay(); 
        }
    };

    searchInput.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase().trim();
        if (val === '') {
            commonPlacesSection.classList.remove('hidden');
            searchResultsSection.classList.add('hidden');
        } else {
            commonPlacesSection.classList.add('hidden');
            searchResultsSection.classList.remove('hidden');
            
            const filtered = state.nodes.filter(n => n.userData.name.toLowerCase().includes(val) && n.userData.type === 'salle');
            UI.renderSearchResults(filtered, dynamicResultsList, selectLocation);
        }
    });

    document.querySelectorAll('#common-places .location-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const name = e.target.textContent;
            const node = state.nodes.find(n => n.userData.name.toLowerCase() === name.toLowerCase());
            if (node) selectLocation(node);
        });
    });

    UI.setupSwipeToClose(searchOverlay, () => minimizeSearchOverlay());
    UI.setupSwipeToClose(routeOverlay, () => minimizeRouteOverlay());

    map.on('click', () => {
        if (!floorMenu.classList.contains('hidden')) {
            floorMenu.classList.add('hidden');
            btnToggleFloors.classList.remove('hidden');
        }
        if (!searchOverlay.classList.contains('hidden')) minimizeSearchOverlay();
        if (!routeOverlay.classList.contains('hidden')) minimizeRouteOverlay();
    });

    // ==========================================
    // ETAT DE NAVIGATION ACTIVE (GPS)
    // ==========================================
    let currentSteps = []; 
    let activeStepIndex = 0; 
    const mapElement = document.getElementById('map');

    const updateNavigationUI = () => {
        if (currentSteps.length === 0) return;
        const step = currentSteps[activeStepIndex];
        
        UI.updateNavigationCard(step, activeStepIndex, currentSteps.length);

        if (state.currentFloor !== step.node.userData.floor) {
            setFloor(step.node.userData.floor);
            UI.updateFloorMenuUI(step.node.userData.floor);
        }

        state.activeRoutePaths = routeOverlay.fullRoutePaths.slice(step.pathIndex);
        filterMapElements(state.currentFloor);
        map.flyTo(step.node.getLatLng(), 19, {duration: 0.5});
        /*mapElement.style.transform = step.angle !== 0 ? `rotate(${step.angle}deg)` : `rotate(0deg)`;*/
    };

    document.getElementById('btn-prev-step').addEventListener('click', () => {
        if (activeStepIndex > 0) { activeStepIndex--; updateNavigationUI(); }
    });

    document.getElementById('btn-next-step').addEventListener('click', () => {
        if (activeStepIndex < currentSteps.length - 1) { activeStepIndex++; updateNavigationUI(); }
    });

    document.getElementById('btn-quit-navigation').addEventListener('click', () => {
        UI.toggleNavigationMode(false);
        state.activeRoutePaths = routeOverlay.fullRoutePaths; // Restaure la ligne
        filterMapElements(state.currentFloor);
        openRouteOverlay(); 
    });

    document.getElementById('btn-lets-go').addEventListener('click', () => {
        if (!state.startNode || !state.endNode) return alert("Veuillez définir un départ et une arrivée.");

        const route = RouteCtrl.calculateRoute(state.startNode, state.endNode);
        if (route) {
            state.activeRouteNodes = route.nodes;
            routeOverlay.fullRoutePaths = route.paths;
            state.activeRoutePaths = route.paths;

            currentSteps = RouteCtrl.generateItinerarySteps(route);
            activeStepIndex = 0;

            UI.toggleNavigationMode(true); // Cache tout le bas et ouvre le GPS
            updateNavigationUI();
        } else {
            alert("Aucun itinéraire trouvé.");
        }
    });

    // ==========================================
    // GESTION DES OPTIONS D'ITINÉRAIRE
    // ==========================================
    const btnWalk = document.querySelector('.fa-person-walking').parentElement;
    const btnWheelchair = document.querySelector('.fa-wheelchair').parentElement;
    const btnOutdoor = document.querySelector('.fa-cloud-sun').parentElement;
    const btnIndoor = document.querySelector('.fa-house').parentElement;

    btnWalk.addEventListener('click', () => { btnWalk.classList.add('active'); btnWheelchair.classList.remove('active'); state.routePrefPmr = false; });
    btnWheelchair.addEventListener('click', () => { btnWheelchair.classList.add('active'); btnWalk.classList.remove('active'); state.routePrefPmr = true; });
    btnOutdoor.addEventListener('click', () => { btnOutdoor.classList.add('active'); btnIndoor.classList.remove('active'); state.routePrefEnvironment = 'outdoor'; });
    btnIndoor.addEventListener('click', () => { btnIndoor.classList.add('active'); btnOutdoor.classList.remove('active'); state.routePrefEnvironment = 'indoor'; });
});