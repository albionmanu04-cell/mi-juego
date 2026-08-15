/* ================= COMBAT-DECK.JS =================
   Mazo de expedición: cada combate roba una mano, usa energía y termina
   cuando el jugador decide. Reutiliza los cálculos y efectos de las clases.
   =============================================================== */

function deckShuffle(cards){
  const copy = [...cards];
  for(let i=copy.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [copy[i],copy[j]]=[copy[j],copy[i]]; }
  return copy;
}

function deckCard(id, type, label, icon, cost, description, extra={}){
  return { id, type, label, icon, cost, description, ...extra };
}

function buildCombatDeck(){
  const moves = classMoveNames();
  const cards = [
    deckCard('strike-1','attack',moves.attack,'⚔',1,'Ataque básico. Gana 3 de maná.',{copies:3}),
    deckCard('technique','skill',moves.skill,'✦',2,'Técnica de clase: daño elevado y posible aturdimiento.'),
    deckCard('guard','guard','Guardia','🛡',1,'Reduce el daño de los próximos 2 golpes.'),
    deckCard('focus','focus','Concentración','◈',0,'Recuperá maná y robá 1 carta.'),
    deckCard('signature','signature',classAbility().label,classAbility().icon,2,classAbility().hint)
  ];
  subclassAbilityDefinitions().forEach((ability,index)=>{
    cards.push(deckCard(`subclass-${ability.key}`,'subclass',ability.label,ability.icon,index===0?1:2,ability.hint,{abilityKey:ability.key}));
  });
  abilityDefinitions().filter(ability=>state.level>=ability.level).forEach(ability=>{
    cards.push(deckCard(`level-${ability.key}`,'levelAbility',ability.label,ability.icon,2,ability.hint,{abilityKey:ability.key}));
  });
  if(state.characterClass==='tamer') cards.push(deckCard('tame','tame','Lazo de Captura','🪢',1,'Intentá domar a un enemigo por debajo del 50% de vida.'));
  const expanded=[];
  cards.forEach(card=>{ for(let i=0;i<(card.copies||1);i++) expanded.push({...card, uid:`${card.id}-${i}-${Math.random().toString(36).slice(2,7)}`}); });
  return expanded;
}

function drawDeckCards(reference, count=1){
  if(!reference?.deckMode) return;
  for(let i=0;i<count;i++){
    if(!reference.drawPile.length){
      if(!reference.discardPile.length) break;
      reference.drawPile=deckShuffle(reference.discardPile);
      reference.discardPile=[];
      addLog('↻ El descarte vuelve al mazo.', 'combat');
    }
    const card=reference.drawPile.pop();
    if(card) reference.hand.push(card);
  }
}

function initializeDeckCombat(reference=battle){
  if(!reference?.deckMode) return;
  reference.drawPile=deckShuffle(buildCombatDeck());
  reference.discardPile=[];
  reference.playedCards=[];
  reference.hand=[];
  reference.energy=reference.maxEnergy=3;
  drawDeckCards(reference,5);
  addLog('🃏 Robaste tu mano inicial. Tenés 3 de energía.', 'combat');
}

function beginDeckTurn(reference=battle){
  if(!isCurrentBattle(reference)) return;
  reference.turn=(reference.turn||0)+1;
  reference.energy=reference.maxEnergy||3;
  reference.playedCards=[];
  while(reference.hand.length<5) drawDeckCards(reference,1);
  reference.busy=false;
  syncBattleUi();
  renderActionButtons();
  addLog(`✦ Turno ${reference.turn}: 3 de energía y ${reference.hand.length} cartas en mano.`, 'combat');
}

function resolvePlayerActionEnd(reference=battle){
  if(!isCurrentBattle(reference)) return;
  if(reference.deckMode){
    reference.busy=false;
    syncBattleUi();
    renderActionButtons();
    return;
  }
  startMonsterTurn(reference);
}

