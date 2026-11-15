/**
 * ====================================================================
 * APPLICATION : OùQAC - Partagé (Admin & Communauté)
 * FICHIER : links.js
 * RÔLE : Liens de destination (?depuis=... & ?vers=...)
 * ====================================================================
 * * DESCRIPTION :
 * Une adresse comme communaute/?depuis=Entrée%20Est&vers=P1-4000 ouvre le
 * panel communauté avec le départ et la destination déjà choisis. C'est la
 * base des QR codes et du partage d'un trajet. Ce fichier contient la
 * logique de ces liens. Il ne dépend ni du DOM ni de Leaflet : il travaille
 * sur des chaînes et sur les objets nœuds bruts (format graph.json), ce qui
 * le rend testable avec Node (voir tests/links.test.js).
 * * FONCTIONS PRINCIPALES :
 * - parseDestinationParams(search) : Lit "depuis" et "vers" dans la partie
 * requête de l'adresse (window.location.search).
 * - findNodeByName(nodes, name) : Retrouve le nœud qui porte exactement ce
 * nom, sans tenir compte de la casse, des accents ni des espaces en trop.
 * - buildDestinationUrl(baseUrl, { depuis, vers }) : Fabrique une adresse
 * correctement encodée (pour la documentation et les futurs QR codes).
 * * FLUX DE DONNÉES / TRAVAIL :
 * 1. communaute/js/main.js attend le chargement du graphe.
 * 2. Il appelle parseDestinationParams(window.location.search).
 * 3. Pour chaque nom, findNodeByName donne le nœud, puis main.js le
 * sélectionne comme départ ou destination.
 * * RÉFÉRENCE : docs/liens-destination.md
 **/

import { normalizeText } from './places.js';

// Lit les paramètres "depuis" et "vers" ; absent ou vide -> null.
// URLSearchParams décode déjà %20, + et les accents encodés (%C3%A9...).
export function parseDestinationParams(search) {
    const params = new URLSearchParams(typeof search === 'string' ? search : '');
    const read = (key) => {
        const value = (params.get(key) || '').trim();
        return value === '' ? null : value;
    };
    return { depuis: read('depuis'), vers: read('vers') };
}

// Nœud dont le nom correspond exactement (après normalisation), sinon null.
// Comparaison exacte : "P1-4" ne doit pas ouvrir "P1-40" par erreur.
export function findNodeByName(nodes, name) {
    const target = normalizeText(name);
    if (target === '' || !Array.isArray(nodes)) return null;
    return nodes.find(node => node && normalizeText(node.name) === target) || null;
}

// Adresse avec les paramètres présents, encodés (espaces, accents, apostrophes)
export function buildDestinationUrl(baseUrl, { depuis, vers } = {}) {
    const params = new URLSearchParams();
    if (depuis) params.set('depuis', depuis);
    if (vers) params.set('vers', vers);
    const query = params.toString();
    return query === '' ? baseUrl : `${baseUrl}?${query}`;
}
