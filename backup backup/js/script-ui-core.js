/* ================= SCRIPT-UI-CORE.JS =================
   normalizeState, asignacion de puntos de stats, arena visual (SVGs de
   heroe/monstruo). Tercera parte de lo que antes era script.js. Depende de:
   script-state.js, script-math.js.
   ================================================================= */

/* ================= SCRIPT PRINCIPAL (continuación: asignación de stats, UI, render, inicialización) ================= */
const ALLOCATION_STATS = [
  { key:'ataque', group:'Combate', icon:'⚔\ufe0e', label:'Ataque', description:'Aumenta el daño base de todos tus golpes.', value:()=>Math.round(atkDamage()), add:1 },
  { key:'critRate', group:'Combate', icon:'✹', label:'Prob. critica', description:'Posibilidad de convertir un golpe en crítico. Sin límite máximo.', value:()=>Math.round(critChance()*100)+'%', add:1, critical:true },
  { key:'critDmg', group:'Combate', icon:'◎', label:'Daño critico', description:'Potencia adicional de los golpes críticos. Sin límite máximo.', value:()=>Math.round(critMultiplier()*100)+'%', add:5, critical:true },
  { key:'vida', group:'Supervivencia', icon:'♥', label:'Vida', description:'Aumenta tu vida máxima durante la expedición.', value:()=>maxHP(), add:1 },
  { key:'mana', group:'Supervivencia', icon:'✦', label:'Mana', description:'Aumenta el mana disponible para habilidades.', value:()=>maxMana(), add:1 },
  { key:'robustez', group:'Supervivencia', icon:'⬡', label:'Defensa', description:'Suma defensa sobre la base universal de 10 y reduce el daño recibido.', value:()=>`${Math.round(totalDefense())} · ${Math.round(damageReduction()*100)}% reducción`, add:1 },
  { key:'agilidad', group:'Supervivencia', icon:'↝', label:'Evasión', description:'Parte de 0% y mejora la posibilidad de esquivar por completo un ataque.', value:()=>Math.round(dodgeChance()*1000)/10+'%', add:1 },
  { key:'rapidez', group:'Supervivencia', icon:'⌁', label:'Rapidez', description:'Mejora la probabilidad de obtener un golpe extra.', value:()=>Math.round(extraTurnChance()*100)+'%', add:1 },
  { key:'percepcion', group:'Exploración', icon:'◉', label:'Percepción', description:'Puede revelar la vida exacta del enemigo. También aumenta el botín de élites y jefes.', value:()=>`${Math.round(perceptionChance())}% análisis · botín +${Math.round(perceptionLootBonus()*100)}%`, add:1 },
];

