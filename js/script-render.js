/* ================= SCRIPT-RENDER.JS =================
   Actualizacion de pantalla: render(), el refresco general de UI. Septima
   parte de lo que antes era script.js.
   ================================================================= */

/* ================= ACTUALIZACIÓN DE PANTALLA ================= */
let lastRenderedLevel = null;
let lastRenderedGold = null;
function pulseSealLevel(){
  const lvlText = document.getElementById('sealLevelText');
  if(!lvlText) return;
  lvlText.classList.remove('level-pulse');
  requestAnimationFrame(()=> lvlText.classList.add('level-pulse'));
}
function updateGoldDisplay(newGold){
  const el = document.getElementById('statGold');
  if(!el) return;
  const prev = lastRenderedGold===null ? newGold : lastRenderedGold;
  const increased = newGold > prev;
  lastRenderedGold = newGold;
  if(prev === newGold){ el.textContent = newGold; return; }
  const start = performance.now();
  const duration = 550;
  (function step(now){
    const t = Math.min(1, (now-start)/duration);
    const eased = 1 - Math.pow(1-t, 3);
    el.textContent = Math.round(prev + (newGold-prev)*eased);
    if(t<1) requestAnimationFrame(step);
    else el.textContent = newGold;
  })(start);
  if(increased){
    el.classList.remove('gold-flash');
    requestAnimationFrame(()=> el.classList.add('gold-flash'));
  }
}
/**
 * Refresco general de la UI: se llama después de casi cualquier acción que
 * cambie `state` (comprar, subir de nivel, equipar, etc.) para que la pantalla
 * refleje el estado actual. No maneja una sola vista: delega a las funciones
 * render<Nombre> de cada pestaña (renderProfile, renderArena, renderForge,
 * renderFishing, renderRunMode...) además de actualizar los indicadores
 * globales (oro, nivel, barra de vida).
 */
function render(){
  applyVisualSettings();
  syncMusicScene();
  resolveAllSettlementUpgrades();
  document.getElementById('pName').textContent = state.name;
  const heroClass = currentClass();
  const subclass = currentSubclass();
  document.getElementById('heroClassTitle').textContent = `${heroClass.icon} ${heroClass.label}${subclass?` · ${subclass.icon} ${subclass.label}`:''}`;
  const availableResets = availableStatResets();
  document.getElementById('pResets').textContent = `${availableResets} RESTABLECIMIENTO${availableResets===1?'':'S'} DISP.`;
  document.getElementById('sealLevelText').textContent = state.level;
  if(lastRenderedLevel !== null && state.level > lastRenderedLevel) pulseSealLevel();
  lastRenderedLevel = state.level;
  renderSealRings();

  const need = expToNext(state.level);
  const pct = state.level>=LEVEL_CAP ? 100 : Math.min(100, (state.exp/need)*100);
  document.getElementById('expBar').style.width = pct+'%';
  document.getElementById('expLabel').textContent = state.level>=LEVEL_CAP ? 'NIVEL MÁXIMO' : `${state.exp} / ${need}`;
  updateGoldDisplay(state.gold);
  const powerLabel = document.getElementById('powerLabel');
  if(powerLabel) powerLabel.textContent = `Poder ${Math.round(power())}` + (winStreak>0 ? ` · 🔥 Racha ${winStreak}` : '');

  document.getElementById('pointsBanner').className = 'points-banner' + (state.statPoints>0?'':' empty');
  document.getElementById('pointsBanner').textContent = state.statPoints>0 ? `${state.statPoints} puntos para asignar` : 'Sin puntos para asignar';
  statAllocList();

  const runLocked = battle || (runState && runState.phase!=='ended');
  const resetBtn = document.getElementById('resetBtn');
  if(state.level >= LEVEL_CAP && !runLocked){
    resetBtn.disabled = false;
    resetBtn.textContent = `RENACER · MARCA ETERNA #${state.resets+1}`;
  } else {
    resetBtn.disabled = true;
    resetBtn.textContent = state.level>=LEVEL_CAP ? 'Terminá la cacería para renacer' : `Renacimiento disponible al nivel ${LEVEL_CAP}`;
  }

  // Cacería queda completamente retirada mientras se construye su nuevo
  // diseño de cartas. No se inicia ni renderiza ninguna expedición vieja.
  huntMode = 'disabled';
  renderActiveSubTabs();
}
