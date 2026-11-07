# PWA du panel communauté

Le panel communauté d'OùQAC est une **Progressive Web App** (PWA) minimale :

- **installable** : depuis Chrome (Android, ordinateur) ou Safari (iOS, « Ajouter à l'écran d'accueil »), il s'ouvre en plein écran avec sa propre icône, comme une application native ;
- **disponible hors ligne** : après une première visite en ligne, la page, le graphe et les plans sont gardés sur le téléphone. On peut alors chercher une salle et calculer un itinéraire sans réseau, ce qui est utile dans les couloirs où la connexion est faible.

Le panel admin et le portail (`index.html` à la racine) ne sont pas concernés.

Spécification : [specs/2026-11-07-pwa-design.md](specs/2026-11-07-pwa-design.md). Plan d'implémentation : [plans/2026-11-07-pwa.md](plans/2026-11-07-pwa.md).

## 1. Fichiers

| Fichier | Rôle |
|---|---|
| `communaute/manifest.webmanifest` | Identité de l'application installée : nom, icônes, couleurs, mode d'affichage. |
| `communaute/icons/icon.svg`, `icon-maskable.svg` | Sources vectorielles des icônes. |
| `communaute/icons/*.png` | Icônes générées depuis les SVG (192 px, 512 px, 512 px maskable). |
| `communaute/sw.js` | Le service worker : précache, nettoyage, réponses aux requêtes. |
| `communaute/js/pwa.js` | Enregistre le service worker. |
| `communaute/index.html` | Balises `<link rel="manifest">`, `theme-color`, `mobile-web-app-capable` (version standard de `apple-mobile-web-app-capable`, gardée pour iOS), icône d'onglet `rel="icon"` (sans elle, le navigateur demande `/favicon.ico` à la racine et obtient une 404), `apple-touch-icon`, chargement de `pwa.js`. |
| `tests/pwa.test.js` | Tests automatiques du manifest et de la liste de précache. |

## 2. Le manifest

Le manifest est un fichier JSON lié par `<link rel="manifest" href="manifest.webmanifest">`. Le navigateur le lit pour savoir comment installer l'application.

| Champ | Valeur | Rôle |
|---|---|---|
| `name`, `short_name` | `OùQAC` | Nom affiché sous l'icône et dans l'écran de démarrage. |
| `start_url` | `./` | Page ouverte au lancement de l'application installée. |
| `scope` | `./` | Pages qui restent « dans l'application ». Une navigation en dehors ouvre le navigateur. |
| `display` | `standalone` | Plein écran, sans barre d'adresse. |
| `theme_color` | `#6b8915` | Couleur de la barre d'état (le `--primary-color` du panel). |
| `background_color` | `#ffffff` | Fond de l'écran de démarrage. |
| `icons` | 192, 512, 512 maskable | Chrome exige au moins une icône 192 px et une 512 px pour proposer l'installation. |

**Pourquoi `./` et pas `/communaute/` ?** Les URL d'un manifest sont résolues par rapport à l'URL du manifest lui-même. `./` désigne donc `http://localhost:8000/communaute/` en local et `https://miel-uqac.github.io/OuQAC/communaute/` sur GitHub Pages. Un chemin absolu comme `/communaute/` pointerait vers `https://miel-uqac.github.io/communaute/`, qui n'existe pas.

**Icône maskable.** Android affiche les icônes dans une forme imposée par le fabricant (cercle, goutte, carré arrondi). Une icône déclarée `"purpose": "maskable"` a un fond plein et garde son motif dans la *zone de sécurité*, un disque central de 80 % de la largeur. Android peut ainsi la découper sans rogner l'épingle. C'est pourquoi l'épingle de `icon-maskable.svg` est réduite à 75 %.

**iOS.** Safari ignore les icônes du manifest et utilise `<link rel="apple-touch-icon">`. Il remplit la transparence en noir : on lui donne donc l'icône à fond plein (`icon-maskable-512.png`).

**Régénérer les PNG** après une modification des SVG (macOS, outil `sips` intégré) :

```bash
cd communaute/icons
sips -s format png -z 192 192 icon.svg --out icon-192.png
sips -s format png -z 512 512 icon.svg --out icon-512.png
sips -s format png -z 512 512 icon-maskable.svg --out icon-maskable-512.png
```

