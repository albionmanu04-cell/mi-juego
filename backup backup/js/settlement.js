/* ================= SETTLEMENT.JS =================
   EL ASENTAMIENTO: aldea idle en tiempo real. Cuatro edificios (Casa del
   Herrero, Estanque, Mercado y Santuario de Reliquias) que juntan recursos
   solos mientras el jugador no está jugando, con un tope de almacenamiento
   por nivel, y mejoras que tardan minutos/horas reales en completarse.

   Todo se calcula "on demand" a partir de marcas de tiempo guardadas en
   state.settlement (no hay un timer corriendo en segundo plano que deba
   sobrevivir a cerrar la pestaña): cada vez que se necesita saber cuánto
   se acumuló o si una mejora terminó, se compara Date.now() contra la
   marca guardada. Por eso funciona igual si volvés a los 2 minutos o a
   los 2 días.

   El Santuario de Reliquias es distinto a los otros tres: no acumula
   recursos para recolectar, sino que cada nivel suyo da un bonus de combate
   pequeño y PERMANENTE (se suma en getEquipmentBonuses(), en script-math.js,
   así que fluye solo a todas las estadísticas derivadas). Se mejora
   gastando oro + esencia + escamas, no solo oro.
   ================================================================= */

const SETTLEMENT_BUILDINGS = {
  forge: {
    id: 'forge', label: 'Casa del Herrero', icon: '⚒', color: '#e8622c', kind: 'resource',
    flavor: 'Un horno satélite que sigue trabajando la brasa mientras estás fuera. Alimenta directamente tu Herrería.',
    resources: ['essence', 'bossCore'],
    baseCapacity: { essence: 30, bossCore: 2 },
    baseRatePerMin: { essence: 0.5, bossCore: 0.015 },
    upgradeBaseCost: { gold: 250 },
    upgradeBaseMinutes: 4
  },
  pond: {
    id: 'pond', label: 'Estanque', icon: '🐟', color: '#5fb0c2', kind: 'resource',
    flavor: 'Un espejo de agua tranquilo donde los peces y las escamas se juntan solos. Complementa tu Pesca.',
    resources: ['scale', 'gold'],
    baseCapacity: { scale: 15, gold: 150 },
    baseRatePerMin: { scale: 0.25, gold: 3 },
    upgradeBaseCost: { gold: 200 },
    upgradeBaseMinutes: 3
  },
  market: {
    id: 'market', label: 'Mercado', icon: '💰', color: '#e8c477', kind: 'resource',
    flavor: 'Puestos de comerciantes que mueven monedas incluso de noche. Tu mayor fuente de oro pasivo.',
    resources: ['gold'],
    baseCapacity: { gold: 400 },
    baseRatePerMin: { gold: 6 },
    upgradeBaseCost: { gold: 350 },
    upgradeBaseMinutes: 5
  },
  sanctuary: {
    id: 'sanctuary', label: 'Santuario de Reliquias', icon: '🛐', color: '#b98ef0', kind: 'relic',
    flavor: 'No junta recursos: guarda un fragmento de tu poder que jamás se pierde entre expediciones, ni con un Renacimiento.',
    bonusPerLevel: { atk: 1, def: 1, hp: 4, mana: 3, crit: 0.3, critDmg: 0.6 },
    upgradeBaseCost: { gold: 400, essence: 15, scale: 10 },
    upgradeBaseMinutes: 8
  },
  barracks: {
    id: 'barracks', label: 'Cuartel', icon: '🛡', color: '#c25b4a', kind: 'runBonus',
    flavor: 'Veteranos que entrenan a la guardia mientras no estás. Cada nivel aumenta el oro y la experiencia que ganás en cada combate de Cacería.',
    bonusPerLevel: 0.02,
    upgradeBaseCost: { gold: 300, essence: 8 },
    upgradeBaseMinutes: 5
  },
  watchtower: {
    id: 'watchtower', label: 'Torre del Vigía', icon: '🔭', color: '#7fa8c9', kind: 'mapBonus',
    flavor: 'Centinelas que vigilan los caminos. Cada nivel hace que el mapa de Cacería ofrezca más nodos buenos (tesoro, santuario, rastreo, mercader, misterio) en vez de puro combate.',
    bonusPerLevel: 0.5,
    bonusCap: 4,
    upgradeBaseCost: { gold: 300, scale: 8 },
    upgradeBaseMinutes: 5
  }
};

