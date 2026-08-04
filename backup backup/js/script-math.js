/* ================= SCRIPT-MATH.JS =================
   EQUIP BONUSES y GAME MATH: todos los stats derivados del heroe (HP, mana,
   ataque, defensa, critico, esquiva). Segunda parte de lo que antes era
   script.js. Depende de: script-state.js.
   ================================================================= */

/* ================= EQUIP BONUSES ================= */
function equippedSetSummary(){
  const grouped = {};
  Object.values(state?.equipment || {}).filter(Boolean).forEach(item=>{
    const setId = item.setId || (item.classOnly ? `class-${item.classOnly}` : 'traveler');
    (grouped[setId] ||= []).push(item);
  });
  const sets = Object.entries(grouped).map(([id,items])=>{
    const definition = EQUIPMENT_SET_DEFS[id] || { label:items[0]?.setLabel || 'Set desconocido', affinity:'', bonuses:[] };
    const active = (definition.bonuses || []).filter(tier=>items.length>=tier.pieces);
    return { id, items, pieces:items.length, definition, active };
  }).sort((a,b)=>b.pieces-a.pieces);
  return { sets, primary:sets[0] || null };
}

function getEquipmentBonuses() {
  let atk = 0, def = 0, crit = 0, critDmg = 0, hp = 0, mana = 0, speed = 0;
  if (state.equipment) {
    Object.values(state.equipment).forEach(item => {
      if (item) {
        const multiplier = 1 + Math.min(ENHANCE_MAX,finiteNumber(item.enhanceLevel))* .08;
        atk += Math.round(finiteNumber(item.bonusAtk)*multiplier);
        def += Math.round(finiteNumber(item.bonusDef)*multiplier);
        crit += Math.round(finiteNumber(item.bonusCrit)*multiplier);
        critDmg += Math.round(finiteNumber(item.bonusCritDmg)*multiplier);
        hp += Math.round(finiteNumber(item.bonusHp)*multiplier);
        mana += Math.round(finiteNumber(item.bonusMana)*multiplier);
        speed += Math.round(finiteNumber(item.bonusSpeed)*multiplier);
      }
    });
    equippedSetSummary().sets.forEach(set=>set.active.forEach(tier=>{
      atk += finiteNumber(tier.bonuses.atk);
      def += finiteNumber(tier.bonuses.def);
      crit += finiteNumber(tier.bonuses.crit);
      critDmg += finiteNumber(tier.bonuses.critDmg);
      hp += finiteNumber(tier.bonuses.hp);
      mana += finiteNumber(tier.bonuses.mana);
      speed += finiteNumber(tier.bonuses.speed);
    }));
  }
  // Bonus permanente de El Asentamiento (Santuario de Reliquias): no depende
  // del equipo, así que se suma siempre, incluso sin nada equipado.
  const relic = settlementRelicBonus();
  atk += relic.atk; def += relic.def; crit += relic.crit; critDmg += relic.critDmg; hp += relic.hp; mana += relic.mana;
  return { atk, def, crit, critDmg, hp, mana, speed };
}

/* ================= GAME MATH ================= */
function finiteNumber(value, fallback=0){
  const number = Number(value);
  if(Number.isFinite(number)) return number;
  // Conserva la parte válida de una guardada antigua, por ejemplo "1064[object PointerEvent]".
  if(typeof value==='string'){
    const recovered = Number.parseFloat(value);
    if(Number.isFinite(recovered)) return recovered;
  }
  return fallback;
}
function safePositiveInt(value, fallback=1){
  return Math.max(1, Math.round(finiteNumber(value, fallback)));
}
function expToNext(level){
  const base = 80 * Math.pow(level, 1.6);
  const resetDiscount = Math.min(0.5, finiteNumber(state.resets) * 0.04);
  return Math.floor(base * (1 - resetDiscount));
}
function currentClass(){ return CLASSES[state.characterClass] || CLASSES.warrior; }
function currentSubclass(){
  const pool = SUBCLASSES[state.characterClass] || {};
  return state.subclass && pool[state.subclass] ? pool[state.subclass] : null;
}
// La subclase no sólo aporta bonos: también pasa a ser la identidad visual activa
// del aventurero en perfil, equipo, combate y herrería.
function activeHeroVisual(){
  const base = battleClassStyle();
  const sub = currentSubclass();
  if(!sub) return { ...base, baseLabel:base.label, isSubclass:false };
  return {
    ...base,
    image: sub.image || base.image,
    icon: sub.icon || base.icon,
    label: sub.label,
    baseLabel: base.label,
    weapon: `${base.weapon} · ${sub.label}`,
    description: sub.description || '',
    isSubclass:true
  };
}