Attention : un commentaire XML (`<!-- ... -->`) ne peut pas contenir deux tirets consécutifs. Écrire `--primary-color` dans un commentaire SVG rend le fichier invalide, et `sips` refuse alors de le convertir.

## 3. Le service worker

Un **service worker** est un script JavaScript que le navigateur exécute à part de la page, sans accès au DOM. Il se place entre la page et le réseau : chaque requête émise par une page qu'il contrôle (HTML, CSS, JS, `fetch`, images) déclenche chez lui un événement `fetch`. Il peut alors répondre avec une copie gardée dans le **Cache Storage**, un stockage du navigateur qui associe une requête à une réponse.

Il ne fonctionne qu'en contexte sécurisé : HTTPS (GitHub Pages) ou `localhost` (développement).

### 3.1 Portée

La **portée** (*scope*) est l'ensemble des pages que le service worker contrôle. Par défaut, c'est le dossier qui contient `sw.js`, ici `communaute/`.

La portée limite les **pages** contrôlées, pas les **URL** interceptées. Une page de `communaute/` qui demande `../graph/graph.json`, un plan dans `../plans/` ou Leaflet sur unpkg passe quand même par le service worker. On peut donc mettre en cache le graphe et les plans sans que le panel admin soit contrôlé. Un administrateur ne risque pas de modifier un `graph.json` servi depuis un vieux cache.

Vérifié dans le navigateur : sur `admin/`, `navigator.serviceWorker.controller` vaut `null`.

### 3.2 Cycle de vie

```
pwa.js : register('sw.js')
        │
        ▼
   ┌──────────┐  install : cache.addAll(PRECACHE_URLS)
   │installing│  ── échec d'un seul fichier ──► version rejetée, l'ancienne reste
   └────┬─────┘
        │ succès + skipWaiting()
        ▼
   ┌──────────┐  activate : suppression des caches ouqac-* ≠ CACHE_VERSION
   │activating│             puis clients.claim()
   └────┬─────┘
        ▼
   ┌──────────┐  fetch : répond à chaque requête des pages contrôlées
   │activated │
   └──────────┘
```

1. **Enregistrement** (`js/pwa.js`). Après l'événement `load`, pour ne pas ralentir le premier affichage de la carte, `navigator.serviceWorker.register('sw.js')` demande au navigateur de télécharger et d'installer le service worker. Si le navigateur ne connaît pas les service workers, rien ne se passe et l'application fonctionne en ligne comme avant. `pwa.js` est un script séparé de `main.js` : une erreur dans l'un n'empêche pas l'autre de fonctionner.

2. **`install`**. Le service worker ouvre le cache `ouqac-v1` et y range les 36 fichiers de `PRECACHE_URLS` avec `cache.addAll`. Cette opération est **tout ou rien** : si un seul fichier échoue (404, faute de frappe), l'installation échoue et la version précédente reste en place. On n'a jamais une application à moitié disponible hors ligne.

   ```js
   event.waitUntil(
       caches.open(CACHE_VERSION)
           .then((cache) => cache.addAll(PRECACHE_URLS.map(toPrecacheRequest)))
           .then(() => self.skipWaiting())
   );
   ```

   `event.waitUntil(promesse)` indique au navigateur que l'installation n'est terminée qu'une fois la promesse résolue.

   Les requêtes de précache sont créées avec deux options :
   - `mode: 'cors'` : les trois CDN renvoient `Access-Control-Allow-Origin: *`, on obtient donc une vraie réponse lisible (statut 200). Sans cette option, une requête vers un autre domaine donnerait une réponse « opaque » (statut 0), que `addAll` refuse.
   - `cache: 'no-cache'` : le navigateur revalide chaque fichier auprès du serveur au lieu de reprendre une copie périmée de son cache HTTP.

3. **Attente et `skipWaiting()`**. Normalement, une nouvelle version reste en attente (*waiting*) tant qu'un onglet utilise l'ancienne. `self.skipWaiting()` la fait passer directement à l'activation. Le risque est qu'une page chargée avec l'ancienne version reçoive des fichiers de la nouvelle. Il est faible ici, parce que le code passe par le réseau d'abord (section 4) : en ligne, la page reçoit de toute façon la version la plus récente.

