/* =========================================================================
   FISHING.JS — Minijuego de pesca (lanzamiento, picada, y captura con barra
   vertical al estilo "mantené la barra sobre el pez").
   Depende de: classes.js (state, currentClass, etc.), sound.js (Sound)
   Debe cargarse DESPUÉS de classes.js.
   ========================================================================= */

/* ================= PESCA ================= */
// IMPORTANTE: "key" identifica la RAREZA (se repite entre peces: puede haber
// varias especies "rare", varias "epic", etc.). "id" identifica a la ESPECIE
// puntual y debe ser único en toda la tabla — es lo que usa el Vivero (dex)
// para saber qué pez en particular pescaste. No uses "key" para trackear
// progreso individual de especies: como se repite entre peces, agruparía
// especies distintas como si fueran la misma.
const FISH_TABLE = [
  { id:'pejerrey',  key:'common',    label:'Pejerrey Común',   icon:'🐟', weight:50, essence:1,  gold:8,   scale:0, sizeMin:0.2, sizeMax:1.1 },
  { id:'trucha',    key:'uncommon',  label:'Trucha Plateada',  icon:'🐠', weight:27, essence:2,  gold:18,  scale:1, sizeMin:0.6, sizeMax:2.4 },
  { id:'dorado',    key:'rare',      label:'Dorado de Río',    icon:'🐡', weight:14, essence:4,  gold:42,  scale:2, sizeMin:1.5, sizeMax:5.2 },
  { id:'calamar',   key:'rare',      label:'Calamar Luminoso', icon:'🦑', weight:12, essence:5,  gold:55,  scale:3, sizeMin:2.0, sizeMax:6.5 },
  { id:'serpiente', key:'epic',      label:'Serpiente Abisal', icon:'🐍', weight:6,  essence:8,  gold:95,  scale:4, sizeMin:4,   sizeMax:12  },
  { id:'lubina',    key:'epic',      label:'Lubina de Magma',  icon:'🦐', weight:5,  essence:10, gold:120, scale:4, sizeMin:3.5, sizeMax:9.0 },
  { id:'tortuga',   key:'epic',      label:'Tortuga Coraza de Hierro', icon:'🐢', weight:4, essence:12, gold:150, scale:5, sizeMin:5.0, sizeMax:15.0 },
  { id:'leviatan',  key:'legendary', label:'Leviatán Menor',   icon:'🐋', weight:1,  essence:16, gold:230, scale:8, sizeMin:10,  sizeMax:38  },
  { id:'dragon',    key:'legendary', label:'Dragón de las Olas', icon:'🐉', weight:1, essence:20, gold:300, scale:9, sizeMin:12, sizeMax:45 },
  { id:'tiburon',   key:'legendary', label:'Gran Tiburón Blanco', icon:'🦈', weight:1, essence:25, gold:380, scale:10, sizeMin:15, sizeMax:50 }
];
const FISH_RARITY_RANK = { common:0, uncommon:1, rare:2, epic:3, legendary:4, mythic:5 };
const FISH_COLORS = { common:'#9fb4c7', uncommon:'#7fd1a5', rare:'#5aa9ff', epic:'#c58bff', legendary:'#f6c965', mythic:'#5be3c9' };

// Pez evento: no forma parte del vivero (FISH_TABLE) ni de su recompensa de
// completitud — es un bonus aparte, reservado a zonas avanzadas y a que se
// den ciertas condiciones de clima/hora a la vez. Le da un motivo concreto
// para estar pescando en el momento justo, no solo en la zona justa.
const EVENT_FISH = { id:'kraken', key:'mythic', label:'Kraken Juvenil', icon:'🐙', essence:30, gold:520, scale:15, sizeMin:14, sizeMax:46 };
const EVENT_FISH_CHANCE = 0.08; // chance por picada normal, solo en zonas habilitadas y con la condición activa

/* ================= REQUISITOS Y CONDICIONES GENERALES ================= */
function eventFishActive(){ return isNightTime() && currentWeather().key==='rain'; }

// Recompensa única por completar el dex (atrapar las 5 especies al menos una
// vez). Además de un pago de materiales, otorga una mejora pasiva permanente
// ("Pescador Maestro"): espera de picada más corta y mejor calidad de tirada.
const DEX_COMPLETE_REWARD = { gold:400, essence:25, scale:20 };
const DEX_MASTERY_WAIT_MULT = 0.92;
const DEX_MASTERY_QUALITY_BONUS = 0.05;
function isDexComplete(){
  if(!state.fishing || !state.fishing.dex) return false;
  return FISH_TABLE.every(f => (state.fishing.dex[f.id]||0) > 0);
}

// Zonas de pesca: cada una se desbloquea con el nivel de caña y limita qué
// especies pueden aparecer, dándole sentido de progresión a mejorar la caña.
const FISH_ZONES = [
  { key:'pond',   label:'Estanque',      icon:'🎣', rodReq:1, allowedKeys:['common','uncommon','rare'],           desc:'El Estanque del Forjador. Aguas tranquilas junto a la forja — ideal para empezar.' },
  { key:'river',  label:'Río',           icon:'🌊', rodReq:2, allowedKeys:['uncommon','rare','epic'],             desc:'El Río Correntoso. Corriente fuerte y peces más grandes que en el estanque.' },
  { key:'depths', label:'Abismo',        icon:'🌑', rodReq:4, allowedKeys:['rare','epic','legendary'],            desc:'Las Aguas Profundas. Reservadas para cañas avanzadas — ahí nadan los más grandes.', eventEligible:true },
  { key:'sea',    label:'Mar Abierto',   icon:'⛵', rodReq:5, allowedKeys:['epic','legendary'],                   desc:'El Mar Abierto. Más allá del Abismo — solo una caña perfeccionada aguanta esta corriente. En noches de tormenta, algo más grande ronda por acá.', eventEligible:true },
];
/* ================= ZONAS Y CLIMA ================= */
function zoneDef(key){ return FISH_ZONES.find(z=>z.key===key) || FISH_ZONES[0]; }
// Detalle ambiental por zona: cada una tiene su propia combinación de
// burbujas y peces-sombra de fondo para que la escena se sienta viva incluso
// sin interactuar. No afecta la mecánica, es puramente decorativo.
function zoneAmbience(key){
  if(key==='river'){
    return `<div class="fish-bubbles zone-river"><i></i><i></i><i></i></div>
      <div class="fish-current"><i></i><i></i><i></i></div>
      <span class="fish-shadow river s1">🐟</span><span class="fish-shadow river s2">🐠</span><span class="fish-shadow river s3">🐟</span>`;
  }
  if(key==='depths'){
    return `<div class="fish-bubbles zone-depths"><i></i><i></i><i></i><i></i></div>
      <span class="fish-mote m1"></span><span class="fish-mote m2"></span><span class="fish-mote m3"></span>`;
  }
  if(key==='sea'){
    return `<div class="fish-bubbles zone-sea"><i></i><i></i><i></i></div>
      <div class="fish-swell"><i></i><i></i></div>
      <span class="fish-shadow sea s1">🐋</span><span class="fish-shadow sea s2">🐟</span>`;
  }
  return `<div class="fish-bubbles zone-pond"><i></i><i></i><i></i></div>
    <span class="fish-shadow pond s1">🐟</span><span class="fish-shadow pond s2">🐠</span>`;
}
function currentZoneKey(){ return (state.fishing && state.fishing.zone) || 'pond'; }
function zoneUnlocked(key){
  const rodLvl = (state.fishing && state.fishing.rodLevel) || 1;
  return rodLvl >= zoneDef(key).rodReq;
}
function zonePool(key){
  const z = zoneDef(key);
  const pool = FISH_TABLE.filter(f=>z.allowedKeys.includes(f.key));
  return pool.length ? pool : FISH_TABLE;
}
function setFishZone(key){
  if(!state || fishingLocked() || fishCast) return;
  if(!zoneUnlocked(key)){
    showFeedback('ZONA BLOQUEADA', `Necesitás caña nivel ${zoneDef(key).rodReq} para pescar acá.`, 'danger');
    return;
  }
  if(state.fishing.zone === key) return;
  state.fishing.zone = key;
  Sound.click();
  saveState();
  renderFishing();
}
const GOLDEN_BITE_CHANCE = 0.07; // pesca dorada: rara, riesgosa, gran recompensa
const STREAK_MILESTONES = [5,10,15,20,25,30];
function nextStreakMilestone(streak){ return STREAK_MILESTONES.find(m=>m>streak) || null; }

