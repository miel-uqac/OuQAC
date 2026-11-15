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

test('E6 ETAGE_SANS_ESCALIER : couloir relié à un autre étage', () => {
    const g = baseGraph();
    g.paths.push(path('pX', 'C1', 'C2'));
    const issue = validateGraph(g).issues.find(i => i.code === 'ETAGE_SANS_ESCALIER');
    assert.deepEqual(issue.pathIds, ['pX']);
});

test('E7 ESCALIER_PMR : liaison d\'escalier entre étages marquée PMR', () => {
    const g = baseGraph();
    g.paths.find(p => p.id === 'p4').isPmr = true;
    const issue = validateGraph(g).issues.find(i => i.code === 'ESCALIER_PMR');
    assert.deepEqual(issue.pathIds, ['p4']);
});

test('E7 : un escalier relié à un couloir du même étage peut rester PMR', () => {
    // p2 (C1 - E1) est PMR dans le graphe de référence, qui est valide
    assert.ok(!codes(validateGraph(baseGraph())).includes('ESCALIER_PMR'));
});

test('E8 SALLE_INACCESSIBLE_PMR : salle joignable seulement par un chemin non PMR', () => {
    const g = baseGraph();
    g.paths.find(p => p.id === 'p8').isPmr = false;   // C2 - S2
    const issue = validateGraph(g).issues.find(i => i.code === 'SALLE_INACCESSIBLE_PMR');
    assert.deepEqual(issue.nodeIds, ['S2']);
});

test('E8 : une salle déjà isolée n\'est pas re-signalée en PMR', () => {
    const g = baseGraph();
    g.nodes.push(node('X', { type: 'salle' }));
    assert.ok(!codes(validateGraph(g)).includes('SALLE_INACCESSIBLE_PMR'));
});

// ==========================================
// AVERTISSEMENTS
// ==========================================

test('W1 SALLE_SANS_NOM : salle au nom vide ou fait d\'espaces', () => {
    const g = baseGraph();
    g.nodes.find(n => n.id === 'S1').name = '   ';
    const report = validateGraph(g);
    assert.ok(codes(report).includes('SALLE_SANS_NOM'));
    assert.equal(report.valid, true); // un avertissement ne rend pas le graphe invalide
});

test('W1 : un couloir sans nom est normal', () => {
    const g = baseGraph();
    g.nodes.find(n => n.id === 'C1').name = '';
    assert.ok(!codes(validateGraph(g)).includes('SALLE_SANS_NOM'));
});

test('W2 NOM_DOUBLON : deux nœuds portent le même nom', () => {
    const g = baseGraph();
    g.nodes.find(n => n.id === 'S2').name = 'S1 ';
    const issue = validateGraph(g).issues.find(i => i.code === 'NOM_DOUBLON');
    assert.deepEqual(issue.nodeIds.sort(), ['S1', 'S2']);
});

test('W3 DISTANCE_INVALIDE : distance vide, texte, nulle ou négative', () => {
    for (const distance of ['', 'abc', '0', -3, null, undefined]) {
        const g = baseGraph();
        g.paths.find(p => p.id === 'p1').distance = distance;
        assert.ok(codes(validateGraph(g)).includes('DISTANCE_INVALIDE'), `distance ${distance}`);
    }
});

test('W3 : une distance numérique en texte est acceptée', () => {
    const g = baseGraph();
    g.paths.find(p => p.id === 'p1').distance = '2.95';
    assert.ok(!codes(validateGraph(g)).includes('DISTANCE_INVALIDE'));
});

test('W4 LIAISON_ETAGE_MANQUANTE : ascenseur sans liaison vers un autre étage', () => {
    const g = baseGraph();
    g.nodes.push(node('A3', { type: 'ascenseur' }));
    g.paths.push(path('pX', 'C1', 'A3'));
    const issue = validateGraph(g).issues.find(i => i.code === 'LIAISON_ETAGE_MANQUANTE');
    assert.deepEqual(issue.nodeIds, ['A3']);
});

test('W5 DONNEE_INVALIDE : type inconnu, étage vide, coordonnées et PMR invalides, id en double', () => {
    const g = baseGraph();
    g.nodes.find(n => n.id === 'C1').type = 'cafeteria';
    g.nodes.find(n => n.id === 'C2').floor = '';
    g.nodes.find(n => n.id === 'S1').lat = 'abc';
    g.paths.find(p => p.id === 'p1').isPmr = 'oui';
    g.paths.find(p => p.id === 'p2').id = 'p1';
    const issues = validateGraph(g).issues.filter(i => i.code === 'DONNEE_INVALIDE');
    assert.equal(issues.length, 5);
    assert.ok(issues.every(i => i.severity === 'warning'));
});

test('les erreurs sont listées avant les avertissements', () => {
    const g = baseGraph();
    g.nodes.find(n => n.id === 'S1').name = '';     // avertissement
    g.nodes.push(node('X'));                        // erreur (isolé)
    const report = validateGraph(g);
    assert.deepEqual(report.issues.map(i => i.severity), ['error', 'warning']);
});

// ==========================================
// DONNÉES RÉELLES
// ==========================================

// Le graph.json actuel contient deux salles injoignables en mode PMR
// (V1-1010 et V1-1260 : on n'y accède que par des escaliers). C'est un vrai
// défaut des données, découvert par ce validateur le 2026-11-07, à corriger
// dans le panel admin. Ce test vérifie donc l'absence d'erreurs de structure
// (E1 à E7) et fige la liste des salles PMR connues pour repérer toute régression.
test('le graph.json du dépôt n\'a pas d\'erreur de structure', () => {
    const url = new URL('../graph/graph.json', import.meta.url);
    const data = JSON.parse(readFileSync(url, 'utf8'));
    const errors = validateGraph(data).issues.filter(i => i.severity === 'error');

    const structural = errors.filter(i => i.code !== 'SALLE_INACCESSIBLE_PMR');
    assert.deepEqual(structural, []);

    const pmrRooms = errors
        .filter(i => i.code === 'SALLE_INACCESSIBLE_PMR')
        .map(i => data.nodes.find(n => n.id === i.nodeIds[0]).name)
        .sort();
    assert.deepEqual(pmrRooms, ['V1-1010', 'V1-1260']);
});