4. **`activate`**. Suppression de tous les caches dont le nom commence par `ouqac-` et diffère de `CACHE_VERSION`, puis `self.clients.claim()`. Sans `claim()`, la page déjà ouverte lors de la toute première visite ne serait contrôlée qu'après un rechargement.

5. **`fetch`**. Le service worker répond aux requêtes selon la stratégie de la section suivante.

## 4. Stratégie de cache

```js
if ((sameOrigin && url.pathname.includes('/plans/')) || CDN_HOSTS.includes(url.hostname)) {
    event.respondWith(cacheFirst(request));
} else if (sameOrigin) {
    event.respondWith(networkFirst(request));
}
// sinon : pas de respondWith, le navigateur fait la requête lui-même
```

| Requête | Stratégie | Raison |
|---|---|---|
| Méthode autre que `GET` | Non interceptée | Rien à mettre en cache. |
| Plans SVG (`/plans/`), CDN (unpkg, jsdelivr, cdnjs) | **Cache d'abord**, réseau en secours | Fichiers lourds (environ 11 Mo de plans) et stables. Les URL des CDN contiennent un numéro de version (`leaflet@1.9.4`), donc leur contenu ne change jamais. |
| Autres fichiers du site : HTML, JS, CSS, `graph.json`, icônes | **Réseau d'abord**, cache en secours | Ce sont les fichiers que l'équipe modifie. En ligne, on veut toujours la dernière version, et chaque réponse réseau met le cache à jour. |
| Tuiles OpenStreetMap, autres domaines | Non interceptée | Voir ci-dessous. |

- **Cache d'abord** (`cacheFirst`) : on cherche la requête dans le cache. Si elle y est, on répond tout de suite sans réseau. Sinon, on la télécharge et on l'ajoute au cache.
- **Réseau d'abord** (`networkFirst`) : on tente le réseau. En cas de succès, on met à jour le cache et on renvoie la réponse. Si `fetch` lève une exception (réseau coupé), on sert la copie du cache. Pour une ouverture de page qui ne trouve rien (par exemple `communaute/index.html` au lieu de `communaute/`), on sert la page précachée `./`.
- **Seules les réponses valides** (`response.ok`, statut 200 à 299) sont écrites en cache, pour ne jamais remplacer un fichier par une page d'erreur 404.
- **`response.clone()`** : le corps d'une réponse est un flux qui ne se lit qu'une fois. Une copie va au cache, l'original à la page.
- **`ignoreVary: true`** : la page charge Font Awesome sans l'attribut `crossorigin`, alors que le précache l'a demandé en mode `cors`. L'option garantit que la copie précachée est retrouvée même si le CDN répond avec un en-tête `Vary`.

**Pourquoi pas de fond de carte hors ligne ?** La politique d'usage des tuiles OpenStreetMap interdit leur pré-téléchargement en masse, et le cœur de l'application (plans + itinéraire) n'en dépend pas. Hors ligne, sans Internet, les plans et le tracé s'affichent sur le fond gris de Leaflet.

## 5. Mettre à jour le cache

À chaque navigation vers une page contrôlée, le navigateur retélécharge `sw.js` en contournant le cache HTTP. Si le fichier diffère **d'un seul octet**, il installe la nouvelle version dans un nouveau cache, puis `activate` supprime l'ancien.

| Ce qui change | Ce qu'il faut faire |
|---|---|
| `graph.json`, un fichier JS, CSS ou HTML existant | **Rien.** Le réseau d'abord livre la nouvelle version au prochain chargement en ligne et met le cache à jour. |
| Un plan SVG modifié | Incrémenter `CACHE_VERSION` dans `communaute/sw.js` (`ouqac-v1` → `ouqac-v2`). Sinon, le cache d'abord continue de servir l'ancien plan. |
| Un fichier ajouté, renommé ou supprimé (nouveau plan, nouveau contrôleur JS...) | Mettre à jour `PRECACHE_URLS` **et** incrémenter `CACHE_VERSION`. |
| Une nouvelle version d'une librairie CDN dans `index.html` | Mettre la même URL dans `PRECACHE_URLS` et incrémenter `CACHE_VERSION`. |

