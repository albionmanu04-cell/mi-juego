/* =========================================================================
   COMBAT.JS — Lógica de batallas, habilidades de clase y cacerías roguelike
   (reliquias de expedición, monstruos, turnos, mapa de nodos, dados, botín)
   Depende de: classes.js (CLASSES, TIERS, state, etc.), sound.js (Sound)
   Debe cargarse DESPUÉS de classes.js.
   ========================================================================= */

const RUN_RELICS = [
  { id:'ember_heart', icon:'🔥', name:'Corazon de Brasa', description:'+10% ataque durante esta expedicion', stat:'atk', value:.10 },
  { id:'moon_vial', icon:'☾', name:'Vial Lunar', description:'+18 mana maxima durante esta expedicion', stat:'mana', value:18 },
  { id:'iron_root', icon:'✦', name:'Raiz de Hierro', description:'+24 vida maxima durante esta expedicion', stat:'hp', value:24 },
  { id:'hunter_eye', icon:'◉', name:'Ojo del Cazador', description:'+8% critico durante esta expedicion', stat:'crit', value:8 },
  { id:'gilded_fang', icon:'✧', name:'Colmillo Dorado', description:'+25% oro obtenido durante esta expedicion', stat:'gold', value:.25 },
  { id:'mana_sigil', icon:'✧', name:'Sello del Alba', description:'La primera habilidad de cada combate no cuesta mana', stat:'firstSkillFree', value:1 },
  { id:'vampire_gem', icon:'♦', name:'Gema del Verdugo', description:'Tus criticos curan 3% de vida maxima', stat:'critHeal', value:.03 },
  { id:'iron_oath', icon:'🛡', name:'Juramento de Acero', description:'+8 defensa durante esta expedicion', stat:'def', value:8, classOnly:'warrior' },
  { id:'windstring', icon:'🏹', name:'Cuerda del Vendaval', description:'+14% probabilidad de golpe extra', stat:'extraTurn', value:.14, classOnly:'archer' },
  { id:'arcane_focus', icon:'✦', name:'Foco Arcano', description:'+30% potencia de habilidad', stat:'skillPower', value:.30, classOnly:'mage' },
  { id:'sun_chalice', icon:'✚', name:'Caliz Solar', description:'+20% a tus curaciones', stat:'healPower', value:.20, classOnly:'priest' },
  { id:'night_fang', icon:'🗡', name:'Colmillo Nocturno', description:'+50% daño critico', stat:'critDmg', value:.50, classOnly:'assassin' },
  { id:'pack_whistle', icon:'🪢', name:'Silbato de Manada', description:'El compañero del Domador ataca con mas frecuencia', stat:'companionRate', value:.30, classOnly:'tamer' }
];
// Reliquias retiradas junto con el kit universal antiguo (Curación/Escudo/Sangrado).
const REMOVED_RUN_RELIC_IDS = new Set(['blood_quill']);
// Una run debe sentirse poderosa, no convertirse en una acumulación infinita de bonus.
// El límite obliga a elegir rutas y evita que las reliquias repetidas rompan el late game.
const MAX_RUN_RELICS = 7;
const FINAL_RUN_DEPTH = 40;
// Economía permanente de la expedición. No modifica vida ni daño de combate.
const RUN_ECONOMY = {
  // El oro se concentra en salir vivo con una buena expedición, no en farmear
  // rápidamente las primeras salas.
  victoryGold: .22,
  bossEssenceBase: 3,
  eliteEssenceBase: 1,
  bossCoreChance: .65,
  eliteCoreChance: .03,
  bossGearChance: .16,
  eliteGearChance: .06,
  commonGearChance: .015,
  bossRelicChance: .48,
  eliteRelicChance: .08,
  bossTrophyChance: .55
};

// El Guardián no debe adelantar la progresión al inicio. La chance de objeto
// crece con la profundidad y la rareza máxima se habilita por tramos.
function guardianGearProgress(depth){
  const safeDepth = Math.max(1, Math.floor(finiteNumber(depth, 1)));
  const chance = Math.min(.45, .01 + Math.max(0, safeDepth-1) * .004);
  const maxRank = safeDepth < 15 ? 2 : safeDepth < 30 ? 3 : safeDepth < 50 ? 4 : safeDepth < 75 ? 5 : 6;
  return { chance, maxRank };
}

function eliteGearProgress(depth){
  const safeDepth = Math.max(1, Math.floor(finiteNumber(depth, 1)));
  const chance = Math.min(.24, .004 + Math.max(0, safeDepth-1) * .002);
  const maxRank = safeDepth < 15 ? 2 : safeDepth < 30 ? 3 : safeDepth < 50 ? 4 : safeDepth < 75 ? 5 : 6;
  return { chance, maxRank };
}
function emptyRunTelemetry(){
  return {
    maxDamage: 0,
    bestLoot: null,
    keyRelic: null,
    routeTaken: [],
    mastery: { guardBreaks:0, strongDodges:0, noHealWins:0, bonusGold:0, bonusEssence:0 }
  };
}
function ensureRunTelemetry(target=runState){
  if(!target || typeof target!=='object') return null;
  const fresh = emptyRunTelemetry();
  const current = target.telemetry && typeof target.telemetry==='object' ? target.telemetry : {};
  target.telemetry = { ...fresh, ...current };
  target.telemetry.maxDamage = Math.max(0, finiteNumber(target.telemetry.maxDamage, 0));
  target.telemetry.routeTaken = Array.isArray(target.telemetry.routeTaken) ? target.telemetry.routeTaken.filter(Boolean).slice(-32) : [];
  target.telemetry.mastery = { ...fresh.mastery, ...(target.telemetry.mastery && typeof target.telemetry.mastery==='object' ? target.telemetry.mastery : {}) };
  Object.keys(fresh.mastery).forEach(key=>target.telemetry.mastery[key]=Math.max(0, finiteNumber(target.telemetry.mastery[key],0)));
  return target.telemetry;
}
function recordRunDamage(amount){
  if(!runState || !battle || !battle.isRun) return;
  const telemetry = ensureRunTelemetry();
  if(telemetry) telemetry.maxDamage = Math.max(telemetry.maxDamage, Math.max(0, Math.round(finiteNumber(amount,0))));
}
function lootRank(item){
  const ranks = { common:1, uncommon:2, rare:3, epic:4, legendary:5, mythic:6, unique:7 };
  return Math.max(0, finiteNumber(item && item.rank, ranks[item && item.rarityKey] || 0));
}
function recordRunLoot(item){
  if(!runState || !item) return;
  const telemetry = ensureRunTelemetry();
  const candidate = {
    name: item.name || 'Botín sin nombre',
    icon: item.icon || '✦',
    rarity: item.rarity || item.hint || 'Hallazgo',
    rarityKey: item.rarityKey || '',
    rank: lootRank(item)
  };
  if(!telemetry.bestLoot || candidate.rank >= lootRank(telemetry.bestLoot)) telemetry.bestLoot = candidate;
}
function recordRunRelic(relic){
  if(!runState || !relic) return;
  const telemetry = ensureRunTelemetry();
  const candidate = { id:relic.id, name:relic.name, icon:relic.icon || '✦', description:relic.description || '' };
  // La reliquia más reciente es la que el aventurero acaba de convertir en el eje de su run.
  telemetry.keyRelic = candidate;
}
function recordRunRoute(node){
  if(!runState || !node) return;
  const telemetry = ensureRunTelemetry();
  const info = MAP_NODE_TYPES[node.type] || MAP_NODE_TYPES.fight;
  const entry = { depth:Math.max(1, Math.floor(finiteNumber(runState.depth,1))), type:node.type || 'fight', label:info.label, icon:info.icon };
  const previous = telemetry.routeTaken[telemetry.routeTaken.length-1];
  if(!previous || previous.depth!==entry.depth || previous.type!==entry.type) telemetry.routeTaken.push(entry);
}
function awardCombatMastery(kind, monster){
  if(!runState || !battle || !battle.isRun) return false;
  const claims = battle.masteryClaims || (battle.masteryClaims={});
  const claimKey = kind==='break' ? 'break' : kind==='dodge' ? 'dodge' : 'noHeal';
  if(claims[claimKey]) return false;
  claims[claimKey] = true;
  const telemetry = ensureRunTelemetry();
  const depth = Math.max(1, finiteNumber(runState.depth,1));
  const data = {
    break:  { field:'guardBreaks', label:'RUPTURA PRECISA', detail:'Rompiste la guardia del enemigo', gold:Math.max(1,1+Math.floor(depth*.35)), essence:0 },
    dodge:  { field:'strongDodges', label:'ESQUIVA PERFECTA', detail:'Evitaste un golpe fuerte', gold:Math.max(1,1+Math.floor(depth*.4)), essence:0 },
    noHeal: { field:'noHealWins', label:'VICTORIA IMPECABLE', detail:'Ganaste el combate sin curarte', gold:Math.max(1,1+Math.floor(depth*.35)), essence:0 }
  }[kind];
  if(!data) return false;
  gainGold(data.gold);
  if(data.essence) state.materials.essence = (state.materials.essence||0)+data.essence;
  telemetry.mastery[data.field]++;
  telemetry.mastery.bonusGold += data.gold;
  telemetry.mastery.bonusEssence += data.essence;
  addLog(`✦ ${data.label}: ${data.detail} — +${data.gold} oro.`, 'level');
  showFeedback(`✦ ${data.label}`, `+${data.gold} oro`, 'reward');
  return true;
}
function makeFinalRunSummary(retreated=false, completed=false){
  const telemetry = ensureRunTelemetry();
  return {
    finishedAt: Date.now(),
    retreated: !!retreated,
    completed: !!completed,
    maxDepth: Math.max(0, finiteNumber(runState && runState.maxDepth,0)),
    enemies: Math.max(0, finiteNumber(runState && runState.monstersDefeated,0)),
    maxDamage: Math.max(0, finiteNumber(telemetry && telemetry.maxDamage,0)),
    runGold: Math.max(0, finiteNumber(runState && runState.runGold,0)),
    runGoldClaimed: !!(runState && runState.runGoldClaimed),
    bestLoot: telemetry && telemetry.bestLoot ? { ...telemetry.bestLoot } : null,
    keyRelic: telemetry && telemetry.keyRelic ? { ...telemetry.keyRelic } : null,
    routeTaken: telemetry ? telemetry.routeTaken.map(entry=>({ ...entry })) : [],
    mastery: telemetry ? { ...telemetry.mastery } : emptyRunTelemetry().mastery
  };
}
function runAscension(depth, abyss=false){
  if(!abyss && depth<=FINAL_RUN_DEPTH) return 0;
  return Math.max(1, Math.floor((Math.max(FINAL_RUN_DEPTH+1, depth)-FINAL_RUN_DEPTH-1)/10)+1);
}
function ascensionLabel(depth, abyss=false){
  const level = runAscension(depth, abyss);
  return level ? `ASCENSIÓN ${level}` : '';
}
const WEEKLY_TRIALS = [
  { key:'fury', label:'Enemigos Furiosos', hint:'+18% daño enemigo · +20% esencia' },
  { key:'iron', label:'Piel de Hierro', hint:'+22% vida enemiga · mejor botín élite' },
  { key:'arcane', label:'Tormenta Arcana', hint:'Las habilidades cuestan menos maná' },
  { key:'hunter', label:'Cacería del Tesoro', hint:'+35% oro y botín de jefe' }
];
function activeWeeklyTrial(){
  const code=String(weekKey()).split('-').reduce((sum,part)=>sum+Number(part)||sum,0);
  return WEEKLY_TRIALS[Math.abs(code)%WEEKLY_TRIALS.length];
}
function purgeRemovedRunRelics(){
  if(!runState || !Array.isArray(runState.relics)) return false;
  const seen = new Set();
  const before = runState.relics.length;
  runState.relics = runState.relics.filter(relic=>{
    if(!relic || REMOVED_RUN_RELIC_IDS.has(relic.id) || seen.has(relic.id)) return false;
    seen.add(relic.id);
    return true;
  }).slice(0, MAX_RUN_RELICS);
  const changed = runState.relics.length !== before;
  if(changed) syncRunResources();
  if(!runState.tempStats) runState.tempStats = {};
  return changed;
}
function relicsForCurrentClass(){ return RUN_RELICS.filter(relic=>!relic.classOnly || relic.classOnly===state.characterClass); }
function runRelicValue(stat){
  if(!runState || runState.phase==='ended' || !Array.isArray(runState.relics)) return 0;
  return runState.relics.filter(relic=>relic.stat===stat).reduce((sum,relic)=>sum+relic.value,0);
}
function grantRunRelic(){
  if(!runState || (runState.relics||[]).length>=MAX_RUN_RELICS) return null;
  const classRelics = relicsForCurrentClass();
  const available = classRelics.filter(relic=>!runState.relics.some(owned=>owned.id===relic.id));
  const relic = pick(available);
  return addRunRelic(relic);
}
function addRunRelic(relic){
  if(!runState || !relic || (runState.relics||[]).length>=MAX_RUN_RELICS) return null;
  if(runState.relics.some(owned=>owned.id===relic.id)) return null;
  runState.relics.push({ ...relic });
  recordRunRelic(relic);
  if(relic.stat==='hp') runState.hp += relic.value;
  if(relic.stat==='mana') runState.mana += relic.value;
  syncRunResources();
  addLog(`Reliquia obtenida: ${relic.name} - ${relic.description}.`, 'level');
  return relic;
}
function makeRelicChoices(){
  if(!runState || (runState.relics||[]).length>=MAX_RUN_RELICS) return [];
  const classRelics = relicsForCurrentClass();
  const available = classRelics.filter(relic=>!runState.relics.some(owned=>owned.id===relic.id));
  const pool = [...available];
  const choices = [];
  while(choices.length<Math.min(3,pool.length)) choices.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]);
  return choices;
}
function awardRunLoot(monster){
  if(!battle || !battle.isRun || !runState) return null;
  const isBoss = monster.isBoss;
  const isElite = runState.currentNode && runState.currentNode.type==='elite';
  const isCommonFight = !isBoss && !isElite;
  const weekly=activeWeeklyTrial();
  // Antes solo Élites y Jefes daban esencia; ahora todo combate aporta algo, aunque poco.
  let essence = isBoss
    ? RUN_ECONOMY.bossEssenceBase + Math.floor(runState.depth/12)
    : isElite
      ? RUN_ECONOMY.eliteEssenceBase + (Math.random()<.20 ? 1 : 0)
      : 0;
  if(weekly.key==='fury') essence=Math.round(essence*1.20);
  state.materials.essence = (state.materials.essence||0) + essence;
  let trophy = null;
  const coreDrop = isBoss
    ? Math.random()<RUN_ECONOMY.bossCoreChance
    : isElite && Math.random()<RUN_ECONOMY.eliteCoreChance;
  if(coreDrop) state.materials.bossCore = (state.materials.bossCore||0) + 1;
  if(isBoss && Math.random()<RUN_ECONOMY.bossTrophyChance){
    trophy = bossTrophyFor(monster);
    const trophies = state.materials.bossTrophies || (state.materials.bossTrophies={});
    trophies[trophy.name] = (trophies[trophy.name]||0) + 1;
    recordRunLoot({ ...trophy, rarity:'Trofeo de jefe', rarityKey:'unique', rank:8 });
  }
  // Los Sellos del Gremio no reemplazan al oro: son la moneda de intercambio
  // entre jugadores. Los jefes son la fuente segura y los élites aportan una pequeña chance.
  const guildMarks = isBoss ? (Math.random()<.50 ? 1 : 0) : (isElite && Math.random()<.08 ? 1 : 0);
  if(guildMarks && typeof marketMarks==='function') marketMarks(guildMarks);

  const rarityRank = { common:0, uncommon:1, rare:2, epic:3, legendary:4, mythic:5, unique:6 };
  // Guardianes y élites dan equipo de forma progresiva: al inicio apenas hay
  // chances y las rarezas superiores se desbloquean con la profundidad.
  const guardianProgress = isBoss ? guardianGearProgress(runState.depth) : null;
  const eliteProgress = isElite ? eliteGearProgress(runState.depth) : null;
  const minRank = isBoss ? 0 : isElite ? 2 : 0;
  const maxRank = isBoss ? guardianProgress.maxRank : isElite ? eliteProgress.maxRank : 6;
  // La probabilidad final no puede superar 100%, pero Percepción no tiene límite de bonificación.
  const perceptionBonus = Math.min(.12, perceptionLootBonus());
  const gearChance = isCommonFight
    ? Math.min(.06, RUN_ECONOMY.commonGearChance + perceptionBonus*.35)
    : isBoss
      ? Math.min(.45, guardianProgress.chance + Math.min(.04, perceptionBonus*.20) + (weekly.key==='hunter' ? .02 : 0))
      : Math.min(.24, eliteProgress.chance + Math.min(.025, perceptionBonus*.16) + (weekly.key==='hunter' ? .01 : 0));
  let item = null;
  if(Math.random()<gearChance){
    const activeSetId = state.subclass ? `subclass-${state.characterClass}-${state.subclass}` : `class-${state.characterClass}`;
    const inDropRange = entry => {
      const rank = rarityRank[entry.rarityKey];
      return rank>=minRank && rank<=maxRank;
    };
    const specialist = SHOP_EQUIPMENT_ITEMS.filter(entry=>entry.setId===activeSetId && inDropRange(entry));
    const traveler = UNIVERSAL_EQUIPMENT_ITEMS.filter(inDropRange);
    const candidates = (!isBoss && !isElite && Math.random()<.22) ? traveler : specialist;
    item = pick(candidates.length ? candidates : (specialist.length ? specialist : traveler));
    if(item){
      state.ownedEquipment.push({ ...item, foundInRun:true });
      state.ownedItems[item.id] = (state.ownedItems[item.id]||0) + 1;
      recordRunLoot(item);
      addLog(`Botin encontrado: ${item.name} (${item.rarity}).`, 'win');
    }
  }
  // Las reliquias siguen reservadas a Élites y Jefes; un jefe siempre intenta conceder una.
  const relic = (isBoss && Math.random()<RUN_ECONOMY.bossRelicChance) || (isElite && Math.random()<RUN_ECONOMY.eliteRelicChance)
    ? grantRunRelic() : null;
  const parts = [];
  if(essence) parts.push(`+${essence} esencia`);
  if(coreDrop) parts.push('+1 núcleo de jefe');
  if(trophy) parts.push(`${trophy.icon} ${trophy.name}`);
  if(guildMarks) parts.push(`✦ +${guildMarks} sellos`);
  if(item) parts.push(item.name);
  if(relic) parts.push(`${relic.icon} ${relic.name}`);
  return { summary:parts.join(' · '), item, relic, trophy };
}

function addLog(text, cls){
  state.log.unshift({text, cls});
  state.log = state.log.slice(0,40);
  renderLog();
}