// Cebos: consumibles comprados con recursos que ya genera la pesca (oro, esencia,
// escamas). Se consumen al lanzar la línea y afectan la espera, la calidad del
// pez que pica y la chance de pesca dorada.
const BAIT_TABLE = [
  { key:'worm',         label:'Lombriz',        icon:'🪱', cost:{gold:15},               waitMult:0.7,  qualityBonus:0,    goldenBonus:0,    desc:'Cebo básico y barato. Acorta bastante la espera antes de que pique.' },
  { key:'essence_lure',  label:'Cebo de Esencia', icon:'🧪', cost:{gold:40, essence:3},    waitMult:1,    qualityBonus:0.18, goldenBonus:0,    desc:'Impregnado en esencia mágica. Atrae peces de mejor calidad dentro de la zona.' },
  { key:'scale_lure',    label:'Cebo de Escamas', icon:'✨', cost:{gold:60, scale:5},      waitMult:1.1,  qualityBonus:0.05, goldenBonus:0.12, desc:'Hecho con escamas raras. Mucha más chance de que sea pesca dorada.' },
];
function baitDef(key){ return BAIT_TABLE.find(b=>b.key===key) || null; }
function baitOwned(key){ return (state.fishing.baits && state.fishing.baits[key]) || 0; }
function activeBaitId(){ return state.fishing.activeBait || null; }
function formatBaitCost(bait){
  const parts=[];
  if(bait.cost.gold) parts.push(`${bait.cost.gold} oro`);
  if(bait.cost.essence) parts.push(`${bait.cost.essence} esencia`);
  if(bait.cost.scale) parts.push(`${bait.cost.scale} escamas`);
  return parts.join(' · ');
}
function affordBait(bait){
  const c = bait.cost;
  return state.gold>=(c.gold||0) && (state.materials.essence||0)>=(c.essence||0) && (state.materials.scale||0)>=(c.scale||0);
}

// Clima y hora del día: modificador liviano sobre la dificultad por rareza que
// ya existe (espera, ventana de mordida, sesgo de calidad). No agrega tablas
// nuevas de peces ni desbloqueos — solo reescala números que ya se calculan.
const NIGHT_START_HOUR = 20; // 20:00
const NIGHT_END_HOUR = 6;    // 06:00
const NIGHT_QUALITY_BONUS = 0.12; // de noche, sesgo extra hacia peces raros
const NIGHT_GOLDEN_BONUS = 0.02;  // de noche, algo más de chance de pesca dorada
function isNightTime(){
  const h = new Date().getHours();
  return h >= NIGHT_START_HOUR || h < NIGHT_END_HOUR;
}
const WEATHER_TABLE = [
  { key:'clear', label:'Despejado', icon:'☀️', weight:70 },
  { key:'rain',  label:'Lluvia',    icon:'🌧️', weight:30 },
];
const RAIN_BITE_WINDOW_MULT = 1.25; // con lluvia, ventana de mordida más generosa
const RAIN_WAIT_MULT = 0.85;        // con lluvia, pican un poco más rápido
const WEATHER_MIN_DURATION_MS = 6*60*1000;
const WEATHER_MAX_DURATION_MS = 14*60*1000;
function weatherDef(key){ return WEATHER_TABLE.find(w=>w.key===key) || WEATHER_TABLE[0]; }
function currentWeather(){
  if(!state || !state.fishing) return WEATHER_TABLE[0];
  let w = state.fishing.weather;
  if(!w || !w.until || Date.now() > w.until){
    const total = WEATHER_TABLE.reduce((sum,opt)=>sum+opt.weight,0);
    let roll = Math.random()*total;
    let picked = WEATHER_TABLE[0];
    for(const opt of WEATHER_TABLE){ roll -= opt.weight; if(roll<=0){ picked = opt; break; } }
    w = { key: picked.key, until: Date.now() + WEATHER_MIN_DURATION_MS + Math.random()*(WEATHER_MAX_DURATION_MS-WEATHER_MIN_DURATION_MS) };
    state.fishing.weather = w;
    saveState();
  }
  return weatherDef(w.key);
}
// Chip informativo: solo se muestra cuando hay una condición activa que
// favorece la pesca, para no ensuciar la pantalla en condiciones normales.
function conditionsBadgeHTML(zoneKey){
  const badges = [];
  if(isNightTime()) badges.push(`<span class="fish-cond night">🌙 Noche · más peces raros</span>`);
  if(currentWeather().key==='rain') badges.push(`<span class="fish-cond rain">🌧️ Lluvia · mordida más generosa</span>`);
  const z = zoneDef(zoneKey);
  if(z && z.eventEligible && eventFishActive()) badges.push(`<span class="fish-cond event">🐙 Posible captura mítica</span>`);
  if(!badges.length) return '';
  return `<div class="fish-conditions-row">${badges.join('')}</div>`;
}

/* ================= CEBOS Y CAÑA ================= */
function buyBait(key){
  if(!state || fishingLocked() || fishCast) return;
  const bait = baitDef(key);
  if(!bait) return;
  if(!affordBait(bait)){ showFeedback('RECURSOS INSUFICIENTES', `Necesitás ${formatBaitCost(bait)}.`, 'danger'); return; }
  state.gold -= (bait.cost.gold||0);
  state.materials.essence = (state.materials.essence||0) - (bait.cost.essence||0);
  state.materials.scale = (state.materials.scale||0) - (bait.cost.scale||0);
  state.fishing.baits[key] = (state.fishing.baits[key]||0) + 1;
  Sound.reward();
  addLog(`${bait.icon} Compraste ${bait.label}.`, 'reward');
  saveState();
  renderFishing();
}
function setActiveBait(key){
  if(!state || fishingLocked() || fishCast) return;
  if(key && baitOwned(key)<=0) return;
  state.fishing.activeBait = key || null;
  Sound.click();
  saveState();
  renderFishing();
}

