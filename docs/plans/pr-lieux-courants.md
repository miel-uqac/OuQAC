## Résumé

La section **« Lieux courants »** du panel communauté ne fonctionnait pas : ses 13 lieux (Cafétéria, Bibliothèque, Coopsco...) étaient écrits en dur dans `communaute/index.html` et ne correspondaient à aucun nœud du graphe, donc **le clic ne faisait rien, sans message**.

Cette PR fait des lieux courants une **donnée du graphe** : on marque un nœud dans le panel admin (case « Lieu courant », catégorie, mots-clés), et le panel communauté construit la liste et la recherche à partir de ces données. Cela suit la consigne du prof de séparer les données du code et des plans.

## Ce qui change

- **Données :** trois champs facultatifs sur les nœuds de `graph.json` : `featured`, `category`, `keywords`. Ils ne sont écrits que s'ils sont remplis ; un nœud ordinaire ne change pas.
- **Panel admin :** case, menu des catégories et champ de mots-clés dans « Édition Nœud », sauvegarde automatique, champs conservés à l'import et à l'export.
- **Panel communauté :** liste générée à partir des nœuds marqués (vrais `<button>`, avec la catégorie), message « Aucun lieu courant pour le moment. » si la liste est vide ; la recherche trouve aussi les lieux par mot-clé et ignore les accents (« bibliotheque » trouve « Bibliothèque »).
- **Logique :** module pur `shared/js/places.js` (sans DOM ni Leaflet), 10 tests dans `tests/places.test.js`.
- **Configuration :** catégories déclarées une seule fois dans `shared/js/config.js` (`PLACE_CATEGORIES`).
- **Documentation :** `docs/lieux-courants.md`, spécification et plan dans `docs/`.

## À savoir

- **Aucun lieu n'est encore saisi** dans `graph.json` : placer la cafétéria, la bibliothèque, etc. fait partie de la saisie du graphe (Nicolas et William). La liste des 13 lieux à placer, avec une catégorie suggérée, est dans `docs/lieux-courants.md`. En attendant, la section affiche « Aucun lieu courant pour le moment. ».
- **Panel communauté :** la recherche et la liste ont changé (`communaute/js/main.js`, `communaute/js/views/ui.js`) ; à garder en tête pour la sélection d'une salle par clic sur la carte.
- **PWA (PR #3) :** après sa fusion, ajouter `../shared/js/places.js` à `PRECACHE_URLS` dans `communaute/sw.js` et incrémenter `CACHE_VERSION`, sinon le mode hors ligne casse.
- Fusion vérifiée sans conflit avec `feat/validation-graphe` (PR #2) et `feat/pwa` (PR #3).

## Comment tester

1. Tests unitaires, depuis la racine du dépôt (Node 18+, rien à installer) :
   ```bash
   node --test tests/places.test.js
   ```
   Attendu : 10 tests réussis.
2. Admin : `python3 -m http.server 8000`, ouvrir `http://localhost:8000/admin/`, importer `graph/graph.json`, sélectionner une salle, cocher « Lieu courant », choisir une catégorie, saisir « manger, repas ». Recharger la page : les valeurs sont conservées. « Sauvegarder » : le JSON exporté contient les trois champs pour cette salle seulement.
3. Communauté : remplacer `graph/graph.json` par le fichier exporté, ouvrir `http://localhost:8000/communaute/` (recharger avec Cmd+Maj+R), ouvrir la recherche : la salle apparaît dans « Lieux courants » avec sa catégorie ; taper « repas » la trouve ; cliquer dessus ouvre l'itinéraire. Remettre le `graph.json` d'origine ensuite.
