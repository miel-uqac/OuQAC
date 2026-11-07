# Spécification : PWA minimale du panel communauté

- **Auteur :** Malo Besson
- **Date :** 2026-11-07
- **Branche :** `feat/pwa` (issue de `projet-libre-8web101`)
- **Statut :** implémentée
- **Échéance :** 2026-11-20

## 1. Contexte et objectif

Le panel communauté d'OùQAC est pensé pour le téléphone : on l'ouvre dans un couloir du pavillon pour trouver une salle. Or le réseau y est souvent faible. L'objectif est double :

1. **Installable** : l'application peut être ajoutée à l'écran d'accueil et s'ouvre en plein écran, comme une application native (`manifest.webmanifest`).
2. **Hors ligne** : après une première visite en ligne, le panel communauté s'ouvre et calcule un itinéraire sans réseau (service worker + cache).

Avec le professeur, la priorité a été donnée à une application fonctionnelle. La PWA reste donc **minimale** : manifest et cache des fichiers statiques, conformément au repli prévu dans la proposition de projet.

### Hors périmètre

- Le panel admin et le portail (`index.html` racine) : ils ne sont ni installables ni disponibles hors ligne.
- Le fond de carte OpenStreetMap hors ligne. Sa politique d'usage interdit le pré-téléchargement massif de tuiles, et le cœur de l'application (plans + itinéraire) n'en dépend pas. Hors ligne, les plans s'affichent sur le fond gris de Leaflet.
- Les notifications push, la synchronisation en arrière-plan et le bouton « Installer l'application » personnalisé.
- Un message « nouvelle version disponible » : la mise à jour est silencieuse (voir section 5).

## 2. Contraintes

- Le site est servi par GitHub Pages sous le sous-chemin `/OuQAC/`. **Tous les chemins sont relatifs** (`./`, `../graph/graph.json`), jamais absolus (`/graph/...`), sinon ils pointeraient vers la racine du domaine `github.io`.
- Un service worker ne fonctionne qu'en contexte sécurisé : HTTPS (GitHub Pages) ou `localhost` (développement).
- Pas de dépendance npm ni d'outil de build : JavaScript natif, comme le reste du projet.

## 3. Architecture

| Fichier | Action | Rôle |
|---|---|---|
| `communaute/manifest.webmanifest` | Créer | Identité de l'application installée (nom, icônes, couleurs, mode d'affichage). |
| `communaute/icons/icon.svg`, `icon-maskable.svg` | Créer | Sources vectorielles des icônes : épingle de carte blanche sur carré vert `#6b8915` (la version maskable a un fond plein et une épingle réduite). |
| `communaute/icons/icon-192.png`, `icon-512.png` | Créer | Icônes standard exigées par Chrome pour l'installation. |
| `communaute/icons/icon-maskable-512.png` | Créer | Icône « maskable » : le motif tient dans la zone de sécurité centrale (80 %), Android peut découper l'icône en cercle ou en goutte sans rogner l'épingle. |
| `communaute/sw.js` | Créer | Service worker : précache, nettoyage des anciennes versions, stratégies de cache. |
| `communaute/js/pwa.js` | Créer | Enregistre le service worker si le navigateur le permet. |
| `communaute/index.html` | Modifier | Lien vers le manifest, `theme-color`, `apple-touch-icon`, chargement de `pwa.js`. |
| `tests/pwa.test.js` | Créer | Vérifie le manifest et l'existence de chaque fichier local du précache. |
| `docs/pwa.md` | Créer | Documentation du fonctionnement et de la mise à jour. |
| `README.md` | Modifier | Mention de la PWA et de la commande de test. |

### Pourquoi tout dans `communaute/` ?

La **portée** (*scope*) d'un service worker est l'ensemble des pages qu'il contrôle ; par défaut, c'est le dossier qui contient `sw.js`. Placé dans `communaute/`, il ne contrôle que le panel communauté.

