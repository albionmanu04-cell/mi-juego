/* ================= SCRIPT-BOOT.JS =================
   Arranque del juego: seleccion de personaje, boot general (showGame).
   Octava y ultima parte de lo que antes era script.js. Debe cargarse AL
   FINAL de todo (asume que todo lo demas ya existe en el scope global).
   ================================================================= */

/* ================= ARRANQUE ================= */
/* ================= SELECCIÓN Y CREACIÓN DE PERSONAJE ================= */
function renderCharacterGate(roster){
  const list = document.getElementById('characterList');
  const form = document.getElementById('newCharacterForm');
  const rosterCount = document.getElementById('gateRosterCount');
  if(rosterCount) rosterCount.textContent = `${roster.length} / 3 HEROES`;
  list.innerHTML = roster.map(character => `
    <div class="character-card">
      <button class="character-select" data-character="${character.id}">
        <span class="char-icon"></span>
        <span><span class="char-name">${escapeHtml(character.name)}</span><span class="char-meta">Nivel ${character.level} · ${character.resets || 0} resets</span></span>
        <span class="char-play">JUGAR ›</span>
      </button>
      <button class="character-delete" data-delete-character="${character.id}" title="Borrar personaje" aria-label="Borrar ${escapeHtml(character.name)}">×</button>
    </div>`).join('');
  list.querySelectorAll('[data-character]').forEach((button, index) => {
    const character = roster[index];
    const heroClass = CLASSES[character.characterClass] || CLASSES.warrior;
    const subclass = SUBCLASSES[character.characterClass] && SUBCLASSES[character.characterClass][character.subclass];
    const icon = button.querySelector('.char-icon');
    const meta = button.querySelector('.char-meta');
    if(icon) icon.innerHTML = subclass && subclass.image ? `<img class="subclass-roster-art" src="${subclass.image}" alt="${subclass.label}" decoding="async">` : classEmblem(character.characterClass);
    if(meta) meta.textContent = `${heroClass.label}${subclass?` · ${subclass.label}`:''} · Nivel ${character.level} · ${character.resets || 0} resets`;
    button.addEventListener('click', () => activateCharacter(button.dataset.character));
  });
  list.querySelectorAll('[data-delete-character]').forEach(button=>{
    button.addEventListener('click', async ()=>{
      const id = button.dataset.deleteCharacter;
      const character = roster.find(entry=>entry.id===id);
      if(!character || !confirm(`Borrar a ${character.name}? Esta accion no se puede deshacer.`)) return;
      await removeStored(characterKey(id));
      await clearRunSnapshot(id);
      await saveRoster(roster.filter(entry=>entry.id!==id));
      Sound.click();
      showFeedback('PERSONAJE BORRADO', character.name, 'danger');
      renderCharacterGate(await loadRoster());
    });
  });
  form.style.display = roster.length >= 3 ? 'none' : 'block';
  if(roster.length >= 3 && !list.querySelector('.character-limit')){
    list.insertAdjacentHTML('beforeend', '<div class="character-divider character-limit"><span>3/3 PERSONAJES</span></div>');
  }
}

function syncMusicScene(){
  if(!state){ Sound.setScene('menu'); return; }
  if(battle){
    const monster = battle.monster;
    const lowHealth = monster && monster.hp>0 && monster.hp/monster.maxHp<=.30;
    if(lowHealth && !(monster.isBoss && monster.phaseTwo)){ Sound.setScene('danger'); return; }
    Sound.setScene(monster && monster.isBoss ? (monster.phaseTwo ? 'bossPhase' : 'boss') : 'battle');
    return;
  }
  const huntOpen = document.getElementById('secHunt')?.classList.contains('active');
  Sound.setScene(huntOpen ? 'hunt' : 'menu');
}

async function activateCharacter(id){
  const saved = await loadState(id);
  if(!saved) return;
  activeCharacterId = id;
  state = saved;
  normalizeState();
  battle = null;
  runState = null;
  winStreak = 0;
  // El modo Cacería anterior fue retirado para reconstruirlo desde cero.
  // Su snapshot no se restaura: evita que una pelea antigua vuelva a abrirse.
  await clearRunSnapshot(id);
  const resumed = false;
  applyVisualSettings();
  Sound.musicEnabled = !!state.settings.musicEnabled;
  Sound.applyVolumes();
  Sound.updateMusicControl();
  Sound.click();
  showGame();
  if(resumed) showFeedback('EXPEDICIÓN RESTAURADA', `Retomaste la profundidad ${runState.depth}`, 'reward');
  checkDailyLogin();
  updateDeveloperPanel();
}