function playLevelUpCelebration(level){
  document.querySelectorAll('.levelup-overlay').forEach(el=>el.remove());
  const el = document.createElement('div');
  el.className = 'levelup-overlay';
  let stars = '';
  for(let i=0;i<14;i++){
    const angle = Math.random()*Math.PI*2, dist = 90+Math.random()*160;
    stars += `<i class="lu-star" style="left:50%;top:46%;--x:${Math.cos(angle)*dist}px;--y:${Math.sin(angle)*dist}px;animation-delay:${(.2+Math.random()*.3).toFixed(2)}s"></i>`;
  }
  el.innerHTML = `<div class="lu-flash"></div><div class="lu-ring"></div><div class="lu-ring r2"></div><div class="lu-ring r3"></div>${stars}<div class="lu-badge"><small>NIVEL ALCANZADO</small><b>${level}</b><span>+3 puntos de estadística</span></div>`;
  document.body.appendChild(el);
  requestAnimationFrame(()=>el.classList.add('show'));
  setTimeout(()=>el.remove(), 1750);
}
function showLootReveal(item){
  if(!item) return;
  const meta = itemRarityMeta(item);
  document.querySelectorAll('.loot-reveal').forEach(el=>el.remove());
  const el = document.createElement('div');
  el.className = 'loot-reveal';
  el.style.setProperty('--lr-color', meta.color);
  el.innerHTML = `<div class="lr-beam"></div><div class="lr-card"><span class="lr-icon">✦</span><span class="lr-rarity">${meta.label}</span><span class="lr-name">${item.name}</span><span class="lr-tag">NUEVO OBJETO ENCONTRADO</span></div>`;
  document.body.appendChild(el);
  requestAnimationFrame(()=>el.classList.add('show'));
  burstSparks(meta.color, 16);
  setTimeout(()=>el.remove(), 2650);
}
function gainExp(amount){
  state.exp += amount;
  let leveled = false;
  let finalLevel = state.level;
  while(state.level < LEVEL_CAP && state.exp >= expToNext(state.level)){
    state.exp -= expToNext(state.level);
    state.level++;
    state.statPoints += 3;
    if(state.level % 5 === 0) state.statResetsEarned = (state.statResetsEarned||0) + 1;
    state.missions.day.levelsGained++;
    leveled = true;
    finalLevel = state.level;
  }
  if(state.level >= LEVEL_CAP) state.exp = Math.min(state.exp, expToNext(LEVEL_CAP-1));
  state.maxLevelEver = Math.max(state.maxLevelEver||1, state.level);
  if(leveled){
    Sound.levelUp();
    showFeedback(`✦ NIVEL ${state.level}`, '+3 puntos para asignar');
    playLevelUpCelebration(finalLevel);
  }
  if(leveled){ addLog(`¡Subiste a nivel ${state.level}! (+3 puntos de estadística)`, 'level'); }
}
function gainGold(amount){
  state.gold += amount;
  state.missions.day.goldEarned += amount;
  state.missions.month.goldEarned += amount;
  state.totalGoldEarnedLifetime = (state.totalGoldEarnedLifetime||0) + amount;
}

/* ================= BATTLE ================= */
const MONSTER_ARCHETYPES = [
  { key:'swift', label:'Veloz', hint:'Ataca dos veces', icon:'⚡' },
  { key:'guardian', label:'Guardia', hint:'Reduce el daño recibido', icon:'🛡' },
  { key:'charger', label:'Bruto', hint:'Carga un golpe devastador', icon:'💥' },
  { key:'venom', label:'Tóxico', hint:'Sus golpes pueden envenenar', icon:'☣' }
];
const ELITE_AFFINITIES = [
  { key:'armored', label:'Blindado', icon:'🛡', color:'#a7c7df', hint:'Recibe 35% menos daño mientras su coraza siga intacta.', counter:'Contra: llená la barra de Ruptura.' },
  { key:'furious', label:'Furioso', icon:'🔥', color:'#f08a63', hint:'Al 50% de vida entra en furia y golpea más fuerte.', counter:'Contra: postura Defensiva o Ruptura.' },
  { key:'venomous', label:'Venenoso', icon:'☣', color:'#a5d478', hint:'Sus golpes sin bloquear aplican Veneno.', counter:'Contra: esquivá o bloqueá con escudo.' },
  { key:'unstable', label:'Inestable', icon:'✦', color:'#c59af2', hint:'Las habilidades contra este élite infligen 35% más daño.', counter:'Contra: usá tu habilidad general.' }
];
function eliteAffinityForKey(key){ return ELITE_AFFINITIES.find(entry=>entry.key===key) || null; }
function monsterAffinity(monster){
  if(!monster || !monster.affinity) return null;
  const stored = typeof monster.affinity==='string' ? { key:monster.affinity } : monster.affinity;
  const base = eliteAffinityForKey(stored.key);
  return base ? { ...base, ...stored } : null;
}
function affinityDamageMultiplier(monster, isSkill=false){
  const affinity = monsterAffinity(monster);
  if(!affinity) return 1;
  if(affinity.key==='armored' && !monster.affinityBroken) return .65;
  if(affinity.key==='unstable' && isSkill) return 1.35;
  return 1;
}
function monsterAffinityMarkup(monster){
  const affinity = monsterAffinity(monster);
  if(!affinity) return '';
  const broken = affinity.key==='armored' && monster.affinityBroken;
  const title = broken ? 'Coraza rota: ahora recibe daño completo.' : affinity.hint;
  const counter = broken ? 'Coraza rota · daño completo' : affinity.counter;
  return `<div class="elite-affinity ${affinity.key}${broken?' broken':''}" style="--affinity-color:${affinity.color}" title="${escapeHtml(title)}"><b>${affinity.icon} ${affinity.label}</b><small>${escapeHtml(counter)}</small></div>`;
}
function getMonsterIntent(monster){
  if(!monster) return { key:'normal', icon:'⚔', label:'ATAQUE', hint:'Golpe directo' };
  if(monster.status && monster.status.stunnedTurns>0) return { key:'break', icon:'✦', label:'ATURDIDO', hint:'Perderá su próximo turno' };
  if(monster.charging) return { key:'charge', icon:'💥', label:'GOLPE DEVASTADOR', hint:'Se prepara para impactar' };
  if(monster.affinityFury) return { key:'fury', icon:'🔥', label:'FURIA DESATADA', hint:'La postura defensiva reduce este golpe' };
  if(monster.isBoss && monster.phaseTwo) return { key:'boss', icon:'☠', label:'ATAQUE DE FASE II', hint:'Poder del guardián desatado' };
  if(monsterAffinity(monster)?.key==='venomous') return { key:'venom', icon:'☣', label:'TOXINA ACTIVA', hint:'Esquivá o bloqueá para evitar veneno' };
  const key = monster.archetype && monster.archetype.key;
  if(key==='swift') return { key:'swift', icon:'⚡', label:'DOBLE GARRA', hint:'Atacará dos veces' };
  if(key==='venom') return { key:'venom', icon:'☣', label:'MORDEDURA TÓXICA', hint:'Puede aplicar veneno' };
  if(key==='guardian') return { key:'guard', icon:'🛡', label:'GOLPE PROTEGIDO', hint:'Resiste parte del daño' };
  if(key==='charger') return { key:'charge', icon:'💥', label:'PREPARA CARGA', hint:'Su próximo turno será feroz' };
  return { key:'normal', icon:'⚔', label:'ATAQUE DIRECTO', hint:'Un golpe normal' };
}
function renderMonsterIntent(){
  const box = document.getElementById('enemyIntent');
  if(!box || !battle) return;
  const intent = monsterTacticalReadout();
  box.className = `enemy-intent intent-${intent.key}`;
  box.innerHTML = `<small>PRÓXIMA INTENCIÓN</small><b>${intent.icon} ${intent.label}</b><em>${intent.damageText}</em>`;
  box.title = intent.hint;
}
function monsterTacticalReadout(){
  if(!battle || !battle.monster) return { ...getMonsterIntent(null), damageText:'—', hits:0, effects:[], response:'Esperá al próximo enemigo.' };
  const monster = battle.monster;
  const intent = getMonsterIntent(monster);
  const stunned = monster.status && monster.status.stunnedTurns>0;
  const preparingCharge = monster.archetype?.key==='charger' && !monster.charging;
  const hits = stunned || preparingCharge ? 0 : (monster.archetype?.key==='swift' ? 2 : 1);
  let mult = monster.affinityFury ? 1.40 : (monster.fury ? 1.45 : 1);
  if(monster.affinityFury && battle.playerStatus?.stance==='defensive') mult *= .70;
  if(monster.charging) mult *= 1.85;
  const mitigation = combatStance().taken * (1-damageReduction());
  const minHit = hits ? Math.max(1,Math.round(monster.dmg*.85*mult*mitigation)) : 0;
  const maxHit = hits ? Math.max(minHit,Math.round(monster.dmg*1.15*mult*mitigation)) : 0;
  const shieldedHits = Math.min(hits,Math.max(0,Math.round(finiteNumber(battle.playerStatus?.shieldTurns))));
  const totalMin = minHit*(hits-shieldedHits) + Math.max(1,Math.round(minHit*.48))*shieldedHits;
  const totalMax = maxHit*(hits-shieldedHits) + Math.max(1,Math.round(maxHit*.48))*shieldedHits;
  const effects = [];
  const affinity = monsterAffinity(monster);
  if(monster.archetype?.key==='venom' || affinity?.key==='venomous') effects.push('Puede aplicar Veneno durante 2 turnos');
  if(monster.archetype?.key==='guardian') effects.push('Recibe 28% menos daño directo');
  if(monster.charging) effects.push('Golpe cargado: daño x1.85');
  if(monster.fury || monster.affinityFury) effects.push('Furia activa: daño aumentado');
  if(monster.isBoss && monster.phaseTwo) effects.push('Fase II: alterna ataques especiales');
  if(stunned) effects.push('Pierde este turno');
  let response = 'Equilibrada es una opción segura.';
  if(stunned) response = 'Aprovechá: atacá en Ofensiva sin recibir respuesta.';
  else if(preparingCharge) response = 'Tenés un turno: llená Ruptura o cambiá a Defensiva.';
  else if(monster.charging || monster.affinityFury) response = 'Usá Defensiva para reducir el impacto fuerte.';
  else if(monster.archetype?.key==='swift') response = 'Escudo y Defensiva rinden más contra sus 2 impactos.';
  else if(monster.archetype?.key==='venom' || affinity?.key==='venomous') response = 'Bloquear el golpe evita que aplique Veneno.';
  else if(affinity?.key==='armored' && !monster.affinityBroken) response = 'Priorizá críticos y habilidades para romper su coraza.';
  else if(affinity?.key==='unstable') response = 'Tus habilidades causan +35% de daño contra este élite.';
  const damageText = hits ? `${hits>1?hits+' golpes · ':''}${totalMin}–${totalMax} daño${shieldedHits?' · escudo':''}` : (stunned ? 'SIN ATAQUE' : 'CARGANDO · SIN DAÑO');
  return { ...intent, hits, minHit, maxHit, totalMin, totalMax, damageText, effects, response };
}
function makeMonster(tier, biomeKey=''){
  const safeTier = TIERS[tier] ? tier : 'facil';
  // Valores propios por rango: nunca leen nivel, poder, equipo ni daño del héroe.
  const bases = {
    facil:{ hp:48, dmg:6 }, normal:{ hp:88, dmg:9 },
    dificil:{ hp:155, dmg:14 }, elite:{ hp:270, dmg:20 }
  };
  const base = bases[safeTier];
  const hp = safePositiveInt(base.hp*(.94+Math.random()*.12),base.hp);
  const dmg = safePositiveInt(base.dmg*(.95+Math.random()*.10),base.dmg);
  const form = monsterFormForTier(safeTier,true,biomeKey);
  return { name:form.name, hp, maxHp:hp, dmg, tier:safeTier, isBoss:false, visualType:form.type, color:form.color, image:form.image, visualBoss:false };
}

function startBattle(){
  if(battle || huntMode!=='free') return;
  Sound.click();
  battle = { id:++battleSequence, monster: prepareMonster(makeMonster(selectedTier)), playerHp: maxHP(), playerMaxHp: maxHP(), playerMana: maxMana(), playerMaxMana: maxMana(), tier: selectedTier, busy:false, playerStatus:newPlayerStatus() };
  renderArena(true);
  renderActionButtons();
  announceMonsterAnalysis();
  buildTierGrid();
}

function startRunBattle(){
  if(battle || !runState || runState.phase==='ended') return;
  Sound.click();
  const monster = prepareMonster(makeRunMonster(runState.depth, runState.currentNode ? runState.currentNode.type : 'fight'));
  syncRunResources();
  const maxHp = runState.maxHp, maxMp = runState.maxMana;
  battle = {
    id:++battleSequence,
    monster, playerHp: runState.hp, playerMaxHp: maxHp, playerMana: runState.mana, playerMaxMana: maxMp,
    tier: depthTierKey(runState.depth), busy:false, isRun:true, playerStatus:newPlayerStatus(), healingUsed:false, masteryClaims:{}
  };
  runState.phase = 'fight';
  renderArena(true);
  renderActionButtons();
  announceMonsterAnalysis();
  scheduleRunCheckpoint();
  render();
}

// Cada animación diferida conserva la batalla que la originó. Si esa pelea
// terminó, sus callbacks no pueden afectar ni ensuciar la siguiente.
function isCurrentBattle(reference){ return !!reference && battle===reference && !reference.ended; }

function announceMonsterAnalysis(){
  if(!battle || !battle.monster.analyzed) return;
  showFeedback('🔎 PERCEPCIÓN ACTIVADA', `${battle.monster.name}: ${battle.monster.hp}/${battle.monster.maxHp} vida`, 'mana');
}

function prepareMonster(monster){
  const fallbackHp = Math.max(45, safePositiveInt(48 + finiteNumber(power(), 35) * (TIERS[monster.tier] || TIERS.facil).mult, 70));
  monster.maxHp = safePositiveInt(monster.maxHp, fallbackHp);
  monster.hp = Math.min(monster.maxHp, safePositiveInt(monster.hp, monster.maxHp));
  monster.dmg = safePositiveInt(monster.dmg, 6);
  if(!monster.archetype) monster.archetype = monster.isBoss ? pick(MONSTER_ARCHETYPES.filter(a=>a.key!=='swift')) : pick(MONSTER_ARCHETYPES);
  if(!monster.status) monster.status = { bleedTurns:0, bleedDamage:0, stunnedTurns:0 };
  if(monster.charging === undefined) monster.charging = false;
  if(monster.fury === undefined) monster.fury = false;
  monster.isElite = !!monster.isElite || String(monster.name || '').startsWith('Élite ');
  if(monster.isElite && !monster.affinity) monster.affinity = { ...pick(ELITE_AFFINITIES) };
  const affinity = monsterAffinity(monster);
  if(affinity) monster.affinity = affinity;
  if(monster.affinityBroken === undefined) monster.affinityBroken = false;
  if(monster.affinityFury === undefined) monster.affinityFury = false;
  if(monster.phaseTwo === undefined) monster.phaseTwo = false;
  if(monster.phaseAttackCounter === undefined) monster.phaseAttackCounter = 0;
  if(!Number.isFinite(Number(monster.breakMeter))) monster.breakMeter = 0;
  if(!Number.isFinite(Number(monster.breakMax))) monster.breakMax = monsterBreakResistance(monster);
  if(monster.breakStage === undefined) monster.breakStage = 0;
  if(monster.status.breakVulnerableTurns === undefined) monster.status.breakVulnerableTurns = 0;
  if(monster.analysisChance === undefined) monster.analysisChance = perceptionChance();
  if(monster.analyzed === undefined) monster.analyzed = Math.random()*100 < monster.analysisChance;
  return monster;
}

function monsterBreakResistance(monster){
  const tierBase = { facil:34, normal:52, dificil:78, elite:110 }[monster.tier] || 52;
  const depth = Math.max(1, finiteNumber(runState && runState.depth, 1));
  const vitality = Math.min(185, Math.sqrt(Math.max(1, finiteNumber(monster.maxHp, 80))) * 7);
  const bossMultiplier = monster.isBoss ? 1.85 : 1;
  const eliteMultiplier = monster.isElite || String(monster.name || '').startsWith('Élite ') ? 1.25 : 1;
  return safePositiveInt((tierBase + depth*3 + vitality) * bossMultiplier * eliteMultiplier, tierBase);
}

function addMonsterBreak(damage, isCrit=false){
  if(!battle || !battle.monster || battle.monster.hp<=0) return false;
  const monster = battle.monster;
  const gain = Math.max(5, Math.min(38, Math.round(5 + finiteNumber(damage)*.12 + (isCrit ? 7 : 0))));
  monster.breakMeter = Math.min(monster.breakMax, monster.breakMeter + gain);
  if(monster.breakMeter < monster.breakMax) return false;
  monster.breakMeter = 0;
  monster.breakStage++;
  monster.breakMax = Math.min(520, Math.round(monster.breakMax*1.22));
  monster.charging = false;
  monster.status.stunnedTurns = Math.max(monster.status.stunnedTurns, 1);
  monster.status.breakVulnerableTurns = 1;
  Sound.breakSound();
  playCombatVfx('impact','monster','critical');
  burstSparks('#f3c45e',18);
  spawnFloatText('monster','✦ RUPTURA','crit');
  const armored = monsterAffinity(monster)?.key==='armored' && !monster.affinityBroken;
  if(armored){
    monster.affinityBroken = true;
    showFeedback('🛡 CORAZA ROTA','Blindado pierde su reducción de daño','reward');
    addLog(`${monster.name}: coraza blindada rota. Ahora recibe daño completo.`, 'level');
  } else {
    showFeedback('✦ DEFENSA ROTA','El enemigo queda aturdido y vulnerable','reward');
    addLog(`${monster.name}: defensa rota. Pierde su próximo turno.`, 'level');
  }
  awardCombatMastery('break', monster);
  return true;
}

function bossPhaseDetails(monster){
  const phase = {
    slime:    { label:'MAREA VIOLETA', hint:'El Slime se divide en golpes corrosivos', hits:2, mult:.76, poison:true },
    wolf:     { label:'CACERÍA CARMESÍ', hint:'El Lobo Negro ataca dos veces con ojos rojos', hits:2, mult:.82 },
    minotaur: { label:'EMBATE CARMESÍ', hint:'El Minotauro Rojo carga una embestida brutal', hits:1, mult:1.9 },
    dragon:   { label:'ALIENTO CELESTE', hint:'El Dragón Blanco quema tu maná con hielo azul', hits:1, mult:1.35, manaBurn:.26 }
  };
  return phase[monster.visualType] || phase.slime;
}
function triggerBossPhaseTwo(){
  if(!battle || !battle.monster.isBoss || battle.monster.phaseTwo || battle.monster.hp<=0 || battle.monster.hp>battle.monster.maxHp*.5) return false;
  const monster = battle.monster;
  monster.phaseTwo = true;
  monster.dmg = Math.round(monster.dmg*1.18);
  const details = bossPhaseDetails(monster);
  battle.busy = true;
  const arena = document.getElementById('arena');
  const fighter = document.querySelector('.fighter.monster');
  if(arena) arena.classList.add('boss-phase-two');
  if(fighter) fighter.classList.add('phase-two');
  Sound.setScene('bossPhase');
  Sound.bossPhase();
  playCombatVfx('impact','monster','critical');
  playCombatVfx('arcane','monster','critical');
  burstSparks('#ef4755',22);
  spawnFloatText('monster','FASE II','crit');
  showFeedback(`☠ ${details.label}`, 'FASE II · '+details.hint, 'danger');
  addLog(`${monster.name} entra en Fase II: ${details.label}.`, 'danger');
  const phaseBattle = battle;
  setTimeout(()=>{
    if(!isCurrentBattle(phaseBattle)) return;
    phaseBattle.busy = false;
    syncBattleUi();
    startMonsterTurn(phaseBattle);
  },900);
  return true;
}
function bossPhaseAttack(monster){
  const phaseBattle = battle;
  if(!isCurrentBattle(phaseBattle) || phaseBattle.monster!==monster) return;
  const details = bossPhaseDetails(monster);
  Sound.bossPhase();
  showCombatWarning(`☠ ${details.label}`, details.hint, true);
  playCombatVfx('arcane','player','enemy-hit');
  playCombatVfx('impact','player','enemy-hit');
  burstSparks('#ec5b67',12);
  spawnFloatText('monster',details.label,'crit');
  showFeedback(`☠ ${details.label}`, details.hint, 'danger');
  setTimeout(()=>resolveMonsterHits(details.hits,details,phaseBattle),420);
}