const SETTLEMENT_RESOURCE_META = {
  gold: { label: 'Oro', icon: '🪙', color: '#e8c477' },
  essence: { label: 'Esencia', icon: '✨', color: '#3f7fa8' },
  bossCore: { label: 'Núcleos de jefe', icon: '💀', color: '#e8622c' },
  scale: { label: 'Escamas', icon: '🐟', color: '#5f8a4c' }
};

const SETTLEMENT_FOCUSES = {
  balanced: {
    label:'Equilibrio', icon:'⚖', description:'Producción estable de todos los recursos.',
    multipliers:{ gold:1, essence:1, bossCore:1, scale:1 }
  },
  forge: {
    label:'Industria', icon:'⚒', description:'Prioriza materiales para la Herrería.',
    multipliers:{ gold:.82, essence:1.28, bossCore:1.18, scale:.88 }
  },
  prosperity: {
    label:'Comercio', icon:'🪙', description:'Más oro a cambio de menos materiales.',
    multipliers:{ gold:1.30, essence:.82, bossCore:.82, scale:.86 }
  },
  expedition: {
    label:'Abastecimiento', icon:'🧭', description:'Prioriza escamas y esencia para tus expediciones.',
    multipliers:{ gold:.84, essence:1.12, bossCore:.92, scale:1.28 }
  }
};

const SETTLEMENT_MILESTONES = [
  { level:12, label:'Aldea organizada', description:'+10% capacidad', bonus:{ capacity:.10 } },
  { level:24, label:'Puesto próspero', description:'+10% producción', bonus:{ production:.10 } },
  { level:42, label:'Bastión eterno', description:'-10% tiempo de construcción', bonus:{ buildSpeed:.10 } }
];

/** Ráfaga de chispas dentro de cualquier contenedor con position:relative (reutiliza el mismo .spark que usa el combate, solo que anclado a una tarjeta en vez de al arena). */
function settlementBurst(container, color, amount=12){
  if(!container) return;
  for(let i=0;i<amount;i++){
    const spark = document.createElement('i');
    const angle = Math.random()*Math.PI*2;
    const distance = 16 + Math.random()*40;
    spark.className = 'spark';
    spark.style.color = color;
    spark.style.left = `${38 + Math.random()*24}%`;
    spark.style.top = `${28 + Math.random()*30}%`;
    spark.style.setProperty('--x', `${Math.cos(angle)*distance}px`);
    spark.style.setProperty('--y', `${Math.sin(angle)*distance}px`);
    container.appendChild(spark);
    setTimeout(()=>spark.remove(),700);
  }
}
/** Texto tipo "+N" que flota y se desvanece, anclado a una tarjeta (reutiliza .dmg-float del combate). */
function settlementFloatText(container, text, cls=''){
  if(!container) return;
  const el = document.createElement('div');
  el.className = 'dmg-float settlement-float ' + cls;
  el.textContent = text;
  el.style.left = `${28 + Math.random()*30}%`;
  el.style.setProperty('--jitter-rot', (Math.random()*6-3)+'deg');
  container.appendChild(el);
  setTimeout(()=>el.remove(), 1100);
}

/** Edificios que subieron de nivel y todavía no tuvieron su festejo visual (se drena en renderSettlement, ver más abajo). */
let settlementCelebrateQueue = [];

/**
 * Se asegura de que state.settlement tenga la forma correcta: la crea si
 * no existe (personajes viejos) y rellena cualquier edificio nuevo que se
 * haya agregado al juego después de que ese personaje ya existiera.
 * Se llama al principio de cualquier función de este archivo que toque
 * state.settlement, en vez de depender solo de normalizeState().
 */
