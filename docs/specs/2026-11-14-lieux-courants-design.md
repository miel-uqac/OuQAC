# Spécification : lieux courants pilotés par les données

- **Auteur :** Malo Besson
- **Date :** 2026-11-14
- **Branche :** `feat/lieux-courants` (issue de `projet-libre-8web101`)
- **Statut :** conception validée (option A), en attente de relecture

## 1. Contexte et problème

Le panel communauté affiche une liste « Lieux courants » (Cafétéria, Bibliothèque, Le Cube, Coopsco...). Cette liste est **écrite en dur** dans `communaute/index.html`. Au clic, `communaute/js/main.js` cherche un nœud du graphe portant exactement ce nom. Aucun nœud de `graph/graph.json` ne porte ces noms : **le clic ne fait rien, sans aucun message**.

Par ailleurs, la recherche ne trouve que les nœuds de type `salle`, uniquement par leur nom.

## 2. Objectif

Faire des lieux courants une **donnée du graphe**, saisie dans le panel admin, au lieu d'un texte figé dans le HTML :

- l'administrateur marque un nœud comme « lieu courant », lui donne une catégorie et des mots-clés ;
- le panel communauté génère la liste « Lieux courants » à partir de ces données ;
- la recherche trouve aussi ces lieux par leurs mots-clés (ex. « manger » → Cafétéria).

Cela applique la consigne du professeur : séparer les données du code et des plans.

### Hors périmètre

