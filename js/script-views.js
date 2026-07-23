/* ================= SCRIPT-VIEWS.JS =================
   Control de vistas principales (tabs de heroe/gremio/perfil). Cuarta parte
   de lo que antes era script.js.
   ================================================================= */

/* ================= CONTROL DE VISTAS PRINCIPALES ================= */
document.querySelectorAll('.nav-btn[data-sec]').forEach(btn => {
    btn.addEventListener('click', () => {
      Sound.click();
      if(btn.dataset.sec==='secProfile') activeProfileView = 'home';
      if(btn.dataset.sec==='secOptions') activeOptionsView = 'home';
      document.querySelectorAll('.nav-btn[data-sec]').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.game-section').forEach(sec => sec.classList.remove('active'));
    
    btn.classList.add('active');
    document.getElementById(btn.dataset.sec).classList.add('active');
    const btnLabelEl = btn.querySelector('.btn-label');
    document.getElementById('navCurrentLabel').textContent = (btnLabelEl ? btnLabelEl.textContent : btn.textContent.trim().replace(/^\S+\s*/, '')).toUpperCase();
    document.getElementById('mainNav').classList.remove('menu-open');
    document.getElementById('navMenuToggle').setAttribute('aria-expanded','false');
    render();
  });
});

document.getElementById('navMenuToggle').addEventListener('click', ()=>{
  const nav = document.getElementById('mainNav');
  const isOpen = nav.classList.toggle('menu-open');
  document.getElementById('navMenuToggle').setAttribute('aria-expanded', String(isOpen));
  Sound.click();
});

document.addEventListener('click', event=>{
  const nav = document.getElementById('mainNav');
  if(nav && nav.classList.contains('menu-open') && !nav.contains(event.target)){
    nav.classList.remove('menu-open');
    document.getElementById('navMenuToggle').setAttribute('aria-expanded','false');
  }
});

document.getElementById('charactersBtn').addEventListener('click', async ()=>{
  if(battle || (runState && runState.phase!=='ended')){
    showFeedback('EXPEDICION ACTIVA', 'Termina la caceria antes de cambiar de personaje.', 'danger');
    return;
  }
  Sound.click();
  document.getElementById('mainNav').classList.remove('menu-open');
  document.getElementById('navMenuToggle').setAttribute('aria-expanded','false');
  state = null;
  activeCharacterId = null;
  document.getElementById('game').classList.remove('active');
  document.getElementById('mainNav').classList.remove('active');
  document.getElementById('nameGate').style.display = 'grid';
  renderCharacterGate(await loadRoster());
});

document.querySelectorAll('#huntModeToggle .mode-btn').forEach(btn=>{
  btn.addEventListener('click', ()=> switchHuntMode(btn.dataset.mode));
});

document.getElementById('huntResetBtn')?.addEventListener('click', ()=> resetHuntState());

/* Botón de emergencia: fuerza la limpieza del estado de cacería (combate/expedición)
   por si un bug deja los botones o la arena trabados. Borra el progreso de la
   expedición en curso (profundidad, reliquias sin cobrar, batalla activa), pero
   NO toca el personaje, nivel, equipo, oro ni inventario. */
function resetHuntState(){
  if(!state) return;
  const enExpedicion = !!(battle || (runState && runState.phase!=='ended'));
  const confirmado = confirm(enExpedicion
    ? '¿Reiniciar la cacería?\n\nSe perderá el progreso de la expedición actual (profundidad, reliquias y botín sin cobrar). Tu personaje, nivel, equipo y oro NO se ven afectados.\n\nUsá esto si el combate quedó trabado.'
    : 'Esto limpia el estado interno de la cacería por si quedó trabado. ¿Continuar?');
  if(!confirmado) return;
  if(runCheckpointTimer){ clearTimeout(runCheckpointTimer); runCheckpointTimer = null; }
  battle = null;
  runState = null;
  huntMode = 'run';
  activeHuntTab = 'combat';
  Sound.click();
  addLog('⟳ Cacería reiniciada manualmente para destrabar el combate.', 'reset');
  render();
  saveState();
}