function ensureSettlement(){
  if(!state.settlement || typeof state.settlement !== 'object') state.settlement = { buildings: {} };
  if(!state.settlement.buildings) state.settlement.buildings = {};
  if(!SETTLEMENT_FOCUSES[state.settlement.focus]) state.settlement.focus = 'balanced';
  Object.keys(SETTLEMENT_BUILDINGS).forEach(key=>{
    if(!state.settlement.buildings[key]){
      state.settlement.buildings[key] = { level: 1, lastCollect: Date.now(), upgrade: null };
    }
  });
}

function settlementMilestoneBonuses(){
  const total = settlementTotalLevel();
  return SETTLEMENT_MILESTONES.reduce((result, milestone)=>{
    if(total < milestone.level) return result;
    Object.entries(milestone.bonus).forEach(([key,value])=>{ result[key] = (result[key]||0)+value; });
    return result;
  }, { capacity:0, production:0, buildSpeed:0 });
}
function settlementFocusMultiplier(resource){
  ensureSettlement();
  const focus = SETTLEMENT_FOCUSES[state.settlement.focus] || SETTLEMENT_FOCUSES.balanced;
  return finiteNumber(focus.multipliers[resource], 1);
}
function settlementBuildingCapacity(key, level){
  const cfg = SETTLEMENT_BUILDINGS[key];
  const mult = Math.pow(1.28, level-1) * (1+settlementMilestoneBonuses().capacity);
  const out = {};
  Object.entries(cfg.baseCapacity||{}).forEach(([res,val])=>{ out[res] = val*mult; });
  return out;
}
function settlementBuildingRate(key, level){
  const cfg = SETTLEMENT_BUILDINGS[key];
  const mult = Math.pow(1.22, level-1) * (1+settlementMilestoneBonuses().production);
  const out = {};
  Object.entries(cfg.baseRatePerMin||{}).forEach(([res,val])=>{ out[res] = val*mult*settlementFocusMultiplier(res); });
  return out;
}
function settlementUpgradeCost(key, level){
  const cfg = SETTLEMENT_BUILDINGS[key];
  const mult = Math.pow(1.55, level-1);
  const out = {};
  Object.entries(cfg.upgradeBaseCost).forEach(([res,val])=>{ out[res] = Math.round(val*mult); });
  return out;
}
function settlementUpgradeMinutes(key, level){
  const cfg = SETTLEMENT_BUILDINGS[key];
  const reduction = settlementMilestoneBonuses().buildSpeed;
  return Math.max(1, Math.round(cfg.upgradeBaseMinutes * Math.pow(1.35, level-1) * (1-reduction)));
}
function settlementCanAfford(cost){
  return Object.entries(cost).every(([res,amount])=>{
    const have = res==='gold' ? (state.gold||0) : (state.materials[res]||0);
    return have >= amount;
  });
}
function settlementSpend(cost){
  Object.entries(cost).forEach(([res,amount])=>{
    if(res==='gold') state.gold -= amount;
    else state.materials[res] -= amount;
  });
}
function settlementFormatCost(cost){
  return Object.entries(cost).map(([res,amount])=>{
    const meta = SETTLEMENT_RESOURCE_META[res];
    return `${amount} ${meta.icon}`;
  }).join(' · ');
}

function settlementActiveUpgradeKey(){
  ensureSettlement();
  return Object.keys(SETTLEMENT_BUILDINGS).find(key=>state.settlement.buildings[key]?.upgrade) || '';
}

function setSettlementFocus(focusId){
  ensureSettlement();
  if(!SETTLEMENT_FOCUSES[focusId] || state.settlement.focus===focusId) return;
  // Cierra el período anterior antes de cambiar multiplicadores para evitar
  // recalcular retroactivamente horas de producción con el nuevo enfoque.
  Object.keys(SETTLEMENT_BUILDINGS).forEach(key=>{
    const cfg = SETTLEMENT_BUILDINGS[key];
    if(cfg.kind!=='resource') return;
    const accrued = settlementAccrued(key);
    Object.entries(accrued).forEach(([resource,amount])=>applySettlementResource(resource, Math.floor(amount)));
    state.settlement.buildings[key].lastCollect = Date.now();
  });
  state.settlement.focus = focusId;
  saveState();
  render();
  const focus = SETTLEMENT_FOCUSES[focusId];
  showFeedback(`${focus.icon} Decreto de producción`, focus.description, 'success');
  Sound.click();
}