// Dificultad de la barra de captura según la rareza del pez que picó.
const FISH_BAR_DIFFICULTY = {
  common:    { barSize:44, critterSpeed:15, retargetMin:750, retargetMax:1500 },
  uncommon:  { barSize:37, critterSpeed:20, retargetMin:620, retargetMax:1250 },
  rare:      { barSize:31, critterSpeed:27, retargetMin:520, retargetMax:1050 },
  epic:      { barSize:25, critterSpeed:35, retargetMin:420, retargetMax:880 },
  legendary: { barSize:20, critterSpeed:46, retargetMin:340, retargetMax:720 },
};

function fishingLocked(){ return !!(battle || (runState && runState.phase!=='ended')); }
function rodMaxLevel(){ return 5; }
function rodUpgradeCost(){
  const lvl = (state.fishing && state.fishing.rodLevel) || 1;
  return { gold: 180 + (lvl-1)*260 };
}
function upgradeRod(){
  if(!state || fishingLocked()) return;
  const lvl = state.fishing.rodLevel||1;
  if(lvl>=rodMaxLevel()) return;
  const cost = rodUpgradeCost();
  if(state.gold<cost.gold){ showFeedback('ORO INSUFICIENTE',`Necesitás ${cost.gold} oro.`,'danger'); return; }
  state.gold -= cost.gold;
  state.fishing.rodLevel = lvl+1;
  Sound.reward();
  addLog(`🎣 Mejoraste tu caña a nivel ${state.fishing.rodLevel}.`,'level');
  showFeedback('CAÑA MEJORADA', `Nivel ${state.fishing.rodLevel} · barra de captura más grande y mejor reacción`, 'reward');
  saveState();
  renderFishing();
}
/* ================= LANZAR Y ENGANCHAR (casteo y mordida) ================= */
function isCurrentFishCast(ref){ return !!ref && fishCast===ref && !ref.ended; }

/* ---- Fase 1: lanzamiento con medidor de potencia (mantener y soltar) ---- */
function startCastCharge(){
  if(!state || fishingLocked()){ showFeedback('CACERÍA ACTIVA','Terminá la expedición antes de pescar.','danger'); return; }
  if(fishCast) return;
  const ref = { id:++fishCastSeq, phase:'charging', ended:false, power:0, startedAt:performance.now() };
  fishCast = ref;
  Sound.click();
  renderFishing();
  animateCastPower(ref);
}
function animateCastPower(ref){
  if(!isCurrentFishCast(ref) || ref.phase!=='charging') return;
  const elapsed = (performance.now()-ref.startedAt)/1000;
  // Oscila 0-100 en ida y vuelta; ciclo ~1.3s
  const cyclePos = (elapsed % 1.3)/1.3;
  ref.power = cyclePos<0.5 ? cyclePos*200 : (1-cyclePos)*200;
  const fill = document.getElementById('fishPowerFill');
  if(fill) fill.style.width = `${Math.max(0,Math.min(100,ref.power))}%`;
  fishCastFrame = requestAnimationFrame(()=>animateCastPower(ref));
}
function releaseCast(){
  if(!fishCast || fishCast.phase!=='charging') return;
  const ref = fishCast;
  if(fishCastFrame){ cancelAnimationFrame(fishCastFrame); fishCastFrame=null; }
  ref.castPower = Math.round(ref.power);
  ref.phase = 'waiting';
  // Consumir el cebo activo (si queda alguno) al momento de tirar la línea.
  const baitKey = (state.fishing.activeBait && baitOwned(state.fishing.activeBait)>0) ? state.fishing.activeBait : null;
  ref.baitId = baitKey;
  if(baitKey){
    state.fishing.baits[baitKey] = Math.max(0, (state.fishing.baits[baitKey]||0) - 1);
    if(state.fishing.baits[baitKey]<=0) state.fishing.activeBait = null;
    saveState();
  }
  const bait = baitKey ? baitDef(baitKey) : null;
  Sound.click();
  renderFishing();
  // Mejor potencia = caña llega a mejor lugar = menos espera
  const powerBonus = ref.castPower/100; // 0..1
  const masteryMult = state.fishing.dexRewardClaimed ? DEX_MASTERY_WAIT_MULT : 1;
  const weatherWaitMult = currentWeather().key==='rain' ? RAIN_WAIT_MULT : 1;
  const delay = ((1600 - powerBonus*700) + Math.random()*1400) * (bait?bait.waitMult:1) * masteryMult * weatherWaitMult;
  ref.waitTimer = setTimeout(()=>beginBite(ref), Math.max(400,delay));
}
function cancelCastCharge(){
  if(!fishCast || fishCast.phase!=='charging') return;
  if(fishCastFrame){ cancelAnimationFrame(fishCastFrame); fishCastFrame=null; }
  fishCast.ended = true;
  fishCast = null;
  renderFishing();
}
function beginBite(ref){
  if(!isCurrentFishCast(ref) || ref.phase!=='waiting') return;
  ref.phase = 'bite';
  const rodLvl = (state.fishing && state.fishing.rodLevel) || 1;
  const bait = ref.baitId ? baitDef(ref.baitId) : null;
  const night = isNightTime();
  const weatherRain = currentWeather().key==='rain';
  const goldenChance = GOLDEN_BITE_CHANCE + (bait?bait.goldenBonus:0) + (night?NIGHT_GOLDEN_BONUS:0);
  ref.golden = Math.random() < goldenChance;
  const weatherBiteMult = weatherRain ? RAIN_BITE_WINDOW_MULT : 1;
  ref.biteWindow = (ref.golden ? Math.max(380, 620 - (rodLvl-1)*40) : Math.max(520, 950 - (rodLvl-1)*70)) * weatherBiteMult;
  Sound.hit();
  if(ref.golden && navigator.vibrate){ try{ navigator.vibrate([50,60,50]); }catch(e){} }
  renderFishing();
  ref.missTimer = setTimeout(()=>missBite(ref), ref.biteWindow);
}
function missBite(ref){
  if(!isCurrentFishCast(ref) || ref.phase!=='bite') return;
  ref.ended = true;
  fishCast = null;
  if(ref.golden){
    addLog('✨ La pesca dorada escapó — era arriesgada.', 'combat');
    showFeedback('¡SE ESCAPÓ LA DORADA!', 'Reaccionaste tarde en la más riesgosa. Probá de nuevo.', 'danger');
  } else {
    addLog('🎣 El pez soltó el anzuelo — reaccionaste tarde.', 'combat');
    showFeedback('SE ESCAPÓ', 'Reaccionaste tarde. Probá de nuevo.', 'danger');
  }
  renderFishing();
}

