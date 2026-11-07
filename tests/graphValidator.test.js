/**
 * ====================================================================
 * APPLICATION : OùQAC - Tests
 * FICHIER : graphValidator.test.js
 * RÔLE : Tests unitaires du validateur de graphe
 * ====================================================================
 * * DESCRIPTION :
 * Vérifie chaque règle de shared/js/graphValidator.js sur de petits graphes
 * construits à la main : un cas qui déclenche la règle, un cas proche qui ne
 * la déclenche pas. Vérifie aussi que le vrai graph/graph.json n'a pas
 * d'erreur de structure.
 * * LANCEMENT (depuis la racine du dépôt, Node 18 ou plus) :
 *   node --test tests/graphValidator.test.js
 * Aucune dépendance à installer : node:test et node:assert sont intégrés à Node.
 **/

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateGraph } from '../shared/js/graphValidator.js';

// ==========================================
// OUTILS DE CONSTRUCTION DE GRAPHES
// ==========================================

// Crée un nœud valide ; "extra" écrase les champs par défaut
function node(id, extra = {}) {
    return { id, name: id, type: 'couloir', floor: '1', lat: 48.42, lng: -71.05, ...extra };
}

// Crée un chemin valide entre a et b
function path(id, a, b, extra = {}) {
    return { id, startNode: a, endNode: b, type: 'indoor', distance: '5', isPmr: true, ...extra };
}

// Graphe de référence sans aucun problème :
// étage 1 : S1 - C1 - E1 (escalier) et C1 - A1 (ascenseur)
// étage 2 : E2 - C2 - A2, C2 - S2
// liaisons : E1-E2 (non PMR), A1-A2 (PMR)
function baseGraph() {
    return {
        nodes: [
            node('S1', { type: 'salle' }),
            node('C1'),
            node('E1', { type: 'escalier' }),
            node('A1', { type: 'ascenseur' }),
            node('E2', { type: 'escalier', floor: '2' }),
            node('A2', { type: 'ascenseur', floor: '2' }),
            node('C2', { floor: '2' }),
            node('S2', { type: 'salle', floor: '2' })
        ],
        paths: [
            path('p1', 'S1', 'C1'),
            path('p2', 'C1', 'E1'),
            path('p3', 'C1', 'A1'),
            path('p4', 'E1', 'E2', { isPmr: false }),
            path('p5', 'A1', 'A2'),
            path('p6', 'E2', 'C2'),
            path('p7', 'A2', 'C2'),
            path('p8', 'C2', 'S2')
        ]
    };
}

// Codes des problèmes d'un rapport, pour des assertions lisibles
function codes(report) {
    return report.issues.map(i => i.code);
}

// ==========================================
// CAS GÉNÉRAUX
// ==========================================

test('le graphe de référence est valide, sans avertissement', () => {
    const report = validateGraph(baseGraph());
    assert.deepEqual(report.issues, []);
    assert.equal(report.valid, true);
    assert.equal(report.errorCount, 0);
    assert.equal(report.warningCount, 0);
});

test('des données inexploitables donnent une seule erreur, sans exception', () => {
    for (const data of [null, undefined, {}, { nodes: [] }, { nodes: 'x', paths: [] }]) {
        const report = validateGraph(data);
        assert.equal(report.valid, false);
        assert.deepEqual(codes(report), ['DONNEE_INVALIDE']);
    }
});

test('un graphe vide est valide', () => {
    assert.equal(validateGraph({ nodes: [], paths: [] }).valid, true);
});

// ==========================================
// ERREURS
// ==========================================

test('E1 CHEMIN_NOEUD_INCONNU : chemin vers un nœud supprimé', () => {
    const g = baseGraph();
    g.paths.push(path('pX', 'C1', 'FANTOME'));
    const issue = validateGraph(g).issues.find(i => i.code === 'CHEMIN_NOEUD_INCONNU');
    assert.ok(issue);
    assert.deepEqual(issue.pathIds, ['pX']);
    assert.deepEqual(issue.nodeIds, ['C1']);
});

test('E2 CHEMIN_BOUCLE : chemin d\'un nœud vers lui-même', () => {
    const g = baseGraph();
    g.paths.push(path('pX', 'C1', 'C1'));
    assert.ok(codes(validateGraph(g)).includes('CHEMIN_BOUCLE'));
});

test('E3 CHEMIN_DOUBLON : deux chemins entre les mêmes nœuds, dans les deux sens', () => {
    const g = baseGraph();
    g.paths.push(path('pX', 'C1', 'S1'));
    const issue = validateGraph(g).issues.find(i => i.code === 'CHEMIN_DOUBLON');
    assert.ok(issue);
    assert.deepEqual(issue.pathIds.sort(), ['p1', 'pX']);
});

test('E4 NOEUD_ISOLE : nœud sans chemin', () => {
    const g = baseGraph();
    g.nodes.push(node('X'));
    const issue = validateGraph(g).issues.find(i => i.code === 'NOEUD_ISOLE');
    assert.deepEqual(issue.nodeIds, ['X']);
});

test('E4 NOEUD_ISOLE : un nœud relié seulement par une boucle reste isolé', () => {
    const g = baseGraph();
    g.nodes.push(node('X'));
    g.paths.push(path('pX', 'X', 'X'));
    assert.ok(codes(validateGraph(g)).includes('NOEUD_ISOLE'));
});

test('E5 GRAPHE_MORCELE : groupe de nœuds coupé du réseau principal', () => {
    const g = baseGraph();
    g.nodes.push(node('X'), node('Y'));
    g.paths.push(path('pX', 'X', 'Y'));
    const issues = validateGraph(g).issues.filter(i => i.code === 'GRAPHE_MORCELE');
    assert.equal(issues.length, 1);
    assert.deepEqual(issues[0].nodeIds.sort(), ['X', 'Y']);
});

test('E5 : un nœud isolé n\'est pas signalé une seconde fois comme morceau', () => {
    const g = baseGraph();
    g.nodes.push(node('X'));
    assert.ok(!codes(validateGraph(g)).includes('GRAPHE_MORCELE'));
});