/**
 * El bonus de combate permanente que aporta el Santuario de Reliquias según
 * su nivel actual. Se suma dentro de getEquipmentBonuses() (script-math.js),
 * así que llega solo a maxHP, maxMana, atkDamage, critChance, etc.
 */
function settlementRelicBonus(){
  const empty = { atk:0, def:0, hp:0, mana:0, crit:0, critDmg:0 };
  if(!state || !state.settlement || !state.settlement.buildings || !state.settlement.buildings.sanctuary) return empty;
  const level = state.settlement.buildings.sanctuary.level || 1;
  const per = SETTLEMENT_BUILDINGS.sanctuary.bonusPerLevel;
  const out = {};
  Object.keys(per).forEach(stat=>{ out[stat] = per[stat]*level; });
  return out;
}

/** Fracción extra de oro/experiencia de Cacería que da el Cuartel (0.02 = +2% por nivel). Se usa en combat-battle-core.js. */
function settlementBarracksBonus(){
  if(!state || !state.settlement || !state.settlement.buildings || !state.settlement.buildings.barracks) return 0;
  const level = state.settlement.buildings.barracks.level || 1;
  return SETTLEMENT_BUILDINGS.barracks.bonusPerLevel * level;
}

/** Cuántas copias extra de nodos "buenos" (no combate/élite) suma la Torre del Vigía al bolillero del mapa, con techo para no eliminar el combate del mapa en niveles altos. Se usa en classes.js → makeMapNodes(). */
function settlementWatchtowerBonus(){
  if(!state || !state.settlement || !state.settlement.buildings || !state.settlement.buildings.watchtower) return 0;
  const level = state.settlement.buildings.watchtower.level || 1;
  const cfg = SETTLEMENT_BUILDINGS.watchtower;
  return Math.min(cfg.bonusCap, Math.round(cfg.bonusPerLevel * level));
}

/** Cuánto acumuló un edificio de recursos desde la última vez que se cobró, respetando su tope de almacenamiento. No aplica al Santuario (kind:'relic'). */
function settlementAccrued(key){
  ensureSettlement();
  const cfg = SETTLEMENT_BUILDINGS[key];
  if(cfg.kind!=='resource') return {};
  const b = state.settlement.buildings[key];
  const rate = settlementBuildingRate(key, b.level);
  const capacity = settlementBuildingCapacity(key, b.level);
  const elapsedMin = Math.max(0, (Date.now()-b.lastCollect)/60000);
  const out = {};
  Object.keys(rate).forEach(res=>{
    out[res] = Math.min(capacity[res], elapsedMin*rate[res]);
  });
  return out;
}

function applySettlementResource(res, amount){
  if(amount<=0) return;
  if(res==='gold') state.gold = (state.gold||0)+amount;
  else state.materials[res] = (state.materials[res]||0)+amount;
}

function collectSettlementBuilding(key){
  ensureSettlement();
  resolveSettlementUpgrade(key);
  const accrued = settlementAccrued(key);
  const b = state.settlement.buildings[key];
  const gained = [];
  Object.entries(accrued).forEach(([res,amount])=>{
    const whole = Math.floor(amount);
    if(whole<=0) return;
    applySettlementResource(res, whole);
    gained.push({ res, whole, meta: SETTLEMENT_RESOURCE_META[res] });
  });
  b.lastCollect = Date.now();
  saveState(); render();
  if(gained.length){
    showFeedback('🏠 Recolectado', gained.map(g=>`${g.meta.icon} ${g.whole} ${g.meta.label}`).join(' · '), 'success');
    Sound.reward();
    const card = document.querySelector(`.settlement-card[data-building="${key}"]`);
    if(card){
      settlementBurst(card, SETTLEMENT_BUILDINGS[key].color, 14);
      gained.forEach((g,i)=>setTimeout(()=>settlementFloatText(card, `+${g.whole} ${g.meta.icon}`), i*140));
    }
  }
}

