/* La Cacería anterior queda fuera del juego mientras se rediseña desde cero.
   Se quita del DOM para que no haya una ruta accesible ni una UI antigua. */
window.HUNT_REDESIGN_ENABLED = false;
document.querySelector('.nav-btn[data-sec="secHunt"]')?.remove();
document.getElementById('secHunt')?.remove();
