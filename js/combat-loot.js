/* ================= COMBAT-LOOT.JS =================
   Reliquias de expedicion (RUN_RELICS), telemetria de la run y otorgado de
   botin/reliquias. Primera parte de lo que antes era combat.js.
   Depende de: classes.js. Debe cargarse ANTES de combat-battle-monsters.js.
   ================================================================= */

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

/* Reglas compartidas por la Cacería de cartas. La campaña termina en el
   acto 9; desde el acto 10 cada región pasa a ser una Ascensión infinita. */
const CARD_HUNT_CAMPAIGN_ACTS = 9;
const CARD_HUNT_FLOORS_PER_ACT = 5;
function cardHuntEndlessAscension(act=1){
  return Math.max(0, Math.floor(finiteNumber(act,1))-CARD_HUNT_CAMPAIGN_ACTS);
}
function cardHuntEndlessDifficulty(act=1, enemyType='fight'){
  const ascension=cardHuntEndlessAscension(act);
  if(!ascension) return {ascension:0,hp:1,damage:1,reward:1,chargeBonus:0};
  const tierHp=enemyType==='boss'?1.04:enemyType==='elite'?1.02:1;
  const tierDamage=enemyType==='boss'?1.025:enemyType==='elite'?1.01:1;
  return {
    ascension,
    hp:Math.pow(1.12,ascension)*tierHp,
    damage:Math.pow(1.085,ascension)*tierDamage,
    reward:1+Math.min(2.5,ascension*.12),
    chargeBonus:Math.min(.42,.08+ascension*.025)
  };
}
/* ================= TELEMETRÍA Y RESUMEN DE RUN ================= */
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
    break:  { field:'guardBreaks', label:'RUPTURA PRECISA', detail:'Rompiste la guardia del enemigo', gold:8+depth*2, essence:1 },
    dodge:  { field:'strongDodges', label:'ESQUIVA PERFECTA', detail:'Evitaste un golpe fuerte', gold:11+depth*2, essence:1 },
    noHeal: { field:'noHealWins', label:'VICTORIA IMPECABLE', detail:'Ganaste el combate sin curarte', gold:10+depth*2, essence:1 }
  }[kind];
  if(!data) return false;
  gainGold(data.gold);
  state.materials.essence = (state.materials.essence||0)+data.essence;
  telemetry.mastery[data.field]++;
  telemetry.mastery.bonusGold += data.gold;
  telemetry.mastery.bonusEssence += data.essence;
  addLog(`✦ ${data.label}: ${data.detail} — +${data.gold} oro · +${data.essence} esencia.`, 'level');
  showFeedback(`✦ ${data.label}`, `+${data.gold} oro · +${data.essence} esencia`, 'reward');
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
/* ================= DESAFÍO SEMANAL ================= */
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
/* ================= RELIQUIAS ================= */
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
/**
 * Calcula y otorga el botín de un monstruo vencido DENTRO de una run
 * (oro, esencia, materiales, ítem de equipo con probabilidad por rareza).
 * Solo aplica si `battle.isRun` — hoy `battle` siempre tiene `isRun:true`
 * (la cacería clásica que usaba la rama simple se eliminó; `endBattle` en
 * combat-battle-core.js todavía tiene esa rama `!isRun` por las dudas, pero
 * es inalcanzable). Llamada desde `endBattle` cuando `result==='win'`.
 */