function deckManaCost(card){
  if(card.type==='skill') return visibleSkillCost(Math.round(battle.playerMaxMana*currentClass().manaCost*(1-subclassBonus('manaDiscount'))));
  if(card.type==='signature') return classAbilityCost();
  if(card.type==='subclass'){
    const ability=subclassAbilityDefinitions().find(entry=>entry.key===card.abilityKey);
    return ability ? visibleSkillCost(subclassAbilityCost(ability)) : 0;
  }
  if(card.type==='levelAbility'){
    const ability=abilityDefinitions().find(entry=>entry.key===card.abilityKey);
    return ability ? visibleSkillCost(Math.round(battle.playerMaxMana*ability.cost)) : 0;
  }
  if(card.type==='tame') return battle.monster.isBoss || battle.monster.hp>battle.monster.maxHp*.5;
  return 0;
}

function deckCardBlocked(card){
  if(!battle || battle.busy || battle.energy<card.cost) return true;
  if(card.type==='signature') return battle.playerStatus.classCooldown>0 || battle.playerMana<deckManaCost(card) || (state.characterClass==='tamer'&&!state.companion);
  if(card.type==='subclass'){
    const ability=subclassAbilityDefinitions().find(entry=>entry.key===card.abilityKey);
    return !ability || (battle.playerStatus.cooldowns[card.abilityKey]||0)>0 || battle.playerMana<deckManaCost(card) || (ability.requiresCompanion&&!state.companion);
  }
  if(card.type==='levelAbility'){
    const ability=abilityDefinitions().find(entry=>entry.key===card.abilityKey);
    return !ability || state.level<ability.level || (battle.playerStatus.cooldowns[card.abilityKey]||0)>0 || battle.playerMana<deckManaCost(card);
  }
  return card.type==='skill' && battle.playerMana<deckManaCost(card);
}

function consumeDeckCard(card){
  const index=battle.hand.findIndex(item=>item.uid===card.uid);
  if(index>=0) battle.hand.splice(index,1);
  battle.discardPile.push(card);
  battle.playedCards.push(card.id);
  battle.energy=Math.max(0,battle.energy-card.cost);
}

function playDeckGuard(reference){
  reference.busy=true;
  const ps=reference.playerStatus;
  ps.shieldTurns=Math.max(ps.shieldTurns,2);
  ps.counterReady=Math.max(ps.counterReady,1);
  Sound.shield();
  playCombatVfx('shield','player');
  spawnFloatText('player','GUARDIA','heal');
  addLog('🛡 Guardia: bloqueás 2 golpes y preparás un contraataque.', 'combat');
  showFeedback('🛡 GUARDIA', '2 bloqueos y contraataque listo', 'mana');
  setTimeout(()=>resolvePlayerActionEnd(reference),160);
}

function playDeckFocus(reference){
  reference.busy=true;
  const gain=Math.max(6,Math.round(reference.playerMaxMana*.10));
  reference.playerMana=Math.min(reference.playerMaxMana,reference.playerMana+gain);
  drawDeckCards(reference,1);
  Sound.mana();
  playCombatVfx('arcane','player');
  spawnFloatText('player',`+${gain} maná`,'heal');
  addLog(`◈ Concentración: +${gain} maná y robás 1 carta.`, 'combat');
  setTimeout(()=>resolvePlayerActionEnd(reference),140);
}

function playDeckCard(uid){
  if(!battle?.deckMode || battle.busy) return;
  const card=battle.hand.find(item=>item.uid===uid);
  if(!card || deckCardBlocked(card)) return;
  consumeDeckCard(card);
  // Las acciones heredadas (ataque, firma y subclase) activan `busy` por
  // sí mismas. Marcarlo antes impediría que lleguen a ejecutarse.
  battle.deckPlayingCard=card;
  if(card.type==='attack') playerAttack(false);
  else if(card.type==='skill') playerAttack(true);
  else if(card.type==='signature') useClassAbility();
  else if(card.type==='subclass') useSubclassAbility(card.abilityKey);
  else if(card.type==='levelAbility') useAbility(card.abilityKey);
  else if(card.type==='tame') tryTameMonster();
  else if(card.type==='guard') playDeckGuard(battle);
  else if(card.type==='focus') playDeckFocus(battle);
}

