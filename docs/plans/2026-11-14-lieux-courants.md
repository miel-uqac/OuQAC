# Plan d'implémentation : lieux courants pilotés par les données

> **Pour les agents :** sous-compétence requise : superpowers:executing-plans. Les étapes utilisent des cases à cocher (`- [ ]`).

**Objectif :** remplacer la liste « Lieux courants » écrite en dur (et inopérante) par une liste générée à partir de nœuds du graphe marqués dans le panel admin, et étendre la recherche aux mots-clés.

**Architecture :** un module pur `shared/js/places.js` (testé avec Node) contient la logique ; l'admin saisit trois champs facultatifs par nœud (`featured`, `category`, `keywords`) et les conserve à l'import/export ; le panel communauté génère la liste et filtre la recherche avec ce module.

**Technologies :** JavaScript ES6 (modules), Leaflet 1.9.4 (déjà présent), `node:test`.

**Spécification :** [docs/specs/2026-11-14-lieux-courants-design.md](../specs/2026-11-14-lieux-courants-design.md)

## Contraintes globales

- Branche `feat/lieux-courants` (issue de `projet-libre-8web101`). **Aucun commit, push ni fusion sur `main`.** Vérifier `git branch --show-current` avant chaque commit.
- Commits en français, préfixés (`feat:`, `test:`, `docs:`, `fix:`), **sans ligne `Co-Authored-By`** : les commits sont uniquement au nom de Malo.
- En-tête de commentaires au format du projet pour chaque nouveau fichier JS ; commentaires en français expliquant le « pourquoi ».
- Aucune dépendance npm. Tests : `node --test tests/places.test.js` depuis la racine.
- Ne pas ajouter de faux lieux dans `graph/graph.json` (la saisie revient à Nicolas et William). Toute modification de `graph.json` pour un test manuel est annulée avant commit (`git checkout -- graph/graph.json`).

## Structure des fichiers

| Fichier | Action | Responsabilité |
|---|---|---|
| `shared/js/places.js` | Créer | `normalizeText`, `getCommonPlaces`, `matchesSearch`, `parseKeywords`, `formatKeywords`, `getPlaceFields` |
| `tests/places.test.js` | Créer | Tests unitaires du module |
| `shared/js/config.js` | Modifier | `PLACE_CATEGORIES` (liste `{ id, label }`) |
| `admin/index.html`, `admin/style.css` | Modifier | Case, menu et champ dans « Édition Nœud » |
| `admin/js/views/ui.js` | Modifier | `fillCategoryOptions`, remplissage/vidage des champs |
| `admin/js/controllers/nodeController.js` | Modifier | Champs dans `userData` (création, import, mise à jour) |
| `admin/js/controllers/ioController.js` | Modifier | Export des champs utiles |
| `admin/js/main.js` | Modifier | Menu des catégories au démarrage, sauvegarde automatique |
| `communaute/index.html`, `communaute/style.css` | Modifier | Conteneur vide `#common-places-list`, style des boutons |
| `communaute/js/views/ui.js` | Modifier | `renderCommonPlaces(places, container, selectCallback)` |
| `communaute/js/main.js` | Modifier | Liste générée après chargement du graphe, recherche avec `matchesSearch` |
| `docs/lieux-courants.md` | Créer | Documentation |

---

### Tâche 1 : Module `places.js`, tests et catégories

**Fichiers :** créer `shared/js/places.js`, `tests/places.test.js` ; modifier `shared/js/config.js`.

**Produit :** les six fonctions exportées de `places.js` (signatures ci-dessous) et `SHARED_CONFIG.PLACE_CATEGORIES`.