function syncRunResources(){
  if(!runState) return;
  runState.maxHp = maxHP();
  runState.maxMana = maxMana();
  runState.hp = Math.min(runState.hp, runState.maxHp);
  runState.mana = Math.min(runState.mana, runState.maxMana);
}

function endBattle(result){
  if(!battle) return;
  if(result==='win'){
    if(battle.finishing) return;
    battle.finishing = true;
    battle.busy = true;
    Sound.victory();
    playCombatFinisher(!!battle.monster.isBoss);
    setTimeout(()=>endBattle('resolve-win'),720);
    return;
  }
  const resolvedBattle = battle;
  const victory = result==='resolve-win';
  const tier = TIERS[resolvedBattle.tier];
  const isBoss = resolvedBattle.monster.isBoss;
  const isRun = !!resolvedBattle.isRun;
  if(victory){
    flashArena('reward');
    burstSparks(isBoss ? 'var(--ember)' : 'var(--gold-bright)', isBoss ? 18 : 10);
    winStreak++;
    state.totalWins = (state.totalWins||0)+1;
    if(isBoss) state.totalBossWins = (state.totalBossWins||0)+1;
    const bestiaryKey = bestiaryKeyFor(battle.monster);
    const bestiaryEntry = state.bestiary[bestiaryKey] || { wins:0, boss:false, name:battle.monster.name, tier:battle.monster.tier, image:battle.monster.image||'', type:battle.monster.visualType||'' };
    bestiaryEntry.wins++;
    if(isBoss) bestiaryEntry.boss = true;
    state.bestiary[bestiaryKey] = bestiaryEntry;
    const bossMult = isBoss ? 3 : 1;
    const exp = Math.floor(expToNext(state.level) * 0.09 * tier.reward * bossMult);
    let gold = Math.floor((20 + state.level*2) * tier.reward * bossMult * (0.85+Math.random()*0.3));
    if(isRun) gold = Math.max(1, Math.floor(gold * RUN_ECONOMY.victoryGold * (1+runRelicValue('gold'))));
    state.missions.day.hunts++;
    state.missions.week.wins++;
    gainExp(exp);
    gainGold(gold);
    let runLoot = null;
    if(isRun){
      runState.hp = battle.playerHp;
      runState.mana = battle.playerMana;
      runState.monstersDefeated++;
      runState.maxDepth = Math.max(runState.maxDepth||0, runState.depth);
      state.maxHuntDepth = Math.max(state.maxHuntDepth||0, runState.depth);
      runLoot = awardRunLoot(battle.monster);
      if(!battle.healingUsed) awardCombatMastery('noHeal', battle.monster);
      if(runLoot && runLoot.item){
        const dropRank = { common:0, uncommon:1, rare:2, epic:3, legendary:4, mythic:5, unique:6, ancestral:7 };
        const rank = dropRank[itemRarityMeta(runLoot.item).key] ?? 0;
        if(rank>=2) setTimeout(()=>showLootReveal(runLoot.item), rank>=3 ? 550 : 300);
      }
    }
    showFeedback(isBoss ? '☠ JEFE DERROTADO' : '✦ VICTORIA', `+${exp} exp · +${gold} oro${runLoot ? ` · ${runLoot.summary}` : ''}`);
    addLog(`${isBoss?'☠ ¡Jefe derrotado! ':'Venciste a '}${battle.monster.name} (${tier.label}) — +${exp} exp, +${gold} oro`, 'win');
    if([5,10,20,35,50].includes(winStreak)){
      const bonus = isRun ? Math.max(2, Math.floor(winStreak*2)) : winStreak*20;
      gainGold(bonus);
      addLog(`🔥 Racha de ${winStreak} victorias seguidas — bono de +${bonus} oro`, 'level');
    }
  } else {
    Sound.defeat();
    flashArena('skill');
    showFeedback('✕ DERROTA', isRun ? 'La expedición ha terminado' : 'Perdiste parte de tu oro', 'danger');
    if(winStreak>=3) addLog(`Se cortó tu racha de ${winStreak} victorias.`, 'lose');
    winStreak = 0;
    state.missions.day.hunts++;
    if(isRun){
      addLog(`${battle.monster.name} te derrotó en la profundidad ${runState.depth} — la cacería termina aquí.`, 'lose');
    } else {
      const loss = Math.floor(state.gold * 0.05);
      state.gold = Math.max(0, state.gold - loss);
      addLog(`${battle.monster.name} te derrotó — perdiste ${loss} de oro`, 'lose');
    }
  }
  resolvedBattle.ended = true;
  battle = null;
  rollMissionReset();
  if(isRun){
    if(victory){
      // La profundidad 40 es el cierre de una expedición completa.
      if(isBoss && runState.depth===FINAL_RUN_DEPTH && !runState.abyss){
        runState.abyss = true;
        runState.infiniteUnlocked = true;
        state.campaignWins = (state.campaignWins||0) + 1;
        state.materials = state.materials || {};
        state.materials.essence = (state.materials.essence||0) + 10;
        addLog('♛ HITO SUPERADO: venciste al Señor del Abismo. Se abre el Descenso Infinito · +10 esencia.', 'level');
        showFeedback('♾ DESCENSO INFINITO', 'Cada 10 profundidades aumenta la Ascensión enemiga', 'danger');
      }
      advanceToBounty();
    } else finishRun(false);
  }
  render();
  saveState();
}

function spawnFloatText(side, text, cls, stackIndex=0){
  const arena = document.getElementById('arena');
  if(!arena) return;
  const el = document.createElement('div');
  el.className = 'dmg-float ' + (cls||'');
  el.textContent = text;
  // Los golpes de un mismo combo se escalonan en diagonal (en vez de superponerse al azar)
  // para que cada número se pueda leer en el orden en que ocurrió.
  const basePos = side==='player' ? 18 : 66;
  const stagger = Math.min(stackIndex, 3) * 7;
  el.style.left = (basePos + stagger + Math.random()*6)+'%';
  el.style.top = (20 - Math.min(stackIndex,3)*6)+'%';
  el.style.setProperty('--jitter-rot', (Math.random()*6-3)+'deg');
  arena.appendChild(el);
  setTimeout(()=>el.remove(), 1100);
}

function showFeedback(title, value='', tone=''){
  document.querySelectorAll('.feedback-toast').forEach(el=>el.remove());
  const el = document.createElement('div');
  el.className = `feedback-toast ${tone}`;
  el.innerHTML = `<span>${title}</span>${value ? `<span class="feedback-value">${value}</span>` : ''}`;
  document.body.appendChild(el);
  requestAnimationFrame(()=>el.classList.add('show'));
  setTimeout(()=>{ el.classList.remove('show'); setTimeout(()=>el.remove(),300); }, 1500);
}

function flashArena(kind='reward'){
  const arena = document.getElementById('arena');
  if(!arena) return;
  arena.classList.remove(`${kind}-flash`);
  void arena.offsetWidth;
  arena.classList.add(`${kind}-flash`);
}

function showCombatWarning(title, detail='', isBoss=false){
  const arena = document.getElementById('arena');
  if(!arena) return;
  arena.querySelectorAll('.combat-warning').forEach(el=>el.remove());
  const el = document.createElement('div');
  el.className = `combat-warning${isBoss?' boss':''}`;
  el.innerHTML = `<span>${title}</span>${detail ? `<small>${detail}</small>` : ''}`;
  arena.appendChild(el);
  setTimeout(()=>el.remove(),900);
}

function playCombatFinisher(isBoss=false){
  const arena = document.getElementById('arena');
  if(!arena) return;
  arena.querySelectorAll('.combat-finisher').forEach(el=>el.remove());
  const el = document.createElement('div');
  el.className = 'combat-finisher';
  el.innerHTML = `<b>${isBoss ? 'GUARDIÁN VENCIDO' : 'REMATE FINAL'}</b>`;
  arena.appendChild(el);
  setTimeout(()=>el.remove(),850);
}

function burstSparks(color='var(--gold-bright)', amount=10){
  const arena = document.getElementById('arena');
  if(!arena) return;
  for(let i=0;i<amount;i++){
    const spark = document.createElement('i');
    const angle = Math.random()*Math.PI*2;
    const distance = 24 + Math.random()*68;
    spark.className = 'spark';
    spark.style.color = color;
    spark.style.left = `${44 + Math.random()*12}%`;
    spark.style.top = `${34 + Math.random()*22}%`;
    spark.style.setProperty('--x', `${Math.cos(angle)*distance}px`);
    spark.style.setProperty('--y', `${Math.sin(angle)*distance}px`);
    arena.appendChild(spark);
    setTimeout(()=>spark.remove(),700);
  }
}

const COMBAT_VFX = {
  slash:'assets/images/fx-slash.webp',
  arcane:'assets/images/fx-arcane.webp',
  heal:'assets/images/fx-heal.webp',
  shield:'assets/images/fx-shield.webp',
  impact:'assets/images/fx-impact.webp',
  poison:'assets/images/fx-poison.webp'
};
const CLASS_ATTACK_VFX = {
  warrior:'assets/images/fx-warrior.webp', archer:'assets/images/fx-archer.webp', mage:'assets/images/fx-mage.webp',
  priest:'assets/images/fx-priest.webp', assassin:'assets/images/fx-assassin.webp', tamer:'assets/images/fx-tamer.webp'
};
function playClassAttackSprite(isSkill=false){
  const target = document.querySelector('.fighter.monster .sprite-box');
  const classKey = state.characterClass || 'warrior';
  const source = CLASS_ATTACK_VFX[classKey] || CLASS_ATTACK_VFX.warrior;
  if(!target || !source) return;
  // Un único efecto de ataque de clase: evita que golpes rápidos dejen sprites superpuestos.
  target.querySelectorAll('.class-attack-vfx, .combat-vfx.slash').forEach(node=>node.remove());
  const effect = document.createElement('i');
  effect.className = `class-attack-vfx ${classKey} ${isSkill?'skill':''}`;
  effect.innerHTML = `<img src="${source}" alt="" decoding="async">`;
  target.appendChild(effect);
  setTimeout(()=>effect.remove(), isSkill ? 850 : 680);
}
function playCombatVfx(kind, side='monster', extra=''){
  const fighter = document.querySelector(`.fighter.${side==='player' ? 'player' : 'monster'} .sprite-box`);
  const source = COMBAT_VFX[kind];
  if(!fighter || !source) return;
  // El mismo tipo de efecto se reemplaza en vez de apilarse visualmente.
  fighter.querySelectorAll(`.combat-vfx.${kind}`).forEach(node=>node.remove());
  const effect = document.createElement('i');
  effect.className = `combat-vfx ${kind} ${extra}`;
  effect.innerHTML = `<img src="${source}" alt="" decoding="async">`;
  fighter.appendChild(effect);
  setTimeout(()=>effect.remove(), kind==='shield' ? 850 : 820);
}
function playDodge(side='player'){
  const fighter = document.querySelector(`.fighter.${side==='player' ? 'player' : 'monster'}`);
  if(!fighter) return;
  fighter.classList.remove('dodging'); void fighter.offsetWidth; fighter.classList.add('dodging');
  setTimeout(()=>fighter.classList.remove('dodging'),480);
}

const CLASS_MOVE_NAMES = {
  warrior:{ attack:'Corte de Acero', skill:'Embate del Juramento' },
  archer:{ attack:'Flecha Veloz', skill:'Disparo Lunar' },
  mage:{ attack:'Chispa Arcana', skill:'Nova Astral' },
  priest:{ attack:'Golpe Sagrado', skill:'Luz de Aurora' },
  assassin:{ attack:'Danza de Dagas', skill:'Corte Umbrio' },
  tamer:{ attack:'Latigazo Salvaje', skill:'Llamado de la Manada' }
};
function classMoveNames(){ return CLASS_MOVE_NAMES[state.characterClass] || CLASS_MOVE_NAMES.warrior; }
const CLASS_MOVE_INFO = {
  warrior:{ attack:'Golpe físico · recupera 3 maná', skill:'Embate potenciado · 28% de aturdir' },
  archer:{ attack:'Disparo rápido · recupera 3 maná', skill:'Disparo potenciado · 28% de aturdir' },
  mage:{ attack:'Chispa arcana · recupera 3 maná', skill:'Explosión arcana · 28% de aturdir' },
  priest:{ attack:'Golpe sagrado · cura 4.5% de vida', skill:'Luz concentrada · 28% de aturdir' },
  assassin:{ attack:'Corte ágil · recupera 3 maná', skill:'Corte umbrío · 28% de aturdir' },
  tamer:{ attack:'Látigo preciso · recupera 3 maná', skill:'Llamado de manada · 28% de aturdir' }
};
function classMoveInfo(){ return CLASS_MOVE_INFO[state.characterClass] || CLASS_MOVE_INFO.warrior; }
function combatDamageEstimate(isSkill=false){
  if(!battle) return { min:0, max:0, critMin:0, critMax:0 };
  let multiplier = combatStance().attack;
  if(isSkill) multiplier *= 2.3 * (currentClass().skillMult + subclassBonus('skillMult')) * (1+runRelicValue('skillPower'));
  if(battle.playerStatus.markedTurns>0) multiplier *= 1.30;
  if(battle.playerStatus.arcaneCharges>0) multiplier *= 1.35;
  if(battle.monster.status.breakVulnerableTurns>0) multiplier *= 1.25;
  if(battle.monster.archetype && battle.monster.archetype.key==='guardian') multiplier *= .72;
  if(combatMomentum()>=100) multiplier *= 1.5;
  multiplier *= affinityDamageMultiplier(battle.monster,isSkill);
  const min = Math.max(1,Math.round(atkDamage()*multiplier*.85));
  const max = Math.max(min,Math.round(atkDamage()*multiplier*1.15));
  return { min, max, critMin:Math.round(min*critMultiplier()), critMax:Math.round(max*critMultiplier()) };
}
const COMBAT_STANCES = {
  offensive:{ icon:'⚔', label:'Ofensiva', hint:'+25% daño · +15% daño recibido', attack:1.25, taken:1.15 },
  balanced:{ icon:'◈', label:'Equilibrada', hint:'Sin modificadores', attack:1, taken:1 },
  defensive:{ icon:'🛡', label:'Defensiva', hint:'-15% daño · -30% daño recibido', attack:.85, taken:.70 }
};
function combatStance(){
  const key = battle && battle.playerStatus && battle.playerStatus.stance;
  return COMBAT_STANCES[key] || COMBAT_STANCES.balanced;
}
function setCombatStance(key){
  if(!battle || battle.busy || !COMBAT_STANCES[key]) return;
  if(battle.playerStatus.stance===key) return;
  battle.playerStatus.stance = key;
  Sound.click();
  showFeedback(`${COMBAT_STANCES[key].icon} POSTURA ${COMBAT_STANCES[key].label.toUpperCase()}`, COMBAT_STANCES[key].hint, key==='defensive'?'mana':key==='offensive'?'danger':'reward');
  renderActionButtons();
  renderCombatStatus();
}
function playAssassinAttackEffect(isSkill){
  const arena = document.getElementById('arena');
  if(!arena) return;
  const fx = document.createElement('div');
  fx.className = `assassin-fx ${isSkill?'skill':''}`;
  fx.innerHTML = `<i class="afterimage"></i><i class="afterimage two"></i><i class="dagger-streak"></i><i class="dagger-streak b"></i>${isSkill?'<i class="dagger-streak c"></i>':''}`;
  arena.classList.remove('assassin-strike','assassin-skill');
  void arena.offsetWidth;
  arena.classList.add(isSkill?'assassin-skill':'assassin-strike');
  arena.appendChild(fx);
  if(isSkill){
    setTimeout(()=>playCombatVfx('impact','monster','critical'),130);
    setTimeout(()=>playCombatVfx('slash','monster','critical'),240);
  }
  setTimeout(()=>{ fx.remove(); arena.classList.remove('assassin-strike','assassin-skill'); },800);
}
function playClassAttackEffect(isSkill){
  playClassAttackSprite(isSkill);
}

function abilityDefinitions(){
  return [
    { key:'heal', label:'Curación', icon:'✚', level:5, cost:.24, cooldown:3, hint:'Recupera 30% de vida' },
    { key:'shield', label:'Escudo', icon:'🛡', level:8, cost:.18, cooldown:3, hint:'Reduce 2 ataques enemigos' },
    { key:'bleed', label:'Sangrado', icon:'🩸', level:12, cost:.22, cooldown:3, hint:'Daño por 3 turnos' }
  ];
}

function newPlayerStatus(){
  return { stance:'balanced', shieldTurns:0, poisonTurns:0, counterReady:0, markedTurns:0, arcaneCharges:0, companionBoostTurns:0, furyTurns:0, dodgeBoostTurns:0, executionMarkTurns:0, classCooldown:0, momentum:0, lastCombatAction:'', cooldowns:{heal:0,shield:0,bleed:0} };
}
function ensureMomentumStatus(){
  if(!battle || !battle.playerStatus) return null;
  const ps = battle.playerStatus;
  const value = Number(ps.momentum);
  ps.momentum = Math.max(0,Math.min(100,Number.isFinite(value) ? value : 0));
  if(typeof ps.lastCombatAction!=='string') ps.lastCombatAction = '';
  return ps;
}
function combatMomentum(){
  const ps = ensureMomentumStatus();
  return ps ? ps.momentum : 0;
}
function gainCombatMomentum(action, amount){
  const ps = ensureMomentumStatus();
  if(!ps) return 0;
  const wasReady = ps.momentum>=100;
  const varietyBonus = ps.lastCombatAction && ps.lastCombatAction!==action ? 8 : 0;
  ps.momentum = Math.min(100,ps.momentum + amount + varietyBonus);
  ps.lastCombatAction = action;
  if(!wasReady && ps.momentum>=100){
    Sound.reward();
    showFeedback('✦ REMATE DE ÍMPETU LISTO','Tu próximo ataque inflige +50% de daño y gran ruptura','reward');
  }
  return ps.momentum;
}
function consumeMomentumFinisher(){
  const ps = ensureMomentumStatus();
  if(!ps || ps.momentum<100) return false;
  ps.momentum = 0;
  return true;
}
const CLASS_ABILITIES = {
  warrior:{ icon:'🛡', label:'Guardia del Juramento', cost:.18, cooldown:3, hint:'Bloquea y contraataca el próximo golpe' },
  archer:{ icon:'🎯', label:'Marca del Cazador', cost:.16, cooldown:3, hint:'Tus próximos 2 golpes hacen +30% daño' },
  mage:{ icon:'✦', label:'Sobrecarga Astral', cost:.20, cooldown:3, hint:'Potencia tus próximos 2 golpes arcanos' },
  priest:{ icon:'☀', label:'Bendición del Alba', cost:.20, cooldown:3, hint:'Cura y concede un escudo' },
  assassin:{ icon:'🗡', label:'Sentencia Umbría', cost:.22, cooldown:4, hint:'Golpe letal, más fuerte bajo 35% de vida' },
  tamer:{ icon:'🐾', label:'Orden de Manada', cost:.18, cooldown:3, hint:'Tu compañero ataca y se enfurece' }
};
function classAbility(){ return CLASS_ABILITIES[state.characterClass] || CLASS_ABILITIES.warrior; }
function classAbilityCost(){ return Math.round(battle.playerMaxMana*classAbility().cost); }

