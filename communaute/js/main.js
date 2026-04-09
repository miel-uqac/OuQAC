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

    // États de l'application
    let currentSearchTarget = 'start'; // 'start' ou 'end'
    state.startNode = null;
    state.endNode = null;


    // ==========================================
    // GESTION DE L'HISTORIQUE
    // ==========================================
    
    // Ajoute un faux statut dans l'URL pour bloquer la sortie de l'app
    const setOverlayHash = () => {
        if (window.location.hash !== '#active') {
            history.pushState(null, null, '#active');
        }
    };

    // Si on ferme via nos boutons, on retire le faux statut
    const clearOverlayHash = (skipHistory) => {
        if (!skipHistory && window.location.hash === '#active') {
            history.back();
        }
    };

    // Écouteur global : Dès que l'utilisateur fait "Retour" sur son téléphone
    window.addEventListener('popstate', () => {
        if (window.location.hash === '') {
            if (!searchOverlay.classList.contains('hidden')) {
                minimizeSearchOverlay(true);
            } else if (!routeOverlay.classList.contains('hidden')) {
                minimizeRouteOverlay(true);
            }
        }
    });


    // ==========================================
    // LOGIQUE DE RÉDUCTION
    // ==========================================
    const minimizeSearchOverlay = (skipHistory = false) => {
        clearOverlayHash(skipHistory);
        searchOverlay.classList.add('hidden');
        setTimeout(() => { searchOverlay.style.transform = ''; }, 200);
        
        // On conserve le texte dans la barre du bas
        mainSearchInput.value = searchInput.value;
        
        // Si on était en train de paramétrer un itinéraire, on retourne dessus
        if (state.startNode || state.endNode) {
            openRouteOverlay();
        }
    };

    const minimizeRouteOverlay = (skipHistory = false) => {
        clearOverlayHash(skipHistory);
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
    const closeSearchOverlay = (skipHistory = false) => {
        clearOverlayHash(skipHistory);
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

    const closeRouteOverlay = (skipHistory = false) => {
        clearOverlayHash(skipHistory);
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
        setOverlayHash(); // Sécurise le bouton retour Android
        
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
        setOverlayHash(); // Sécurise le bouton retour Android
        
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
    
    // Événements des croix (On ajoute la fonction fléchée pour éviter de passer l'Event à "skipHistory")
    btnCloseSearch.addEventListener('click', () => closeSearchOverlay());
    btnCloseRoute.addEventListener('click', () => closeRouteOverlay());
    btnCancelRouteMini.addEventListener('click', () => closeRouteOverlay());

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

    // Clic sur un lieu courant
    document.querySelectorAll('#common-places .location-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const name = e.target.textContent;
            // On essaie de trouver un nœud qui a exactement ce nom
            const node = state.nodes.find(n => n.userData.name.toLowerCase() === name.toLowerCase());
            if (node) selectLocation(node);
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
    setupSwipeToClose(searchOverlay, () => minimizeSearchOverlay());
    setupSwipeToClose(routeOverlay, () => minimizeRouteOverlay());

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
    // ETAT DE NAVIGATION ACTIVE (GPS)
    // ==========================================
    let currentSteps = []; // Tableau contenant toutes les étapes
    let activeStepIndex = 0; // L'étape active

    const activeRouteUI = document.getElementById('active-route-ui');
    const bottomControls = document.getElementById('bottom-controls');
    
    const stepTitle = document.getElementById('step-title');
    const stepDesc = document.getElementById('step-desc');
    const stepIcon = document.getElementById('step-icon');
    
    const btnPrevStep = document.getElementById('btn-prev-step');
    const btnNextStep = document.getElementById('btn-next-step');
    const btnQuitNav = document.getElementById('btn-quit-navigation');
    const mapElement = document.getElementById('map');

    // Met à jour l'interface en fonction de l'étape active
    const updateNavigationUI = () => {
        if (currentSteps.length === 0) return;

        const step = currentSteps[activeStepIndex];
        const stepText = step.text.toLowerCase();
        
        // Icone et Titre
        let iconClass = "fa-person-walking";
        let title = "Continuer";

        if (stepText.includes("départ")) { iconClass = "fa-location-dot"; title = "Départ"; }
        else if (stepText.includes("arrivée")) { iconClass = "fa-flag-checkered"; title = "Arrivée"; }
        else if (stepText.includes("ascenseur")) { iconClass = "fa-elevator"; title = "Changement d'étage"; }
        else if (stepText.includes("escalier")) { iconClass = "fa-stairs"; title = "Changement d'étage"; }
        else if (stepText.includes("gauche")) { iconClass = "fa-arrow-turn-down fa-rotate-90"; title = "Tourner à gauche"; }
        else if (stepText.includes("droite")) { iconClass = "fa-arrow-turn-up fa-rotate-90"; title = "Tourner à droite"; }
        else if (stepText.includes("sortir") || stepText.includes("entrer")) { iconClass = "fa-door-open"; title = "Porte"; }

        stepIcon.className = `fa-solid ${iconClass}`;
        stepTitle.textContent = title;
        stepDesc.textContent = step.text;

        // Boutons Prev/Next
        btnPrevStep.disabled = (activeStepIndex === 0);
        btnNextStep.disabled = (activeStepIndex === currentSteps.length - 1);

        // Mise à jour de l'étage automatique
        if (state.currentFloor !== step.node.userData.floor) {
            setFloor(step.node.userData.floor);
            floorBtns.forEach(b => b.classList.remove('active'));
            const btnFloor = document.querySelector(`.floor-btn[data-floor="${step.node.userData.floor}"]`);
            if (btnFloor) btnFloor.classList.add('active');
        }

        // Filtrage des chemins
        // On modifie activeRoutePaths pour n'afficher que le chemin restant
        state.activeRoutePaths = routeOverlay.fullRoutePaths.slice(step.pathIndex);
        filterMapElements(state.currentFloor);

        // Centrage de la caméra et Rotation de la carte
        map.flyTo(step.node.getLatLng(), 19, {duration: 0.5});
        
        if (step.angle !== 0) {
            // Fait tourner la carte visuellement vers la cible
            mapElement.style.transform = `rotate(${step.angle}deg)`;
        } else {
            mapElement.style.transform = `rotate(0deg)`;
        }
    };

    // Événements des boutons de navigation
    btnPrevStep.addEventListener('click', () => {
        if (activeStepIndex > 0) { activeStepIndex--; updateNavigationUI(); }
    });

    btnNextStep.addEventListener('click', () => {
        if (activeStepIndex < currentSteps.length - 1) { activeStepIndex++; updateNavigationUI(); }
    });

    btnQuitNav.addEventListener('click', () => {
        activeRouteUI.classList.add('hidden');
        bottomControls.classList.remove('hidden'); // Réaffiche la barre de recherche
        mapElement.style.transform = `rotate(0deg)`; // Reset la rotation de la carte
        
        // Restaure la ligne complète
        state.activeRoutePaths = routeOverlay.fullRoutePaths;
        filterMapElements(state.currentFloor);
        
        openRouteOverlay(); 
    });

    // ==========================================
    // LANCEMENT ITINERAIRE
    // ==========================================
    document.getElementById('btn-lets-go').addEventListener('click', () => {
        if (!state.startNode || !state.endNode) {
            alert("Veuillez définir un départ et une arrivée.");
            return;
        }

        // Lancement A*
        const route = RouteCtrl.calculateRoute(state.startNode, state.endNode);
        
        if (route) {
            state.activeRouteNodes = route.nodes;
            // On sauvegarde le chemin total
            routeOverlay.fullRoutePaths = route.paths;
            state.activeRoutePaths = route.paths;

            // Génération des étapes
            currentSteps = RouteCtrl.generateItinerarySteps(route);
            activeStepIndex = 0;

            // Gestion de l'interface
            routeOverlay.classList.add('hidden');
            bottomControls.classList.add('hidden');
            minimizedRouteTrigger.classList.add('hidden');
            
            activeRouteUI.classList.remove('hidden');
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