/* ================= ASIGNACIÓN DE PUNTOS DE ESTADÍSTICA ================= */
// Guarda el "antes" de heroPowerSnapshot() (script-math.js) apenas arranca
// una tanda nueva de puntos pendientes (pendingTotal pasa de 0 a 1), para
// poder mostrar el delta completo de la tanda cuando se confirme con
// savePendingPoints(). No se guarda en `state` (es solo de esta sesión de
// navegador) — si se recarga la página a mitad de una asignación sin
// guardar, el próximo "Guardar" simplemente no muestra el indicador.
let statAllocSnapshot = null;
function canRespecPoints(){ return availableStatResets()>0 && !isHuntProgressLocked(); }
function allocationTotal(){ return Object.values(state.allocatedPoints || {}).reduce((sum, value)=>sum+(Number(value)||0),0); }
function pendingTotal(){ return Object.values(state.pendingPoints || {}).reduce((sum, value)=>sum+(Number(value)||0),0); }
function emptyPointMap(){ return { ataque:0, vida:0, mana:0, agilidad:0, rapidez:0, robustez:0, percepcion:0, critRate:0, critDmg:0 }; }
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
  state.level=1;
  state.exp=0;
  state.stats={...defaultState(state.name,state.characterClass).stats};
  state.robustness=0;
  state.perception=0;
  state.critRateStat=0;
  state.critDmgStat=0;
  state.allocatedPoints=emptyPointMap();
  state.pendingPoints=emptyPointMap();
  state.statPoints=rebirthStartingPoints();
  if(state.missions?.week) state.missions.week.resets=(state.missions.week.resets||0)+1;
  if(state.missions?.month) state.missions.month.resets=(state.missions.month.resets||0)+1;
  addLog(`✦ RENACIMIENTO #${state.resets} — Marca Eterna obtenida · +${resetStatBonus()} progreso base · ${state.statPoints} puntos iniciales`,'reset');
  showFeedback(`✦ MARCA ETERNA ${state.resets}`,`Nivel 1 · ${state.statPoints} puntos iniciales · equipo conservado`,'level');
  rollMissionReset();
  render();
  saveState();
}
function doReset(){
  if(state.level<LEVEL_CAP || isHuntProgressLocked()) return;
  if(state.resets===0 && !state.subclass){ openSubclassChoice(true); return; }
  if(!confirm(`¿Renacer como nivel 1?\n\nConservarás equipo, inventario, oro, materiales, logros, bestiario y tu subclase. Recibirás la Marca Eterna #${state.resets+1}.`)) return;
  performRebirth();
}
function applyStatDelta(key, points){
  const conf = ALLOCATION_STATS.find(stat=>stat.key===key);
  if(!conf || !points) return;
  if(key==='critRate') state.critRateStat = Math.max(0, state.critRateStat + points*conf.add);
  else if(key==='critDmg') state.critDmgStat = Math.max(0, state.critDmgStat + points*conf.add);
  else if(key==='robustez') state.robustness = Math.max(0, state.robustness + points*conf.add);
  else if(key==='percepcion') state.perception = Math.max(0, state.perception + points*conf.add);
  else state.stats[key] = Math.max(1, (state.stats[key]||1) + points*conf.add);
}
function statJuice(key, direction, investedPoints){
  const card = document.querySelector(`.stat-card[data-stat-key="${key}"]`);
  const valEl = document.getElementById(`val-${key}`);
  const countEl = document.getElementById(`count-${key}`);
  const iconEl = document.getElementById(`icon-${key}`);
  const stepper = document.getElementById(`stepper-${key}`);
  const isMilestone = direction>0 && investedPoints>0 && investedPoints%5===0;
  if(card){
    card.classList.remove('card-pulse','card-pulse-out','milestone-flash');
    void card.offsetWidth;
    card.classList.add(isMilestone ? 'milestone-flash' : (direction>0 ? 'card-pulse' : 'card-pulse-out'));
  }
  if(iconEl && direction>0){ iconEl.classList.remove('icon-pop'); void iconEl.offsetWidth; iconEl.classList.add('icon-pop'); }
  [valEl,countEl].forEach(el=>{ if(!el) return; el.classList.remove('value-pop'); void el.offsetWidth; el.classList.add('value-pop'); });
  if(stepper){
    const float = document.createElement('span');
    float.className = 'stat-gain-float' + (direction>0?'':' lose') + (isMilestone?' milestone':'');
    float.textContent = isMilestone ? `¡RACHA x${investedPoints}!` : (direction>0?'+1':'−1');
    stepper.appendChild(float);
    setTimeout(()=>float.remove(), 900);
  }
  if(isMilestone && iconEl){
    for(let i=0;i<6;i++){
      const spark = document.createElement('i');
      const angle = Math.random()*Math.PI*2, dist = 14+Math.random()*16;
      spark.className = 'stat-mini-spark';
      spark.style.left = '50%'; spark.style.top = '50%';
      spark.style.setProperty('--x', `${Math.cos(angle)*dist}px`);
      spark.style.setProperty('--y', `${Math.sin(angle)*dist}px`);
      iconEl.appendChild(spark);
      setTimeout(()=>spark.remove(), 600);
    }
  }
}
function celebrateStatSave(){
  const box = document.getElementById('statAllocList');
  const board = box && box.querySelector('.stat-board');
  if(!board) return;
  board.classList.remove('board-flash');
  void board.offsetWidth;
  board.classList.add('board-flash');
}
function editPendingAllocation(key, direction){
  const conf = ALLOCATION_STATS.find(stat=>stat.key===key);
  if(!conf || isHuntProgressLocked()) return;
  if(direction>0){
    if(state.statPoints<=0) return;
    if(pendingTotal()===0) statAllocSnapshot = heroPowerSnapshot();
    state.pendingPoints[key] = (state.pendingPoints[key]||0) + 1;
    state.statPoints--;
    applyStatDelta(key, 1);
  } else {
    if(!(state.pendingPoints[key]||0)) return;
    state.pendingPoints[key]--;
    state.statPoints++;
    applyStatDelta(key, -1);
  }
  const investedPoints = (state.allocatedPoints[key]||0) + (state.pendingPoints[key]||0);
  Sound.click(); render();
  statJuice(key, direction, investedPoints);
}
function savePendingPoints(){
  const amount = pendingTotal();
  if(!amount) return;
  Object.keys(state.pendingPoints).forEach(key=>{ state.allocatedPoints[key] = (state.allocatedPoints[key]||0) + (state.pendingPoints[key]||0); });
  state.pendingPoints = emptyPointMap();
  Sound.reward();
  if(statAllocSnapshot){
    showStatDelta(statAllocSnapshot, heroPowerSnapshot(), `✦ ${amount} punto${amount===1?'':'s'} asignado${amount===1?'':'s'}`);
    statAllocSnapshot = null;
  } else {
    showFeedback('ESTADISTICAS GUARDADAS', `${amount} punto${amount===1?'':'s'} confirmado${amount===1?'':'s'}`);
  }
  render(); saveState();
  celebrateStatSave();
}
function resetAllocatedPoints(){
  if(!canRespecPoints() || !allocationTotal() || pendingTotal()) return;
  if(!confirm(`Restablecer ${allocationTotal()} puntos distribuidos?`)) return;
  Object.entries(state.allocatedPoints).forEach(([key, points])=>{
    const amount = Number(points)||0;
    if(!amount) return;
    applyStatDelta(key, -amount);
  });
  state.statPoints += allocationTotal();
  state.allocatedPoints = emptyPointMap();
  state.statResetsUsed = (state.statResetsUsed||0) + 1;
  Sound.reward(); showFeedback('PUNTOS RESTABLECIDOS', `Distribuilos como quieras · ${availableStatResets()} disponible${availableStatResets()===1?'':'s'}`); render(); saveState();
}
function renderStatPips(saved, pending){
  saved = Math.max(0, Number(saved)||0);
  pending = Math.max(0, Number(pending)||0);
  const total = saved + pending;
  // Como máximo se muestran 36 puntos (tres filas). Al superar el tablero
  // comienza una nueva vuelta de color en lugar de alargar la tarjeta.
  const cycleSize = 36;
  const cycle = total > 0 ? Math.floor((total-1) / cycleSize) : 0;
  const cycleStart = cycle * cycleSize;
  const visibleTotal = total > 0 ? total - cycleStart : 0;
  const rowCount = Math.max(1, Math.min(3, Math.ceil(visibleTotal / 12)));
  return Array.from({length:rowCount}, (_, row)=>{
    const pips = Array.from({length:12}, (_, slot)=>{
      const index = cycleStart + row*12 + slot;
      let kind = index<saved ? 'filled' : index<total ? 'pending' : '';
      if(kind && index===total-1) kind += ' pip-new';
      return `<i class="${kind}"></i>`;
    }).join('');
    return `<div class="stat-pip-row cycle-${cycle%4}">${pips}</div>`;
  }).join('') + (cycle>0 ? `<span class="stat-pip-cycle">CICLO ${cycle+1} · ${cycleStart+1}–${cycleStart+36}</span>` : '');
}

