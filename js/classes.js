/* =========================================================================
   CLASSES.JS — Datos de clases, monstruos, biomas, armería y SHOP_EQUIPMENT_ITEMS
   Debe cargarse DESPUÉS de sound.js y ANTES de combat.js, forge.js y fishing.js.
   ========================================================================= */

const LEVEL_CAP = 50;
const STAT_KEYS = ['ataque','vida','mana','agilidad','rapidez'];
const STAT_LABELS = { ataque:'Ataque', vida:'Vida', mana:'Maná', agilidad:'Agilidad', rapidez:'Rapidez' };
const TIERS = {
  facil:   { label:'Fácil',   mult:0.6, reward:1 },
  normal:  { label:'Normal',  mult:0.9, reward:1.6 },
  dificil: { label:'Difícil', mult:1.2, reward:2.4 },
  elite:   { label:'Elite',   mult:1.6, reward:4 },
};
const MONSTER_NAMES = {
  facil:['Rata gigante','Slime','Cuervo salvaje'],
  normal:['Orco','Esqueleto','Araña venenosa'],
  dificil:['Trol de pantano','Minotauro','Gólem de piedra'],
  elite:['Dragón joven','Señor demonio','Coloso ancestral'],
};
const MONSTER_COLOR = { facil:'#5f8a4c', normal:'#c89b3c', dificil:'#a8541f', elite:'#7a2ab0' };
const MONSTER_FORMS = {
  facil:   { name:'Slime Verde', bossName:'Slime Violeta', type:'slime', color:'#69b84f', bossColor:'#934bc4', image:'assets/images/slime verde sprite.webp' },
  normal:  { name:'Lobo Gris', bossName:'Lobo Negro', type:'wolf', color:'#8b9298', bossColor:'#15161d', image:'assets/images/lobo gris sprite.webp' },
  dificil: { name:'Minotauro Marron', bossName:'Minotauro Rojo', type:'minotaur', color:'#9b623d', bossColor:'#bd3c32', image:'assets/images/minotauro marron sprite.webp' },
  elite:   { name:'Dragon Azul', bossName:'Dragon Blanco', type:'dragon', color:'#438bd4', bossColor:'#edf4ff', image:'assets/images/dragon azul sprite.webp' }
};
// Variantes normales: amplían la fauna sin quitar identidad a los jefes de cada rango.
const MONSTER_VARIANTS = {
  normal: [
    { name:'Araña de Cristal', type:'crystal-spider', color:'#80d7ef', image:'assets/images/arania de cristal sprite.webp', biomes:['forest','temple','moon-swamp'] },
    { name:'Orco Chamán', type:'orc-shaman', color:'#84984d', image:'assets/images/orco chaman sprite.webp', biomes:['cavern','obsidian-fortress'] },
    { name:'Esqueleto Arquero', type:'skeleton-archer', color:'#a7d5e1', image:'assets/images/esqueleto arquero sprite.webp', biomes:['ruins','forgotten-crypt'] },
    { name:'Bruja del Pantano', type:'swamp-witch', color:'#6caf73', image:'assets/images/bruja del pantano sprite.webp', biomes:['moon-swamp'] },
    { name:'Basilisco del Pantano', type:'basilisk', color:'#7da34c', image:'assets/images/basilisco del pantano sprite.webp', biomes:['moon-swamp'] }
  ],
  dificil: [
    { name:'Gólem Musgoso', type:'golem', color:'#708a55', image:'assets/images/golem musgoso sprite.webp', biomes:['moon-swamp','obsidian-fortress'] },
    { name:'Liche Carmesí', type:'lich', color:'#b64f65', image:'assets/images/liche carmesi sprite.webp', biomes:['forgotten-crypt'] },
    { name:'Demonio Menor', type:'lesser-demon', color:'#d45c3c', image:'assets/images/demonio menor sprite.webp', biomes:['cavern','obsidian-fortress','dragon-nest'] }
  ],
  elite: [
    { name:'Caballero Revenante', type:'revenant', color:'#76a8c0', image:'assets/images/caballero revenante sprite.webp', biomes:['forgotten-crypt'] },
    { name:'Gárgola de Obsidiana', type:'gargoyle', color:'#d47343', image:'assets/images/gargola de obsidiana sprite.webp', biomes:['obsidian-fortress'] },
    { name:'Elemental de Escarcha', type:'frost-elemental', color:'#93dcff', image:'assets/images/elemental de escarcha sprite.webp', biomes:['frozen-peaks'] },
    { name:'Hidra Joven', type:'hydra', color:'#4b9e9f', image:'assets/images/hidra joven sprite.webp', biomes:['moon-swamp','frozen-peaks'] },
    { name:'Caballero Maldito', type:'cursed-knight', color:'#be4b54', image:'assets/images/caballero maldito sprite.webp', biomes:['forgotten-crypt','obsidian-fortress'] },
    { name:'Guardián Rúnico', type:'rune-guardian', color:'#b9a464', image:'assets/images/guardian runico sprite.webp', biomes:['temple','frozen-peaks'] }
  ]
};
const ACT_BOSS_FORMS = {
  'moon-swamp': { name:'Jefe: Reina Araña', tier:'dificil', type:'spider-queen', color:'#ad67d0', image:'assets/images/reina arania sprite.webp', multiplier:1.06 },
  'forgotten-crypt': { name:'Jefe: Liche Carmesí', tier:'elite', type:'crimson-lich', color:'#c94d67', image:'assets/images/liche carmesi jefe sprite.webp', multiplier:1.10 },
  'obsidian-fortress': { name:'Jefe: Señor Orco', tier:'elite', type:'orc-lord', color:'#d96545', image:'assets/images/senor orco sprite.webp', multiplier:1.14 },
  'frozen-peaks': { name:'Jefe: Dragón de Ceniza', tier:'elite', type:'ash-dragon', color:'#ef7051', image:'assets/images/dragon de ceniza sprite.webp', multiplier:1.20 }
};
const BOSS_TROPHIES = {
  'spider-queen': { name:'Seda Real', icon:'🕸', hint:'Material de la Reina Araña' },
  'crimson-lich': { name:'Fragmento de Filacteria', icon:'💀', hint:'Material del Liche Carmesí' },
  'orc-lord': { name:'Núcleo de Obsidiana', icon:'◈', hint:'Material del Señor Orco' },
  'ash-dragon': { name:'Corazón de Ceniza', icon:'🔥', hint:'Material del Dragón de Ceniza' }
};
function bossTrophyFor(monster){ return BOSS_TROPHIES[monster.visualType] || { name:'Núcleo de Guardián', icon:'◈', hint:'Material de jefe' }; }
function monsterFormForTier(tier, allowVariant=true, biomeKey=''){
  const base = MONSTER_FORMS[tier] || MONSTER_FORMS.facil;
  const variants = (MONSTER_VARIANTS[tier] || []).filter(entry=>!biomeKey || !entry.biomes || entry.biomes.includes(biomeKey));
  // Las variantes son memorables, pero las criaturas icónicas siguen apareciendo más seguido.
  return allowVariant && variants.length && Math.random() < .42 ? pick(variants) : base;
}
function bestiaryKeyFor(monster){ return monster.visualType || `${monster.tier}:${monster.name}`; }
function bestiaryCatalog(){
  const base=Object.entries(MONSTER_FORMS).map(([tier,entry])=>({ ...entry, tier, boss:false }));
  const variants=Object.entries(MONSTER_VARIANTS).flatMap(([tier,list])=>list.map(entry=>({ ...entry, tier, boss:false })));
  const bosses=Object.values(ACT_BOSS_FORMS).map(entry=>({ ...entry, boss:true }));
  return [...base,...variants,...bosses];
}
const MONSTER_SPAWN_WEIGHTS = [
  { tier:'facil', weight:70 },
  { tier:'normal', weight:40 },
  { tier:'dificil', weight:20 },
  { tier:'elite', weight:5 }
];
function rollMonsterTier(depth=1){
  // A medida que baja la expedición, los enemigos propios de cada región aparecen con más frecuencia.
  const weights = depth>=29 ? [
    { tier:'facil', weight:8 }, { tier:'normal', weight:22 }, { tier:'dificil', weight:38 }, { tier:'elite', weight:32 }
  ] : depth>=20 ? [
    { tier:'facil', weight:14 }, { tier:'normal', weight:30 }, { tier:'dificil', weight:36 }, { tier:'elite', weight:20 }
  ] : MONSTER_SPAWN_WEIGHTS;
  const total = weights.reduce((sum, entry)=>sum+entry.weight,0);
  let roll = Math.random()*total;
  for(const entry of weights){
    roll -= entry.weight;
    if(roll < 0) return entry.tier;
  }
  return 'facil';
}
const BIOMES = [
  { key:'forest', label:'Bosque Susurrante', until:3, icon:'🌿' },
  { key:'ruins', label:'Ruinas de Ceniza', until:6, icon:'🏛' },
  { key:'cavern', label:'Caverna de Brasas', until:10, icon:'🔥' },
  { key:'temple', label:'Templo del Velo', until:15, icon:'✦' },
  { key:'moon-swamp', label:'Pantano de Lunas', until:20, icon:'🌙' },
  { key:'forgotten-crypt', label:'Cripta Olvidada', until:25, icon:'☠' },
  { key:'obsidian-fortress', label:'Fortaleza de Obsidiana', until:30, icon:'♜' },
  { key:'frozen-peaks', label:'Cumbres Heladas', until:35, icon:'❄' },
  { key:'dragon-nest', label:'Nido del Dragon', until:Infinity, icon:'🐉' }
];
function biomeForDepth(depth){ return BIOMES.find(biome=>depth<=biome.until) || BIOMES[0]; }
const SCENARIO_EVENTS = {
  forest:[
    { icon:'🌿', title:'CLARO DE LUCES ERRANTES', text:'Pequeñas luces verdes flotan entre raíces antiguas. El bosque parece ofrecerte refugio.', choices:[
      { id:'rest', label:'Respirar con el bosque', detail:'Recuperá 28% de vida', effect:'heal' },
      { id:'gather', label:'Recolectar savia lunar', detail:'Oro y esencia', effect:'gather' }
    ]}
  ],
  ruins:[
    { icon:'🏛', title:'OBELISCO DE CENIZA', text:'Runas apagadas laten bajo la piedra. Una vibra restaura tu mente; otra exige un sacrificio.', choices:[
      { id:'focus', label:'Escuchar las runas', detail:'Recuperá 45% de maná', effect:'mana' },
      { id:'offering', label:'Ofrecer sangre', detail:'Vida por oro y esencia', effect:'offering' }
    ]}
  ],
  cavern:[
    { icon:'🔥', title:'RÍO DE BRASAS', text:'Un cauce de fuego corta la caverna. A un lado hay vapor curativo; al otro, un cofre al rojo vivo.', choices:[
      { id:'steam', label:'Entrar al vapor', detail:'Recuperá 24% de vida', effect:'heal' },
      { id:'coffer', label:'Abrir el cofre ardiente', detail:'Oro, con un pequeño coste', effect:'coffer' }
    ]}
  ],
  temple:[
    { icon:'✦', title:'ESPEJO DEL VELO', text:'Tu reflejo sostiene una reliquia idéntica. Solo una versión de la expedición podrá conservarla.', choices:[
      { id:'relic', label:'Tomar el reflejo', detail:'Reliquia temporal aleatoria', effect:'relic' },
      { id:'clarity', label:'Romper el espejo', detail:'Maná y esencia', effect:'clarity' }
    ]}
  ],
  'moon-swamp':[
    { icon:'🌙', title:'LAGUNA DE LUCES VERDES', text:'La niebla cubre la orilla. Algo valioso brilla bajo el agua oscura.', choices:[
      { id:'rest', label:'Beber del manantial', detail:'Recuperá 28% de vida', effect:'heal' },
      { id:'gather', label:'Seguir los destellos', detail:'Oro y esencia', effect:'gather' }
    ]}
  ],
  'forgotten-crypt':[
    { icon:'☠', title:'SARCÓFAGO SIN NOMBRE', text:'Un susurro ofrece poder a cambio de un recuerdo de esta expedición.', choices:[
      { id:'relic', label:'Abrir el sarcófago', detail:'Reliquia temporal aleatoria', effect:'relic' },
      { id:'mana', label:'Bendecir los restos', detail:'Recuperá 45% de maná', effect:'mana' }
    ]}
  ],
  'obsidian-fortress':[
    { icon:'♜', title:'YUNQUE DE LA GUARDIA NEGRA', text:'El metal ardiente vibra con una fuerza que todavía no se apagó.', choices:[
      { id:'coffer', label:'Tomar el lingote', detail:'Oro, con un pequeño coste', effect:'coffer' },
      { id:'clarity', label:'Canalizar el calor', detail:'Maná y esencia', effect:'clarity' }
    ]}
  ],
  'frozen-peaks':[
    { icon:'❄', title:'ALTAR BAJO EL HIELO', text:'Una luz azul late dentro del glaciar. Podría fortalecer tu voluntad.', choices:[
      { id:'relic', label:'Romper el hielo', detail:'Reliquia temporal aleatoria', effect:'relic' },
      { id:'rest', label:'Refugiarse del viento', detail:'Recuperá 28% de vida', effect:'heal' }
    ]}
  ],
  'dragon-nest':[
    { icon:'🐉', title:'ESCAMAS DEL NIDO', text:'Entre huesos gigantes hay una escama intacta. Su calor puede reforzarte o venderse por una fortuna.', choices:[
      { id:'scale', label:'Fundir la escama', detail:'Reliquia temporal aleatoria', effect:'relic' },
      { id:'sell', label:'Guardar la escama', detail:'Gran cantidad de oro', effect:'jackpot' }
    ]}
  ]
};
function makeScenarioEvent(){
  const biome = biomeForDepth(runState ? runState.depth : 1);
  const pool = SCENARIO_EVENTS[biome.key] || SCENARIO_EVENTS.forest;
  return { ...pick(pool), biome:biome.key };
}

