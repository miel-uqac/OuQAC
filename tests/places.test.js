/**
 * ====================================================================
 * APPLICATION : OùQAC - Tests
 * FICHIER : places.test.js
 * RÔLE : Tests unitaires de la logique des lieux courants
 * ====================================================================
 * * DESCRIPTION :
 * Vérifie shared/js/places.js : normalisation du texte, liste des lieux
 * courants, recherche par nom et par mot-clé, conversion des mots-clés et
 * champs écrits à l'export.
 * * LANCEMENT (depuis la racine du dépôt, Node 18 ou plus) :
 *   node --test tests/places.test.js
 **/

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    normalizeText, getCommonPlaces, matchesSearch,
    parseKeywords, formatKeywords, getPlaceFields
} from '../shared/js/places.js';

// Crée un nœud au format graph.json ; "extra" écrase les champs par défaut
function node(name, extra = {}) {
    return { id: `node_${name}`, name, type: 'salle', floor: '1', lat: 48.42, lng: -71.05, ...extra };
}

test('normalizeText retire accents, majuscules et espaces superflus', () => {
    assert.equal(normalizeText('  Bibliothèque  '), 'bibliotheque');
    assert.equal(normalizeText('Cafétéria   du  Pavillon'), 'cafeteria du pavillon');
    assert.equal(normalizeText(undefined), '');
});

test('getCommonPlaces garde les nœuds featured nommés, triés par nom', () => {
    const nodes = [
        node('Sécurité', { featured: true }),
        node('P1-4'),                                  // pas featured
        node('Bibliothèque', { featured: true }),
        node('   ', { featured: true }),                // sans nom
        node('Cafétéria', { featured: 'oui' }),         // featured mal formé
        node('cafétéria basse', { featured: true })
    ];
    assert.deepEqual(getCommonPlaces(nodes).map(n => n.name), ['Bibliothèque', 'cafétéria basse', 'Sécurité']);
});

test('getCommonPlaces ne modifie pas le tableau reçu et tolère une entrée invalide', () => {
    const nodes = [node('B', { featured: true }), node('A', { featured: true })];
    getCommonPlaces(nodes);
    assert.deepEqual(nodes.map(n => n.name), ['B', 'A']);
    assert.deepEqual(getCommonPlaces(null), []);
});

test('matchesSearch trouve par nom, sans tenir compte des accents ni de la casse', () => {
    const cafeteria = node('Cafétéria');
    assert.equal(matchesSearch(cafeteria, 'cafet'), true);
    assert.equal(matchesSearch(cafeteria, 'CAFÉ'), true);
    assert.equal(matchesSearch(cafeteria, 'biblio'), false);
});

test('matchesSearch trouve par mot-clé', () => {
    const cafeteria = node('Cafétéria', { keywords: ['manger', 'Repas'] });
    assert.equal(matchesSearch(cafeteria, 'repas'), true);
    assert.equal(matchesSearch(cafeteria, 'mang'), true);
    assert.equal(matchesSearch(node('Cafétéria'), 'repas'), false);
});

test('matchesSearch refuse une requête vide', () => {
    assert.equal(matchesSearch(node('Cafétéria'), '   '), false);
    assert.equal(matchesSearch(null, 'caf'), false);
});

test('parseKeywords découpe sur les virgules et ignore les vides', () => {
    assert.deepEqual(parseKeywords('manger, café ,, repas '), ['manger', 'café', 'repas']);
    assert.deepEqual(parseKeywords(''), []);
    assert.deepEqual(parseKeywords(undefined), []);
});

test('formatKeywords est l\'inverse de parseKeywords', () => {
    assert.equal(formatKeywords(['manger', 'café']), 'manger, café');
    assert.equal(formatKeywords(undefined), '');
    assert.deepEqual(parseKeywords(formatKeywords(['a', 'b c'])), ['a', 'b c']);
});

test('getPlaceFields ne garde que les champs utiles', () => {
    assert.deepEqual(getPlaceFields({ featured: false, category: '', keywords: [] }), {});
    assert.deepEqual(getPlaceFields(undefined), {});
    assert.deepEqual(
        getPlaceFields({ featured: true, category: 'restauration', keywords: ['manger'], name: 'X' }),
        { featured: true, category: 'restauration', keywords: ['manger'] }
    );
});

test('getPlaceFields copie les mots-clés au lieu de partager le tableau', () => {
    const keywords = ['manger'];
    const fields = getPlaceFields({ keywords });
    keywords.push('café');
    assert.deepEqual(fields.keywords, ['manger']);
});
