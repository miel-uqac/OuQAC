/**
 * ====================================================================
 * APPLICATION : OùQAC - Panel Communauté
 * FICHIER : sw.js
 * RÔLE : Service worker (fonctionnement hors ligne)
 * ====================================================================
 * * DESCRIPTION :
 * Un service worker est un script que le navigateur exécute à part de la
 * page. Il se place entre la page et le réseau : chaque requête émise par
 * une page qu'il contrôle passe par son événement "fetch", et il peut
 * répondre avec une copie gardée dans le Cache Storage.
 * Placé dans communaute/, il ne contrôle que le panel communauté (sa
 * "portée"), mais il intercepte aussi les requêtes de ces pages vers
 * ../graph, ../plans et les CDN.
 * * FONCTIONS PRINCIPALES :
 * - install : télécharge et range en cache tous les fichiers de PRECACHE_URLS.
 * - activate : supprime les caches des versions précédentes.
 * - fetch : répond "cache d'abord" (plans SVG, CDN) ou "réseau d'abord"
 * (reste du site : HTML, JS, CSS, graph.json).
 * * FLUX DE DONNÉES / TRAVAIL :
 * Enregistré par js/pwa.js. Pour publier un plan modifié ou changer la liste
 * PRECACHE_URLS, incrémenter CACHE_VERSION : le navigateur détecte que sw.js
 * a changé, installe la nouvelle version et purge l'ancienne (docs/pwa.md).
 * ====================================================================
 */

// Toutes les versions du cache commencent par ce préfixe : à l'activation,
// on ne supprime que nos propres caches
const CACHE_PREFIX = 'ouqac-';

// À incrémenter (v2, v3...) quand un plan SVG change ou quand PRECACHE_URLS change
const CACHE_VERSION = 'ouqac-v1';

// Fichiers téléchargés à l'installation. Les chemins sont relatifs au dossier
// de sw.js (communaute/), ce qui fonctionne aussi sous /OuQAC/ sur GitHub Pages.
// tests/pwa.test.js vérifie que chaque fichier local existe.
const PRECACHE_URLS = [
    // Page, style et identité de l'application
    './',
    'style.css',
    'manifest.webmanifest',
    'icons/icon-192.png',
    'icons/icon-512.png',
    'icons/icon-maskable-512.png',

    // JavaScript du panel (modules ES6 importés par main.js)
    'js/main.js',
    'js/config.js',
    'js/map.js',
    'js/state.js',
    'js/pwa.js',
    'js/controllers/dataController.js',
    'js/controllers/nodeController.js',
    'js/controllers/pathController.js',
    'js/controllers/routeController.js',
    'js/views/ui.js',
    '../shared/js/config.js',
    '../shared/js/map.js',

    // Données de navigation
    '../graph/graph.json',

    // Plans des pavillons (déclarés dans shared/js/config.js)
    '../plans/pp/pp_nv0.svg',
    '../plans/pp/pp_nv1.svg',
    '../plans/pp/pp_nv2.svg',
    '../plans/pp/pp_nv3.svg',
    '../plans/pp/pp_nv4.svg',
    '../plans/ph/ph_nv0.svg',
    '../plans/ph/ph_nv1.svg',
    '../plans/ph/ph_nv2.svg',
    '../plans/pss/pss_nv1.svg',
    '../plans/pss/pss_nv2.svg',

    // Librairies externes (mêmes URL que dans index.html)
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    'https://cdn.jsdelivr.net/npm/leaflet-imageoverlay-rotated@0.1.4/Leaflet.ImageOverlay.Rotated.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    // Polices chargées par all.min.css (icônes "solid" et "regular" utilisées par le panel)
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-regular-400.woff2'
];

// Domaines des CDN : leurs URL contiennent un numéro de version, leur contenu
// ne change donc jamais, d'où la stratégie "cache d'abord"
const CDN_HOSTS = ['unpkg.com', 'cdn.jsdelivr.net', 'cdnjs.cloudflare.com'];

// ==========================================
// CYCLE DE VIE
// ==========================================

self.addEventListener('install', (event) => {
    // waitUntil : l'installation ne se termine qu'une fois la promesse résolue.
    // addAll est "tout ou rien" : si un seul fichier échoue, l'installation
    // échoue et l'ancienne version (s'il y en a une) reste en place.
    event.waitUntil(
        caches.open(CACHE_VERSION)
            .then((cache) => cache.addAll(PRECACHE_URLS.map(toPrecacheRequest)))
            // Active la nouvelle version sans attendre la fermeture des onglets
            .then(() => self.skipWaiting())
    );
});

// mode "cors" : les CDN renvoient Access-Control-Allow-Origin, on obtient une
// vraie réponse (statut 200) et non une réponse "opaque" (statut 0) que
// addAll refuserait.
// cache "no-cache" : on revalide auprès du serveur au lieu de reprendre une
// copie périmée du cache HTTP du navigateur.
function toPrecacheRequest(url) {
    return new Request(url, { mode: 'cors', cache: 'no-cache' });
}

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys
                    .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_VERSION)
                    .map((key) => caches.delete(key))
            ))
            // Prend le contrôle de la page déjà ouverte, sans attendre un rechargement
            .then(() => self.clients.claim())
    );
});

// ==========================================
// INTERCEPTION DES REQUÊTES
// ==========================================

self.addEventListener('fetch', (event) => {
    const request = event.request;

    // Seules les lectures (GET) peuvent être servies depuis le cache
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    const sameOrigin = url.origin === self.location.origin;

    if ((sameOrigin && url.pathname.includes('/plans/')) || CDN_HOSTS.includes(url.hostname)) {
        event.respondWith(cacheFirst(request));
    } else if (sameOrigin) {
        event.respondWith(networkFirst(request));
    }
    // Sinon (tuiles OpenStreetMap, autres domaines) : pas de respondWith,
    // le navigateur fait la requête normalement, sans cache hors ligne.
});

// Cache d'abord : réponse immédiate si le fichier est en cache, réseau sinon
async function cacheFirst(request) {
    // ignoreVary : la requête de la page (sans en-tête Origin) doit retrouver
    // la copie précachée en mode cors, même si le CDN répond "Vary: Origin"
    const cached = await caches.match(request, { ignoreVary: true });
    if (cached) return cached;

    const response = await fetch(request);
    await putInCache(request, response);
    return response;
}

// Réseau d'abord : version la plus récente en ligne, copie du cache hors ligne
async function networkFirst(request) {
    try {
        const response = await fetch(request);
        await putInCache(request, response);
        return response;
    } catch (error) {
        // fetch échoue (exception) quand le réseau est coupé
        const cached = await caches.match(request, { ignoreVary: true });
        if (cached) return cached;

        // Ouverture de la page par une autre URL (ex. communaute/index.html) :
        // on sert la page précachée "./"
        if (request.mode === 'navigate') {
            const page = await caches.match('./');
            if (page) return page;
        }
        throw error;
    }
}

// N'enregistre que les réponses valides (statut 200 à 299), pour ne jamais
// remplacer un fichier par une page d'erreur 404
async function putInCache(request, response) {
    if (!response.ok) return;
    const cache = await caches.open(CACHE_VERSION);
    // clone() : le corps d'une réponse ne se lit qu'une fois, une copie va
    // au cache et l'originale à la page
    await cache.put(request, response.clone());
}