/* ================= ROGUELIKE HUNT MODE ================= */
// Escala de rareza de la tirada de 6 dados (estilo Generala), de la más común a la más difícil.
const DICE_COMBOS = [
  { rank:0, label:'Nada',       color:'var(--parchment-dim)' },
  { rank:1, label:'Un Par',     color:'var(--parchment)' },
  { rank:2, label:'Dos Pares',  color:'var(--green)' },
  { rank:3, label:'Trío',       color:'var(--mana)' },
  { rank:4, label:'Escalera',   color:'var(--gold)' },
  { rank:5, label:'Full',       color:'var(--gold-bright)' },
  { rank:6, label:'Póker',      color:'var(--ember)' },
  { rank:7, label:'¡GENERALA!', color:'#ff5a5a' },
];
function evaluateDiceCombo(dice){
  const counts = {};
  dice.forEach(d=>counts[d]=(counts[d]||0)+1);
  const countVals = Object.values(counts).sort((a,b)=>b-a);
  const uniqueSorted = Object.keys(counts).map(Number).sort((a,b)=>a-b);
  // Con 6 dados alcanza con que aparezcan 5 valores consecutivos entre los
  // tirados (el sexto dado sobrante no importa) para que cuente como escalera.
  const isStraight = [1,2].some(start=>[start,start+1,start+2,start+3,start+4].every(v=>uniqueSorted.includes(v)));
  if(countVals[0]>=5) return 7;
  if(countVals[0]===4) return 6;
  if(countVals[0]===3 && countVals[1]>=2) return 5;
  if(isStraight) return 4;
  if(countVals[0]===3) return 3;
  if(countVals.filter(c=>c>=2).length>=2) return 2;
  if(countVals[0]===2) return 1;
  return 0;
}
// Tres niveles de contrato (bounty). El multiplicador por rango de dado define qué tan
// "estadísticamente difícil" hay que tirar para cobrar bien: Fácil tiene un piso decente,
// Difícil paga casi nada con una tirada mala pero mucho con Full/Póker/Generala.
const BOUNTY_TIERS = {
  // Multiplicadores reescalados tras pasar de 5 a 6 dados: con un dado extra,
  // Full/Póker/Generala salen bastante más seguido (simulado con la
  // estrategia de conservar el grupo más repetido en cada tirada), así que
  // se bajaron los multiplicadores para que el pago promedio de cada tier
  // quede igual que antes con 5 dados, en vez de inflarse solo.
  facil:   { key:'facil',   label:'Fácil',   icon:'🟢', needLabel:'Seguro · premio menor', goal:'Buscá: Par o mejor', risk:'Recompensa segura, pero moderada.', mult:[0.46,0.72,0.97,1.27,1.60,1.94,2.36,2.87] },
  medio:   { key:'medio',   label:'Medio',   icon:'🟡', needLabel:'Riesgo medio · buen premio', goal:'Buscá: Trío o mejor', risk:'Una tirada baja paga poco; el Trío cambia la run.', mult:[0.11,0.30,0.56,0.97,1.57,2.32,3.30,4.65] },
  dificil: { key:'dificil', label:'Difícil', icon:'🔴', needLabel:'Alto riesgo · gran premio', goal:'Buscá: Full o mejor', risk:'Alto riesgo: sin una gran combinación casi no cobrás.', mult:[0,0.05,0.13,0.36,0.79,1.79,3.58,6.29] },
};
function bountyTierClass(key){ return 'tier-'+key; }
const MAP_NODE_TYPES = {
  fight:    { icon:'⚔', label:'Combate', hint:'Enemigo común · recompensa segura', color:'var(--steel)' },
  elite:    { icon:'✦', label:'Élite', hint:'Más riesgo · mejores botines', color:'var(--ember)' },
  treasure: { icon:'⌘', label:'Tesoro', hint:'Oro inmediato · sin combate', color:'var(--gold-bright)' },
  shrine:   { icon:'✚', label:'Santuario', hint:'Elegí una bendición', color:'var(--green)' },
  tracking: { icon:'🐾', label:'Rastreo', hint:'Seguí huellas · encontrá una bestia o botín', color:'#78c995' },
  merchant: { icon:'☾', label:'Mercader', hint:'Un trato arriesgado · recompensa oculta', color:'#c68ae8' },
  event:    { icon:'?', label:'Misterio', hint:'Un evento impredecible', color:'var(--mana)' },
  boss:     { icon:'☠', label:'Guardián', hint:'Jefe de profundidad · gran premio', color:'#d65a5a' }
};
function makeMapNodes(depth){
  if(depth>1 && depth%5===0) return [{ type:'boss' }];
  const pool = ['fight','fight','elite','treasure','shrine','tracking','merchant','event'];
  // La Torre del Vigía de El Asentamiento agrega copias extra de nodos "buenos"
  // (no combate/élite) al bolillero antes de sortear, sin sacar los de combate,
  // para que el mapa tienda a ofrecer más oportunidades sin perder variedad.
  const watchtowerBoost = (typeof settlementWatchtowerBonus==='function') ? settlementWatchtowerBonus() : 0;
  const goodTypes = ['treasure','shrine','tracking','merchant','event'];
  for(let i=0;i<watchtowerBoost;i++) pool.push(goodTypes[Math.floor(Math.random()*goodTypes.length)]);
  const nodes = [];
  while(nodes.length<3 && pool.length){
    const index = Math.floor(Math.random()*pool.length);
    const type = pool.splice(index,1)[0];
    if(!nodes.some(node=>node.type===type) || type==='fight') nodes.push({type});
  }
  return nodes;
}
function makeRoutePlan(startDepth){
  const rows = [];
  for(let depth=startDepth; depth<=startDepth+4; depth++){
    rows.push(makeMapNodes(depth).map((node,index)=>({ ...node, id:`${depth}-${index}` })));
    if(depth%5===0) break;
  }
  return rows;
}
function ensureRoutePlan(){
  if(!runState) return;
  // Compatibilidad: una versión anterior podía recibir el evento del clic como profundidad.
  // Reparamos la expedición antes de dibujar el mapa para que no sobrevivan NaN ni texto inválido.
  const repairedDepth = Math.max(1, Math.floor(finiteNumber(runState.depth, 1)));
  if(runState.depth !== repairedDepth){
    runState.depth = repairedDepth;
    runState.routePlan = [];
    runState.routeFloor = 0;
    runState.routeHistory = [];
    runState.currentNode = null;
    runState.pendingNode = null;
  }
  if(state && state.materials){
    state.materials.essence = Math.max(0, finiteNumber(state.materials.essence));
    state.materials.bossCore = Math.max(0, finiteNumber(state.materials.bossCore));
  }
  if(!Array.isArray(runState.routePlan) || !runState.routePlan.length){
    runState.routePlan = makeRoutePlan(runState.depth);
    runState.routeFloor = 0;
    runState.routeHistory = [];
  }
  runState.routeFloor = Math.max(0,Math.min(runState.routeFloor||0,runState.routePlan.length-1));
  runState.mapNodes = runState.routePlan[runState.routeFloor];
}
// Escala de profundidad de la cacería roguelike: el primer combate es siempre un monstruo común y débil.
function depthTierKey(depth){
  if(depth<=3) return 'facil';
  if(depth<=6) return 'normal';
  if(depth<=10) return 'dificil';
  return 'elite';
}
function makeRunMonster(depth, nodeType='fight'){
  const biome = biomeForDepth(depth);
  const actBoss = nodeType==='boss' ? ACT_BOSS_FORMS[biome.key] : null;
  // El jefe fija su categoría antes de calcular vida y daño.
  const tierKey = actBoss ? actBoss.tier : (depth===1 ? 'facil' : rollMonsterTier(depth));
  const m = makeMonster(tierKey, biome.key);
  // Curva fija de Cacería. Sólo profundidad, rango y tipo de encuentro deciden
  // sus estadísticas: subir nivel, equiparse o hacer resets jamás fortalece al rival.
  const tierScale = { facil:.78, normal:1, dificil:1.30, elite:1.68 }[tierKey] || 1;
  const depthHp = 35 + depth*14 + depth*depth*1.45;
  const depthDamage = 4 + depth*1.25 + depth*depth*.018;
  const hpTarget = depthHp*tierScale*(.95+Math.random()*.10);
  const damageTarget = depthDamage*(.90+tierScale*.10)*(.96+Math.random()*.08);
  const ascension = runAscension(depth, !!(runState && runState.abyss));
  const ascensionHp = 1 + ascension*.24;
  const ascensionDamage = 1 + ascension*.11;
  m.hp = safePositiveInt(hpTarget*ascensionHp,35+depth*12); m.maxHp = m.hp;
  m.dmg = safePositiveInt(damageTarget*ascensionDamage,4+depth);
  m.ascension = ascension;
  const trial = activeWeeklyTrial();
  if(trial.key==='fury') m.dmg=safePositiveInt(m.dmg*1.18, m.dmg);
  if(trial.key==='iron'){ m.hp=safePositiveInt(m.hp*1.22, m.hp); m.maxHp=m.hp; }
  if(depth===1){
    m.name = 'Rata Común'; m.isBoss = false;
    m.hp = 32; m.maxHp = 32; m.dmg = 4;
  }
  if(depth===1){ m.name = MONSTER_FORMS[tierKey].name; }
  if(nodeType==='elite'){
    m.isElite = true;
    m.affinity = { ...pick(ELITE_AFFINITIES) };
    m.affinityBroken = false;
    m.name = `Élite ${m.name}`;
    m.hp = safePositiveInt(m.hp*1.62, m.hp); m.maxHp = m.hp; m.dmg = safePositiveInt(m.dmg*1.34, m.dmg);
  }
  if(nodeType==='boss'){
    m.isBoss = true;
    m.name = `☠ Guardián: ${pick(MONSTER_NAMES[tierKey])}`;
    const bossForm = actBoss || MONSTER_FORMS[tierKey];
    m.name = actBoss ? actBoss.name : `Jefe: ${bossForm.bossName}`;
    m.visualBoss = true;
    m.visualType = bossForm.type;
    m.image = bossForm.image;
    m.color = bossForm.bossColor || bossForm.color;
    const finalBoss = depth===FINAL_RUN_DEPTH;
    const actMultiplier = actBoss ? actBoss.multiplier : 1;
    m.hp = safePositiveInt(m.hp*(finalBoss ? 3.55 : 2.55)*actMultiplier, m.hp); m.maxHp = m.hp;
    m.dmg = safePositiveInt(m.dmg*(finalBoss ? 2.05 : 1.68)*actMultiplier, m.dmg);
    if(finalBoss){
      m.name = `☠ ${bossForm.bossName} — Señor del Abismo`;
      m.finalBoss = true;
    } else if(depth>FINAL_RUN_DEPTH){
      m.name = `☠ ${bossForm.bossName} — Ascensión ${Math.max(1,ascension)}`;
      m.endlessBoss = true;
    }
  }
  return m;
}