function initTabListeners() {
  if(tabListenersInitialized) return;
  tabListenersInitialized = true;
  document.getElementById('resetBtn')?.addEventListener('click', doReset);
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      Sound.click();
      const parent = tab.parentElement;
      parent.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      const tabGroup = tab.dataset.tab;
      if (['gear', 'detailed_stats'].includes(tabGroup)) {
        activeHeroTab = tabGroup;
      } else if (['shop', 'day', 'week', 'month', 'logros', 'bestiary', 'trade'].includes(tabGroup)) {
        activeGuildTab = tabGroup;
      } else if (['lb'].includes(tabGroup)) {
        activeLbTab = tabGroup;
      }
      renderActiveSubTabs();
    });
  });
  document.querySelectorAll('#huntSubtabs [data-hunt-tab]').forEach(tab=>{
    tab.onclick = ()=>{
      activeHuntTab = tab.dataset.huntTab;
      Sound.click();
      renderHuntSubTabs();
    };
  });
}

/* ================= PESTAÑAS DE CACERÍA ================= */
function renderHuntSubTabs(){
  const active = ['combat','progress'].includes(activeHuntTab) ? activeHuntTab : 'combat';
  activeHuntTab = active;
  document.querySelectorAll('#huntSubtabs [data-hunt-tab]').forEach(tab=>tab.classList.toggle('active', tab.dataset.huntTab===active));
  const views = { combat:'huntViewCombat', progress:'huntViewProgress' };
  Object.entries(views).forEach(([key,id])=>document.getElementById(id)?.classList.toggle('active', key===active));
}

function renderActiveSubTabs() {
  const profileActive = document.getElementById('secProfile').classList.contains('active');
  const heroActive = document.getElementById('secHero').classList.contains('active');
  const guildActive = document.getElementById('secGuild').classList.contains('active');
  const forgeActive = document.getElementById('secForge').classList.contains('active');
  const optionsActive = document.getElementById('secOptions').classList.contains('active');
  const fishingActive = document.getElementById('secFishing').classList.contains('active');
  if(profileActive) renderProfile();
  if(heroActive) renderHeroSubTab();
  if(forgeActive) renderForge();
  if(optionsActive) renderOptions();
  if(fishingActive) renderFishing();
  if(guildActive){
    renderGuildSubTab();
    renderLbSubTab();
  }
}

/**
 * Dibuja el contenido de la pestaña de héroe activa (`activeHeroTab`):
 * estadísticas detalladas, equipo/inventario, o misiones/logros — cada una
 * es un bloque grande dentro de esta misma función (por eso es larga). Para
 * agregar una pestaña nueva de héroe: sumarla a `activeHeroTab` en
 * classes.js, un botón en el HTML, y un bloque `if` acá.
 */
