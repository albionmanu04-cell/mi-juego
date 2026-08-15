/* ================= COMBAT-BATTLE-TURNS.JS =================
   Turno del jugador: ataque básico, combo, domesticar monstruo, asistencia
   del compañero, resolución de golpes (runPlayerHits, turno del monstruo
   incluido), entrenamiento, elección de subclase y renacer (rebirth/reset).
   Quinta y última parte de lo que antes era combat-battle.js. Depende de:
   classes.js, combat-battle-core.js, combat-battle-vfx.js,
   combat-battle-abilities.js.
   ================================================================= */

/* ================= TURNO DEL JUGADOR Y RENACER ================= */
/**
 * Ataque básico o habilidad de clase del jugador (según `isSkill`). Cobra
 * maná si corresponde, consume el remate de momentum si estaba listo,
 * dispara sonido/VFX, aplica la curación pasiva del sacerdote en ataques
 * básicos, calcula golpes extra por velocidad (`extraTurnChance`) y termina
 * delegando el daño real a `runPlayerHits`. No mueve el turno del monstruo
 * por sí sola — eso lo hace `runPlayerHits` al terminar.
 */
function playerAttack(isSkill){
  if(!battle || battle.busy) return;
  const rawCost = Math.round(battle.playerMaxMana*currentClass().manaCost*(1-subclassBonus('manaDiscount')));
  const cost = visibleSkillCost(rawCost);
  if(isSkill && battle.playerMana < cost) return;
  const momentumFinisher = consumeMomentumFinisher();
  const action = classCombatAction(isSkill);
  action.totalDamage=0;
  battle.momentumFinisher = momentumFinisher;
  gainCombatMomentum(isSkill?'skill':'attack',isSkill?26:18);
  battle.busy = true;
  playClassAttackEffect(isSkill);
  if(isSkill) {
    Sound.classSkill(state.characterClass);
    const usedFreeSkill = spendSkillCost(rawCost);
    if(action.stunChance && Math.random()<action.stunChance){
      battle.monster.status.stunnedTurns = 1;
      setTimeout(()=>Sound.statusProc?.('stun'),150);
    }
    if(action.guard){
      battle.playerStatus.shieldTurns = Math.max(battle.playerStatus.shieldTurns,1);
      battle.playerStatus.counterReady = Math.max(battle.playerStatus.counterReady,1);
      showFeedback('🛡 EMBATE DEL JURAMENTO','El próximo golpe queda protegido y será contraatacado','mana');
    }
    if(action.bleedTurns){
      battle.monster.status.bleedTurns = Math.max(battle.monster.status.bleedTurns,action.bleedTurns);
      battle.monster.status.bleedDamage = Math.max(battle.monster.status.bleedDamage,Math.max(1,Math.round(atkDamage()*.18)));
      setTimeout(()=>Sound.statusProc?.('bleed'),160);
    }
    if(action.arcanePerCharge){
      action.consumedCharges = battle.playerStatus.arcaneCharges;
      action.damage *= 1 + action.arcanePerCharge*action.consumedCharges;
      battle.playerStatus.arcaneCharges = 0;
      if(action.consumedCharges) showFeedback('✦ NOVA SOBRECARGADA',`${action.consumedCharges} carga${action.consumedCharges===1?'':'s'} consumida${action.consumedCharges===1?'':'s'}`,'mana');
    }
    flashArena('skill');
    burstSparks('var(--mana)', 8);
    if(usedFreeSkill) showFeedback('✧ HABILIDAD GRATUITA','El Sello del Alba se consume este combate','mana');
  } else {
    Sound.classAttack(state.characterClass);
    battle.playerMana = Math.min(battle.playerMaxMana, battle.playerMana + (action.mana||3));
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

  let hits = Math.max(1,action.hits||1);
  if(!isSkill) while(hits < 4 && Math.random() < extraTurnChance()) hits++;
  if(hits>1) showComboBadge(hits);

  runPlayerHits(hits, isSkill, 0, battle, action);
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

/* ================= DOMAR MONSTRUOS Y COMPAÑERO ================= */
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
    setTimeout(()=>resolvePlayerActionEnd(tameBattle),340);
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

/* ================= RESOLUCIÓN DE GOLPES (jugador y monstruo) ================= */
/**
 * Aplica UN golpe del jugador al monstruo (de los `totalHits` totales de un
 * ataque/habilidad) y se reprograma a sí misma con `setTimeout` hasta agotar
 * `doneCount`/`totalHits` — así es como se anima golpe por golpe en vez de
 * aplicar todo el daño de una. `reference` fija a qué `battle` pertenece este
 * golpe (ver `isCurrentBattle`): si la pelea cambió o terminó mientras el
 * timeout esperaba, la llamada se ignora en silencio. Al terminar todos los
 * golpes, dispara el turno del monstruo (`startMonsterTurn`, en combat-run.js).
 */
function runPlayerHits(totalHits, isSkill, doneCount, reference=battle, action=classCombatAction(isSkill)){
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
    let rawDmg = atkDamage() * combatStance().attack * action.damage * (isSkill ? (action.legacy?1:1+subclassBonus('skillMult'))*(1+runRelicValue('skillPower')) : 1) * comboMult * (0.85+Math.random()*0.3);
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
    action.totalDamage=(action.totalDamage||0)+dmg;
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
      spawnFloatText('monster', tag+'-'+dmg, (isCrit?'crit':'')+(isBigHit?' big':''), doneCount,{classId:state.characterClass,value:dmg,isCrit,isSkill});
      addLog(`${isSkill?'✦ Habilidad':'⚔ Ataque'}${isCrit?' crítico':''}: ${battle.monster.name} recibe ${dmg} de daño.`, isCrit?'crit':'combat');
      pf.classList.remove('attacking');
      syncBattleUi();

      if(battle.monster.hp <= 0){
        showActionDamageTotal(action.totalDamage,{classId:state.characterClass,isSkill,hits:doneCount+1});
        mf.classList.add('dead');
        battle.busy = false;
        setTimeout(()=>{ if(isCurrentBattle(reference)) endBattle('win'); }, 500);
        return;
      }

      doneCount++;
      if(doneCount < totalHits){
        setTimeout(()=>runPlayerHits(totalHits, isSkill, doneCount, reference, action), 320);
        return;
      }

      showActionDamageTotal(action.totalDamage,{classId:state.characterClass,isSkill,hits:totalHits});

      if(action.grantArcaneAfter){
        battle.playerStatus.arcaneCharges = Math.min(3,battle.playerStatus.arcaneCharges+action.grantArcaneAfter);
        showFeedback('✦ CARGA ARCANA',`${battle.playerStatus.arcaneCharges}/3 · potencia tu próxima Nova Astral`,'mana');
      }

      setTimeout(()=>{
        if(!isCurrentBattle(reference)) return;
        if(triggerBossPhaseTwo()) return;
        resolvePlayerActionEnd(reference);
      }, 260);
    };
    if(hitStopDelay>0) setTimeout(()=>{ if(isCurrentBattle(reference)) applyImpact(); }, hitStopDelay);
    else applyImpact();
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

function doReset(){
  if(state.level < LEVEL_CAP || battle || (runState && runState.phase!=='ended')) return;
  if(state.resets===0 && !state.subclass){ openSubclassChoice(true); return; }
  if(!confirm(`¿Renacer como nivel 1?\n\nConservarás equipo, inventario, oro, materiales, logros, bestiario y tu subclase. Recibirás la Marca Eterna #${state.resets+1}.`)) return;
  performRebirth();
}