function bindStatHoldControl(button, key, direction){
  if(!button) return;
  let delayTimer = null;
  let repeatTimer = null;
  let pointerStarted = false;
  const stop = ()=>{
    clearTimeout(delayTimer);
    clearInterval(repeatTimer);
    delayTimer = repeatTimer = null;
    window.removeEventListener('pointerup', stop);
    window.removeEventListener('pointercancel', stop);
    window.removeEventListener('blur', stop);
  };
  button.addEventListener('pointerdown', event=>{
    if(button.disabled || event.button>0) return;
    event.preventDefault();
    pointerStarted = true;
    editPendingAllocation(key, direction);
    delayTimer = setTimeout(()=>{
      repeatTimer = setInterval(()=>editPendingAllocation(key, direction), 85);
    }, 330);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    window.addEventListener('blur', stop);
  });
  // Mantiene accesibilidad por teclado sin duplicar el click del puntero.
  button.addEventListener('click', event=>{
    if(pointerStarted){ pointerStarted=false; event.preventDefault(); return; }
    editPendingAllocation(key, direction);
  });
}
const STAT_GROUP_SLUG = { 'Combate':'combate', 'Supervivencia':'supervivencia', 'Exploración':'exploracion' };
const STAT_GROUP_ICON = { 'Combate':'⚔\ufe0e', 'Supervivencia':'♥', 'Exploración':'◉' };
const STAT_EQ_FIELD = { ataque:'atk', critRate:'crit', critDmg:'critDmg', vida:'hp', mana:'mana', rapidez:'speed', robustez:'def' };
const STAT_EQ_SUFFIX = { critRate:'%', critDmg:'%', rapidez:'%' };
function statAllocList(){
  const box = document.getElementById('statAllocList');
  if(!box) return;
  const canSpend = state.statPoints>0 && !isHuntProgressLocked();
  const hasPending = pendingTotal()>0;
  const respecReady = canRespecPoints() && allocationTotal()>0 && !hasPending;
  let lastGroup = '';
  const rows = ALLOCATION_STATS.map(stat=>{
    const groupSlug = STAT_GROUP_SLUG[stat.group] || 'combate';
    const group = stat.group!==lastGroup ? `<div class="stat-category group-${groupSlug}"><span class="stat-category-icon">${STAT_GROUP_ICON[stat.group]||'✦'}</span>${stat.group}</div>` : '';
    lastGroup = stat.group;
    const saved = state.allocatedPoints[stat.key]||0;
    const pending = state.pendingPoints[stat.key]||0;
    const pips = renderStatPips(saved, pending);
    const investedPoints = saved + pending;
    const eqField = STAT_EQ_FIELD[stat.key];
    const eqValue = eqField ? (getEquipmentBonuses()[eqField]||0) : 0;
    const eqNote = eqValue>0 ? `<span class="val-bonus">+${eqValue}${STAT_EQ_SUFFIX[stat.key]||''} equipo</span>` : '';
    const valueText = String(stat.value());
    const isLongValue = valueText.length > 8;
    return `${group}<div class="stat-card group-${groupSlug} ${investedPoints>0?'invested':''} ${stat.critical?'critical':''}" data-stat-key="${stat.key}">
      <div class="stat-card-top">
        <span class="stat-card-icon" id="icon-${stat.key}">${stat.icon}</span>
        <div class="stat-card-heading">
          <span class="stat-card-name">${stat.label}</span>
          <span class="stat-card-desc">${stat.description}</span>
        </div>
        ${isLongValue ? '' : `<div class="stat-card-value"><b id="val-${stat.key}">${valueText}</b><small>Valor final</small>${eqNote}</div>`}
      </div>
      ${isLongValue ? `<div class="stat-card-value wide"><small>Valor final</small><b id="val-${stat.key}">${valueText}</b>${eqNote}</div>` : ''}
      <div class="stat-card-bottom"><div class="stat-pips">${pips}</div><div class="stat-stepper" id="stepper-${stat.key}"><button class="stat-control" data-remove-stat="${stat.key}" ${pending?'':'disabled'}>−</button><span class="stat-stepper-count" id="count-${stat.key}">${investedPoints}</span><button class="stat-control add" data-add-stat="${stat.key}" ${canSpend?'':'disabled'}>+</button></div></div>
    </div>`;
  }).join('');
  const availableResets = availableStatResets();
  const resetText = hasPending ? 'Guarda los cambios antes de restablecer.' : (respecReady ? `Listo para redistribuir tus puntos · ${availableResets} disponible${availableResets===1?'':'s'}.` : `Restablecimientos: ${availableResets} disponible${availableResets===1?'':'s'} · ganás 1 cada 5 niveles.`);
  box.innerHTML = `<div class="respec-panel"><small>${hasPending ? `${pendingTotal()} punto${pendingTotal()===1?'':'s'} sin guardar.<br>` : ''}${resetText}</small><div class="stat-controls"><button class="respec-btn" id="saveStatsBtn" ${hasPending?'':'disabled'}>▣ GUARDAR</button><button class="respec-btn" id="respecBtn" ${respecReady?'':'disabled'}>↻ RESTABLECER</button></div></div><div class="stat-board">${rows}</div>`;
  box.querySelectorAll('[data-add-stat]').forEach(button=>bindStatHoldControl(button, button.dataset.addStat, 1));
  box.querySelectorAll('[data-remove-stat]').forEach(button=>bindStatHoldControl(button, button.dataset.removeStat, -1));
  document.getElementById('saveStatsBtn').addEventListener('click', savePendingPoints);
  document.getElementById('respecBtn').addEventListener('click', resetAllocatedPoints);
}