- Saisir les vrais lieux (positions de la cafétéria, de la bibliothèque...) : c'est la saisie du graphe, tâche de Nicolas et William. La documentation fournit la liste des lieux à saisir.
- Rendre les toilettes (`wc`) trouvables par la recherche : correction séparée.
- Contrôler ces nouveaux champs dans le validateur de graphe (PR #2, pas encore fusionnée) : amélioration possible plus tard.

## 3. Modèle de données

Trois champs **facultatifs** s'ajoutent aux nœuds de `graph.json` :

| Champ | Type | Sens |
|---|---|---|
| `featured` | booléen | `true` : le nœud apparaît dans « Lieux courants ». |
| `category` | chaîne | Identifiant de catégorie (liste fixe ci-dessous). |
| `keywords` | tableau de chaînes | Mots-clés de recherche, ex. `["manger", "café", "repas"]`. |

Exemple :

```json
{ "id": "node_123", "name": "Cafétéria", "type": "salle", "floor": "1", "lat": 48.42, "lng": -71.05,
  "featured": true, "category": "restauration", "keywords": ["manger", "repas", "café"] }
```

Rétrocompatibilité : un nœud sans ces champs se comporte comme aujourd'hui. À l'export, l'admin n'écrit ces champs que s'ils ont une valeur utile (`featured: true`, catégorie non vide, au moins un mot-clé), pour que `graph.json` ne grossisse pas inutilement.

### Catégories

Liste fixe, déclarée une seule fois dans `shared/js/config.js` (`PLACE_CATEGORIES`), utilisée par l'admin (menu déroulant) et par le panel communauté (libellé affiché) :

| Identifiant | Libellé |
|---|---|
| `restauration` | Restauration |
| `etudes` | Études |
| `services` | Services |
| `vie-etudiante` | Vie étudiante |
| `sport` | Sport |
| `securite` | Sécurité |
| `autre` | Autre |

## 4. Architecture

| Fichier | Action | Rôle |
|---|---|---|
| `shared/js/places.js` | Créer | Logique pure (sans DOM ni Leaflet) : `normalizeText(text)`, `getCommonPlaces(nodes)`, `matchesSearch(node, query)`. Testable avec Node. |
| `tests/places.test.js` | Créer | Tests unitaires de `places.js`. |
| `shared/js/config.js` | Modifier | Ajouter `PLACE_CATEGORIES`. |
| `communaute/index.html` | Modifier | Retirer les 14 `<div class="location-item">` écrits en dur ; garder un conteneur vide `#common-places-list`. |
| `communaute/js/main.js` | Modifier | Générer la liste des lieux courants au chargement du graphe ; utiliser `matchesSearch` dans la recherche. |
| `communaute/js/views/ui.js` | Modifier | `renderCommonPlaces(places, container, selectCallback)` : un vrai `<button>` par lieu, avec la catégorie ; message si la liste est vide. |
| `communaute/style.css` | Modifier | Style des boutons de lieux (même apparence que `.location-item`). |
| `admin/index.html` | Modifier | Dans « Édition Nœud » : case « Lieu courant », menu « Catégorie », champ « Mots-clés (séparés par des virgules) ». |
| `admin/js/controllers/nodeController.js` | Modifier | Conserver `featured`, `category`, `keywords` dans `userData` à la création/import ; les mettre à jour depuis le formulaire. |
| `admin/js/controllers/ioController.js` | Modifier | Exporter ces champs (seulement s'ils ont une valeur utile). |
| `admin/js/views/ui.js` | Modifier | Remplir et vider les nouveaux champs du formulaire. |
| `admin/js/main.js` | Modifier | Sauvegarde automatique à chaque modification des nouveaux champs (comme le nom et le type). |

Le panel communauté conserve déjà tout l'objet du nœud dans `marker.userData` (`communaute/js/controllers/nodeController.js`) : les nouveaux champs y arrivent sans modification.

### Fonctions de `shared/js/places.js`

- `normalizeText(text)` : minuscules, sans accents, espaces en trop retirés. `"  Cafétéria "` → `"cafeteria"`. Rend la recherche tolérante (« bibliotheque » trouve « Bibliothèque »).
- `getCommonPlaces(nodes)` : reçoit des objets nœuds (`userData`), garde ceux qui ont `featured === true` et un nom non vide, les trie par nom (ordre alphabétique français). Renvoie un nouveau tableau.
- `matchesSearch(node, query)` : `true` si la requête normalisée est contenue dans le nom normalisé, ou dans un des mots-clés normalisés. Requête vide → `false`.

### Recherche dans le panel communauté

Un nœud est proposé s'il correspond à la requête (`matchesSearch`) **et** s'il est de type `salle` **ou** marqué `featured`. Un lieu courant peut ainsi être de n'importe quel type (une entrée, par exemple), sans élargir la recherche à tous les couloirs.

## 5. Interface

**Panel communauté :** la section « Lieux courants » liste les lieux marqués, chacun sur une ligne avec son nom et sa catégorie en petit (ex. « Cafétéria · Restauration »). Un clic lance la même sélection qu'aujourd'hui (`selectLocation`). Si aucun lieu n'est marqué, la section affiche « Aucun lieu courant pour le moment. » au lieu de boutons inopérants.

**Panel admin :** trois champs sous « Type » dans « Édition Nœud ». La sauvegarde est automatique, comme pour le nom.

## 6. Points d'attention

- **PWA (PR #3) :** le nouveau fichier `shared/js/places.js` est importé par le panel communauté. Une fois la PR #3 fusionnée, il faudra l'ajouter à `PRECACHE_URLS` dans `communaute/sw.js` et incrémenter `CACHE_VERSION`, sinon l'application ne s'ouvrira plus hors ligne. Le test `tests/pwa.test.js` ne le détecte pas, car il ne parcourt que `communaute/js/`. À traiter lors de la repasse finale sur la PWA.
- **Conflits possibles avec la PR #2 :** elle modifie aussi `admin/js/controllers/ioController.js`, `admin/js/main.js`, `admin/js/views/ui.js` et `admin/index.html`, mais à d'autres endroits. Les conflits éventuels seront résolus après la fusion de la #2.
- **Panel communauté = zone de Noé :** prévenir Noé de ces modifications (recherche et liste des lieux) pour éviter les conflits avec la sélection d'une salle par clic sur la carte.

## 7. Tests

- `node --test tests/places.test.js` : normalisation (accents, casse, espaces), filtrage et tri des lieux courants, recherche par nom et par mot-clé, cas limites (champs absents, requête vide).
- Vérification manuelle :
  1. Admin : marquer un nœud comme lieu courant avec catégorie et mots-clés, exporter, réimporter : les champs sont conservés.
  2. Communauté (avec un `graph.json` de test local, non commité) : le lieu apparaît dans « Lieux courants », le clic le sélectionne, la recherche par mot-clé le trouve.
  3. Communauté avec le `graph.json` actuel : le message « Aucun lieu courant pour le moment. » s'affiche.

## 8. Documentation

- `docs/lieux-courants.md` : comment marquer un lieu dans l'admin, format JSON, catégories, liste des 14 lieux anciennement écrits en dur, à saisir par l'équipe.
- Description de PR détaillée, sans attribution automatique.
- Page Wiki après accord de Malo.
