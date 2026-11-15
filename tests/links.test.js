/**
 * ====================================================================
 * APPLICATION : OùQAC - Tests
 * FICHIER : links.test.js
 * RÔLE : Tests unitaires des liens de destination (?vers= / ?depuis=)
 * ====================================================================
 * * DESCRIPTION :
 * Vérifie shared/js/links.js : lecture des paramètres de l'adresse,
 * recherche d'un nœud par son nom et construction d'une adresse.
 * * LANCEMENT (depuis la racine du dépôt, Node 18 ou plus) :
 *   node --test tests/links.test.js
 **/

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDestinationParams, findNodeByName, buildDestinationUrl } from '../shared/js/links.js';

// Crée un nœud au format graph.json ; "extra" écrase les champs par défaut
function node(name, extra = {}) {
    return { id: `node_${name}`, name, type: 'salle', floor: '1', lat: 48.42, lng: -71.05, ...extra };
}

test('parseDestinationParams lit depuis et vers', () => {
    assert.deepEqual(parseDestinationParams('?depuis=P1-1&vers=P2-1'), { depuis: 'P1-1', vers: 'P2-1' });
});

test('parseDestinationParams décode les espaces et accents', () => {
    assert.deepEqual(parseDestinationParams('?vers=Caf%C3%A9t%C3%A9ria%20du%20P'), { depuis: null, vers: 'Cafétéria du P' });
    assert.deepEqual(parseDestinationParams('?vers=Entr%C3%A9e+Est'), { depuis: null, vers: 'Entrée Est' });
});

test('parseDestinationParams ignore les paramètres absents ou vides', () => {
    assert.deepEqual(parseDestinationParams(''), { depuis: null, vers: null });
    assert.deepEqual(parseDestinationParams('?vers=%20%20&depuis='), { depuis: null, vers: null });
    assert.deepEqual(parseDestinationParams(undefined), { depuis: null, vers: null });
});

test('findNodeByName trouve un nœud sans tenir compte de la casse, des accents ni des espaces', () => {
    const nodes = [node('P1-1'), node('Cafétéria'), node('Entrée Est', { type: 'couloir' })];
    assert.equal(findNodeByName(nodes, 'p1-1').id, 'node_P1-1');
    assert.equal(findNodeByName(nodes, '  CAFETERIA ').id, 'node_Cafétéria');
    assert.equal(findNodeByName(nodes, 'entree est').id, 'node_Entrée Est');
});

test('findNodeByName exige un nom exact', () => {
    const nodes = [node('P1-40'), node('P1-4000')];
    assert.equal(findNodeByName(nodes, 'P1-4'), null);
    assert.equal(findNodeByName(nodes, 'P1-40').id, 'node_P1-40');
});

test('findNodeByName ignore les nœuds sans nom et les entrées invalides', () => {
    assert.equal(findNodeByName([node('')], ''), null);
    assert.equal(findNodeByName([node('')], '   '), null);
    assert.equal(findNodeByName(null, 'P1-1'), null);
});

test('buildDestinationUrl encode les noms et omet les paramètres absents', () => {
    const base = 'https://miel-uqac.github.io/OuQAC/communaute/';
    assert.equal(buildDestinationUrl(base, { vers: 'P1-4000' }), `${base}?vers=P1-4000`);
    assert.equal(
        buildDestinationUrl(base, { depuis: 'Entrée Est', vers: 'Cafétéria' }),
        `${base}?depuis=Entr%C3%A9e+Est&vers=Caf%C3%A9t%C3%A9ria`
    );
    assert.equal(buildDestinationUrl(base, {}), base);
});

test('buildDestinationUrl et parseDestinationParams sont inverses', () => {
    const url = buildDestinationUrl('http://localhost:8000/communaute/', { depuis: 'Entrée Est', vers: 'L\'Escale' });
    assert.deepEqual(parseDestinationParams(new URL(url).search), { depuis: 'Entrée Est', vers: 'L\'Escale' });
});
