// ==========================================
// CONFIGURATION ET INITIALISATION
// ==========================================

// Coordonnées de l'UQAC (Pavillon Principal)
const UQAC_COORDS = [48.4204, -71.0526];

// Initialisation de la carte
const map = L.map('map').setView(UQAC_COORDS, 17);

// Fond de carte OpenStreetMap
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 21, // Zoom élevé pour l'intérieur
    attribution: '© OpenStreetMap'
}).addTo(map);

// État de l'application
let currentMode = 'view'; // 'view', 'node', 'path'
let nodes = []; // Stockage des objets marqueurs

// ==========================================
// GESTION DES MODES (SIDEBAR)
// ==========================================

const buttons = document.querySelectorAll('.btn-mode');
buttons.forEach(btn => {
    btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Déduction du mode via le texte du bouton
        if(btn.innerText === 'Vue') currentMode = 'view';
        if(btn.innerText === 'Nœuds') currentMode = 'node';
        if(btn.innerText === 'Chemins') currentMode = 'path';
        
        updatePanels();
    });
});

function updatePanels() {
    document.getElementById('panel-view').classList.toggle('hidden', currentMode !== 'view');
    document.getElementById('panel-node').classList.toggle('hidden', currentMode !== 'node');
    document.getElementById('panel-path').classList.toggle('hidden', currentMode !== 'path');
}

// ==========================================
// LOGIQUE DES NŒUDS (ÉDITION)
// ==========================================

map.on('click', function(e) {
    if (currentMode !== 'node') return;

    const { lat, lng } = e.latlng;
    createNode(lat, lng);
});

function createNode(lat, lng) {
    const id = "node_" + Date.now();
    
    // Création du marqueur Leaflet
    const marker = L.marker([lat, lng], {
        draggable: true,
        title: id
    }).addTo(map);

    // Stockage des données personnalisées dans l'objet marker
    marker.userData = {
        id: id,
        name: "",
        type: "salle"
    };

    // Événement : Clic sur le marqueur pour l'éditer
    marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e); // Empêche de créer un nouveau point par dessus
        selectNode(marker);
    });

    // Événement : Drag & Drop
    marker.on('dragend', function(e) {
        updateNodeInputs(marker);
    });

    nodes.push(marker);
    selectNode(marker);
}

function selectNode(marker) {
    // Remplissage du formulaire latéral
    document.getElementById('node-id').value = marker.userData.id;
    document.getElementById('node-name').value = marker.userData.name;
    document.getElementById('node-type').value = marker.userData.type;
    updateNodeInputs(marker);
}

function updateNodeInputs(marker) {
    const pos = marker.getLatLng();
    // On affiche les coordonnées
    document.getElementById('node-coords').value = `${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`;
}

// Validation des modifications
document.querySelector('#panel-node .btn-validate').addEventListener('click', () => {
    const id = document.getElementById('node-id').value;
    const marker = nodes.find(m => m.userData.id === id);
    if (marker) {
        marker.userData.name = document.getElementById('node-name').value;
        marker.userData.type = document.getElementById('node-type').value;
        alert("Nœud mis à jour !");
    }
});