const SHOP_ROTATION_MS = 4 * 60 * 1000;

const LEGACY_SHOP_EQUIPMENT_ITEMS = [
  { id: 'bronze_helm', type: 'helmet', name: 'Casco de Bronce', price: 100, bonusDef: 5, icon: '🪖', rarity:'Común', chance: 0.9, color:'var(--steel)' },
  { id: 'steel_chest', type: 'chest', name: 'Pechera de Acero', price: 250, bonusDef: 15, icon: '👕', rarity:'Poco común', chance: 0.6, color:'var(--green)' },
  { id: 'iron_sword', type: 'weapon', name: 'Espada de Hierro', price: 150, bonusAtk: 12, bonusCrit: 5, icon: '⚔️', rarity:'Poco común', chance: 0.6, color:'var(--green)' },
  { id: 'wooden_shield', type: 'shield', name: 'Escudo de Madera', price: 80, bonusDef: 8, icon: '🛡️', rarity:'Común', chance: 0.9, color:'var(--steel)' },
  { id: 'leather_boots', type: 'boots', name: 'Botas de Cuero', price: 70, bonusDef: 3, icon: '🥾', rarity:'Común', chance: 0.9, color:'var(--steel)' },
  { id: 'leather_gloves', type: 'gloves', name: 'Guantes de Cuero', price: 60, bonusAtk: 4, icon: '🧤', rarity:'Común', chance: 0.9, color:'var(--steel)' },
  { id: 'ruby_ring', type: 'ring', name: 'Anillo de Rubí', price: 300, bonusCrit: 8, bonusCritDmg: 20, icon: '💍', rarity:'Mítica', chance: 0.15, color:'var(--gold-bright)' },
  { id:'oathblade', type:'weapon', name:'Espada del Juramento', price:420, bonusAtk:20, bonusDef:3, icon:'⚔️', rarity:'Clase', chance:1, color:'var(--gold-bright)', classOnly:'warrior' },
  { id:'bastion_shield', type:'shield', name:'Escudo del Bastión', price:360, bonusDef:18, bonusCrit:2, icon:'🛡️', rarity:'Clase', chance:1, color:'var(--gold-bright)', classOnly:'warrior' },
  { id:'moon_bow', type:'weapon', name:'Arco de Hoja Lunar', price:420, bonusAtk:17, bonusCrit:10, icon:'🏹', rarity:'Clase', chance:1, color:'var(--green)', classOnly:'archer' },
  { id:'silver_quiver', type:'shield', name:'Carcaj de Plata', price:300, bonusAtk:8, bonusCrit:6, icon:'🏹', rarity:'Clase', chance:1, color:'var(--green)', classOnly:'archer' },
  { id:'astral_staff', type:'weapon', name:'Báculo Astral', price:440, bonusAtk:19, bonusCritDmg:20, icon:'🪄', rarity:'Clase', chance:1, color:'var(--mana)', classOnly:'mage' },
  { id:'codex_arcane', type:'shield', name:'Libro de Runas', price:340, bonusDef:6, bonusCrit:7, icon:'📖', rarity:'Clase', chance:1, color:'var(--mana)', classOnly:'mage' },
  { id:'aurora_scepter', type:'weapon', name:'Cetro de Aurora', price:410, bonusAtk:14, bonusDef:8, icon:'✚', rarity:'Clase', chance:1, color:'var(--gold-bright)', classOnly:'priest' },
  { id:'sacred_relic', type:'shield', name:'Relicario Solar', price:330, bonusDef:12, bonusCritDmg:15, icon:'☀️', rarity:'Clase', chance:1, color:'var(--gold-bright)', classOnly:'priest' },
  { id:'shadow_blades', type:'weapon', name:'Dagas Gemelas', price:430, bonusAtk:18, bonusCrit:11, icon:'🗡️', rarity:'Clase', chance:1, color:'#c87ad4', classOnly:'assassin' },
  { id:'smoke_cloak', type:'shield', name:'Manto de Humo', price:310, bonusDef:5, bonusCrit:8, icon:'🌑', rarity:'Clase', chance:1, color:'#c87ad4', classOnly:'assassin' },
  { id:'beast_whip', type:'weapon', name:'Látigo de Vínculo', price:420, bonusAtk:16, bonusCrit:5, icon:'🪢', rarity:'Clase', chance:1, color:'#66d6b5', classOnly:'tamer' },
  { id:'tamer_charm', type:'shield', name:'Amuleto de Captura', price:350, bonusDef:7, bonusCrit:5, icon:'💠', rarity:'Clase', chance:1, color:'#66d6b5', classOnly:'tamer' }
];

