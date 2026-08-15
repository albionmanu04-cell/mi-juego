(function(root,factory){
  'use strict';
  root.RankedInventoryCore=factory();
})(typeof globalThis!=='undefined' ? globalThis : window,function(){
  'use strict';

  const WIDTH=4;
  const HEIGHT=4;
  const SECURE_SLOTS=2;
  const EQUIPMENT_SLOTS=['weapon','armor','relic'];
  const SEASON=Object.freeze({
    id:'season-1-frontera-quebrada',
    number:1,
    name:'La Frontera Quebrada',
    startsAt:'2026-08-11T03:00:00.000Z',
    endsAt:'2026-10-06T02:59:59.000Z'
  });
  const DIFFICULTY_CURVE=[
    {label:'CONTROLADA',hpBonus:0,attackBonus:0},
    {label:'CRECIENTE',hpBonus:5,attackBonus:0},
    {label:'PELIGROSA',hpBonus:10,attackBonus:1},
    {label:'EXTREMA',hpBonus:16,attackBonus:2},
    {label:'LETAL',hpBonus:24,attackBonus:3}
  ];
  const TEMPLATES={
    slime_core:{name:'Núcleo de limo',kind:'material',tier:'comun',w:1,h:1,maxStack:8,icon:'◉',value:18,secure:true,source:'Limo del pantano'},
    refined_gel:{name:'Gel refinado',kind:'material',tier:'poco_comun',w:1,h:1,maxStack:6,icon:'⬡',value:42,secure:true,source:'Limo veterano'},
    wolf_fang:{name:'Colmillo de lobo',kind:'material',tier:'comun',w:1,h:1,maxStack:8,icon:'⌁',value:24,secure:true,source:'Lobo de ceniza'},
    wolf_hide:{name:'Piel de lobo',kind:'material',tier:'poco_comun',w:2,h:1,maxStack:4,icon:'≈',value:58,secure:false,source:'Lobo alfa'},
    alpha_heart:{name:'Corazón alfa',kind:'material',tier:'raro',w:1,h:1,maxStack:3,icon:'◆',value:115,secure:true,source:'Lobo alfa'},
    spider_silk:{name:'Seda umbría',kind:'material',tier:'poco_comun',w:1,h:2,maxStack:4,icon:'⌘',value:54,secure:false,source:'Araña umbría'},
    venom_gland:{name:'Glándula de veneno',kind:'material',tier:'raro',w:1,h:1,maxStack:4,icon:'✦',value:98,secure:true,source:'Matriarca arácnida'},
    spore_cap:{name:'Sombrero de esporas',kind:'material',tier:'comun',w:1,h:1,maxStack:8,icon:'♧',rankedArt:'material-spore',artImage:'assets/images/ranked-spore-cap-v1.webp',value:26,secure:true,source:'Hongo esporoso'},
    moss_plate:{name:'Placa de musgo pétreo',kind:'material',tier:'poco_comun',w:2,h:1,maxStack:4,icon:'▰',rankedArt:'material-moss',value:64,secure:false,source:'Gólem musgoso'},
    grave_dust:{name:'Polvo sepulcral',kind:'material',tier:'poco_comun',w:1,h:1,maxStack:6,icon:'∴',rankedArt:'material-grave',value:48,secure:true,source:'Cripta fronteriza'},
    witch_ichor:{name:'Icor de bruja',kind:'material',tier:'raro',w:1,h:1,maxStack:4,icon:'☾',rankedArt:'material-ichor',value:112,secure:true,source:'Bruja del pantano'},
    bronze_core:{name:'Núcleo de bronce',kind:'material',tier:'raro',w:1,h:1,maxStack:4,icon:'◈',rankedArt:'material-bronze',value:126,secure:true,source:'Autómata de bronce'},
    obsidian_shard:{name:'Fragmento de obsidiana',kind:'material',tier:'raro',w:1,h:2,maxStack:4,icon:'◩',rankedArt:'material-obsidian',value:138,secure:false,source:'Gárgola de obsidiana'},
    basilisk_eye:{name:'Ojo de basilisco',kind:'material',tier:'epico',w:1,h:1,maxStack:3,icon:'◉',rankedArt:'material-eye',value:196,secure:true,source:'Basilisco del pantano'},
    crystal_carapace:{name:'Caparazón de cristal',kind:'material',tier:'epico',w:2,h:1,maxStack:3,icon:'❖',rankedArt:'material-carapace',value:224,secure:false,source:'Matriarca de cristal'},
    runic_scale:{name:'Escama rúnica',kind:'material',tier:'epico',w:1,h:1,maxStack:3,icon:'✹',rankedArt:'material-rune',artImage:'assets/images/ranked-runic-scale-v1.webp',value:238,secure:true,source:'Quimera rúnica'},
    storm_scale:{name:'Escama de tormenta',kind:'material',tier:'epico',w:2,h:1,maxStack:3,icon:'ϟ',rankedArt:'material-storm',value:252,secure:false,source:'Dragón azul del umbral'},
    field_potion:{name:'Poción de campaña',kind:'consumible',tier:'poco_comun',w:1,h:2,maxStack:2,icon:'⚗',value:78,secure:false,source:'Alijo perdido',heal:34,artImage:'assets/images/ranked-potion-campaign-v2.webp'},
    handmade_dagger:{name:'Daga improvisada',kind:'arma',tier:'comun',w:1,h:2,maxStack:1,icon:'†',value:86,secure:false,source:'Saqueador caído',attackBonus:6},
    leather_armor:{name:'Coraza de acechador',kind:'armadura',tier:'raro',w:2,h:3,maxStack:1,icon:'♜',value:240,secure:false,source:'Artesanía de temporada',hpBonus:28},
    fang_blade:{name:'Filo de colmillo',kind:'arma',tier:'poco_comun',w:1,h:3,maxStack:1,icon:'⟋',art:'fang',value:230,secure:false,source:'Taller de extracción',attackBonus:9,onHitStatus:'bleed',statusChance:.45},
    venom_blades:{name:'Dagas de la viuda',kind:'arma',tier:'raro',w:2,h:2,maxStack:1,icon:'⋈',art:'widow',value:410,secure:false,source:'Taller de extracción',attackBonus:13,onHitStatus:'poison',statusChance:.7},
    alpha_armor:{name:'Coraza del alfa',kind:'armadura',tier:'raro',w:2,h:3,maxStack:1,icon:'♛',art:'alpha',value:480,secure:false,source:'Taller de extracción',hpBonus:42},
    matriarch_charm:{name:'Talismán de la Matriarca',kind:'reliquia',tier:'epico',w:1,h:1,maxStack:1,icon:'✥',art:'matriarch',value:760,secure:true,source:'Taller de extracción',attackBonus:3,hpBonus:12,guardBonus:12,regenOnKill:2}
    ,mossguard_plate:{name:'Coraza del Musgoguarda',kind:'armadura',tier:'poco_comun',w:2,h:3,maxStack:1,icon:'▰',rankedArt:'equipment-mossguard',value:340,secure:false,source:'Taller de extracción',hpBonus:24,guardBonus:8,thorns:3}
    ,crypt_bow:{name:'Arco de la Cripta',kind:'arma',tier:'raro',w:2,h:3,maxStack:1,icon:'↝',rankedArt:'equipment-cryptbow',value:430,secure:false,source:'Taller de extracción',attackBonus:11,enemyGuardPierce:.7}
    ,witch_reliquary:{name:'Relicario de la Ciénaga',kind:'reliquia',tier:'raro',w:1,h:1,maxStack:1,icon:'☾',rankedArt:'equipment-reliquary',value:470,secure:true,source:'Taller de extracción',hpBonus:10,statusResist:1,regenOnKill:1}
    ,bronze_coil:{name:'Bobina del Autómata',kind:'reliquia',tier:'raro',w:1,h:2,maxStack:1,icon:'◈',rankedArt:'equipment-coil',value:520,secure:true,source:'Taller de extracción',attackBonus:2,guardBonus:6,openingGuard:true}
    ,basilisk_blade:{name:'Fauce del Basilisco',kind:'arma',tier:'epico',w:2,h:3,maxStack:1,icon:'◉',rankedArt:'equipment-basilisk',value:720,secure:false,source:'Taller de extracción',attackBonus:15,onHitStatus:'poison',statusChance:.55,executeBonus:.2}
    ,obsidian_plate:{name:'Égida de Obsidiana',kind:'armadura',tier:'epico',w:2,h:3,maxStack:1,icon:'◩',rankedArt:'equipment-obsidian',value:780,secure:false,source:'Taller de extracción',hpBonus:46,guardBonus:15,thorns:5}
    ,runic_prism:{name:'Prisma de la Quimera',kind:'reliquia',tier:'epico',w:1,h:2,maxStack:1,icon:'✹',rankedArt:'equipment-prism',value:910,secure:true,source:'Taller de extracción',attackBonus:5,hpBonus:18,statusResist:1,regenOnKill:2}
    ,storm_cleaver:{name:'Partetormentas del Umbral',kind:'arma',tier:'epico',w:2,h:3,maxStack:1,icon:'ϟ',rankedArt:'equipment-storm',value:980,secure:false,source:'Taller de extracción',attackBonus:19,enemyGuardPierce:.8,executeBonus:.15}
  };
  const RECIPES={
    field_potion:{name:'Poción de campaña',description:'Una poción de emergencia que recupera 34 de vida durante una incursión.',output:'field_potion',outputQty:1,unlockSector:0,inputs:{slime_core:3,refined_gel:2}},
    fang_blade:{name:'Filo de colmillo',description:'Arma estrecha y ligera. Aumenta el daño de ataque en 9.',output:'fang_blade',outputQty:1,unlockSector:2,inputs:{wolf_fang:5,wolf_hide:2}},
    venom_blades:{name:'Dagas de la viuda',description:'Par de hojas envenenadas. Aumenta el daño de ataque en 13.',output:'venom_blades',outputQty:1,unlockSector:3,inputs:{spider_silk:4,venom_gland:2,refined_gel:1}},
    alpha_armor:{name:'Coraza del alfa',description:'Armadura de caza mayor. Aumenta la vida máxima en 42.',output:'alpha_armor',outputQty:1,unlockSector:4,inputs:{wolf_hide:4,alpha_heart:2,spider_silk:2}},
    mossguard_plate:{name:'Coraza del Musgoguarda',description:'Armadura viva que mejora vida y cobertura y devuelve daño al atacante.',output:'mossguard_plate',outputQty:1,unlockSector:1,inputs:{moss_plate:3,slime_core:4,refined_gel:2}},
    crypt_bow:{name:'Arco de la Cripta',description:'Arma de precisión que atraviesa gran parte de la guardia enemiga.',output:'crypt_bow',outputQty:1,unlockSector:2,inputs:{grave_dust:4,wolf_fang:4,spider_silk:1}},
    witch_reliquary:{name:'Relicario de la Ciénaga',description:'Reduce la duración de estados y concede regeneración tras una victoria.',output:'witch_reliquary',outputQty:1,unlockSector:3,inputs:{witch_ichor:2,spore_cap:3,refined_gel:2}},
    bronze_coil:{name:'Bobina del Autómata',description:'Inicia cada incursión en cobertura y estabiliza ataque y defensa.',output:'bronze_coil',outputQty:1,unlockSector:3,inputs:{bronze_core:2,refined_gel:3,spider_silk:2}},
    basilisk_blade:{name:'Fauce del Basilisco',description:'Hoja tóxica que ejecuta con más fuerza a enemigos afectados.',output:'basilisk_blade',outputQty:1,unlockSector:4,inputs:{basilisk_eye:1,venom_gland:3,obsidian_shard:1}},
    obsidian_plate:{name:'Égida de Obsidiana',description:'Armadura pesada con gran vida, cobertura y represalia de daño.',output:'obsidian_plate',outputQty:1,unlockSector:4,inputs:{obsidian_shard:4,moss_plate:2,alpha_heart:1}},
    matriarch_charm:{name:'Talismán de la Matriarca',description:'Reliquia épica protegible: daño, vida, cobertura y regeneración.',output:'matriarch_charm',outputQty:1,unlockSector:5,inputs:{crystal_carapace:3,venom_gland:3,spider_silk:4}},
    runic_prism:{name:'Prisma de la Quimera',description:'Reliquia final que combina poder, vida, resistencia y regeneración.',output:'runic_prism',outputQty:1,unlockSector:5,inputs:{runic_scale:3,bronze_core:2,crystal_carapace:1}},
    storm_cleaver:{name:'Partetormentas del Umbral',description:'Arma final que perfora defensas y remata enemigos heridos o afectados.',output:'storm_cleaver',outputQty:1,unlockSector:5,inputs:{storm_scale:3,obsidian_shard:3,alpha_heart:2}}
  };
  const DIVISIONS=[
    {id:'iron',name:'Hierro',floor:0,color:'#84908a'},
    {id:'bronze',name:'Bronce',floor:250,color:'#b47b52'},
    {id:'silver',name:'Plata',floor:600,color:'#aebbc0'},
    {id:'gold',name:'Oro',floor:1000,color:'#d8b957'},
    {id:'obsidian',name:'Obsidiana',floor:1500,color:'#9b7ccc'},
    {id:'eternal',name:'Eterno',floor:2200,color:'#73d6ac'}
  ];
  const PRESEASON_MISSION_DEFS=[
    {id:'extractor',name:'Regreso seguro',description:'Completá 2 extracciones.',metric:'extractions',goal:2,rewardXp:60},
    {id:'hunter',name:'Cazador de frontera',description:'Derrotá 8 criaturas.',metric:'mobsDefeated',goal:8,rewardXp:60},
    {id:'artisan',name:'Manos de forja',description:'Fabricá 3 piezas.',metric:'crafted',goal:3,rewardXp:45},
    {id:'deep_run',name:'Sin mirar atrás',description:'Alcanzá el sector 5.',metric:'bestSector',goal:5,rewardXp:90},
    {id:'wealth',name:'Carga valiosa',description:'Extraé 1800 de valor acumulado.',metric:'lootValue',goal:1800,rewardXp:90}
  ];
  const PRESEASON_REWARD_TRACK=[
    {level:1,xp:125,templateId:'slime_core',qty:4},
    {level:2,xp:300,templateId:'refined_gel',qty:2},
    {level:3,xp:525,templateId:'wolf_fang',qty:4},
    {level:4,xp:800,templateId:'spider_silk',qty:2},
    {level:5,xp:1150,templateId:'alpha_heart',qty:1}
  ];
  const MISSION_DEFS=[
    {id:'extractor',name:'Regreso seguro',description:'Completá 3 extracciones esta temporada.',metric:'extractions',goal:3,rewardXp:110},
    {id:'hunter',name:'Cazador de frontera',description:'Derrotá 15 criaturas esta temporada.',metric:'mobsDefeated',goal:15,rewardXp:120},
    {id:'artisan',name:'Manos de forja',description:'Fabricá 5 piezas esta temporada.',metric:'crafted',goal:5,rewardXp:100},
    {id:'deep_run',name:'Sin mirar atrás',description:'Alcanzá el sector 5.',metric:'bestSector',goal:5,rewardXp:140},
    {id:'wealth',name:'Carga valiosa',description:'Extraé 4000 de valor esta temporada.',metric:'lootValue',goal:4000,rewardXp:150},
    {id:'veteran',name:'Veterano de la grieta',description:'Completá 8 extracciones esta temporada.',metric:'extractions',goal:8,rewardXp:180},
    {id:'exterminator',name:'La frontera responde',description:'Derrotá 40 criaturas esta temporada.',metric:'mobsDefeated',goal:40,rewardXp:210},
    {id:'fortune',name:'Fortuna quebrada',description:'Extraé 10000 de valor esta temporada.',metric:'lootValue',goal:10000,rewardXp:240}
  ];
  const REWARD_TRACK=[
    {level:1,xp:125,templateId:'slime_core',qty:4},
    {level:2,xp:300,templateId:'refined_gel',qty:2},
    {level:3,xp:525,templateId:'wolf_fang',qty:4},
    {level:4,xp:800,templateId:'spider_silk',qty:2},
    {level:5,xp:1150,templateId:'alpha_heart',qty:1},
    {level:6,xp:1500,templateId:'grave_dust',qty:4},
    {level:7,xp:1900,templateId:'bronze_core',qty:2},
    {level:8,xp:2350,templateId:'obsidian_shard',qty:2},
    {level:9,xp:2850,templateId:'runic_scale',qty:1},
    {level:10,xp:3400,templateId:'storm_scale',qty:1}
  ];
  const ENCOUNTER_POOLS=[
    [
      {id:'slime_marsh',name:'Limo de Ciénaga',icon:'◉',image:'assets/images/ranked-slimes/limo-cienaga-comun.webp',tier:'comun',weight:52,role:'REGENERADOR',hp:34,atk:7,pattern:['attack','regen','heavy'],trait:{id:'renewal',name:'Núcleo renovable',description:'Su núcleo recompone la masa dañada durante el combate.',regenBonus:5},loot:[['slime_core',2,4,1],['refined_gel',1,1,.25],['spore_cap',1,1,.12]]},
      {id:'slime_corrosive',name:'Limo Corrosivo',icon:'✦',image:'assets/images/ranked-slimes/limo-corrosivo-poco-comun.webp',tier:'comun_plus',weight:27,role:'CORROSIVO',hp:38,atk:8,pattern:['poison','attack','heavy','poison'],trait:{id:'corrosion',name:'Masa cáustica',description:'Sus ataques ácidos prolongan el veneno y castigan combates largos.',statusBonus:1},loot:[['slime_core',2,4,1],['refined_gel',1,2,.7],['venom_gland',1,1,.12]]},
      {id:'slime_crystal',name:'Limo Cristalino',icon:'◆',image:'assets/images/ranked-slimes/limo-cristalino-raro.webp',tier:'poco_comun',weight:13,role:'DEFENSOR',hp:46,atk:7,pattern:['guard','attack','stun','heavy'],trait:{id:'crystal_shell',name:'Coraza prismática',description:'Comienza protegido y utiliza sus placas para interrumpir tu ofensiva.',openingGuard:true},loot:[['slime_core',2,4,1],['refined_gel',1,2,1],['moss_plate',1,1,.28],['crystal_carapace',1,1,.12]]},
      {id:'slime_runic',name:'Limo Rúnico',icon:'✧',image:'assets/images/ranked-slimes/limo-runico-epico.webp',tier:'epico',weight:6,role:'ARCANO',hp:58,atk:9,pattern:['stun','guard','heavy','regen','attack'],trait:{id:'runic_matrix',name:'Matriz rúnica',description:'Alterna control y protección antes de descargar el poder acumulado de sus runas.',openingGuard:true,statusBonus:1,regenBonus:3},loot:[['slime_core',3,5,1],['refined_gel',2,3,1],['crystal_carapace',1,1,.35],['obsidian_shard',1,1,.2]]},
      {id:'slime_primordial',name:'Limo Primordial',icon:'♛',image:'assets/images/ranked-slimes/limo-primordial-legendario-v3.webp',tier:'legendario',weight:2,role:'JEFE PRIMORDIAL',hp:76,atk:10,pattern:['guard','attack','regen','heavy','stun'],phasePattern:['poison','heavy','regen','stun','heavy'],trait:{id:'primordial_core',name:'Núcleo soberano',description:'Al 50% despierta sus núcleos secundarios y transforma por completo su patrón.',openingGuard:true,statusBonus:1,regenBonus:6,frenzyPower:.2},loot:[['slime_core',4,7,1],['refined_gel',2,4,1],['crystal_carapace',1,2,1],['alpha_heart',1,1,.3],['field_potion',1,1,.2]]}
    ],
    [
      {id:'ash_wolf',name:'Lobo de Ceniza',icon:'⌁',image:'assets/images/ranked-wolves/lobo-ceniza-comun.webp',tier:'comun',weight:52,role:'CAZADOR',hp:40,atk:9,pattern:['attack','bleed','attack'],trait:{id:'pack_hunter',name:'Instinto de manada',description:'Ataca rápido y busca abrir heridas antes de retroceder.'},loot:[['wolf_fang',2,4,1],['wolf_hide',1,1,.28]]},
      {id:'grave_hound',name:'Sabueso Sepulcral',icon:'◇',image:'assets/images/ranked-wolves/sabueso-sepulcral-poco-comun.webp',tier:'comun_plus',weight:27,role:'RASTREADOR',hp:46,atk:10,pattern:['bleed','attack','heavy'],trait:{id:'executioner',name:'Olfato de sangre',description:'Su golpe devastador empeora si detecta una herida abierta.',executePower:.16},loot:[['wolf_fang',2,4,1],['grave_dust',1,2,.7],['wolf_hide',1,1,.42]]},
      {id:'alpha_wolf',name:'Lobo Alfa de Obsidiana',icon:'◆',image:'assets/images/ranked-wolves/lobo-alfa-obsidiana-raro.webp',tier:'poco_comun',weight:13,role:'ALFA',hp:56,atk:11,pattern:['guard','bleed','heavy','attack'],trait:{id:'alpha_frenzy',name:'Dominio del alfa',description:'Se protege antes de abalanzarse y gana ferocidad al quedar herido.',openingGuard:true,frenzyPower:.2},loot:[['wolf_fang',3,5,1],['wolf_hide',1,2,1],['alpha_heart',1,1,.28]]},
      {id:'eclipse_wolf',name:'Lobo del Eclipse',icon:'✧',image:'assets/images/ranked-wolves/lobo-eclipse-epico-v2.webp',tier:'epico',weight:6,role:'DEPREDADOR UMBRÍO',hp:68,atk:13,pattern:['stun','bleed','guard','heavy','attack'],trait:{id:'eclipse_hunt',name:'Cacería del eclipse',description:'Alterna acecho, control y un ataque feroz contra objetivos afectados.',openingGuard:true,statusBonus:1,executePower:.2},loot:[['wolf_fang',3,6,1],['wolf_hide',2,3,1],['alpha_heart',1,1,.75],['obsidian_shard',1,1,.24]]},
      {id:'eternal_fang',name:'Colmillo Eterno',icon:'♛',image:'assets/images/ranked-wolves/colmillo-eterno-jefe-legendario-v2.webp',tier:'legendario',weight:2,role:'JEFE DE LA MANADA',hp:88,atk:14,pattern:['guard','attack','bleed','heavy','stun'],phasePattern:['bleed','heavy','attack','stun','heavy'],trait:{id:'eternal_packlord',name:'Aullido soberano',description:'Al 50% abandona la cautela y encadena una cacería implacable.',openingGuard:true,statusBonus:1,frenzyPower:.24,executePower:.18},loot:[['wolf_fang',5,8,1],['wolf_hide',2,4,1],['alpha_heart',1,2,1],['obsidian_shard',1,1,.45],['field_potion',1,1,.2]]}
    ],
    [
      {id:'umbra_spider',name:'Araña Umbría',icon:'⌘',image:'assets/images/ranked-spiders/arana-umbria-comun.webp',tier:'comun',weight:52,role:'TEJEDORA',hp:46,atk:10,pattern:['attack','poison','attack'],trait:{id:'web',name:'Hilo debilitante',description:'Envenena para desgastar antes de volver a atacar.'},loot:[['spider_silk',1,3,1],['venom_gland',1,1,.18]]},
      {id:'venom_widow',name:'Viuda Venenosa',icon:'✦',image:'assets/images/ranked-spiders/viuda-venenosa-poco-comun.webp',tier:'comun_plus',weight:27,role:'PONZOÑOSA',hp:51,atk:11,pattern:['poison','attack','poison','heavy'],trait:{id:'venom_sacs',name:'Veneno concentrado',description:'Sus reservas tóxicas prolongan cada efecto aplicado.',statusBonus:1},loot:[['spider_silk',2,3,1],['venom_gland',1,1,.62],['witch_ichor',1,1,.12]]},
      {id:'crystal_spider',name:'Araña Cristalina',icon:'◇',image:'assets/images/ranked-spiders/arana-cristalina-rara.webp',tier:'poco_comun',weight:13,role:'DEFENSORA',hp:62,atk:11,pattern:['guard','stun','attack','heavy'],trait:{id:'crystal_web',name:'Caparazón refractante',description:'Comienza protegida y utiliza su red cristalina para interrumpir.',openingGuard:true},loot:[['spider_silk',2,4,1],['venom_gland',1,1,.48],['crystal_carapace',1,1,.32]]},
      {id:'runic_weaver',name:'Tejedora Rúnica',icon:'✧',image:'assets/images/ranked-spiders/tejedora-runica-epica.webp',tier:'epico',weight:6,role:'ARCANA',hp:74,atk:13,pattern:['stun','poison','guard','heavy','regen'],trait:{id:'runic_web',name:'Telar de runas',description:'Controla el turno, se protege y recompone sus sellos arcanos.',openingGuard:true,statusBonus:1,regenBonus:3},loot:[['spider_silk',3,5,1],['venom_gland',1,2,1],['crystal_carapace',1,1,.65],['runic_scale',1,1,.2]]},
      {id:'spider_matriarch',name:'Matriarca de Cristal',icon:'♛',image:'assets/images/ranked-spiders/matriarca-cristal-jefe-legendario.webp',tier:'legendario',weight:2,role:'JEFA DE LA NIDADA',hp:96,atk:15,pattern:['guard','poison','attack','stun','heavy'],phasePattern:['poison','heavy','stun','heavy','regen','heavy'],trait:{id:'broodmother',name:'Corona de la nidada',description:'Al 50% rompe su coraza y acelera una secuencia venenosa letal.',openingGuard:true,statusBonus:1,regenBonus:4,frenzyPower:.2},loot:[['spider_silk',4,7,1],['venom_gland',2,3,1],['crystal_carapace',1,2,1],['witch_ichor',1,1,.45],['field_potion',1,1,.22]]}
    ],
    [
      {id:'moss_golem',name:'Gólem Musgoso',icon:'▰',image:'assets/images/ranked-golems/golem-musgoso-comun.webp',tier:'comun',weight:52,role:'CENTINELA',hp:58,atk:10,pattern:['guard','attack','heavy'],trait:{id:'stone_skin',name:'Corteza pétrea',description:'Comienza el combate protegido por una capa de roca y musgo.',openingGuard:true},loot:[['moss_plate',1,2,1],['slime_core',1,3,.55]]},
      {id:'mycelial_golem',name:'Gólem Micelial',icon:'♧',image:'assets/images/ranked-golems/golem-micelial-poco-comun.webp',tier:'comun_plus',weight:27,role:'REGENERADOR',hp:64,atk:11,pattern:['attack','regen','guard','heavy'],trait:{id:'mycelial_repair',name:'Raíz reparadora',description:'El micelio recompone sus grietas mientras sostiene la presión.',regenBonus:5,openingGuard:true},loot:[['moss_plate',1,2,1],['spore_cap',2,4,1],['refined_gel',1,2,.48]]},
      {id:'jade_golem',name:'Gólem de Jade',icon:'◇',image:'assets/images/ranked-golems/golem-jade-raro.webp',tier:'poco_comun',weight:13,role:'BASTIÓN',hp:76,atk:12,pattern:['guard','stun','attack','heavy'],trait:{id:'jade_bastion',name:'Muralla de jade',description:'Resiste el primer asalto y responde con impactos incapacitantes.',openingGuard:true,pierceGuard:.25},loot:[['moss_plate',2,3,1],['bronze_core',1,1,.42],['obsidian_shard',1,1,.22]]},
      {id:'runic_colossus',name:'Coloso Rúnico Ancestral',icon:'✧',image:'assets/images/ranked-golems/coloso-runico-ancestral-epico.webp',tier:'epico',weight:6,role:'COLOSO ARCANO',hp:90,atk:14,pattern:['guard','stun','heavy','regen','attack'],trait:{id:'ancestral_runes',name:'Runas ancestrales',description:'Sus sellos alternan entre defensa, control y reparación estructural.',openingGuard:true,regenBonus:4,pierceGuard:.35},loot:[['moss_plate',2,4,1],['bronze_core',1,2,1],['obsidian_shard',1,2,.68],['runic_scale',1,1,.28]]},
      {id:'golden_forest_titan',name:'Titán Áureo del Bosque',icon:'♛',image:'assets/images/ranked-golems/titan-aureo-del-bosque-jefe.webp',tier:'legendario',weight:2,role:'JEFE DEL SANTUARIO',hp:116,atk:16,pattern:['guard','attack','stun','regen','heavy'],phasePattern:['heavy','guard','heavy','stun','regen','heavy'],trait:{id:'golden_root',name:'Corazón de raíz áurea',description:'Al 50% despierta el santuario y convierte su defensa en fuerza bruta.',openingGuard:true,regenBonus:6,frenzyPower:.24,pierceGuard:.4},loot:[['moss_plate',3,5,1],['bronze_core',2,3,1],['obsidian_shard',1,2,1],['runic_scale',1,2,.72],['field_potion',1,1,.24]]}
    ],
    [
      {id:'azure_drake',name:'Draco Azur',icon:'◇',image:'assets/images/ranked-dragons/draco-azur-comun.webp',tier:'comun',weight:52,role:'VOLADOR',hp:68,atk:12,pattern:['attack','guard','heavy'],trait:{id:'azure_scales',name:'Escamas azules',description:'Alterna acometidas precisas con una breve defensa alada.'},loot:[['storm_scale',1,1,.22],['runic_scale',1,1,.12],['refined_gel',1,2,.55]]},
      {id:'storm_drake',name:'Draco de Tormenta',icon:'ϟ',image:'assets/images/ranked-dragons/draco-tormenta-poco-comun.webp',tier:'comun_plus',weight:27,role:'TEMPESTAD',hp:74,atk:13,pattern:['stun','attack','heavy','guard'],trait:{id:'storm_charge',name:'Carga de tormenta',description:'Sus descargas cortan el ritmo antes de una embestida eléctrica.',pierceGuard:.2},loot:[['storm_scale',1,2,.7],['runic_scale',1,1,.2],['bronze_core',1,1,.24]]},
      {id:'crystal_drake',name:'Draco de Cristal',icon:'◆',image:'assets/images/ranked-dragons/draco-cristal-raro.webp',tier:'poco_comun',weight:13,role:'PRISMÁTICO',hp:86,atk:14,pattern:['guard','stun','attack','heavy'],trait:{id:'crystal_wings',name:'Alas prismáticas',description:'Comienza protegido y refleja la tormenta en golpes penetrantes.',openingGuard:true,pierceGuard:.38},loot:[['storm_scale',1,2,1],['crystal_carapace',1,2,.62],['runic_scale',1,1,.35]]},
      {id:'astral_drake',name:'Draco Astral',icon:'✧',image:'assets/images/ranked-dragons/draco-astral-epico.webp',tier:'epico',weight:6,role:'ARCANO CELESTE',hp:102,atk:16,pattern:['stun','guard','heavy','regen','attack'],trait:{id:'astral_storm',name:'Tormenta astral',description:'Doblega el espacio con control, barreras y descargas perforantes.',openingGuard:true,regenBonus:4,pierceGuard:.5,frenzyPower:.16},loot:[['storm_scale',2,3,1],['runic_scale',1,2,.78],['crystal_carapace',1,1,.5],['obsidian_shard',1,1,.35],['basilisk_eye',1,1,.18]]},
      {id:'golden_dragon_emperor',name:'Emperador Dracónico Áureo',icon:'♛',image:'assets/images/ranked-dragons/emperador-draconico-aureo-jefe.webp',tier:'legendario',weight:2,role:'JEFE DE LA AGUJA',hp:134,atk:18,pattern:['guard','attack','stun','heavy','regen'],phasePattern:['heavy','attack','heavy','stun','regen','heavy'],trait:{id:'golden_tempest',name:'Corona de la tempestad',description:'Al 50% libera la tormenta soberana: perfora guardia y encadena golpes feroces.',openingGuard:true,pierceGuard:.62,frenzyPower:.28,regenBonus:5},loot:[['storm_scale',2,4,1],['runic_scale',2,3,1],['crystal_carapace',1,2,1],['obsidian_shard',1,2,.72],['field_potion',1,1,.3]]}
    ]
  ];
  function encountersForTerritory(territory){ return ENCOUNTER_POOLS[Math.max(0,Math.min(ENCOUNTER_POOLS.length-1,Math.floor(Number(territory)||0)))]; }
  function encountersForSector(sector){ return encountersForTerritory(sector); }
  function encounterById(id){ return ENCOUNTER_POOLS.flat().find(encounter=>encounter.id===id)||null; }
  function difficultyForSector(sector){ return DIFFICULTY_CURVE[Math.max(0,Math.min(DIFFICULTY_CURVE.length-1,Math.floor(Number(sector)||0)))]; }

  function uid(prefix='rk'){ return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`; }
  function template(id){ return TEMPLATES[id] || null; }
  function dimensions(item,rotated=item?.rotated){
    const spec=template(item?.templateId);
    if(!spec) return {w:1,h:1};
    return rotated ? {w:spec.h,h:spec.w} : {w:spec.w,h:spec.h};
  }
  function makeItem(templateId,qty=1,extra={}){
    const spec=template(templateId);
    if(!spec) return null;
    return {uid:uid(templateId),templateId,qty:Math.max(1,Math.min(spec.maxStack,Math.floor(Number(qty)||1))),rotated:false,x:0,y:0,...extra};
  }
  function createDefault(){
    return {
      version:9,
      season:SEASON.id,
      updatedAt:Date.now(),
      backpack:[
        makeItem('slime_core',4,{x:1,y:0}),
        makeItem('field_potion',1,{x:2,y:0}),
        makeItem('wolf_fang',3,{x:3,y:0})
      ],
      loadout:{weapon:makeItem('handmade_dagger'),armor:null,relic:null},
      secure:[makeItem('alpha_heart'),null],
      stash:[
        makeItem('wolf_hide',2),makeItem('spider_silk',2),makeItem('venom_gland',1),
        makeItem('refined_gel',5),makeItem('leather_armor',1),makeItem('slime_core',7)
      ],
      activeRun:null,
      lastRun:null,
      crafting:{crafted:0,mastery:0,discovered:[]},
      competition:{rating:0,peakRating:0,seasonXp:0,tutorialSeen:false,claimedMissions:[],claimedRewards:[],history:[],seasonStats:{extractions:0,failedRuns:0,lootValue:0,bestSector:0,mobsDefeated:0,crafted:0},archives:[]},
      stats:{extractions:0,failedRuns:0,lootValue:0,bestSector:0,mobsDefeated:0,unlockedTerritory:0}
    };
  }
  function cleanItem(raw){
    if(!raw || typeof raw!=='object' || !template(raw.templateId)) return null;
    const spec=template(raw.templateId);
    return {
      uid:typeof raw.uid==='string' && raw.uid ? raw.uid.slice(0,90) : uid(raw.templateId),
      templateId:raw.templateId,
      qty:Math.max(1,Math.min(spec.maxStack,Math.floor(Number(raw.qty)||1))),
      rotated:raw.rotated===true,
      x:Math.max(0,Math.floor(Number(raw.x)||0)),
      y:Math.max(0,Math.floor(Number(raw.y)||0))
    };
  }
  function equipmentSlot(itemOrTemplateId){
    const templateId=typeof itemOrTemplateId==='string'?itemOrTemplateId:itemOrTemplateId?.templateId;
    const kind=template(templateId)?.kind;
    return kind==='arma'?'weapon':kind==='armadura'?'armor':kind==='reliquia'?'relic':null;
  }
  function cleanLoadout(raw){
    const source=raw&&typeof raw==='object'?raw:{};
    return EQUIPMENT_SLOTS.reduce((loadout,slot)=>{
      const item=cleanItem(source[slot]);
      loadout[slot]=item&&equipmentSlot(item)===slot?{...item,x:0,y:0,rotated:false}:null;
      return loadout;
    },{});
  }
  function loadoutStats(data){
    const equipped=EQUIPMENT_SLOTS.map(slot=>data?.loadout?.[slot]).filter(Boolean).map(item=>template(item.templateId)).filter(Boolean);
    return {
      attackBonus:equipped.reduce((sum,spec)=>sum+(Number(spec.attackBonus)||0),0),
      hpBonus:equipped.reduce((sum,spec)=>sum+(Number(spec.hpBonus)||0),0),
      guardBonus:Math.min(20,equipped.reduce((sum,spec)=>sum+(Number(spec.guardBonus)||0),0)),
      thorns:equipped.reduce((sum,spec)=>sum+(Number(spec.thorns)||0),0),
      statusResist:Math.min(2,equipped.reduce((sum,spec)=>sum+(Number(spec.statusResist)||0),0)),
      openingGuard:equipped.some(spec=>spec.openingGuard===true)
    };
  }
  function canPlace(items,item,x,y,rotated=item.rotated,ignoreUid=item.uid){
    const posX=Math.floor(Number(x));
    const posY=Math.floor(Number(y));
    const size=dimensions(item,rotated);
    if(!Number.isFinite(posX)||!Number.isFinite(posY)||posX<0||posY<0||posX+size.w>WIDTH||posY+size.h>HEIGHT) return false;
    return !items.some(other=>{
      if(!other || other.uid===ignoreUid) return false;
      const otherSize=dimensions(other);
      return posX<other.x+otherSize.w && posX+size.w>other.x && posY<other.y+otherSize.h && posY+size.h>other.y;
    });
  }
  function firstFit(items,item){
    for(const rotated of [item.rotated,!item.rotated]){
      for(let y=0;y<HEIGHT;y++) for(let x=0;x<WIDTH;x++){
        if(canPlace(items,item,x,y,rotated,item.uid)) return {x,y,rotated};
      }
      if(dimensions(item).w===dimensions(item).h) break;
    }
    return null;
  }
  function autoSort(items){
    const sorted=items.map(cleanItem).filter(Boolean).sort((a,b)=>{
      const aSize=dimensions(a).w*dimensions(a).h;
      const bSize=dimensions(b).w*dimensions(b).h;
      return bSize-aSize || template(b.templateId).value-template(a.templateId).value;
    });
    const placed=[];
    const overflow=[];
    sorted.forEach(item=>{
      const spot=firstFit(placed,item);
      if(!spot){ overflow.push(item); return; }
      placed.push({...item,...spot});
    });
    return {placed,overflow};
  }
  function stackAll(items){
    const source=(Array.isArray(items)?items:[]).map(cleanItem).filter(Boolean);
    const stacked=[];
    source.forEach(item=>{
      const spec=template(item.templateId);
      let remaining=item.qty;
      stacked.filter(target=>target.templateId===item.templateId&&target.qty<spec.maxStack).forEach(target=>{
        if(remaining<=0) return;
        const moved=Math.min(spec.maxStack-target.qty,remaining);
        target.qty+=moved;remaining-=moved;
      });
      while(remaining>0){
        const qty=Math.min(spec.maxStack,remaining);
        stacked.push({...item,uid:remaining===item.qty?item.uid:uid(item.templateId),qty});
        remaining-=qty;
      }
    });
    return {items:stacked,removed:Math.max(0,source.length-stacked.length)};
  }
  function normalizeRun(raw){
    if(!raw || typeof raw!=='object') return null;
    const phases=['encounter','loot','advance'];
    const cleanStatuses=statuses=>['bleed','poison','stun','regen'].reduce((result,key)=>({...result,[key]:Math.max(0,Math.min(9,Math.floor(Number(statuses?.[key])||0)))}),{});
    const levelSkillKeys=['warrior-shield-bash','warrior-iron-fury','warrior-colossus','archer-piercing-arrow','archer-blood-trap','archer-arrow-storm','mage-runic-bolt','mage-frost-prison','mage-cataclysm'];
    const cleanLevelSkillCooldowns=levelSkillKeys.reduce((result,key)=>{const value=Math.max(0,Math.min(6,Math.floor(Number(raw.levelSkillCooldowns?.[key])||0)));if(value)result[key]=value;return result;},{});
    const territory=Math.max(0,Math.min(ENCOUNTER_POOLS.length-1,Math.floor(Number(raw.territory)||0)));
    const knownEnemy=encounterById(raw.enemy?.id);
    const territoryPool=encountersForTerritory(territory);
    const currentEnemy=territoryPool.find(entry=>entry.id===knownEnemy?.id)||territoryPool.find(entry=>entry.tier===(knownEnemy?.tier||raw.enemy?.tier))||territoryPool[0];
    const enemy=raw.enemy && typeof raw.enemy==='object' ? {
      id:String(currentEnemy?.id||raw.enemy.id||'unknown').slice(0,50),
      name:String(currentEnemy?.name||raw.enemy.name||'Enemigo desconocido').slice(0,70),
      icon:String(currentEnemy?.icon||raw.enemy.icon||'◆').slice(0,4),
      image:currentEnemy?.image||(typeof raw.enemy.image==='string' && raw.enemy.image.startsWith('assets/images/') ? raw.enemy.image.slice(0,180) : ''),
      tier:currentEnemy?.tier||(['comun','comun_plus','poco_comun','raro','epico','legendario','jefe'].includes(raw.enemy.tier)?raw.enemy.tier:'comun'),
      hp:Math.max(0,Math.floor(Number(raw.enemy.hp)||0)),
      maxHp:Math.max(1,Math.floor(Number(raw.enemy.maxHp)||1)),
      atk:Math.max(1,Math.floor(Number(raw.enemy.atk)||1)),
      guard:raw.enemy.guard===true,
      turnPatternIndex:Math.max(0,Math.min(9,Math.floor(Number(raw.enemy.turnPatternIndex)||0))),
      statuses:cleanStatuses(raw.enemy.statuses),
      intent:raw.enemy.intent&&typeof raw.enemy.intent==='object'?{
        type:['attack','heavy','poison','bleed','stun','guard','regen'].includes(raw.enemy.intent.type)?raw.enemy.intent.type:'attack',
        label:String(raw.enemy.intent.label||'Ataque').slice(0,40),
        icon:String(raw.enemy.intent.icon||'⚔').slice(0,4),
        power:Math.max(0,Math.min(3,Number(raw.enemy.intent.power)||1)),
        executePower:Math.max(0,Math.min(1,Number(raw.enemy.intent.executePower)||0))
      }:null
    } : null;
    return {
      id:String(raw.id||uid('run')).slice(0,90),
      phase:phases.includes(raw.phase)?raw.phase:'encounter',
      territory,
      sector:Math.max(0,Math.min(4,Math.floor(Number(raw.sector)||0))),
      hp:Math.max(0,Math.floor(Number(raw.hp)||0)),
      maxHp:Math.max(1,Math.floor(Number(raw.maxHp)||1)),
      guard:raw.guard===true,
      classSkillCooldown:Math.max(0,Math.min(5,Math.floor(Number(raw.classSkillCooldown)||0))),
      levelSkillCooldowns:cleanLevelSkillCooldowns,
      arcaneCharges:Math.max(0,Math.min(3,Math.floor(Number(raw.arcaneCharges)||0))),
      counterReady:raw.counterReady===true,
      turn:Math.max(0,Math.floor(Number(raw.turn)||0)),
      statuses:cleanStatuses(raw.statuses),
      enemy,
      pendingLoot:(Array.isArray(raw.pendingLoot)?raw.pendingLoot:[]).map(cleanItem).filter(Boolean).slice(0,12),
      lootValue:Math.max(0,Math.floor(Number(raw.lootValue)||0)),
      mobsDefeated:Math.max(0,Math.floor(Number(raw.mobsDefeated)||0)),
      lootManifest:(Array.isArray(raw.lootManifest)?raw.lootManifest:[]).filter(entry=>entry&&template(entry.templateId)).map(entry=>({templateId:entry.templateId,qty:Math.max(1,Math.min(999,Math.floor(Number(entry.qty)||1)))})).slice(0,30),
      publicRunId:/^[0-9a-f-]{36}$/i.test(String(raw.publicRunId||''))?String(raw.publicRunId):'',
      publicStartedAt:Math.max(0,Number(raw.publicStartedAt)||0),
      publicEligible:raw.publicEligible===true,
      log:(Array.isArray(raw.log)?raw.log:[]).filter(entry=>typeof entry==='string').map(entry=>entry.slice(0,180)).slice(-8),
      startedAt:Math.max(0,Number(raw.startedAt)||Date.now())
    };
  }
  function normalizeLastRun(raw){
    if(!raw || typeof raw!=='object') return null;
    return {
      id:String(raw.id||uid('history')).slice(0,90),
      result:['extracted','defeated'].includes(raw.result)?raw.result:'defeated',
      territory:Math.max(0,Math.min(ENCOUNTER_POOLS.length-1,Math.floor(Number(raw.territory)||0))),
      sector:Math.max(0,Math.min(5,Math.floor(Number(raw.sector)||0))),
      lootValue:Math.max(0,Math.floor(Number(raw.lootValue)||0)),
      mobsDefeated:Math.max(0,Math.floor(Number(raw.mobsDefeated)||0)),
      loot:(Array.isArray(raw.loot)?raw.loot:[]).filter(entry=>entry&&template(entry.templateId)).map(entry=>({templateId:entry.templateId,qty:Math.max(1,Math.min(999,Math.floor(Number(entry.qty)||1)))})).slice(0,30),
      survived:(Array.isArray(raw.survived)?raw.survived:[]).filter(id=>template(id)).slice(0,3),
      protected:(Array.isArray(raw.protected)?raw.protected:[]).filter(id=>template(id)).slice(0,2),
      rankDelta:Math.max(-40,Math.min(250,Math.floor(Number(raw.rankDelta)||0))),
      ratingAfter:Math.max(0,Math.floor(Number(raw.ratingAfter)||0)),
      division:DIVISIONS.some(entry=>entry.id===raw.division)?raw.division:'iron',
      seasonXpEarned:Math.max(0,Math.min(500,Math.floor(Number(raw.seasonXpEarned)||0))),
      publicStatus:['accepted','rejected','pending','local'].includes(raw.publicStatus)?raw.publicStatus:'local',
      publicRankDelta:Math.max(-36,Math.min(150,Math.floor(Number(raw.publicRankDelta)||0))),
      publicRatingAfter:Math.max(0,Math.floor(Number(raw.publicRatingAfter)||0)),
      endedAt:Math.max(0,Number(raw.endedAt)||Date.now())
    };
  }
  function divisionForRating(value){
    const rating=Math.max(0,Math.floor(Number(value)||0));
    return DIVISIONS.slice().reverse().find(division=>rating>=division.floor)||DIVISIONS[0];
  }
  function rankProgress(value){
    const rating=Math.max(0,Math.floor(Number(value)||0));
    const current=divisionForRating(rating);
    const index=DIVISIONS.findIndex(division=>division.id===current.id);
    const next=DIVISIONS[index+1]||null;
    const progress=next?Math.max(0,Math.min(1,(rating-current.floor)/(next.floor-current.floor))):1;
    return {rating,current,next,progress};
  }
  function calculateRankResult(summary){
    const extracted=summary?.result==='extracted';
    const sector=Math.max(1,Math.min(5,Math.floor(Number(summary?.sector)||1)));
    const mobsDefeated=Math.max(0,Math.floor(Number(summary?.mobsDefeated)||0));
    const lootValue=Math.max(0,Math.floor(Number(summary?.lootValue)||0));
    const rawDelta=extracted
      ? 20+sector*15+mobsDefeated*8+Math.floor(lootValue*.025)
      : -(12+sector*4)+Math.min(8,mobsDefeated);
    return {
      rankDelta:Math.max(-36,Math.min(150,rawDelta)),
      seasonXpEarned:Math.max(8,Math.min(300,sector*(extracted?12:6)+mobsDefeated*(extracted?6:3)+(extracted?20:0)))
    };
  }
  function cleanHistory(raw){
    return (Array.isArray(raw)?raw:[]).filter(entry=>entry&&typeof entry==='object').map(entry=>({
      id:String(entry.id||uid('history')).slice(0,90),
      result:entry.result==='extracted'?'extracted':'defeated',
      sector:Math.max(1,Math.min(5,Math.floor(Number(entry.sector)||1))),
      mobsDefeated:Math.max(0,Math.floor(Number(entry.mobsDefeated)||0)),
      lootValue:Math.max(0,Math.floor(Number(entry.lootValue)||0)),
      rankDelta:Math.max(-40,Math.min(250,Math.floor(Number(entry.rankDelta)||0))),
      ratingAfter:Math.max(0,Math.floor(Number(entry.ratingAfter)||0)),
      division:DIVISIONS.some(division=>division.id===entry.division)?entry.division:'iron',
      endedAt:Math.max(0,Number(entry.endedAt)||Date.now())
    })).slice(-12);
  }
  function normalizeSeasonStats(raw){
    const source=raw&&typeof raw==='object'?raw:{};
    return {
      extractions:Math.max(0,Math.floor(Number(source.extractions)||0)),
      failedRuns:Math.max(0,Math.floor(Number(source.failedRuns)||0)),
      lootValue:Math.max(0,Math.floor(Number(source.lootValue)||0)),
      bestSector:Math.max(0,Math.min(5,Math.floor(Number(source.bestSector)||0))),
      mobsDefeated:Math.max(0,Math.floor(Number(source.mobsDefeated)||0)),
      crafted:Math.max(0,Math.floor(Number(source.crafted)||0))
    };
  }
  function normalizeCompetition(raw){
    const source=raw&&typeof raw==='object'?raw:{};
    const rating=Math.max(0,Math.min(99999,Math.floor(Number(source.rating)||0)));
    return {
      rating,
      peakRating:Math.max(rating,Math.min(99999,Math.floor(Number(source.peakRating)||0))),
      seasonXp:Math.max(0,Math.min(999999,Math.floor(Number(source.seasonXp)||0))),
      tutorialSeen:source.tutorialSeen===true,
      claimedMissions:[...new Set((Array.isArray(source.claimedMissions)?source.claimedMissions:[]).filter(id=>MISSION_DEFS.some(mission=>mission.id===id)))],
      claimedRewards:[...new Set((Array.isArray(source.claimedRewards)?source.claimedRewards:[]).map(Number).filter(level=>REWARD_TRACK.some(reward=>reward.level===level)))],
      history:cleanHistory(source.history),
      seasonStats:normalizeSeasonStats(source.seasonStats),
      archives:(Array.isArray(source.archives)?source.archives:[]).filter(entry=>entry&&typeof entry==='object').map(entry=>({
        season:String(entry.season||'pretemporada-0').slice(0,60),
        rating:Math.max(0,Math.floor(Number(entry.rating)||0)),
        peakRating:Math.max(0,Math.floor(Number(entry.peakRating)||0)),
        seasonXp:Math.max(0,Math.floor(Number(entry.seasonXp)||0)),
        endedAt:Math.max(0,Number(entry.endedAt)||Date.parse(SEASON.startsAt))
      })).slice(-4)
    };
  }
  function recordRankedResult(data,summary){
    data.competition=normalizeCompetition(data.competition);
    const scored=calculateRankResult(summary);
    const before=data.competition.rating;
    const after=Math.max(0,before+scored.rankDelta);
    const division=divisionForRating(after);
    const entry={
      id:String(summary?.id||uid('history')).slice(0,90),result:summary?.result==='extracted'?'extracted':'defeated',
      sector:Math.max(1,Math.min(5,Math.floor(Number(summary?.sector)||1))),
      mobsDefeated:Math.max(0,Math.floor(Number(summary?.mobsDefeated)||0)),
      lootValue:Math.max(0,Math.floor(Number(summary?.lootValue)||0)),rankDelta:after-before,ratingAfter:after,
      division:division.id,endedAt:Math.max(0,Number(summary?.endedAt)||Date.now())
    };
    data.competition.rating=after;
    data.competition.peakRating=Math.max(data.competition.peakRating,after);
    data.competition.seasonXp+=scored.seasonXpEarned;
    data.competition.history=[...data.competition.history,entry].slice(-12);
    const seasonStats=data.competition.seasonStats;
    seasonStats.extractions+=entry.result==='extracted'?1:0;
    seasonStats.failedRuns+=entry.result==='defeated'?1:0;
    seasonStats.lootValue+=entry.result==='extracted'?entry.lootValue:0;
    seasonStats.bestSector=Math.max(seasonStats.bestSector,entry.sector);
    seasonStats.mobsDefeated+=entry.mobsDefeated;
    return {...entry,seasonXpEarned:scored.seasonXpEarned};
  }
  function missionProgress(data,missionId){
    const mission=MISSION_DEFS.find(entry=>entry.id===missionId);
    if(!mission) return null;
    const value=Number(data?.competition?.seasonStats?.[mission.metric])||0;
    return {...mission,value:Math.max(0,Math.floor(value)),complete:value>=mission.goal,claimed:(data?.competition?.claimedMissions||[]).includes(mission.id)};
  }
  function addToStash(data,templateId,totalQty){
    const spec=template(templateId);
    const qty=Math.max(1,Math.floor(Number(totalQty)||1));
    if(!spec||!Array.isArray(data?.stash)) return {ok:false,reason:'invalid_item'};
    if(data.stash.length+outputSlotsNeeded(data.stash,templateId,qty)>120) return {ok:false,reason:'stash_full'};
    let remaining=qty;
    data.stash.filter(item=>item.templateId===templateId&&item.qty<spec.maxStack).forEach(item=>{
      const added=Math.min(spec.maxStack-item.qty,remaining);item.qty+=added;remaining-=added;
    });
    while(remaining>0){const stack=Math.min(spec.maxStack,remaining);data.stash.unshift(makeItem(templateId,stack));remaining-=stack;}
    return {ok:true,added:qty};
  }
  function claimMission(data,missionId){
    data.competition=normalizeCompetition(data.competition);
    const progress=missionProgress(data,missionId);
    if(!progress) return {ok:false,reason:'unknown_mission'};
    if(progress.claimed) return {ok:false,reason:'claimed'};
    if(!progress.complete) return {ok:false,reason:'incomplete'};
    data.competition.claimedMissions.push(missionId);
    data.competition.seasonXp+=progress.rewardXp;
    return {ok:true,rewardXp:progress.rewardXp};
  }
  function claimSeasonReward(data,level){
    data.competition=normalizeCompetition(data.competition);
    const reward=REWARD_TRACK.find(entry=>entry.level===Number(level));
    if(!reward) return {ok:false,reason:'unknown_reward'};
    if(data.competition.claimedRewards.includes(reward.level)) return {ok:false,reason:'claimed'};
    if(data.competition.seasonXp<reward.xp) return {ok:false,reason:'locked'};
    const granted=addToStash(data,reward.templateId,reward.qty);
    if(!granted.ok) return granted;
    data.competition.claimedRewards.push(reward.level);
    return {ok:true,reward};
  }
  function countInStash(data,templateId){
    return (Array.isArray(data?.stash)?data.stash:[]).reduce((sum,item)=>sum+(item?.templateId===templateId?Math.max(0,Number(item.qty)||0):0),0);
  }
  function outputSlotsNeeded(stash,templateId,totalQty){
    const spec=template(templateId);
    const room=(Array.isArray(stash)?stash:[]).filter(item=>item.templateId===templateId).reduce((sum,item)=>sum+Math.max(0,spec.maxStack-item.qty),0);
    return Math.ceil(Math.max(0,totalQty-room)/spec.maxStack);
  }
  function canCraft(data,recipeId,quantity=1){
    const recipe=RECIPES[recipeId];
    const qty=Math.max(1,Math.min(10,Math.floor(Number(quantity)||1)));
    if(!recipe) return {ok:false,reason:'unknown_recipe',quantity:qty};
    if((Number(data?.stats?.bestSector)||0)<recipe.unlockSector) return {ok:false,reason:'locked',quantity:qty};
    const missing=Object.entries(recipe.inputs).filter(([templateId,needed])=>countInStash(data,templateId)<needed*qty).map(([templateId,needed])=>({templateId,needed:needed*qty,owned:countInStash(data,templateId)}));
    if(missing.length) return {ok:false,reason:'missing_materials',missing,quantity:qty};
    const simulatedStash=data.stash.map(item=>({...item}));
    Object.entries(recipe.inputs).forEach(([templateId,needed])=>{
      let remaining=needed*qty;
      for(let index=simulatedStash.length-1;index>=0&&remaining>0;index--){
        const item=simulatedStash[index];
        if(item.templateId!==templateId) continue;
        const used=Math.min(item.qty,remaining);
        item.qty-=used;remaining-=used;
        if(item.qty<=0) simulatedStash.splice(index,1);
      }
    });
    const slots=outputSlotsNeeded(simulatedStash,recipe.output,recipe.outputQty*qty);
    if(simulatedStash.length+slots>120) return {ok:false,reason:'stash_full',quantity:qty};
    return {ok:true,reason:'ready',quantity:qty,slots};
  }
  function craftRecipe(data,recipeId,quantity=1){
    const check=canCraft(data,recipeId,quantity);
    if(!check.ok) return check;
    const recipe=RECIPES[recipeId];
    Object.entries(recipe.inputs).forEach(([templateId,needed])=>{
      let remaining=needed*check.quantity;
      for(let index=data.stash.length-1;index>=0&&remaining>0;index--){
        const item=data.stash[index];
        if(item.templateId!==templateId) continue;
        const used=Math.min(item.qty,remaining);
        item.qty-=used;remaining-=used;
        if(item.qty<=0) data.stash.splice(index,1);
      }
    });
    let outputRemaining=recipe.outputQty*check.quantity;
    const spec=template(recipe.output);
    data.stash.filter(item=>item.templateId===recipe.output).forEach(item=>{
      if(outputRemaining<=0) return;
      const added=Math.min(spec.maxStack-item.qty,outputRemaining);
      item.qty+=added;outputRemaining-=added;
    });
    while(outputRemaining>0){
      const stack=Math.min(spec.maxStack,outputRemaining);
      data.stash.unshift(makeItem(recipe.output,stack));
      outputRemaining-=stack;
    }
    data.crafting=data.crafting&&typeof data.crafting==='object'?data.crafting:{crafted:0,mastery:0,discovered:[]};
    data.crafting.crafted=Math.max(0,Number(data.crafting.crafted)||0)+check.quantity;
    data.crafting.mastery=Math.max(0,Number(data.crafting.mastery)||0)+check.quantity*(recipe.unlockSector+1);
    data.crafting.discovered=[...new Set([...(Array.isArray(data.crafting.discovered)?data.crafting.discovered:[]),recipeId])].slice(-30);
    data.competition=normalizeCompetition(data.competition);
    data.competition.seasonStats.crafted+=check.quantity;
    return {ok:true,reason:'crafted',quantity:check.quantity,recipeId,output:recipe.output,outputQty:recipe.outputQty*check.quantity};
  }
  function normalize(raw){
    if(!raw || typeof raw!=='object') return createDefault();
    const backpack=(Array.isArray(raw.backpack)?raw.backpack:[]).map(cleanItem).filter(Boolean).slice(0,40);
    const packed=autoSort(backpack);
    const secure=new Array(SECURE_SLOTS).fill(null).map((_,index)=>{
      const item=cleanItem(Array.isArray(raw.secure)?raw.secure[index]:null);
      return item && template(item.templateId).secure ? item : null;
    });
    const stash=[...(Array.isArray(raw.stash)?raw.stash:[]).map(cleanItem).filter(Boolean),...packed.overflow].slice(0,120);
    const legacyCompetition=normalizeCompetition(raw.competition);
    const seasonChanged=typeof raw.season==='string'&&raw.season!==SEASON.id;
    const hasLegacyProgress=legacyCompetition.rating||legacyCompetition.peakRating||legacyCompetition.seasonXp||legacyCompetition.history.length;
    const competition=seasonChanged?normalizeCompetition({
      tutorialSeen:legacyCompetition.tutorialSeen,
      archives:[...legacyCompetition.archives,...(hasLegacyProgress?[{season:raw.season,rating:legacyCompetition.rating,peakRating:legacyCompetition.peakRating,seasonXp:legacyCompetition.seasonXp,endedAt:Date.parse(SEASON.startsAt)}]:[])]
    }):legacyCompetition;
    return {
      version:9,
      season:SEASON.id,
      updatedAt:Math.max(0,Number(raw.updatedAt)||Date.now()),
      backpack:packed.placed,
      loadout:cleanLoadout(raw.loadout),
      secure,
      stash,
      activeRun:seasonChanged?null:normalizeRun(raw.activeRun),
      lastRun:seasonChanged?null:normalizeLastRun(raw.lastRun),
      crafting:{
        crafted:Math.max(0,Math.floor(Number(raw.crafting?.crafted)||0)),
        mastery:Math.max(0,Math.floor(Number(raw.crafting?.mastery)||0)),
        discovered:[...new Set((Array.isArray(raw.crafting?.discovered)?raw.crafting.discovered:[]).filter(id=>RECIPES[id]))].slice(-30)
      },
      competition,
      stats:{
        extractions:Math.max(0,Math.floor(Number(raw.stats?.extractions)||0)),
        failedRuns:Math.max(0,Math.floor(Number(raw.stats?.failedRuns)||0)),
        lootValue:Math.max(0,Math.floor(Number(raw.stats?.lootValue)||0)),
        bestSector:Math.max(0,Math.min(5,Math.floor(Number(raw.stats?.bestSector)||0))),
        mobsDefeated:Math.max(0,Math.floor(Number(raw.stats?.mobsDefeated)||0)),
        unlockedTerritory:Math.max(0,Math.min(ENCOUNTER_POOLS.length-1,Math.floor(Number(raw.stats?.unlockedTerritory)||0)))
      }
    };
  }
  function totalValue(data){
    return [...data.backpack,...data.secure.filter(Boolean),...data.stash,...EQUIPMENT_SLOTS.map(slot=>data.loadout?.[slot]).filter(Boolean)].reduce((sum,item)=>sum+template(item.templateId).value*item.qty,0);
  }

  return {WIDTH,HEIGHT,SECURE_SLOTS,EQUIPMENT_SLOTS,SEASON,DIFFICULTY_CURVE,TEMPLATES,RECIPES,DIVISIONS,MISSION_DEFS,REWARD_TRACK,ENCOUNTER_POOLS,template,dimensions,makeItem,createDefault,normalize,normalizeRun,canPlace,firstFit,autoSort,stackAll,totalValue,countInStash,canCraft,craftRecipe,equipmentSlot,loadoutStats,divisionForRating,rankProgress,calculateRankResult,normalizeCompetition,recordRankedResult,missionProgress,addToStash,claimMission,claimSeasonReward,encountersForTerritory,encountersForSector,encounterById,difficultyForSector};
});