function collectAllSettlement(){
  ensureSettlement();
  const collectedByBuilding = {};
  Object.keys(state.settlement.buildings).forEach(key=>{
    resolveSettlementUpgrade(key);
    const accrued = settlementAccrued(key);
    const b = state.settlement.buildings[key];
    const gained = [];
    Object.entries(accrued).forEach(([res,amount])=>{
      const whole = Math.floor(amount);
      if(whole<=0) return;
      applySettlementResource(res, whole);
      gained.push({ res, whole, meta: SETTLEMENT_RESOURCE_META[res] });
    });
    b.lastCollect = Date.now();
    if(gained.length) collectedByBuilding[key] = gained;
  });
  saveState(); render();
  if(Object.keys(collectedByBuilding).length){
    Sound.reward();
    Object.entries(collectedByBuilding).forEach(([key,gained])=>{
      const card = document.querySelector(`.settlement-card[data-building="${key}"]`);
      if(card){
        settlementBurst(card, SETTLEMENT_BUILDINGS[key].color, 10);
        gained.forEach((g,i)=>setTimeout(()=>settlementFloatText(card, `+${g.whole} ${g.meta.icon}`), i*140));
      }
    });
  }
}

function startSettlementUpgrade(key){
  ensureSettlement();
  resolveSettlementUpgrade(key);
  const b = state.settlement.buildings[key];
  if(b.upgrade) return;
  const activeUpgrade = settlementActiveUpgradeKey();
  if(activeUpgrade && activeUpgrade!==key){
    showFeedback('Constructor ocupado', `${SETTLEMENT_BUILDINGS[activeUpgrade].label} todavía está mejorándose.`, 'danger');
    return;
  }
  const cost = settlementUpgradeCost(key, b.level);
  if(!settlementCanAfford(cost)){ showFeedback('Recursos insuficientes', `Necesitás ${settlementFormatCost(cost)}`, 'danger'); return; }
  settlementSpend(cost);
  const minutes = settlementUpgradeMinutes(key, b.level);
  b.upgrade = { startedAt: Date.now(), durationMs: minutes*60000 };
  Sound.click();
  saveState(); render();
}

/** Si la mejora de este edificio ya terminó, la aplica (sube de nivel), avisa con un toast + sonido, encola su festejo visual y devuelve true. */
function resolveSettlementUpgrade(key){
  ensureSettlement();
  const b = state.settlement.buildings[key];
  if(b.upgrade && Date.now() >= b.upgrade.startedAt + b.upgrade.durationMs){
    b.level += 1;
    b.upgrade = null;
    const cfg = SETTLEMENT_BUILDINGS[key];
    showFeedback('🏗 Mejora completa', `${cfg.label} llegó a Nivel ${b.level}`, 'success');
    Sound.levelUp();
    settlementCelebrateQueue.push(key);
    return true;
  }
  return false;
}
/** Revisa los edificios y aplica cualquier mejora que haya terminado mientras el jugador no miraba. */
function resolveAllSettlementUpgrades(){
  ensureSettlement();
  let any = false;
  Object.keys(state.settlement.buildings).forEach(key=>{ if(resolveSettlementUpgrade(key)) any = true; });
  if(any) saveState();
}

function settlementTotalLevel(){
  ensureSettlement();
  return Object.values(state.settlement.buildings).reduce((sum,b)=>sum+b.level,0);
}

function settlementFormatDuration(ms){
  const totalSec = Math.max(0, Math.ceil(ms/1000));
  const h = Math.floor(totalSec/3600);
  const m = Math.floor((totalSec%3600)/60);
  const s = totalSec%60;
  if(h>0) return `${h}h ${m}m`;
  if(m>0) return `${m}m ${s}s`;
  return `${s}s`;
}

