import { map, setFloor, filterMapElements } from './map.js';
import { state, removeNodeFromState } from './state.js';
import * as NodeCtrl from './controllers/nodeController.js';
import * as PathCtrl from './controllers/pathController.js';
import * as IOCtrl from './controllers/ioController.js';
import * as UI from './views/ui.js';

// ==========================================
// GESTION GLOBALE
// ==========================================

// Changement de mode
export function changeMode(mode, btn) {
    state.currentMode = mode;
    
    // Reset visuel global
    state.nodes.forEach(n => NodeCtrl.refreshNodeStyle(n, false));
    PathCtrl.clearHighlight();

    // Reset formulaires
    UI.clearNodeForm();
    UI.clearPathForm();
    PathCtrl.resetPathSelection();

    // UI Boutons
    document.querySelectorAll('.btn-mode').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    // UI Panneaux
    ['view', 'node', 'path'].forEach(m => {
        document.getElementById('panel-' + m).classList.add('hidden');
    });
    document.getElementById('panel-' + mode).classList.remove('hidden');
}

// Clic sur la carte (Logique principale)
map.on('click', function(e) {
    if (state.currentMode === 'node') {
        // Reset styles (Désélection visuelle des autres)
        state.nodes.forEach(n => NodeCtrl.refreshNodeStyle(n, false));
        
        // Création du nouveau nœud
        NodeCtrl.createNode(e.latlng.lat, e.latlng.lng);
    } else {
        // Mode View ou Path : clic dans le vide = reset
        UI.clearNodeForm();
        UI.clearPathForm();
        PathCtrl.resetPathSelection();
        PathCtrl.clearHighlight();
        state.nodes.forEach(n => NodeCtrl.refreshNodeStyle(n, false));
    }
});

// ==========================================
// BINDINGS (Attacher les événements HTML)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // Boutons modes
    const btns = document.querySelectorAll('.btn-mode');
    btns[0].onclick = () => changeMode('view', btns[0]);
    btns[1].onclick = () => changeMode('node', btns[1]);
    btns[2].onclick = () => changeMode('path', btns[2]);
    
    // Select Layer (Changement d'étage)
    document.getElementById('sel-layer').addEventListener('change', (e) => {
        const floor = e.target.value;
        setFloor(floor);
        filterMapElements(floor);
        
        // Reset visuel (pour éviter qu'un élément caché reste "blanc/sélectionné")
        state.nodes.forEach(n => NodeCtrl.refreshNodeStyle(n, false));
        PathCtrl.clearHighlight();
    });

    // Node Form
    document.getElementById('btn-del-node').onclick = NodeCtrl.deleteCurrentNode;
    // SAUVEGARDE AUTO : Quand on écrit le nom
    document.getElementById('node-name').addEventListener('input', () => {
        NodeCtrl.updateCurrentNode();
    });

    // SAUVEGARDE AUTO + VISUEL : Quand on change le type
    document.getElementById('node-type').addEventListener('change', () => {
        NodeCtrl.updateCurrentNode();
    });
    
    // Changement type noeud -> preview couleur
    document.getElementById('node-type').addEventListener('change', () => {
        if(state.selectedNode) NodeCtrl.refreshNodeStyle(state.selectedNode, true); // true = keep selected border
    });

    // SAUVEGARDE AUTO + VISUEL : Déplacement manuel via input coordonnée
    document.getElementById('node-coords').addEventListener('input', () => {
        NodeCtrl.updateNodePositionFromInput();
    });

    // Path Form
    document.getElementById('btn-del-path').onclick = PathCtrl.deleteCurrentPath;
    
    // SAUVEGARDE AUTO : Changement de type (Style + Données)
    document.getElementById('path-type').addEventListener('change', () => {
        PathCtrl.updateCurrentPath();
    });

    // SAUVEGARDE AUTO : Changement PMR (Style + Données)
    document.getElementById('path-pmr').addEventListener('change', () => {
        PathCtrl.updateCurrentPath();
    });

    // SAUVEGARDE AUTO : Distance manuelle (Données uniquement, pas de changement visuel)
    document.getElementById('path-dist-manual').addEventListener('input', () => {
        PathCtrl.updateCurrentPath();
    });

    // Navigation rapide : Clic sur l'input A ou B dans le panel chemin
    const navigateToNodeFromPath = (isNodeA) => {
        if (!state.selectedPath) return;
        
        // On récupère l'ID du nœud cible
        const targetId = isNodeA ? state.selectedPath.userData.startId : state.selectedPath.userData.endId;
        const targetNode = state.nodes.find(n => n.userData.id === targetId);
        
        if (targetNode) {
            const floor = targetNode.userData.floor;
            
            // 1. Changement d'étage dans le select et sur la carte
            document.getElementById('sel-layer').value = floor;
            setFloor(floor);
            filterMapElements(floor);
            
            // 2. Bascule en mode 'node' via le contrôleur principal
            const btnNode = document.querySelectorAll('.btn-mode')[1];
            changeMode('node', btnNode);
            
            // 3. Sélection du nœud ciblé
            NodeCtrl.selectNode(targetNode);
        }
    };

    document.getElementById('path-node-a').addEventListener('click', () => navigateToNodeFromPath(true));
    document.getElementById('path-node-b').addEventListener('click', () => navigateToNodeFromPath(false));

    // Search & Filter
    document.getElementById('search-room').addEventListener('input', () => {
        UI.updateRoomList();
    });
    document.getElementById('search-type').addEventListener('change', () => {
        UI.updateRoomList();
    });

    // Import / Export
    document.getElementById('btn-save').onclick = IOCtrl.exportGraph;
    document.getElementById('btn-import').onclick = () => document.getElementById('import-file').click();
    document.getElementById('import-file').onchange = IOCtrl.importGraph;

    // Initialisation
    // On essaie de charger les données du cache
    const dataLoaded = IOCtrl.loadFromLocalStorage();
    
    // Si rien n'a été chargé on met à jour la liste vide
    if (!dataLoaded) {
        UI.updateRoomList();
    }
});