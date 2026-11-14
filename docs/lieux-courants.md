# Lieux courants

La section « Lieux courants » du panel communauté (recherche) propose les endroits les plus demandés du campus : cafétéria, bibliothèque, accueil... Elle est **générée à partir du graphe** : un lieu y apparaît dès qu'un nœud est marqué « Lieu courant » dans le panel admin.

## Pourquoi ce changement

Auparavant, la liste était écrite en dur dans `communaute/index.html`. Au clic, l'application cherchait un nœud portant exactement ce nom ; aucun n'existait dans `graph/graph.json`, donc **le clic ne faisait rien, sans message**. Désormais, la liste vient des données : ce qui est affiché existe forcément dans le graphe, et l'ajouter ne demande plus de toucher au code (consigne de séparer les données du code et des plans).

## Marquer un lieu dans le panel admin

1. Ouvrir `admin/` (serveur local : `python3 -m http.server 8000`, puis `http://localhost:8000/admin/`).
2. Mode **Nœuds**, cliquer sur le nœud du lieu (ou le créer à l'emplacement de l'entrée du lieu).
3. Dans « Édition Nœud » :
   - donner un **nom** clair (c'est lui qui s'affiche : « Cafétéria », pas « P1-1234 ») ;
   - cocher **Lieu courant** ;
   - choisir une **Catégorie** ;
   - saisir des **Mots-clés** séparés par des virgules (ce que les gens taperaient : « manger, repas, café »).
4. La sauvegarde est automatique. Exporter avec **Sauvegarder** pour obtenir le `graph.json`.

Astuce : après avoir remplacé `graph.json`, recharger le panel communauté en forçant (Cmd+Maj+R / Ctrl+Maj+R), sinon le navigateur peut garder l'ancien fichier en cache.

## Format dans graph.json

Trois champs **facultatifs** s'ajoutent au nœud. Ils ne sont écrits que s'ils sont remplis : un nœud ordinaire ne change pas.

```json
{
    "id": "node_123", "name": "Cafétéria", "type": "salle", "floor": "1",
    "lat": 48.42, "lng": -71.05,
    "featured": true,
    "category": "restauration",
    "keywords": ["manger", "repas", "café"]
}
```

| Champ | Type | Rôle |
|---|---|---|
| `featured` | booléen | `true` : affiché dans « Lieux courants » |
| `category` | chaîne | Identifiant d'une catégorie ci-dessous |
| `keywords` | tableau de chaînes | Mots-clés pour la recherche |

## Catégories

Déclarées une seule fois dans `shared/js/config.js` (`PLACE_CATEGORIES`), utilisées par l'admin (menu) et le panel communauté (libellé affiché à côté du nom).

| Identifiant | Libellé |
|---|---|
| `restauration` | Restauration |
| `etudes` | Études |
| `services` | Services |
| `vie-etudiante` | Vie étudiante |
| `sport` | Sport |
| `securite` | Sécurité |
| `autre` | Autre |

Pour ajouter une catégorie : ajouter une ligne `{ id: "...", label: "..." }` dans `PLACE_CATEGORIES`. L'admin et le panel communauté la prennent en compte automatiquement.

## Recherche

Dans le panel communauté, la recherche propose les **salles** et les **lieux courants** dont le **nom ou un mot-clé** contient le texte saisi. Elle ignore les majuscules et les accents (« bibliotheque » trouve « Bibliothèque »). Les autres nœuds (couloirs, escaliers) ne sont pas proposés.

## Lieux à saisir

Voici les 13 lieux qui figuraient dans l'ancienne liste écrite en dur. Ils n'existent pas encore dans le graphe : à placer lors de la saisie des pavillons. Les catégories sont des suggestions.

| Lieu | Catégorie suggérée |
|---|---|
| Cafétéria | Restauration |
| Bibliothèque | Études |
| Le Cube | à préciser |
| Pavillon Sportif | Sport |
| Bureau du registraire | Services |
| Accueil | Services |
| BarUQAC | Restauration |
| Centre Social | Vie étudiante |
| Coopsco | Services |
| Mage-UQAC | Vie étudiante |
| L'Escale | à préciser |
| SAE | Services |
| Sécurité | Sécurité |

Tant qu'aucun lieu n'est marqué, la section affiche « Aucun lieu courant pour le moment. ».

## Fonctionnement technique

| Fichier | Rôle |
|---|---|
| `shared/js/places.js` | Logique pure, sans DOM ni Leaflet : `normalizeText`, `getCommonPlaces`, `matchesSearch`, `parseKeywords`, `formatKeywords`, `getPlaceFields` |
| `shared/js/config.js` | `PLACE_CATEGORIES` |
| `admin/js/controllers/nodeController.js` | Garde les champs dans `userData` à la création, à l'import et à chaque modification du formulaire |
| `admin/js/controllers/ioController.js` | Exporte les champs remplis (`getPlaceFields`) |
| `admin/js/views/ui.js` | Menu des catégories (`fillCategoryOptions`), remplissage du formulaire |
| `communaute/js/main.js` | Construit la liste une fois le graphe chargé (`loadGraphData()` est asynchrone), filtre la recherche avec `matchesSearch` |
| `communaute/js/views/ui.js` | `renderCommonPlaces` : un vrai `<button>` par lieu (clavier et lecteurs d'écran) |

## Lien avec la PWA

Le panel communauté importe maintenant `shared/js/places.js`. Une fois la PWA fusionnée (PR #3), ce fichier doit être ajouté à `PRECACHE_URLS` dans `communaute/sw.js`, avec une nouvelle `CACHE_VERSION`, sinon l'application ne s'ouvre plus hors ligne. Le test `tests/pwa.test.js` ne le détecte pas, car il ne parcourt que `communaute/js/`.

## Tests

Depuis la racine du dépôt (Node 18 ou plus, rien à installer) :

```bash
node --test tests/places.test.js
```