const CLASS_BATTLE_STYLE = {
  warrior:{ icon:'⚔', label:'Guerrero', weapon:'Espada del Juramento', robe:'#172131', trim:'#c89b4c', hair:'#231b19', glow:'#d99a45', image:'assets/images/clase guerrero sprite v2.webp' },
  archer:{ icon:'🏹', label:'Arquero', weapon:'Arco de Hoja Lunar', robe:'#173f30', trim:'#c49a50', hair:'#241c18', glow:'#4ca46d', image:'assets/images/clase arquero sprite v2.webp' },
  mage:{ icon:'✦', label:'Mago', weapon:'Baston Astral', robe:'#172746', trim:'#c49a50', hair:'#17191f', glow:'#438fe8', image:'assets/images/clase mago sprite v2.webp' },
  priest:{ icon:'✚', label:'Sacerdote', weapon:'Cetro de Aurora', robe:'#d6c29a', trim:'#fff0a6', hair:'#72563f', glow:'#eccf7e', image:'assets/images/clase sacerdote sprite v2.webp' },
  assassin:{ icon:'🗡', label:'Asesino', weapon:'Dagas Gemelas', robe:'#613769', trim:'#ef9bff', hair:'#19141e', glow:'#b968c2', image:'assets/images/clase asesino sprite v2.webp' },
  tamer:{ icon:'🪢', label:'Domador', weapon:'Látigo de Vínculo', robe:'#287b6c', trim:'#7ce3bd', hair:'#3c2d20', glow:'#48d0ad', image:'assets/images/clase domador sprite v2.webp' }
};
/* ================= RENDERIZADO DE LA ARENA DE COMBATE ================= */
function battleClassStyle(){ return CLASS_BATTLE_STYLE[state.characterClass] || CLASS_BATTLE_STYLE.warrior; }
function playerArt(){
  const style = activeHeroVisual();
  return style.image ? `<img class="hero-art" src="${style.image}" alt="${style.label}" decoding="async">` : playerSVG();
}
function playerSVG(){
  const style = battleClassStyle();
  const weapons = {
    warrior:`<path d="M74 60 L94 25 L90 20 L68 57" fill="#e7edf6" stroke="#684625" stroke-width="2"/><path d="M68 55 L82 64" stroke="${style.trim}" stroke-width="5"/><circle cx="70" cy="59" r="4" fill="${style.trim}"/>`,
    archer:`<path d="M79 27 Q99 56 79 86" fill="none" stroke="#d6a75c" stroke-width="4"/><path d="M79 27 L79 86" stroke="#eee1b3" stroke-width="1.4"/><path d="M74 54 L96 43" stroke="#d7dce4" stroke-width="2"/><path d="M92 41 L98 42 L94 47" fill="#d7dce4"/>`,
    mage:`<path d="M79 82 L88 27" stroke="#61422d" stroke-width="5" stroke-linecap="round"/><circle cx="89" cy="22" r="8" fill="${style.glow}" stroke="#dcecff" stroke-width="2"/><circle cx="89" cy="22" r="3" fill="#fff"/>`,
    priest:`<path d="M80 84 L85 28" stroke="#9a7045" stroke-width="5" stroke-linecap="round"/><path d="M85 20 V35 M78 27 H92" stroke="${style.trim}" stroke-width="4" stroke-linecap="round"/><circle cx="85" cy="27" r="9" fill="none" stroke="#fff0aa" stroke-width="1"/>`,
    assassin:`<path d="M70 60 L94 34" stroke="#d9dce9" stroke-width="5" stroke-linecap="round"/><path d="M72 63 L64 73" stroke="${style.trim}" stroke-width="4"/><path d="M75 67 L96 57" stroke="#d9dce9" stroke-width="4" stroke-linecap="round"/>`
  };
  const hood = state.characterClass==='mage' || state.characterClass==='assassin'
    ? `<path d="M30 38 Q50 5 70 38 L66 52 L34 52Z" fill="${style.robe}" stroke="${style.trim}" stroke-width="1.4"/>` : '';
  return `<svg viewBox="0 0 100 120" aria-label="${style.label}">
    <defs><linearGradient id="heroRobe" x1="0" x2="1"><stop stop-color="${style.robe}"/><stop offset="1" stop-color="#171018"/></linearGradient></defs>
    <ellipse cx="51" cy="108" rx="31" ry="6" fill="rgba(0,0,0,.5)"/>
    <path d="M31 52 L22 94 L43 92 L50 100 L58 92 L79 94 L68 52 Q50 62 31 52" fill="#221714" opacity=".9"/>
    <path d="M34 48 L66 48 L75 93 L25 93Z" fill="url(#heroRobe)" stroke="${style.trim}" stroke-width="1.3"/>
    <path d="M40 92 L39 108 M60 92 L63 108" stroke="#2b211e" stroke-width="9" stroke-linecap="round"/>
    <circle cx="50" cy="34" r="16" fill="#f1d4b5" stroke="#6e4936" stroke-width="1.1"/>
    <path d="M35 32 Q40 13 58 18 Q67 21 67 34 Q59 25 50 28 Q41 26 35 37" fill="${style.hair}"/>
    <circle cx="44" cy="35" r="1.8" fill="#261a18"/><circle cx="56" cy="35" r="1.8" fill="#261a18"/>
    <path d="M45 43 Q50 46 55 43" fill="none" stroke="#a45c56" stroke-width="1.2"/>
    ${hood}
    <path d="M36 57 L23 69" stroke="#f1d4b5" stroke-width="8" stroke-linecap="round"/>
    <g id="playerArmGroup"><path d="M64 57 L76 62" stroke="#f1d4b5" stroke-width="8" stroke-linecap="round"/>${weapons[state.characterClass] || weapons.warrior}</g>
    <path d="M42 52 L58 52" stroke="${style.trim}" stroke-width="2"/>
  </svg>`;
}
function monsterSVG(monster){
  const form = MONSTER_FORMS[monster.tier] || MONSTER_FORMS.facil;
  const type = monster.visualType || form.type;
  const boss = !!(monster.visualBoss || monster.isBoss);
  const color = monster.color || (boss ? form.bossColor : form.color);
  const eye = type==='wolf' && boss ? '#ff3c3c' : type==='dragon' && boss ? '#4fb9ff' : '#fff6d5';
  const eyes = `<circle cx="42" cy="49" r="6" fill="#15120f"/><circle cx="61" cy="49" r="6" fill="#15120f"/><circle cx="43" cy="48" r="2" fill="${eye}"/><circle cx="62" cy="48" r="2" fill="${eye}"/>`;
  if(type==='wolf') return `<svg viewBox="0 0 110 105" aria-label="${form.name}">
    <ellipse cx="56" cy="69" rx="34" ry="20" fill="${color}" stroke="#24252b" stroke-width="2"/>
    <path d="M30 67 L16 53 L28 46 L39 56 M77 65 L96 51 L92 67" fill="${color}" stroke="#24252b" stroke-width="2"/>
    <path d="M32 53 L37 18 L53 43 L70 18 L80 54" fill="${color}" stroke="#24252b" stroke-width="2"/>
    <path d="M36 50 Q55 35 76 52 L70 72 Q55 81 40 71Z" fill="${color}" stroke="#24252b" stroke-width="2"/>
    ${eyes}<path d="M46 63 L54 67 L62 63" stroke="#17120f" stroke-width="2.5" fill="none"/><path d="M42 82 L40 96 M68 82 L71 96" stroke="#252126" stroke-width="7" stroke-linecap="round"/>
  </svg>`;
  if(type==='minotaur') return `<svg viewBox="0 0 110 110" aria-label="${form.name}">
    <path d="M30 35 Q15 12 30 10 Q40 12 43 26 M72 27 Q78 10 91 11 Q102 18 80 38" fill="none" stroke="#e8d1a1" stroke-width="7" stroke-linecap="round"/>
    <ellipse cx="55" cy="48" rx="28" ry="26" fill="${color}" stroke="#4c281e" stroke-width="2"/>
    <path d="M29 71 L18 95 M80 71 L93 95" stroke="${color}" stroke-width="15" stroke-linecap="round"/>
    <path d="M39 69 L35 103 M70 69 L75 103" stroke="#392319" stroke-width="15" stroke-linecap="round"/>
    ${eyes}<path d="M47 61 L55 66 L63 61" stroke="#24140f" stroke-width="3" fill="none"/><path d="M25 80 L12 63 M84 79 L100 61" stroke="#7b5a35" stroke-width="5"/>
  </svg>`;
  if(type==='dragon') return `<svg viewBox="0 0 115 108" aria-label="${form.name}">
    <path d="M50 65 L13 36 L22 74 L5 80 L45 87 M67 60 L103 27 L96 69 L111 78 L72 86" fill="${color}" opacity=".72" stroke="#27466d" stroke-width="2"/>
    <path d="M36 79 Q43 42 59 31 Q76 40 82 74 Q76 94 56 96 Q39 93 36 79Z" fill="${color}" stroke="#254b76" stroke-width="2"/>
    <path d="M47 37 L45 17 L57 31 L68 16 L70 40" fill="${color}" stroke="#254b76" stroke-width="2"/>
    ${eyes}<path d="M43 63 Q55 73 68 62" stroke="#1d3350" stroke-width="2.5" fill="none"/><path d="M42 87 L35 103 M70 87 L78 103" stroke="#254b76" stroke-width="7" stroke-linecap="round"/>
  </svg>`;
  return `<svg viewBox="0 0 100 100" aria-label="${form.name}">
    <ellipse cx="50" cy="63" rx="35" ry="27" fill="${color}" stroke="#376d35" stroke-width="2"/>
    <path d="M25 45 Q28 28 39 38 Q44 19 51 36 Q60 18 65 38 Q77 27 77 47" fill="${color}" stroke="#376d35" stroke-width="2"/>
    ${eyes}<path d="M36 72 Q50 82 66 71" stroke="#173018" stroke-width="2.5" fill="none"/>
    ${boss?'<path d="M38 31 L50 16 L62 31" fill="none" stroke="#ffd56c" stroke-width="4" stroke-linecap="round"/>':''}
  </svg>`;
}
function monsterArt(monster){
  const form = MONSTER_FORMS[monster.tier] || MONSTER_FORMS.facil;
  const image = monster.image || form.image;
  if(!image) return monsterSVG(monster);
  return `<img class="monster-art" src="${image}" alt="${escapeHtml(monster.name)}" decoding="async"><span class="boss-eyes" aria-hidden="true"></span>`;
}

