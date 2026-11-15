## Résumé

Trois améliorations du panel communauté et de l'admin, regroupées dans une seule branche :

1. **Liens de destination** : `communaute/?vers=P2-1` ou `communaute/?depuis=P1-1&vers=P2-1` ouvre l'application avec l'itinéraire déjà rempli. C'est la base des futurs QR codes (entrées, affiches) et du partage d'un trajet.
2. **Toilettes trouvables** : la recherche ne proposait que les nœuds de type « salle » ; les toilettes (`wc`) étaient introuvables.
3. **On parle en niveaux** : l'interface affichait « Étage N+1 » alors que les instructions affichaient la valeur brute. Pour la salle V1-1010, le menu disait « Étage 2 » et l'itinéraire « jusqu'à l'étage 1 ». Tout est maintenant en **niveaux**, comme les plans et les codes de salle de l'UQAC.

> **PR empilée sur la #4** (lieux courants) : la correction des toilettes s'appuie sur la recherche réécrite dans la #4. La base de cette PR est donc `feat/lieux-courants` ; une fois la #4 fusionnée, GitHub la redirigera vers `projet-libre-8web101`.

## Ce qui change

**Liens de destination**
- `shared/js/links.js` (nouveau, logique pure) : `parseDestinationParams`, `findNodeByName` (nom exact, sans casse ni accents), `buildDestinationUrl` (adresse encodée). 8 tests dans `tests/links.test.js`.
- `communaute/js/main.js` : une fois le graphe chargé, remplit le départ puis la destination et ouvre le panneau Itinéraire. Le guidage n'est jamais lancé tout seul.
- Nom introuvable : bandeau « Lieu introuvable : … » de 6 secondes, `role="status"` (lu par les lecteurs d'écran).

**Toilettes**
- Nouvelle règle `isSearchable` dans `shared/js/places.js` : salles, toilettes et lieux courants (pas les couloirs ni les escaliers). 2 tests.

**Niveaux**
- Admin : sélecteur « Niveau 0 » à « Niveau 7 », liste des nœuds et raccourcis en « Niveau N ».
- Communauté : boutons 0 à 7 annoncés « Niveau N » ; instruction « Prendre l'ascenseur jusqu'au niveau N ».
- Les virages disent « Tourner à gauche **près de** P1-C1 » au lieu de « au niveau de », devenu ambigu.
- `docs/convention-niveaux.md` explique la règle (premier chiffre du code de salle = niveau).

## À savoir

- **Noé :** deux textes de `communaute/js/controllers/routeController.js` changent (« jusqu'au niveau », « près de »), ainsi que la recherche du panel communauté.
- **Ancienne convention :** l'affichage « Étage N+1 » venait d'un choix volontaire de l'auteur original (commit `83d749b`). Il est remplacé par les niveaux pour que l'application dise la même chose que les plans et les portes.
- **PWA (PR #3) :** après sa fusion, ajouter `../shared/js/places.js` et `../shared/js/links.js` à `PRECACHE_URLS` dans `communaute/sw.js` et incrémenter `CACHE_VERSION`.
- Les messages du validateur passent aussi en niveaux, mais dans la PR #2 (sa propre branche).
- Fusion vérifiée sans conflit avec `feat/validation-graphe` (#2) et `feat/pwa` (#3).

## Comment tester

1. Tests unitaires, depuis la racine du dépôt (Node 18+, rien à installer) :
   ```bash
   node --test tests/places.test.js tests/links.test.js
   ```
   Attendu : 20 tests réussis.
2. `python3 -m http.server 8000`, puis dans le navigateur :
   - `http://localhost:8000/communaute/?depuis=P1-1&vers=P2-1` : départ et destination remplis, panneau Itinéraire ouvert ; « Let's go » lance le guidage, qui annonce « Prendre les escaliers jusqu'au niveau 2 » et « Tourner à droite près de P2-C1 ».
   - `http://localhost:8000/communaute/?vers=v2-1450` : destination V2-1450 (majuscules ignorées).
   - `http://localhost:8000/communaute/?vers=Inconnue` : bandeau « Lieu introuvable : Inconnue ».
   - Boutons de niveau du panel communauté : 0 à 7.
   - `http://localhost:8000/admin/` : sélecteur « Niveau 0 » à « Niveau 7 ».
