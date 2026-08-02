/* ================= COMBAT-RUN-RENDER.JS =================
   Renderizado del modo roguelike (mapa de nodos, panel de expedicion).
   Cuarta parte de lo que antes era combat.js. Depende de: classes.js,
   combat-loot.js, combat-battle-monsters.js, combat-battle-core.js,
   combat-battle-vfx.js, combat-battle-abilities.js, combat-battle-turns.js,
   combat-run.js.
   ================================================================= */

/* ---- Renderizado del modo roguelike ---- */
/* ================= TARJETAS DE RESUMEN (expedición, profundidad, botín) ================= */
function updateHuntOverview(){
  const overview=document.getElementById('huntOverview');
  if(!overview) return;
  const active=!!runState;
  // Con una expedición en curso, el HUD de abajo (renderRunStatusBar) ya
  // muestra profundidad/racha/vencidos/esencia/reliquias con más detalle
  // (más HP, maná, próximo peligro y oro en riesgo) — mostrar estas tarjetas
  // también sería repetir la misma info dos veces. Solo sirven como resumen
  // de bienvenida antes de arrancar.
  overview.style.display = active ? 'none' : '';
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
/* ================= BARRA DE ESTADO DE LA RUN ================= */
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
  const estimatedGold = Math.max(8, Math.round((11 + state.level * 3) * (1 + runState.depth * .13)));
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

/* ================= MAPA DE NODOS (renderizado) ================= */
/**
 * Renderiza el estado actual del modo roguelike dentro de #arena: según
 * `runState.phase` dibuja el mapa de nodos, la pantalla de reliquia/santuario/
 * evento/mercader/rastreo, o la pantalla de fin de run. Es la función más
 * grande del archivo porque cubre TODAS las fases posibles de una run fuera
 * de combate (el combate en sí lo maneja `renderArena` en script-ui-core.js).
 * No confundir con `renderRunStatusBar` (la barra compacta de HP/maná/oro).
 */
function renderRunMode(){
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
    arena.innerHTML = `<div class="arena-idle" id="arenaIdle">Comenzá tu descenso y elegí un camino. Cada ruta revela un desafío distinto.</div>`;
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
  }

  if(runState.phase==='relic'){
    arena.innerHTML = `
      <div class="dice-stage"><div class="combo-label" style="color:var(--mana)">✧ Reliquia del camino</div>
      <div class="bounty-intro">El sendero responde a tu voluntad. Elegí un poder solo para esta expedición.</div>
      <div class="event-choice relic-choice">${(runState.relicChoices||[]).map(relic=>`<button class="relic-card" data-run-relic="${relic.id}"><span class="relic-icon">${relic.icon}</span><b>${relic.name}</b><small>${relic.description}</small></button>`).join('')}</div></div>`;
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
          <div class="reward-card reward-heal" data-reward="heal"><i class="r-accent"></i><span class="r-icon">💚</span><div class="r-label">Curarse</div><div class="r-val">+${r.heal} vida</div><div class="r-note">Recuperación instantánea</div></div>
          <div class="reward-card reward-stat" data-reward="stat"><i class="r-accent"></i><span class="r-icon">✨</span><div class="r-label">Mejora de expedición</div><div class="r-val">+${r.statPoints} pts · temporal</div><div class="r-note">Atributo al azar · dura la cacería</div></div>
          <div class="reward-card reward-gold" data-reward="gold"><i class="r-accent"></i><span class="r-icon">💰</span><div class="r-label">Oro</div><div class="r-val">+${r.gold}</div><div class="r-note">Se cobra al salir de la cacería</div></div>
          <div class="reward-card reward-mana" data-reward="mana"><i class="r-accent"></i><span class="r-icon">💧</span><div class="r-label">Recuperar maná</div><div class="r-val">+${r.mana} maná</div><div class="r-note">Recuperación instantánea</div></div>
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
