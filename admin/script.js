// ==========================================
// CONFIGURATION ET INITIALISATION
// ==========================================

// Coordonnées de l'UQAC (Pavillon Principal)
const UQAC_COORDS = [48.4204, -71.0526];

// Initialisation de la carte
const map = L.map('map').setView(UQAC_COORDS, 17);

// Fond de carte OpenStreetMap
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, // Zoom élevé pour l'intérieur
    attribution: '© OpenStreetMap'
}).addTo(map);

// Couleurs par type de nœud
const TYPE_COLORS = {
    "salle": "#e74c3c",      // Rouge
    "couloir": "#3498db",    // Bleu
    "escalier": "#f1c40f",   // Jaune
    "ascenseur": "#9b59b6",  // Violet
    "wc": "#2ecc71"          // Vert
};

// État de l'application
let currentMode = 'view'; // 'view', 'node', 'path'
let nodes = []; // Stockage des objets marqueurs
let selectedNode = null; // Le nœud actuellement affiché dans le formulaire
let isNodeValidated = true; // Flag pour savoir si le nœud en cours est validé

// ==========================================
// GESTION DES MODES (SIDEBAR)
// ==========================================

function changeMode(mode, btn) {
    currentMode = mode;
    
    // UI Boutons
    document.querySelectorAll('.btn-mode').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // UI Panneaux
    document.getElementById('panel-view').classList.add('hidden');
    document.getElementById('panel-node').classList.add('hidden');
    document.getElementById('panel-path').classList.add('hidden');
    
    document.getElementById('panel-' + mode).classList.remove('hidden');
}

// ==========================================
// LOGIQUE DES NŒUDS (ÉDITION)
// ==========================================

map.on('click', function(e) {
    if (currentMode !== 'node') return;

    // Si on a un nœud en cours qui n'est pas validé, on le supprime avant d'en créer un nouveau
    if (!isNodeValidated && selectedNode) {
        removeNode(selectedNode);
    }

    const { lat, lng } = e.latlng;
    createNode(lat, lng);
});

function createNode(lat, lng) {
    const id = "node_" + Date.now();
    const defaultType = "salle";
    
    // Création d'une icône personnalisée en forme de cercle
    const circleIcon = L.divIcon({
        className: 'custom-node-icon',
        html: `<div style="
            background-color: ${TYPE_COLORS[defaultType]};
            width: 12px;
            height: 12px;
            border: 2px solid black;
            border-radius: 50%;
        "></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
    });

    // On crée un Marker standard avec notre icon
    const nodeMarker = L.marker([lat, lng], {
        icon: circleIcon,
        draggable: true
    }).addTo(map);

    // Stockage des données personnalisées dans l'objet marker
    nodeMarker.userData = {
        id: id,
        name: "",
        type: defaultType
    };

    // Événement : Clic sur le marker pour l'éditer
    nodeMarker.on('click', (e) => {
        L.DomEvent.stopPropagation(e); // Empêche de créer un nouveau point par dessus
        selectNode(nodeMarker);
    });

    // Événement : Drag & Drop
    nodeMarker.on('dragend', () => {
        updateNodeInputs(nodeMarker);
    });

    nodes.push(nodeMarker);
    isNodeValidated = false;
    selectNode(nodeMarker);
}

function selectNode(node) {
    selectedNode = node;
    // Remplissage du formulaire latéral
    document.getElementById('node-id').value = node.userData.id;
    document.getElementById('node-name').value = node.userData.name;
    document.getElementById('node-type').value = node.userData.type;
    updateNodeInputs(node);
}

function updateNodeInputs(node) {
    const pos = node.getLatLng();
    // On affiche les coordonnées
    document.getElementById('node-coords').value = `${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`;
}

// Change la couleur du marker en temps réel quand on change le type dans le select
document.getElementById('node-type').addEventListener('change', (e) => {
    if (selectedNode) {
        const newType = e.target.value;
        selectedNode.userData.type = newType;
        
        // Mise à jour visuelle immédiate de la couleur du point
        const color = TYPE_COLORS[newType] || "#000";
        const iconDiv = selectedNode.getElement().querySelector('div');
        if (iconDiv) {
            iconDiv.style.backgroundColor = color;
        }
    }
});

// Validation des modifications
function validateNode() {
    if (selectedNode) {
        selectedNode.userData.name = document.getElementById('node-name').value;
        selectedNode.userData.type = document.getElementById('node-type').value;
        isNodeValidated = true;
        alert("Nœud enregistré !");
    }
}

// Suppression du noeud sélectionné
function deleteCurrentNode() {
    if (selectedNode) {
        removeNode(selectedNode);
        selectedNode = null;
        isNodeValidated = true;
        // Reset du formulaire
        document.getElementById('node-id').value = "";
        document.getElementById('node-name').value = "";
        document.getElementById('node-coords').value = "";
    }
}

// Fonction de suppression de noeud
function removeNode(node) {
    map.removeLayer(node);
    nodes = nodes.filter(n => n !== node);
}

// ==========================================
// LOGIQUE FONCTIONNEL
// ==========================================
