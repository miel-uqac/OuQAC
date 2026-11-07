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
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { SHARED_CONFIG } from '../shared/js/config.js';

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

// ==========================================
// PRÉCACHE DU SERVICE WORKER
// ==========================================

// Exécute sw.js dans un bac à sable avec un faux "self" (le service worker
// n'existe pas dans Node) et renvoie la liste PRECACHE_URLS.
// L'expression finale "PRECACHE_URLS" est la valeur renvoyée par le script.
function loadPrecacheUrls() {
    const code = readFileSync(resolve(COMMUNAUTE, 'sw.js'), 'utf8');
    const fakeSelf = { addEventListener() {}, location: { origin: 'http://localhost' } };
    return vm.runInNewContext(`${code}\nPRECACHE_URLS`, { self: fakeSelf });
}

test('chaque fichier local du précache existe', () => {
    const localUrls = loadPrecacheUrls().filter(url => !url.startsWith('https://'));
    for (const url of localUrls) {
        // "./" désigne le dossier : le serveur renvoie alors son index.html
        const file = url === './' ? resolve(COMMUNAUTE, 'index.html') : resolve(COMMUNAUTE, url);
        assert.ok(existsSync(file), `fichier du précache introuvable : ${url}`);
    }
});

test('chaque plan déclaré dans shared/js/config.js est précaché', () => {
    // Les URL des plans sont relatives au panel communauté, comme le précache
    const urls = loadPrecacheUrls();
    for (const plan of SHARED_CONFIG.PLANS) {
        assert.ok(urls.includes(plan.url), `plan absent du précache : ${plan.url}`);
    }
});

test('chaque ressource CDN de la page est précachée', () => {
    // Si l'équipe change la version de Leaflet dans index.html sans mettre à
    // jour sw.js, la nouvelle version ne serait pas disponible hors ligne
    const html = readFileSync(resolve(COMMUNAUTE, 'index.html'), 'utf8');
    const cdnUrls = [...html.matchAll(/(?:href|src)="(https:\/\/[^"]+)"/g)].map(match => match[1]);
    const urls = loadPrecacheUrls();
    assert.ok(cdnUrls.length > 0);
    for (const url of cdnUrls) {
        assert.ok(urls.includes(url), `ressource CDN absente du précache : ${url}`);
    }
});

test('chaque fichier JavaScript du panel communauté est précaché', () => {
    // Un nouveau contrôleur oublié dans le précache casserait les imports hors ligne
    const files = readdirSync(resolve(COMMUNAUTE, 'js'), { recursive: true })
        .filter(file => file.endsWith('.js'))
        .map(file => `js/${file.split('\\').join('/')}`);
    const urls = loadPrecacheUrls();
    for (const file of files) {
        assert.ok(urls.includes(file), `fichier JS absent du précache : ${file}`);
    }
});