/* ---- Fase 2: captura con barra vertical (mantené la barra sobre el pez) ---- */
function rollHookedFish(ref){
  const rodLvl = (state.fishing && state.fishing.rodLevel) || 1;
  const zone = zoneDef(currentZoneKey());
  const pool = zonePool(currentZoneKey());
  const bait = ref.baitId ? baitDef(ref.baitId) : null;
  if(ref.golden){
    const goldenPool = pool.filter(f=>FISH_RARITY_RANK[f.key]>=3);
    return goldenPool[Math.floor(Math.random()*goldenPool.length)] || pool[pool.length-1];
  }
  if(zone.eventEligible && eventFishActive() && Math.random() < EVENT_FISH_CHANCE){
    return EVENT_FISH;
  }
  // Mejor caña, mejor cebo, la maestría del vivero y la noche = sesgo hacia peces más raros dentro de la zona.
  const masteryBonus = state.fishing.dexRewardClaimed ? DEX_MASTERY_QUALITY_BONUS : 0;
  const nightBonus = isNightTime() ? NIGHT_QUALITY_BONUS : 0;
  const baseQuality = Math.max(0, Math.min(1, 0.32 + (rodLvl-1)*0.07 + (bait?bait.qualityBonus:0) + masteryBonus + nightBonus));
  return rollFish(baseQuality, pool);
}
/**
 * Sortea qué pez sale, sesgando la probabilidad hacia rarezas mejores según
 * `qualityNormalized` (0-1, viene de qué tan bien se hizo el minijuego de la
 * barra) y el nivel de caña. No confirma la captura: eso lo hace resolveCatch().
 */
function rollFish(qualityNormalized, pool){
  pool = pool || FISH_TABLE;
  const rodLvl = (state.fishing && state.fishing.rodLevel) || 1;
  const shift = (qualityNormalized-0.5)*18 + (rodLvl-1)*4;
  const weights = pool.map((fish,index)=>{
    const skew = index<=1 ? -shift*0.5 : shift*(index-1)*0.6;
    return Math.max(1, fish.weight + skew);
  });
  const total = weights.reduce((sum,w)=>sum+w,0);
  let roll = Math.random()*total;
  for(let i=0;i<pool.length;i++){ roll -= weights[i]; if(roll<=0) return pool[i]; }
  return pool[0];
}
function hookFish(){
  if(!fishCast || fishCast.phase!=='bite') return;
  clearTimeout(fishCast.missTimer);
  const fish = rollHookedFish(fishCast);
  const diff = FISH_BAR_DIFFICULTY[fish.key] || FISH_BAR_DIFFICULTY.common;
  const rodLvl = (state.fishing && state.fishing.rodLevel) || 1;
  fishCast.phase = 'reeling';
  fishCast.fish = fish;
  fishCast.barSize = Math.max(14, Math.min(62, diff.barSize + (rodLvl-1)*2 - (fishCast.golden?5:0)));
  fishCast.critterSpeed = diff.critterSpeed * (fishCast.golden?1.25:1);
  fishCast.retargetMin = diff.retargetMin;
  fishCast.retargetMax = diff.retargetMax;
  fishCast.critterPos = 50;
  fishCast.critterTarget = 50;
  fishCast.nextRetargetAt = 0;
  fishCast.barPos = 50 - fishCast.barSize/2;
  fishCast.barVel = 0;
  fishCast.progress = 45;
  fishCast.isHeld = false;
  fishCast.inZoneTicks = 0;
  fishCast.totalTicks = 0;
  fishCast.lastFrame = performance.now();
  fishCast.dartUntil = 0;
  Sound.skill();
  animateFishBar();
  renderFishing();
}
/* ================= MINIJUEGO DE TIRAR (barra de reel) ================= */
function setReelHeld(held){
  if(!fishCast || fishCast.phase!=='reeling') return;
  fishCast.isHeld = held;
  const btn = document.getElementById('reelHoldBtn');
  if(btn) btn.classList.toggle('holding', held);
}
function animateFishBar(){
  if(!fishCast || fishCast.phase!=='reeling') return;
  const now = performance.now();
  const dt = Math.min(0.06, (now-fishCast.lastFrame)/1000);
  fishCast.lastFrame = now;

  // IA del pez: cambia de objetivo cada tanto, más seguido y más rápido cuanto más raro/dorado sea.
  if(now >= fishCast.nextRetargetAt){
    const prevTarget = fishCast.critterTarget;
    const range = 46;
    fishCast.critterTarget = Math.max(4, Math.min(96, 50 + (Math.random()*2-1)*range));
    fishCast.nextRetargetAt = now + fishCast.retargetMin + Math.random()*(fishCast.retargetMax-fishCast.retargetMin);
    if(Math.abs(fishCast.critterTarget-prevTarget) > 42){
      fishCast.dartUntil = now + 550;
      Sound.hit();
      if(navigator.vibrate){ try{ navigator.vibrate(45); }catch(e){} }
    }
  }
  const dartBoost = now < fishCast.dartUntil ? 1.8 : 1;
  const diff = fishCast.critterTarget - fishCast.critterPos;
  const step = fishCast.critterSpeed*dartBoost*dt;
  fishCast.critterPos += Math.max(-Math.abs(diff), Math.min(Math.abs(diff), diff>0?step:-step));

  // Física de la barra: mantener presionado sube, soltar cae por gravedad.
  const lift = 205 + (((state.fishing&&state.fishing.rodLevel)||1)-1)*8;
  const gravity = 165;
  if(fishCast.isHeld) fishCast.barVel += lift*dt; else fishCast.barVel -= gravity*dt;
  fishCast.barVel = Math.max(-140, Math.min(140, fishCast.barVel));
  fishCast.barPos += fishCast.barVel*dt;
  if(fishCast.barPos < 0){ fishCast.barPos = 0; fishCast.barVel = 0; }
  if(fishCast.barPos > 100-fishCast.barSize){ fishCast.barPos = 100-fishCast.barSize; fishCast.barVel = 0; }

  const inZone = fishCast.critterPos >= fishCast.barPos && fishCast.critterPos <= fishCast.barPos+fishCast.barSize;
  fishCast.totalTicks++;
  if(inZone){
    fishCast.inZoneTicks++;
    const rodLvl = (state.fishing && state.fishing.rodLevel) || 1;
    fishCast.progress += (27 + (rodLvl-1)*2.2)*dt;
  } else {
    const rankIdx = FISH_RARITY_RANK[fishCast.fish.key]||0;
    fishCast.progress -= (17 + rankIdx*2.4)*dt;
  }
  fishCast.progress = Math.max(0, Math.min(100, fishCast.progress));

  const critterEl = document.getElementById('fishCritter');
  const barEl = document.getElementById('fishCatchBar');
  const dartEl = document.getElementById('fishLungeAlert');
  const progFill = document.getElementById('fishProgressFill');
  const holdBtn = document.getElementById('reelHoldBtn');
  if(critterEl) critterEl.style.bottom = `${fishCast.critterPos}%`;
  if(barEl){ barEl.style.bottom = `${fishCast.barPos}%`; barEl.style.height = `${fishCast.barSize}%`; barEl.classList.toggle('active', inZone); }
  if(dartEl) dartEl.style.opacity = (now < fishCast.dartUntil) ? '1' : '0';
  if(progFill){ progFill.style.height = `${fishCast.progress}%`; progFill.classList.toggle('danger', fishCast.progress<25); }
  if(holdBtn) holdBtn.classList.toggle('danger', fishCast.progress<25);

  if(fishCast.progress<=0){ fishEscaped(); return; }
  if(fishCast.progress>=100){ resolveCatch(); return; }
  fishNeedleFrame = requestAnimationFrame(animateFishBar);
}
function clearReelReleaseHandler(){
  if(fishReelReleaseHandler){
    window.removeEventListener('pointerup', fishReelReleaseHandler);
    window.removeEventListener('pointercancel', fishReelReleaseHandler);
    fishReelReleaseHandler = null;
  }
}
function fishEscaped(){
  if(fishNeedleFrame){ cancelAnimationFrame(fishNeedleFrame); fishNeedleFrame=null; }
  clearReelReleaseHandler();
  if(!fishCast) return;
  const wasGolden = !!fishCast.golden;
  fishCast.ended = true;
  fishCast = null;
  const hadStreak = (state.fishing.streak||0) >= 2;
  state.fishing.streak = 0;
  saveState();
  Sound.hit();
  addLog(`🎣 El pez se te escapó de la barra.${wasGolden?' Era la pesca dorada.':''}${hadStreak?' Se rompió la racha.':''}`, 'combat');
  showFeedback('¡SE ESCAPÓ!', hadStreak?'Se perdió la racha de capturas. Mantené la barra sobre el pez.':'Mantené la barra sobre el pez para llenar el medidor. Probá de nuevo.', 'danger');
  renderFishing();
}
function burstFishSparks(container, color='#f7d07b', amount=10){
  if(!container) return;
  for(let i=0;i<amount;i++){
    const spark = document.createElement('i');
    const angle = Math.random()*Math.PI*2;
    const distance = 24 + Math.random()*68;
    spark.className = 'spark';
    spark.style.color = color;
    spark.style.left = `${44 + Math.random()*12}%`;
    spark.style.top = `${26 + Math.random()*18}%`;
    spark.style.setProperty('--x', `${Math.cos(angle)*distance}px`);
    spark.style.setProperty('--y', `${Math.sin(angle)*distance}px`);
    container.appendChild(spark);
    setTimeout(()=>spark.remove(),700);
  }
}
/* ================= RESULTADO Y RENDERIZADO ================= */
function fishRatingLabel(q){
  if(q>=0.85) return 'CAPTURA PERFECTA';
  if(q>=0.6) return 'BUENA PESCA';
  if(q>=0.35) return 'A LAS APURADAS';
  return 'POR LOS PELOS';
}
/**
 * Cierra el minijuego de pesca cuando termina la fase de reelar: calcula la
 * calidad final de la barra de tensión, decide el pez con rollFish/rollHookedFish,
 * y aplica recompensas (state.fishing, materiales, logros de bestiario de pesca).
 */
