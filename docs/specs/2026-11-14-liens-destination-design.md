# Spécification : liens de destination (`?vers=` et `?depuis=`)

- **Auteur :** Malo Besson
- **Date :** 2026-11-14
- **Branche :** `feat/liens-et-niveaux` (issue de `feat/lieux-courants`)
- **Statut :** implémentée (voir `docs/liens-destination.md`)

## 1. Objectif

Pouvoir ouvrir le panel communauté **directement sur un itinéraire** grâce à l'adresse de la page :

- `communaute/?vers=P1-4000` : la destination est déjà choisie ;
- `communaute/?depuis=Entrée%20Est&vers=Cafétéria` : le départ et la destination sont choisis.

C'est la base des QR codes : un QR code collé à une entrée ou sur une affiche contiendra simplement un de ces liens. Le lien sert aussi à partager un trajet (courriel, Moodle, Discord).

### Hors périmètre

- Générer et imprimer les QR codes (fonctionnalité suivante).
- Lancer le guidage automatiquement : l'utilisateur garde la main et appuie sur « C'est parti ».

## 2. Comportement

1. Au chargement du panel communauté, une fois le graphe chargé, on lit les paramètres `depuis` et `vers` de l'adresse.
2. Chaque paramètre est comparé aux **noms des nœuds**, sans tenir compte des majuscules, des accents ni des espaces en trop (`normalizeText` de `shared/js/places.js`). La comparaison est **exacte** : `vers=P1-4` ne trouve pas `P1-40`.
3. Tout nœud nommé peut servir (salle, toilettes, lieu courant, mais aussi une entrée de type couloir nommée « Entrée Est » pour un QR code de départ).
4. On remplit d'abord le départ, puis la destination, avec la sélection existante (`selectLocation`). La carte finit donc centrée sur la destination, et le panneau « Itinéraire » est ouvert.
5. Si un nom est introuvable, un message s'affiche (« Lieu introuvable : … ») et le reste fonctionne normalement. Le message est annoncé par les lecteurs d'écran (`role="status"`).
6. Un paramètre vide ou absent est ignoré. Sans paramètre, rien ne change.

## 3. Architecture

| Fichier | Action | Rôle |
|---|---|---|
| `shared/js/links.js` | Créer | Logique pure : `parseDestinationParams(search)`, `findNodeByName(nodes, name)`, `buildDestinationUrl(baseUrl, { depuis, vers })`. |
| `tests/links.test.js` | Créer | Tests unitaires. |
| `communaute/js/main.js` | Modifier | Après chargement du graphe : appliquer le lien (départ puis destination), message si introuvable. |
| `communaute/js/views/ui.js` | Modifier | `showMessage(text)` : bandeau temporaire. |
| `communaute/index.html`, `communaute/style.css` | Modifier | Élément `#app-message` (`role="status"`, `aria-live="polite"`) et son style. |

`buildDestinationUrl` n'est pas utilisée par l'interface pour l'instant : elle sert à fabriquer des liens corrects (encodage des espaces et accents) dans la documentation et servira aux QR codes.

## 4. Points d'attention

- **PWA (PR #3) :** `shared/js/links.js` devra être ajouté au précache, comme `shared/js/places.js`.
- **Historique du navigateur :** le panel utilise `#active` dans l'adresse pour le bouton Retour ; les paramètres `?vers=` sont dans la partie « requête » de l'adresse et ne sont pas touchés.

## 5. Tests

- `node --test tests/links.test.js` : lecture des paramètres (absents, vides, encodés), recherche par nom (casse, accents, exactitude, nœud sans nom), construction d'adresse (encodage, paramètre absent).
- Navigateur : `?vers=P2-1`, `?depuis=P1-1&vers=P2-1`, `?vers=v2-1450` (casse), `?vers=Inconnue` (message), sans paramètre.
