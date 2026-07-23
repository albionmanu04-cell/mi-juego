/* ================= COMBAT-RUN.JS =================
   Modo roguelike: flujo de la run (mapa de nodos, mercader, santuarios,
   eventos, dados de recompensa, retirarse/terminar run). Tercera parte de lo
   que antes era combat.js. Depende de: classes.js, combat-loot.js,
   combat-battle-monsters.js, combat-battle-core.js, combat-battle-vfx.js,
   combat-battle-abilities.js, combat-battle-turns.js.
   ================================================================= */

/* ================= MODO ROGUELIKE: FLUJO DE LA RUN ================= */
function switchHuntMode(mode){
  if(mode===huntMode) return;
  if(battle) return; // no se puede cambiar de modo en pleno combate
  if(mode==='free' && runState && runState.phase!=='ended') return; // no abandonar una run activa
  Sound.click();
  huntMode = mode;
  render();
}

/**
 * Crea una nueva expedición roguelike: inicializa `runState` desde cero en la
 * profundidad `startDepth` (o modo abismo si `abyss` es true) y genera el
 * primer plan de ruta (ensureRoutePlan/makeRoutePlan). Ver sección 3.3 del
 * MAPA-PARA-IA.md para la forma completa de runState.
 */
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

/* ================= TURNO DEL MONSTRUO (dentro de la pelea) ================= */
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

/**
 * Análogo de `runPlayerHits` pero para el turno del monstruo: aplica UN
 * golpe del monstruo al jugador y se reprograma con `setTimeout` hasta
 * agotar `remaining`. `special` lleva flags puntuales del golpe (p. ej. si
 * es el ataque de fase 2 de un jefe). Usa el mismo patrón de `reference`/
 * `isCurrentBattle` que `runPlayerHits` para no afectar una pelea vieja.
 */
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

/**
 * Arranca el turno del monstruo tras el turno del jugador: resuelve efectos
 * pasivos (sangrado, veneno), decide la intención según `getMonsterIntent`
 * (ataque normal, especial de arquetipo/afinidad, fase de jefe) y termina
 * llamando a `resolveMonsterHits` para animar el golpe. Se invoca desde
 * `runPlayerHits` (combat-battle-turns.js) al terminar todos los golpes del
 * jugador de ese turno.
 */
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

/* ================= MAPA DE NODOS ================= */
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
    const gold = Math.floor((35 + state.level*5) * (1 + runState.depth*.08));
    gainGold(gold);
    addLog(`Tesoro encontrado: +${gold} oro.`, 'win');
    showFeedback('⌘ TESORO', `+${gold} oro`);
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

/* ================= EVENTOS DE NODO (santuario, evento, rastreo, mercader) ================= */
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
    const gold = Math.floor(25 + state.level*3);
    gainGold(gold);
    addLog(`El viajero te entrega ${gold} oro.`, 'win');
    showFeedback('? VIAJERO', `+${gold} oro`);
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
  const essence = Math.max(3, 4 + Math.floor(depth*.8));
  const gold = Math.round((45 + depth*9) * (1 + perceptionLootBonus()));
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
    gainGold(trail.gold);
    state.materials.essence=(state.materials.essence||0)+trail.essence;
    addLog(`🐾 Rastreo exitoso: +${trail.gold} oro · +${trail.essence} esencia.`, 'win');
    showFeedback('🪶 ESCONDITE ENCONTRADO',`+${trail.gold} oro · +${trail.essence} esencia`,'reward');
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
    { id:'blood', icon:'🩸', label:'Pacto carmesí', costType:'hp', cost:.18, costLabel:'Entregar 18% de vida', reward:pick(['core','relic']) },
    { id:'essence', icon:'◇', label:'Cofre de ceniza', costType:'essence', cost:Math.max(7,6+Math.floor(depth*.8)), costLabel:`Entregar ${Math.max(7,6+Math.floor(depth*.8))} esencia`, reward:pick(['core','gold','relic']) }
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
  } else if(offer.reward==='core'){
    const cores=1+(Math.random()<.2?1:0);
    state.materials.bossCore=(state.materials.bossCore||0)+cores;
    rewardText=`◈ +${cores} núcleo${cores===1?'':'s'} de jefe`;
  } else if(offer.reward==='essence'){
    const essence=10+Math.floor(runState.depth*1.5);
    state.materials.essence=(state.materials.essence||0)+essence;
    rewardText=`◇ +${essence} esencia`;
  } else {
    const gold=Math.round((125+runState.depth*18)*(1+perceptionLootBonus()));
    gainGold(gold); rewardText=`◉ +${gold} oro`;
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

/**
 * Resuelve la elección que hizo el jugador en un nodo de tipo 'event'
 * (`runState.scenarioEvent`, generado por `makeScenarioEvent` en
 * classes.js). `choiceId` es el id de una de las 2-3 opciones del evento;
 * cada evento define sus propios efectos posibles (oro, materiales, daño,
 * buff temporal). Al terminar vuelve al mapa vía `advanceToMap`.
 */
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
    const gold = Math.round((24+state.level*3)*depthFactor);
    gainGold(gold); state.materials.essence = (state.materials.essence||0)+3;
    result = `+${gold} oro · +3 esencia`;
  } else if(choice.effect==='offering'){
    const cost = Math.max(1,Math.round(runState.maxHp*.12));
    const gold = Math.round((42+state.level*4)*depthFactor);
    runState.hp = Math.max(1,runState.hp-cost); gainGold(gold); state.materials.essence = (state.materials.essence||0)+4;
    result = `-${cost} vida · +${gold} oro · +4 esencia`;
  } else if(choice.effect==='coffer'){
    const cost = Math.max(1,Math.round(runState.maxHp*.08));
    const gold = Math.round((56+state.level*4)*depthFactor);
    runState.hp = Math.max(1,runState.hp-cost); gainGold(gold);
    result = `-${cost} vida · +${gold} oro`;
  } else if(choice.effect==='clarity'){
    const amount = Math.round(runState.maxMana*.34);
    const before = runState.mana;
    runState.mana = Math.min(runState.maxMana,runState.mana+amount); state.materials.essence = (state.materials.essence||0)+5;
    result = `+${runState.mana-before} maná · +5 esencia`;
  } else if(choice.effect==='jackpot'){
    const gold = Math.round((100+state.level*7)*depthFactor);
    gainGold(gold); result = `+${gold} oro`;
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

/* ================= DADOS DE RECOMPENSA Y FIN DE LA RUN ================= */
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
  const gold = Math.floor((45 + lvl*4) * (1+m));
  const statPoints = Math.max(1, Math.round(1 + m*2.5));
  return { heal, mana, gold, statPoints };
}

/**
 * Cobra la recompensa de un "contrato" (nodo de tipo 'reward'/dados): aplica
 * el bono elegido (`type`: 'heal'|'mana'|stat) sobre `runState.rewardPreview`
 * calculado por `computeBountyRewards`, y vuelve al mapa. No confundir con
 * `awardRunLoot` (combat-loot.js), que es el botín de vencer un monstruo.
 */
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

/**
 * Cierra la expedición roguelike completa (`runState` pasa a `null` al
 * final): cobra el oro pendiente de la run, arma el resumen final
 * (`makeFinalRunSummary`), actualiza récords/logros y libera al compañero
 * domado si lo había. `retreated` es true si el jugador se retiró a
 * voluntad; `completed` es true si llegó al final de la expedición
 * (profundidad máxima). Se llama desde `retreatRun()` o cuando el jugador
 * pierde una pelea de run.
 */
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