const ITEM_RARITIES = {
  common:    { label:'Com&uacute;n',     chance:.65,  price:110,  color:'#a9b3bd', glow:'rgba(169,179,189,.24)' },
  uncommon:  { label:'Poco com&uacute;n',chance:.18,  price:250,  color:'#75c977', glow:'rgba(76,181,88,.28)' },
  rare:      { label:'Raro',             chance:.08,  price:520,  color:'#5bb6ff', glow:'rgba(67,150,242,.30)' },
  epic:      { label:'&Eacute;pico',     chance:.04,  price:1050, color:'#c77cff', glow:'rgba(184,88,240,.34)' },
  legendary: { label:'Legendario',        chance:.015, price:2100, color:'#ffae42', glow:'rgba(246,161,45,.37)' },
  mythic:    { label:'M&iacute;tico',      chance:.03,  price:4200, color:'#ff5d7a', glow:'rgba(240,65,101,.40)' },
  unique:    { label:'&Uacute;nico',     chance:.005, price:8500, color:'#f6ecad', glow:'rgba(246,236,173,.48)' },
  ancestral: { label:'Ancestral',        chance:0,    price:0,    color:'#7cf7ff', glow:'rgba(124,247,255,.5)' }
};
function itemRarityMeta(item){
  const normalized = String(item.rarityKey || item.rarity || 'common').toLowerCase();
  const key = Object.keys(ITEM_RARITIES).find(entry=>normalized.includes(entry)) ||
    (normalized.includes('legend') ? 'legendary' : normalized.includes('mit') ? 'mythic' : normalized.includes('epic') ? 'epic' : normalized.includes('raro') ? 'rare' : normalized.includes('poco') ? 'uncommon' : 'common');
  const rarity = ITEM_RARITIES[key];
  return { key, label:item.rarity || rarity.label, color:item.color || rarity.color, glow:item.glow || rarity.glow };
}

const CLASS_EQUIPMENT_ART = {
  warrior: {
    helmet:'assets/images/warrior_helmet_icon.webp', chest:'assets/images/warrior_chest_icon.webp', weapon:'assets/images/warrior_weapon_icon.webp', shield:'assets/images/warrior_shield_icon.webp', gloves:'assets/images/warrior_gloves_icon.webp', boots:'assets/images/warrior_boots_icon.webp', ring:'assets/images/warrior_ring_icon.webp'
  },
  archer: {
    helmet:'assets/images/archer_hood_icon.webp',
    chest:'assets/images/archer_vest_icon.webp',
    weapon:'assets/images/archer_bow_icon.webp',
    shield:'assets/images/archer_quiver_icon.webp',
    gloves:'assets/images/archer_gloves_icon.webp',
    boots:'assets/images/archer_boots_icon.webp',
    ring:'assets/images/archer_ring_icon.webp'
  },
  mage: {
    helmet:'assets/images/mage_helmet_icon.webp', chest:'assets/images/mage_chest_icon.webp', weapon:'assets/images/mage_weapon_icon.webp', shield:'assets/images/mage_shield_icon.webp', gloves:'assets/images/mage_gloves_icon.webp', boots:'assets/images/mage_boots_icon.webp', ring:'assets/images/mage_ring_icon.webp'
  },
  priest: {
    helmet:'assets/images/priest_helmet_icon.webp', chest:'assets/images/priest_chest_icon.webp', weapon:'assets/images/priest_weapon_icon.webp', shield:'assets/images/priest_shield_icon.webp', gloves:'assets/images/priest_gloves_icon.webp', boots:'assets/images/priest_boots_icon.webp', ring:'assets/images/priest_ring_icon.webp'
  },
  assassin: {
    helmet:'assets/images/assassin_helmet_icon.webp', chest:'assets/images/assassin_chest_icon.webp', weapon:'assets/images/assassin_weapon_icon.webp', shield:'assets/images/assassin_shield_icon.webp', gloves:'assets/images/assassin_gloves_icon.webp', boots:'assets/images/assassin_boots_icon.webp', ring:'assets/images/assassin_ring_icon.webp'
  },
  tamer: {
    helmet:'assets/images/tamer_helmet_icon.webp', chest:'assets/images/tamer_chest_icon.webp', weapon:'assets/images/tamer_weapon_icon.webp', shield:'assets/images/tamer_shield_icon.webp', gloves:'assets/images/tamer_gloves_icon.webp', boots:'assets/images/tamer_boots_icon.webp', ring:'assets/images/tamer_ring_icon.webp'
  }
};
function equipmentArtFor(item, slot){
  if(item && item.image && ['base','subclass','forge'].includes(item.equipmentTier)) return item.image;
  const classKey = item && item.classOnly ? item.classOnly : state.characterClass;
  return CLASS_EQUIPMENT_ART[classKey] && CLASS_EQUIPMENT_ART[classKey][slot];
}
function equipmentVisual(item, slot){
  const art = equipmentArtFor(item,slot);
  if(art) return `<img class="equipment-item-art" src="${art}" alt="" decoding="async">`;
  return item ? item.icon : equipmentSlotMeta(slot).icon;
}

function classArmory(classOnly, pieces){
  return pieces.map(([id,type,name,rarity,icon,bonus])=>{
    const tier = ITEM_RARITIES[rarity];
    return { id, type, name, icon, image:(CLASS_EQUIPMENT_ART[classOnly] || {})[type] || '', classOnly, rarity:tier.label, rarityKey:rarity, chance:tier.chance, price:tier.price, color:tier.color, glow:tier.glow, ...bonus };
  });
}