function renderArena(fresh){
  const arena = document.getElementById('arena');
  const biome = biomeForDepth(runState ? runState.depth : 1);
  BIOMES.forEach(entry=>arena.classList.remove(`biome-${entry.key}`));
  arena.classList.add(`biome-${biome.key}`);
  if(!battle){
    arena.innerHTML = `<div class="arena-idle" id="arenaIdle">Elegí una dificultad y salí a cazar</div>`;
    return;
  }
  if(fresh){
    const style = battleClassStyle();
    const visual = activeHeroVisual();
    arena.innerHTML = `
      <div class="fighter player class-${state.characterClass}">
        <div class="name">${escapeHtml(state.name)}</div>
        <div class="class-tag"><span>${visual.icon}</span>${style.label}${visual.isSubclass?` · ${visual.label}`:''}</div>
        <div class="mini-bar"><div class="mini-bar-ghost" id="arenaPlayerHpGhost" style="width:100%"></div><div id="arenaPlayerHp" style="width:100%"></div></div>
        <div class="sprite-box">${playerArt()}<span class="weapon-label">${visual.weapon}</span>${state.companion ? `<span class="companion-tag">✦ ${escapeHtml(state.companion.name)}</span>` : ''}</div>
      </div>
      ${state.characterClass==='tamer' && state.companion ? `<div class="companion-fighter"><img src="${state.companion.image}" alt="${escapeHtml(state.companion.name)}" decoding="async"><b>${escapeHtml(state.companion.name)}</b><small>COMPAÑERO</small></div>` : ''}
      <div class="vs">VS</div>
      <div class="combat-turn-banner"><span>✦</span><b>TU TURNO</b><small>Elegí una carta</small></div>
      <div class="fighter monster monster-${battle.monster.visualType || 'slime'} ${battle.monster.isBoss?'boss':''} ${battle.monster.phaseTwo?'phase-two':''}">
        <div class="name">${escapeHtml(battle.monster.name)}</div>
        <div class="mini-bar"><div class="mini-bar-ghost" id="arenaMonsterHpGhost" style="width:100%"></div><div id="arenaMonsterHp" style="width:100%"></div></div>
        ${monsterAffinityMarkup(battle.monster)}
        <div class="monster-analysis ${battle.monster.analyzed?'revealed':'hidden'}" id="monsterAnalysis">${battle.monster.analyzed ? `🔎 ${battle.monster.hp}/${battle.monster.maxHp} vida` : `🔍 Análisis fallido · ${Math.round(battle.monster.analysisChance)}%`}</div>
        <div class="break-meter" id="breakMeter"><span>RUPTURA</span><div class="break-track"><div class="break-fill" id="breakFill"></div></div><span class="break-value" id="breakValue">0%</span></div>
        <div class="enemy-intent" id="enemyIntent"></div>
        <div class="sprite-box">${monsterArt(battle.monster)}</div>
      </div>
      <div class="ground"></div>`;
    if(battle.monster.isBoss){
      arena.classList.remove('boss-arrival'); void arena.offsetWidth; arena.classList.add('boss-arrival');
      setTimeout(()=>arena.classList.remove('boss-arrival'),800);
    }
  }
  renderArenaBars();
  renderMonsterIntent();
}
function renderArenaBars(){
  if(!battle) return;
  const php = document.getElementById('arenaPlayerHp');
  const mhp = document.getElementById('arenaMonsterHp');
  const phpGhost = document.getElementById('arenaPlayerHpGhost');
  const mhpGhost = document.getElementById('arenaMonsterHpGhost');
  const breakFill = document.getElementById('breakFill');
  const breakValue = document.getElementById('breakValue');
  const breakMeter = document.getElementById('breakMeter');
  const analysis = document.getElementById('monsterAnalysis');
  const playerPct = Math.max(0, Math.min(100, finiteNumber(battle.playerHp) / Math.max(1, finiteNumber(battle.playerMaxHp, 1)) * 100));
  const monsterPct = Math.max(0, Math.min(100, finiteNumber(battle.monster.hp) / Math.max(1, finiteNumber(battle.monster.maxHp, 1)) * 100));
  if(php) php.style.width = playerPct+'%';
  if(mhp) mhp.style.width = monsterPct+'%';
  // La barra "fantasma" comparte destino pero tiene una transición más lenta y con retraso,
  // así que se queda un instante atrás mostrando el golpe recién recibido.
  if(phpGhost) phpGhost.style.width = playerPct+'%';
  if(mhpGhost) mhpGhost.style.width = monsterPct+'%';
  const breakPct = Math.max(0, Math.min(100, Math.round(finiteNumber(battle.monster.breakMeter) / Math.max(1, finiteNumber(battle.monster.breakMax, 1)) * 100)));
  if(breakFill) breakFill.style.width = breakPct+'%';
  if(breakValue) breakValue.textContent = breakPct+'%';
  if(breakMeter) breakMeter.classList.toggle('is-broken', !!(battle.monster.status && battle.monster.status.stunnedTurns>0));
  if(analysis && battle.monster.analyzed) analysis.textContent = `🔎 ${safePositiveInt(battle.monster.hp, 1)}/${safePositiveInt(battle.monster.maxHp, 1)} vida`;
}

