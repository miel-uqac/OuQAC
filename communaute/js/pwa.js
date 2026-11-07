/**
 * ====================================================================
 * APPLICATION : OùQAC - Panel Communauté
 * FICHIER : pwa.js
 * RÔLE : Enregistrement du service worker
 * ====================================================================
 * * DESCRIPTION :
 * Demande au navigateur d'installer sw.js. Le script est séparé de
 * main.js et n'en importe rien : une erreur dans l'application ne doit pas
 * empêcher le fonctionnement hors ligne, et inversement.
 * * FONCTIONS PRINCIPALES :
 * - Enregistrement après l'événement "load", pour ne pas concurrencer le
 * chargement de la carte et des plans lors de la première visite.
 * * FLUX DE DONNÉES / TRAVAIL :
 * Chargé par index.html. Si le navigateur ne connaît pas les service
 * workers (ou si la page n'est pas en HTTPS ni sur localhost), rien ne se
 * passe : l'application fonctionne en ligne comme avant.
 * ====================================================================
 */

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Chemin relatif à la page : communaute/sw.js, portée communaute/
        navigator.serviceWorker.register('sw.js')
            .then((registration) => {
                console.log('[PWA] Service worker enregistré, portée :', registration.scope);
            })
            .catch((error) => {
                console.error("[PWA] Échec de l'enregistrement du service worker :", error);
            });
    });
}