let settlementTickTimer = null;
/** Refresca la vista cada 1s mientras la pestaña del Asentamiento está abierta, para que las barras y cuentas regresivas se vean vivas sin tener que tocar nada. Se apaga solo cuando cambiás de pestaña. */
function settlementEnsureTick(){
  if(settlementTickTimer) return;
  settlementTickTimer = setInterval(()=>{
    const sec = document.getElementById('secSettlement');
    if(!sec || !sec.classList.contains('active')){
      clearInterval(settlementTickTimer);
      settlementTickTimer = null;
      return;
    }
    renderSettlement(true);
  }, 1000);
}

function settlementUpgradeBlock(key, b){
  const cfg = SETTLEMENT_BUILDINGS[key];
  if(b.upgrade){
    const remaining = (b.upgrade.startedAt+b.upgrade.durationMs) - Date.now();
    const total = b.upgrade.durationMs;
    const progressPct = Math.min(100, ((total-remaining)/total)*100);
    return `<div class="settlement-upgrade-bar"><i style="width:${progressPct}%"></i></div>
      <button class="settlement-upgrade-btn building" disabled>⏳ Mejorando… ${settlementFormatDuration(remaining)}</button>`;
  }
  const cost = settlementUpgradeCost(key, b.level);
  const minutes = settlementUpgradeMinutes(key, b.level);
  const affordable = settlementCanAfford(cost);
  const activeUpgrade = settlementActiveUpgradeKey();
  const builderBusy = activeUpgrade && activeUpgrade!==key;
  return `<button class="settlement-upgrade-btn" ${affordable&&!builderBusy?'':'disabled'} onclick="startSettlementUpgrade('${key}')">
    ${builderBusy?'🔒 Constructor ocupado':`⬆ Mejorar a Nv. ${b.level+1} · ${settlementFormatCost(cost)} · ${settlementFormatDuration(minutes*60000)}`}
  </button>`;
}

const SETTLEMENT_STAT_LABELS = { atk:'Ataque', def:'Defensa', hp:'Vida', mana:'Maná', crit:'Crítico', critDmg:'D. Crítico' };
/** Línea de "bonus actual" para una tarjeta que no junta recursos (relic/runBonus/mapBonus). */
function settlementSpecialBonusLine(cfg, b){
  if(cfg.kind==='relic'){
    const bonus = settlementRelicBonus();
    return Object.entries(bonus).filter(([,v])=>v>0)
      .map(([stat,v])=>`+${stat==='crit'||stat==='critDmg'?v.toFixed(1)+'%':Math.round(v)} ${SETTLEMENT_STAT_LABELS[stat]}`)
      .join(' · ');
  }
  if(cfg.kind==='runBonus'){
    return `+${Math.round(settlementBarracksBonus()*100)}% oro y experiencia en combates de Cacería`;
  }
  if(cfg.kind==='mapBonus'){
    const extra = settlementWatchtowerBonus();
    return `+${extra} nodo${extra===1?'':'s'} bueno${extra===1?'':'s'} extra en cada tramo del mapa`;
  }
  return '';
}
/** Rango visual del edificio según su nivel: cambia el marco del ícono para que la aldea "se vea" más avanzada, no solo el número. */
function settlementTier(level){
  if(level>=10) return { cls:'tier-3', label:'RANGO ORO', badge:'✦' };
  if(level>=5) return { cls:'tier-2', label:'RANGO PLATA', badge:'❖' };
  return { cls:'tier-1', label:null, badge:'' };
}