function renderGateClassShowcase(){
  const showcase = document.getElementById('gateClassShowcase');
  const gate = document.getElementById('nameGate');
  if(!showcase || !gate) return;
  const selected = CLASSES[selectedClassId] || CLASSES.warrior;
  const visual = CLASS_BATTLE_STYLE[selectedClassId] || CLASS_BATTLE_STYLE.warrior;
  const traits = [];
  if(selected.hp) traits.push(`+${selected.hp} VIDA`);
  if(selected.mana) traits.push(`+${selected.mana} MANA`);
  if(selected.atk) traits.push(`+${selected.atk} ATAQUE`);
  if(selected.def) traits.push(`+${selected.def} ROBUSTEZ`);
  if(selected.crit) traits.push(`+${selected.crit}% CRITICO`);
  if(selected.dodge) traits.push(`+${Math.round(selected.dodge * 100)}% ESQUIVA`);
  if(selected.skillMult > 1.1) traits.push(`+${Math.round((selected.skillMult - 1) * 100)}% PODER`);
  if(!traits.length) traits.push('COMBATE ADAPTABLE');
  gate.dataset.class = selectedClassId;
  gate.style.setProperty('--class-glow', visual.glow || '#e8c477');
  showcase.innerHTML = `
    <div class="gate-class-artbox">
      <img class="gate-class-art" src="${visual.image}" alt="${selected.label}" decoding="async">
    </div>
    <div class="gate-class-info">
      <span class="gate-class-pill">${classEmblem(selectedClassId)} ${selected.label}</span>
      <h3>${selected.label}</h3>
      <span class="gate-class-weapon">ARMA DISTINTIVA: ${visual.weapon}</span>
      <p>${selected.description}</p>
      <div class="gate-class-traits">${traits.slice(0,3).map(trait=>`<span>${trait}</span>`).join('')}</div>
    </div>`;
}

function renderClassPicker(){
  const description = document.getElementById('classDescription');
  const selected = CLASSES[selectedClassId] || CLASSES.warrior;
  description.textContent = `${selected.icon} ${selected.label}: ${selected.description}`;
  const nameInput = document.getElementById('nameInput');
  if(nameInput) nameInput.placeholder = `Nombre de ${selected.label.toLowerCase()}`;
  renderGateClassShowcase();
  document.querySelectorAll('#classPicker [data-class]').forEach(button => {
    button.classList.toggle('active', button.dataset.class===selectedClassId);
    button.onclick = () => { selectedClassId = button.dataset.class; Sound.click(); renderClassPicker(); };
  });
}

