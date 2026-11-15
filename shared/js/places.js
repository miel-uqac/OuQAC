/**
 * ====================================================================
 * APPLICATION : OùQAC - Partagé (Admin & Communauté)
 * FICHIER : places.js
 * RÔLE : Logique des lieux courants (filtrage, recherche, mots-clés)
 * ====================================================================
 * * DESCRIPTION :
 * Un nœud du graphe peut être marqué comme "lieu courant" grâce à trois
 * champs facultatifs : featured (affiché dans la liste), category
 * (identifiant de PLACE_CATEGORIES) et keywords (mots-clés de recherche).
 * Ce fichier regroupe toute la logique qui les exploite. Il ne dépend ni du
 * DOM ni de Leaflet : il travaille sur les objets nœuds bruts (format
 * graph.json / userData), ce qui le rend testable avec Node
 * (voir tests/places.test.js).
 * * FONCTIONS PRINCIPALES :
 * - normalizeText(text) : Minuscules, sans accents ni espaces superflus,
 * pour comparer "Bibliothèque" et "bibliotheque".
 * - getCommonPlaces(nodes) : Les nœuds marqués featured, triés par nom.
 * - matchesSearch(node, query) : La requête est-elle dans le nom ou un mot-clé ?
 * - isSearchable(node) : Le nœud peut-il être proposé par la recherche ?
 * (salles, toilettes et lieux courants ; pas les couloirs ni les escaliers)
 * - parseKeywords(text) & formatKeywords(keywords) : Conversion entre le champ
 * texte de l'admin ("manger, café") et le tableau stocké dans graph.json.
 * - getPlaceFields(data) : Ne garde que les champs de lieu utiles, pour que
 * l'export de l'admin n'alourdisse pas graph.json.
 * * FLUX DE DONNÉES / TRAVAIL :
 * 1. Admin : le formulaire "Édition Nœud" utilise parseKeywords/formatKeywords,
 * et l'export utilise getPlaceFields.
 * 2. Communauté : au chargement du graphe, main.js appelle getCommonPlaces pour
 * construire la liste, puis matchesSearch à chaque frappe dans la recherche.
 * * RÉFÉRENCE : docs/lieux-courants.md
 **/

// Minuscules, sans accents, espaces internes réduits à un seul
export function normalizeText(text) {
    if (typeof text !== 'string') return '';
    return text
        .normalize('NFD')                  // "é" devient "e" + accent combinant
        .replace(/[̀-ͯ]/g, '')   // on retire les accents combinants
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ');
}

// Lieux courants : nœuds featured avec un nom, triés par ordre alphabétique français.
// filter() renvoie un nouveau tableau : le tableau reçu n'est pas modifié par le tri.
export function getCommonPlaces(nodes) {
    if (!Array.isArray(nodes)) return [];
    return nodes
        .filter(node => node && node.featured === true && typeof node.name === 'string' && node.name.trim() !== '')
        .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
}

// Vrai si la requête apparaît dans le nom ou dans un des mots-clés du nœud
export function matchesSearch(node, query) {
    const q = normalizeText(query);
    if (q === '' || !node) return false;
    if (normalizeText(node.name).includes(q)) return true;
    return Array.isArray(node.keywords) && node.keywords.some(keyword => normalizeText(keyword).includes(q));
}

// Types de nœuds que l'on peut chercher comme destination
const SEARCHABLE_TYPES = ['salle', 'wc'];

// Vrai pour une destination possible : salle, toilettes, ou tout nœud marqué lieu courant
export function isSearchable(node) {
    if (!node) return false;
    return SEARCHABLE_TYPES.includes(node.type) || node.featured === true;
}

// "manger, café ,, repas" -> ["manger", "café", "repas"]
export function parseKeywords(text) {
    if (typeof text !== 'string') return [];
    return text.split(',').map(keyword => keyword.trim()).filter(keyword => keyword !== '');
}

// ["manger", "café"] -> "manger, café"
export function formatKeywords(keywords) {
    return Array.isArray(keywords) ? keywords.join(', ') : '';
}

// Champs de lieu à écrire dans graph.json : seulement ceux qui ont une valeur utile
export function getPlaceFields(data) {
    const fields = {};
    if (!data) return fields;
    if (data.featured === true) fields.featured = true;
    if (typeof data.category === 'string' && data.category !== '') fields.category = data.category;
    if (Array.isArray(data.keywords) && data.keywords.length > 0) fields.keywords = [...data.keywords];
    return fields;
}