function renderHeroSubTab() {
  const box = document.getElementById('heroTabContent');
  if (!box) return;

  if (activeHeroTab === 'detailed_stats') {
    const eq = getEquipmentBonuses();
    const playerName = typeof escapeHtml !== 'undefined' ? escapeHtml(state.name) : state.name;
    const heroClass = currentClass();
    const activeSetId = state.subclass ? `subclass-${state.characterClass}-${state.subclass}` : `class-${state.characterClass}`;
    const activeSet = EQUIPMENT_SET_DEFS[activeSetId];
    const effectiveCrit = Math.round(critChance()*100);
    const effectiveSpeed = Math.round(extraTurnChance()*100);
    const sheet = heroStatBreakdown();

    // Tarjeta genérica de stat: ícono + etiqueta arriba, valor grande, y una
    // sola línea de desglose abajo (evita el wrap raro de la versión vieja).
    const statCard = (color, icon, label, total, breakdown, note='') => `
      <div class="sd-card" style="--sc:${color}">
        <div class="sd-top"><span class="sd-icon">${icon}</span><span class="sd-label">${label}</span></div>
        <div class="sd-total">${total}${note?` <small>${note}</small>`:''}</div>
        ${breakdown?`<div class="sd-sub">${breakdown}</div>`:''}
      </div>`;

    box.innerHTML = `
      <div class="stats-detailed">
        <div class="sd-power-banner">
          <span class="sd-power-icon">⚡</span>
          <div><small>PODER TOTAL</small><b>${Math.round(power())}</b></div>
        </div>

        <div class="sd-section">
          <h5>◈ Identidad</h5>
          <div class="sd-grid">
            <div class="sd-card plain"><span class="sd-label">Nombre</span><div class="sd-total" style="color:var(--gold-bright);font-size:15px;">${playerName}</div></div>
            <div class="sd-card plain"><span class="sd-label">Título</span><div class="sd-total" style="color:var(--mana);font-size:13px;">${playerTitle()}</div></div>
            <div class="sd-card plain"><span class="sd-label">Clase</span><div class="sd-total" style="color:var(--gold);font-size:14px;">${heroClass.icon} ${heroClass.label}${currentSubclass()?` · ${currentSubclass().icon} ${currentSubclass().label}`:''}</div></div>
            <div class="sd-card plain"><span class="sd-label">Marcas Eternas</span><div class="sd-total">${state.resets || 0}</div><div class="sd-sub">+${resetStatBonus()} progreso base · +${Math.min(50,(state.resets||0)*4)}% EXP</div></div>
          </div>
        </div>

        <div class="sd-section">
          <h5>⚔ Combate</h5>
          <div class="sd-grid">
            ${statCard('var(--ember)','⚔\ufe0e','Ataque', sheet.attack.total, `Base ${sheet.attack.base} · +${sheet.attack.progress} progreso · +${sheet.attack.equipment} equipo`)}
            ${statCard('var(--gold)','✹','Prob. Crítica', effectiveCrit+'%', `+${eq.crit} equipo`)}
            ${statCard('#e8c477','◎','Daño Crítico', Math.round(critMultiplier()*100)+'%', `+${eq.critDmg}% equipo`)}
            ${statCard('#8fd6e0','⌁','Rapidez', effectiveSpeed+'%', `+${eq.speed||0} equipo`)}
          </div>
        </div>

        <div class="sd-section">
          <h5>♥ Supervivencia</h5>
          <div class="sd-grid">
            ${statCard('#72d892','♥','Vida', sheet.hp.total, `Base ${sheet.hp.base} · +${sheet.hp.progress} progreso · +${sheet.hp.equipment} equipo`)}
            ${statCard('var(--mana)','✦','Maná', sheet.mana.total, `Base ${sheet.mana.base} · +${sheet.mana.progress} progreso · +${sheet.mana.equipment} equipo`)}
            ${statCard('var(--steel)','⬡','Defensa', sheet.defense.total, `Base ${sheet.defense.base} · +${sheet.defense.progress} progreso · +${sheet.defense.equipment} equipo`, `${Math.round(damageReduction()*100)}% reducción`)}
            ${statCard('#c7c2b6','↝','Evasión', sheet.evasion.total+'%', `Base ${sheet.evasion.base}% · +${sheet.evasion.progress}% progreso · +${sheet.evasion.equipment}% equipo`)}
          </div>
        </div>

        <div class="sd-section">
          <h5>◉ Tesoro</h5>
          <div class="sd-grid">
            ${statCard('#ffd700','🪙','Oro', state.gold, '')}
          </div>
        </div>
      </div>
    `;
  } else if (activeHeroTab === 'gear') {
    const eq = state.equipment;
    const style = activeHeroVisual();
    const loadoutEmblem = equipmentHeroEmblem(state.characterClass, state.subclass);
    const slotMeta = key => equipmentSlotMeta(key);
    const gearSlotMarkup = slot => {
      const item = eq[slot];
      const rarity = item ? itemRarityMeta(item) : null;
      const rarityStyle = rarity ? `style="--slot-rarity-color:${rarity.color};--slot-rarity-glow:${rarity.glow}"` : '';
      return `<div class="eq-slot slot-${slot} ${item ? 'equipped' : ''} ${rarity ? `rarity-${rarity.key}` : ''}" ${rarityStyle} data-slot="${slot}" title="${slotMeta(slot).label}">${equipmentVisual(item,slot)}</div>`;
    };
    const sets = equippedSetSummary().sets;
    const setProgressMarkup = sets.length ? `<section class="equipment-set-panel">
      <div class="set-panel-title"><span>✦</span><div><small>SINERGIA DE EQUIPO</small><b>Bonificaciones activas</b></div></div>
      <div class="set-cards">${sets.map(set=>{
        const next = (set.definition.bonuses || []).find(tier=>tier.pieces>set.pieces);
        return `<article class="set-card ${set.active.length?'set-active':''}">
          <div class="set-card-head"><strong>${escapeHtml(set.definition.label)}</strong><b>${set.pieces}/7</b></div>
          <small>${escapeHtml(set.definition.affinity || 'Conjunto de aventura')}</small>
          <div class="set-milestones">${(set.definition.bonuses || []).map(tier=>`<span class="${set.pieces>=tier.pieces?'unlocked':''}">${tier.pieces}p · ${tier.label}</span>`).join('')}</div>
          ${next ? `<em>Próximo: ${next.pieces} piezas · ${next.label}</em>` : '<em class="set-complete">✦ Set completo</em>'}
        </article>`;
      }).join('')}</div>
    </section>` : `<section class="equipment-set-panel equipment-set-empty"><b>✦ Armá un conjunto</b><span>Equipá 2 piezas del mismo set para desbloquear su primer bono.</span></section>`;
    
    box.innerHTML = `
      <div class="equipment-tab">
        ${setProgressMarkup}
        <div class="character-doll">
          <div class="loadout-title"><span><img class="subclass-loadout-emblem" src="${loadoutEmblem}" alt="Emblema de ${style.label}" decoding="async"></span><div><small>VESTIDURA ACTIVA · ${style.baseLabel}</small><strong>${style.label}</strong><em>${style.weapon}</em></div></div>
          <img class="equipment-sanctum-rune" src="assets/images/inventory_sanctum_rune.webp" alt="" decoding="async">
          <img class="equipment-hero-art ${style.isSubclass?'subclass-hero-art':''}" src="${style.image}" alt="${style.label}" decoding="async">
          
          ${gearSlotMarkup('helmet')}
          ${gearSlotMarkup('chest')}
          ${gearSlotMarkup('weapon')}
          ${gearSlotMarkup('shield')}
          ${gearSlotMarkup('gloves')}
          ${gearSlotMarkup('ring')}
          ${gearSlotMarkup('boots')}
          <div class="loadout-hint">Tocá una pieza equipada para devolverla a la mochila</div>
        </div>

        <div class="inventory-list">
          <div class="backpack-head"><span>◈</span><div><small>INVENTARIO DEL VIAJERO</small><h4>Tu Mochila</h4></div><b>${state.ownedEquipment.length}</b></div>
          ${state.ownedEquipment.length === 0 ? `<div class="empty-backpack-state"><img src="assets/images/inventory_empty_satchel.webp" alt="Mochila del viajero" decoding="async"><b>MOCHILA A LA ESPERA</b><p>Consigue piezas en la caceria, el gremio o la herreria para preparar a tu aventurero.</p><small>BOTIN · TIENDA · HERRERIA</small></div>` : ''}
          ${state.ownedEquipment.map((item, idx) => {
            const rarity = itemRarityMeta(item);
            return `
            <div class="inv-item rarity-${rarity.key}" style="--rarity-color:${rarity.color};--rarity-glow:${rarity.glow};border-left-color:${rarity.color}">
              ${item.image ? `<img class="inv-item-art" src="${item.image}" alt="" decoding="async" loading="lazy">` : ''}<div class="inv-item-info">
                <span class="inv-item-name">${item.name}</span>
                <span class="inv-rarity" style="--rarity-color:${rarity.color}">${rarity.label}</span>
                ${item.forgeLabel ? `<span class="inv-forge-quality quality-${item.forgeOutcome||'stable'}">⚒ ${escapeHtml(item.forgeLabel)}${item.forgeMultiplier>1?` · +${Math.round((item.forgeMultiplier-1)*100)}% base`:''}</span>` : ''}
                <span class="inv-item-stats">
                  ${item.bonusAtk ? `+${item.bonusAtk} Atk ` : ''}
                  ${item.bonusDef ? `+${item.bonusDef}% Robustez ` : ''}
                  ${item.bonusCrit ? `+${item.bonusCrit}% C. ` : ''}
                  ${item.bonusCritDmg ? `+${item.bonusCritDmg}% D.C.` : ''}
                  ${item.bonusHp ? `+${item.bonusHp} Vida ` : ''}
                  ${item.bonusMana ? `+${item.bonusMana} Mana ` : ''}
                  ${item.bonusSpeed ? `+${item.bonusSpeed}% Rapidez` : ''}
                </span>
              </div>
              <div class="inv-actions"><button class="claim-btn ready" style="padding: 4px 10px; width:auto; font-size:10px; font-family:'Cinzel';" onclick="equipItemFromInventory(${idx})">Equipar</button><button class="delete-item-btn" onclick="deleteItemFromInventory(${idx})">Eliminar</button></div>
            </div>
          `}).join('')}
        </div>
      </div>
    `;

    box.querySelectorAll('.eq-slot').forEach(slot => {
      slot.addEventListener('click', () => {
        const slotName = slot.dataset.slot;
        if (state.equipment[slotName]) {
          unequipItem(slotName);
        }
      });
    });
  }
}

