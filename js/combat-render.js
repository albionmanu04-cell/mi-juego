/* ================= COMBAT-RENDER.JS =================
   Renderizado general de combate (log, sellos). Quinta y ultima parte de lo
   que antes era combat.js.
   ================================================================= */

/* ================= RENDERIZADO GENERAL ================= */
function renderLog(){
  const log = document.getElementById('log');
  if(log){
    // El evento más reciente se dibuja primero y la bitácora vuelve arriba sola.
    // Así nunca queda el scroll en sucesos viejos durante una pelea.
    log.innerHTML = state.log.map(l => `<div class="log-line ${l.cls}">${l.text}</div>`).join('');
    log.scrollTop = 0;
  }
  const count = document.getElementById('huntLogCount');
  if(count) count.textContent = state.log.length ? `${state.log.length} sucesos` : 'Sin sucesos aún';
}
function renderSealRings(){
  const g = document.getElementById('sealResetRings');
  if(!g) return;
  const rings = Math.min(state.resets, 6);
  let html = '';
  for(let i=0;i<rings;i++){
    const r = 34 - i*5;
    html += `<circle cx="75" cy="75" r="${r}" fill="none" stroke="#e8622c" stroke-width="1" opacity="${0.9 - i*0.12}"/>`;
  }
  g.innerHTML = html;
}