/* ================= APARIENCIA DEL HÉROE =================
   Perfil, Héroe, Herrería y las vistas públicas usan una ilustración fija por
   clase o subclase. El equipo conserva todos sus efectos y sus ranuras, pero
   nunca se superpone sobre el arte del personaje. */
function activeHeroAppearance(){
  const visual = activeHeroVisual();
  const equipped = Object.values(state?.equipment || {}).filter(Boolean);
  const primary = equippedSetSummary().primary;
  const classPieces = equipped.filter(item=>
    item.classOnly===state.characterClass &&
    !item.subclassOnly &&
    item.equipmentTier!=='forge'
  ).length;
  const forgePieces = equipped.filter(item=>item.equipmentTier==='forge').length;
  const travelerPieces = equipped.filter(item=>item.equipmentTier==='base' || item.setId==='traveler').length;
  let appearanceLabel = primary?.definition?.label || (equipped.length ? 'Vestimenta mixta' : 'Ropaje de entrenamiento');
  if(forgePieces>=2) appearanceLabel='Vestidura Ancestral';
  else if(visual.isSubclass) appearanceLabel=primary?.definition?.label || visual.label;
  else if(classPieces>=3) appearanceLabel=`Armadura de ${visual.baseLabel}`;
  else if(travelerPieces) appearanceLabel='Equipo del Viajero';
  return {
    ...visual,
    image:visual.image,
    paperDoll:false,
    appearanceLabel,
    equippedPieces:equipped.length,
    classPieces,
    forgePieces,
    travelerPieces,
    paperDollLayers:[],
    dominantSet:primary?.id || ''
  };
}
function subclassBonus(key){
  const sub = currentSubclass();
  return sub ? finiteNumber(sub.bonuses && sub.bonuses[key], 0) : 0;
}
// Las mejoras obtenidas dentro de Cacería viven sólo en la expedición actual.
function runStatBonus(key){
  if(!runState || runState.phase==='ended') return 0;
  return Math.max(0, Number((runState.tempStats||{})[key]) || 0);
}
// Cada Renacimiento entrega una Marca Eterna lineal. Es una mejora permanente
// valiosa, pero no crece de forma explosiva en el late game.
function resetStatBonus(){ return Math.max(0, Math.floor(finiteNumber(state.resets))); }
function rebirthStartingPoints(){ return Math.max(0, Math.floor(finiteNumber(state.resets))) * 2; }
function baseStat(key){ return finiteNumber(state.stats[key]) + resetStatBonus() + runStatBonus(key); }
// Curva suave de final de juego: el héroe sigue creciendo, pero los puntos
// extremos ya no multiplican el daño de forma descontrolada.
function softCap(value, threshold, overflowScale){
  const safe = Math.max(0, finiteNumber(value, 0));
  return safe <= threshold ? safe : threshold + (safe-threshold) * overflowScale;
}
// Todas las clases parten exactamente de la misma hoja base. Las diferencias de clase
// provienen de sus habilidades; el crecimiento permanente viene de puntos y equipo.
const HERO_BASE_STATS = Object.freeze({ hp:100, mana:100, attack:10, defense:10, evasion:0 });
function heroGrowth(key){ return Math.max(0,baseStat(key)-(key==='ataque'||key==='vida'||key==='mana'?1:0)); }
function maxHP(){ return HERO_BASE_STATS.hp + subclassBonus('hp') + heroGrowth('vida')*10 + getEquipmentBonuses().hp + runRelicValue('hp'); }
function maxMana(){ return HERO_BASE_STATS.mana + subclassBonus('mana') + heroGrowth('mana')*6 + getEquipmentBonuses().mana + runRelicValue('mana'); }
function atkDamage(){ 
  const eq = getEquipmentBonuses();
  const investedAttack = softCap(heroGrowth('ataque'), 35, .55);
  return (HERO_BASE_STATS.attack + subclassBonus('atk') + investedAttack + eq.atk) * (1+runRelicValue('atk')); 
}
function totalDefense(){ return HERO_BASE_STATS.defense + subclassBonus('def') + finiteNumber(state.robustness) + resetStatBonus() + runStatBonus('robustez') + getEquipmentBonuses().def; }
function damageReduction(){
  return Math.min(.70,totalDefense()*.01);
}
function critChance(){ 
  const eq = getEquipmentBonuses();
  return (finiteNumber(state.critRateStat, 0) + eq.crit + currentClass().crit + subclassBonus('crit') + runRelicValue('crit')) / 100; 
}
function critMultiplier() {
  const eq = getEquipmentBonuses();
  return (200 + finiteNumber(state.critDmgStat, 0) + eq.critDmg + subclassBonus('critDmg')) / 100 + runRelicValue('critDmg');
}
function dodgeChance(){ return Math.min(0.55, HERO_BASE_STATS.evasion/100 + subclassBonus('dodge')/100 + baseStat('agilidad')*0.004); }
function extraTurnChance(){ return Math.min(0.5, subclassBonus('speed')/100 + baseStat('rapidez')*0.005 + getEquipmentBonuses().speed/100 + runRelicValue('extraTurn')); }

