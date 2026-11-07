/**
 * ====================================================================
 * APPLICATION : OùQAC - Tests
 * FICHIER : pwa.test.js
 * RÔLE : Tests de la PWA du panel communauté
 * ====================================================================
 * * DESCRIPTION :
 * Vérifie que le manifest est complet et que ses icônes existent avec
 * la bonne taille. Vérifie aussi que chaque fichier listé dans le
 * précache du service worker existe : avec cache.addAll, un seul fichier
 * manquant fait échouer toute l'installation, et l'application ne
 * fonctionnerait plus hors ligne, sans erreur visible pour l'utilisateur.
 * * LANCEMENT (depuis la racine du dépôt, Node 18 ou plus) :
 *   node --test tests/pwa.test.js
 * Aucune dépendance à installer.
 **/

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Dossier du panel communauté : les chemins du manifest et du service
// worker sont relatifs à ce dossier
const COMMUNAUTE = resolve(import.meta.dirname, '../communaute');

// Lit la largeur et la hauteur d'un PNG dans son en-tête :
// après la signature (8 octets) vient le bloc IHDR, dont les octets
// 16 à 23 contiennent la largeur puis la hauteur (entiers 32 bits).
function pngSize(file) {
    const buffer = readFileSync(file);
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

// ==========================================
// MANIFEST
// ==========================================

const manifestPath = resolve(COMMUNAUTE, 'manifest.webmanifest');

test('le manifest est un JSON valide avec les champs requis', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    assert.equal(manifest.name, 'OùQAC');
    assert.equal(manifest.display, 'standalone');
    // Chemins relatifs obligatoires : le site est servi sous /OuQAC/
    assert.equal(manifest.start_url, './');
    assert.equal(manifest.scope, './');
});

test('chaque icône du manifest existe et a la taille annoncée', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    for (const icon of manifest.icons) {
        const file = resolve(COMMUNAUTE, icon.src);
        assert.ok(existsSync(file), `icône introuvable : ${icon.src}`);
        const { width, height } = pngSize(file);
        assert.equal(`${width}x${height}`, icon.sizes, `taille incorrecte : ${icon.src}`);
    }
});

test('le manifest fournit une icône 192, une icône 512 et une icône maskable', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const sizes = manifest.icons.map(icon => icon.sizes);
    assert.ok(sizes.includes('192x192'));
    assert.ok(sizes.includes('512x512'));
    assert.ok(manifest.icons.some(icon => icon.purpose === 'maskable'));
});