async function createCharacter(){
  const input = document.getElementById('nameInput');
  const name = input.value.trim().slice(0,16);
  if(!name){ input.focus(); return; }
  const roster = await loadRoster();
  if(roster.length >= 3){ renderCharacterGate(roster); return; }
  activeCharacterId = `hero-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
  state = defaultState(name, selectedClassId);
  await saveState();
  Sound.heroBorn();
  showGame();
}

/* ================= MODO PANTALLA COMPLETA (inmersivo) ================= */
function syncGameMode(){
  const active = !!(document.fullscreenElement || document.webkitFullscreenElement);
  document.body.classList.toggle('immersive-game', active);
  const button = document.getElementById('fullscreenBtn');
  if(button){
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
    button.textContent = active ? '⛶ Salir del modo juego' : '⛶ Modo juego';
  }
}

async function toggleGameMode(){
  const active = !!(document.fullscreenElement || document.webkitFullscreenElement);
  try{
    if(active){
      if(document.exitFullscreen) await document.exitFullscreen();
      else if(document.webkitExitFullscreen) document.webkitExitFullscreen();
    }else{
      const root = document.documentElement;
      if(root.requestFullscreen) await root.requestFullscreen();
      else if(root.webkitRequestFullscreen) root.webkitRequestFullscreen();
      else throw new Error('fullscreen no disponible');
    }
  }catch(_error){
    const cinematic = !document.body.classList.contains('immersive-game');
    document.body.classList.toggle('immersive-game', cinematic);
    const button = document.getElementById('fullscreenBtn');
    if(button){ button.classList.toggle('active', cinematic); button.setAttribute('aria-pressed', String(cinematic)); button.textContent = cinematic ? '⛶ Salir del modo juego' : '⛶ Modo juego'; }
    showFeedback(cinematic ? '⛶ MODO JUEGO ACTIVADO' : '⛶ MODO JUEGO CERRADO', cinematic ? 'Vista ampliada activada' : 'Vista normal restaurada');
  }
}

/* ================= ARRANQUE DEL PORTAL Y DEL JUEGO ================= */
/**
 * Arranca la pantalla de selección/creación de personaje (una sola vez,
 * `gamePortalBooted` evita re-inicializar listeners si se llama de nuevo).
 * No carga ningún personaje: solo prepara el portal — `activateCharacter`
 * es quien realmente entra a jugar con uno del roster, y `createCharacter`
 * quien crea uno nuevo.
 */
async function launchGamePortal() {
  if(gamePortalBooted) return;
  gamePortalBooted=true;
  document.getElementById('musicToggle').addEventListener('click', () => {
    Sound.toggleMusic();
  });
  document.getElementById('fullscreenBtn').addEventListener('click', toggleGameMode);
  document.addEventListener('fullscreenchange', syncGameMode);
  document.addEventListener('webkitfullscreenchange', syncGameMode);
  Sound.updateMusicControl();

  const roster = await loadRoster();
  renderCharacterGate(roster);
  renderClassPicker();
  document.getElementById('startBtn').addEventListener('click', createCharacter);
  document.getElementById('nameInput').addEventListener('keydown', event => {
    if(event.key === 'Enter') createCharacter();
  });
}

async function boot(){
  await initializeAccountGate();
}

function showGame(){
  document.getElementById('nameGate').style.display = 'none';
  document.getElementById('mainNav').classList.add('active');
  document.getElementById('game').classList.add('active');
  ensureShop();
  initTabListeners();
  render();
  updateDeveloperPanel();
  showTutorialIfNeeded();
  // Personajes veteranos creados antes del sistema reciben su elección al
  // entrar, sin tener que alcanzar nuevamente el primer Renacimiento.
  if((state.resets||0)>=1 && !state.subclass) setTimeout(()=>openSubclassChoice(false), 450);
}

function showTutorialIfNeeded(){
  if(!state || state.tutorialSeen || document.getElementById('tutorialOverlay')) return;
  const overlay = document.createElement('div');
  overlay.className = 'tutorial-overlay';
  overlay.id = 'tutorialOverlay';
  overlay.innerHTML = `<div class="tutorial-card" role="dialog" aria-modal="true" aria-label="Guía de inicio">
    <header><h2>Tu leyenda comienza ahora</h2><p>Estas cuatro cosas te harán avanzar más rápido.</p></header>
    <div class="tutorial-steps">
      <div class="tutorial-step"><b>1</b><div><strong>Asigná y guardá puntos</strong><span>Probá combinaciones antes de confirmar. Una vez guardados, se restablecen cada 5 niveles.</span></div></div>
      <div class="tutorial-step"><b>2</b><div><strong>Equipá tu botín</strong><span>Visitá Mochila & Equipo y prepará a tu clase antes de una expedición.</span></div></div>
      <div class="tutorial-step"><b>3</b><div><strong>Descendé en Cacería</strong><span>Elegí rutas, usá habilidades y aprendé los patrones de cada enemigo.</span></div></div>
      <div class="tutorial-step"><b>4</b><div><strong>Reclamá avances</strong><span>El Gremio guarda misiones, logros y el bestiario de tus derrotas.</span></div></div>
    </div><button class="claim-btn ready" id="tutorialClose">¡Aventura lista!</button></div>`;
  document.body.appendChild(overlay);
  document.getElementById('tutorialClose').addEventListener('click', ()=>{
    Sound.reward(); state.tutorialSeen = true; overlay.remove(); saveState();
  });
}

function updateGuildRotationClock(){
  const guild = document.getElementById('secGuild');
  const timer = document.getElementById('shopRotationTimer');
  if(document.visibilityState!=='visible' || !state || activeGuildTab!=='shop' || !guild || !guild.classList.contains('active') || !timer) return;
  const remaining = SHOP_ROTATION_MS - (Date.now() - finiteNumber(state.shop && state.shop.generatedAt, 0));
  if(remaining <= 0){ renderGuildSubTab(); return; }
  const mm = String(Math.floor(remaining/60000)).padStart(2,'0');
  const ss = String(Math.floor((remaining%60000)/1000)).padStart(2,'0');
  timer.textContent = `Rotación en ${mm}:${ss}`;
}
setInterval(updateGuildRotationClock, 1000);
boot();
