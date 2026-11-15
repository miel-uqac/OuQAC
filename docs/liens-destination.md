# Liens de destination

On peut ouvrir le panel communauté **directement sur un itinéraire** en ajoutant des paramètres à son adresse :

| Adresse | Effet |
|---|---|
| `communaute/?vers=P1-4000` | La destination P1-4000 est choisie, le panneau Itinéraire est ouvert. |
| `communaute/?depuis=Entrée%20Est&vers=Cafétéria` | Le départ et la destination sont choisis. |
| `communaute/` | Comportement habituel. |

L'utilisateur vérifie l'itinéraire et appuie sur « C'est parti » : le guidage n'est jamais lancé tout seul.

## À quoi ça sert

- **QR codes** : un QR code collé à une entrée (`?depuis=Entrée Est`) ou sur une affiche d'événement (`?vers=P1-4000`) contient simplement un de ces liens. Le téléphone ouvre le lien avec son appareil photo, sans rien installer.
- **Partage** : envoyer un trajet par courriel, Moodle ou Discord.

## Règles

- Les noms sont ceux des nœuds du graphe (champ `name`), comparés **sans tenir compte des majuscules, des accents ni des espaces en trop** : `?vers=v2-1450` fonctionne.
- La comparaison est **exacte** : `?vers=P1-4` n'ouvre pas `P1-40`.
- Tout nœud nommé convient : salle, toilettes, lieu courant, ou une entrée de type couloir nommée par exemple « Entrée Est ».
- Si un nom est introuvable, un message s'affiche en haut de l'écran (« Lieu introuvable : … »), annoncé par les lecteurs d'écran. Le reste fonctionne normalement.
- Le départ est rempli avant la destination : la carte finit centrée sur la destination.

## Écrire un lien correctement

Les espaces et les accents doivent être encodés dans une adresse (`Entrée Est` → `Entr%C3%A9e+Est`). La fonction `buildDestinationUrl` de `shared/js/links.js` le fait automatiquement :

```bash
node --input-type=module -e "import { buildDestinationUrl } from './shared/js/links.js'; console.log(buildDestinationUrl('https://miel-uqac.github.io/OuQAC/communaute/', { depuis: 'Entrée Est', vers: 'Cafétéria' }))"
```

Résultat : `https://miel-uqac.github.io/OuQAC/communaute/?depuis=Entr%C3%A9e+Est&vers=Caf%C3%A9t%C3%A9ria`

Attention : le site public (GitHub Pages) est publié depuis `main` et n'a pas encore cette fonctionnalité. En local : `http://localhost:8000/communaute/?vers=P2-1`.

## Fonctionnement technique

| Fichier | Rôle |
|---|---|
| `shared/js/links.js` | Logique pure : `parseDestinationParams`, `findNodeByName`, `buildDestinationUrl` |
| `communaute/js/main.js` | `applyDestinationLink()`, appelée une fois le graphe chargé (`loadGraphData()` est asynchrone) |
| `communaute/js/views/ui.js` | `showMessage(text)` : bandeau temporaire de 6 secondes |
| `communaute/index.html` | `#app-message` avec `role="status"` et `aria-live="polite"` |

Les paramètres sont dans la partie « requête » de l'adresse (`?…`). Le panel utilise déjà la partie « ancre » (`#active`) pour le bouton Retour : les deux ne se gênent pas.

## Lien avec la PWA

Le panel communauté importe `shared/js/links.js`. Après la fusion de la PWA (PR #3), l'ajouter à `PRECACHE_URLS` dans `communaute/sw.js` (avec `shared/js/places.js`) et incrémenter `CACHE_VERSION`.

## Tests

```bash
node --test tests/links.test.js
```