// Semillas de cada ranura. Más abajo se generan sus siete calidades para completar la progresión.
const CLASS_ARMORY_SEEDS = [
  ...classArmory('warrior', [
    ['warrior_iron_helm','helmet','Yelmo del Recluta','common','&#x1F9D9;', {bonusDef:5}],
    ['warrior_plate','chest','Coraza de Guardia','uncommon','&#x1F6E1;', {bonusDef:13,bonusHp:12}],
    ['warrior_gauntlets','gloves','Guanteletes de Guerra','rare','&#x1F94A;', {bonusAtk:8,bonusDef:3}],
    ['warrior_sabatons','boots','Grebas de Marcha','epic','&#x1F462;', {bonusDef:9,bonusSpeed:3}],
    ['warrior_bastion','shield','Escudo del Bastion','legendary','&#x1F6E1;', {bonusDef:24,bonusCrit:3}],
    ['warrior_oathblade','weapon','Espada del Juramento','mythic','&#x2694;', {bonusAtk:24,bonusDef:11,bonusHp:14,bonusCrit:5}],
    ['warrior_crown','ring','Sello del Rey Caido','unique','&#x1F451;', {bonusDef:12,bonusCrit:15,bonusCritDmg:40}]
  ]),
  ...classArmory('archer', [
    ['archer_cap','helmet','Capucha de Explorador','common','&#x1F3D5;', {bonusDef:3,bonusCrit:2}],
    ['archer_vest','chest','Chaleco de Hojas','uncommon','&#x1F3AF;', {bonusDef:8,bonusSpeed:3}],
    ['archer_gloves','gloves','Guantes de Tirador','rare','&#x1F3F9;', {bonusAtk:7,bonusCrit:6}],
    ['archer_boots','boots','Botas del Viento','epic','&#x1F4A8;', {bonusDef:4,bonusSpeed:9}],
    ['archer_quiver','shield','Carcaj de Plata','legendary','&#x1F3F9;', {bonusAtk:10,bonusCrit:13,bonusSpeed:5}],
    ['archer_moonbow','weapon','Arco de Hoja Lunar','mythic','&#x1F3F9;', {bonusAtk:22,bonusCrit:21,bonusCritDmg:25,bonusSpeed:6}],
    ['archer_starband','ring','Aro de la Estrella','unique','&#x2728;', {bonusCrit:22,bonusCritDmg:48,bonusSpeed:7}]
  ]),
  ...classArmory('mage', [
    ['mage_hat','helmet','Sombrero de Aprendiz','common','&#x1F9D9;', {bonusMana:10,bonusDef:2}],
    ['mage_robe','chest','Tunica de Bruma','uncommon','&#x1F52E;', {bonusMana:18,bonusDef:6}],
    ['mage_gloves','gloves','Guantes de Chispa','rare','&#x2728;', {bonusAtk:8,bonusMana:10}],
    ['mage_slippers','boots','Sandalias Astrales','epic','&#x1F303;', {bonusMana:16,bonusSpeed:6}],
    ['mage_codex','shield','Libro de Runas','legendary','&#x1F4D6;', {bonusDef:6,bonusCrit:8,bonusCritDmg:18,bonusMana:30}],
    ['mage_staff','weapon','Baculo Astral','mythic','&#x1FA84;', {bonusAtk:22,bonusCrit:8,bonusCritDmg:46,bonusMana:42}],
    ['mage_orbit','ring','Orbita del Eclipse','unique','&#x1F311;', {bonusCrit:16,bonusCritDmg:55,bonusMana:34}]
  ]),
  ...classArmory('priest', [
    ['priest_hood','helmet','Velo del Acólito','common','&#x2726;', {bonusMana:8,bonusDef:3}],
    ['priest_vestments','chest','Vestiduras de Alba','uncommon','&#x1F31E;', {bonusDef:9,bonusHp:14}],
    ['priest_gloves','gloves','Guantes de Oracion','rare','&#x1F64F;', {bonusMana:13,bonusCrit:4}],
    ['priest_sandals','boots','Sandalias del Santuario','epic','&#x1F463;', {bonusDef:6,bonusMana:16}],
    ['priest_relic','shield','Relicario Solar','legendary','&#x2600;', {bonusDef:17,bonusCritDmg:18,bonusMana:18}],
    ['priest_scepter','weapon','Cetro de Aurora','mythic','&#x2721;', {bonusAtk:20,bonusDef:10,bonusMana:28}],
    ['priest_halo','ring','Halo de la Primera Luz','unique','&#x1F31F;', {bonusDef:16,bonusCrit:13,bonusCritDmg:42,bonusMana:24}]
  ]),
  ...classArmory('assassin', [
    ['assassin_mask','helmet','Mascara de Ceniza','common','&#x1F3AD;', {bonusDef:3,bonusCrit:3}],
    ['assassin_leather','chest','Cuero de Sombra','uncommon','&#x1F319;', {bonusDef:8,bonusSpeed:4}],
    ['assassin_gloves','gloves','Guantes de Veneno','rare','&#x1F9E4;', {bonusAtk:9,bonusCrit:7}],
    ['assassin_boots','boots','Botas Silenciosas','epic','&#x1F47E;', {bonusSpeed:10,bonusCrit:5}],
    ['assassin_cloak','shield','Manto de Humo','legendary','&#x1F32B;', {bonusDef:8,bonusCrit:12,bonusSpeed:5}],
    ['assassin_daggers','weapon','Dagas Gemelas','mythic','&#x1F5E1;', {bonusAtk:24,bonusCrit:19,bonusCritDmg:22}],
    ['assassin_eye','ring','Ojo de la Noche','unique','&#x1F441;', {bonusCrit:24,bonusCritDmg:52,bonusSpeed:9}]
  ]),
  ...classArmory('tamer', [
    ['tamer_hat','helmet','Gorro del Cuidador','common','&#x1F9E2;', {bonusDef:4,bonusCrit:2}],
    ['tamer_vest','chest','Chaleco de Pieles','uncommon','&#x1F9E5;', {bonusDef:10,bonusHp:12}],
    ['tamer_gloves','gloves','Guantes de Bestia','rare','&#x1F43E;', {bonusAtk:7,bonusCrit:7}],
    ['tamer_boots','boots','Botas de Rastreador','epic','&#x1F43A;', {bonusDef:5,bonusSpeed:8}],
    ['tamer_charm','shield','Amuleto de Captura','legendary','&#x1F48E;', {bonusDef:12,bonusCrit:12,bonusMana:14}],
    ['tamer_whip','weapon','Latigo de Vinculo','mythic','&#x1F9A2;', {bonusAtk:23,bonusCrit:14,bonusCritDmg:18}],
    ['tamer_totem','ring','Totem de la Manada','unique','&#x1F43E;', {bonusDef:13,bonusCrit:20,bonusCritDmg:40,bonusHp:22}]
  ])
];

const RARITY_PROGRESS_ORDER = ['common','uncommon','rare','epic','legendary','mythic','unique'];
const RARITY_POWER_SCALE = { common:1, uncommon:1.6, rare:2.3, epic:3.3, legendary:4.6, mythic:6.4, unique:8.7, ancestral:12.5 };
const EQUIPMENT_CLASS_LABELS = { warrior:'Guerrero', archer:'Arquero', mage:'Mago', priest:'Sacerdote', assassin:'Asesino', tamer:'Domador' };
const RARITY_TITLE = { common:'Común', uncommon:'Poco común', rare:'Raro', epic:'Épico', legendary:'Legendario', mythic:'Mítico', unique:'Único', ancestral:'Ancestral' };

function scaleEquipmentBonuses(seed, targetRarity){
  const sourceScale = RARITY_POWER_SCALE[seed.rarityKey] || 1;
  const targetScale = RARITY_POWER_SCALE[targetRarity] || 1;
  const result = {};
  Object.entries(seed).forEach(([key,value])=>{
    if(key.startsWith('bonus') && typeof value==='number') result[key] = Math.max(1, Math.round((value/sourceScale)*targetScale));
  });
  return result;
}

function completeClassArmory(seeds){
  return seeds.flatMap(seed=>RARITY_PROGRESS_ORDER.map(rarityKey=>{
    const tier = ITEM_RARITIES[rarityKey];
    const isOriginalTier = rarityKey===seed.rarityKey;
    return {
      ...seed,
      ...scaleEquipmentBonuses(seed, rarityKey),
      id:isOriginalTier ? seed.id : `${seed.id}_${rarityKey}`,
      name:isOriginalTier ? seed.name : `${seed.name} · ${RARITY_TITLE[rarityKey]}`,
      rarity:tier.label,
      rarityKey,
      chance:tier.chance,
      price:tier.price,
      color:tier.color,
      glow:tier.glow,
      setId:seed.setId || (seed.classOnly ? `class-${seed.classOnly}` : 'traveler'),
      setLabel:seed.setLabel || (seed.classOnly ? `Armería de ${EQUIPMENT_CLASS_LABELS[seed.classOnly] || seed.classOnly}` : 'Equipo del Viajero'),
      equipmentTier:seed.equipmentTier || (seed.classOnly ? 'class' : 'base')
    };
  }));
}

/* ================= PROGRESIÓN DE SETS =================
   Base → Clase → Subclase → Ancestral. Los sets no sustituyen las rarezas;
   añaden una identidad al juntar 2, 4 y 7 piezas. */