function guildSummaryMarkup(){
  const missionReady = ['day','week','month'].reduce((total, tab)=>{
    const data = state.missions[tab];
    return total + MISSION_DEFS[tab].filter((def, index)=> (data[def.key]||0) >= def.target && !data.claimed[index]).length;
  }, 0);
  const achievementReady = ACHIEVEMENTS.filter(a=>a.check(state) && !state.achievementsClaimed[a.id]).length;
  const ready = missionReady + achievementReady;
  const labels = {shop:'Mercado del bastion', day:'Ordenes del dia', week:'Campana semanal', month:'Campana mensual', logros:'Salon de leyendas', bestiary:'Archivo de criaturas', trade:'Lonja de aventureros'};
  const note = ready
    ? `<b>${ready} recompensa${ready===1?'':'s'} lista${ready===1?'':'s'}.</b> Reclama tus avances para fortalecer al heroe.`
    : 'Completa encargos y grandes hitos para ganar oro y experiencia.';
  return `
    <div class="guild-command">
      <div><span>TESORO</span><strong>${state.gold}</strong><small>oro disponible</small></div>
      <div class="guild-marks"><span>SELLOS</span><strong>✦ ${Math.floor(finiteNumber(state.guildMarks))}</strong><small>moneda de comercio</small></div>
      <div><span>ENCARGOS</span><strong>${missionReady}</strong><small>por reclamar</small></div>
      <div><span>LOGROS</span><strong>${achievementReady}/${ACHIEVEMENTS.length}</strong><small>premios listos</small></div>
    </div>
    <div class="guild-note"><span>✦</span><span><b>${labels[activeGuildTab]}</b> — ${note}</span></div>`;
}

