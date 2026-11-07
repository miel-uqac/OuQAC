## Résumé

Rend le **panel communauté installable et utilisable hors ligne** (Progressive Web App minimale). Après une première visite en ligne, on peut ouvrir l'application, chercher une salle et calculer un itinéraire sans réseau, ce qui est utile dans les couloirs des pavillons où la connexion est faible.

Correspond à la tâche PWA de la proposition de projet, dans sa version minimale (manifest + cache statique), conformément au repli prévu et à la priorité donnée avec le professeur à une application fonctionnelle.

## Ce qui change

- `communaute/manifest.webmanifest` (nouveau) : nom `OùQAC`, `display: standalone`, couleur du panel, icônes. Chemins relatifs (`./`), donc compatibles avec le sous-chemin `/OuQAC/` de GitHub Pages.
- `communaute/icons/` (nouveau) : icônes SVG sources et PNG 192/512, dont une icône « maskable » pour Android.
- `communaute/sw.js` (nouveau) : le service worker. Il précache 36 fichiers (page, CSS, JS, `graph.json`, les 10 plans SVG, Leaflet, Font Awesome) et purge les anciennes versions du cache.
- `communaute/js/pwa.js` (nouveau) : enregistre le service worker, sans dépendre de `main.js`.
- `communaute/index.html` : lien vers le manifest, `theme-color`, `mobile-web-app-capable`, icône d'onglet (`rel="icon"`, qui supprime le 404 sur `/favicon.ico`), `apple-touch-icon` pour iOS, chargement de `pwa.js`.
- `tests/pwa.test.js` (nouveau) : 7 tests avec le lanceur intégré de Node.
- Documentation : `docs/pwa.md`, spécification et plan dans `docs/`, section « Mode hors ligne » dans le README.

## Choix principaux

- **Portée limitée à `communaute/`** : le panel admin n'est pas contrôlé par le service worker, donc un administrateur ne travaille jamais sur un `graph.json` servi depuis un cache. Le service worker intercepte quand même les requêtes du panel communauté vers `../graph` et `../plans`.
- **Deux stratégies de cache** :
  - *cache d'abord* pour les plans SVG et les CDN (lourds et stables) ;
  - *réseau d'abord* pour le HTML, le JS, le CSS et `graph.json`. Un nouveau graphe exporté arrive donc tout seul, sans rien changer au service worker.
- **Pas de fond OpenStreetMap hors ligne** : sa politique d'usage interdit le pré-téléchargement des tuiles. Hors ligne, les plans et l'itinéraire s'affichent sur fond gris.

## Ce que l'équipe doit retenir

Après avoir **modifié un plan SVG** ou **ajouté/renommé un fichier** du panel communauté :

1. mettre à jour `PRECACHE_URLS` dans `communaute/sw.js` ;
2. incrémenter `CACHE_VERSION` (`ouqac-v1` → `ouqac-v2`) ;
3. lancer `node --test tests/pwa.test.js` : le test signale tout plan, module JS ou ressource CDN oublié.

Le détail est dans [`docs/pwa.md`](https://github.com/miel-uqac/OuQAC/blob/feat/pwa/docs/pwa.md) (cycle de vie, stratégie de cache, mise à jour, débogage).

## Comment tester

1. Tests automatiques, depuis la racine du dépôt (Node 20.11+, rien à installer) :
   ```bash
   node --test tests/pwa.test.js
   ```
   Attendu : 7 tests réussis.
2. Dans Chrome : `python3 -m http.server 8000`, ouvrir `http://localhost:8000/communaute/`, puis l'onglet *Application* des outils de développement.
   - *Service workers* : `sw.js` « activated and is running », portée `/communaute/`.
   - *Cache storage* : cache `ouqac-v1` de 36 entrées.
   - *Manifest* : nom et icônes affichés.
3. Hors ligne : arrêter le serveur (ou cocher *Offline*), recharger la page. La carte et les plans s'affichent, la recherche « P2-3 » trouve la salle et l'itinéraire P1-1 → P2-3 se calcule.
4. `http://localhost:8000/admin/` : dans la console, `navigator.serviceWorker.controller` vaut `null`.

Ces vérifications ont été faites lors de l'implémentation, ainsi que le passage de `CACHE_VERSION` à `ouqac-v2` (l'ancien cache est bien supprimé).

## Limites connues

- Une première visite en ligne est nécessaire, et elle télécharge environ 11 Mo de plans.
- Mise à jour silencieuse, sans message « nouvelle version disponible ».
- Pas de fond de carte hors ligne.