const UNIVERSAL_SLOT_NAMES = {
  helmet:'Capucha de Camino', chest:'Jubón del Viajero', gloves:'Guantes de Marcha',
  boots:'Botas de Sendero', weapon:'Arma de Práctica', shield:'Talismán de Viaje', ring:'Anillo de Brújula'
};
const UNIVERSAL_GEAR_ART = Object.fromEntries(Object.keys(UNIVERSAL_SLOT_NAMES).map(type=>[
  type, `assets/images/equipment-pieces/traveler_${type}.webp`
]));
const UNIVERSAL_SLOT_ICONS = { helmet:'🧢', chest:'🥋', gloves:'🧤', boots:'🥾', weapon:'⚔', shield:'🧿', ring:'🧭' };
const UNIVERSAL_SET_BONUSES = [
  {pieces:2, bonuses:{hp:12}, label:'+12 Vida'},
  {pieces:4, bonuses:{def:4}, label:'+4 Defensa'},
  {pieces:7, bonuses:{speed:4}, label:'+4% Rapidez'}
];
const UNIVERSAL_EQUIPMENT_ITEMS = Object.keys(UNIVERSAL_SLOT_NAMES).map((type,index)=>{
  const tier=ITEM_RARITIES.common;
  const bonuses=[{bonusDef:2},{bonusHp:8},{bonusAtk:2},{bonusSpeed:2},{bonusAtk:4},{bonusMana:6},{bonusCrit:2}][index];
  return { id:`traveler-${type}`, type, name:UNIVERSAL_SLOT_NAMES[type], icon:UNIVERSAL_SLOT_ICONS[type], image:UNIVERSAL_GEAR_ART[type], rarity:tier.label, rarityKey:'common', chance:.65, price:Math.max(55,Math.round(tier.price*.62)), color:tier.color, glow:tier.glow, setId:'traveler', setLabel:'Equipo del Viajero', equipmentTier:'base', ...bonuses };
});

const SUBCLASS_SET_STYLES = {
  warrior:{
    guardian:{label:'Bastión del Guardián', affinity:'Fortaleza · defensa y vida', bonuses:[{pieces:2,bonuses:{def:6},label:'+6 Defensa'},{pieces:4,bonuses:{hp:28},label:'+28 Vida'},{pieces:7,bonuses:{def:10,crit:4},label:'+10 Defensa · +4% Crítico'}]},
    berserker:{label:'Pacto del Berserker', affinity:'Furia · ataque y crítico', bonuses:[{pieces:2,bonuses:{atk:7},label:'+7 Ataque'},{pieces:4,bonuses:{crit:7},label:'+7% Crítico'},{pieces:7,bonuses:{atk:15,critDmg:28},label:'+15 Ataque · +28% D.C.'}]}
  },
  archer:{
    sniper:{label:'Mirada del Tirador', affinity:'Precisión · crítico y daño', bonuses:[{pieces:2,bonuses:{crit:6},label:'+6% Crítico'},{pieces:4,bonuses:{atk:9},label:'+9 Ataque'},{pieces:7,bonuses:{crit:12,critDmg:30},label:'+12% Crítico · +30% D.C.'}]},
    ranger:{label:'Sendero del Explorador', affinity:'Movilidad · rapidez y supervivencia', bonuses:[{pieces:2,bonuses:{speed:5},label:'+5% Rapidez'},{pieces:4,bonuses:{hp:22},label:'+22 Vida'},{pieces:7,bonuses:{speed:11,crit:7},label:'+11% Rapidez · +7% Crítico'}]}
  },
  mage:{
    elementalist:{label:'Tempestad Elemental', affinity:'Potencia · maná y daño', bonuses:[{pieces:2,bonuses:{mana:18},label:'+18 Maná'},{pieces:4,bonuses:{atk:10},label:'+10 Ataque'},{pieces:7,bonuses:{mana:34,critDmg:34},label:'+34 Maná · +34% D.C.'}]},
    arcanist:{label:'Archivo del Arcanista', affinity:'Control · maná y crítico', bonuses:[{pieces:2,bonuses:{mana:20},label:'+20 Maná'},{pieces:4,bonuses:{crit:7},label:'+7% Crítico'},{pieces:7,bonuses:{mana:38,def:8},label:'+38 Maná · +8 Defensa'}]}
  },
  priest:{
    templar:{label:'Juramento del Templario', affinity:'Fe · defensa y vida', bonuses:[{pieces:2,bonuses:{def:5},label:'+5 Defensa'},{pieces:4,bonuses:{hp:26},label:'+26 Vida'},{pieces:7,bonuses:{def:10,mana:24},label:'+10 Defensa · +24 Maná'}]},
    oracle:{label:'Velo del Oráculo', affinity:'Presagio · maná y crítico', bonuses:[{pieces:2,bonuses:{mana:20},label:'+20 Maná'},{pieces:4,bonuses:{crit:7},label:'+7% Crítico'},{pieces:7,bonuses:{mana:36,critDmg:28},label:'+36 Maná · +28% D.C.'}]}
  },
  assassin:{
    shadow:{label:'Manto de la Sombra', affinity:'Sigilo · rapidez y crítico', bonuses:[{pieces:2,bonuses:{speed:6},label:'+6% Rapidez'},{pieces:4,bonuses:{crit:8},label:'+8% Crítico'},{pieces:7,bonuses:{speed:12,critDmg:30},label:'+12% Rapidez · +30% D.C.'}]},
    executioner:{label:'Marca del Verdugo', affinity:'Ejecución · ataque y crítico', bonuses:[{pieces:2,bonuses:{atk:8},label:'+8 Ataque'},{pieces:4,bonuses:{critDmg:18},label:'+18% D.C.'},{pieces:7,bonuses:{atk:16,crit:10},label:'+16 Ataque · +10% Crítico'}]}
  },
  tamer:{
    beastmaster:{label:'Manada Primordial', affinity:'Compañero · vida y ataque', bonuses:[{pieces:2,bonuses:{hp:20},label:'+20 Vida'},{pieces:4,bonuses:{atk:8},label:'+8 Ataque'},{pieces:7,bonuses:{hp:34,crit:8},label:'+34 Vida · +8% Crítico'}]},
    binder:{label:'Grillete Salvaje', affinity:'Vínculo · defensa y maná', bonuses:[{pieces:2,bonuses:{def:5},label:'+5 Defensa'},{pieces:4,bonuses:{mana:18},label:'+18 Maná'},{pieces:7,bonuses:{def:10,mana:32},label:'+10 Defensa · +32 Maná'}]}
  }
};
const SUBCLASS_SLOT_NAMES = { helmet:'Corona', chest:'Vestidura', gloves:'Guantes', boots:'Botas', weapon:'Arma', shield:'Reliquia', ring:'Sello' };
const ANCESTRAL_FORGE_ART = {
  warrior:'assets/images/equipment-sets/ancestral_warrior.webp',
  archer:'assets/images/equipment-sets/ancestral_archer.webp',
  mage:'assets/images/equipment-sets/ancestral_mage.webp',
  priest:'assets/images/equipment-sets/ancestral_priest.webp',
  assassin:'assets/images/equipment-sets/ancestral_assassin.webp',
  tamer:'assets/images/equipment-sets/ancestral_tamer.webp'
};
function subclassPieceArt(classOnly, subclassOnly, type){
  return `assets/images/equipment-pieces/${subclassOnly}_${type}.webp`;
}
function subclassArmory(){
  const result=[];
  Object.entries(SUBCLASS_SET_STYLES).forEach(([classOnly,paths])=>Object.entries(paths).forEach(([subclassOnly,style])=>{
    Object.keys(SUBCLASS_SLOT_NAMES).forEach((type,index)=>{
      const tier=ITEM_RARITIES.rare;
      const bonuses=[{bonusDef:4},{bonusHp:12},{bonusAtk:5},{bonusSpeed:3},{bonusAtk:9,bonusCrit:4},{bonusMana:10,bonusDef:3},{bonusCrit:6,bonusCritDmg:9}][index];
      result.push({ id:`subclass-${classOnly}-${subclassOnly}-${type}`, type, name:`${SUBCLASS_SLOT_NAMES[type]} de ${style.label}`, icon:'✦', image:subclassPieceArt(classOnly,subclassOnly,type), classOnly, subclassOnly, rarity:tier.label, rarityKey:'rare', chance:tier.chance, price:Math.round(tier.price*1.45), color:tier.color, glow:tier.glow, setId:`subclass-${classOnly}-${subclassOnly}`, setLabel:style.label, setAffinity:style.affinity, setBonuses:style.bonuses, equipmentTier:'subclass', ...bonuses });
    });
  }));
  return result;
}
const SUBCLASS_EQUIPMENT_ITEMS = subclassArmory();
const EQUIPMENT_SET_DEFS = {
  traveler:{ label:'Equipo del Viajero', affinity:'Adaptación · inicio de aventura', bonuses:UNIVERSAL_SET_BONUSES },
  ...Object.fromEntries(Object.keys(EQUIPMENT_CLASS_LABELS).map(classOnly=>[`class-${classOnly}`,{ label:`Armería de ${EQUIPMENT_CLASS_LABELS[classOnly]}`, affinity:'Disciplina de clase · set versátil', bonuses:[{pieces:2,bonuses:{def:4},label:'+4 Defensa'},{pieces:4,bonuses:{hp:18,atk:5},label:'+18 Vida · +5 Ataque'},{pieces:7,bonuses:{crit:7,critDmg:18},label:'+7% Crítico · +18% D.C.'}]}])),
  ...Object.fromEntries(SUBCLASS_EQUIPMENT_ITEMS.filter(item=>item.type==='helmet').map(item=>[item.setId,{label:item.setLabel,affinity:item.setAffinity,bonuses:item.setBonuses}]))
};