function awardRunLoot(monster){
  if(!battle || !battle.isRun || !runState) return null;
  const isBoss = monster.isBoss;
  const isElite = runState.currentNode && runState.currentNode.type==='elite';
  const isCommonFight = !isBoss && !isElite;
  const weekly=activeWeeklyTrial();
  // Antes solo Élites y Jefes daban esencia; ahora todo combate aporta algo, aunque poco.
  let essence = isBoss ? 12 + runState.depth*2 : isElite ? 4 + runState.depth : 1 + Math.floor(runState.depth/3);
  if(weekly.key==='fury') essence=Math.round(essence*1.20);
  state.materials.essence = (state.materials.essence||0) + essence;
  let trophy = null;
  if(isBoss){
    state.materials.bossCore = (state.materials.bossCore||0) + 1;
    trophy = bossTrophyFor(monster);
    const trophies = state.materials.bossTrophies || (state.materials.bossTrophies={});
    trophies[trophy.name] = (trophies[trophy.name]||0) + 1;
    recordRunLoot({ ...trophy, rarity:'Trofeo de jefe', rarityKey:'unique', rank:8 });
  }
  // Los Sellos del Gremio no reemplazan al oro: son la moneda de intercambio
  // entre jugadores. Los jefes son la fuente segura y los élites aportan una pequeña chance.
  const guildMarks = isBoss ? 6 + Math.floor(runState.depth/2) : (isElite && Math.random()<.32 ? 1 : 0);
  if(guildMarks && typeof marketMarks==='function') marketMarks(guildMarks);

  const rarityRank = { common:0, uncommon:1, rare:2, epic:3, legendary:4, mythic:5, unique:6 };
  // Los combates comunes ahora pueden dejar objetos comunes/poco comunes; Élites y Jefes siguen
  // reservados para lo raro en adelante.
  const minRank = isBoss ? 3 : isElite ? 2 : 0;
  // La probabilidad final no puede superar 100%, pero Percepción no tiene límite de bonificación.
  const gearChance = isCommonFight
    ? Math.min(.55, .12 + perceptionLootBonus())
    : Math.min(1, (isBoss ? .72 : .34) + perceptionLootBonus() + (weekly.key==='hunter' && isBoss ? .15 : 0));
  let item = null;
  if(Math.random()<gearChance){
    const activeSetId = state.subclass ? `subclass-${state.characterClass}-${state.subclass}` : `class-${state.characterClass}`;
    const specialist = SHOP_EQUIPMENT_ITEMS.filter(entry=>entry.setId===activeSetId && rarityRank[entry.rarityKey]>=minRank);
    const traveler = UNIVERSAL_EQUIPMENT_ITEMS.filter(entry=>rarityRank[entry.rarityKey]>=minRank);
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
  const relic = (isBoss || (isElite && Math.random()<.22)) ? grantRunRelic() : null;
  const parts = [`+${essence} esencia`];
  if(isBoss) parts.push('+1 nucleo de jefe');
  if(trophy) parts.push(`${trophy.icon} ${trophy.name}`);
  if(guildMarks) parts.push(`✦ +${guildMarks} sellos`);
  if(item) parts.push(item.name);
  if(relic) parts.push(`${relic.icon} ${relic.name}`);
  return { summary:parts.join(' · '), item, relic, trophy };
}

/* ================= LOG, NIVEL Y RECOMPENSAS ================= */
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

/**
 * Experiencia permanente de la Cacería de cartas. Se calcula como una
 * fracción de lo necesario para el siguiente nivel, por lo que sigue siendo
 * relevante durante toda la progresión sin dispararse en niveles altos.
 */
function cardHuntExperienceReward(enemyType='fight', act=1, finalBoss=false){
  if(!state || state.level>=LEVEL_CAP) return 0;
  // Una expedición completa contiene muchos encuentros: estos porcentajes
  // exigen varias victorias por nivel y evitan que una sola run salte gran
  // parte de la progresión permanente.
  const ratio={fight:.04,elite:.10,boss:.20}[enemyType] || .04;
  const actMultiplier=1+Math.min(.24,Math.max(0,Math.floor(finiteNumber(act,1))-1)*.03);
  const finalMultiplier=finalBoss ? 1.5 : 1;
  const barracksBonus=typeof settlementBarracksBonus==='function'
    ? Math.max(0,finiteNumber(settlementBarracksBonus(),0))
    : 0;
  return Math.max(1,Math.floor(expToNext(state.level)*ratio*actMultiplier*finalMultiplier*(1+barracksBonus)));
}
function gainGold(amount){
  state.gold += amount;
  state.missions.day.goldEarned += amount;
  state.missions.month.goldEarned += amount;
  state.totalGoldEarnedLifetime = (state.totalGoldEarnedLifetime||0) + amount;
}
