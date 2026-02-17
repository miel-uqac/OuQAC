// ==========================================
// ÉTAT GLOBAL (STATE)
// ==========================================

export const state = {
    currentMode: 'view', // 'view', 'node', 'path'
    nodes: [],           // Tableau des Markers
    paths: [],           // Tableau des Polylines
    
    // Sélection actuelle
    selectedNode: null,
    nodeIsTemporary: false,
    
    selectedPath: null,
    pathStartNode: null, // Premier clic pour création chemin

    currentFloor: "0"
};

// Fonctions utilitaires pour manipuler le state proprement
export function removeNodeFromState(node) {
    state.nodes = state.nodes.filter(n => n !== node);
}

export function removePathFromState(path) {
    state.paths = state.paths.filter(p => p !== path);
}

export function resetState() {
    state.nodes = [];
    state.paths = [];
    state.selectedNode = null;
    state.selectedPath = null;
}