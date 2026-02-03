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

// Couleurs par type de chemin
const PATH_COLORS = {
    "indoor": "#3498db",  // Bleu
    "outdoor": "#2ecc71"  // Vert
};

// État de l'application
let currentMode = 'view'; // 'view', 'node', 'path'
let nodes = []; // Stockage des objets marqueurs (noeuds)
let selectedNode = null; // Le nœud actuellement affiché dans le formulaire
let isNodeValidated = true; // Flag pour savoir si le nœud en cours est validé
let paths = []; // Stockage des lignes L.polyline (chemins)
let pathStartNode = null; // Premier nœud cliqué pour un nouveau chemin
let selectedPath = null; // Le chemin actuellement affiché dans le formulaire

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

    // Événement : Clic sur le marker pour l'éditer / Pour créer un chemin
    nodeMarker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        
        // On test dans quel mode on est :
        // node -> édition du marker
        // path -> création du chemin
        if (currentMode === 'node') {
            selectNode(nodeMarker);
        } else if (currentMode === 'path') {
            handleNodeClickForPath(nodeMarker);
        }
    });

    // Événement : Drag & Drop
    nodeMarker.on('dragend', () => {
        updateNodeInputs(nodeMarker);
    });

    // Événement : Mise à jour des chemins quand on déplace un nœud (dans le dragend)
    nodeMarker.on('drag', () => {
        // Si on déplace le nœud, on recalcule les chemins qui y sont rattachées
        paths.forEach(path => {
            if (path.userData.startId === nodeMarker.userData.id || path.userData.endId === nodeMarker.userData.id) {
                // On retrouve les deux nœuds pour mettre à jour les positions
                const nStart = nodes.find(n => n.userData.id === path.userData.startId);
                const nEnd = nodes.find(n => n.userData.id === path.userData.endId);
                path.setLatLngs([nStart.getLatLng(), nEnd.getLatLng()]);
                
                // Mise à jour distance auto
                path.userData.distAuto = map.distance(nStart.getLatLng(), nEnd.getLatLng()).toFixed(2);
            }
        });
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
// LOGIQUE DES CHEMINS (ÉDITION)
// ==========================================

// Cette fonction sera appelée quand on clique sur un nœud en mode chemin
function handleNodeClickForPath(node) {
    if (currentMode !== 'path') return;

    if (!pathStartNode) {
        // Premier clic : on sélectionne le point de départ
        pathStartNode = node;
        // On donne un petit effet visuel au nœud sélectionné
        node.getElement().querySelector('div').style.border = "3px solid white";
    } else {
        // Deuxième clic : on vérifie que ce n'est pas le même nœud
        if (pathStartNode === node) {
            resetPathSelection();
            return;
        }

        // Création du chemin
        createPath(pathStartNode, node);
        resetPathSelection();
    }
}

function createPath(nodeA, nodeB) {
    const id = "path_" + Date.now();
    const latlngs = [nodeA.getLatLng(), nodeB.getLatLng()];
    
    // Calcul de la distance réelle en mètres
    const distanceMeters = map.distance(nodeA.getLatLng(), nodeB.getLatLng());

    // Stockage des données personnalisées dans un objet
    const initialData = {
        id: id,
        startId: nodeA.userData.id,
        endId: nodeB.userData.id,
        type: "indoor",
        distAuto: distanceMeters.toFixed(2),
        distManual: "",
        pmr: true
    };
    
    // On applique le style dynamiquement
    const polyline = L.polyline(latlngs, getPathStyle(initialData)).addTo(map);
    // Stockage des données personnalisées dans le chemin
    polyline.userData = initialData;

    // Événement : Clic sur le polyline pour l'éditer
    polyline.on('click', (e) => {
        if (currentMode === 'path') {
            L.DomEvent.stopPropagation(e);
            selectPath(polyline);
        }
    });

    paths.push(polyline);
    selectPath(polyline);
}

function selectPath(path) {
    selectedPath = path;
    // Affichage du formulaire latéral
    document.getElementById('path-form').classList.remove('hidden');
    
    // Remplissage du formulaire latéral
    document.getElementById('path-id').value = path.userData.id;
    document.getElementById('path-type').value = path.userData.type;
    document.getElementById('path-dist-auto').value = path.userData.distAuto + " m";
    document.getElementById('path-dist-manual').value = path.userData.distManual;
    document.getElementById('path-pmr').checked = path.userData.pmr;
}

// Validation des modifications
function validatePath() {
    if (selectedPath) {
        selectedPath.userData.type = document.getElementById('path-type').value;
        selectedPath.userData.distManual = document.getElementById('path-dist-manual').value;
        selectedPath.userData.pmr = document.getElementById('path-pmr').checked;

        // Appliquer le nouveau style
        selectedPath.setStyle(getPathStyle(selectedPath.userData));

        alert("Chemin validé !");
    }
}

// Suppression du chemin séléctionné
function deleteCurrentPath() {
    if (selectedPath) {
        map.removeLayer(selectedPath);
        paths = paths.filter(p => p !== selectedPath);
        selectedPath = null;
        document.getElementById('path-form').classList.add('hidden');
    }
}

// Reset le style du noeud séléctionné
function resetPathSelection() {
    if (pathStartNode) {
        pathStartNode.getElement().querySelector('div').style.border = "2px solid black";
    }
    pathStartNode = null;
}

// Récupérer style du chemin
function getPathStyle(userData) {
    return {
        color: PATH_COLORS[userData.type] || "#2c3e50",
        weight: 5,
        opacity: 0.8,
        // Si pmr est vrai (coché), on met du plein (null), sinon des pointillés ('10, 10')
        dashArray: userData.pmr ? null : '10, 15' 
    };
}

// Mise à jour dynamique du style du chemin lors du changement de type
document.getElementById('path-type').addEventListener('change', (e) => {
    if (selectedPath) {
        selectedPath.userData.type = e.target.value;
        selectedPath.setStyle(getPathStyle(selectedPath.userData));
    }
});

// Mise à jour dynamique du style du chemin lors du changement PMR
document.getElementById('path-pmr').addEventListener('change', (e) => {
    if (selectedPath) {
        selectedPath.userData.pmr = e.target.checked;
        selectedPath.setStyle(getPathStyle(selectedPath.userData));
    }
});

// ==========================================
// LOGIQUE FONCTIONNEL
// ==========================================