function heroStatBreakdown(){
  const eq=getEquipmentBonuses();
  return {
    hp:{ base:HERO_BASE_STATS.hp, progress:Math.round(heroGrowth('vida')*10+runRelicValue('hp')), equipment:eq.hp, total:Math.round(maxHP()) },
    mana:{ base:HERO_BASE_STATS.mana, progress:Math.round(heroGrowth('mana')*6+runRelicValue('mana')), equipment:eq.mana, total:Math.round(maxMana()) },
    attack:{ base:HERO_BASE_STATS.attack, progress:Math.round(softCap(heroGrowth('ataque'),35,.55)), equipment:eq.atk, total:Math.round(atkDamage()) },
    defense:{ base:HERO_BASE_STATS.defense, progress:Math.round(finiteNumber(state.robustness)+resetStatBonus()+runStatBonus('robustez')), equipment:eq.def, total:Math.round(totalDefense()) },
    evasion:{ base:HERO_BASE_STATS.evasion, progress:Math.round(baseStat('agilidad')*.4*10)/10, equipment:0, total:Math.round(dodgeChance()*1000)/10 }
  };
}

function power(){ 
  const eq = getEquipmentBonuses();
  const value = atkDamage()*1.4 + maxHP()*0.15 + maxMana()*0.1 + baseStat('agilidad') + baseStat('rapidez') + eq.def*0.8 + eq.crit*1.5 + eq.critDmg*0.25;
  return Math.max(12, finiteNumber(value, 35));
}
// Foto numérica liviana de las stats de combate, pensada para comparar
// "antes" vs "después" de una acción (equipar, asignar puntos) y mostrar
// el indicador de mejora — ver showStatDelta() en combat-battle-vfx.js.
// A diferencia de heroStatBreakdown() (que arma el detalle base/equipo/total
// para el panel de Héroe), esta solo da los números finales que le importan
// al jugador en el momento.
function heroPowerSnapshot(){
  return {
    power: Math.round(power()),
    hp: Math.round(maxHP()),
    mana: Math.round(maxMana()),
    atk: Math.round(atkDamage()),
    def: Math.round(totalDefense()),
    crit: Math.round(critChance()*1000)/10,
    critDmg: Math.round(critMultiplier()*1000)/10,
    dodge: Math.round(dodgeChance()*1000)/10,
    extraTurn: Math.round(extraTurnChance()*1000)/10
  };
}
// El poder mostrado incluye supervivencia; para escalar monstruos usamos una
// amenaza ofensiva separada. Así subir vida o defensa nunca fortalece al rival.
function offensiveThreat(){
  const expectedCrit = 1 + critChance() * Math.max(0, critMultiplier()-1) * 0.7;
  const tempo = 1 + extraTurnChance() * 0.32;
  const classSkill = Math.max(1, finiteNumber(currentClass().skillMult, 1) + subclassBonus('skillMult'));
  return Math.max(18, finiteNumber(atkDamage() * expectedCrit * tempo * classSkill, 35));
}

