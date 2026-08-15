/* ================= COMBAT-BATTLE-MONSTERS.JS =================
   Generación y lectura de monstruos de combate 1v1: arquetipos y afinidades
   de élite, intención del monstruo (qué va a hacer este turno), lectura
   táctica en pantalla y fábrica de monstruos (makeMonster). Primera parte de
   lo que antes era combat-battle.js. Depende de: classes.js, combat-loot.js.
   Debe cargarse antes de combat-battle-core.js.
   ================================================================= */

/* ================= ARQUETIPOS Y AFINIDADES ================= */

/* ================= BATTLE ================= */
const MONSTER_ARCHETYPES = [
  { key:'swift', label:'Veloz', hint:'Ataca dos veces', icon:'⚡' },
  { key:'guardian', label:'Guardia', hint:'Reduce el daño recibido', icon:'🛡' },
  { key:'charger', label:'Bruto', hint:'Carga un golpe devastador', icon:'💥' },
  { key:'venom', label:'Tóxico', hint:'Sus golpes pueden envenenar', icon:'☣' }
];
const ELITE_AFFINITIES = [
  { key:'armored', label:'Blindado', icon:'🛡', color:'#a7c7df', hint:'Recibe 35% menos daño mientras su coraza siga intacta.', counter:'Contra: llená la barra de Ruptura.' },
  { key:'furious', label:'Furioso', icon:'🔥', color:'#f08a63', hint:'Al 50% de vida entra en furia y golpea más fuerte.', counter:'Contra: postura Defensiva o Ruptura.' },
  { key:'venomous', label:'Venenoso', icon:'☣', color:'#a5d478', hint:'Sus golpes sin bloquear aplican Veneno.', counter:'Contra: esquivá o bloqueá con escudo.' },
  { key:'unstable', label:'Inestable', icon:'✦', color:'#c59af2', hint:'Las habilidades contra este élite infligen 35% más daño.', counter:'Contra: usá tu habilidad general.' }
];
function eliteAffinityForKey(key){ return ELITE_AFFINITIES.find(entry=>entry.key===key) || null; }
function monsterAffinity(monster){
  if(!monster || !monster.affinity) return null;
  const stored = typeof monster.affinity==='string' ? { key:monster.affinity } : monster.affinity;
  const base = eliteAffinityForKey(stored.key);
  return base ? { ...base, ...stored } : null;
}
function affinityDamageMultiplier(monster, isSkill=false){
  const affinity = monsterAffinity(monster);
  if(!affinity) return 1;
  if(affinity.key==='armored' && !monster.affinityBroken) return .65;
  if(affinity.key==='unstable' && isSkill) return 1.35;
  return 1;
}
function monsterAffinityMarkup(monster){
  const affinity = monsterAffinity(monster);
  if(!affinity) return '';
  const broken = affinity.key==='armored' && monster.affinityBroken;
  const title = broken ? 'Coraza rota: ahora recibe daño completo.' : affinity.hint;
  const counter = broken ? 'Coraza rota · daño completo' : affinity.counter;
  return `<div class="elite-affinity ${affinity.key}${broken?' broken':''}" style="--affinity-color:${affinity.color}" title="${escapeHtml(title)}"><b>${affinity.icon} ${affinity.label}</b><small>${escapeHtml(counter)}</small></div>`;
}
function getMonsterIntent(monster){
  if(!monster) return { key:'normal', icon:'⚔', label:'ATAQUE', hint:'Golpe directo' };
  if(monster.status && monster.status.stunnedTurns>0) return { key:'break', icon:'✦', label:'ATURDIDO', hint:'Perderá su próximo turno' };
  if(monster.charging) return { key:'charge', icon:'💥', label:'GOLPE DEVASTADOR', hint:'Se prepara para impactar' };
  if(monster.affinityFury) return { key:'fury', icon:'🔥', label:'FURIA DESATADA', hint:'La postura defensiva reduce este golpe' };
  if(monster.isBoss && monster.phaseTwo) return { key:'boss', icon:'☠', label:'ATAQUE DE FASE II', hint:'Poder del guardián desatado' };
  if(monsterAffinity(monster)?.key==='venomous') return { key:'venom', icon:'☣', label:'TOXINA ACTIVA', hint:'Esquivá o bloqueá para evitar veneno' };
  const key = monster.archetype && monster.archetype.key;
  if(key==='swift') return { key:'swift', icon:'⚡', label:'DOBLE GARRA', hint:'Atacará dos veces' };
  if(key==='venom') return { key:'venom', icon:'☣', label:'MORDEDURA TÓXICA', hint:'Puede aplicar veneno' };
  if(key==='guardian') return { key:'guard', icon:'🛡', label:'GOLPE PROTEGIDO', hint:'Resiste parte del daño' };
  if(key==='charger') return { key:'charge', icon:'💥', label:'PREPARA CARGA', hint:'Su próximo turno será feroz' };
  return { key:'normal', icon:'⚔', label:'ATAQUE DIRECTO', hint:'Un golpe normal' };
}
function renderMonsterIntent(){
  const box = document.getElementById('enemyIntent');
  if(!box || !battle) return;
  const intent = monsterTacticalReadout();
  box.className = `enemy-intent intent-${intent.key}`;
  const category=intent.hits?'ATAQUE':intent.key==='break'?'INCAPACITADO':'PREPARACIÓN';
  box.innerHTML = `<div><small>EN SU PRÓXIMO TURNO</small><span>${category}</span></div><b>${intent.icon} ${intent.label}</b><strong>${intent.damageText}</strong><em>${intent.hint}</em>`;
  box.title = intent.hint;
}
function monsterTacticalReadout(){
  if(!battle || !battle.monster) return { ...getMonsterIntent(null), damageText:'—', hits:0, effects:[], response:'Esperá al próximo enemigo.' };
  const monster = battle.monster;
  const intent = getMonsterIntent(monster);
  const stunned = monster.status && monster.status.stunnedTurns>0;
  const preparingCharge = monster.archetype?.key==='charger' && !monster.charging;
  const hits = stunned || preparingCharge ? 0 : (monster.archetype?.key==='swift' ? 2 : 1);
  let mult = monster.affinityFury ? 1.40 : (monster.fury ? 1.45 : 1);
  if(monster.affinityFury && battle.playerStatus?.stance==='defensive') mult *= .70;
  if(monster.charging) mult *= 1.85;
  const mitigation = combatStance().taken * (1-damageReduction());
  const minHit = hits ? Math.max(1,Math.round(monster.dmg*.85*mult*mitigation)) : 0;
  const maxHit = hits ? Math.max(minHit,Math.round(monster.dmg*1.15*mult*mitigation)) : 0;
  const shieldedHits = Math.min(hits,Math.max(0,Math.round(finiteNumber(battle.playerStatus?.shieldTurns))));
  const totalMin = minHit*(hits-shieldedHits) + Math.max(1,Math.round(minHit*.48))*shieldedHits;
  const totalMax = maxHit*(hits-shieldedHits) + Math.max(1,Math.round(maxHit*.48))*shieldedHits;
  const effects = [];
  const affinity = monsterAffinity(monster);
  if(monster.archetype?.key==='venom' || affinity?.key==='venomous') effects.push('Puede aplicar Veneno durante 2 turnos');
  if(monster.archetype?.key==='guardian') effects.push('Recibe 28% menos daño directo');
  if(monster.charging) effects.push('Golpe cargado: daño x1.85');
  if(monster.fury || monster.affinityFury) effects.push('Furia activa: daño aumentado');
  if(monster.isBoss && monster.phaseTwo) effects.push('Fase II: alterna ataques especiales');
  if(stunned) effects.push('Pierde este turno');
  let response = 'Equilibrada es una opción segura.';
  if(stunned) response = 'Aprovechá: atacá en Ofensiva sin recibir respuesta.';
  else if(preparingCharge) response = 'Tenés un turno: llená Ruptura o cambiá a Defensiva.';
  else if(monster.charging || monster.affinityFury) response = 'Usá Defensiva para reducir el impacto fuerte.';
  else if(monster.archetype?.key==='swift') response = 'Escudo y Defensiva rinden más contra sus 2 impactos.';
  else if(monster.archetype?.key==='venom' || affinity?.key==='venomous') response = 'Bloquear el golpe evita que aplique Veneno.';
  else if(affinity?.key==='armored' && !monster.affinityBroken) response = 'Priorizá críticos y habilidades para romper su coraza.';
  else if(affinity?.key==='unstable') response = 'Tus habilidades causan +35% de daño contra este élite.';
  const damageText = hits ? `${hits>1?hits+' golpes · ':''}${totalMin}–${totalMax} daño${shieldedHits?' · escudo':''}` : (stunned ? 'SIN ATAQUE' : 'CARGANDO · SIN DAÑO');
  return { ...intent, hits, minHit, maxHit, totalMin, totalMax, damageText, effects, response };
}
function makeMonster(tier, biomeKey=''){
  const safeTier = TIERS[tier] ? tier : 'facil';
  // Valores propios por rango: nunca leen nivel, poder, equipo ni daño del héroe.
  const bases = {
    facil:{ hp:48, dmg:6 }, normal:{ hp:88, dmg:9 },
    dificil:{ hp:155, dmg:14 }, elite:{ hp:270, dmg:20 }
  };
  const base = bases[safeTier];
  const hp = safePositiveInt(base.hp*(.94+Math.random()*.12),base.hp);
  const dmg = safePositiveInt(base.dmg*(.95+Math.random()*.10),base.dmg);
  const form = monsterFormForTier(safeTier,true,biomeKey);
  return { name:form.name, hp, maxHp:hp, dmg, tier:safeTier, isBoss:false, visualType:form.type, color:form.color, image:form.image, visualBoss:false };
}
