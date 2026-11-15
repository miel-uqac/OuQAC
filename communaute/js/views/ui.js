/**
 * ====================================================================
 * APPLICATION : OùQAC - Panel Communauté
 * FICHIER : ui.js (Views)
 * RÔLE : Gestionnaire de l'interface utilisateur et des interactions tactiles
 * ====================================================================
 * * DESCRIPTION :
 * Ce fichier centralise toute la manipulation visuelle de l'interface HTML 
 * (DOM) pour l'application publique. Fortement orienté "mobile-first", 
 * il isole la logique d'affichage, les animations, et l'adaptation de 
 * l'écran lors du passage du mode "Exploration" au mode "GPS".
 * * FONCTIONS PRINCIPALES :
 * - renderSearchResults(filteredNodes, container, selectCallback) : Génère et 
 * injecte dynamiquement la liste cliquable des salles correspondant à la 
 * recherche de l'utilisateur.
 * - renderCommonPlaces(places, container, selectCallback) : Génère la liste
 * "Lieux courants" à partir des nœuds marqués dans l'admin (un vrai bouton
 * par lieu, avec sa catégorie), ou un message si aucun lieu n'est marqué.
 * - updateNavigationCard(step, index, totalSteps) : Met à jour le bandeau 
 * supérieur de guidage GPS. Elle analyse intelligemment le texte de l'étape 
 * ("gauche", "ascenseur", "sortir") pour afficher automatiquement la bonne 
 * icône (FontAwesome) et gère l'état (activé/désactivé) des flèches de navigation.
 * - toggleNavigationMode(isActive) : Bascule l'état global de l'application. 
 * Lors de l'activation du GPS, elle masque les menus de recherche et les 
 * boutons d'étages du bas pour maximiser la visibilité de la carte.
 * - setupSwipeToClose(overlayElement, minimizeCallback) : Implémente la physique 
 * tactile native (Touch Events). Elle permet à l'utilisateur de fermer les panneaux 
 * superposés (overlays) d'un simple glissement de doigt vers le bas (swipe-down).
 * * FLUX DE DONNÉES / TRAVAIL :
 * 1. Écoute passive : Ce module ne décide de rien. Il attend d'être appelé 
 * par `main.js` (suite à un clic) ou par la boucle de navigation.
 * 2. Exécution : Il reçoit des données brutes (un tableau de nœuds filtrés, 
 * un objet d'étape GPS) et les traduit en éléments HTML.
 * 3. Rendu visuel : Il manipule directement les classes CSS (ajout/retrait de 
 * `hidden` ou `active`) et modifie les styles en ligne (`transform: translateY`) 
 * pour créer une expérience utilisateur fluide sans recharger la page.
 **/

import { CONFIG } from '../config.js';

// Rendu des résultats de recherche
export function renderSearchResults(filteredNodes, container, selectCallback) {
    container.innerHTML = '';
    if (filteredNodes.length === 0) {
        container.innerHTML = '<div class="location-item" style="font-weight:normal; color:#888;">Aucun résultat</div>';
    } else {
        filteredNodes.forEach(node => {
            const div = document.createElement('div');
            div.className = 'location-item';
            div.textContent = node.userData.name; 
            div.addEventListener('click', () => selectCallback(node));
            container.appendChild(div);
        });
    }
}

// Rendu de la liste des lieux courants (nœuds marqués "featured" dans l'admin)
export function renderCommonPlaces(places, container, selectCallback) {
    container.innerHTML = '';

    // Aucun lieu marqué : un message plutôt qu'une liste vide (ou des boutons inopérants)
    if (places.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'location-empty';
        empty.textContent = 'Aucun lieu courant pour le moment.';
        container.appendChild(empty);
        return;
    }

    places.forEach(place => {
        // Un vrai <button> : atteignable au clavier et annoncé comme bouton par les lecteurs d'écran
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'location-item place-button';
        button.textContent = place.name;

        // Libellé de la catégorie, s'il est connu (ex. " · Restauration")
        const category = CONFIG.PLACE_CATEGORIES.find(c => c.id === place.category);
        if (category) {
            const label = document.createElement('small');
            label.className = 'place-category';
            label.textContent = ` · ${category.label}`;
            button.appendChild(label);
        }

        button.addEventListener('click', () => selectCallback(place));
        container.appendChild(button);
    });
}

