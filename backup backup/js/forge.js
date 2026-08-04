/* =========================================================================
   FORGE.JS — Sistema de forja de piezas exclusivas y runas de mejora
   Depende de: classes.js (SHOP_EQUIPMENT_ITEMS, ITEM_RARITIES, scaleEquipmentBonuses, state)
   Debe cargarse DESPUÉS de classes.js.
   ========================================================================= */

function forgeExclusiveArmory(){
  return CLASS_EQUIPMENT_ITEMS.filter(item=>item.rarityKey==='unique').map(item=>{
    const tier = ITEM_RARITIES.ancestral;
    return {
      ...item,
      ...scaleEquipmentBonuses(item,'ancestral'),
      id:`${item.id}_forjado`,
      name:`${item.name} Ancestral`,
      rarity:tier.label,
      rarityKey:'ancestral',
      chance:0,
      price:0,
      color:tier.color,
      glow:tier.glow,
      setId:`ancestral-${item.classOnly}`,
      setLabel:`Legado Ancestral de ${CLASSES[item.classOnly]?.label || item.classOnly}`,
      image:ANCESTRAL_FORGE_ART[item.classOnly] || item.image,
      equipmentTier:'forge',
      forgeExclusive:true
    };
  });
}
const FORGE_EXCLUSIVE_ITEMS = forgeExclusiveArmory();
Object.keys(CLASSES).forEach(classOnly=>{
  EQUIPMENT_SET_DEFS[`ancestral-${classOnly}`] = {
    label:`Legado Ancestral de ${CLASSES[classOnly].label}`,
    affinity:'Forja eterna · poder de late game',
    bonuses:[
      {pieces:2, bonuses:{atk:10,def:7}, label:'+10 Ataque · +7 Defensa'},
      {pieces:4, bonuses:{hp:40,mana:30}, label:'+40 Vida · +30 Maná'},
      {pieces:7, bonuses:{atk:22,def:13,crit:12,critDmg:42}, label:'+22 Ataque · +13 Defensa · +12% Crítico · +42% D.C.'}
    ]
  };
});

/* ================= HERRERÍA ================= */
const FORGE_SALVAGE_ESSENCE = { common:2, uncommon:4, rare:7, epic:11, legendary:18, mythic:28, unique:45, ancestral:70 };
let forgeRitual = null;
let forgeNeedleFrame = null;
let forgeAutoMissTimer = null;
const FORGE_HIT_COUNT = 4;
const FORGE_ZONE_COUNT = 7;

function clearForgeTimers(){
  if(forgeNeedleFrame){ cancelAnimationFrame(forgeNeedleFrame); forgeNeedleFrame=null; }
  if(forgeAutoMissTimer){ clearTimeout(forgeAutoMissTimer); forgeAutoMissTimer=null; }
}

function nextForgeZone(previous=-1){
  const choices=Array.from({length:FORGE_ZONE_COUNT},(_,index)=>index).filter(index=>index!==previous);
  return choices[Math.floor(Math.random()*choices.length)];
}

function forgeRoundDuration(round){
  return Math.max(1050, 1850-round*180);
}