// Dos técnicas extra para cada senda. No son una mejora pasiva: abren rutas
// distintas de combate y cada una usa recarga para invitar a alternar acciones.
const SUBCLASS_ABILITIES = {
  warrior:{
    guardian:[
      {key:'bulwark',icon:'🛡',label:'Baluarte de Hierro',cost:.14,cooldown:3,effect:'guard',hint:'Gana 3 escudos y un contraataque.'},
      {key:'shieldbash',icon:'💥',label:'Impacto del Bastión',cost:.18,cooldown:3,effect:'bash',hint:'Golpe de ruptura que aturde al objetivo.'}
    ],
    berserker:[
      {key:'bloodrush',icon:'🔥',label:'Furia Carmesí',cost:.15,cooldown:3,effect:'fury',hint:'Tus próximos 3 ataques hacen +35% daño.'},
      {key:'axeexecute',icon:'🪓',label:'Hachazo Final',cost:.22,cooldown:4,effect:'execute',hint:'Golpe brutal; mucho más fuerte bajo 35% de vida enemiga.'}
    ]
  },
  archer:{
    sniper:[
      {key:'aimedshot',icon:'◎',label:'Tiro de Precisión',cost:.19,cooldown:3,effect:'precision',hint:'Disparo crítico garantizado con gran ruptura.'},
      {key:'huntereye',icon:'👁',label:'Ojo del Cazador',cost:.13,cooldown:3,effect:'mark',hint:'Marca al enemigo: tus próximos 3 golpes hacen +30% daño.'}
    ],
    ranger:[
      {key:'leafstep',icon:'🌿',label:'Paso de Hoja',cost:.12,cooldown:3,effect:'dodge',hint:'Alta evasión durante los próximos 2 ataques enemigos.'},
      {key:'arrowrain',icon:'🏹',label:'Lluvia de Flechas',cost:.23,cooldown:4,effect:'volley',hint:'Tres disparos rápidos; excelente contra enemigos frágiles.'}
    ]
  },
  mage:{
    elementalist:[
      {key:'emberrune',icon:'🔥',label:'Runa Ígnea',cost:.18,cooldown:3,effect:'burn',hint:'Impacta y deja al enemigo ardiendo durante 3 turnos.'},
      {key:'elementalburst',icon:'⚡',label:'Torrente Elemental',cost:.22,cooldown:4,effect:'arcane',hint:'Obtiene 3 cargas arcanas para potenciar tus golpes.'}
    ],
    arcanist:[
      {key:'astralprism',icon:'✧',label:'Prisma Astral',cost:.18,cooldown:3,effect:'prism',hint:'Daño arcano y recupera 12% de maná.'},
      {key:'aetherbarrier',icon:'◇',label:'Barrera de Éter',cost:.15,cooldown:3,effect:'manaBarrier',hint:'Gana 2 escudos y recupera maná.'}
    ]
  },
  priest:{
    templar:[
      {key:'radiantjudgment',icon:'⚜',label:'Juicio Radiante',cost:.20,cooldown:3,effect:'judgment',hint:'Daño sagrado y cura una parte de la vida perdida.'},
      {key:'walloffaith',icon:'✚',label:'Muro de Fe',cost:.15,cooldown:3,effect:'guard',hint:'Gana 3 escudos y un contraataque.'}
    ],
    oracle:[
      {key:'sereneprayer',icon:'☀',label:'Oración Serena',cost:.16,cooldown:3,effect:'heal',hint:'Cura 28% de vida y elimina veneno.'},
      {key:'foresight',icon:'✦',label:'Presagio del Alba',cost:.14,cooldown:3,effect:'foresight',hint:'Marca al enemigo y otorga evasión por 2 turnos.'}
    ]
  },
  assassin:{
    shadow:[
      {key:'nightveil',icon:'☾',label:'Velo Nocturno',cost:.12,cooldown:3,effect:'dodge',hint:'Alta evasión durante los próximos 2 ataques enemigos.'},
      {key:'phantomcut',icon:'✧',label:'Corte Fantasma',cost:.19,cooldown:3,effect:'phantom',hint:'Golpe veloz que ignora parte de la defensa enemiga.'}
    ],
    executioner:[
      {key:'deathmark',icon:'☠',label:'Marca de Muerte',cost:.14,cooldown:3,effect:'executionMark',hint:'Durante 3 golpes, +25% daño contra enemigos bajo 50% de vida.'},
      {key:'finalblade',icon:'🗡',label:'Cuchilla Final',cost:.23,cooldown:4,effect:'execute',hint:'Golpe brutal; mucho más fuerte bajo 35% de vida enemiga.'}
    ]
  },
  tamer:{
    beastmaster:[
      {key:'twinpounce',icon:'🐾',label:'Embate Gemelo',cost:.17,cooldown:3,effect:'companion',requiresCompanion:true,hint:'Tu compañero ataca ahora y gana furia por 3 turnos.'},
      {key:'packhowl',icon:'🐺',label:'Aullido de la Manada',cost:.15,cooldown:3,effect:'pack',requiresCompanion:true,hint:'Gana escudo y refuerza a tu compañero.'}
    ],
    binder:[
      {key:'dominionseal',icon:'⧉',label:'Sello de Dominio',cost:.18,cooldown:3,effect:'bash',hint:'Ruptura intensa que aturde al objetivo.'},
      {key:'wildpact',icon:'🪢',label:'Pacto Salvaje',cost:.14,cooldown:3,effect:'manaBarrier',hint:'Gana 2 escudos y recupera maná mediante el vínculo.'}
    ]
  }
};
function subclassAbilityDefinitions(){
  return currentSubclass() ? ((SUBCLASS_ABILITIES[state.characterClass]||{})[state.subclass]||[]) : [];
}
function subclassAbilityCost(ability){ return Math.round(battle.playerMaxMana*ability.cost); }
function combatDodgeChance(){
  const boosted = battle && battle.playerStatus && battle.playerStatus.dodgeBoostTurns>0;
  return Math.min(.82, dodgeChance() + (boosted ? .48 : 0));
}
function subclassHit(power=1, options={}){
  const monster=battle.monster;
  const forcedCrit=!!options.forceCrit;
  const critical=forcedCrit || Math.random()<critChance();
  let raw=Math.max(1,atkDamage()*power*combatStance().attack*(.9+Math.random()*.2));
  if(critical) raw*=critMultiplier();
  if(options.ignoreArmor) raw*=1.22;
  if(monster.status.breakVulnerableTurns>0) raw*=1.25;
  const damage=Math.max(1,Math.round(raw*affinityDamageMultiplier(monster,true)));
  monster.hp=Math.max(0,monster.hp-damage);
  recordRunDamage(damage);
  addMonsterBreak(raw,!!options.heavy);
  playClassAttackEffect(true);
  playCombatVfx(options.vfx||'impact','monster',critical?'critical':'');
  spawnFloatText('monster',`${critical?'CRÍTICO ':''}-${damage}`,critical?'crit':'damage');
  return damage;
}
function useSubclassAbility(key){
  if(!battle || battle.busy) return;
  const ability=subclassAbilityDefinitions().find(entry=>entry.key===key);
  if(!ability) return;
  const ps=battle.playerStatus, monster=battle.monster;
  const rawCost=subclassAbilityCost(ability), cost=visibleSkillCost(rawCost);
  if(ps.cooldowns[key]>0 || battle.playerMana<cost || (ability.requiresCompanion&&!state.companion)) return;
  const abilityBattle=battle;
  battle.busy=true;
  const usedFree=spendSkillCost(rawCost);
  ps.cooldowns[key]=ability.cooldown;
  gainCombatMomentum(`sub-${key}`,30);
  Sound.classSkill(state.characterClass);
  let detail=ability.hint;
  if(ability.effect==='guard'){
    ps.shieldTurns=Math.max(ps.shieldTurns,3); ps.counterReady=1; Sound.shield(); playCombatVfx('shield','player'); detail='3 escudos y contraataque preparado.';
  } else if(ability.effect==='bash'){
    const dmg=subclassHit(1.04,{heavy:true}); monster.status.stunnedTurns=Math.max(monster.status.stunnedTurns,1); detail=`-${dmg} daño · aturdido.`;
  } else if(ability.effect==='fury'){
    ps.furyTurns=3; playCombatVfx('arcane','player'); detail='Furia activa: +35% daño durante 3 ataques.';
  } else if(ability.effect==='execute'){
    const execute=monster.hp<=monster.maxHp*.35, dmg=subclassHit(execute?2.65:1.55,{heavy:true}); detail=`-${dmg} daño${execute?' · EJECUCIÓN':''}.`;
  } else if(ability.effect==='precision'){
    const dmg=subclassHit(1.62,{heavy:true,forceCrit:true}); detail=`-${dmg} daño crítico garantizado.`;
  } else if(ability.effect==='mark'){
    ps.markedTurns=Math.max(ps.markedTurns,3); playCombatVfx('arcane','monster'); detail='Objetivo marcado: +30% daño durante 3 golpes.';
  } else if(ability.effect==='dodge'){
    ps.dodgeBoostTurns=2; playDodge('player'); detail='Evasión elevada para los próximos 2 ataques enemigos.';
  } else if(ability.effect==='volley'){
    const hits=[subclassHit(.52),subclassHit(.52),subclassHit(.52)]; detail=`${hits.map(value=>`-${value}`).join(' · ')} daño en 3 disparos.`;
  } else if(ability.effect==='burn'){
    const dmg=subclassHit(.62); monster.status.bleedTurns=Math.max(monster.status.bleedTurns,3); monster.status.bleedDamage=Math.max(monster.status.bleedDamage,Math.round(atkDamage()*.34)); playCombatVfx('poison','monster'); detail=`-${dmg} daño y quemadura por 3 turnos.`;
  } else if(ability.effect==='arcane'){
    ps.arcaneCharges=Math.max(ps.arcaneCharges,3); playCombatVfx('arcane','player'); detail='3 cargas arcanas listas.';
  } else if(ability.effect==='prism'){
    const dmg=subclassHit(1.18); const mana=Math.max(1,Math.round(battle.playerMaxMana*.12)); battle.playerMana=Math.min(battle.playerMaxMana,battle.playerMana+mana); detail=`-${dmg} daño · +${mana} maná.`;
  } else if(ability.effect==='manaBarrier'){
    const mana=Math.max(1,Math.round(battle.playerMaxMana*.14)); battle.playerMana=Math.min(battle.playerMaxMana,battle.playerMana+mana); ps.shieldTurns=Math.max(ps.shieldTurns,2); playCombatVfx('shield','player'); detail=`2 escudos · +${mana} maná.`;
  } else if(ability.effect==='judgment'){
    const dmg=subclassHit(1.26,{heavy:true}); const heal=Math.max(1,Math.round(dmg*.32)); const before=battle.playerHp; battle.playerHp=Math.min(battle.playerMaxHp,battle.playerHp+heal); if(battle.isRun&&battle.playerHp>before) battle.healingUsed=true; playCombatVfx('heal','player'); spawnFloatText('player',`+${heal}`,'heal'); detail=`-${dmg} daño · +${heal} vida.`;
  } else if(ability.effect==='heal'){
    const heal=Math.max(1,Math.round(battle.playerMaxHp*.28)); const before=battle.playerHp; battle.playerHp=Math.min(battle.playerMaxHp,battle.playerHp+heal); ps.poisonTurns=0; if(battle.isRun&&battle.playerHp>before) battle.healingUsed=true; playCombatVfx('heal','player'); spawnFloatText('player',`+${heal}`,'heal'); detail=`+${heal} vida · veneno eliminado.`;
  } else if(ability.effect==='foresight'){
    ps.markedTurns=Math.max(ps.markedTurns,2); ps.dodgeBoostTurns=Math.max(ps.dodgeBoostTurns,2); playCombatVfx('arcane','player'); detail='Objetivo marcado y evasión elevada por 2 turnos.';
  } else if(ability.effect==='phantom'){
    const dmg=subclassHit(1.45,{heavy:true,ignoreArmor:true}); playAssassinAttackEffect(true); detail=`-${dmg} daño que atraviesa defensas.`;
  } else if(ability.effect==='executionMark'){
    ps.executionMarkTurns=Math.max(ps.executionMarkTurns,3); playCombatVfx('arcane','monster'); detail='+25% daño contra objetivo bajo 50% durante 3 golpes.';
  } else if(ability.effect==='companion'){
    ps.companionBoostTurns=Math.max(ps.companionBoostTurns,3); const dmg=companionAssist(true); detail=`${state.companion.name} golpea${dmg?` por ${dmg}`:''} y gana furia.`;
  } else if(ability.effect==='pack'){
    ps.companionBoostTurns=Math.max(ps.companionBoostTurns,3); ps.shieldTurns=Math.max(ps.shieldTurns,1); playCombatVfx('shield','player'); detail='Manada reforzada por 3 turnos y escudo obtenido.';
  }
  if(usedFree) detail+=' · sin coste';
  addLog(`${currentSubclass().label} usa ${ability.label}${cost?` · -${cost} maná`:''}. ${detail}`,'combat');
  showFeedback(`${ability.icon} ${ability.label.toUpperCase()}`,detail, ability.effect==='heal'||ability.effect==='guard'?'mana':'reward');
  syncBattleUi(); renderActionButtons();
  if(monster.hp<=0){ setTimeout(()=>{ if(isCurrentBattle(abilityBattle)) endBattle('win'); },380); return; }
  startMonsterTurn(abilityBattle);
}

function useClassAbility(){
  if(!battle || battle.busy || battle.playerStatus.classCooldown>0) return;
  const abilityBattle = battle;
  const ability = classAbility();
  const cost = classAbilityCost();
  if(battle.playerMana<cost) return;
  if(state.characterClass==='tamer' && !state.companion) return;
  battle.busy = true;
  battle.playerMana -= cost;
  battle.playerStatus.classCooldown = ability.cooldown;
  gainCombatMomentum('class',32);
  Sound.classSkill(state.characterClass);
  const ps = battle.playerStatus;
  const monster = battle.monster;
  if(state.characterClass==='warrior'){
    ps.shieldTurns = Math.max(ps.shieldTurns,1); ps.counterReady = 1;
    Sound.shield();
    playCombatVfx('shield','player');
    showFeedback('🛡 GUARDIA DEL JURAMENTO','El próximo golpe será bloqueado y respondido','mana');
  } else if(state.characterClass==='archer'){
    ps.markedTurns = 2;
    playCombatVfx('arcane','monster');
    spawnFloatText('monster','🎯 MARCADO','crit');
    showFeedback('🎯 MARCA DEL CAZADOR','Los próximos 2 golpes infligen +30% daño','reward');
  } else if(state.characterClass==='mage'){
    ps.arcaneCharges = 2;
    playCombatVfx('arcane','player');
    showFeedback('✦ SOBRECARGA ASTRAL','Los próximos 2 golpes reciben poder arcano','mana');
  } else if(state.characterClass==='priest'){
    const heal = Math.max(1,Math.round(battle.playerMaxHp*.22));
    const before = battle.playerHp;
    battle.playerHp = Math.min(battle.playerMaxHp,battle.playerHp+heal); ps.shieldTurns = Math.max(ps.shieldTurns,1);
    if(battle.isRun && battle.playerHp>before) battle.healingUsed = true;
    Sound.heal();
    playCombatVfx('heal','player'); playCombatVfx('shield','player'); spawnFloatText('player',`+${heal}`,'heal');
    showFeedback('☀ BENDICIÓN DEL ALBA',`+${heal} vida y escudo sagrado`,'mana');
  } else if(state.characterClass==='assassin'){
    const execute = monster.hp<=monster.maxHp*.35;
    const rawDamage = Math.max(1,Math.round(atkDamage()*(execute?3.15:1.25)*combatStance().attack));
    const damage = Math.max(1,Math.round(rawDamage*affinityDamageMultiplier(monster,true)));
    monster.hp = Math.max(0,monster.hp-damage);
    recordRunDamage(damage);
    playClassAttackEffect(true); playCombatVfx('impact','monster','critical'); addMonsterBreak(rawDamage,true);
    spawnFloatText('monster',`${execute?'EJECUCIÓN ':'🗡 '}-${damage}`,'crit');
    showFeedback('🗡 SENTENCIA UMBRÍA',execute?'La sombra encuentra un punto vital':`-${damage} daño`,'danger');
  } else if(state.characterClass==='tamer'){
    ps.companionBoostTurns = 2;
    const damage = companionAssist(true);
    showFeedback('🐾 ORDEN DE MANADA',`${state.companion.name} ataca y gana furia por 2 turnos${damage?` · -${damage}`:''}`,'reward');
  }
  addLog(`${currentClass().label} usa ${ability.label}${cost?` · -${cost} maná`:''}.`, 'combat');
  syncBattleUi();
  renderActionButtons();
  if(monster.hp<=0){ setTimeout(()=>{ if(isCurrentBattle(abilityBattle)) endBattle('win'); },380); return; }
  startMonsterTurn(abilityBattle);
}

function firstSkillIsFree(){
  return !!(battle && battle.isRun && runRelicValue('firstSkillFree')>0 && !battle.playerStatus.firstSkillUsed);
}
function visibleSkillCost(baseCost){ return firstSkillIsFree() ? 0 : baseCost; }
function spendSkillCost(baseCost){
  const free = firstSkillIsFree();
  if(free) battle.playerStatus.firstSkillUsed = true;
  else battle.playerMana -= baseCost;
  return free;
}

function renderAbilityButtons(box){
  if(!battle || !box) return;
  // Curación, escudo y sangrado se retiraron del kit universal: cada clase combate con sus tres acciones principales.
  box.insertAdjacentHTML('beforeend', '<div class="combat-status" id="combatStatus"></div>');
  return;
  const cooldowns = battle.playerStatus.cooldowns;
  const html = abilityDefinitions().map(ability=>{
    const unlocked = state.level>=ability.level;
    const rawCost = Math.round(battle.playerMaxMana*ability.cost);
    const cost = visibleSkillCost(rawCost);
    const cd = cooldowns[ability.key]||0;
    const ready = unlocked && !battle.busy && cd===0 && battle.playerMana>=cost;
    const sub = !unlocked ? `Nivel ${ability.level}` : cd>0 ? `Recarga: ${cd}` : cost===0 ? 'GRATIS · reliquia' : `${cost} maná`;
    return `<button class="ability-btn ${ready?'ready':''}" data-ability="${ability.key}" ${ready?'':'disabled'}><strong>${ability.icon} ${ability.label}</strong><small>${sub}</small></button>`;
  }).join('');
  // El orden del combate es: ataque base + habilidad general, habilidad única y luego técnicas secundarias.
  const signatureButton = box.querySelector('#classAbilityBtn');
  if(signatureButton) signatureButton.insertAdjacentHTML('afterend', html);
  else box.insertAdjacentHTML('afterbegin', html);
  box.insertAdjacentHTML('beforeend', '<div class="combat-status" id="combatStatus"></div>');
  box.querySelectorAll('[data-ability]').forEach(button=>button.addEventListener('click',()=>useAbility(button.dataset.ability)));
}

