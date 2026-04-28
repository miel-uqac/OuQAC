/**
 * ====================================================================
 * APPLICATION : OùQAC - Panel Communauté
 * FICHIER : main.js
 * RÔLE : Point d'entrée principal (Gestionnaire des interactions mobiles)
 * ====================================================================
 * * DESCRIPTION :
 * Contrairement à l'Admin, ce fichier agit comme le contrôleur principal 
 * d'une application "Mobile-First". Il orchestre les transitions entre 
 * les différents "écrans" (Overlays) qui se superposent à la carte, et gère 
 * l'expérience de navigation GPS étape par étape.
 * * FONCTIONS PRINCIPALES :
 * - Gestion des Overlays : Gère l'ouverture, la réduction (minimize) et la 
 * fermeture des panneaux "Recherche" et "Itinéraire". Il intègre une logique 
 * complexe pour gérer l'historique du navigateur (History API), permettant 
 * à l'utilisateur de fermer les panneaux avec le bouton physique "Retour" de 
 * son téléphone.
 * - Moteur de recherche local : Écoute les frappes dans la barre de recherche, 
 * filtre le `state.nodes` en direct et demande à `UI.renderSearchResults` 
 * d'afficher les résultats.
 * - Mode Navigation (GPS) : Lors du clic sur "C'est parti", appelle `RouteCtrl` 
 * pour calculer le chemin (A*) et générer les étapes textuelles. Il active 
 * ensuite une interface simplifiée (Carte de navigation en haut de l'écran) 
 * et permet de passer d'une étape à l'autre, en modifiant automatiquement 
 * l'étage actif et la vue de la caméra (flyTo).
 * - Gestion des filtres : Capture les clics sur les préférences d'itinéraire 
 * (PMR, Intérieur/Extérieur) et met à jour le state.
 * * FLUX DE DONNÉES / TRAVAIL :
 * 1. Initialisation : Déclenche silencieusement `loadGraphData()` (dataController.js) 
 * pour télécharger le graphe JSON.
 * 2. Interaction Menu/Recherche : L'utilisateur navigue dans les menus. `main.js` 
 * manipule les classes CSS (`hidden`, `transform`) pour animer les panneaux et 
 * interroge les données pour proposer des suggestions de salles.
 * 3. Interaction Carte/GPS : L'utilisateur définit un point A et un point B. `main.js` 
 * demande à `RouteCtrl` la liste des instructions. Il boucle ensuite sur ce 
 * tableau (currentSteps) à chaque clic sur "Suivant/Précédent", en synchronisant 
 * la carte Leaflet et l'étage affiché.
 **/

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

    let currentSearchTarget = 'end'; 
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

    searchTrigger.addEventListener('click', () => openSearchOverlay('end'));
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

    // Clic sur un lieu courant
    document.querySelectorAll('#common-places .location-item').forEach(item => {
        item.addEventListener('click', (e) => {
            // On récupère le nom en enlevant les espaces parasites avant/après
            const name = e.target.textContent.trim();
            
            // On cherche le nœud
            const node = state.nodes.find(n => 
                n.userData.name && 
                n.userData.name.trim().toLowerCase() === name.toLowerCase()
            );
            
            // On lance la sélection
            if (node) {
                selectLocation(node);
            } 
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
    // On récupére les boutons dans la section ".route-options"
    const pmrGroupBtns = document.querySelectorAll('.route-options:nth-of-type(1) .toggle-btn');
    const envGroupBtns = document.querySelectorAll('.route-options:nth-of-type(3) .toggle-btn');

    // Bouton "Marche"
    pmrGroupBtns[0].addEventListener('click', () => {
        pmrGroupBtns[0].classList.add('active');
        pmrGroupBtns[1].classList.remove('active');
        state.routePrefPmr = false;
    });

    // Bouton "Fauteuil (PMR)"
    pmrGroupBtns[1].addEventListener('click', () => {
        pmrGroupBtns[1].classList.add('active');
        pmrGroupBtns[0].classList.remove('active');
        state.routePrefPmr = true;
    });

    // Bouton "Extérieur"
    envGroupBtns[0].addEventListener('click', () => {
        envGroupBtns[0].classList.add('active');
        envGroupBtns[1].classList.remove('active');
        state.routePrefEnvironment = 'outdoor';
    });

    // Bouton "Intérieur"
    envGroupBtns[1].addEventListener('click', () => {
        envGroupBtns[1].classList.add('active');
        envGroupBtns[0].classList.remove('active');
        state.routePrefEnvironment = 'indoor';
    });
});