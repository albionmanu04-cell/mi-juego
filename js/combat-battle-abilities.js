/* ================= COMBAT-BATTLE-ABILITIES.JS =================
   Habilidades de combate: definición de habilidades generales, estado del
   jugador y momentum, habilidad de clase, habilidades de subclase (dos
   técnicas extra por senda), costo/uso de habilidades y renderizado de
   botones y estado de combate. Cuarta parte de lo que antes era
   combat-battle.js. Depende de: classes.js, combat-battle-core.js,
   combat-battle-vfx.js.
   ================================================================= */

/* ================= HABILIDADES Y MOMENTUM ================= */
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
/* ================= HABILIDAD DE CLASE ================= */
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
/* ================= HABILIDADES DE SUBCLASE ================= */
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
/**
 * Ejecuta una de las dos habilidades de subclase (`key` referencia una
 * entrada de `SUBCLASS_ABILITIES`, más arriba en este mismo archivo): valida
 * maná/cooldown, resuelve el efecto (daño vía `subclassHit`, curación,
 * guardia, etc.), gasta maná/cooldown y termina el turno pasándole el
 * control a `startMonsterTurn` (en combat-run.js).
 */
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

/**
 * Ejecuta la habilidad principal de la clase (`classAbility()`, definida en
 * `CLASS_ABILITIES` más arriba) — cada clase tiene una sola, distinta de las
 * dos habilidades de subclase de `useSubclassAbility`. Misma estructura:
 * valida costo/cooldown, aplica el efecto, y pasa el turno al monstruo.
 */
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

/* ================= COSTO, BOTONES Y ESTADO DE HABILIDADES ================= */
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

/**
 * Usa una de las 3 habilidades generales (`heal`/`shield`/`bleed`, ver
 * `abilityDefinitions()`), no las de clase/subclase. Valida nivel, cooldown
 * y maná, aplica el efecto correspondiente y — a diferencia de
 * `playerAttack` — es quien decide directamente si termina la pelea
 * (`endBattle('win')`) o le pasa el turno al monstruo (`startMonsterTurn`).
 */
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