function renderCombatStatus(){
  const box = document.getElementById('combatStatus');
  if(!box || !battle) return;
  const ps = battle.playerStatus;
  const ms = battle.monster.status;
  const tags = [];
  const stance = combatStance();
  tags.push(`<span class="status-badge ${ps.stance==='defensive'?'shield':ps.stance==='offensive'?'fury':''}">${stance.icon} Postura ${stance.label}</span>`);
  if(combatMomentum()>=100) tags.push('<span class="status-badge fury">✦ Remate de ímpetu listo</span>');
  if(battle.monster.archetype) tags.push(`<span class="status-badge">${battle.monster.archetype.icon} ${battle.monster.archetype.label}</span>`);
  const affinity = monsterAffinity(battle.monster);
  if(affinity) tags.push(`<span class="status-badge affinity ${affinity.key}${battle.monster.affinityBroken?' broken':''}">${affinity.icon} ${affinity.label}${battle.monster.affinityBroken?' · coraza rota':''}</span>`);
  if(ps.shieldTurns>0) tags.push(`<span class="status-badge shield">🛡 Escudo ${ps.shieldTurns}</span>`);
  if(ps.poisonTurns>0) tags.push(`<span class="status-badge poison">☣ Veneno ${ps.poisonTurns}</span>`);
  if(ps.counterReady>0) tags.push(`<span class="status-badge shield">↩ Contraataque listo</span>`);
  if(ps.markedTurns>0) tags.push(`<span class="status-badge stun">🎯 Marca: ${ps.markedTurns} golpes</span>`);
  if(ps.arcaneCharges>0) tags.push(`<span class="status-badge shield">✦ Cargas arcanas: ${ps.arcaneCharges}</span>`);
  if(ps.companionBoostTurns>0) tags.push(`<span class="status-badge fury">🐾 Manada: ${ps.companionBoostTurns} turnos</span>`);
  if(ps.furyTurns>0) tags.push(`<span class="status-badge fury">🔥 Furia: ${ps.furyTurns} golpes</span>`);
  if(ps.dodgeBoostTurns>0) tags.push(`<span class="status-badge shield">☾ Velo: ${ps.dodgeBoostTurns} ataques</span>`);
  if(ps.executionMarkTurns>0) tags.push(`<span class="status-badge bleed">☠ Marca de muerte: ${ps.executionMarkTurns}</span>`);
  if(ms.bleedTurns>0) tags.push(`<span class="status-badge bleed">🩸 Sangrado ${ms.bleedTurns}</span>`);
  if(ms.stunnedTurns>0) tags.push(`<span class="status-badge stun">✦ Aturdido</span>`);
  if(ms.breakVulnerableTurns>0) tags.push(`<span class="status-badge stun">✦ Defensa rota · +25% daño</span>`);
  if(battle.monster.fury || battle.monster.affinityFury) tags.push(`<span class="status-badge fury">🔥 Furia</span>`);
  if(firstSkillIsFree()) tags.push(`<span class="status-badge shield">✧ Próxima habilidad gratis</span>`);
  box.innerHTML = tags.join('');
}

function useAbility(key){
  if(!battle || battle.busy) return;
  const abilityBattle = battle;
  const ability = abilityDefinitions().find(item=>item.key===key);
  if(!ability || state.level<ability.level || battle.playerStatus.cooldowns[key]>0) return;
  const rawCost = Math.round(battle.playerMaxMana*ability.cost);
  const cost = visibleSkillCost(rawCost);
  if(battle.playerMana<cost) return;
  battle.busy = true;
  const usedFreeSkill = spendSkillCost(rawCost);
  battle.playerStatus.cooldowns[key] = ability.cooldown;
  Sound.skill();
  if(key==='heal'){
    playCombatVfx('heal','player');
    const heal = Math.round(battle.playerMaxHp*.30*(1+runRelicValue('healPower')));
    const before = battle.playerHp;
    battle.playerHp = Math.min(battle.playerMaxHp,battle.playerHp+heal);
    if(battle.isRun && battle.playerHp>before) battle.healingUsed = true;
    spawnFloatText('player',`+${heal}`,'heal');
    showFeedback('✚ CURACIÓN',`+${heal} vida`,'mana');
  } else if(key==='shield'){
    playCombatVfx('shield','player');
    battle.playerStatus.shieldTurns = 2;
    showFeedback('🛡 ESCUDO', 'Los próximos 2 golpes hacen menos daño', 'mana');
  } else {
    playCombatVfx('slash','monster','critical');
    playCombatVfx('poison','monster');
    const dmg = Math.max(1,Math.round(atkDamage()*.75));
    battle.monster.hp = Math.max(0,battle.monster.hp-dmg);
    battle.monster.status.bleedTurns = 3 + runRelicValue('bleedTurns');
    battle.monster.status.bleedDamage = Math.max(1,Math.round(atkDamage()*.28));
    spawnFloatText('monster',`🩸 -${dmg}`,'crit');
    showFeedback('🩸 SANGRADO',`${battle.monster.status.bleedTurns} turnos de hemorragia${usedFreeSkill ? ' · sin coste' : ''}`);
  }
  syncBattleUi();
  if(battle.monster.hp<=0){ setTimeout(()=>{ if(isCurrentBattle(abilityBattle)) endBattle('win'); },350); return; }
  startMonsterTurn(abilityBattle);
}

function playerAttack(isSkill){
  if(!battle || battle.busy) return;
  const rawCost = Math.round(battle.playerMaxMana*currentClass().manaCost*(1-subclassBonus('manaDiscount')));
  const cost = visibleSkillCost(rawCost);
  if(isSkill && battle.playerMana < cost) return;
  const momentumFinisher = consumeMomentumFinisher();
  battle.momentumFinisher = momentumFinisher;
  gainCombatMomentum(isSkill?'skill':'attack',isSkill?26:18);
  battle.busy = true;
  playClassAttackEffect(isSkill);
  if(isSkill) {
    Sound.classSkill(state.characterClass);
    const usedFreeSkill = spendSkillCost(rawCost);
    if(Math.random()<.28) battle.monster.status.stunnedTurns = 1;
    flashArena('skill');
    burstSparks('var(--mana)', 8);
    if(usedFreeSkill) showFeedback('✧ HABILIDAD GRATUITA','El Sello del Alba se consume este combate','mana');
  } else {
    Sound.classAttack(state.characterClass);
    battle.playerMana = Math.min(battle.playerMaxMana, battle.playerMana + 3);
  }
  if(momentumFinisher){
    Sound.crit();
    flashArena('reward');
    burstSparks('var(--gold-bright)',18);
    showFeedback('✦ REMATE DE ÍMPETU','+50% daño y ruptura reforzada','reward');
  }
  syncBattleUi();

  if(!isSkill && state.characterClass==='priest'){
    const heal = Math.max(2, Math.round(battle.playerMaxHp*.045*(1+runRelicValue('healPower'))));
    const before = battle.playerHp;
    battle.playerHp = Math.min(battle.playerMaxHp, battle.playerHp + heal);
    if(battle.isRun && battle.playerHp>before) battle.healingUsed = true;
    spawnFloatText('player', `+${heal}`, 'heal');
    syncBattleUi();
  }

  let hits = 1;
  while(hits < 4 && Math.random() < extraTurnChance()) hits++;
  if(hits>1) showComboBadge(hits);

  runPlayerHits(hits, isSkill, 0);
}

function showComboBadge(hits){
  const arena = document.getElementById('arena');
  if(!arena) return;
  arena.querySelectorAll('.combo-badge').forEach(el=>el.remove());
  const el = document.createElement('div');
  el.className = 'combo-badge';
  el.textContent = `COMBO x${hits}`;
  arena.appendChild(el);
  setTimeout(()=>el.remove(), 1300);
}

function tamingChance(){
  const charmBonus = (state.fishing && state.fishing.tameCharm) ? 12 : 0;
  return Math.min(90, 18 + state.level*1.1 + baseStat('agilidad')*1.6 + charmBonus);
}
function tryTameMonster(){
  if(!battle || !battle.isRun || battle.busy || state.characterClass!=='tamer' || battle.monster.isBoss) return;
  const tameBattle = battle;
  if(battle.monster.hp > battle.monster.maxHp*.5) return;
  battle.busy = true;
  const chance = tamingChance();
  const usedCharm = !!(state.fishing && state.fishing.tameCharm);
  if(usedCharm) state.fishing.tameCharm = false;
  Sound.classSkill('tamer');
  if(Math.random()*100 < chance){
    const form = MONSTER_FORMS[battle.monster.tier] || MONSTER_FORMS.facil;
    const companionName = battle.monster.name;
    state.companion = { name:companionName, tier:battle.monster.tier, image:battle.monster.image || form.image };
    battle.monster.hp = 0;
    playCombatVfx('arcane','monster','critical');
    spawnFloatText('monster','¡DOMADO!','crit');
    showFeedback('COMPAÑERO CAPTURADO', `${companionName} luchará a tu lado${usedCharm?' · Amuleto de captura usado':''}`, 'reward');
    syncBattleUi();
    setTimeout(()=>{ if(isCurrentBattle(tameBattle)) endBattle('win'); },420);
  } else {
    spawnFloatText('monster','Se resistió','miss');
    showFeedback('CAPTURA FALLIDA', `${Math.round(chance)}% de posibilidad${usedCharm?' · Amuleto de captura usado':''}`, 'danger');
    setTimeout(()=>startMonsterTurn(tameBattle),340);
  }
}
function companionAssist(force=false){
  const boosted = !!(battle && battle.playerStatus && battle.playerStatus.companionBoostTurns>0);
  const chance = .46 + subclassBonus('companionRate') + runRelicValue('companionRate') + (boosted ? .24 : 0);
  if(!battle || !state.companion || (!force && Math.random()>chance)) return 0;
  const rawDamage = Math.max(2, Math.round((atkDamage()*.38 + state.level*.8) * (1+subclassBonus('companionPower')) * (boosted?1.35:1)));
  const damage = Math.max(1, Math.round(rawDamage*affinityDamageMultiplier(battle.monster,false)));
  battle.monster.hp = Math.max(0, battle.monster.hp-damage);
  recordRunDamage(damage);
  addMonsterBreak(rawDamage,false);
  playCombatVfx('slash','monster');
  Sound.classAttack('tamer');
  // Se retrasa un poco y se desplaza para que no caiga justo encima del número del jugador.
  setTimeout(()=>spawnFloatText('monster',`${state.companion.name} -${damage}`,'crit',3), 220);
  return damage;
}

function runPlayerHits(totalHits, isSkill, doneCount, reference=battle){
  if(!isCurrentBattle(reference)) return;
  const pf = document.querySelector('.fighter.player');
  const mf = document.querySelector('.fighter.monster');
  if(pf) pf.classList.add('attacking');

  setTimeout(()=>{
    if(!isCurrentBattle(reference)) return;
    const isCrit = Math.random() < critChance();
    if (isCrit) {
      Sound.crit();
      const critColors = { warrior:'#ff8a55', archer:'#a9e981', mage:'#8bc8ff', priest:'#ffe7a0', assassin:'#dc9dff', tamer:'#78e2c6' };
      // Golpes repetidos del mismo combo usan menos chispas para no saturar la pantalla.
      burstSparks(critColors[state.characterClass] || 'var(--gold-bright)', doneCount>0 ? 7 : 14);
      const arenaEl = document.getElementById('arena');
      arenaEl.classList.remove('crit-shake'); void arenaEl.offsetWidth; arenaEl.classList.add('crit-shake');
    }
    else if (doneCount > 0) Sound.hit();

    const comboMult = 1 + Math.min(0.5, winStreak*0.03);
    const marked = battle.playerStatus.markedTurns>0;
    const arcaneCharged = battle.playerStatus.arcaneCharges>0;
    const fury = battle.playerStatus.furyTurns>0;
    const executionMarked = battle.playerStatus.executionMarkTurns>0 && battle.monster.hp<=battle.monster.maxHp*.5;
    const momentumHit = !!reference.momentumFinisher;
    let rawDmg = atkDamage() * combatStance().attack * (isSkill ? 2.3 * (currentClass().skillMult + subclassBonus('skillMult')) * (1+runRelicValue('skillPower')) : 1) * comboMult * (0.85+Math.random()*0.3);
    if(momentumHit) rawDmg *= 1.5;
    reference.momentumFinisher = false;
    if(marked) rawDmg *= 1.30;
    if(arcaneCharged) rawDmg *= 1.35;
    if(fury) rawDmg *= 1.35;
    if(executionMarked) rawDmg *= 1.25;
    if(isCrit) rawDmg *= critMultiplier();
    if(battle.monster.archetype && battle.monster.archetype.key==='guardian') rawDmg *= .72;
    const vulnerable = battle.monster.status.breakVulnerableTurns>0;
    if(vulnerable) rawDmg *= 1.25;
    const dmg = Math.max(1, Math.round(rawDmg*affinityDamageMultiplier(battle.monster,isSkill)));
    battle.monster.hp = Math.max(0, battle.monster.hp - dmg);
    if(vulnerable) battle.monster.status.breakVulnerableTurns--;
    if(marked) battle.playerStatus.markedTurns--;
    if(arcaneCharged) battle.playerStatus.arcaneCharges--;
    if(fury) battle.playerStatus.furyTurns--;
    if(battle.playerStatus.executionMarkTurns>0) battle.playerStatus.executionMarkTurns--;
    if(isCrit && runRelicValue('critHeal')>0){
      const heal = Math.max(1,Math.round(battle.playerMaxHp*runRelicValue('critHeal')));
      const before = battle.playerHp;
      battle.playerHp = Math.min(battle.playerMaxHp,battle.playerHp+heal);
      if(battle.isRun && battle.playerHp>before) battle.healingUsed = true;
      spawnFloatText('player',`+${heal}`,'heal');
    }
    recordRunDamage(dmg);
    addMonsterBreak(rawDmg, isCrit || momentumHit);
    companionAssist();
    const isBigHit = dmg >= battle.monster.maxHp*.16;
    const isMegaHit = dmg >= battle.monster.maxHp*.32;
    // Hit-stop: una micropausa antes de que el golpe "impacte" en pantalla,
    // para que los golpes fuertes se sientan con más peso.
    const hitStopDelay = isCrit ? 90 : (isMegaHit ? 75 : (isBigHit ? 55 : 0));
    const applyImpact = () => {
      mf.classList.remove('hit'); void mf.offsetWidth; mf.classList.add('hit');
      if(!isCrit && isBigHit){
        const arenaEl = document.getElementById('arena');
        const shakeClass = isMegaHit ? 'mega-shake' : 'hit-shake';
        arenaEl.classList.remove('hit-shake','mega-shake'); void arenaEl.offsetWidth; arenaEl.classList.add(shakeClass);
      }
      const tag = isCrit ? 'CRIT ' : '';
      spawnFloatText('monster', tag+'-'+dmg, (isCrit?'crit':'')+(isBigHit?' big':''), doneCount);
      addLog(`${isSkill?'✦ Habilidad':'⚔ Ataque'}${isCrit?' crítico':''}: ${battle.monster.name} recibe ${dmg} de daño.`, isCrit?'crit':'combat');
      pf.classList.remove('attacking');
      syncBattleUi();

      if(battle.monster.hp <= 0){
        mf.classList.add('dead');
        battle.busy = false;
        setTimeout(()=>{ if(isCurrentBattle(reference)) endBattle('win'); }, 500);
        return;
      }

      doneCount++;
      if(doneCount < totalHits){
        setTimeout(()=>runPlayerHits(totalHits, isSkill, doneCount, reference), 320);
        return;
      }

      setTimeout(()=>{
        if(!isCurrentBattle(reference)) return;
        if(triggerBossPhaseTwo()) return;
        startMonsterTurn(reference);
      }, 260);
    };
    if(hitStopDelay>0) setTimeout(()=>{ if(isCurrentBattle(reference)) applyImpact(); }, hitStopDelay);
    else applyImpact();
    return;
    setTimeout(()=>{
      mf.classList.add('attacking');
      setTimeout(()=>{
        const dodged = Math.random() < combatDodgeChance();
        mf.classList.remove('attacking');
        if(dodged){
          Sound.miss();
          spawnFloatText('player', '¡Esquivado!', 'miss');
        } else {
          Sound.hit();
          let baseMonsterDmg = battle.monster.dmg * (0.85+Math.random()*0.3);
          let dmg2 = Math.max(1, Math.round(baseMonsterDmg * (1 - damageReduction())));
          
          battle.playerHp = Math.max(0, battle.playerHp - dmg2);
          pf.classList.remove('hit'); void pf.offsetWidth; pf.classList.add('hit');
          spawnFloatText('player', '-'+dmg2, '');
        }
        syncBattleUi();
        battle.busy = false;
        syncBattleUi();
        if(battle.playerHp <= 0){
          pf.classList.add('dead');
          setTimeout(()=>endBattle('lose'), 500);
        }
      }, 260);
    }, 300);
  }, 260);
}

function doTrain(){
  Sound.click();
  const exp = Math.floor(expToNext(state.level) * 0.025);
  showFeedback('⚒ ENTRENAMIENTO', `+${exp} exp`, 'mana');
  gainExp(exp);
  addLog(`Entrenamiento — +${exp} exp`, '');
  rollMissionReset();
  render();
  saveState();
}

let subclassChoiceOpen = false;
function subclassBonusText(bonuses={}){
  const labels={hp:'Vida',mana:'Maná',atk:'Ataque',def:'Defensa',crit:'Crítico',critDmg:'Daño crítico',dodge:'Evasión',speed:'Rapidez',skillMult:'Poder de habilidad',manaDiscount:'Ahorro de maná',companionRate:'Frecuencia del compañero',companionPower:'Daño del compañero'};
  return Object.entries(bonuses).map(([key,value])=>{
    const percentage=['crit','critDmg','dodge','speed'].includes(key) ? value : ['skillMult','manaDiscount','companionRate','companionPower'].includes(key) ? Math.round(value*100) : null;
    return `+${percentage===null?value:percentage}${percentage===null?'':'%'} ${labels[key]||key}`;
  }).join(' · ');
}
function openSubclassChoice(forRebirth=false){
  if(subclassChoiceOpen || state.subclass) return;
  const choices=SUBCLASSES[state.characterClass] || {};
  if(!Object.keys(choices).length) return;
  subclassChoiceOpen=true;
  const overlay=document.createElement('div');
  overlay.className='subclass-overlay';
  overlay.id='subclassOverlay';
  overlay.innerHTML=`<section class="subclass-modal" role="dialog" aria-modal="true"><div class="subclass-kicker">✦ PRIMER RENACIMIENTO</div><h2>ELEGÍ TU SENDA</h2><p>Esta especialización será permanente para <b>${escapeHtml(state.name)}</b>.</p><div class="subclass-grid">${Object.entries(choices).map(([id,sub])=>`<button class="subclass-card" data-subclass="${id}">${sub.image?`<img src="${sub.image}" alt="${sub.label}" decoding="async">`:`<span>${sub.icon}</span>`}<b>${sub.icon} ${sub.label}</b><small>${sub.description}</small><em>${subclassBonusText(sub.bonuses)}</em><strong>ELEGIR SENDA</strong></button>`).join('')}</div></section>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(()=>overlay.classList.add('show'));
  overlay.querySelectorAll('[data-subclass]').forEach(button=>button.addEventListener('click',()=>{
    const id=button.dataset.subclass, sub=choices[id];
    if(!sub || !confirm(`¿Elegir ${sub.label}? Esta senda quedará guardada con el personaje.`)) return;
    state.subclass=id;
    subclassChoiceOpen=false;
    overlay.remove();
    Sound.victory();
    showFeedback(`${sub.icon} ${sub.label.toUpperCase()}`, subclassBonusText(sub.bonuses), 'level');
    addLog(`✦ Senda desbloqueada: ${sub.label} — ${subclassBonusText(sub.bonuses)}.`, 'level');
    if(forRebirth) performRebirth(); else { render(); saveState(); }
  }));
}
function performRebirth(){
  Sound.victory();
  state.resets++;
  state.level = 1;
  state.exp = 0;
  const freshStats = defaultState(state.name, state.characterClass).stats;
  state.stats = { ...freshStats };
  state.robustness = 0;
  state.perception = 0;
  state.critRateStat = 0;
  state.critDmgStat = 0;
  state.allocatedPoints = emptyPointMap();
  state.pendingPoints = emptyPointMap();
  state.statPoints = rebirthStartingPoints();
  if(state.missions?.week) state.missions.week.resets = (state.missions.week.resets||0) + 1;
  if(state.missions?.month) state.missions.month.resets = (state.missions.month.resets||0) + 1;
  addLog(`✦ RENACIMIENTO #${state.resets} — Marca Eterna obtenida · +${resetStatBonus()} progreso base · ${state.statPoints} puntos iniciales`, 'reset');
  showFeedback(`✦ MARCA ETERNA ${state.resets}`, `Nivel 1 · ${state.statPoints} puntos iniciales · equipo conservado`, 'level');
  rollMissionReset();
  render();
  saveState();
}
function doReset(){
  if(state.level < LEVEL_CAP || battle || (runState && runState.phase!=='ended')) return;
  if(state.resets===0 && !state.subclass){ openSubclassChoice(true); return; }
  if(!confirm(`¿Renacer como nivel 1?\n\nConservarás equipo, inventario, oro, materiales, logros, bestiario y tu subclase. Recibirás la Marca Eterna #${state.resets+1}.`)) return;
  performRebirth();
}