function resolveCatch(){
  if(!fishCast || fishCast.phase!=='reeling') return;
  if(fishNeedleFrame){ cancelAnimationFrame(fishNeedleFrame); fishNeedleFrame=null; }
  clearReelReleaseHandler();
  const wasGolden = !!fishCast.golden;
  const fish = fishCast.fish;
  const precisionRatio = fishCast.totalTicks>0 ? fishCast.inZoneTicks/fishCast.totalTicks : 0.3;
  const castRatio = (fishCast.castPower||0)/100;
  const qualityNormalized = Math.max(0, Math.min(1, precisionRatio*0.8 + castRatio*0.2));
  const goldenMult = wasGolden ? 3 : 1;
  const isNewSpecies = !state.fishing.dex || !state.fishing.dex[fish.id];
  state.fishing.dex = state.fishing.dex || {};
  state.fishing.dex[fish.id] = (state.fishing.dex[fish.id]||0)+1;
  state.fishing.bestWeight = state.fishing.bestWeight || {};
  const weight = Math.round((fish.sizeMin + Math.random()*(fish.sizeMax-fish.sizeMin)) * (0.85+qualityNormalized*0.3) * (wasGolden?1.25:1) * 10)/10;
  const isRecord = !state.fishing.bestWeight[fish.id] || weight > state.fishing.bestWeight[fish.id];
  if(isRecord) state.fishing.bestWeight[fish.id] = weight;
  state.fishing.streak = (state.fishing.streak||0)+1;
  if(state.fishing.streak > (state.fishing.bestStreak||0)) state.fishing.bestStreak = state.fishing.streak;
  const streakMult = Math.min(0.5, state.fishing.streak*0.03);
  const goldBase = fish.gold*goldenMult;
  const essenceBase = fish.essence*(wasGolden?2:1);
  const bonusGold = Math.round(goldBase*streakMult);
  state.materials.essence = (state.materials.essence||0)+essenceBase;
  state.materials.scale = (state.materials.scale||0)+fish.scale;
  gainGold(goldBase+bonusGold);
  state.fishing.totalCaught = (state.fishing.totalCaught||0)+1;
  if(!state.fishing.bestRarity || FISH_RARITY_RANK[fish.key]>FISH_RARITY_RANK[state.fishing.bestRarity]) state.fishing.bestRarity = fish.key;
  rollMissionReset();
  state.missions.day.fishCaught = (state.missions.day.fishCaught||0)+1;
  if(FISH_RARITY_RANK[fish.key]>=2) state.missions.week.fishRare = (state.missions.week.fishRare||0)+1;
  let charmMsg = '';
  if(state.characterClass==='tamer' && FISH_RARITY_RANK[fish.key]>=3 && !state.fishing.tameCharm){
    state.fishing.tameCharm = true;
    charmMsg = ' · +1 Amuleto de captura';
  }
  // Cofre de racha: cada tantas capturas seguidas (sin que se escape el pez) hay un bonus extra.
  let milestone = null;
  if(STREAK_MILESTONES.includes(state.fishing.streak)){
    const chestGold = 60 + state.fishing.streak*8;
    const chestEssence = 4 + Math.floor(state.fishing.streak/5);
    gainGold(chestGold);
    state.materials.essence = (state.materials.essence||0)+chestEssence;
    milestone = { gold:chestGold, essence:chestEssence, streak:state.fishing.streak };
  }
  // Recompensa única por completar el dex (las 5 especies, al menos una vez).
  let dexCompletedNow = false;
  if(!state.fishing.dexRewardClaimed && isDexComplete()){
    state.fishing.dexRewardClaimed = true;
    gainGold(DEX_COMPLETE_REWARD.gold);
    state.materials.essence = (state.materials.essence||0)+DEX_COMPLETE_REWARD.essence;
    state.materials.scale = (state.materials.scale||0)+DEX_COMPLETE_REWARD.scale;
    dexCompletedNow = true;
  }
  const goldenMsg = wasGolden ? ' · ✨ PESCA DORADA (x3)' : '';
  const bonusMsg = bonusGold>0 ? ` (+${bonusGold} racha x${state.fishing.streak})` : '';
  const recordMsg = isRecord ? ' · 🏆 ¡RÉCORD DE PESO!' : '';
  const milestoneMsg = milestone ? ` · 🎁 Cofre de racha x${milestone.streak}: +${milestone.gold} oro, +${milestone.essence} esencia` : '';
  const dexMsg = dexCompletedNow ? ` · 🌟 ¡VIVERO COMPLETO! +${DEX_COMPLETE_REWARD.gold} oro, +${DEX_COMPLETE_REWARD.essence} esencia, +${DEX_COMPLETE_REWARD.scale} escamas (Pescador Maestro desbloqueado)` : '';
  addLog(`🎣 Pescaste ${fish.icon} ${fish.label} (${weight}kg): +${goldBase+bonusGold} oro${bonusMsg} · +${essenceBase} esencia${fish.scale?` · +${fish.scale} escamas`:''}${charmMsg}${isNewSpecies?' · ¡NUEVA ESPECIE!':''}${recordMsg}${goldenMsg}${milestoneMsg}${dexMsg}.`, 'reward');
  if(dexCompletedNow) Sound.bigCatch(true);
  else if(wasGolden || FISH_RARITY_RANK[fish.key]>=3) Sound.bigCatch(isRecord);
  else { Sound.reward(); if(isRecord) setTimeout(()=>Sound.bigCatch(true), 180); }
  showFeedback(`${wasGolden?'✨ ':'🎣 '}¡${fish.label.toUpperCase()}!`, `${weight}kg · +${goldBase+bonusGold} oro${bonusMsg} · +${essenceBase} esencia${fish.scale?` · +${fish.scale} escamas`:''}${charmMsg}${milestoneMsg}${dexMsg}`, 'reward');
  fishCast = { phase:'result', fish, ended:true, quality:Math.round(qualityNormalized*100), rating:fishRatingLabel(qualityNormalized), isNewSpecies, streak:state.fishing.streak, bonusGold, weight, isRecord, golden:wasGolden, milestone, baitId:fishCast.baitId, dexCompletedNow };
  saveState();
  renderFishing();
  const resultIcon = document.querySelector('.fishing-panel.result');
  if(resultIcon) burstFishSparks(resultIcon, wasGolden?'#ffd66b':FISH_COLORS[fish.key], wasGolden?32:(fish.key==='legendary'?28:fish.key==='epic'?20:12));
  if(wasGolden || FISH_RARITY_RANK[fish.key]>=3){
    const app = document.getElementById('app') || document.body;
    app.classList.add('fish-big-catch');
    setTimeout(()=>app.classList.remove('fish-big-catch'), 700);
  }
  render();
}
function cancelFishing(){
  if(!fishCast) return;
  if(fishCast.waitTimer) clearTimeout(fishCast.waitTimer);
  if(fishCast.missTimer) clearTimeout(fishCast.missTimer);
  if(fishNeedleFrame){ cancelAnimationFrame(fishNeedleFrame); fishNeedleFrame=null; }
  if(fishCastFrame){ cancelAnimationFrame(fishCastFrame); fishCastFrame=null; }
  clearReelReleaseHandler();
  fishCast.ended = true;
  fishCast = null;
  renderFishing();
}
function renderFishing(){
  try{
    renderFishingUnsafe();
  }catch(err){
    // Si algo inesperado revienta a mitad de un render, no queremos dejar la
    // sección de pesca "trabada" (panel vacío, botón sin reaccionar) para
    // siempre: se loguea el error real y se reintenta desde un estado limpio
    // en vez de dejar el DOM a medio pintar con listeners de una fase vieja.
    console.error('[Pesca] error en renderFishing, se recupera el estado:', err);
    fishCast = null;
    const content = document.getElementById('fishingContent');
    const side = document.getElementById('fishingSide');
    if(content) content.innerHTML = `<div class="arena-idle">Hubo un problema al mostrar la pesca. Se reinició la vista — probá lanzar de nuevo.</div>`;
    if(side) side.innerHTML = '';
  }
}
/**
 * Dibuja toda la pantalla de pesca según `fishCast?.phase` (idle, lanzando,
 * cargando/esperando picada, minijuego de reel, resultado). Se llama
 * "Unsafe" porque no atrapa errores: la envuelve `renderFishing()` (arriba)
 * con try/catch para que un error acá no rompa el render general del juego.
 * Si agregás una fase nueva a `fishCast.phase`, hay que agregar su bloque acá.
 */