function rollMissionReset(){
  const m = state.missions;
  if(m.dayKey !== todayKey()){ m.dayKey = todayKey(); m.day = { hunts:0, goldEarned:0, levelsGained:0, fishCaught:0, claimed:[false,false,false,false] }; }
  if(m.weekKeyVal !== weekKey()){ m.weekKeyVal = weekKey(); m.week = { wins:0, resets:0, fishRare:0, claimed:[false,false,false] }; }
  if(m.monthKeyVal !== monthKey()){ m.monthKeyVal = monthKey(); m.month = { resets:0, goldEarned:0, claimed:[false,false] }; }
}
// El análisis tiene un techo natural de 100% (1% por punto de Percepción); el bono de botín sigue creciendo por cada punto, sin límite.
function perceptionChance(){ return Math.min(100, 1 + (state.perception||0) * 1); }
function perceptionLootBonus(){ return (state.perception||0) * .025; }
function earnedStatResets(){ return Math.max(0, state.statResetsEarned||0); }
function availableStatResets(){ return Math.max(0, earnedStatResets() - (state.statResetsUsed||0)); }

/**
 * "Repara" un `state` recién cargado desde guardado (local o nube) para que
 * tenga todos los campos que espera la versión actual del juego, usando
 * defaultState() como plantilla de referencia. Se llama siempre después de
 * cargar un personaje, antes de usarlo en cualquier otra parte del código.
 */