function syncBattleUi(){
  if(!battle) return;
  if(battle.isRun && runState){
    runState.hp = battle.playerHp;
    runState.mana = battle.playerMana;
    renderRunStatusBar();
  }
  renderArenaBars();
  if(battle && battle.isRun) scheduleRunCheckpoint();
  updateCombatTension();
  const box = document.getElementById('actionBtns');
  const labels = box ? box.querySelectorAll('.bar-label span:last-child') : [];
  const hpLabel = labels[0];
  const mpLabel = labels[1];
  const hpFill = box ? box.querySelector('.bar.hp div') : null;
  const mpFill = box ? box.querySelector('.bar.mp div') : null;
  if(hpLabel) hpLabel.textContent = `${battle.playerHp}/${battle.playerMaxHp}`;
  if(mpLabel) mpLabel.textContent = `${battle.playerMana}/${battle.playerMaxMana}`;
  if(hpFill) hpFill.style.width = `${Math.max(0, battle.playerHp / battle.playerMaxHp * 100)}%`;
  if(mpFill) mpFill.style.width = `${Math.max(0, battle.playerMana / battle.playerMaxMana * 100)}%`;
  const attack = document.getElementById('attackBtn');
  const skill = document.getElementById('skillBtn');
  const rawCost = Math.round(battle.playerMaxMana * currentClass().manaCost * (1-subclassBonus('manaDiscount')));
  const cost = visibleSkillCost(rawCost);
  if(attack) attack.disabled = battle.busy;
  if(skill) skill.disabled = battle.busy || battle.playerMana < cost;
  renderMonsterIntent();
  renderCombatStatus();
}