/* ================= MODO ROGUELIKE: FLUJO DE LA RUN ================= */
function switchHuntMode(mode){
  if(mode===huntMode) return;
  if(battle) return; // no se puede cambiar de modo en pleno combate
  if(mode==='free' && runState && runState.phase!=='ended') return; // no abandonar una run activa
  Sound.click();
  huntMode = mode;
  render();
}

function startRun(startDepth=1, abyss=false){
  // Un Event de un botón nunca debe usarse como profundidad.
  startDepth = Math.max(1, Math.floor(finiteNumber(startDepth, 1)));
  abyss = typeof abyss==='boolean' ? abyss : false;
  if(runState && runState.phase!=='ended') return;
  if(fishCast && fishCast.phase!=='result'){ showFeedback('PESCA EN CURSO','Terminá o cancelá la pesca antes de cazar.','danger'); return; }
  fishCast = null;
  Sound.click();
  state.companion = null;
  runState = {
    depth: startDepth,
    hp: maxHP(), maxHp: maxHP(), mana: maxMana(), maxMana: maxMana(),
    // La primera acción de una expedición siempre es elegir una ruta.
    phase: 'map',
    monstersDefeated: 0,
    maxDepth: 0,
    chosenBounty: null,
    dice: [1,2,3,4,5], held: [false,false,false,false,false], rollsLeft: 0,
    comboRank: null, rewardPreview: null,
    runGold: 0,
    runGoldClaimed: false,
    retreated: false,
    relics: [],
    tempStats: {},
    telemetry: emptyRunTelemetry(),
    mapNodes: [], currentNode: null, routePlan: [], routeFloor: 0, routeHistory: [], abyss:!!abyss, weeklyTrial:activeWeeklyTrial().key
  };
  ensureRoutePlan();
  showFeedback('RUTA ABIERTA', 'Elegí tu primer destino antes de combatir.', 'reward');
  addLog('🩸 Comienza una nueva Cacería Roguelike. Un monstruo común aguarda en la profundidad 1.', 'level');
  render();
  saveState();
}

function advanceToBounty(){
  runState.phase = 'bounty';
  runState.chosenBounty = null;
}

function endMonsterTurn(reference=battle){
  if(!isCurrentBattle(reference)) return;
  const ps = reference.playerStatus;
  if(ps.poisonTurns>0){
    const poison = Math.max(1, Math.round(reference.playerMaxHp*.055));
    reference.playerHp = Math.max(0,reference.playerHp-poison);
    ps.poisonTurns--;
    playCombatVfx('poison','player');
    Sound.poison();
    spawnFloatText('player',`☣ -${poison}`,'miss');
  }
  Object.keys(ps.cooldowns).forEach(key=>{ if(ps.cooldowns[key]>0) ps.cooldowns[key]--; });
  if(ps.classCooldown>0) ps.classCooldown--;
  if(ps.companionBoostTurns>0) ps.companionBoostTurns--;
  if(ps.dodgeBoostTurns>0) ps.dodgeBoostTurns--;
  reference.busy = false;
  syncBattleUi();
  renderActionButtons();
  if(reference.playerHp<=0){
    const fighter = document.querySelector('.fighter.player');
    if(fighter) fighter.classList.add('dead');
    setTimeout(()=>{ if(isCurrentBattle(reference)) endBattle('lose'); },450);
  }
}

function resolveMonsterHits(remaining, special={}, reference=battle, hitIndex=0){
  if(!isCurrentBattle(reference)) return;
  const monster = reference.monster;
  const fighter = document.querySelector('.fighter.monster');
  const player = document.querySelector('.fighter.player');
  if(fighter) fighter.classList.add('attacking');
  setTimeout(()=>{
    if(!isCurrentBattle(reference)) return;
    if(fighter) fighter.classList.remove('attacking');
    const strongAttack = !!monster.charging || finiteNumber(special.mult,0)>=1.45;
    const dodged = Math.random()<combatDodgeChance();
    const continueTurn = () => {
      syncBattleUi();
      if(monster.hp<=0){ setTimeout(()=>{ if(isCurrentBattle(reference)) endBattle('win'); },350); return; }
      if(reference.playerHp<=0){ endMonsterTurn(reference); return; }
      if(remaining>1){ setTimeout(()=>resolveMonsterHits(remaining-1,special,reference,hitIndex+1),300); }
      else setTimeout(()=>{ if(isCurrentBattle(reference)) endMonsterTurn(reference); },240);
    };
    if(dodged){
      if(monster.charging) monster.charging=false;
      Sound.miss();
      playDodge('player');
      spawnFloatText('player','Esquivado','miss',hitIndex);
      addLog(`↝ Esquivaste el ataque de ${monster.name}.`, 'combat');
      if(strongAttack) awardCombatMastery('dodge', monster);
      continueTurn();
    } else {
      let mult = monster.affinityFury ? 1.40 : (monster.fury ? 1.45 : 1);
      if(monster.affinityFury && reference.playerStatus.stance==='defensive') mult *= .70;
      if(monster.charging){ mult *= 1.85; monster.charging=false; }
      if(special.mult) mult *= special.mult;
      let damage = monster.dmg*(.85+Math.random()*.3)*mult*combatStance().taken;
      const shielded = reference.playerStatus.shieldTurns>0;
      if(shielded){ damage*=.48; reference.playerStatus.shieldTurns--; }
      damage = Math.max(1,Math.round(damage * (1-damageReduction())));
      const isBigHit = !shielded && damage >= reference.playerMaxHp*.16;
      const isMegaHit = !shielded && damage >= reference.playerMaxHp*.32;
      // Hit-stop: micropausa antes de que el golpe recibido impacte en pantalla.
      const hitStopDelay = isMegaHit ? 90 : (isBigHit ? 70 : 0);
      const applyImpact = () => {
        reference.playerHp = Math.max(0,reference.playerHp-damage);
        if(player){ player.classList.remove('hit'); void player.offsetWidth; player.classList.add('hit'); }
        playCombatVfx(shielded ? 'shield' : 'impact','player',shielded ? '' : 'enemy-hit');
        if(isBigHit){
          const arenaEl = document.getElementById('arena');
          const shakeClass = isMegaHit ? 'mega-shake' : 'hit-shake';
          arenaEl.classList.remove('hit-shake','mega-shake'); void arenaEl.offsetWidth; arenaEl.classList.add(shakeClass);
        }
        spawnFloatText('player',`-${damage}`, isBigHit?'big':'', hitIndex);
        Sound.enemyAttack(monster, shielded);
        addLog(`💢 ${monster.name} te golpea por ${damage} de daño${shielded?' · daño bloqueado':''}.`, 'enemy');
        if(special.manaBurn){
          const burn = Math.max(1,Math.round(reference.playerMaxMana*special.manaBurn));
          reference.playerMana = Math.max(0,reference.playerMana-burn);
          playCombatVfx('arcane','player','enemy-hit');
          spawnFloatText('player',`-${burn} maná`,'miss',hitIndex);
        }
        const affinityVenom = monsterAffinity(monster)?.key==='venomous';
        const venomHit = (monster.archetype.key==='venom' && Math.random()<.55) || special.poison || affinityVenom;
        if(venomHit && !shielded){
          reference.playerStatus.poisonTurns = Math.max(reference.playerStatus.poisonTurns,2);
          playCombatVfx('poison','player');
          spawnFloatText('player','☣ Veneno','miss',hitIndex);
        } else if(affinityVenom && shielded){
          addLog(`🛡 El escudo bloquea la toxina de ${monster.name}.`, 'combat');
        }
        if(reference.playerStatus.counterReady>0){
          const counter = Math.max(1,Math.round(atkDamage()*.72));
          reference.playerStatus.counterReady = 0;
          monster.hp = Math.max(0,monster.hp-counter);
          recordRunDamage(counter);
          playCombatVfx('slash','monster','critical');
          addMonsterBreak(counter,true);
          spawnFloatText('monster',`↩ -${counter}`,'crit',hitIndex);
          addLog(`↩ Contraataque: ${monster.name} recibe ${counter} de daño.`, 'combat');
        }
        continueTurn();
      };
      if(hitStopDelay>0) setTimeout(()=>{ if(isCurrentBattle(reference)) applyImpact(); }, hitStopDelay);
      else applyImpact();
    }
  },260);
}

function startMonsterTurn(reference=battle){
  if(!isCurrentBattle(reference)) return;
  const monster = reference.monster;
  const status = monster.status;
  if(status.bleedTurns>0){
    monster.hp = Math.max(0,monster.hp-status.bleedDamage);
    status.bleedTurns--;
    recordRunDamage(status.bleedDamage);
    playCombatVfx('impact','monster');
    spawnFloatText('monster',`🩸 -${status.bleedDamage}`,'crit');
    syncBattleUi();
    if(monster.hp<=0){ setTimeout(()=>{ if(isCurrentBattle(reference)) endBattle('win'); },350); return; }
    if(triggerBossPhaseTwo()) return;
  }
  if(monsterAffinity(monster)?.key==='furious' && !monster.affinityFury && monster.hp<=monster.maxHp*.5){
    monster.affinityFury=true;
    Sound.crit();
    playCombatVfx('impact','monster','critical');
    spawnFloatText('monster','🔥 FURIA','crit');
    showFeedback('🔥 FURIA DEL ÉLITE','Postura Defensiva reduce su embate','danger');
    addLog(`${monster.name} activa Furioso: usa Postura Defensiva o rompé su guardia.`, 'enemy');
  } else if(!monster.fury && monster.hp<=monster.maxHp*.35){
    monster.fury=true;
    Sound.crit();
    playCombatVfx('impact','monster','critical');
    spawnFloatText('monster','🔥 FURIA','crit');
    showFeedback('🔥 EL ENEMIGO ENTRA EN FURIA','Sus ataques hacen más daño','danger');
  }
  if(status.stunnedTurns>0){
    status.stunnedTurns--;
    Sound.miss();
    playCombatVfx('arcane','monster');
    spawnFloatText('monster','✦ Aturdido','miss');
    setTimeout(()=>endMonsterTurn(reference),260);
    return;
  }
  if(monster.archetype.key==='charger' && !monster.charging){
    monster.charging=true;
    Sound.warning();
    playCombatVfx('impact','monster');
    spawnFloatText('monster','💥 Cargando','crit');
    showCombatWarning('⚠ GOLPE DEVASTADOR','Usá Defensa, Escudo o rompé su carga');
    showFeedback('💥 GOLPE CARGADO','Interrumpilo o preparate','danger');
    syncBattleUi();
    setTimeout(()=>endMonsterTurn(reference),380);
    return;
  }
  if(monster.isBoss && monster.phaseTwo){
    monster.phaseAttackCounter++;
    if(monster.phaseAttackCounter%2===1){
      bossPhaseAttack(monster);
      return;
    }
  }
  const hits = monster.archetype.key==='swift' ? 2 : 1;
  resolveMonsterHits(hits,{},reference);
}

function advanceToMap(){
  const nextDepth = runState.depth + 1;
  const beginsNewAct = !runState.routePlan || !runState.routePlan.length || nextDepth%5===1;
  runState.depth = nextDepth;
  if(beginsNewAct){
    runState.routePlan = makeRoutePlan(nextDepth);
    runState.routeFloor = 0;
    runState.routeHistory = [];
  } else {
    runState.routeFloor = Math.min((runState.routeFloor||0)+1,runState.routePlan.length-1);
  }
  ensureRoutePlan();
  runState.currentNode = null;
  runState.phase = 'map';
  render();
  saveState();
}

function selectMapNodeWithJuice(nodeEl, index){
  if(!runState || runState.phase!=='map') return;
  const arena = document.getElementById('arena');
  if(arena){
    arena.querySelectorAll('[data-map-node]').forEach(el=>{
      if(el===nodeEl){ el.classList.add('chosen'); }
      else { el.classList.add('dimmed'); }
      el.style.pointerEvents = 'none';
    });
    for(let i=0;i<9;i++){
      const spark = document.createElement('i');
      const angle = Math.random()*Math.PI*2, dist = 20+Math.random()*36;
      spark.className = 'node-choice-spark';
      spark.style.left = '50%'; spark.style.top = '50%';
      spark.style.setProperty('--x', `${Math.cos(angle)*dist}px`);
      spark.style.setProperty('--y', `${Math.sin(angle)*dist}px`);
      nodeEl.appendChild(spark);
      setTimeout(()=>spark.remove(), 650);
    }
  }
  setTimeout(()=>chooseMapNode(index), 260);
}
function chooseMapNode(index){
  if(!runState || runState.phase!=='map') return;
  const node = runState.mapNodes[index];
  if(!node) return;
  Sound.click();
  runState.routeHistory[runState.routeFloor] = { index, type:node.type };
  recordRunRoute(node);
  runState.pendingNode = node;
  runState.relicChoices = makeRelicChoices();
  // Las reliquias son hitos: élites/jefes las garantizan; en rutas comunes sólo aparecen a veces.
  const relicMilestone = ['elite','boss'].includes(node.type);
  const relicChance = relicMilestone || Math.random()<0.24;
  if(relicChance && runState.relicChoices.length){
    runState.phase = 'relic';
    render();
  } else {
    enterSelectedMapNode();
    saveState();
  }
}
function enterSelectedMapNode(){
  const node = runState && runState.pendingNode;
  if(!node) return;
  runState.currentNode = node;
  runState.pendingNode = null;
  runState.relicChoices = [];
  if(['fight','elite','boss'].includes(node.type)){
    startRunBattle();
    return;
  }
  if(node.type==='treasure'){
    const gold = Math.max(6, Math.floor((10 + runState.depth*2) * (1 + perceptionLootBonus()*.15)));
    runState.runGold = Math.max(0, finiteNumber(runState.runGold,0)) + gold;
    addLog(`Tesoro encontrado: +${gold} oro de expedición.`, 'win');
    showFeedback('⌘ TESORO', `+${gold} oro de expedición · se cobra al salir`, 'reward');
    Sound.reward();
    advanceToBounty(); render(); saveState();
    return;
  }
  if(node.type==='event') runState.scenarioEvent = makeScenarioEvent();
  if(node.type==='tracking') runState.trackingChoices = makeTrackingChoices();
  if(node.type==='merchant') runState.merchantOffers = makeMerchantOffers();
  runState.phase = node.type;
  render();
}
function chooseRunRelic(id){
  if(!runState || runState.phase!=='relic') return;
  const relic = (runState.relicChoices||[]).find(entry=>entry.id===id);
  if(!relic) return;
  Sound.reward();
  addRunRelic(relic);
  showFeedback(`${relic.icon} RELIQUIA ELEGIDA`, relic.name, 'reward');
  enterSelectedMapNode();
  saveState();
}

function chooseShrine(kind){
  if(!runState || runState.phase!=='shrine') return;
  if(kind==='heal'){
    const amount = Math.round(runState.maxHp*.45);
    runState.hp = Math.min(runState.maxHp, runState.hp+amount);
    addLog(`El santuario restaura ${amount} de vida.`, 'win');
    showFeedback('✚ SANTUARIO', `+${amount} vida`);
    Sound.heal();
  } else {
    const amount = Math.round(runState.maxMana*.55);
    runState.mana = Math.min(runState.maxMana, runState.mana+amount);
    addLog(`El santuario restaura ${amount} de maná.`, 'win');
    showFeedback('✚ SANTUARIO', `+${amount} maná`, 'mana');
    Sound.mana();
  }
  advanceToBounty(); render(); saveState();
}

function chooseEvent(kind){
  if(!runState || runState.phase!=='event') return;
  if(kind==='safe'){
    const gold = Math.max(5, Math.floor(8 + runState.depth));
    runState.runGold = Math.max(0, finiteNumber(runState.runGold,0)) + gold;
    addLog(`El viajero te entrega ${gold} oro de expedición.`, 'win');
    showFeedback('? VIAJERO', `+${gold} oro de expedición`, 'reward');
    Sound.reward();
  } else {
    const cost = Math.max(1, Math.round(runState.maxHp*.12));
    const points = 2 + Math.floor(runState.depth/4);
    runState.hp = Math.max(1, runState.hp-cost);
    const stat = pick(STAT_KEYS);
    runState.tempStats = runState.tempStats || {};
    runState.tempStats[stat] = (runState.tempStats[stat]||0)+points;
    syncRunResources();
    addLog(`El altar cobra ${cost} vida y otorga +${points} ${STAT_LABELS[stat]} temporal para esta expedición.`, 'level');
    showFeedback('? ALTAR ANTIGUO', `-${cost} vida · +${points} ${STAT_LABELS[stat]}`, 'danger');
    Sound.poison();
    setTimeout(()=>Sound.reward(), 140);
  }
  advanceToBounty(); render(); saveState();
}

function makeTrackingChoices(){
  const depth = runState ? runState.depth : 1;
  const essence = Math.max(1, 1 + Math.floor(depth/18));
  const gold = Math.max(5, Math.round((9 + depth*2) * (1 + perceptionLootBonus()*.15)));
  return [
    { id:'alpha', icon:'🐾', label:'Huellas pesadas', detail:'Bestia élite · gran botín', outcome:'elite' },
    { id:'cache', icon:'🪶', label:'Plumas brillantes', detail:`${gold} oro · ${essence} esencia`, outcome:'treasure', gold, essence },
    { id:'den', icon:'🌿', label:'Guarida oculta', detail:'Recuperá vida y encontrá una reliquia', outcome:'den' }
  ].sort(()=>Math.random()-.5);
}
function chooseTrackingTrail(id){
  if(!runState || runState.phase!=='tracking') return;
  const trail=(runState.trackingChoices||[]).find(entry=>entry.id===id);
  if(!trail) return;
  Sound.skill();
  if(trail.outcome==='elite'){
    runState.currentNode={type:'elite', tracked:true};
    addLog('🐾 Seguiste huellas pesadas: una bestia élite te corta el paso.', 'combat');
    showFeedback('🐾 BESTIA RASTREADA','Élite localizada · botín mejorado','danger');
    runState.trackingChoices=[];
    Sound.warning();
    startRunBattle(); saveState(); return;
  }
  if(trail.outcome==='treasure'){
    runState.runGold = Math.max(0, finiteNumber(runState.runGold,0)) + trail.gold;
    state.materials.essence=(state.materials.essence||0)+trail.essence;
    addLog(`🐾 Rastreo exitoso: +${trail.gold} oro de expedición · +${trail.essence} esencia.`, 'win');
    showFeedback('🪶 ESCONDITE ENCONTRADO',`+${trail.gold} oro de expedición · +${trail.essence} esencia`,'reward');
  } else {
    const heal=Math.round(runState.maxHp*.24);
    runState.hp=Math.min(runState.maxHp,runState.hp+heal);
    const relic=grantRunRelic();
    addLog(`🐾 Guarida descubierta: +${heal} vida${relic?` · reliquia ${relic.name}`:''}.`, 'win');
    showFeedback('🌿 GUARIDA OCULTA',`+${heal} vida${relic?` · ${relic.name}`:''}`,'reward');
  }
  runState.trackingChoices=[];
  advanceToBounty(); render(); saveState();
}