- [ ] **Étape 1 : écrire les tests** dans `tests/places.test.js` (10 tests : normalisation, liste triée sans muter l'entrée, recherche par nom et par mot-clé, requête vide, conversion des mots-clés, `getPlaceFields` qui ne garde que les champs utiles et copie le tableau). Code : voir le fichier commité.
- [ ] **Étape 2 : lancer** `node --test tests/places.test.js`. Attendu : échec `ERR_MODULE_NOT_FOUND`.
- [ ] **Étape 3 : écrire `shared/js/places.js`** :

```js
export function normalizeText(text)        // "  Bibliothèque " -> "bibliotheque" ; non-chaîne -> ""
export function getCommonPlaces(nodes)     // featured === true et nom non vide, tri localeCompare 'fr' ; nouveau tableau
export function matchesSearch(node, query) // requête normalisée contenue dans le nom ou un mot-clé ; requête vide -> false
export function parseKeywords(text)        // "manger, café ,, repas" -> ["manger", "café", "repas"]
export function formatKeywords(keywords)   // ["manger", "café"] -> "manger, café" ; non-tableau -> ""
export function getPlaceFields(data)       // { featured: true?, category?, keywords? (copie) } seulement si utiles
```

- [ ] **Étape 4 : ajouter les catégories** dans `shared/js/config.js`, juste avant `// Plans des bâtiments par étages` :

```js
    // Catégories des lieux courants (champ "category" des nœuds, voir docs/lieux-courants.md)
    PLACE_CATEGORIES: [
        { id: "restauration", label: "Restauration" },
        { id: "etudes", label: "Études" },
        { id: "services", label: "Services" },
        { id: "vie-etudiante", label: "Vie étudiante" },
        { id: "sport", label: "Sport" },
        { id: "securite", label: "Sécurité" },
        { id: "autre", label: "Autre" }
    ],

```

- [ ] **Étape 5 : lancer les tests.** Attendu : `ℹ pass 10`, `ℹ fail 0`.
- [ ] **Étape 6 : committer** `feat: ajoute la logique des lieux courants (filtrage, recherche, mots-clés)`.

---

### Tâche 2 : Saisie dans le panel admin

**Fichiers :** `admin/index.html`, `admin/style.css`, `admin/js/views/ui.js`, `admin/js/controllers/nodeController.js`, `admin/js/controllers/ioController.js`, `admin/js/main.js`.

**Consomme :** `getPlaceFields`, `parseKeywords`, `formatKeywords`, `CONFIG.PLACE_CATEGORIES`.

- [ ] **Étape 1 : formulaire.** Dans `admin/index.html`, après le `form-group` du type de nœud (`<select id="node-type">`), ajouter :

```html
                    <div class="form-group">
                        <label><input type="checkbox" id="node-featured"> Lieu courant (affiché dans la liste du panel communauté)</label>
                    </div>
                    <div class="form-group">
                        <label>Catégorie</label>
                        <select id="node-category"></select>
                    </div>
                    <div class="form-group">
                        <label>Mots-clés (séparés par des virgules)</label>
                        <input type="text" id="node-keywords" placeholder="manger, café, repas">
                    </div>
```

Dans `admin/style.css`, sous `.form-group input, .form-group select { ... }` : `.form-group input[type="checkbox"] { width: auto; }`.

- [ ] **Étape 2 : vue.** Dans `admin/js/views/ui.js` : importer `formatKeywords` depuis `'../../../shared/js/places.js'` ; dans `fillNodeForm`, après la ligne `node-type`, remplir `node-featured` (`checked = featured === true`), `node-category` (`category || ''`), `node-keywords` (`formatKeywords(keywords)`) ; dans `clearNodeForm`, les vider ; ajouter après `clearNodeForm` :

```js
// Remplit le menu des catégories de lieux à partir de la configuration partagée
export function fillCategoryOptions(categories) { /* option "Aucune" (valeur "") puis une option par catégorie */ }
```

Mentionner ces fonctions dans l'en-tête du fichier.

- [ ] **Étape 3 : contrôleur des nœuds.** Dans `admin/js/controllers/nodeController.js` : importer `getPlaceFields, parseKeywords` ; `marker.userData = { id, name, type, floor, ...getPlaceFields(existingData) };` ; dans `updateCurrentNode`, après la ligne du type, lire `node-featured` (`checked`), `node-category` (`value`), `node-keywords` (`parseKeywords(value)`).
- [ ] **Étape 4 : export.** Dans `admin/js/controllers/ioController.js` : importer `getPlaceFields` ; dans `generateGraphData`, ajouter `...getPlaceFields(n.userData)` après `lng`.
- [ ] **Étape 5 : branchement.** Dans `admin/js/main.js` : importer `CONFIG` ; au début du `DOMContentLoaded`, `UI.fillCategoryOptions(CONFIG.PLACE_CATEGORIES);` ; après les écouteurs du type, sauvegarde automatique sur `change` de `node-featured` et `node-category`, et sur `input` de `node-keywords`.
- [ ] **Étape 6 : vérifier dans le navigateur** (`http://localhost:8123/admin/`) : aucune erreur console ; marquer un nœud (case, catégorie, mots-clés) ; recharger la page (localStorage) : valeurs conservées ; « Sauvegarder » : le JSON exporté contient les trois champs pour ce nœud seulement ; réimporter : valeurs conservées ; un nœud non marqué n'a aucun nouveau champ dans l'export.
- [ ] **Étape 7 : committer** `feat: permet de marquer un nœud comme lieu courant dans le panel admin`.

---

### Tâche 3 : Liste et recherche dans le panel communauté

**Fichiers :** `communaute/index.html`, `communaute/style.css`, `communaute/js/views/ui.js`, `communaute/js/main.js`.

**Consomme :** `getCommonPlaces`, `matchesSearch`, `CONFIG.PLACE_CATEGORIES` ; `loadGraphData()` (fonction `async`, renvoie une promesse) ; `selectLocation(node)` existante.

- [ ] **Étape 1 : HTML.** Dans `communaute/index.html`, remplacer le `<div class="location-list">` de `#common-places` et ses 13 `<div class="location-item">` par `<div class="location-list" id="common-places-list"></div>`.
- [ ] **Étape 2 : vue.** Dans `communaute/js/views/ui.js` : importer `CONFIG` depuis `'../config.js'` ; après `renderSearchResults`, ajouter `renderCommonPlaces(places, container, selectCallback)` : un `<button type="button" class="location-item place-button">` par lieu (nom + `<small class="place-category"> · Libellé</small>` si catégorie connue), clic → `selectCallback(place)` ; liste vide → `<p class="location-empty">Aucun lieu courant pour le moment.</p>`. Mettre à jour l'en-tête.
- [ ] **Étape 3 : styles** dans `communaute/style.css`, après `.location-item:last-child` : `.place-button` (bloc pleine largeur, texte à gauche, sans fond ni bordure sauf `border-bottom`, `font-family: inherit`), `.place-category` (normal, gris), `.location-empty` (padding 15px 0, gris).
- [ ] **Étape 4 : contrôleur.** Dans `communaute/js/main.js` :
  - importer `getCommonPlaces, matchesSearch` depuis `'../../shared/js/places.js'` ;
  - `const graphLoaded = loadGraphData();` au lieu de `loadGraphData();` ;
  - `const commonPlacesList = document.getElementById('common-places-list');` avec les autres éléments ;
  - recherche : `state.nodes.filter(n => (n.userData.type === 'salle' || n.userData.featured === true) && matchesSearch(n.userData, val))` ;
  - remplacer le bloc « Clic sur un lieu courant » par : `graphLoaded.then(() => UI.renderCommonPlaces(getCommonPlaces(state.nodes.map(n => n.userData)), commonPlacesList, place => { const node = state.nodes.find(n => n.userData.id === place.id); if (node) selectLocation(node); }))` ;
  - mettre à jour l'en-tête (moteur de recherche et lieux courants).
- [ ] **Étape 5 : vérifier dans le navigateur** (`http://localhost:8123/communaute/`) :
  1. avec le `graph.json` actuel : « Aucun lieu courant pour le moment. », aucune erreur console ;
  2. en marquant temporairement `P1-1` (`featured`, `category: "restauration"`, `keywords: ["manger"]`) dans `graph/graph.json` : le lieu apparaît avec « · Restauration », le clic ouvre l'itinéraire vers P1-1, la recherche « manger » et « p1-1 » le trouvent ;
  3. annuler : `git checkout -- graph/graph.json`.
- [ ] **Étape 6 : committer** `feat: génère les lieux courants du panel communauté à partir du graphe`.

---

### Tâche 4 : Documentation

- [ ] Créer `docs/lieux-courants.md` : problème corrigé, saisie dans l'admin, format JSON, tableau des catégories, recherche (nom + mots-clés, sans accents), liste des 13 lieux anciennement écrits en dur à saisir par l'équipe, lien PWA (`shared/js/places.js` à ajouter au précache après la PR #3), commande de test.
- [ ] Mettre à jour la spec : statut « implémentée », 13 lieux (et non 14), fonctions `parseKeywords`, `formatKeywords`, `getPlaceFields`, `fillCategoryOptions`.
- [ ] Committer `docs: documente les lieux courants`.

---

### Tâche 5 : Publication (accord de Malo à chaque étape)

- [ ] Pousser `feat/lieux-courants`.
- [ ] PR vers `projet-libre-8web101` (description relue par Malo, sans attribution automatique).
- [ ] Page Wiki « Lieux courants ».
- [ ] Prévenir Noé (panel communauté) et Nicolas et William (lieux à saisir).