// Mise à jour de la carte GPS (Instructions en haut de l'écran)
export function updateNavigationCard(step, index, totalSteps) {
    const stepTitle = document.getElementById('step-title');
    const stepDesc = document.getElementById('step-desc');
    const stepIcon = document.getElementById('step-icon');
    const btnPrevStep = document.getElementById('btn-prev-step');
    const btnNextStep = document.getElementById('btn-next-step');

    const stepText = step.text.toLowerCase();
    
    let iconClass = "fa-person-walking";
    let title = "Continuer";

    if (stepText.includes("départ")) { iconClass = "fa-location-dot"; title = "Départ"; }
    else if (stepText.includes("arrivée")) { iconClass = "fa-flag-checkered"; title = "Arrivée"; }
    else if (stepText.includes("ascenseur")) { iconClass = "fa-elevator"; title = "Changement de niveau"; }
    else if (stepText.includes("escalier")) { iconClass = "fa-stairs"; title = "Changement de niveau"; }
    else if (stepText.includes("gauche")) { iconClass = "fa-arrow-turn-down fa-rotate-90"; title = "Tourner à gauche"; }
    else if (stepText.includes("droite")) { iconClass = "fa-arrow-turn-up fa-rotate-90"; title = "Tourner à droite"; }
    else if (stepText.includes("sortir") || stepText.includes("entrer")) { iconClass = "fa-door-open"; title = "Porte"; }

    stepIcon.className = `fa-solid ${iconClass}`;
    stepTitle.textContent = title;
    stepDesc.textContent = step.text;

    btnPrevStep.disabled = (index === 0);
    btnNextStep.disabled = (index === totalSteps - 1);
}

// Bascule visuelle du bouton de l'étage actuel
export function updateFloorMenuUI(floor) {
    const floorBtns = document.querySelectorAll('.floor-btn');
    floorBtns.forEach(b => b.classList.remove('active'));
    const btnFloor = document.querySelector(`.floor-btn[data-floor="${floor}"]`);
    if (btnFloor) btnFloor.classList.add('active');
}

// Bascule entre le mode "Exploration" et le mode "GPS"
export function toggleNavigationMode(isActive) {
    const activeRouteUI = document.getElementById('active-route-ui');
    const bottomControls = document.getElementById('bottom-controls');
    const routeOverlay = document.getElementById('route-overlay');
    const mapElement = document.getElementById('map');
    
    if (isActive) {
        routeOverlay.classList.add('hidden');
        // Cache l'intégralité du bas (Barre de recherche + Boutons Étages + Caméra)
        bottomControls.classList.add('hidden'); 
        activeRouteUI.classList.remove('hidden');
    } else {
        activeRouteUI.classList.add('hidden');
        // Réaffiche tout proprement
        bottomControls.classList.remove('hidden'); 
        mapElement.style.transform = `rotate(0deg)`; // Réinitialise la rotation de la carte
    }
}

// Ajout de la mécanique de Swipe sur les menus
export function setupSwipeToClose(overlayElement, minimizeCallback) {
    let startY = 0, currentY = 0, isDragging = false;

    overlayElement.addEventListener('touchstart', (e) => {
        const activeList = overlayElement.querySelector('.location-list:not(.hidden)');
        const isHeader = e.target.closest('.search-overlay-header') || e.target.closest('.drag-handle') || e.target.closest('.route-header');
        
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
            minimizeCallback();
        } else {
            overlayElement.style.transform = 'translateY(0)';
        }
    });
}