Point important : un service worker intercepte **toutes les requêtes émises par les pages qu'il contrôle**, y compris celles qui sortent de son dossier (`../graph/graph.json`, `../plans/...`, les CDN). La portée limite les pages contrôlées, pas les URL interceptées. On peut donc mettre en cache le graphe et les plans tout en laissant le panel admin intact : un administrateur ne risque pas de travailler sur un `graph.json` servi depuis un cache.

## 4. Manifest

```json
{
    "name": "OùQAC",
    "short_name": "OùQAC",
    "description": "Itinéraires à l'intérieur des pavillons de l'UQAC",
    "lang": "fr",
    "start_url": "./",
    "scope": "./",
    "display": "standalone",
    "background_color": "#ffffff",
    "theme_color": "#6b8915",
    "icons": [
        { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
        { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
        { "src": "icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
    ]
}
```

Les URL d'un manifest sont résolues **par rapport à l'URL du manifest**. `"./"` désigne donc `/OuQAC/communaute/` sur GitHub Pages et `http://localhost:8124/communaute/` en local, sans rien changer. `theme_color` reprend `--primary-color` de `communaute/style.css`.

## 5. Service worker

### 5.1 Contenu du précache

Une constante `CACHE_VERSION` (ex. `'ouqac-v1'`) nomme le cache. Une liste `PRECACHE_URLS` énumère :

- la page : `./` ;
- le style : `style.css` ;
- tout le JavaScript du panel : `js/main.js`, `js/config.js`, `js/map.js`, `js/state.js`, `js/pwa.js`, `js/controllers/*.js` (4 fichiers), `js/views/ui.js`, et les modules partagés `../shared/js/config.js`, `../shared/js/map.js` ;
- les données : `../graph/graph.json` ;
- les 10 plans SVG de `../plans/` (ceux déclarés dans `shared/js/config.js`) ;
- le manifest et les icônes ;
- les dépendances CDN : `leaflet.css`, `leaflet.js` (unpkg), `Leaflet.ImageOverlay.Rotated.js` (jsdelivr), `all.min.css` de Font Awesome (cdnjs) et ses deux polices utilisées `fa-solid-900.woff2` et `fa-regular-400.woff2`.

Les trois CDN renvoient `Access-Control-Allow-Origin: *` (vérifié). Les requêtes de précache vers ces CDN sont faites en mode `cors` : on obtient une vraie réponse (statut 200 lisible) plutôt qu'une réponse « opaque » (statut 0), que `cache.addAll` refuse.

### 5.2 Cycle de vie

1. **Enregistrement** (`pwa.js`) : après l'événement `load` de la page, pour ne pas ralentir le premier affichage, on appelle `navigator.serviceWorker.register('sw.js')`, seulement si `'serviceWorker' in navigator`. Un échec est affiché dans la console, sans bloquer l'application.
2. **`install`** : ouverture du cache `CACHE_VERSION` et `cache.addAll(PRECACHE_URLS)`. `addAll` est **tout ou rien** : si un seul fichier échoue, l'installation échoue et l'éventuelle version précédente reste active. On évite ainsi une application à moitié disponible hors ligne. On appelle ensuite `self.skipWaiting()` pour activer la nouvelle version sans attendre la fermeture de tous les onglets.
3. **`activate`** : suppression de tous les caches dont le nom commence par `ouqac-` et diffère de `CACHE_VERSION`, puis `self.clients.claim()` pour contrôler immédiatement la page déjà ouverte.
4. **`fetch`** : voir la stratégie ci-dessous.

`skipWaiting()` présente un risque : une page chargée avec l'ancienne version pourrait recevoir des fichiers de la nouvelle. Ce risque est faible ici, parce que le code passe par le réseau d'abord : en ligne, la page reçoit de toute façon la version la plus récente.

### 5.3 Stratégie de cache

