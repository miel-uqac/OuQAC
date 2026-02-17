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
    state.paths.forEach(p => p.setStyle(PathCtrl.getPathStyle(p.userData.type, p.userData.pmr, false)));

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
        // Suppression nœud temporaire si existe
        if (state.selectedNode && state.nodeIsTemporary) {
            map.removeLayer(state.selectedNode);
            removeNodeFromState(state.selectedNode);
        }
        // Reset styles
        state.nodes.forEach(n => NodeCtrl.refreshNodeStyle(n, false));
        // Création nouveau
        NodeCtrl.createNode(e.latlng.lat, e.latlng.lng);
    } else {
        // Mode View ou Path : clic dans le vide = reset
        UI.clearNodeForm();
        UI.clearPathForm();
        PathCtrl.resetPathSelection();
        state.nodes.forEach(n => NodeCtrl.refreshNodeStyle(n, false));
        state.paths.forEach(p => p.setStyle(PathCtrl.getPathStyle(p.userData.type, p.userData.pmr, false)));
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

    // Select Layer
    document.getElementById('sel-layer').addEventListener('change', (e) => {
        setFloor(e.target.value);
        filterMapElements(e.target.value);
    });

    // Node Form
    document.getElementById('btn-save-node').onclick = NodeCtrl.validateNode;
    document.getElementById('btn-del-node').onclick = NodeCtrl.deleteCurrentNode;
    
    // Changement type noeud -> preview couleur
    document.getElementById('node-type').addEventListener('change', () => {
        if(state.selectedNode) NodeCtrl.refreshNodeStyle(state.selectedNode, true); // true = keep selected border
    });

    // Path Form
    document.getElementById('btn-save-path').onclick = PathCtrl.validatePath;
    document.getElementById('btn-del-path').onclick = PathCtrl.deleteCurrentPath;
    
    // Changement type chemin -> preview style
    const updatePathPreview = () => {
        if(state.selectedPath) {
            state.selectedPath.userData.type = document.getElementById('path-type').value;
            state.selectedPath.userData.pmr = document.getElementById('path-pmr').checked;
            state.selectedPath.setStyle(PathCtrl.getPathStyle(state.selectedPath.userData.type, state.selectedPath.userData.pmr, true));
        }
    };
    document.getElementById('path-type').addEventListener('change', updatePathPreview);
    document.getElementById('path-pmr').addEventListener('change', updatePathPreview);

    // Search
    document.getElementById('search-room').addEventListener('input', (e) => {
        UI.updateRoomList(e.target.value.toLowerCase());
    });

    // Import / Export
    document.getElementById('btn-save').onclick = IOCtrl.exportGraph;
    document.getElementById('btn-import').onclick = () => document.getElementById('import-file').click();
    document.getElementById('import-file').onchange = IOCtrl.importGraph;

    // Initialisation
    UI.updateRoomList();
});