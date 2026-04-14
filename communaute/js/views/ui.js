// ==========================================
// GESTION DE L'INTERFACE (VUES)
// ==========================================

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
    else if (stepText.includes("ascenseur")) { iconClass = "fa-elevator"; title = "Changement d'étage"; }
    else if (stepText.includes("escalier")) { iconClass = "fa-stairs"; title = "Changement d'étage"; }
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