function settlementSpecialCard(key, b, reveal){
  const cfg = SETTLEMENT_BUILDINGS[key];
  const tier = settlementTier(b.level);
  return `<div class="settlement-card settlement-card-relic ${reveal?'reveal':''}" data-building="${key}" style="--b-color:${cfg.color}">
    <div class="settlement-card-head">
      <span class="settlement-card-icon ${tier.cls}">${cfg.icon}${tier.badge?`<i class="settlement-tier-badge">${tier.badge}</i>`:''}</span>
      <div class="settlement-card-title"><h4>${cfg.label}</h4><small>NIVEL ${b.level}${tier.label?` · ${tier.label}`:''}</small></div>
    </div>
    <p class="settlement-card-flavor">${cfg.flavor}</p>
    <div class="settlement-relic-bonus">${settlementSpecialBonusLine(cfg, b)}</div>
    ${settlementUpgradeBlock(key, b)}
  </div>`;
}

function settlementResourceCard(key, b, reveal){
  const cfg = SETTLEMENT_BUILDINGS[key];
  const tier = settlementTier(b.level);
  const capacity = settlementBuildingCapacity(key, b.level);
  const accrued = settlementAccrued(key);
  const resourceRows = cfg.resources.map(res=>{
    const meta = SETTLEMENT_RESOURCE_META[res];
    const cap = capacity[res];
    const have = accrued[res];
    const pct = cap>0 ? Math.min(100, (have/cap)*100) : 0;
    const full = pct>=99.5;
    return `<div class="settlement-res-row">
      <span class="settlement-res-label">${meta.icon} ${meta.label}</span>
      <div class="settlement-res-bar"><i style="width:${pct}%; background:${meta.color}"></i></div>
      <span class="settlement-res-val ${full?'full':''}">${Math.floor(have)}/${Math.floor(cap)}</span>
    </div>`;
  }).join('');
  const canCollect = cfg.resources.some(res=>Math.floor(accrued[res])>0);
  return `<div class="settlement-card ${canCollect?'ready':''} ${reveal?'reveal':''}" data-building="${key}" style="--b-color:${cfg.color}">
    <div class="settlement-card-head">
      <span class="settlement-card-icon ${tier.cls}">${cfg.icon}${tier.badge?`<i class="settlement-tier-badge">${tier.badge}</i>`:''}</span>
      <div class="settlement-card-title"><h4>${cfg.label}</h4><small>NIVEL ${b.level}${tier.label?` · ${tier.label}`:''}</small></div>
    </div>
    <p class="settlement-card-flavor">${cfg.flavor}</p>
    ${resourceRows}
    <button class="settlement-collect-btn" ${canCollect?'':'disabled'} onclick="collectSettlementBuilding('${key}')">${canCollect?'✋ Recolectar':'Nada para recolectar'}</button>
    ${settlementUpgradeBlock(key, b)}
  </div>`;
}

function settlementProductionPerHour(){
  ensureSettlement();
  const totals = {};
  Object.entries(SETTLEMENT_BUILDINGS).forEach(([key,cfg])=>{
    if(cfg.kind!=='resource') return;
    const rate = settlementBuildingRate(key, state.settlement.buildings[key].level);
    Object.entries(rate).forEach(([resource,value])=>{ totals[resource]=(totals[resource]||0)+(value*60); });
  });
  return totals;
}

