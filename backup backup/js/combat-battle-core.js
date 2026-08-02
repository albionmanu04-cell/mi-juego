/* ================= COMBAT-BATTLE-CORE.JS =================
   Ciclo de vida de la batalla 1v1: inicio (clásica y de run), preparación
   del monstruo, ruptura de armadura (break), fases de jefe y cierre de la
   pelea (endBattle: victoria/derrota/retirada, botín, racha, avance de run).
   Segunda parte de lo que antes era combat-battle.js. Depende de:
   classes.js, combat-loot.js, combat-battle-monsters.js.
   ================================================================= */

/* ================= INICIO Y CIERRE DE BATALLA ================= */
// Nota: acá vivía startBattle(), el inicio de pelea 1v1 del viejo modo
// "cacería clásica" (huntMode==='free', con selección manual de tier vía
// #tierGrid). Se eliminó porque el botón que lo activaba (#huntModeToggle)
// ya no existe en el HTML — era código muerto e inalcanzable. El modo
// vigente es el roguelike de abajo (startRunBattle).

/**
 * Inicia la pelea contra el monstruo de un nodo de combate dentro de una
 * expedición roguelike (runState). A diferencia de startBattle(), el HP/maná
 * viene de runState (persiste entre peleas de la misma run) y `battle.isRun`
 * queda en true, lo que activa lógica extra (reliquias, telemetría, checkpoint).
 */
function startRunBattle(){
  if(battle || !runState || runState.phase==='ended') return;
  Sound.click();
  const monster = prepareMonster(makeRunMonster(runState.depth, runState.currentNode ? runState.currentNode.type : 'fight'));
  syncRunResources();
  const maxHp = runState.maxHp, maxMp = runState.maxMana;
  battle = {
    id:++battleSequence,
    monster, playerHp: runState.hp, playerMaxHp: maxHp, playerMana: runState.mana, playerMaxMana: maxMp,
    tier: depthTierKey(runState.depth), busy:false, isRun:true, playerStatus:newPlayerStatus(), healingUsed:false, masteryClaims:{},
    deckMode:true, turn:1, energy:3, maxEnergy:3, hand:[], drawPile:[], discardPile:[], playedCards:[]
  };
  initializeDeckCombat(battle);
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

/**
 * Suma daño a la barra de "ruptura" del monstruo (`breakMeter`); al llenarla
 * lo aturde 1 turno, lo vuelve vulnerable, sube `breakMax` para la próxima
 * ruptura (más difícil romperlo de nuevo) y, si es un élite "Blindado", le
 * quita permanentemente su reducción de daño (`affinityBroken`). Devuelve
 * `true` solo el turno en que la barra se llena.
 */
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

/* ================= FASES DE JEFE ================= */
function bossPhaseDetails(monster){
  const phase = {
    slime:    { label:'MAREA VIOLETA', hint:'El Slime se divide en golpes corrosivos', hits:2, mult:.76, poison:true },
    wolf:     { label:'CACERÍA CARMESÍ', hint:'El Lobo Negro ataca dos veces con ojos rojos', hits:2, mult:.82 },
    minotaur: { label:'EMBATE CARMESÍ', hint:'El Minotauro Rojo carga una embestida brutal', hits:1, mult:1.9 },
    dragon:   { label:'ALIENTO CELESTE', hint:'El Dragón Blanco quema tu maná con hielo azul', hits:1, mult:1.35, manaBurn:.26 }
  };
  return phase[monster.visualType] || phase.slime;
}
/**
 * Se llama después de cada golpe del jugador (ver `runPlayerHits`) para
 * chequear si un jefe cruzó el umbral del 50% de vida. Si aplica, sube su
 * daño 18%, marca `phaseTwo` (para no repetirse) y deja a `battle.busy=true`
 * durante la animación — por eso quien la llama debe frenar el flujo normal
 * (turno del monstruo, etc.) cuando devuelve `true`.
 */
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
    resolvePlayerActionEnd(phaseBattle);
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

/**
 * Cierra la pelea actual (`battle`), sea por victoria, derrota o retirada.
 * `result` es 'win' | 'lose' | otro string usado como motivo de retirada.
 * Maneja tanto el combate clásico como el de una run (bifurca internamente
 * según `battle.isRun`): otorga botín/exp/oro, actualiza racha de victorias,
 * y en el caso de una run avanza runState (siguiente nodo o fin de expedición).
 */
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
    if(isRun) gold = Math.floor(gold * (1+runRelicValue('gold')));
    // El Cuartel de El Asentamiento da un bonus permanente y chico a las recompensas
    // de Cacería, independiente de las reliquias de la run (que se pierden al terminarla).
    let finalExp = exp;
    if(isRun){
      const barracksBonus = settlementBarracksBonus();
      gold = Math.floor(gold * (1+barracksBonus));
      finalExp = Math.floor(exp * (1+barracksBonus));
    }
    state.missions.day.hunts++;
    state.missions.week.wins++;
    gainExp(finalExp);
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
    showFeedback(isBoss ? '☠ JEFE DERROTADO' : '✦ VICTORIA', `+${finalExp} exp · +${gold} oro${runLoot ? ` · ${runLoot.summary}` : ''}`);
    addLog(`${isBoss?'☠ ¡Jefe derrotado! ':'Venciste a '}${battle.monster.name} (${tier.label}) — +${finalExp} exp, +${gold} oro`, 'win');
    if([5,10,20,35,50].includes(winStreak)){
      const bonus = winStreak*20;
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
  clearCombatVisuals();
  rollMissionReset();
  if(isRun){
    if(victory){
      // La profundidad 40 es el cierre de una expedición completa.
      if(isBoss && runState.depth===FINAL_RUN_DEPTH && !runState.abyss){
        runState.abyss = true;
        runState.infiniteUnlocked = true;
        state.campaignWins = (state.campaignWins||0) + 1;
        state.materials = state.materials || {};
        state.materials.essence = (state.materials.essence||0) + 50;
        addLog('♛ HITO SUPERADO: venciste al Señor del Abismo. Se abre el Descenso Infinito · +50 esencia.', 'level');
        showFeedback('♾ DESCENSO INFINITO', 'Cada 10 profundidades aumenta la Ascensión enemiga', 'danger');
      }
      advanceToBounty();
    } else finishRun(false);
  }
  render();
  saveState();
}
