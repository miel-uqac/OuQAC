## Résumé

Ajoute un **validateur de graphe** au panel admin. Il détecte les erreurs de saisie qui faussent le calcul d'itinéraire (chemins cassés, zones déconnectées, liaisons d'étage incorrectes, salles injoignables en mode PMR) et amène directement sur l'élément fautif.

Correspond à la tâche « Script de validation du graphe (nœuds isolés, liens d'étage, PMR) » de la proposition de projet.

## Ce qui change

- `shared/js/graphValidator.js` (nouveau) : les règles, en logique pure (aucune dépendance au DOM ni à Leaflet). Export unique : `validateGraph(data)`.
- `admin/js/controllers/validationController.js` (nouveau) : lance la validation sur le graphe en cours d'édition et gère le clic sur un problème.
- Panel admin : bouton **« Valider le graphe »** et panneau de rapport (`index.html`, `style.css`, `ui.js`, `main.js`). `generateGraphData()` est maintenant exportée par `ioController.js`.
- `tests/graphValidator.test.js` (nouveau) : 24 tests avec le lanceur intégré de Node.
- Documentation : `docs/validation-graphe.md`, spécification et plan dans `docs/`, deux ajouts au README.

## Règles vérifiées

**Erreurs** : chemin vers un nœud inexistant, boucle, doublon, nœud isolé, groupe de nœuds coupé du réseau, changement d'étage hors escalier/ascenseur, escalier marqué PMR, salle injoignable en mode PMR.

**Avertissements** : salle sans nom, nom en double, distance invalide, escalier/ascenseur sans liaison d'étage, données mal formées.

Le détail (quoi, pourquoi, comment corriger) est dans [`docs/validation-graphe.md`](https://github.com/miel-uqac/OuQAC/blob/feat/validation-graphe/docs/validation-graphe.md).

## Constat sur les données actuelles

Le `graph.json` actuel n'a aucune erreur de structure, mais **deux salles sont injoignables en mode PMR : V1-1010 et V1-1260**. On n'y accède que par l'escalier `V2-Escalier-1 ↔ V1-Escalier-1` ou par le chemin non PMR `P1-Escalier-1 ↔ P1-Sortie-1`. À vérifier sur le terrain (ascenseur ou rampe manquant dans le graphe, ou vraie limite du bâtiment). Le test sur `graph.json` fige cette liste pour repérer toute régression.

## Remarque hors périmètre

Le sélecteur d'étage du panel admin est décalé d'un cran (valeurs `"0"` à `"7"` libellées « Étage 1 » à « Étage 8 », alors que les nœuds utilisent `"1"`, `"2"`...). Défaut présent avant cette PR, non corrigé ici ; à traiter dans une branche `fix/` séparée.

## Comment tester

1. Tests unitaires, depuis la racine du dépôt (Node 18+, rien à installer) :
   ```bash
   node --test tests/graphValidator.test.js
   ```
   Attendu : 24 tests réussis.
2. Dans le navigateur : `python3 -m http.server 8000`, ouvrir `http://localhost:8000/admin/`, importer `graph/graph.json`, cliquer sur « Valider le graphe ».
   - Attendu : « 2 erreur(s), 0 avertissement(s) » (V1-1010 et V1-1260).
   - Cliquer sur une erreur : la carte passe à l'étage, se centre sur la salle et la sélectionne.
   - Créer un nœud dans le vide puis revalider : une erreur « nœud isolé » apparaît en tête.
