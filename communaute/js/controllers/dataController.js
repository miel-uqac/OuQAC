/**
 * ====================================================================
 * APPLICATION : OùQAC - Panel Communauté
 * FICHIER : dataController.js (Controllers)
 * RÔLE : Gestionnaire de chargement des données du graphe (Fetch JSON)
 * ====================================================================
 * * DESCRIPTION :
 * Ce fichier est responsable de l'initialisation des données de la carte 
 * au lancement de l'application publique. Il fait le pont entre le fichier 
 * de sauvegarde généré par le panel Admin (graph.json) et la mémoire de 
 * l'application mobile (state.js).
 * * FONCTIONS PRINCIPALES :
 * - loadGraphData() : Fonction asynchrone qui effectue une requête HTTP 
 * pour récupérer le fichier de configuration de l'université. Elle analyse 
 * (parse) le JSON, puis délègue la reconstruction visuelle des objets aux 
 * contrôleurs spécifiques (NodeCtrl et PathCtrl) avant d'appliquer le 
 * filtre d'affichage initial.
 * * FLUX DE DONNÉES / TRAVAIL :
 * 1. Déclenchement : Appelée automatiquement par main.js (DOMContentLoaded) 
 * au démarrage de la web-app.
 * 2. Récupération : Elle va lire le fichier physique `../graph/graph.json` 
 * hébergé sur le serveur.
 * 3. Instanciation : Elle boucle sur les tableaux de nœuds et de chemins, 
 * demandant aux contrôleurs de les recréer sur la carte Leaflet et de 
 * les injecter dans l'état global.
 * 4. Rendu : Une fois le graphe entièrement chargé en arrière-plan, elle 
 * appelle `filterMapElements` pour nettoyer visuellement la carte et 
 * n'afficher que l'étage par défaut, cachant l'intégralité du réseau 
 * (back-end cartographique) à l'utilisateur final.
 **/

import * as NodeCtrl from './nodeController.js';
import * as PathCtrl from './pathController.js';
import { state } from '../state.js';
import { filterMapElements } from '../map.js';

export async function loadGraphData() {
    try {
        // Chemin vers graph.json
        const response = await fetch('../graph/graph.json');
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        const data = await response.json();

        // On dessine tous les nœuds
        if (data.nodes) {
            data.nodes.forEach(nodeData => NodeCtrl.renderNode(nodeData));
        }

        // Ensuite on dessine les chemins
        if (data.paths) {
            data.paths.forEach(pathData => PathCtrl.renderPath(pathData));
        }

        // On filtre pour n'afficher que le RDC au chargement
        filterMapElements(state.currentFloor);

    } catch (error) {
        console.error("Impossible de charger le fichier graph.json :", error);
    }
}