function prepareForgeRound(){
  if(!forgeRitual || forgeRitual.hits.length>=FORGE_HIT_COUNT) return;
  forgeRitual.activeZone=nextForgeZone(forgeRitual.activeZone);
  forgeRitual.roundStartedAt=performance.now();
  forgeRitual.roundDuration=forgeRoundDuration(forgeRitual.hits.length);
}
function forgeBlueprints(){
  return FORGE_EXCLUSIVE_ITEMS.filter(item=>item.classOnly===state.characterClass);
}
function forgeCost(item){
  // La forja ancestral es el objetivo de largo plazo: el coste es igual para cada pieza.
  // Subido para que llegar a la pieza ancestral cueste una campaña larga de Cacería
  // y pesca, no un par de expediciones cortas.
  return { essence:700, bossCore:60, scale:60, gold:45000 };
}
const ENHANCE_MAX = 13;
const ENHANCE_BREAK_START = 8;
function enhancementCost(item){
  const next=(item.enhanceLevel||0)+1;
  return { essence:4+next*6, bossCore:next>=4?Math.ceil((next-3)/2):0, scale:next>=3?(next-2)*2:0, gold:90+next*95 };
}
function enhanceBreakChance(next){
  if(next<ENHANCE_BREAK_START) return 0;
  return Math.min(0.35, 0.06 + (next-ENHANCE_BREAK_START)*0.045);
}
function enhancementLabel(item){ return item.enhanceLevel ? ` +${item.enhanceLevel}` : ''; }
function enhanceEquipment(index){
  if(isForgeLocked()) return;
  const item=state.ownedEquipment[index];
  if(!item || (item.enhanceLevel||0)>=ENHANCE_MAX) return;
  const cost=enhancementCost(item), mats=state.materials;
  if((mats.essence||0)<cost.essence || (mats.bossCore||0)<cost.bossCore || (mats.scale||0)<cost.scale || state.gold<cost.gold){
    showFeedback('FALTAN MATERIALES',`Necesitás ${cost.essence} esencia · ${cost.bossCore} núcleos${cost.scale?` · ${cost.scale} escamas`:''} · ${cost.gold} oro.`,'danger'); return;
  }
  mats.essence-=cost.essence; mats.bossCore-=cost.bossCore; mats.scale=(mats.scale||0)-cost.scale; state.gold-=cost.gold;
  const next = (item.enhanceLevel||0)+1;
  const breakChance = enhanceBreakChance(next);
  if(breakChance>0 && Math.random()<breakChance){
    const name = item.name;
    state.ownedEquipment.splice(index,1);
    if(item.id && state.ownedItems[item.id]){
      state.ownedItems[item.id]--;
      if(state.ownedItems[item.id]<=0) delete state.ownedItems[item.id];
    }
    Sound.hit();
    addLog(`💥 ${name} se rompió al intentar mejorarla a +${next} y se perdió para siempre.`,'lose');
    showFeedback('¡LA PIEZA SE ROMPIÓ!',`${name} no soportó la mejora a +${next} y se destruyó.`,'danger');
    saveState(); renderForge(); render();
    return;
  }
  item.enhanceLevel=next;
  Sound.reward(); burstSparks(itemRarityMeta(item).color,12);
  addLog(`⚒ ${item.name} mejoró a +${item.enhanceLevel}.`,'level');
  showFeedback('PIEZA REFORJADA',`${item.name} +${item.enhanceLevel} · +8% a sus bonificaciones`,'reward');
  saveState(); renderForge(); render();
}
function forgeItemStats(item){
  const entries = [];
  if(item.bonusAtk) entries.push(`+${item.bonusAtk} Atq`);
  if(item.bonusDef) entries.push(`+${item.bonusDef}% Robustez`);
  if(item.bonusHp) entries.push(`+${item.bonusHp} Vida`);
  if(item.bonusMana) entries.push(`+${item.bonusMana} Maná`);
  if(item.bonusCrit) entries.push(`+${item.bonusCrit}% Crít.`);
  if(item.bonusCritDmg) entries.push(`+${item.bonusCritDmg}% D.C.`);
  if(item.bonusSpeed) entries.push(`+${item.bonusSpeed}% Rapidez`);
  return entries.join(' · ') || 'Pieza excepcional';
}
function isForgeLocked(){ return isHuntProgressLocked(); }
function beginRunicForge(id){
  if(isForgeLocked()){ showFeedback('HERRERÍA CERRADA','Terminá la cacería antes de forjar.','danger'); return; }
  const item = forgeBlueprints().find(entry=>entry.id===id);
  if(!item || (state.ownedItems[item.id]||0)>0) return;
  const cost = forgeCost(item);
  const materials = state.materials;
  if((materials.essence||0)<cost.essence || (materials.bossCore||0)<cost.bossCore || (materials.scale||0)<cost.scale || state.gold<cost.gold){
    showFeedback('MATERIALES INSUFICIENTES',`Necesitás ${cost.essence} esencia · ${cost.bossCore} núcleos · ${cost.scale} escamas · ${cost.gold} oro.`,'danger');
    return;
  }
  forgeRitual = { itemId:id, hits:[], activeZone:-1, result:'Seguí el círculo y golpeá cuando el aro toque el núcleo.' };
  prepareForgeRound();
  Sound.skill();
  renderForge();
}
function runicHitQuality(progress, timedOut=false){
  if(timedOut) return { key:'miss', label:'FALLO', score:0 };
  if(progress>=.72 && progress<=.92) return { key:'perfect', label:'PERFECTO', score:3 };
  if(progress>=.48 && progress<1) return { key:'good', label:'BIEN', score:2 };
  return { key:'miss', label:'FALLO', score:0 };
}
function forgeRoundProgress(){
  if(!forgeRitual || !forgeRitual.roundStartedAt) return 0;
  return Math.max(0,Math.min(1,(performance.now()-forgeRitual.roundStartedAt)/forgeRitual.roundDuration));
}
function animateForgeNeedle(){
  if(!forgeRitual) return;
  const target = document.querySelector('.anvil-zone.is-target');
  const progress=forgeRoundProgress();
  if(target){
    target.style.setProperty('--close',progress.toFixed(3));
    target.classList.toggle('perfect-window',progress>=.72 && progress<=.92);
    target.setAttribute('aria-label',`Golpe ${forgeRitual.hits.length+1}: ${Math.round(progress*100)}%`);
  }
  forgeNeedleFrame = requestAnimationFrame(animateForgeNeedle);
}
function strikeRune(zone, timedOut=false){
  if(!forgeRitual || forgeRitual.hits.length>=FORGE_HIT_COUNT) return;
  if(!timedOut && Number(zone)!==forgeRitual.activeZone) return;
  clearForgeTimers();
  const quality = runicHitQuality(forgeRoundProgress(),timedOut);
  forgeRitual.hits.push(quality);
  forgeRitual.result = `${quality.label}: ${quality.key==='perfect'?'el metal y la runa vibraron al unísono.':quality.key==='good'?'el golpe fue firme.':'el ritmo de la forja se quebró.'}`;
  quality.key==='perfect' ? Sound.crit() : quality.key==='good' ? Sound.hit() : Sound.click();
  if(forgeRitual.hits.length>=FORGE_HIT_COUNT){
    const resultNode=document.getElementById('runeResult');
    if(resultNode) resultNode.textContent=forgeRitual.result;
    const marker=document.querySelectorAll('.rune-hit')[FORGE_HIT_COUNT-1];
    if(marker){ marker.className=`rune-hit ${quality.key}`; marker.textContent=quality.key==='perfect'?'✦':quality.key==='good'?'✓':'×'; }
    document.querySelector('.anvil-zone.is-target')?.classList.remove('is-target','perfect-window');
    const id=forgeRitual.itemId;
    setTimeout(()=>craftUniqueItem(id),420);
    return;
  }
  prepareForgeRound();
  renderForge();
}
function forgeOutcome(hits){
  if(hits.length===FORGE_HIT_COUNT && hits.every(hit=>hit.key==='perfect')) return { key:'perfect', label:'Obra Perfecta', description:'+25% a las estadísticas base · sello de maestro', crit:0, critDmg:0, multiplier:1.25 };
  const score=hits.reduce((total,hit)=>total+hit.score,0);
  if(score>=9) return { key:'masterwork', label:'Obra Magistral', description:'+15% a las estadísticas base', crit:0, critDmg:0, multiplier:1.15 };
  if(score>=6) return { key:'refined', label:'Obra Refinada', description:'+8% a las estadísticas base', crit:0, critDmg:0, multiplier:1.08 };
  return { key:'stable', label:'Obra Estable', description:'Estadísticas base sin bonificación', crit:0, critDmg:0, multiplier:1 };
}