function makeMerchantOffers(){
  const depth = runState ? runState.depth : 1;
  return [
    { id:'gold', icon:'🪙', label:'Bolsa sellada', costType:'gold', cost:Math.round(70+depth*14), costLabel:`Entregar ${Math.round(70+depth*14)} oro`, reward:pick(['relic','essence']) },
    { id:'blood', icon:'🩸', label:'Pacto carmesí', costType:'hp', cost:.18, costLabel:'Entregar 18% de vida', reward:pick(['essence','relic']) },
    { id:'essence', icon:'◇', label:'Cofre de ceniza', costType:'essence', cost:Math.max(7,6+Math.floor(depth*.8)), costLabel:`Entregar ${Math.max(7,6+Math.floor(depth*.8))} esencia`, reward:pick(['gold','relic','essence']) }
  ];
}
function merchantCanAfford(offer){
  if(offer.costType==='gold') return state.gold>=offer.cost;
  if(offer.costType==='essence') return (state.materials.essence||0)>=offer.cost;
  return runState.hp>Math.max(1,Math.round(runState.maxHp*offer.cost));
}
function chooseMerchantOffer(id){
  if(!runState || runState.phase!=='merchant') return;
  const offer=(runState.merchantOffers||[]).find(entry=>entry.id===id);
  if(!offer || !merchantCanAfford(offer)) return;
  if(offer.costType==='gold') state.gold-=offer.cost;
  if(offer.costType==='essence') state.materials.essence-=offer.cost;
  if(offer.costType==='hp') runState.hp=Math.max(1,runState.hp-Math.round(runState.maxHp*offer.cost));
  let rewardText='';
  if(offer.reward==='relic'){
    const relic=grantRunRelic();
    rewardText=relic ? `${relic.icon} ${relic.name}` : 'una bendición rúnica';
  } else if(offer.reward==='essence'){
    const essence=2+Math.floor(runState.depth/12);
    state.materials.essence=(state.materials.essence||0)+essence;
    rewardText=`◇ +${essence} esencia`;
  } else {
    const gold=Math.max(8,Math.round((15+runState.depth*3)*(1+perceptionLootBonus()*.15)));
    runState.runGold=Math.max(0,finiteNumber(runState.runGold,0))+gold; rewardText=`◉ +${gold} oro de expedición`;
  }
  Sound.reward();
  addLog(`☾ Mercader misterioso: ${offer.label} revela ${rewardText}.`, 'win');
  showFeedback('☾ TRATO CUMPLIDO',rewardText,'reward');
  runState.merchantOffers=[];
  advanceToBounty(); render(); saveState();
}
function leaveMerchant(){
  if(!runState || runState.phase!=='merchant') return;
  Sound.click();
  addLog('☾ Ignoraste la oferta del Mercader Misterioso.', 'combat');
  runState.merchantOffers=[];
  advanceToBounty(); render(); saveState();
}

function chooseScenarioEvent(choiceId){
  if(!runState || runState.phase!=='event' || !runState.scenarioEvent) return;
  const event = runState.scenarioEvent;
  const choice = event.choices.find(entry=>entry.id===choiceId);
  if(!choice) return;
  const depthFactor = 1 + runState.depth*.08;
  let result = '';
  if(choice.effect==='heal'){
    const amount = Math.round(runState.maxHp*.28);
    const before = runState.hp;
    runState.hp = Math.min(runState.maxHp,runState.hp+amount);
    result = `+${runState.hp-before} vida`;
  } else if(choice.effect==='mana'){
    const amount = Math.round(runState.maxMana*.45);
    const before = runState.mana;
    runState.mana = Math.min(runState.maxMana,runState.mana+amount);
    result = `+${runState.mana-before} maná`;
  } else if(choice.effect==='gather'){
    const gold = Math.max(5, Math.round((6+runState.depth)*depthFactor));
    runState.runGold = Math.max(0, finiteNumber(runState.runGold,0))+gold; state.materials.essence = (state.materials.essence||0)+1;
    result = `+${gold} oro de expedición · +1 esencia`;
  } else if(choice.effect==='offering'){
    const cost = Math.max(1,Math.round(runState.maxHp*.12));
    const gold = Math.max(7, Math.round((9+runState.depth*1.5)*depthFactor));
    runState.hp = Math.max(1,runState.hp-cost); runState.runGold = Math.max(0, finiteNumber(runState.runGold,0))+gold; state.materials.essence = (state.materials.essence||0)+1;
    result = `-${cost} vida · +${gold} oro de expedición · +1 esencia`;
  } else if(choice.effect==='coffer'){
    const cost = Math.max(1,Math.round(runState.maxHp*.08));
    const gold = Math.max(9, Math.round((11+runState.depth*2)*depthFactor));
    runState.hp = Math.max(1,runState.hp-cost); runState.runGold = Math.max(0, finiteNumber(runState.runGold,0))+gold;
    result = `-${cost} vida · +${gold} oro de expedición`;
  } else if(choice.effect==='clarity'){
    const amount = Math.round(runState.maxMana*.34);
    const before = runState.mana;
    runState.mana = Math.min(runState.maxMana,runState.mana+amount); state.materials.essence = (state.materials.essence||0)+1;
    result = `+${runState.mana-before} maná · +1 esencia`;
  } else if(choice.effect==='jackpot'){
    const gold = Math.max(15, Math.round((17+runState.depth*2.5)*depthFactor));
    runState.runGold = Math.max(0, finiteNumber(runState.runGold,0))+gold; result = `+${gold} oro de expedición`;
  } else if(choice.effect==='relic'){
    const pool = relicsForCurrentClass().filter(relic=>!(runState.relics||[]).some(owned=>owned.id===relic.id));
    const relic = pick(pool);
    if(relic){ addRunRelic(relic); result = `${relic.icon} ${relic.name}`; }
    else result = 'la reliquia se disuelve: ya alcanzaste el límite de la run';
  }
  Sound.reward();
  flashArena('reward');
  burstSparks(choice.effect==='relic' ? 'var(--mana)' : 'var(--gold-bright)', 13);
  addLog(`${event.title}: ${choice.label} — ${result}.`, 'level');
  showFeedback(`${event.icon} ${event.title}`,result,choice.effect==='mana'||choice.effect==='clarity'?'mana':'reward');
  runState.scenarioEvent = null;
  advanceToBounty(); render(); saveState();
}

function chooseBounty(key){
  if(!runState || runState.phase!=='bounty') return;
  Sound.click();
  runState.chosenBounty = key;
  runState.dice = rollFive();
  runState.held = [false,false,false,false,false];
  runState.rollsLeft = 2;
  runState.comboRank = evaluateDiceCombo(runState.dice);
  runState.phase = 'dice';
  render();
}

function rollFive(){ return [1,2,3,4,5].map(()=>1+Math.floor(Math.random()*6)); }

function toggleHold(i){
  if(!runState || runState.phase!=='dice' || runState.rollsLeft<=0) return;
  Sound.click();
  runState.held[i] = !runState.held[i];
  render();
}

function rerollDice(){
  if(!runState || runState.phase!=='dice' || runState.rollsLeft<=0) return;
  Sound.roll();
  runState.dice = runState.dice.map((d,i)=> runState.held[i] ? d : 1+Math.floor(Math.random()*6));
  runState.rollsLeft--;
  runState.comboRank = evaluateDiceCombo(runState.dice);
  render();
  if(runState.rollsLeft<=0){ setTimeout(()=>finalizeDice(), 350); }
}

function finalizeDice(){
  if(!runState || runState.phase!=='dice') return;
  runState.comboRank = evaluateDiceCombo(runState.dice);
  runState.rewardPreview = computeBountyRewards(runState.chosenBounty, runState.comboRank);
  runState.phase = 'reward';
  Sound.victory();
  render();
  saveState();
}

function computeBountyRewards(tierKey, comboRank){
  const t = BOUNTY_TIERS[tierKey];
  const m = t.mult[comboRank];
  const lvl = state.level;
  const heal = Math.round(maxHP() * Math.min(1, 0.22 * (1+m)));
  const mana = Math.round(maxMana() * Math.min(1, 0.22 * (1+m)));
  const gold = Math.floor((18 + lvl*1.5) * (1+m));
  const statPoints = Math.max(1, Math.round(1 + m*2.5));
  return { heal, mana, gold, statPoints };
}

function claimReward(type){
  if(!runState || runState.phase!=='reward' || !runState.rewardPreview) return;
  Sound.reward();
  flashArena('reward');
  burstSparks(type==='heal' ? 'var(--green)' : type==='mana' ? 'var(--mana)' : 'var(--gold-bright)', 12);
  const r = runState.rewardPreview;
  const combo = DICE_COMBOS[runState.comboRank];
  const tierLabel = BOUNTY_TIERS[runState.chosenBounty].label;
  // La estadística se sorte a una sola vez, para poder mostrar exactamente qué recibió el jugador.
  const statKey = type==='stat' ? pick(STAT_KEYS) : null;
  const labels = { heal:'RECUPERACIÓN', mana:'MANÁ RESTAURADO', gold:'ORO EN RIESGO', stat:'MEJORA DE EXPEDICIÓN' };
  const values = { heal:`+${r.heal} vida`, mana:`+${r.mana} maná`, gold:`+${r.gold} oro de expedición`, stat:`+${r.statPoints} ${STAT_LABELS[statKey]}` };
  showFeedback(`✦ ${labels[type]}`, values[type], type==='mana' ? 'mana' : '');
  if(type==='heal'){
    const before = runState.hp;
    runState.hp = Math.min(runState.maxHp, runState.hp + r.heal);
    const healed = runState.hp - before;
    addLog(`💚 Contrato ${tierLabel} (${combo.label}) — te curás ${healed} de vida.`, 'win');
  } else if(type==='mana'){
    const before = runState.mana;
    runState.mana = Math.min(runState.maxMana, runState.mana + r.mana);
    const restored = runState.mana - before;
    addLog(`💧 Contrato ${tierLabel} (${combo.label}) — recuperás ${restored} de maná.`, 'win');
  } else if(type==='gold'){
    runState.runGold = Math.max(0, finiteNumber(runState.runGold,0)) + r.gold;
    addLog(`💰 Contrato ${tierLabel} (${combo.label}) — +${r.gold} oro de expedición. Se cobra al salir y se pierde si caés.`, 'win');
  } else if(type==='stat'){
    const key = statKey;
    runState.tempStats = runState.tempStats || {};
    runState.tempStats[key] = (runState.tempStats[key]||0) + r.statPoints;
    syncRunResources();
    addLog(`✨ Contrato ${tierLabel} (${combo.label}) — +${r.statPoints} a ${STAT_LABELS[key]} (temporal hasta terminar la run).`, 'win');
  }
  runState.phase = 'idle';
  runState.chosenBounty = null;
  runState.rewardPreview = null;
  render();
  saveState();
  setTimeout(()=>{ if(runState && runState.phase==='idle') advanceToMap(); }, 550);
}

function retreatRun(){
  if(!runState || ['fight','ended'].includes(runState.phase)) return;
  Sound.victory();
  addLog(`🏳 Te retiraste de la cacería en la profundidad ${runState.depth-1} con tu botín intacto.`, 'win');
  finishRun(true);
  saveState();
}

function finishRun(retreated, completed=false){
  if(battle){ battle.ended = true; battle = null; }
  const lostCompanion = state.companion;
  const pendingRunGold = Math.max(0, finiteNumber(runState && runState.runGold,0));
  const cashOutRunGold = (retreated || completed) && pendingRunGold>0 && !runState.runGoldClaimed;
  if(cashOutRunGold){
    gainGold(pendingRunGold);
    runState.runGoldClaimed = true;
    addLog(`💰 Cobraste ${pendingRunGold} oro de expedición al salir con vida.`, 'win');
    showFeedback('ORO ASEGURADO', `+${pendingRunGold} oro de expedición`, 'reward');
  } else if(!retreated && !completed && pendingRunGold>0){
    addLog(`☠ Perdiste ${pendingRunGold} oro de expedición al caer.`, 'lose');
    showFeedback('ORO PERDIDO', `${pendingRunGold} oro de expedición se perdió con la run.`, 'danger');
  }
  if(completed){
    state.campaignWins=(state.campaignWins||0)+1;
    addLog('♛ Cacería completada: desbloqueaste el Abismo Infinito.', 'level');
  }
  const summary = makeFinalRunSummary(retreated, completed);
  runState.finalSummary = summary;
  state.lastRunSummary = summary;
  const previousBest = state.bestRunSummary;
  if(!previousBest || summary.maxDepth > finiteNumber(previousBest.maxDepth,0) || (summary.maxDepth===finiteNumber(previousBest.maxDepth,0) && summary.enemies>finiteNumber(previousBest.enemies,0))){
    state.bestRunSummary = summary;
  }
  runState.phase = 'ended';
  runState.retreated = !!retreated;
  runState.completed = !!completed;
  state.companion = null;
  if(lostCompanion) showFeedback(retreated ? 'VÍNCULO FINALIZADO' : 'COMPAÑERO PERDIDO', retreated ? `${lostCompanion.name} vuelve a su hábitat` : `${lostCompanion.name} escapó al caer la expedición`, retreated ? 'mana' : 'danger');
  render();
  saveState();
}

/* ---- Renderizado del modo roguelike ---- */
function updateHuntOverview(){
  const overview=document.getElementById('huntOverview');
  if(!overview) return;
  const active=!!runState;
  const depth=active ? Math.max(1,finiteNumber(runState.depth,1)) : 0;
  const biome=biomeForDepth(active ? depth : 1);
  const phase=active ? (runState.phase||'idle') : 'idle';
  const phaseLabels={idle:'Listo para descender',map:'Elegí el próximo camino',fight:'Combate en curso',bounty:'Contrato de cacería',dice:'Resolviendo contrato',reward:'Recompensa disponible',event:'Evento de escenario',ended:'Expedición finalizada'};
  const set=(id,value)=>{const element=document.getElementById(id);if(element) element.textContent=value;};
  overview.dataset.phase=phase;
  set('huntOverviewState',phaseLabels[phase]||'Expedición activa');
  set('huntOverviewBiome',active ? `${biome.icon} ${biome.label}` : 'La senda aguarda');
  set('huntOverviewDepth',depth);
  set('huntOverviewBest',`Récord ${Math.max(0,finiteNumber(state?.maxHuntDepth,0))}`);
  set('huntOverviewKills',active ? Math.max(0,finiteNumber(runState.monstersDefeated,0)) : 0);
  set('huntOverviewStreak',`Racha ${Math.max(0,finiteNumber(winStreak,0))}`);
  set('huntOverviewRelics',`${active && Array.isArray(runState.relics) ? runState.relics.length : 0} reliquias`);
  set('huntOverviewEssence',`${Math.max(0,finiteNumber(state?.materials?.essence,0))} esencia`);
}
function renderRunStatusBar(){
  const bar = document.getElementById('runStatusBar');
  if(!bar) return;
  updateHuntOverview();
  if(huntMode!=='run' || !runState){ bar.style.display='none'; return; }
  bar.style.display='flex';
  const hpPct = Math.max(0,(runState.hp/runState.maxHp)*100);
  const mpPct = Math.max(0,(runState.mana/runState.maxMana)*100);
  const biome = biomeForDepth(runState.depth);
  const nodeInfo = MAP_NODE_TYPES[(runState.currentNode && runState.currentNode.type) || 'fight'] || MAP_NODE_TYPES.fight;
  const untilBoss = 5 - ((runState.depth - 1) % 5);
  const estimatedExp = Math.max(5, Math.round((7 + state.level * 2) * (1 + runState.depth * .11)));
  const estimatedGold = Math.max(1, Math.round((11 + state.level * 3) * (1 + runState.depth * .13) * RUN_ECONOMY.victoryGold));
  const dangerLabel = nodeInfo.label || 'Combate';
  const weekly = activeWeeklyTrial();
  const bossLabel = untilBoss === 1 ? 'GUARDIÁN AHORA' : `JEFE EN ${untilBoss}`;
  const bossUrgency = untilBoss === 1 ? 'urgent' : untilBoss <= 2 ? 'warn' : '';
  const ascension = ascensionLabel(runState.depth, !!runState.abyss);
  const relicsCount = runState.relics ? runState.relics.length : 0;
  const essenceCount = state.materials ? state.materials.essence : 0;
  const hpLow = hpPct <= 30;
  const relicPips = Array.from({length:MAX_RUN_RELICS}).map((_,i)=>`<span class="hud-pip ${i<relicsCount?'filled':''}"></span>`).join('');
  const relicNames = (runState.relics || []).map(r=>escapeHtml(r.name || r.label || r.id || 'Reliquia desconocida'));
  bar.className = 'run-status-bar hud';
  bar.innerHTML = `
    <div class="hud-top">
      <div class="hud-biome">
        <span class="hud-biome-icon">${biome.icon}</span>
        <div class="hud-biome-text">
          <span class="hud-biome-name">${biome.label}</span>
          <span class="hud-depth-line">⛏ Profundidad ${runState.depth}${ascension ? ` · <span class="hud-ascension">♜ ${ascension}</span>` : ''}</span>
        </div>
      </div>
      <div class="hud-boss-pill ${bossUrgency}">${untilBoss === 1 ? '☠' : '♛'} ${bossLabel}</div>
    </div>
    <div class="hud-vitals">
      <div class="hud-vital hp ${hpLow?'low':''}">
        <span class="hud-vital-icon">♥</span>
        <div class="hud-vital-track"><div class="hud-vital-fill" style="width:${hpPct}%"></div></div>
        <span class="hud-vital-val">${runState.hp}/${runState.maxHp}</span>
      </div>
      <div class="hud-vital mp">
        <span class="hud-vital-icon">✦</span>
        <div class="hud-vital-track"><div class="hud-vital-fill" style="width:${mpPct}%"></div></div>
        <span class="hud-vital-val">${runState.mana}/${runState.maxMana}</span>
      </div>
    </div>
    <div class="hud-stats">
      <div class="hud-stat streak"><span class="hud-stat-icon">🔥</span><small>RACHA</small><strong>${winStreak}</strong></div>
      <div class="hud-stat power"><span class="hud-stat-icon">⚡</span><small>PODER</small><strong>${Math.round(power())}</strong></div>
      <div class="hud-stat kills"><span class="hud-stat-icon">☠</span><small>VENCIDOS</small><strong>${runState.monstersDefeated || 0}</strong></div>
      <div class="hud-stat danger" style="--node-color:${nodeInfo.color || 'var(--ember)'}"><span class="hud-stat-icon">${nodeInfo.icon || '⚔'}</span><small>PRÓXIMO PELIGRO</small><strong>${dangerLabel}</strong></div>
      <div class="hud-stat essence"><span class="hud-stat-icon">◇</span><small>ESENCIA</small><strong>${essenceCount}</strong></div>
      <div class="hud-stat relics"><span class="hud-stat-icon">✦</span><small>RELIQUIAS ${relicsCount}/${MAX_RUN_RELICS}</small><div class="hud-pip-row">${relicPips}</div></div>
    </div>
    <div class="hud-footer">
      <span class="hud-weekly"><b>⚑ ${weekly.label}</b> · ${weekly.hint}</span>
      <span class="hud-next-win">Próxima victoria: <b>+${estimatedExp} EXP</b> · <b>+${estimatedGold} oro</b> · <b>💰 ${Math.max(0,finiteNumber(runState.runGold,0))} oro en riesgo</b></span>
    </div>
    ${relicNames.length ? `<div class="hud-relics-line"><b>✦ Reliquias:</b> ${relicNames.join(' · ')}</div>` : ''}
  `;
}