function normalizeState(){
  const fresh = defaultState(state.name || 'Guerrero', state.characterClass || 'warrior');
  state = { ...fresh, ...state };
  if(!CLASSES[state.characterClass]) state.characterClass = 'warrior';
  const rawSyncMeta=state.syncMeta && typeof state.syncMeta==='object' ? state.syncMeta : {};
  state.syncMeta={
    version:Math.max(0,Math.floor(Number(rawSyncMeta.version)||0)),
    mutationId:String(rawSyncMeta.mutationId||'').slice(0,180),
    deviceId:String(rawSyncMeta.deviceId||'').slice(0,120),
    modifiedAt:Math.max(0,Math.floor(Number(rawSyncMeta.modifiedAt)||0))
  };
  state.stats = { ...fresh.stats, ...(state.stats || {}) };
  state.allocatedPoints = { ...fresh.allocatedPoints, ...(state.allocatedPoints || {}) };
  state.pendingPoints = { ...fresh.pendingPoints, ...(state.pendingPoints || {}) };
  Object.keys(fresh.stats).forEach(key=> state.stats[key] = Math.max(0, finiteNumber(state.stats[key], fresh.stats[key])));
  ['level','resets','exp','gold','guildMarks','statPoints','strength','critRateStat','critDmgStat'].forEach(key=>{
    state[key] = Math.max(0, finiteNumber(state[key], fresh[key]));
  });
  state.robustness = Number(state.robustness) || 0;
  state.perception = Number(state.perception) || 0;
  state.statResetsUsed = Math.max(0, Number(state.statResetsUsed) || 0);
  state.statResetsEarned = Math.max(Math.floor((state.level||0)/5), Number(state.statResetsEarned) || 0);
  state.equipment = { ...fresh.equipment, ...(state.equipment || {}) };
  state.ownedEquipment = Array.isArray(state.ownedEquipment) ? state.ownedEquipment : [];
  // Las versiones anteriores entregaban la Espada Oxidada a todas las clases.
  // Sólo se migra esa pieza inicial exacta; el resto del inventario se conserva.
  if(state.characterClass !== 'warrior'){
    state.ownedEquipment = state.ownedEquipment.map(item=>
      item?.id === 'rusty_sword' && !item.classOnly
        ? starterEquipmentForClass(state.characterClass)
        : item
    );
  }
  // Migra piezas forjadas de versiones anteriores al nuevo set Ancestral.
  const migrateForgeSet = item => {
    if(!item) return item;
    // Renueva ilustraciones de guardados anteriores: ahora cada ranura usa su propia pieza.
    if(item.equipmentTier === 'base' || item.setId === 'traveler'){
      item.equipmentTier = 'base';
      item.setId = 'traveler';
      item.image = UNIVERSAL_GEAR_ART[item.type] || item.image;
    }
    if(item.equipmentTier === 'subclass' && item.subclassOnly){
      item.image = subclassPieceArt(item.classOnly, item.subclassOnly, item.type);
    }
    if(item && (item.rarityKey==='ancestral' || item.forgeExclusive || String(item.id||'').endsWith('_forjado')) && item.classOnly){
      item.setId = `ancestral-${item.classOnly}`;
      item.setLabel = `Legado Ancestral de ${(CLASSES[item.classOnly] || {}).label || item.classOnly}`;
      item.image = ANCESTRAL_FORGE_ART[item.classOnly] || item.image;
      item.equipmentTier = 'forge';
      item.forgeExclusive = true;
    }
    return item;
  };
  state.ownedEquipment.forEach(migrateForgeSet);
  Object.values(state.equipment).forEach(migrateForgeSet);
  Object.keys(state.equipment).forEach(slot=>{
    const item = state.equipment[slot];
    if(item && !itemFitsCurrentClass(item)){
      state.ownedEquipment.push(item);
      state.equipment[slot] = null;
    }
  });
  state.ownedItems = state.ownedItems || {};
  state.materials = { ...fresh.materials, ...(state.materials || {}) };
  state.materials.essence = Math.max(0, finiteNumber(state.materials.essence));
  state.materials.bossCore = Math.max(0, finiteNumber(state.materials.bossCore));
  state.materials.bossTrophies = state.materials.bossTrophies || {};
  state.materials.scale = Math.max(0, finiteNumber(state.materials.scale));
  state.fishing = { ...fresh.fishing, ...(state.fishing || {}) };
  state.fishing.totalCaught = Math.max(0, finiteNumber(state.fishing.totalCaught));
  state.fishing.rodLevel = Math.max(1, finiteNumber(state.fishing.rodLevel, 1));
  state.fishing.tameCharm = !!state.fishing.tameCharm;
  state.fishing.dex = { ...fresh.fishing.dex, ...(state.fishing.dex || {}) };
  state.fishing.bestWeight = { ...(state.fishing.bestWeight || {}) };
  Object.keys(state.fishing.bestWeight).forEach(key=>{ state.fishing.bestWeight[key] = Math.max(0, finiteNumber(state.fishing.bestWeight[key])); });
  Object.keys(state.fishing.dex).forEach(key=>{ state.fishing.dex[key] = Math.max(0, finiteNumber(state.fishing.dex[key])); });
  state.fishing.streak = Math.max(0, finiteNumber(state.fishing.streak));
  state.fishing.bestStreak = Math.max(0, finiteNumber(state.fishing.bestStreak));
  state.campaignWins = Math.max(0, Number(state.campaignWins)||0);
  state.weeklyChallenge = { ...fresh.weeklyChallenge, ...(state.weeklyChallenge || {}) };
  state.lastRunSummary = state.lastRunSummary && typeof state.lastRunSummary==='object' ? state.lastRunSummary : null;
  state.bestRunSummary = state.bestRunSummary && typeof state.bestRunSummary==='object' ? state.bestRunSummary : null;
  state.settings = { ...fresh.settings, ...(state.settings || {}) };
  state.settings.musicVolume = Math.max(0, Math.min(100, Number(state.settings.musicVolume)));
  state.settings.sfxVolume = Math.max(0, Math.min(100, Number(state.settings.sfxVolume)));
  state.settings.musicEnabled = !!state.settings.musicEnabled;
  state.settings.sfxEnabled = state.settings.sfxEnabled !== false;
  state.settings.graphics = ['high','medium','low'].includes(state.settings.graphics) ? state.settings.graphics : 'high';
  state.settings.reducedMotion = !!state.settings.reducedMotion;
  state.log = Array.isArray(state.log) ? state.log : [];
  state.achievementsClaimed = state.achievementsClaimed || {};
  state.bestiary = state.bestiary || {};
  state.cardCodex = state.cardCodex && typeof state.cardCodex==='object' ? state.cardCodex : {};
  Object.keys(state.cardCodex).forEach(classId=>{
    const entries=Array.isArray(state.cardCodex[classId]) ? state.cardCodex[classId] : [];
    state.cardCodex[classId]=[...new Set(entries.filter(key=>typeof key==='string' && key.trim()))];
  });
  state.cardHuntSnapshot = state.cardHuntSnapshot && typeof state.cardHuntSnapshot==='object' ? state.cardHuntSnapshot : null;
  state.cardHuntSettlements = state.cardHuntSettlements && typeof state.cardHuntSettlements==='object' && !Array.isArray(state.cardHuntSettlements)
    ? state.cardHuntSettlements
    : {};
  const recentCardHuntSettlements=Object.entries(state.cardHuntSettlements)
    .filter(([runId,record])=>runId && record && typeof record==='object')
    .sort((a,b)=>(Number(b[1].settledAt)||0)-(Number(a[1].settledAt)||0))
    .slice(0,30);
  state.cardHuntSettlements=Object.fromEntries(recentCardHuntSettlements);
  state.legacyHuntMigration=state.legacyHuntMigration && typeof state.legacyHuntMigration==='object'
    ? {
        migrated:state.legacyHuntMigration.migrated===true,
        migratedAt:Math.max(0,Math.floor(Number(state.legacyHuntMigration.migratedAt)||0)),
        sourceSavedAt:Math.max(0,Math.floor(Number(state.legacyHuntMigration.sourceSavedAt)||0)),
        depth:Math.max(0,Math.floor(Number(state.legacyHuntMigration.depth)||0)),
        defeated:Math.max(0,Math.floor(Number(state.legacyHuntMigration.defeated)||0)),
        reward:Math.max(0,Math.floor(Number(state.legacyHuntMigration.reward)||0))
      }
    : null;
  state.tutorialSeen = !!state.tutorialSeen;
  state.companion = state.companion || null;
  state.missions = { ...fresh.missions, ...(state.missions || {}) };
  ['day','week','month'].forEach(period => {
    state.missions[period] = { ...fresh.missions[period], ...(state.missions[period] || {}) };
    state.missions[period].claimed = Array.isArray(state.missions[period].claimed) ? state.missions[period].claimed : [];
  });
  rollMissionReset();
}