// Cada casco/velo, vestidura, guante, bota, arma y accesorio existe de Común a Único.
const CLASS_EQUIPMENT_ITEMS = completeClassArmory(CLASS_ARMORY_SEEDS);
const SHOP_EQUIPMENT_ITEMS = [...UNIVERSAL_EQUIPMENT_ITEMS, ...CLASS_EQUIPMENT_ITEMS, ...SUBCLASS_EQUIPMENT_ITEMS];

// Piezas exclusivas de la Herrería: un tier propio (Ancestral) que nunca aparece en la tienda ni en el botín.
// Una pieza Ancestral por cada ranura de cada clase (parte de la versión Única de la tienda y la escala hacia arriba).

/* ================= CLASES (continuación: misiones, logros, ranuras de equipo) ================= */
const MISSION_DEFS = {
  day:[
    {key:'hunts', target:15, label:'Cazar 15 monstruos', reward:{gold:200, exp:100}},
    {key:'goldEarned', target:500, label:'Conseguir 500 de oro', reward:{gold:0, exp:250}},
    {key:'levelsGained', target:3, label:'Subir 3 niveles', reward:{gold:400, exp:0}},
    {key:'fishCaught', target:5, label:'Pescar 5 veces', reward:{gold:150, exp:80}},
  ],
  week:[
    {key:'wins', target:50, label:'Ganar 50 combates', reward:{gold:1000, exp:0}},
    {key:'resets', target:1, label:'Realizar 1 reset', reward:{gold:2000, exp:0}},
    {key:'fishRare', target:3, label:'Pescar 3 peces Raros o mejores', reward:{gold:900, exp:0}},
  ],
  month:[
    {key:'resets', target:5, label:'Realizar 5 resets', reward:{gold:5000, exp:0}},
    {key:'goldEarned', target:8000, label:'Conseguir 8000 de oro', reward:{gold:3000, exp:0}},
  ],
};

const ACHIEVEMENTS = [
  { id:'lvl10',    label:'Alcanzar nivel 10',                    check:s=>s.maxLevelEver>=10,               reward:{gold:100} },
  { id:'lvl25',    label:'Alcanzar nivel 25',                    check:s=>s.maxLevelEver>=25,               reward:{gold:400} },
  { id:'lvl50max', label:'Alcanzar nivel 50 (máximo)',           check:s=>s.maxLevelEver>=50,               reward:{gold:800} },
  { id:'reset1',   label:'Hacer tu primer reset',                check:s=>s.resets>=1,                      reward:{gold:1000} },
  { id:'reset5',   label:'Llegar a 5 resets',                    check:s=>s.resets>=5,                      reward:{gold:3000} },
  { id:'reset10',  label:'Llegar a 10 resets',                   check:s=>s.resets>=10,                     reward:{gold:6000} },
  { id:'wins50',   label:'Ganar 50 combates en total',           check:s=>(s.totalWins||0)>=50,             reward:{gold:500} },
  { id:'wins200',  label:'Ganar 200 combates en total',          check:s=>(s.totalWins||0)>=200,            reward:{gold:2000} },
  { id:'boss1',    label:'Derrotar a tu primer Jefe',            check:s=>(s.totalBossWins||0)>=1,          reward:{gold:600} },
  { id:'boss10',   label:'Derrotar 10 Jefes',                    check:s=>(s.totalBossWins||0)>=10,         reward:{gold:3500} },
  { id:'richLife', label:'Acumular 10.000 de oro en total',      check:s=>(s.totalGoldEarnedLifetime||0)>=10000, reward:{gold:1000} },
  { id:'fullSet',  label:'Equipar las 7 piezas de equipo',       check:s=>Object.values(s.equipment).filter(Boolean).length>=7, reward:{gold:1500} },
  { id:'depth5',   label:'Alcanzar profundidad 5 en la Cacería Roguelike',   check:s=>(s.maxHuntDepth||0)>=5,   reward:{gold:300} },
  { id:'depth10',  label:'Alcanzar profundidad 10 en la Cacería Roguelike',  check:s=>(s.maxHuntDepth||0)>=10,  reward:{gold:900} },
  { id:'depth20',  label:'Alcanzar profundidad 20 en la Cacería Roguelike',  check:s=>(s.maxHuntDepth||0)>=20,  reward:{gold:2500} },
  { id:'campaign1',label:'Completar una Cacería hasta el final',             check:s=>(s.campaignWins||0)>=1,   reward:{gold:5000} },
  { id:'forge5',   label:'Forjar una pieza a +5',                            check:s=>(s.ownedEquipment||[]).some(item=>(item.enhanceLevel||0)>=5), reward:{gold:2500} },
  { id:'fishLegend', label:'Pescar un pez legendario',                       check:s=>s.fishing && s.fishing.bestRarity==='legendary', reward:{gold:2000} },
];
function playerTitle(){
  if((state.campaignWins||0)>=1) return '♛ Conquistador del Abismo';
  if((state.totalBossWins||0)>=10) return '☠ Señor de los Guardianes';
  if((state.maxHuntDepth||0)>=20) return '✦ Explorador de las Profundidades';
  if((state.totalWins||0)>=50) return '⚔ Cazador Veterano';
  return '✧ Aventurero de Forja Eterna';
}

// Cada clase parte de la misma fórmula, pero recibe bonos iniciales moderados
// que refuerzan su rol desde la primera pelea sin volver inútil el equipo.
const CLASSES = {
  warrior:  { label:'Guerrero', icon:'⚔', description:'Más vida y robustez · bloquea impactos y responde con contraataques.', hp:15, mana:0, atk:0, def:2, crit:0, dodge:0, speed:0, skillMult:1, manaCost:.30 },
  archer:   { label:'Arquero', icon:'🏹', description:'Más precisión y rapidez · encadena flechas y provoca sangrado.', hp:0, mana:0, atk:0, def:0, crit:5, dodge:0, speed:3, skillMult:1, manaCost:.28 },
  mage:     { label:'Mago', icon:'✦', description:'Mayor reserva de maná · acumula cargas para desatar una Nova Astral.', hp:0, mana:18, atk:0, def:0, crit:0, dodge:0, speed:0, skillMult:1.15, manaCost:.26 },
  priest:   { label:'Sacerdote', icon:'✚', description:'Misma base universal · recupera vida y concede protección.', hp:0, mana:0, atk:0, def:0, crit:0, dodge:0, speed:0, skillMult:1.1, manaCost:.22 },
  assassin: { label:'Asesino', icon:'🗡', description:'Misma base universal · ejecuta enemigos debilitados.', hp:0, mana:0, atk:0, def:0, crit:0, dodge:0, speed:0, skillMult:1.15, manaCost:.30 },
  tamer:    { label:'Domador', icon:'🪢', description:'Misma base universal · puede capturar un compañero para la expedición.', hp:0, mana:0, atk:0, def:0, crit:0, dodge:0, speed:0, skillMult:1.08, manaCost:.27 }
};

const SUBCLASSES = {
  warrior: {
    guardian:{ label:'Guardián', icon:'🛡', image:'assets/images/subclasses/warrior_guardian.webp', description:'Resiste golpes fuertes y protege su avance.', bonuses:{hp:25,def:4} },
    berserker:{ label:'Berserker', icon:'🪓', image:'assets/images/subclasses/warrior_berserker.webp', description:'Sacrifica seguridad por ataques brutales.', bonuses:{atk:3,critDmg:25} }
  },
  archer: {
    sniper:{ label:'Francotirador', icon:'◎', image:'assets/images/subclasses/archer_sniper.webp', description:'Golpes precisos y críticos más frecuentes.', bonuses:{atk:3,crit:6} },
    ranger:{ label:'Explorador', icon:'🌿', image:'assets/images/subclasses/archer_ranger.webp', description:'Movilidad, evasión y ataques encadenados.', bonuses:{dodge:5,speed:5} }
  },
  mage: {
    elementalist:{ label:'Elementalista', icon:'🔥', image:'assets/images/subclasses/mage_elementalist.webp', description:'Potencia al máximo el daño de habilidades.', bonuses:{mana:18,skillMult:.14} },
    arcanist:{ label:'Arcanista', icon:'✧', image:'assets/images/subclasses/mage_arcanist.webp', description:'Conserva maná para lanzar más hechizos.', bonuses:{mana:30,manaDiscount:.12} }
  },
  priest: {
    templar:{ label:'Templario', icon:'⚜', image:'assets/images/subclasses/priest_templar.webp', description:'Fe convertida en vida y defensa.', bonuses:{hp:20,def:3} },
    oracle:{ label:'Oráculo', icon:'☀', image:'assets/images/subclasses/priest_oracle.webp', description:'Milagros más poderosos y eficientes.', bonuses:{mana:22,skillMult:.10,manaDiscount:.06} }
  },
  assassin: {
    shadow:{ label:'Sombra', icon:'☾', image:'assets/images/subclasses/assassin_shadow.webp', description:'Evita ataques y golpea antes de ser visto.', bonuses:{dodge:7,speed:4} },
    executioner:{ label:'Verdugo', icon:'🗡', image:'assets/images/subclasses/assassin_executioner.webp', description:'Críticos mucho más peligrosos.', bonuses:{atk:2,crit:4,critDmg:35} }
  },
  tamer: {
    beastmaster:{ label:'Maestro de Bestias', icon:'🐾', image:'assets/images/subclasses/tamer_beastmaster.webp', description:'Su compañero ataca más seguido y con más fuerza.', bonuses:{companionRate:.16,companionPower:.22} },
    binder:{ label:'Vinculador', icon:'⧉', image:'assets/images/subclasses/tamer_binder.webp', description:'Refuerza el vínculo con maná y protección.', bonuses:{mana:20,def:2,manaDiscount:.08} }
  }
};