function renderRunMode(){
  const grid = document.getElementById('tierGrid');
  if(grid) grid.style.display = 'none';
  // Limpia reliquias de partidas iniciadas antes de retirar el kit universal antiguo.
  // También corrige antiguas runs con reliquias duplicadas para que no arrastren el desbalance.
  if(purgeRemovedRunRelics()) saveState();
  renderRunStatusBar();

  const arena = document.getElementById('arena');
  const box = document.getElementById('actionBtns');
  const biome = biomeForDepth(runState ? runState.depth : 1);
  BIOMES.forEach(entry=>arena.classList.remove(`biome-${entry.key}`));
  arena.classList.add(`biome-${biome.key}`);
  arena.classList.toggle('route-map-mode', !!(runState && runState.phase==='map'));
  arena.classList.toggle('bounty-selection-mode', !!(runState && runState.phase==='bounty'));
  arena.classList.toggle('reward-selection-mode', !!(runState && (runState.phase==='reward' || runState.phase==='dice' || runState.phase==='idle')));
  arena.classList.toggle('boss-phase-two', !!(battle && battle.monster && battle.monster.phaseTwo));
  arena.classList.toggle('has-companion', !!(battle && state.characterClass==='tamer' && state.companion));

  if(!runState){
    arena.innerHTML = `<div class="arena-idle" id="arenaIdle">Comenzá tu descenso: el primer combate siempre es contra un monstruo común.</div>`;
    box.innerHTML = `<button id="startRunBtn" style="grid-column:1/-1;">Comenzar Cacería Roguelike</button>`;
    document.getElementById('startRunBtn').addEventListener('click', ()=>startRun());
    return;
  }

  if(runState.phase==='fight'){
    if(battle){ renderArena(false); }
    renderActionButtons();
    return;
  }

  if(runState.phase==='map'){
    ensureRoutePlan();
    const act = Math.floor((runState.depth-1)/5)+1;
    arena.innerHTML = `
      <div class="spire-map">
        <div class="spire-map-title"><span>✦ RUTA DE EXPEDICIÓN</span><small>ACTO ${act} · NODO ${runState.routeFloor+1}/${runState.routePlan.length}</small></div>
        <div class="spire-map-legend"><span>⚔ Combate</span><span>✦ Élite</span><span>🐾 Rastreo</span><span>☾ Mercader</span><span>⌘ Tesoro</span><span>☥ Santuario</span><span>? Misterio</span><span>☠ Guardián</span></div>
        <div class="spire-map-prompt"><b>PRÓXIMO DESTINO</b> · Elegí uno de los nodos iluminados</div>
        <div class="spire-rows">${runState.routePlan.map((row,rowIndex)=>{
          const rowState = rowIndex<runState.routeFloor ? 'past' : rowIndex===runState.routeFloor ? 'active' : 'future';
          const chosen = (runState.routeHistory||[])[rowIndex];
          return `<div class="spire-row ${row.length===1?'solo':''} ${rowState}">${row.map((node,index)=>{
            const info = MAP_NODE_TYPES[node.type];
            const stateClass = rowState==='active' ? 'available' : rowState==='future' ? 'locked' : (chosen && chosen.index===index ? 'cleared' : 'skipped');
            const interactive = rowState==='active' ? `data-map-node="${index}"` : 'disabled';
            return `<button class="spire-node ${node.type} ${stateClass}" ${interactive} title="${info.label} — ${info.hint}" style="--node-color:${info.color}"><span class="node-icon">${info.icon}</span><span class="node-name">${info.label}</span></button>`;
          }).join('')}</div>`;
        }).join('')}</div>
        <span class="spire-player">◆ Vos estás aquí · Profundidad ${runState.depth}</span>
      </div>`;
    arena.querySelectorAll('[data-map-node]').forEach(node=>node.addEventListener('click',()=>selectMapNodeWithJuice(node, +node.dataset.mapNode)));
    box.innerHTML = `<div class="retreat-row" style="grid-column:1/-1;"><button class="retreat-btn" id="retreatBtn">Retirarse con el botín obtenido</button></div>`;
    document.getElementById('retreatBtn').addEventListener('click', retreatRun);
    return;
    arena.innerHTML = `
      <div class="bounty-intro" style="width:100%;">Profundidad ${runState.depth} — elegí tu próximo camino</div>
      <div class="route-map">
        ${runState.mapNodes.map((node,index)=>{
          const info = MAP_NODE_TYPES[node.type];
          return `<button class="route-node ${node.type}" data-map-node="${index}" style="--node-color:${info.color}"><span class="map-icon">${info.icon}</span><span class="map-label">${info.label}</span><span class="map-hint">${info.hint}</span></button>`;
        }).join('')}
      </div>`;
    arena.querySelectorAll('[data-map-node]').forEach(node=>node.addEventListener('click',()=>chooseMapNode(+node.dataset.mapNode)));
    box.innerHTML = `<div class="retreat-row" style="grid-column:1/-1;"><button class="retreat-btn" id="retreatBtn">Retirarse con el botín obtenido</button></div>`;
    document.getElementById('retreatBtn').addEventListener('click', retreatRun);
    return;
  }

  if(runState.phase==='relic'){
    arena.innerHTML = `
      <div class="dice-stage"><div class="combo-label" style="color:var(--mana)">✧ Reliquia del camino</div>
      <div class="bounty-intro">El sendero responde a tu voluntad. Elegí un poder solo para esta expedición.</div>
      <div class="event-choice">${(runState.relicChoices||[]).map(relic=>`<button data-run-relic="${relic.id}"><b>${relic.icon} ${relic.name}</b><br><small>${relic.description}</small></button>`).join('')}</div></div>`;
    arena.querySelectorAll('[data-run-relic]').forEach(button=>button.addEventListener('click',()=>chooseRunRelic(button.dataset.runRelic)));
    box.innerHTML = '';
    return;
  }

  if(runState.phase==='shrine'){
    arena.innerHTML = `<div class="dice-stage"><div class="combo-label" style="color:var(--green)">✚ Santuario olvidado</div><div class="bounty-intro">Una luz antigua responde a tu presencia</div><div class="event-choice"><button data-shrine="heal">Recuperar vida<br><small>+45% de vida máxima</small></button><button data-shrine="mana">Recuperar maná<br><small>+55% de maná máximo</small></button></div></div>`;
    arena.querySelectorAll('[data-shrine]').forEach(button=>button.addEventListener('click',()=>chooseShrine(button.dataset.shrine)));
    box.innerHTML = '';
    return;
  }

  if(runState.phase==='tracking'){
    const trails=runState.trackingChoices || (runState.trackingChoices=makeTrackingChoices());
    arena.innerHTML = `<div class="tracking-event"><div class="scenario-emblem">🐾</div><div class="combo-label" style="color:#a6e5ae">Rastreo de Bestias</div><div class="bounty-intro">Tres rastros cruzan el sendero. Elegí cuál seguir: cada uno ofrece una recompensa distinta.</div><div class="tracking-trails">${trails.map(trail=>`<button class="tracking-trail" data-tracking-trail="${trail.id}"><span class="track-icon">${trail.icon}</span><b>${trail.label}</b><small>${trail.detail}</small></button>`).join('')}</div><small class="scenario-note">Las huellas pesadas traen un Élite; las otras rutas son seguras.</small></div>`;
    arena.querySelectorAll('[data-tracking-trail]').forEach(button=>button.addEventListener('click',()=>chooseTrackingTrail(button.dataset.trackingTrail)));
    box.innerHTML = '';
    return;
  }

  if(runState.phase==='merchant'){
    const offers=runState.merchantOffers || (runState.merchantOffers=makeMerchantOffers());
    arena.innerHTML = `<div class="merchant-event"><div class="scenario-emblem">☾</div><div class="combo-label" style="color:#e0b5ff">Mercader Misterioso</div><div class="bounty-intro">“Todo tiene un precio, viajero. La recompensa solo se muestra cuando el trato está hecho.”</div><div class="merchant-offers">${offers.map(offer=>`<button class="merchant-offer" data-merchant-offer="${offer.id}" ${merchantCanAfford(offer)?'':'disabled'}><span class="offer-icon">${offer.icon}</span><b>${offer.label}</b><small>${offer.costLabel}<br>Recompensa desconocida</small></button>`).join('')}</div><button class="merchant-leave" type="button" id="leaveMerchantBtn">Rechazar el trato</button><small class="scenario-note">No perdés nada si te retirás. Las ofertas cambian en cada expedición.</small></div>`;
    arena.querySelectorAll('[data-merchant-offer]').forEach(button=>button.addEventListener('click',()=>chooseMerchantOffer(button.dataset.merchantOffer)));
    arena.querySelector('#leaveMerchantBtn').addEventListener('click',leaveMerchant);
    box.innerHTML = '';
    return;
  }

  if(runState.phase==='event'){
    const event = runState.scenarioEvent || makeScenarioEvent();
    runState.scenarioEvent = event;
    arena.innerHTML = `<div class="scenario-event biome-${event.biome}"><div class="scenario-emblem">${event.icon}</div><div class="combo-label" style="color:var(--mana)">${event.title}</div><div class="bounty-intro">${event.text}</div><div class="event-choice">${event.choices.map(choice=>`<button data-scenario-choice="${choice.id}"><b>${choice.label}</b><br><small>${choice.detail}</small></button>`).join('')}</div><small class="scenario-note">La elección se aplica de inmediato. Las reliquias solo duran esta expedición.</small></div>`;
    arena.querySelectorAll('[data-scenario-choice]').forEach(button=>button.addEventListener('click',()=>chooseScenarioEvent(button.dataset.scenarioChoice)));
    box.innerHTML = '';
    return;
  }

  if(runState.phase==='bounty'){
    arena.innerHTML = `
      <div class="bounty-guide"><b>Contrato de cacería</b><span>Elegí una dificultad · tirá 5 dados · guardá los que te sirvan · cobrá según la combinación.</span></div>
      <div class="bounty-intro" style="width:100%;">Elegí tu riesgo</div>
      <div class="bounty-grid" style="width:100%;">
        ${Object.values(BOUNTY_TIERS).map(t=>`
          <div class="bounty-card ${bountyTierClass(t.key)}" data-bounty="${t.key}">
            <div class="b-icon">${t.icon}</div>
            <div class="b-label">${t.label}</div>
            <div class="b-goal">${t.goal}</div>
            <div class="b-hint">${t.needLabel}</div>
          </div>`).join('')}
      </div>`;
    arena.querySelectorAll('.bounty-card').forEach(card=>{
      card.addEventListener('click', ()=>chooseBounty(card.dataset.bounty));
    });
    box.innerHTML = `<div class="retreat-row" style="grid-column:1/-1;"><button class="retreat-btn" id="retreatBtn">Retirarse con el botín obtenido</button></div>`;
    document.getElementById('retreatBtn').addEventListener('click', retreatRun);
    return;
  }

  if(runState.phase==='dice'){
    const combo = DICE_COMBOS[runState.comboRank];
    const glyphs = ['','⚀','⚁','⚂','⚃','⚄','⚅'];
    const tierInfo = BOUNTY_TIERS[runState.chosenBounty];
    const heldCount = runState.held.filter(Boolean).length;
    const multiplier = tierInfo.mult[runState.comboRank];
    arena.innerHTML = `
      <div class="dice-stage">
        <span class="dice-tier-tag" style="border-color:${tierInfo.key==='facil'?'var(--green)':tierInfo.key==='medio'?'var(--gold)':'var(--blood)'}; color:${tierInfo.key==='facil'?'var(--green)':tierInfo.key==='medio'?'var(--gold-bright)':'#d65a5a'};">${tierInfo.icon} Contrato ${tierInfo.label}</span>
        <div class="dice-help"><div><b>${tierInfo.goal}</b><span>Tu resultado actual es <strong style="color:${combo.color}">${combo.label}</strong>. Tocá un dado para guardarlo; al volver a tirar, los guardados no cambian.</span></div><div class="dice-multiplier">PREMIO x${multiplier.toFixed(2)}</div></div>
        <div class="dice-row">
          ${runState.dice.map((d,i)=>`<div class="die ${runState.held[i]?'held':''}" data-i="${i}">${glyphs[d]}</div>`).join('')}
        </div>
        <div class="dice-hold-note">${heldCount ? `✓ ${heldCount} dado${heldCount===1?'':'s'} guardado${heldCount===1?'':'s'} · los demás volverán a tirarse` : 'Elegí los dados que querés conservar'}</div>
        <div class="combo-label" style="color:${combo.color}">${combo.label}</div>
        <div class="rolls-left">${runState.rollsLeft>0?`Te quedan ${runState.rollsLeft} nueva${runState.rollsLeft===1?'':'s'} tirada${runState.rollsLeft===1?'':'s'}. Podés cobrar ahora o intentar mejorar.`:'Última tirada — cerrando resultado…'}</div>
      </div>`;
    arena.querySelectorAll('.die').forEach(el=>{
      el.addEventListener('click', ()=>toggleHold(parseInt(el.dataset.i,10)));
    });
    if(runState.rollsLeft>0){
      box.innerHTML = `
        <button id="rerollBtn" style="grid-column:1/-1;">↻ Tirar los dados no guardados (${runState.rollsLeft})<small>Intentá mejorar ${combo.label} · los dados dorados se conservan</small></button>
        <button id="stayBtn" style="grid-column:1/-1;">✓ Cobrar recompensa con ${combo.label}<small>Premio actual: x${multiplier.toFixed(2)} · pasás a elegir tu recompensa</small></button>`;
      document.getElementById('rerollBtn').addEventListener('click', rerollDice);
      document.getElementById('stayBtn').addEventListener('click', finalizeDice);
    } else {
      box.innerHTML = '';
    }
    return;
  }

  if(runState.phase==='reward'){
    const combo = DICE_COMBOS[runState.comboRank];
    const r = runState.rewardPreview;
    arena.innerHTML = `
      <div class="dice-stage">
        <div class="combo-label" style="color:${combo.color}">Resultado: ${combo.label}</div>
        <div class="bounty-intro" style="margin:0;">Elegí tu recompensa</div>
        <div class="reward-grid" style="width:100%;">
          <div class="reward-card" data-reward="heal"><span class="r-icon">💚</span><div class="r-label">Curarse</div><div class="r-val">+${r.heal} vida</div></div>
          <div class="reward-card" data-reward="stat"><span class="r-icon">✨</span><div class="r-label">Mejora de expedición</div><div class="r-val">+${r.statPoints} pts · temporal</div></div>
          <div class="reward-card" data-reward="gold"><span class="r-icon">💰</span><div class="r-label">Oro</div><div class="r-val">+${r.gold}</div></div>
          <div class="reward-card" data-reward="mana"><span class="r-icon">💧</span><div class="r-label">Recuperar maná</div><div class="r-val">+${r.mana} maná</div></div>
        </div>
      </div>`;
    arena.querySelectorAll('.reward-card').forEach(card=>{
      card.addEventListener('click', ()=>claimReward(card.dataset.reward));
    });
    box.innerHTML = '';
    return;
  }

  if(runState.phase==='ended'){
    const summary = runState.finalSummary || state.lastRunSummary || makeFinalRunSummary(runState.retreated,runState.completed);
    const bestLoot = summary.bestLoot ? `${summary.bestLoot.icon || '✦'} ${escapeHtml(summary.bestLoot.name)}<small>${escapeHtml(summary.bestLoot.rarity || 'Hallazgo')}</small>` : `—<small>Sin pieza encontrada</small>`;
    const keyRelic = summary.keyRelic ? `${summary.keyRelic.icon || '✦'} ${escapeHtml(summary.keyRelic.name)}<small>${escapeHtml(summary.keyRelic.description || 'Reliquia de expedición')}</small>` : `—<small>Sin reliquia clave</small>`;
    const route = (summary.routeTaken||[]).length ? summary.routeTaken.map(entry=>`<span class="run-route-chip ${escapeHtml(entry.type || 'fight')}">${entry.icon || '✦'} ${escapeHtml(entry.label || 'Paso')}</span>`).join('') : '<span class="run-route-chip">✦ Descenso inicial</span>';
    const mastery = summary.mastery || {};
    arena.innerHTML = `
      <div class="run-end-panel">
        <div class="re-kicker">✦ RESUMEN DE EXPEDICIÓN</div>
        <div class="re-title">${runState.completed?'♛ Cacería conquistada':runState.retreated?'🏳 Cacería retirada':'☠ Cacería terminada'}</div>
        <div class="run-summary-grid">
          <div class="run-summary-card"><small>GOLPE MÁXIMO</small><b>⚔ ${Math.max(0,Math.round(summary.maxDamage||0))}</b></div>
          <div class="run-summary-card"><small>ENEMIGOS VENCIDOS</small><b>☠ ${Math.max(0,Math.round(summary.enemies||0))}</b></div>
          <div class="run-summary-card"><small>MEJOR BOTÍN</small><b>${bestLoot}</b></div>
          <div class="run-summary-card relic"><small>RELIQUIA CLAVE</small><b>${keyRelic}</b></div>
          <div class="run-summary-card"><small>ORO DE EXPEDICIÓN</small><b>💰 ${Math.max(0,Math.round(summary.runGold||0))}${summary.runGoldClaimed?' asegurado':' perdido'}</b></div>
        </div>
        <div class="run-mastery-row">
          <span>✦ Rupturas ${Math.max(0,Math.round(mastery.guardBreaks||0))}</span>
          <span>↝ Esquivas fuertes ${Math.max(0,Math.round(mastery.strongDodges||0))}</span>
          <span>♥ Victorias íntegras ${Math.max(0,Math.round(mastery.noHealWins||0))}</span>
          <span>◇ Bonos +${Math.max(0,Math.round(mastery.bonusGold||0))} oro · +${Math.max(0,Math.round(mastery.bonusEssence||0))} esencia</span>
        </div>
        <div class="run-route-summary"><small>RUTA TOMADA · PROFUNDIDAD ${Math.max(0,Math.round(summary.maxDepth||0))} · RÉCORD ${state.maxHuntDepth||0}</small><div>${route}</div></div>
      </div>`;
    box.innerHTML = `<button id="newRunBtn" style="grid-column:1/-1;">Comenzar nueva Cacería</button>${runState.completed?`<button id="abyssRunBtn" class="ability-btn ready" style="grid-column:1/-1;">♾ ENTRAR AL ABISMO INFINITO <small>Empieza en profundidad 41 · sin final</small></button>`:''}`;
    document.getElementById('newRunBtn').addEventListener('click', ()=>{ runState=null; startRun(); });
    document.getElementById('abyssRunBtn')?.addEventListener('click', ()=>{ runState=null; startRun(FINAL_RUN_DEPTH+1,true); });
    return;
  }
}

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