function endDeckTurn(){
  if(!battle?.deckMode || battle.busy) return;
  battle.discardPile.push(...battle.hand);
  battle.hand=[];
  battle.busy=true;
  addLog('⏳ Terminaste tu turno. El enemigo prepara su respuesta.', 'enemy');
  renderActionButtons();
  setTimeout(()=>startMonsterTurn(battle),180);
}

function renderDeckCombatActions(box){
  if(!battle?.deckMode || !box) return;
  const tactical=monsterTacticalReadout();
  const affinity=monsterAffinity(battle.monster);
  const cardHtml=battle.hand.map(card=>{
    const blocked=deckCardBlocked(card), mana=deckManaCost(card);
    const footer=card.type==='signature' && battle.playerStatus.classCooldown>0 ? `Recarga ${battle.playerStatus.classCooldown}` : ['subclass','levelAbility'].includes(card.type) && battle.playerStatus.cooldowns[card.abilityKey]>0 ? `Recarga ${battle.playerStatus.cooldowns[card.abilityKey]}` : mana ? `${mana} maná` : 'Sin maná';
    return `<button class="deck-card deck-${card.type} ${blocked?'disabled':''}" data-deck-card="${card.uid}" ${blocked?'disabled':''} title="${escapeHtml(card.description)}"><span class="deck-card-cost">${card.cost}</span><span class="deck-card-icon">${card.icon}</span><strong>${escapeHtml(card.label)}</strong><small>${escapeHtml(card.description)}</small><em>${footer}</em></button>`;
  }).join('') || '<div class="deck-empty">No quedan cartas en tu mano.</div>';
  box.innerHTML=`
    <section class="deck-combat-hud">
      <div class="deck-turn"><span>✦ TURNO ${battle.turn}</span><b>TU JUGADA</b><small>Jugá cartas o terminá el turno.</small></div>
      <div class="deck-energy" aria-label="Energía"><span>ENERGÍA</span><b>${Array.from({length:battle.maxEnergy},(_,i)=>`<i class="${i<battle.energy?'full':''}">◆</i>`).join('')}</b><small>${battle.energy}/${battle.maxEnergy}</small></div>
      <div class="deck-count"><span>MAZO ${battle.drawPile.length}</span><span>DESCARTE ${battle.discardPile.length}</span></div>
    </section>
    <section class="combat-intel intent-${tactical.key}">
      <div class="combat-intel-title"><span>◈ INTENCIÓN ENEMIGA</span><b>${tactical.icon} ${tactical.label}</b></div>
      <div class="combat-intel-grid"><article><small>DAÑO PREVISTO</small><strong>${tactical.damageText}</strong><em>Usá Guardia o Defensa para reducirlo</em></article><article><small>RASGO</small><strong>${affinity?`${affinity.icon} ${affinity.label}`:`${battle.monster.archetype.icon} ${battle.monster.archetype.label}`}</strong><em>${affinity?affinity.hint:battle.monster.archetype.hint}</em></article></div>
      <div class="combat-intel-advice"><b>CONSEJO</b><span>${escapeHtml(tactical.response)}</span></div>
    </section>
    <section class="deck-hand" aria-label="Mano de cartas"><div class="deck-hand-title"><span>MANO · ${battle.hand.length} CARTAS</span><small>Pasá el cursor sobre una carta para ver su efecto</small></div><div class="deck-hand-row">${cardHtml}</div></section>
    <div class="deck-controls"><button id="deckEndTurn" ${battle.busy?'disabled':''}><span>⏳</span> TERMINAR TURNO <small>El enemigo actuará</small></button></div>
    <div class="combat-vitals"><div class="bar-label"><span>Tu vida</span><span>${battle.playerHp}/${battle.playerMaxHp}</span></div><div class="bar hp"><div style="width:${(battle.playerHp/battle.playerMaxHp)*100}%"></div></div><div class="bar-label"><span>Tu maná</span><span>${battle.playerMana}/${battle.playerMaxMana}</span></div><div class="bar mp"><div style="width:${(battle.playerMana/battle.playerMaxMana)*100}%"></div></div></div>`;
  box.querySelectorAll('[data-deck-card]').forEach(button=>button.addEventListener('click',()=>playDeckCard(button.dataset.deckCard)));
  document.getElementById('deckEndTurn')?.addEventListener('click',endDeckTurn);
}
