/* ================= COMBAT-BATTLE-VFX.JS =================
   Efectos visuales y de feedback del combate: texto flotante, mensajes de
   feedback, flash de arena, avisos, finisher, chispas, sprites/efectos de
   ataque por clase, esquivas, nombres/info de golpes por clase, postura de
   combate y estimación de daño. Tercera parte de lo que antes era
   combat-battle.js. Depende de: classes.js, combat-battle-core.js.
   ================================================================= */

/* ================= FEEDBACK Y EFECTOS VISUALES ================= */
function clearCombatVisuals(){
  const arena = document.getElementById('arena');
  if(!arena) return;
  arena.querySelectorAll('.dmg-float,.damage-total-banner,.combat-warning,.combat-finisher,.spark,.assassin-fx,.node-choice-spark,.class-attack-vfx,.combat-vfx').forEach(el=>el.remove());
  arena.classList.remove('assassin-strike','assassin-skill','boss-phase-two','reward-flash','skill-flash');
  arena.querySelectorAll('.fighter').forEach(fighter=>fighter.classList.remove('dodging','phase-two'));
}

const COMBAT_NUMBER_SUFFIXES=['','K','M','B','T','Qa','Qi'];
function formatCombatNumber(value){
  const amount=Math.max(0,Math.round(Math.abs(Number(value)||0)));
  if(amount<1000) return String(amount);
  const tier=Math.min(COMBAT_NUMBER_SUFFIXES.length-1,Math.floor(Math.log10(amount)/3));
  const scaled=amount/Math.pow(1000,tier);
  const digits=scaled>=100?0:scaled>=10?1:2;
  const compact=digits?scaled.toFixed(digits).replace(/\.?0+$/,''):scaled.toFixed(0);
  return `${compact}${COMBAT_NUMBER_SUFFIXES[tier]}`;
}
function spawnFloatText(side, text, cls, stackIndex=0, meta={}){
  const arena = document.getElementById('arena');
  if(!arena) return;
  const el = document.createElement('div');
  const classId=meta.classId||((side==='monster'&&typeof state!=='undefined')?state.characterClass:'');
  const value=Number(meta.value);
  el.className = `dmg-float ${cls||''} ${classId?`damage-${classId}`:''} ${meta.isSkill?'is-skill':''}`;
  if(Number.isFinite(value)){
    const sign=meta.sign||(side==='player'?'+':'−');
    el.textContent=`${meta.isCrit?'CRIT ':''}${sign}${formatCombatNumber(value)}`;
    el.title=`${Math.round(Math.abs(value)).toLocaleString('es-AR')} de ${side==='player'?'curación':'daño'}`;
    el.setAttribute('aria-label',el.title);
  }else{
    const original=String(text);
    const compacted=original.replace(/\d{4,}/g,number=>formatCombatNumber(Number(number)));
    el.textContent=compacted;
    if(compacted!==original) el.title=original;
  }
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

function showActionDamageTotal(value,{classId=state.characterClass,isSkill=false,hits=1}={}){
  const arena=document.getElementById('arena');
  if(!arena||!value||(hits<2&&!isSkill)) return;
  arena.querySelectorAll('.damage-total-banner').forEach(element=>element.remove());
  const labels={warrior:'IMPACTO TOTAL',archer:`RÁFAGA ×${hits}`,mage:'DESCARGA ARCANA'};
  const el=document.createElement('div');
  el.className=`damage-total-banner damage-${classId}`;
  el.innerHTML=`<small>${labels[classId]||'DAÑO TOTAL'}</small><strong>${formatCombatNumber(value)}</strong>`;
  el.title=`${Math.round(value).toLocaleString('es-AR')} de daño total`;
  arena.appendChild(el);
  setTimeout(()=>el.remove(),1250);
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

// Metadata de presentación para cada campo de heroPowerSnapshot() (script-math.js):
// ícono, nombre visible y si se muestra como porcentaje.
const STAT_DELTA_META = {
  power:   { icon:'⚡',      label:'Poder',          pct:false },
  atk:     { icon:'⚔\ufe0e', label:'Ataque',         pct:false },
  hp:      { icon:'♥',      label:'Vida máxima',    pct:false },
  mana:    { icon:'✦',      label:'Maná máximo',    pct:false },
  def:     { icon:'⬡',      label:'Defensa',        pct:false },
  crit:    { icon:'✹',      label:'Prob. crítica',  pct:true  },
  critDmg: { icon:'◎',      label:'Daño crítico',   pct:true  },
  dodge:   { icon:'↝',      label:'Evasión',        pct:true  },
  extraTurn:{ icon:'⌁',     label:'Rapidez',        pct:true  }
};
// Indicador de "qué mejoró": compara dos heroPowerSnapshot() (antes/después
// de equipar algo o de asignar puntos) y muestra solo los campos que
// cambiaron, con su valor anterior, el nuevo y la diferencia. Si nada
// cambió (ej. desequipar un accesorio sin bonificaciones), no muestra nada.
function showStatDelta(before, after, title){
  if(!before || !after) return;
  const rows = Object.keys(STAT_DELTA_META).map(key=>{
    const meta = STAT_DELTA_META[key];
    const b = before[key], a = after[key];
    const diff = Math.round((a-b)*10)/10;
    if(!diff) return null;
    const unit = meta.pct ? '%' : '';
    const sign = diff>0 ? '+' : '';
    return `<div class="stat-delta-row ${diff>0?'up':'down'}">
      <span class="sd-icon">${meta.icon}</span>
      <div class="sd-main">
        <div class="sd-top"><span class="sd-label">${meta.label}</span><span class="sd-diff">${sign}${diff}${unit}</span></div>
        <div class="sd-vals">${b}${unit} → ${a}${unit}</div>
      </div>
    </div>`;
  }).filter(Boolean);
  if(!rows.length) return;
  document.querySelectorAll('.stat-delta-toast').forEach(el=>el.remove());
  const el = document.createElement('div');
  el.className = 'stat-delta-toast';
  el.innerHTML = `<div class="sd-title">${title}</div>${rows.join('')}`;
  document.body.appendChild(el);
  requestAnimationFrame(()=>el.classList.add('show'));
  setTimeout(()=>{ el.classList.remove('show'); setTimeout(()=>el.remove(),300); }, 3200);
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
  if(document.body.classList.contains('performance-mode')) return;
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
  if(document.body.classList.contains('performance-mode')) return;
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
  if(document.body.classList.contains('performance-mode')) return;
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
  archer:{ attack:'Doble Flecha', skill:'Lluvia Lunar' },
  mage:{ attack:'Canalización Arcana', skill:'Nova Astral' },
  priest:{ attack:'Golpe Sagrado', skill:'Luz de Aurora' },
  assassin:{ attack:'Danza de Dagas', skill:'Corte Umbrio' },
  tamer:{ attack:'Latigazo Salvaje', skill:'Llamado de la Manada' }
};
function classMoveNames(){ return CLASS_MOVE_NAMES[state.characterClass] || CLASS_MOVE_NAMES.warrior; }
const CLASS_MOVE_INFO = {
  warrior:{ attack:'Golpe firme · recupera 4 maná', skill:'Obtiene escudo y contraataque · 40% de aturdir' },
  archer:{ attack:'2 impactos ligeros · recupera 4 maná', skill:'3 flechas y sangrado durante 2 turnos' },
  mage:{ attack:'Recupera 8 maná y acumula una carga', skill:'Consume cargas para potenciar la explosión' },
  priest:{ attack:'Golpe sagrado · cura 4.5% de vida', skill:'Luz concentrada · 28% de aturdir' },
  assassin:{ attack:'Corte ágil · recupera 3 maná', skill:'Corte umbrío · 28% de aturdir' },
  tamer:{ attack:'Látigo preciso · recupera 3 maná', skill:'Llamado de manada · 28% de aturdir' }
};
function classMoveInfo(){ return CLASS_MOVE_INFO[state.characterClass] || CLASS_MOVE_INFO.warrior; }
const CLASS_COMBAT_PROFILES = {
  warrior:{
    attack:{hits:1,damage:1.05,mana:4},
    skill:{hits:1,damage:2.02,stunChance:.40,guard:true}
  },
  archer:{
    attack:{hits:2,damage:.60,mana:4},
    skill:{hits:3,damage:.76,bleedTurns:2}
  },
  mage:{
    attack:{hits:1,damage:.92,mana:8,grantArcaneAfter:1},
    skill:{hits:1,damage:2.65,arcanePerCharge:.38,stunChance:.18}
  }
};
function classCombatAction(isSkill){
  const profile = CLASS_COMBAT_PROFILES[state.characterClass];
  if(profile) return {...(isSkill ? profile.skill : profile.attack)};
  return {hits:1,damage:isSkill ? 2.3*(currentClass().skillMult+subclassBonus('skillMult')) : 1,mana:isSkill?0:3,stunChance:isSkill ? .28 : 0,legacy:true};
}
function combatDamageEstimate(isSkill=false){
  if(!battle) return { min:0, max:0, critMin:0, critMax:0 };
  const action = classCombatAction(isSkill);
  const charges = isSkill && state.characterClass==='mage' ? battle.playerStatus.arcaneCharges : 0;
  let multiplier = combatStance().attack * action.damage * (1+(action.arcanePerCharge||0)*charges);
  if(isSkill) multiplier *= (action.legacy?1:1+subclassBonus('skillMult')) * (1+runRelicValue('skillPower'));
  if(battle.playerStatus.markedTurns>0) multiplier *= 1.30;
  if(battle.playerStatus.arcaneCharges>0 && !(isSkill&&state.characterClass==='mage')) multiplier *= 1.35;
  if(battle.monster.status.breakVulnerableTurns>0) multiplier *= 1.25;
  if(battle.monster.archetype && battle.monster.archetype.key==='guardian') multiplier *= .72;
  if(combatMomentum()>=100) multiplier *= 1.5;
  multiplier *= affinityDamageMultiplier(battle.monster,isSkill);
  const hits = Math.max(1,action.hits||1);
  const min = Math.max(1,Math.round(atkDamage()*multiplier*.85))*hits;
  const max = Math.max(min,Math.round(atkDamage()*multiplier*1.15)*hits);
  return { min, max, critMin:Math.round(min*critMultiplier()), critMax:Math.round(max*critMultiplier()), hits };
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
  if(document.body.classList.contains('performance-mode')) return;
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