function applyForgeOutcome(item,outcome){
  const crafted={ ...item, crafted:true, forgeOutcome:outcome.key, forgeLabel:outcome.label, forgeMultiplier:outcome.multiplier||1 };
  ['bonusAtk','bonusDef','bonusHp','bonusMana','bonusCrit','bonusCritDmg','bonusSpeed'].forEach(key=>{
    if(Number.isFinite(Number(item[key])) && Number(item[key])!==0) crafted[key]=Math.max(1,Math.round(Number(item[key])*(outcome.multiplier||1)));
  });
  crafted.bonusCrit=(crafted.bonusCrit||0)+(outcome.crit||0);
  crafted.bonusCritDmg=(crafted.bonusCritDmg||0)+(outcome.critDmg||0);
  return crafted;
}
function craftUniqueItem(id){
  if(!forgeRitual || forgeRitual.itemId!==id) return;
  if(isForgeLocked()){ forgeRitual=null; return; }
  const item = forgeBlueprints().find(entry=>entry.id===id);
  if(!item || (state.ownedItems[item.id]||0)>0){ forgeRitual=null; return; }
  const cost = forgeCost(item);
  const materials = state.materials;
  if((materials.essence||0)<cost.essence || (materials.bossCore||0)<cost.bossCore || (materials.scale||0)<cost.scale || state.gold<cost.gold){ forgeRitual=null; renderForge(); return; }
  materials.essence -= cost.essence;
  materials.bossCore -= cost.bossCore;
  materials.scale -= cost.scale;
  state.gold -= cost.gold;
  const outcome=forgeOutcome(forgeRitual.hits);
  state.ownedEquipment.push(applyForgeOutcome(item,outcome));
  state.ownedItems[item.id] = (state.ownedItems[item.id]||0)+1;
  forgeRitual=null;
  Sound.reward();
  if(outcome.key==='perfect') setTimeout(()=>Sound.bigCatch(true), 160);
  burstSparks(outcome.key==='perfect' ? '#f8e09b' : outcome.key==='refined' ? '#cf8cff' : (item.color || 'var(--gold-bright)'), 22);
  addLog(`⚒ Forjaste ${item.name}: ${outcome.label}.`, 'level');
  showFeedback(`⚒ ${outcome.label.toUpperCase()}`,`${item.name} · ${outcome.description}`,'reward');
  saveState();
  renderForge();
  render();
}
function dismantleForgeItem(index){
  if(isForgeLocked()){ showFeedback('HERRERÍA CERRADA','Terminá la cacería antes de desmantelar.','danger'); return; }
  const item = state.ownedEquipment[index];
  if(!item) return;
  const meta = itemRarityMeta(item);
  const essence = FORGE_SALVAGE_ESSENCE[meta.key] || 2;
  const core = (meta.key==='unique' || meta.key==='ancestral') ? 1 : 0;
  state.ownedEquipment.splice(index,1);
  if(item.id && state.ownedItems[item.id]){
    state.ownedItems[item.id]--;
    if(state.ownedItems[item.id]<=0) delete state.ownedItems[item.id];
  }
  state.materials.essence = (state.materials.essence||0)+essence;
  if(core) state.materials.bossCore = (state.materials.bossCore||0)+core;
  Sound.click();
  addLog(`⚒ Desmantelaste ${item.name}: +${essence} esencia${core?' · +1 núcleo':''}.`, 'level');
  showFeedback('PIEZA RECICLADA',`+${essence} esencia${core?' · +1 núcleo':''}`,'reward');
  saveState();
  renderForge();
}
function renderRunicForge(item){
  const hits = forgeRitual.hits || [];
  const markers = Array.from({length:FORGE_HIT_COUNT},(_,index)=>{
    const hit=hits[index];
    return `<span class="rune-hit ${hit?hit.key:''}">${hit ? (hit.key==='perfect'?'✦':hit.key==='good'?'✓':'×') : index+1}</span>`;
  }).join('');
  const zones=Array.from({length:FORGE_ZONE_COUNT},(_,index)=>`<button type="button" class="anvil-zone zone-${index+1} ${index===forgeRitual.activeZone?'is-target':''}" data-forge-zone="${index}" ${index===forgeRitual.activeZone?'':'disabled'} aria-label="${index===forgeRitual.activeZone?'Golpear objetivo':'Zona inactiva'}"><i></i><span>${index+1}</span></button>`).join('');
  return `<div class="runic-forge">
    <div class="forge-game-kicker">⚒ PRUEBA DEL MAESTRO</div>
    <h4>FORJA DE PRECISIÓN</h4>
    <p>Completá cuatro golpes. El aro se cierra: golpeá cuando abrace el núcleo dorado.</p>
    <div class="runic-item-preview">${item.image?`<img src="${item.image}" alt="" decoding="async">`:`<span style="font-size:28px">${item.icon}</span>`}<div>${escapeHtml(item.name)}<span>${equipmentSlotMeta(item.type).label} · pieza ancestral</span></div></div>
    <div class="forge-game-status"><span>GOLPE ${Math.min(hits.length+1,FORGE_HIT_COUNT)}/${FORGE_HIT_COUNT}</span><b>4 PERFECTOS = +25% BASE</b></div>
    <div class="anvil-game" aria-label="Yunque con siete zonas de golpe"><div class="anvil-top"></div><div class="anvil-neck"></div><div class="anvil-foot"></div>${zones}<div class="anvil-heat"></div></div>
    <div class="rune-hits">${markers}</div>
    <div class="rune-result" id="runeResult">${forgeRitual.result}</div>
    <div class="forge-timing-legend"><span><i class="legend-perfect"></i>PERFECTO</span><span><i class="legend-good"></i>BIEN</span><span><i class="legend-miss"></i>FALLO</span></div>
    <div class="rune-actions"><button type="button" class="rune-cancel" id="cancelRuneBtn">Cancelar sin gastar materiales</button></div>
  </div>`;
}
function renderForge(){
  const box = document.getElementById('forgeContent');
  const salvage = document.getElementById('forgeSalvage');
  if(!box || !salvage || !state) return;
  const heroClass = currentClass();
  const heroVisual = activeHeroVisual();
  const materials = state.materials || {};
  const locked = isForgeLocked();
  const blueprints = forgeBlueprints();
  const unowned = blueprints.filter(item=>(state.ownedItems[item.id]||0)<=0);
  clearForgeTimers();
  if(forgeRitual){
    const item=blueprints.find(entry=>entry.id===forgeRitual.itemId);
    if(item){
      box.innerHTML=renderRunicForge(item);
      box.querySelectorAll('[data-forge-zone]').forEach(button=>button.addEventListener('click',()=>strikeRune(Number(button.dataset.forgeZone))));
      box.querySelector('#cancelRuneBtn').addEventListener('click',()=>{ clearForgeTimers(); forgeRitual=null; renderForge(); });
      forgeNeedleFrame=requestAnimationFrame(animateForgeNeedle);
      const remaining=Math.max(80,forgeRitual.roundDuration-(performance.now()-forgeRitual.roundStartedAt));
      forgeAutoMissTimer=setTimeout(()=>strikeRune(forgeRitual?.activeZone,true),remaining);
    } else forgeRitual=null;
  }
  if(!forgeRitual) box.innerHTML = `<div class="forge-hero"><div class="forge-hero-emblem ${heroVisual.isSubclass?'has-subclass-art':''}">${heroVisual.isSubclass&&heroVisual.image?`<img src="${heroVisual.image}" alt="${heroVisual.label}" decoding="async">`:heroClass.icon}</div><div><small>FORJA ETERNA · LEGADO ANCESTRAL</small><b>Legado de ${heroClass.label}</b><span>El set final de tu clase. Reuní 2, 4 y 7 piezas ancestrales para despertar bonificaciones únicas.</span></div><strong>${unowned.length}<small>PLANOS<br>POR FORJAR</small></strong></div>
    <div class="forge-materials"><div class="forge-material essence"><span>◇</span><div><small>ESENCIA</small><b>${materials.essence||0}</b></div></div><div class="forge-material core"><span>◈</span><div><small>NÚCLEOS</small><b>${materials.bossCore||0}</b></div></div><div class="forge-material scale"><span>✦</span><div><small>ESCAMAS</small><b>${materials.scale||0}</b></div></div><div class="forge-material gold"><span>◉</span><div><small>ORO</small><b>${state.gold||0}</b></div></div></div>
    <div class="forge-trophies"><span>♛ TROFEOS</span><p>${Object.entries(materials.bossTrophies||{}).length ? Object.entries(materials.bossTrophies).map(([name,count])=>`<b>${escapeHtml(name)} <i>×${count}</i></b>`).join('') : '<em>Derrotá jefes para exhibir sus trofeos y alimentar la forja.</em>'}</p></div>
    <div class="forge-title"><span>PLANOS ANCESTRALES</span><small>${blueprints.length-unowned.length} completados · ${unowned.length} pendientes</small></div>
    <div class="forge-blueprints">${blueprints.map(item=>{
      const cost=forgeCost(item), owned=(state.ownedItems[item.id]||0)>0;
      const enough=(materials.essence||0)>=cost.essence && (materials.bossCore||0)>=cost.bossCore && (materials.scale||0)>=cost.scale && state.gold>=cost.gold;
      return `<div class="forge-card ${owned?'owned':''} ${enough?'craft-ready':'needs-materials'}"><div class="forge-card-ribbon">${owned?'OBTENIDO':enough?'LISTO':'INCOMPLETO'}</div><div class="forge-card-head">${item.image?`<span class="forge-card-art"><img src="${item.image}" alt="" decoding="async" loading="lazy"></span>`:`<span class="forge-card-art">${item.icon}</span>`}<div><small>${equipmentSlotMeta(item.type).label} · ANCESTRAL</small><b>${escapeHtml(item.name)}</b></div></div><div class="forge-stats">${forgeItemStats(item)}</div><div class="forge-recipe"><span class="${(materials.essence||0)>=cost.essence?'has':'lacks'}">◇ ${materials.essence||0}/${cost.essence}</span><span class="${(materials.bossCore||0)>=cost.bossCore?'has':'lacks'}">◈ ${materials.bossCore||0}/${cost.bossCore}</span><span class="${(materials.scale||0)>=cost.scale?'has':'lacks'}">✦ ${materials.scale||0}/${cost.scale}</span><span class="${state.gold>=cost.gold?'has':'lacks'}">◉ ${cost.gold}</span></div><button data-craft-item="${item.id}" ${owned||!enough||locked?'disabled':''}>${owned?'✓ PIEZA COMPLETADA':locked?'CACERÍA EN CURSO':enough?'⚒ COMENZAR FORJA':'REUNÍ LOS MATERIALES'}</button></div>`;
    }).join('')}</div>`;
  if(!forgeRitual) box.querySelectorAll('[data-craft-item]').forEach(button=>button.addEventListener('click',()=>beginRunicForge(button.dataset.craftItem)));

  const pieces = state.ownedEquipment || [];
  salvage.innerHTML = `<div class="forge-risk-note"><span>⚠</span><p><b>RIESGO DE FORJA</b>Desde +${ENHANCE_BREAK_START} una mejora puede romper la pieza. Revisá el porcentaje antes de decidir.</p></div><div class="forge-salvage-head"><span>MOCHILA DEL ARTESANO</span><b>${pieces.length} PIEZAS</b></div><div class="forge-salvage">${pieces.length ? pieces.map((item,index)=>{
    const meta=itemRarityMeta(item), value=FORGE_SALVAGE_ESSENCE[meta.key]||2;
    const level=item.enhanceLevel||0, cost=level<ENHANCE_MAX?enhancementCost(item):null;
    const enough=cost && (materials.essence||0)>=cost.essence && (materials.bossCore||0)>=cost.bossCore && (materials.scale||0)>=cost.scale && state.gold>=cost.gold;
    const nextLevel = level+1;
    const risk = level<ENHANCE_MAX ? Math.round(enhanceBreakChance(nextLevel)*100) : 0;
    const riskLabel = risk>0 ? ` · <span class="enhance-risk">⚠ ${risk}% de rotura</span>` : '';
    return `<div class="salvage-item" style="--rarity-color:${meta.color}">${item.image?`<span class="salvage-art"><img src="${item.image}" alt="" decoding="async" loading="lazy"></span>`:`<span class="salvage-art">${item.icon}</span>`}<div class="salvage-info"><small>${meta.label} · ${equipmentSlotMeta(item.type).label}</small><b>${escapeHtml(item.name)}${enhancementLabel(item)}</b><div class="salvage-level"><i style="width:${Math.min(100,(level/ENHANCE_MAX)*100)}%"></i></div><small>${level<ENHANCE_MAX?`Costo: ◇ ${cost.essence} · ◈ ${cost.bossCore}${cost.scale?` · ✦ ${cost.scale}`:''} · ◉ ${cost.gold}${riskLabel}`:`DOMINIO MÁXIMO +${ENHANCE_MAX}`}</small></div><span class="salvage-actions"><button data-enhance-item="${index}" ${locked||level>=ENHANCE_MAX||!enough?'disabled':''}>${level>=ENHANCE_MAX?`MÁXIMO`:'MEJORAR'}</button><button data-salvage-item="${index}" ${locked?'disabled':''}>RECICLAR <small>+${value}◇</small></button></span></div>`;
  }).join(''):`<div class="forge-empty">Tu mochila está vacía.<br>El equipo que no uses puede convertirse en materiales.</div>`}</div>`;
  salvage.querySelectorAll('[data-enhance-item]').forEach(button=>button.addEventListener('click',()=>enhanceEquipment(Number(button.dataset.enhanceItem))));
  salvage.querySelectorAll('[data-salvage-item]').forEach(button=>button.addEventListener('click',()=>dismantleForgeItem(Number(button.dataset.salvageItem))));
}