const CLASS_EMBLEMS = {
  warrior:'assets/images/class_warrior_emblem_v2.webp',
  archer:'assets/images/class_archer_emblem_v2.webp',
  mage:'assets/images/class_mage_emblem_v2.webp',
  priest:'assets/images/class_priest_emblem_v2.webp',
  assassin:'assets/images/class_assassin_emblem_v2.webp',
  tamer:'assets/images/class_tamer_emblem_v2.webp'
};
// Emblemas de equipamiento para la vitrina del héroe. A diferencia del arte
// completo del personaje, estos sellos se leen bien dentro del maniquí y
// conservan la identidad de cada subclase.
const SUBCLASS_EQUIPMENT_EMBLEMS = {
  'warrior-guardian':'assets/images/equipment-sets/guardian.webp',
  'warrior-berserker':'assets/images/equipment-sets/berserker.webp',
  'archer-sniper':'assets/images/equipment-sets/sniper.webp',
  'archer-ranger':'assets/images/equipment-sets/ranger.webp',
  'mage-elementalist':'assets/images/equipment-sets/elementalist.webp',
  'mage-arcanist':'assets/images/equipment-sets/arcanist.webp',
  'priest-templar':'assets/images/equipment-sets/templar.webp',
  'priest-oracle':'assets/images/equipment-sets/oracle.webp',
  'assassin-shadow':'assets/images/equipment-sets/shadow.webp',
  'assassin-executioner':'assets/images/equipment-sets/executioner.webp',
  'tamer-beastmaster':'assets/images/equipment-sets/beastmaster.webp',
  'tamer-binder':'assets/images/equipment-sets/binder.webp'
};
function equipmentHeroEmblem(classId, subclassId){
  const classKey = classId || 'warrior';
  const subclassKey = subclassId ? `${classKey}-${subclassId}` : '';
  return SUBCLASS_EQUIPMENT_EMBLEMS[subclassKey]
    || (CLASS_EQUIPMENT_ART[classKey] || CLASS_EQUIPMENT_ART.warrior).weapon;
}
function classEmblem(classId, variant='inline'){
  const fallback = CLASSES[classId] || CLASSES.warrior;
  const src = CLASS_EMBLEMS[classId] || CLASS_EMBLEMS.warrior;
  return `<img class="class-emblem ${variant}" src="${src}" alt="${fallback.label}" decoding="async">`;
}

const CLASS_EQUIPMENT_SLOTS = {
  warrior: {
    helmet:{ icon:'🪖', label:'Yelmo' }, chest:{ icon:'🥋', label:'Coraza' }, weapon:{ icon:'⚔', label:'Espada' }, shield:{ icon:'🛡', label:'Escudo' }, gloves:{ icon:'🥊', label:'Guanteletes' }, ring:{ icon:'💍', label:'Sello' }, boots:{ icon:'🥾', label:'Grebas' }
  },
  archer: {
    helmet:{ icon:'🏕', label:'Capucha' }, chest:{ icon:'🏹', label:'Chaleco' }, weapon:{ icon:'🏹', label:'Arco' }, shield:{ icon:'🎯', label:'Carcaj y Flechas' }, gloves:{ icon:'🧤', label:'Guantes de Tirador' }, ring:{ icon:'✨', label:'Aro de Estrella' }, boots:{ icon:'💨', label:'Botas del Viento' }
  },
  mage: {
    helmet:{ icon:'🧙', label:'Sombrero de Mago' }, chest:{ icon:'🧥', label:'Túnica' }, weapon:{ icon:'🪄', label:'Báculo' }, shield:{ icon:'📖', label:'Libro de Runas' }, gloves:{ icon:'✨', label:'Guantes Arcanos' }, ring:{ icon:'🔮', label:'Orbe' }, boots:{ icon:'🌌', label:'Sandalias Astrales' }
  },
  priest: {
    helmet:{ icon:'✦', label:'Velo Sagrado' }, chest:{ icon:'👘', label:'Vestiduras' }, weapon:{ icon:'✝', label:'Cetro de Aurora' }, shield:{ icon:'☀', label:'Relicario Solar' }, gloves:{ icon:'🙏', label:'Guantes de Oración' }, ring:{ icon:'🌟', label:'Halo' }, boots:{ icon:'👣', label:'Sandalias del Santuario' }
  },
  assassin: {
    helmet:{ icon:'🎭', label:'Máscara' }, chest:{ icon:'🥷', label:'Cuero de Sombra' }, weapon:{ icon:'🗡', label:'Dagas Gemelas' }, shield:{ icon:'🌫', label:'Manto de Humo' }, gloves:{ icon:'🧤', label:'Guantes de Veneno' }, ring:{ icon:'👁', label:'Ojo de la Noche' }, boots:{ icon:'👣', label:'Botas Silenciosas' }
  },
  tamer: {
    helmet:{ icon:'🤠', label:'Gorro de Cuidador' }, chest:{ icon:'🧥', label:'Chaleco de Pieles' }, weapon:{ icon:'🪢', label:'Látigo de Vínculo' }, shield:{ icon:'💠', label:'Amuleto de Captura' }, gloves:{ icon:'🐾', label:'Guantes de Bestia' }, ring:{ icon:'🐾', label:'Tótem de Manada' }, boots:{ icon:'🐺', label:'Botas de Rastreador' }
  }
};
function equipmentSlotMeta(slot){
  const set = CLASS_EQUIPMENT_SLOTS[state.characterClass] || CLASS_EQUIPMENT_SLOTS.warrior;
  return set[slot] || { icon:'✦', label:slot };
}
function itemFitsCurrentClass(item){
  return !!item && (!item.classOnly || item.classOnly === state.characterClass) && (!item.subclassOnly || item.subclassOnly === state.subclass);
}
function itemCompatibilityMeta(item){
  if(!item) return { key:'incompatible', label:'INCOMPATIBLE', equippable:false };
  if(!item.classOnly && !item.subclassOnly){
    return { key:'universal', label:'UNIVERSAL · TODAS LAS CLASES', equippable:true };
  }
  const ownerClass = CLASSES[item.classOnly] || null;
  const classLabel = ownerClass?.label || 'OTRA CLASE';
  const subclassLabel = item.subclassOnly
    ? (SUBCLASSES[item.classOnly]?.[item.subclassOnly]?.label || item.subclassOnly)
    : '';
  const fits = itemFitsCurrentClass(item);
  const owner = subclassLabel ? `${classLabel} · ${subclassLabel}` : classLabel;
  return {
    key:fits ? 'compatible' : 'incompatible',
    label:fits ? `PROPIO · ${owner}` : `INCOMPATIBLE · SOLO ${owner}`,
    equippable:fits
  };
}
let state = null;
let activeCharacterId = null;
let selectedClassId = 'warrior';
let activeHeroTab = 'gear';
let activeGuildTab = 'shop';
let activeTradeView = 'buy';
let tradeListingsCache = [];
let tradeListingsLoaded = false;
let tabListenersInitialized = false;
let activeLbTab = 'lb';
let activeProfileView = 'home';
let activeOptionsView = 'home';
let battle = null;
let battleSequence = 0;
let winStreak = 0;
let huntMode = 'run'; // Siempre 'run' (roguelike). Existió un modo 'free' de
// cacería clásica (peleas sueltas por dificultad); se eliminó junto con su
// UI (#tierGrid, #huntModeToggle) porque quedó inalcanzable sin botón.
let runState = null;
let fishCast = null;
let fishCastSeq = 0;
let fishNeedleFrame = null;
let fishCastFrame = null;
let fishReelReleaseHandler = null;