| Requête | Stratégie | Raison |
|---|---|---|
| Méthode autre que `GET` | Non interceptée | Rien à mettre en cache. |
| Tuiles `tile.openstreetmap.org` | Non interceptée | Hors périmètre (section 1). |
| Plans SVG (`/plans/` dans l'URL) et CDN (unpkg, jsdelivr, cdnjs) | **Cache d'abord**, réseau en secours (la réponse réseau est alors ajoutée au cache) | Fichiers lourds (environ 11 Mo de plans) et stables. Les URL des CDN contiennent un numéro de version, donc leur contenu ne change jamais. |
| Autres requêtes du même site (HTML, JS, CSS, `graph.json`, icônes) | **Réseau d'abord** ; la réponse met à jour le cache ; en cas d'échec réseau, on sert le cache | Ce sont les fichiers que l'équipe modifie (nouveau graphe exporté, correctifs). En ligne, on veut toujours la dernière version. |
| Autres domaines | Non interceptée | Le navigateur fait la requête normalement. |

Pour une **navigation** (ouverture de la page) hors ligne qui ne trouve rien en cache, par exemple `communaute/index.html` au lieu de `communaute/`, on sert la page précachée `./`.

Seules les réponses valides (`response.ok`) sont écrites en cache, pour ne jamais enregistrer une page d'erreur 404 à la place d'un fichier.

### 5.4 Mise à jour

| Ce qui change | Ce qu'il faut faire |
|---|---|
| `graph.json`, un fichier JS, CSS ou HTML existant | Rien. Le réseau d'abord livre la nouvelle version au prochain chargement en ligne et met le cache à jour. |
| Un plan SVG modifié | Incrémenter `CACHE_VERSION` dans `sw.js`. |
| Un fichier ajouté, renommé ou supprimé (ex. nouveau plan, nouveau contrôleur JS) | Mettre à jour `PRECACHE_URLS` **et** incrémenter `CACHE_VERSION`. |

À chaque navigation vers une page contrôlée, le navigateur retélécharge `sw.js` en contournant le cache HTTP. Si le fichier diffère d'un seul octet, il installe la nouvelle version (`install` → précache complet dans un nouveau cache), puis `activate` supprime l'ancien cache.

## 6. Gestion des erreurs

- Navigateur sans service worker, ou page servie en HTTP non local : `pwa.js` ne fait rien et l'application fonctionne comme avant, en ligne uniquement.
- Échec du précache (fichier manquant) : l'installation échoue, l'erreur apparaît dans la console du service worker et l'application continue en ligne. Le test `tests/pwa.test.js` détecte ce cas avant la fusion.
- Ressource absente du cache et réseau indisponible : la requête échoue comme sans service worker. Ce cas ne concerne que des fichiers hors précache, comme les tuiles OSM.

## 7. Tests et vérification

**Automatique** (`node --test tests/pwa.test.js`, sans installation) :

- le manifest est un JSON valide et contient `name`, `start_url`, `display: "standalone"`, une icône 192 et une icône 512 ;
- chaque icône déclarée existe sur le disque ;
- chaque URL locale de `PRECACHE_URLS` (lue dans `sw.js`) correspond à un fichier existant, résolu depuis `communaute/` ;
- chaque plan déclaré dans `shared/js/config.js` figure dans le précache, pour ne pas oublier un plan ajouté par l'équipe.

**Manuelle**, dans le navigateur (serveur local `python3 -m http.server`) :

1. Onglet *Application > Manifest* : nom, icônes et absence d'erreur d'installabilité.
2. Onglet *Application > Service workers* : `sw.js` est « activated and is running », avec la portée `/communaute/`.
3. Onglet *Application > Cache storage* : le cache `ouqac-v1` contient les fichiers du précache.
4. Hors ligne (case *Offline*, ou arrêt du serveur local) : recharger `communaute/`. La page s'ouvre, les plans s'affichent, la recherche fonctionne et un itinéraire se calcule.
5. Le panel admin n'apparaît pas comme contrôlé (`navigator.serviceWorker.controller === null` sur `admin/`).