### Exemple : ajouter le plan du niveau 3 du pavillon des sciences de la santé

1. Ajouter `plans/pss/pss_nv3.svg`.
2. Le déclarer dans `PLANS` de `shared/js/config.js` (`url: "../plans/pss/pss_nv3.svg"`).
3. Ajouter `'../plans/pss/pss_nv3.svg'` dans `PRECACHE_URLS` de `communaute/sw.js`.
4. Remplacer `const CACHE_VERSION = 'ouqac-v1';` par `'ouqac-v2'`.
5. Lancer `node --test tests/pwa.test.js`. Si l'étape 3 a été oubliée, le test « chaque plan déclaré dans shared/js/config.js est précaché » échoue et nomme le plan manquant.

Vérifié dans le navigateur : après passage de `ouqac-v1` à `ouqac-v2`, il ne reste que le cache `ouqac-v2` ; le retour à `ouqac-v1` purge `ouqac-v2`.

## 6. Tester et déboguer

### Tests automatiques

```bash
node --test tests/pwa.test.js
```

| Test | Erreur détectée |
|---|---|
| Champs du manifest | `start_url` absolu, `display` oublié. |
| Icônes | Fichier manquant, ou taille réelle du PNG différente de la taille annoncée (lue dans l'en-tête du PNG). |
| Fichiers locaux du précache | Faute de frappe ou fichier supprimé, qui ferait échouer toute l'installation. |
| Plans de `shared/js/config.js` | Plan ajouté à la carte mais oublié dans le précache. |
| Ressources CDN de `index.html` | Version de Leaflet changée dans la page mais pas dans `sw.js`. |
| Fichiers de `communaute/js/` | Nouveau module oublié dans le précache : ses `import` échoueraient hors ligne. |

Le test lit `sw.js` et l'exécute dans un bac à sable `node:vm` avec un faux `self`, puisque l'objet global d'un service worker n'existe pas dans Node. C'est pourquoi `sw.js` ne doit rien exécuter d'autre au chargement que des déclarations et des `self.addEventListener(...)`.

### Dans le navigateur (Chrome, outils de développement, onglet *Application*)

- **Manifest** : nom, icônes, et absence d'avertissement d'installabilité.
- **Service workers** : `sw.js` doit être « activated and is running », avec la portée `/communaute/`. Pendant le développement, cocher **Update on reload** : le service worker est réinstallé à chaque rechargement, ce qui évite de travailler sur une version en cache. Le bouton **Unregister** le désinstalle.
- **Cache storage** : le cache `ouqac-v1` et ses 36 entrées. Clic droit, *Delete*, pour le vider.
- **Mode hors ligne** : cocher *Offline* dans l'onglet *Network* (ou *Service workers*), ou simplement arrêter le serveur local, puis recharger `communaute/`.

Vérifications faites lors de l'implémentation (serveur `python3 -m http.server`, Chrome) :

1. Premier chargement : service worker `activated`, portée `/communaute/`, page contrôlée dès la première visite, cache `ouqac-v1` de 36 entrées, manifest servi (200), aucune erreur venant de l'application dans la console. (Un message « A listener indicated an asynchronous response... » peut apparaître : il vient d'une extension du navigateur, pas d'OùQAC.)
2. Serveur local arrêté puis page rechargée : la page, Leaflet, les icônes Font Awesome et les plans de l'étage 1 s'affichent. La recherche « P2-3 » trouve la salle (donc `graph.json` vient du cache). L'itinéraire P1-1 → P2-3 se calcule et s'affiche.
3. `admin/` n'est pas contrôlé.
4. Changement de `CACHE_VERSION` : l'ancien cache est purgé.

## 7. Limites

- Il faut une première visite **en ligne** pour remplir le cache.
- Cette première visite télécharge environ 11 Mo de plans SVG, y compris ceux des étages non consultés.
- Pas de fond de carte OpenStreetMap hors ligne.
- La mise à jour est silencieuse : aucun message « nouvelle version disponible ».
- Un plan SVG modifié n'est pris en compte qu'après incrémentation de `CACHE_VERSION`.
