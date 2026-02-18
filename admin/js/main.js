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
        // Reset styles (Désélection visuelle des autres)
        state.nodes.forEach(n => NodeCtrl.refreshNodeStyle(n, false));
        
        // Création du nouveau nœud
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
    
    // Select Layer (Changement d'étage)
    document.getElementById('sel-layer').addEventListener('change', (e) => {
        const floor = e.target.value;
        setFloor(floor);
        filterMapElements(floor);

        // Désélection totale lors du changement d'étage
        state.selectedNode = null;
        state.selectedPath = null;
        UI.clearNodeForm();
        UI.clearPathForm();
        PathCtrl.resetPathSelection();
        
        // Reset visuel (pour éviter qu'un élément caché reste "blanc/sélectionné")
        state.nodes.forEach(n => NodeCtrl.refreshNodeStyle(n, false));
        state.paths.forEach(p => p.setStyle(PathCtrl.getPathStyle(p.userData.type, p.userData.pmr, false)));
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