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
      document.body.classList.toggle('profile-screen-open', btn.dataset.sec==='secProfile');
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
  window.CardHunt?.prepareCharacterSwitch?.();
  Sound.click();
  document.body.classList.remove('profile-screen-open');
  document.getElementById('mainNav').classList.remove('menu-open');
  document.getElementById('navMenuToggle').setAttribute('aria-expanded','false');
  state = null;
  activeCharacterId = null;
  document.getElementById('game').classList.remove('active');
  document.getElementById('mainNav').classList.remove('active');
  document.getElementById('nameGate').style.display = 'grid';
  renderCharacterGate(await loadRoster());
});

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
}

/* La Cacería unificada administra su vista completa fuera de estos subtabs. */

function renderActiveSubTabs() {
  const profileActive = document.getElementById('secProfile').classList.contains('active');
  const heroActive = document.getElementById('secHero').classList.contains('active');
  const guildActive = document.getElementById('secGuild').classList.contains('active');
  const forgeActive = document.getElementById('secForge').classList.contains('active');
  const optionsActive = document.getElementById('secOptions').classList.contains('active');
  const fishingActive = document.getElementById('secFishing').classList.contains('active');
  const settlementActive = document.getElementById('secSettlement').classList.contains('active');
  if(profileActive) renderProfile();
  if(heroActive) renderHeroSubTab();
  if(forgeActive) renderForge();
  if(optionsActive) renderOptions();
  if(fishingActive) renderFishing();
  if(settlementActive) renderSettlement();
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
    const style = activeHeroAppearance();
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
        <div class="character-doll ${style.paperDoll?'paperdoll-active':''} ${style.forgePieces>=2?'forge-appearance':''}">
          <div class="loadout-title"><span><img class="subclass-loadout-emblem" src="${loadoutEmblem}" alt="Emblema de ${style.label}" decoding="async"></span><div><small>VESTIDURA ACTIVA · ${escapeHtml(style.appearanceLabel)}</small><strong>${style.label}</strong><em>${style.weapon}</em></div></div>
          <img class="equipment-sanctum-rune" src="assets/images/inventory_sanctum_rune.webp" alt="" decoding="async" loading="lazy">
          <img class="equipment-hero-art ${style.isSubclass?'subclass-hero-art':''} ${style.paperDoll?'paperdoll-base-art':''}" src="${style.image}" alt="${style.label}" decoding="async" loading="lazy">
          ${(style.paperDollLayers||[]).map(layer=>`<img class="paperdoll-layer paperdoll-layer-${layer.slot}" src="${layer.image}" alt="" decoding="async">`).join('')}
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
          ${state.ownedEquipment.length === 0 ? `<div class="empty-backpack-state"><img src="assets/images/inventory_empty_satchel.webp" alt="Mochila del viajero" decoding="async" loading="lazy"><b>MOCHILA A LA ESPERA</b><p>Consigue piezas en la caceria, el gremio o la herreria para preparar a tu aventurero.</p><small>BOTIN · TIENDA · HERRERIA</small></div>` : ''}
          ${state.ownedEquipment.map((item, idx) => {
            const rarity = itemRarityMeta(item);
            const compatibility = itemCompatibilityMeta(item);
            return `
            <div class="inv-item rarity-${rarity.key} compatibility-${compatibility.key}" style="--rarity-color:${rarity.color};--rarity-glow:${rarity.glow};border-left-color:${rarity.color}">
              ${item.image ? `<img class="inv-item-art" src="${item.image}" alt="" decoding="async" loading="lazy">` : ''}<div class="inv-item-info">
                <span class="inv-item-name">${item.name}</span>
                <span class="inv-rarity" style="--rarity-color:${rarity.color}">${rarity.label}</span>
                <span class="inv-compatibility ${compatibility.key}">${compatibility.label}</span>
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
              <div class="inv-actions"><button class="claim-btn ${compatibility.equippable?'ready':'locked'}" style="padding: 4px 10px; width:auto; font-size:10px; font-family:'Cinzel';" data-inventory-equip="${idx}" ${compatibility.equippable?'':'disabled'} title="${compatibility.equippable?'Equipar pieza':compatibility.label}">${compatibility.equippable?'Equipar':'No compatible'}</button><button class="delete-item-btn" data-inventory-delete="${idx}">Eliminar</button></div>
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
    box.querySelectorAll('[data-inventory-equip]').forEach(button=>button.addEventListener('click',()=>equipItemFromInventory(Number(button.dataset.inventoryEquip))));
    box.querySelectorAll('[data-inventory-delete]').forEach(button=>button.addEventListener('click',()=>deleteItemFromInventory(Number(button.dataset.inventoryDelete))));
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
}

function achievementGlyph(id){
  if(id.indexOf('boss')===0) return '♛';
  if(id.indexOf('win')===0) return '⚔';
  if(id.indexOf('reset')===0) return '↻';
  if(id.indexOf('gold')===0) return '◈';
  if(id.indexOf('reach')===0) return '✦';
  return '✧';
}