function updateCombatTension(){
  if(!battle || !battle.monster) return;
  const monster = battle.monster;
  const arena = document.getElementById('arena');
  const ratio = monster.maxHp ? monster.hp / monster.maxHp : 1;
  const lowHealth = monster.hp>0 && ratio<=.30;
  if(arena) arena.classList.toggle('last-stand', lowHealth);
  if(lowHealth && !monster.tensionTriggered){
    monster.tensionTriggered = true;
    if(!(monster.isBoss && monster.phaseTwo)) Sound.setScene('danger');
    showCombatWarning('⚠ ÚLTIMA RESISTENCIA','El enemigo pelea con todo lo que le queda', monster.isBoss);
    spawnFloatText('monster','¡FURIA FINAL!','crit');
  }

  const playerRatio = battle.playerMaxHp ? battle.playerHp / battle.playerMaxHp : 1;
  const playerCritical = battle.playerHp>0 && playerRatio<=.25;
  if(arena) arena.classList.toggle('player-danger', playerCritical);
  if(playerCritical && !battle.playerTensionTriggered){
    battle.playerTensionTriggered = true;
    Sound.setScene('danger');
    Sound.dangerPulse();
    showCombatWarning('☠ AL BORDE DE LA MUERTE','Un golpe más y podrías caer');
  } else if(!playerCritical && playerRatio>.4){
    battle.playerTensionTriggered = false;
  }
}

/**
 * Dibuja los botones de acción de combate dentro de #actionBtns: ataque
 * básico, habilidad de clase, habilidades de subclase, postura, domar,
 * huir/retirarse — cada uno habilitado/deshabilitado según maná, cooldown y
 * fase de la run. Se llama en cada `render()` mientras `battle` existe. Para
 * agregar un botón de acción nuevo, sumarlo acá Y su handler correspondiente
 * en combat-battle-turns.js o combat-battle-abilities.js.
 */