function renderFishingUnsafe(){
  const content = document.getElementById('fishingContent');
  const side = document.getElementById('fishingSide');
  if(!content || !side || !state) return;
  if(!state.fishing) state.fishing = { totalCaught:0, rodLevel:1, bestRarity:null, tameCharm:false, dex:{}, streak:0, bestStreak:0, bestWeight:{}, zone:'pond', baits:{}, activeBait:null, dexRewardClaimed:false, weather:null };
  if(!state.fishing.bestWeight) state.fishing.bestWeight = {};
  if(!state.fishing.dex) state.fishing.dex = {};
  if(!state.fishing.zone || !zoneUnlocked(state.fishing.zone)) state.fishing.zone = 'pond';
  if(!state.fishing.baits) state.fishing.baits = {};
  if(state.fishing.activeBait && baitOwned(state.fishing.activeBait)<=0) state.fishing.activeBait = null;
  const locked = fishingLocked();
  const fishing = state.fishing;
  const zone = zoneDef(currentZoneKey());
  const label = document.getElementById('fishPowerLabel');
  if(label) label.textContent = `Caña nivel ${fishing.rodLevel||1} · ${zone.icon} ${zone.label}`;
  const zoneRow = `<div class="fish-zone-row">${FISH_ZONES.map(z=>{
    const unlocked = zoneUnlocked(z.key);
    const active = currentZoneKey()===z.key;
    return `<button class="fish-zone-tab${active?' active':''}${unlocked?'':' locked'}" data-zone="${z.key}" ${unlocked?'':'disabled'} title="${unlocked?z.desc:`Necesitás caña nivel ${z.rodReq}`}">
      <span class="zone-icon">${unlocked?z.icon:'🔒'}</span>
      <span class="zone-name">${z.label}</span>
    </button>`;
  }).join('')}</div>`;
  const activeBait = activeBaitId();
  const baitRow = `<div class="fish-bait-row">
    <div class="fish-bait-tile">
      <button class="fish-bait-tab${!activeBait?' active':''}" data-bait="" title="Pescar sin cebo">
        <span class="bait-icon">🚫</span><span class="bait-name">Sin cebo</span>
      </button>
    </div>
    ${BAIT_TABLE.map(b=>{
      const owned = baitOwned(b.key);
      const active = activeBait===b.key;
      const canAfford = affordBait(b);
      return `<div class="fish-bait-tile">
        <button class="fish-bait-tab${active?' active':''}${owned<=0?' empty':''}" data-bait="${b.key}" title="${b.desc}">
          <span class="bait-icon">${b.icon}</span><span class="bait-name">${b.label}</span><span class="bait-count">x${owned}</span>
        </button>
        <button class="fish-bait-buy${canAfford?'':' cant-afford'}" data-buy="${b.key}" title="${b.desc}">+1 (${formatBaitCost(b)})</button>
      </div>`;
    }).join('')}
  </div>`;
  const bubbles = zoneAmbience(zone.key);
  const conditionsBadge = conditionsBadgeHTML(zone.key);
  const dexCaughtCount = FISH_TABLE.filter(f=>(fishing.dex[f.id]||0)>0).length;
  const dexRow = `<div class="fish-dex-wrap">
    <div class="fish-dex-row">${FISH_TABLE.map(f=>{
      const caught = (fishing.dex[f.id]||0)>0;
      return `<div class="fish-dex-item${caught?' caught':''}" style="color:${FISH_COLORS[f.key]}" title="${caught?f.label+' ('+fishing.dex[f.id]+')':'??? — todavía no descubierto'}">${caught?f.icon:'?'}</div>`;
    }).join('')}</div>
    <div class="fish-dex-progress">${fishing.dexRewardClaimed?'🌟 Vivero completo · Pescador Maestro activo':`Vivero ${dexCaughtCount}/${FISH_TABLE.length}`}</div>
  </div>`;
  const nextMilestone = nextStreakMilestone(fishing.streak||0);
  const streakBadge = fishing.streak>0 ? `<div class="fish-streak-badge">🔥 Racha x${fishing.streak}${nextMilestone?` · 🎁 cofre en ${nextMilestone-fishing.streak}`:''}${fishing.bestStreak>fishing.streak?` · Mejor: x${fishing.bestStreak}`:''}</div>` : (fishing.bestStreak>0 ? `<div class="fish-streak-badge">Mejor racha: x${fishing.bestStreak}</div>` : '');

  if(locked){
    content.innerHTML = `<div class="arena-idle" id="fishIdle">Terminá tu expedición de cacería para poder pescar.</div>`;
  } else if(!fishCast){
    content.innerHTML = `
      <div class="fishing-panel zone-${zone.key}">
        ${bubbles}
        ${zoneRow}
        <div class="fish-zone-desc">${zone.desc}</div>
        ${conditionsBadge}
        <div class="fish-pond zone-${zone.key}">${zone.icon}</div>
        ${baitRow}
        <p>Mantené presionado para cargar el lanzamiento y soltá cuando el medidor esté alto para tirar más lejos.</p>
        <button id="castLineBtn" class="fish-cast-btn">Mantené presionado para lanzar</button>
        ${streakBadge}
        ${dexRow}
      </div>`;
    document.getElementById('castLineBtn')?.addEventListener('pointerdown', (e)=>{ e.preventDefault(); startCastCharge(); });
    document.getElementById('castLineBtn')?.addEventListener('contextmenu', (e)=>e.preventDefault());
    content.querySelectorAll('.fish-zone-tab').forEach(btn=>{
      btn.addEventListener('click', ()=>setFishZone(btn.dataset.zone));
    });
    content.querySelectorAll('.fish-bait-tab').forEach(btn=>{
      btn.addEventListener('click', ()=>setActiveBait(btn.dataset.bait || null));
    });
    content.querySelectorAll('.fish-bait-buy').forEach(btn=>{
      btn.addEventListener('click', (e)=>{ e.stopPropagation(); buyBait(btn.dataset.buy); });
    });
  } else if(fishCast.phase==='charging'){
    content.innerHTML = `
      <div class="fishing-panel zone-${zone.key}">
        ${bubbles}
        <div class="fish-pond zone-${zone.key} casting">${zone.icon}</div>
        <div class="fish-power-wrap"><div class="fish-power-fill" id="fishPowerFill"></div></div>
        <div class="fish-power-label">Soltá cuando la barra esté alta para lanzar más lejos</div>
        <button id="releaseCastBtn" class="fish-cast-btn charging">SOLTÁ PARA LANZAR</button>
      </div>`;
    document.getElementById('releaseCastBtn')?.addEventListener('pointerup', releaseCast);
    document.getElementById('releaseCastBtn')?.addEventListener('pointercancel', releaseCast);
  } else if(fishCast.phase==='waiting'){
    const usedBait = fishCast.baitId ? baitDef(fishCast.baitId) : null;
    content.innerHTML = `
      <div class="fishing-panel zone-${zone.key}">
        ${bubbles}
        <div class="fish-pond zone-${zone.key} casting">${zone.icon}</div>
        <div class="fish-status">Lanzaste con ${fishCast.castPower||0}% de potencia en ${zone.label.toLowerCase()}. El agua está quieta… esperando que pique.</div>
        ${conditionsBadge}
        ${usedBait?`<div class="fish-bait-tag">${usedBait.icon} ${usedBait.label} en el anzuelo</div>`:''}
        <button id="cancelFishBtn" class="rune-cancel">Cancelar</button>
      </div>`;
    document.getElementById('cancelFishBtn')?.addEventListener('click', cancelFishing);
  } else if(fishCast.phase==='bite'){
    const golden = fishCast.golden;
    content.innerHTML = `
      <div class="fishing-panel zone-${zone.key} bite${golden?' golden':''}">
        ${bubbles}
        <div class="fish-pond zone-${zone.key} bite${golden?' golden':''}">${zone.icon}</div>
        <div class="fish-bite-alert${golden?' golden':''}">${golden?'✨ ¡PESCA DORADA! ¡TIRÁ YA!':'¡ESTÁ PICANDO!'}</div>
        <button id="hookFishBtn" class="fish-cast-btn hook${golden?' golden':''}">¡TIRÁ AHORA!</button>
      </div>`;
    document.getElementById('hookFishBtn')?.addEventListener('click', hookFish);
  } else if(fishCast.phase==='reeling'){
    const golden = fishCast.golden;
    const fish = fishCast.fish;
    content.innerHTML = `
      <div class="fishing-panel zone-${zone.key} vertical${golden?' golden':''}">
        ${bubbles}
        ${golden?'<div class="fish-golden-banner">✨ PESCA DORADA — recompensa x3, no la dejes escapar</div>':''}
        <p>Mantené presionado para subir la barra y atrapar a <b style="color:${FISH_COLORS[fish.key]}">${fish.icon} ${fish.label}</b>. Soltá para bajarla. Mientras esté adentro, el medidor de captura sube.</p>
        <div class="fish-lunge-alert" id="fishLungeAlert">¡SALTO BRUSCO!</div>
        <div class="fish-vwrap">
          <div class="fish-vtrack">
            <div class="fish-catch-bar" id="fishCatchBar"></div>
            <div class="fish-critter" id="fishCritter" style="color:${FISH_COLORS[fish.key]}">${fish.icon}</div>
          </div>
          <div class="fish-vmeter"><div class="fish-vmeter-fill" id="fishProgressFill"></div></div>
        </div>
        <button id="reelHoldBtn" class="fish-reel-btn${golden?' golden':''}">MANTENÉ PRESIONADO</button>
      </div>`;
    const holdBtn = document.getElementById('reelHoldBtn');
    holdBtn?.addEventListener('pointerdown', (e)=>{ e.preventDefault(); setReelHeld(true); });
    holdBtn?.addEventListener('pointerleave', ()=>setReelHeld(false));
    if(fishReelReleaseHandler){ window.removeEventListener('pointerup', fishReelReleaseHandler); window.removeEventListener('pointercancel', fishReelReleaseHandler); }
    fishReelReleaseHandler = ()=>setReelHeld(false);
    window.addEventListener('pointerup', fishReelReleaseHandler);
    window.addEventListener('pointercancel', fishReelReleaseHandler);
    if(!fishNeedleFrame) fishNeedleFrame = requestAnimationFrame(animateFishBar);
  } else if(fishCast.phase==='result'){
    const fish = fishCast.fish;
    const goldenMult = fishCast.golden ? 3 : 1;
    const essenceShown = fish.essence*(fishCast.golden?2:1);
    content.innerHTML = `
      <div class="fishing-panel zone-${zone.key} result${fishCast.golden?' golden':''}">
        ${bubbles}
        <div class="fish-result-icon" style="color:${fishCast.golden?'#ffd66b':FISH_COLORS[fish.key]}">${fish.icon}</div>
        <h4 style="color:${fishCast.golden?'#ffd66b':FISH_COLORS[fish.key]}">${fish.label}</h4>
        <p>+${fish.gold*goldenMult+(fishCast.bonusGold||0)} oro${fishCast.bonusGold?` (racha +${fishCast.bonusGold})`:''} · +${essenceShown} esencia${fish.scale?` · +${fish.scale} escamas`:''}</p>
        <div class="fish-weight-badge">⚖ ${fishCast.weight} kg</div>
        <div class="fish-rating">${fishCast.rating||''}${fishCast.quality!=null?` · Precisión ${fishCast.quality}%`:''}</div>
        ${fishCast.baitId?`<div class="fish-bait-tag">${baitDef(fishCast.baitId).icon} pescado con ${baitDef(fishCast.baitId).label}</div>`:''}
        ${fishCast.golden?'<div class="fish-golden-badge">✨ PESCA DORADA · recompensa x3</div>':''}
        ${fish.key==='mythic'?'<div class="fish-mythic-badge">🐙 ¡CAPTURA MÍTICA! · solo aparece de noche y con lluvia</div>':''}
        ${fishCast.isRecord?'<div class="fish-record-badge">🏆 ¡RÉCORD DE PESO!</div>':''}
        ${fishCast.isNewSpecies?'<div class="fish-new-badge">✦ ¡NUEVA ESPECIE!</div>':''}
        ${fishCast.streak>1?`<div class="fish-streak-badge">🔥 Racha x${fishCast.streak}</div>`:''}
        ${fishCast.milestone?`<div class="fish-milestone-badge">🎁 Cofre de racha x${fishCast.milestone.streak}: +${fishCast.milestone.gold} oro, +${fishCast.milestone.essence} esencia</div>`:''}
        ${fishCast.dexCompletedNow?`<div class="fish-dex-complete-badge">🌟 ¡VIVERO COMPLETO! · Pescador Maestro desbloqueado<br>+${DEX_COMPLETE_REWARD.gold} oro · +${DEX_COMPLETE_REWARD.essence} esencia · +${DEX_COMPLETE_REWARD.scale} escamas</div>`:''}
        ${dexRow}
        <button id="fishAgainBtn" class="fish-cast-btn">Pescar de nuevo</button>
      </div>`;
    document.getElementById('fishAgainBtn')?.addEventListener('click', ()=>{ fishCast=null; renderFishing(); });
  }

  const nextCost = rodUpgradeCost();
  const maxed = (fishing.rodLevel||1) >= rodMaxLevel();
  const nextZone = FISH_ZONES.find(z=>!zoneUnlocked(z.key));
  side.innerHTML = `
    <div class="fish-stat-row"><small>PECES CAPTURADOS</small><b>${fishing.totalCaught||0}</b></div>
    <div class="fish-stat-row"><small>ZONA ACTUAL</small><b>${zone.icon} ${zone.label}</b></div>
    <div class="fish-stat-row"><small>CEBO ACTIVO</small><b>${activeBait?`${baitDef(activeBait).icon} ${baitDef(activeBait).label}`:'Sin cebo'}</b></div>
    <div class="fish-stat-row"><small>MEJOR CAPTURA</small><b style="color:${fishing.bestRarity?FISH_COLORS[fishing.bestRarity]:'inherit'}">${fishing.bestRarity === 'mythic' ? EVENT_FISH.label : (fishing.bestRarity ? (FISH_TABLE.find(f=>f.key===fishing.bestRarity)||{}).label || '—' : '—')}</b></div>
    <div class="fish-stat-row"><small>ESCAMAS</small><b>✦ ${state.materials.scale||0}</b></div>
    <div class="fish-stat-row"><small>VIVERO (DEX)</small><b>${dexCaughtCount}/${FISH_TABLE.length}${fishing.dexRewardClaimed?' · 🌟':''}</b></div>
    ${state.characterClass==='tamer' ? `<div class="fish-stat-row"><small>AMULETO DE CAPTURA</small><b>${fishing.tameCharm?'✔ Listo':'—'}</b></div>` : ''}
    ${nextZone ? `<div class="fish-stat-row"><small>PRÓXIMA ZONA</small><b>${nextZone.icon} ${nextZone.label} (caña nv.${nextZone.rodReq})</b></div>` : ''}
    ${fishing.dexRewardClaimed ? `<div class="fish-mastery-box">🌟 Pescador Maestro<br><small>Espera de picada un ${Math.round((1-DEX_MASTERY_WAIT_MULT)*100)}% más corta y mejor calidad en cada tirada, para siempre.</small></div>` : ''}
    <div class="fish-rod-box">
      <div>Caña nivel ${fishing.rodLevel||1}${maxed?' (máx.)':''}</div>
      <small>Mejor caña = barra de captura más grande y reacción más rápida al picar.</small>
      <button id="rodUpgradeBtn" ${maxed||locked?'disabled':''}>${maxed?'Caña al máximo':`Mejorar (${nextCost.gold} oro)`}</button>
    </div>
  `;
  document.getElementById('rodUpgradeBtn')?.addEventListener('click', upgradeRod);
}