/* ================= PERFIL Y LOGROS ================= */
function renderProfile(){
  return renderProfileHub();
  const box = document.getElementById('profileContent');
  if(!box || !state) return;
  const hero = currentClass();
  const style = battleClassStyle();
  const need = expToNext(state.level);
  const expPct = state.level>=LEVEL_CAP ? 100 : Math.max(0, Math.min(100, finiteNumber(state.exp)/Math.max(1,need)*100));
  const completed = ACHIEVEMENTS.filter(a=>a.check(state));
  const claimed = completed.filter(a=>state.achievementsClaimed[a.id]).length;
  const equipmentCount = Object.values(state.equipment||{}).filter(Boolean).length;
  const catalog = bestiaryCatalog();
  const discovered = catalog.filter(form=>state.bestiary && state.bestiary[form.type || form.name]).length;
  const runActive = runState && runState.phase!=='ended';
  const recentAchievements = ACHIEVEMENTS.slice(0,5);
  box.style.setProperty('--profile-glow', style.glow || '#e8c477');
  box.innerHTML = `
    <section class="profile-hero">
      <div class="profile-portrait"><img src="${style.image}" alt="${hero.label}" decoding="async"></div>
      <div class="profile-summary">
        <span class="profile-kicker">✦ REGISTRO DEL BASTIÓN · AVENTURERO ACTIVO</span>
        <h2 class="profile-name">${escapeHtml(state.name)}</h2>
        <div class="profile-classline">${classEmblem(state.characterClass)} <span>${hero.label}</span><small>· ${style.weapon}</small></div>
        <p class="profile-description">${hero.description} Tu leyenda se construye en cada expedición, reliquia y guardián derrotado.</p>
        <div class="profile-exp"><span>NIVEL ${state.level}</span><span>${state.level>=LEVEL_CAP?'NIVEL MÁXIMO':`${Math.floor(finiteNumber(state.exp))} / ${need} EXP`}</span><div class="bar exp"><div style="width:${expPct}%"></div></div></div>
        <div class="profile-actions"><button id="profileHeroBtn">VER HÉROE Y EQUIPO</button><button id="profileCharactersBtn" class="profile-secondary">CAMBIAR PERSONAJE</button></div>
      </div>
    </section>
    <section class="profile-metrics">
      <article class="profile-metric"><small>⚡ PODER</small><b>${Math.round(power())}</b><em>fuerza actual</em></article>
      <article class="profile-metric"><small>♛ RESETS</small><b>${state.resets || 0}</b><em>${availableStatResets()} disponible${availableStatResets()===1?'':'s'}</em></article>
      <article class="profile-metric"><small>⚔ VICTORIAS</small><b>${state.totalWins || 0}</b><em>${state.totalBossWins || 0} guardianes</em></article>
      <article class="profile-metric"><small>◉ TESORO</small><b>${Math.floor(finiteNumber(state.gold))}</b><em>oro disponible</em></article>
    </section>
    <section class="profile-columns">
      <article class="profile-block"><h4>✦ HITOS DE TU LEYENDA</h4><div class="profile-achievements">${recentAchievements.map(a=>{ const done=a.check(state); const isClaimed=!!state.achievementsClaimed[a.id]; return `<div class="profile-achievement ${done?'done':''}"><span class="achievement-mark">${achievementGlyph(a.id)}</span><div><b>${escapeHtml(a.label)}</b><small>${done?(isClaimed?'Recompensa reclamada':'Listo para reclamar en el Gremio'):'Todavía en progreso'}</small></div><span class="achievement-status">${done?'✓':'—'}</span></div>`; }).join('')}</div></article>
      <article class="profile-block"><h4>◈ PROGRESO DEL VIAJERO</h4><div class="profile-progress-list"><div class="profile-progress-row"><span>Mejor profundidad</span><b>⛏ ${state.maxHuntDepth || 0}</b></div><div class="profile-progress-row"><span>Bestiario descubierto</span><b>${discovered} / ${catalog.length}</b></div><div class="profile-progress-row"><span>Equipo equipado</span><b>${equipmentCount} / 7 piezas</b></div><div class="profile-progress-row"><span>Logros completados</span><strong>${completed.length} / ${ACHIEVEMENTS.length}</strong></div><div class="profile-progress-row"><span>Recompensas reclamadas</span><b>${claimed}</b></div></div><div class="profile-run-badge">${runActive ? `⚔ Expedición activa · profundidad ${runState.depth}` : '✦ Sin expedición activa · listo para cazar'}</div></article>
    </section>`;
  box.querySelector('#profileHeroBtn').addEventListener('click',()=>document.querySelector('.nav-btn[data-sec="secHero"]').click());
  box.querySelector('#profileCharactersBtn').addEventListener('click',()=>document.getElementById('charactersBtn').click());
}

function achievementGlyph(id){
  if(id.indexOf('boss')===0) return '♛';
  if(id.indexOf('win')===0) return '⚔';
  if(id.indexOf('reset')===0) return '↻';
  if(id.indexOf('gold')===0) return '◈';
  if(id.indexOf('reach')===0) return '✦';
  return '✧';
}