function renderActionButtons(){
  const box = document.getElementById('actionBtns');
  if(!box) return;
  // El mapa, la pantalla de recompensa y el cierre de la expedición no son
  // combates: ocultamos acciones antiguas para no dar la impresión de que se
  // puede atacar sin un enemigo delante.
  if(!runState || runState.phase==='ended'){
    box.innerHTML = `<div class="hunt-ready-panel"><b>✦ LA SENDA ESTÁ LISTA</b><small>Iniciá una expedición para elegir tu primer camino.</small><button id="beginRunBtn">COMENZAR EXPEDICIÓN</button></div>`;
    document.getElementById('beginRunBtn').addEventListener('click', ()=>startRun());
    return;
  }
  if(!battle){
    box.innerHTML = '';
    return;
  }
  if(battle.deckMode){
    renderDeckCombatActions(box);
    return;
  }
  if(battle){
    const rawCost = Math.round(battle.playerMaxMana*currentClass().manaCost*(1-subclassBonus('manaDiscount')));
    const cost = visibleSkillCost(rawCost);
    const moves = classMoveNames();
    const moveInfo = classMoveInfo();
    const attackPreview = combatDamageEstimate(false);
    const skillPreview = combatDamageEstimate(true);
    const signature = classAbility();
    const signatureCost = classAbilityCost();
    const signatureReady = !battle.busy && battle.playerStatus.classCooldown===0 && battle.playerMana>=signatureCost && !(state.characterClass==='tamer' && !state.companion);
    const signatureSub = state.characterClass==='tamer' && !state.companion ? 'Requiere un compañero domado' : battle.playerStatus.classCooldown>0 ? `Recarga: ${battle.playerStatus.classCooldown}` : `${signatureCost} maná`;
    const subclassAbilities = subclassAbilityDefinitions();
    const subclassButtons = subclassAbilities.map(ability=>{
      const rawAbilityCost = subclassAbilityCost(ability);
      const abilityCost = visibleSkillCost(rawAbilityCost);
      const cooldown = battle.playerStatus.cooldowns[ability.key]||0;
      const blocked = ability.requiresCompanion && !state.companion;
      const ready = !battle.busy && cooldown===0 && battle.playerMana>=abilityCost && !blocked;
      const detail = blocked ? 'Requiere compañero domado' : cooldown>0 ? `Recarga: ${cooldown}` : abilityCost===0 ? 'GRATIS ✧' : `${abilityCost} maná`;
      return `<button class="ability-btn subclass-ability-btn combat-card card-subclass ${ready?'ready':''}" data-subclass-ability="${ability.key}" ${ready?'':'disabled'} title="${ability.hint}"><span class="card-corner">✧</span><strong>${ability.icon} ${ability.label}</strong><small>${ability.hint} · ${detail}</small><em>SUBCLASE</em></button>`;
    }).join('');
    const momentum = combatMomentum();
    const tactical = monsterTacticalReadout();
    const affinity = monsterAffinity(battle.monster);
    const breakCurrent = Math.max(0,Math.round(finiteNumber(battle.monster.breakMeter)));
    const breakMax = Math.max(1,Math.round(finiteNumber(battle.monster.breakMax,1)));
    const breakRemaining = Math.max(0,breakMax-breakCurrent);
    const canTame = state.characterClass==='tamer' && battle.isRun && !battle.monster.isBoss && battle.monster.hp<=battle.monster.maxHp*.5 && !battle.busy;
    const tameHint = state.characterClass==='tamer' ? (!battle.isRun ? 'Solo durante una expedición' : battle.monster.isBoss ? 'Los jefes no pueden domarse' : battle.monster.hp>battle.monster.maxHp*.5 ? 'Debilitá al enemigo al 50%' : `Domar (${Math.round(tamingChance())}% chance)`) : '';
    box.innerHTML = `
      <section class="combat-intel intent-${tactical.key}">
        <div class="combat-intel-title"><span>◈ INFORME TÁCTICO</span><b>${tactical.icon} ${tactical.label}</b></div>
        <div class="combat-intel-grid">
          <article><small>DAÑO PREVISTO</small><strong>${tactical.damageText}</strong><em>Ya considera tu postura y defensa</em></article>
          <article><small>RUPTURA</small><strong>${breakCurrent} / ${breakMax}</strong><em>Faltan ${breakRemaining} puntos para aturdir</em></article>
          <article><small>RASGO ENEMIGO</small><strong>${affinity ? `${affinity.icon} ${affinity.label}` : `${battle.monster.archetype.icon} ${battle.monster.archetype.label}`}</strong><em>${affinity ? affinity.hint : battle.monster.archetype.hint}</em></article>
        </div>
        ${tactical.effects.length ? `<div class="combat-intel-effects">${tactical.effects.map(effect=>`<span>⚠ ${escapeHtml(effect)}</span>`).join('')}</div>` : ''}
        <div class="combat-intel-advice"><b>JUGADA RECOMENDADA</b><span>${escapeHtml(tactical.response)}</span></div>
      </section>
      <section class="combat-card-hand" aria-label="Cartas de combate">
        <div class="combat-card-hand-head"><span>✦ TU MANO</span><b>Elegí una carta para actuar</b><small>Maná ${battle.playerMana}/${battle.playerMaxMana}</small></div>
        <div class="combat-card-row">
          <button id="attackBtn" class="combat-card card-attack" title="${moveInfo.attack}"><span class="card-corner">01</span><strong>${moves.attack}</strong><small>${moveInfo.attack} · Daño ${attackPreview.min}–${attackPreview.max}${critChance()>0 ? ` · crítico ${attackPreview.critMin}–${attackPreview.critMax}` : ''}</small><em>ATAQUE</em></button>
          <button id="skillBtn" class="combat-card card-skill" ${battle.playerMana<cost?'disabled':''}><span class="card-corner">02</span>${moves.skill} (${cost===0?'GRATIS ✧':cost+' maná'})</button>
          <button id="classAbilityBtn" class="ability-btn combat-card card-signature ${signatureReady?'ready':''}" ${signatureReady?'':'disabled'}><span class="card-corner">✦</span><strong>${signature.icon} ${signature.label}</strong><small>Habilidad única · ${signatureSub}</small><em>FIRMA</em></button>
          ${subclassButtons}
        </div>
      </section>
      <div class="combat-momentum ${momentum>=100?'ready':''}">
        <div class="combat-momentum-head"><strong>✦ ÍMPETU TÁCTICO</strong><span>${Math.round(momentum)} / 100</span></div>
        <div class="combat-momentum-track"><i style="width:${momentum}%"></i></div>
        <small>${momentum>=100?'REMATE LISTO · próximo ataque +50% de daño':'Alterná ataque, habilidad y técnica de clase para cargarlo más rápido'}</small>
      </div>
      <div class="stance-row">
        ${Object.entries(COMBAT_STANCES).map(([key,stance])=>`<button class="stance-btn ${battle.playerStatus.stance===key?'active':''}" data-stance="${key}" ${battle.busy?'disabled':''} title="${stance.hint}"><span>${stance.icon}</span>${stance.label}<small>${key==='offensive'?'+25% daño':key==='defensive'?'-30% recibido':'Sin cambios'}</small></button>`).join('')}
      </div>
      ${state.characterClass==='tamer' ? `<button id="tameBtn" class="ability-btn ${canTame?'ready':''}" ${canTame?'':'disabled'}>🪢 ${tameHint}</button>` : ''}
      ${state.companion ? `<div class="status-badge shield" style="grid-column:1/-1;justify-self:start;">✦ Compañero: ${state.companion.name}</div>` : ''}
      <div class="combat-vitals">
        <div class="bar-label"><span>Tu vida</span><span>${battle.playerHp}/${battle.playerMaxHp}</span></div>
        <div class="bar hp"><div style="width:${(battle.playerHp/battle.playerMaxHp)*100}%"></div></div>
        <div class="bar-label"><span>Tu maná</span><span>${battle.playerMana}/${battle.playerMaxMana}</span></div>
        <div class="bar mp"><div style="width:${(battle.playerMana/battle.playerMaxMana)*100}%"></div></div>
      </div>
    `;
    const attackButton = document.getElementById('attackBtn');
    const skillButton = document.getElementById('skillBtn');
    const classButton = document.getElementById('classAbilityBtn');
    attackButton.title = moveInfo.attack;
    attackButton.innerHTML = `<strong>${moves.attack}</strong><small>${moveInfo.attack} · Daño ${attackPreview.min}–${attackPreview.max}${critChance()>0 ? ` · crítico ${attackPreview.critMin}–${attackPreview.critMax}` : ''}</small>`;
    skillButton.title = moveInfo.skill;
    skillButton.innerHTML = `<strong>${moves.skill}</strong><small>${moveInfo.skill} · Daño ${skillPreview.min}–${skillPreview.max} · ${cost===0?'GRATIS ✧':cost+' maná'}</small>`;
    classButton.title = signature.hint;
    classButton.innerHTML = `<strong>${signature.icon} ${signature.label}</strong><small>Habilidad única · ${signature.hint} · ${signatureSub}</small>`;
    document.getElementById('attackBtn').addEventListener('click', ()=>playerAttack(false));
    document.getElementById('skillBtn').addEventListener('click', ()=>playerAttack(true));
    document.getElementById('classAbilityBtn').addEventListener('click', useClassAbility);
    box.querySelectorAll('[data-subclass-ability]').forEach(button=>button.addEventListener('click',()=>useSubclassAbility(button.dataset.subclassAbility)));
    box.querySelectorAll('[data-stance]').forEach(button=>button.addEventListener('click',()=>setCombatStance(button.dataset.stance)));
    if(document.getElementById('tameBtn')) document.getElementById('tameBtn').addEventListener('click', tryTameMonster);
    renderAbilityButtons(box);
    renderCombatStatus();
  } else {
    box.innerHTML = `
      <button id="findBtn">Buscar monstruo</button>
      <button id="trainBtn">Entrenar (seguro, +exp)</button>
    `;
    document.getElementById('findBtn').addEventListener('click', startBattle);
    document.getElementById('trainBtn').addEventListener('click', doTrain);
  }
}