function settlementOverview(){
  ensureSettlement();
  const totalLevel = settlementTotalLevel();
  const activeFocus = state.settlement.focus || 'balanced';
  const rates = settlementProductionPerHour();
  const activeUpgrade = settlementActiveUpgradeKey();
  const nextMilestone = SETTLEMENT_MILESTONES.find(milestone=>totalLevel<milestone.level);
  const previousLevel = [...SETTLEMENT_MILESTONES].reverse().find(milestone=>totalLevel>=milestone.level)?.level || 6;
  const targetLevel = nextMilestone?.level || totalLevel;
  const progress = nextMilestone ? Math.max(0,Math.min(100,((totalLevel-previousLevel)/(targetLevel-previousLevel))*100)) : 100;
  const rateCards = Object.entries(rates).map(([resource,value])=>{
    const meta = SETTLEMENT_RESOURCE_META[resource];
    const amount = value<10 ? value.toFixed(1) : Math.round(value);
    return `<span style="--resource-color:${meta.color}"><i>${meta.icon}</i><b>+${amount}/h</b><small>${meta.label}</small></span>`;
  }).join('');
  const focusButtons = Object.entries(SETTLEMENT_FOCUSES).map(([id,focus])=>`
    <button class="${activeFocus===id?'active':''}" onclick="setSettlementFocus('${id}')" title="${focus.description}">
      <i>${focus.icon}</i><b>${focus.label}</b><small>${focus.description}</small>
    </button>`).join('');
  const milestones = SETTLEMENT_MILESTONES.map(milestone=>`
    <span class="${totalLevel>=milestone.level?'unlocked':nextMilestone===milestone?'next':''}">
      <b>${totalLevel>=milestone.level?'✓':'Nv. '+milestone.level}</b>
      <small>${milestone.label} · ${milestone.description}</small>
    </span>`).join('');
  return `<section class="settlement-overview">
    <div class="settlement-overview-head">
      <div><small>PRODUCCIÓN DEL DOMINIO</small><h3>Tu asentamiento sigue trabajando</h3></div>
      <span class="settlement-builder ${activeUpgrade?'busy':''}">${activeUpgrade?`🏗 Mejorando ${SETTLEMENT_BUILDINGS[activeUpgrade].label}`:'🔨 Constructor disponible'}</span>
    </div>
    <div class="settlement-rate-grid">${rateCards}</div>
    <div class="settlement-focus">
      <div><small>DECRETO ACTIVO</small><b>Elegí qué necesita producir tu aldea</b></div>
      <div class="settlement-focus-options">${focusButtons}</div>
    </div>
    <div class="settlement-milestone">
      <div class="settlement-milestone-copy"><small>DESARROLLO DEL POBLADO</small><b>${nextMilestone?`Próximo hito: ${nextMilestone.label} en nivel ${nextMilestone.level}`:'Todos los hitos completados'}</b></div>
      <div class="settlement-milestone-track"><i style="width:${progress}%"></i></div>
      <div class="settlement-milestone-list">${milestones}</div>
    </div>
  </section>`;
}

/**
 * Dibuja la pantalla de El Asentamiento en #settlementContent: una tarjeta
 * por edificio. Los edificios de recursos muestran barras de almacenamiento
 * y un botón de cobrar; el Santuario de Reliquias muestra su bonus
 * permanente actual en su lugar.
 *
 * `fromTick` es true cuando llama el refresco automático de 1s (ver
 * settlementEnsureTick): en ese caso NO se dispara la animación de entrada
 * de las tarjetas, porque si no, con el DOM reconstruyéndose cada segundo,
 * las tarjetas sin barra que cambie a la vista (Santuario, Cuartel, Torre)
 * quedarían "titilando" sin parar. La animación de entrada solo se ve la
 * primera vez que se abre la pestaña o justo después de recolectar/mejorar.
 */
function renderSettlement(fromTick){
  ensureSettlement();
  resolveAllSettlementUpgrades();
  const box = document.getElementById('settlementContent');
  if(!box) return;
  const badge = document.getElementById('settlementLevelBadge');
  if(badge) badge.textContent = `NIVEL ${settlementTotalLevel()}`;

  const reveal = !fromTick;
  box.innerHTML = settlementOverview()+`<div class="settlement-buildings">`+Object.keys(SETTLEMENT_BUILDINGS).map(key=>{
    const cfg = SETTLEMENT_BUILDINGS[key];
    const b = state.settlement.buildings[key];
    return cfg.kind==='resource' ? settlementResourceCard(key,b,reveal) : settlementSpecialCard(key,b,reveal);
  }).join('')+`</div>`;

  if(settlementCelebrateQueue.length){
    settlementCelebrateQueue.forEach(key=>{
      const card = box.querySelector(`[data-building="${key}"]`);
      if(card){
        settlementBurst(card, 'var(--gold-bright)', 22);
        card.classList.add('leveled');
        setTimeout(()=>card.classList.remove('leveled'), 900);
      }
    });
    settlementCelebrateQueue = [];
  }

  settlementEnsureTick();
}
