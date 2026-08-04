/* Cacería de cartas: modo independiente, táctil y de pantalla completa. */
(function(){
  'use strict';
  const SECTION_ID = 'secCardHunt';
  const SNAPSHOT_VERSION = 2;
  const MAX_SETTLEMENT_HISTORY = 30;
  let hunt = null;
  let huntStateRef = null;
  let evolutionPreviewConsumed = false;
  const TYPES = {
    fight:{icon:'⚔',name:'Combate',text:'Una criatura bloquea la senda.',danger:'Moderado',reward:'Oro de run y experiencia',asset:'nodo-combate-v2.webp'},
    elite:{icon:'✦',name:'Élite',text:'Un rival fortalecido protege una recompensa superior.',danger:'Alto',reward:'Más oro y experiencia',asset:'nodo-elite-v2.webp'},
    rest:{icon:'✚',name:'Santuario',text:'Un refugio seguro para recuperar fuerzas.',danger:'Ninguno',reward:'Recupera 30% de vida',asset:'nodo-santuario-v2.webp'},
    event:{icon:'?',name:'Misterio',text:'Una decisión desconocida puede cambiar la expedición.',danger:'Variable',reward:'Efecto o mejora temporal',asset:'nodo-misterio-v2.webp'},
    treasure:{icon:'◇',name:'Tesoro',text:'Un escondite de riquezas aguarda fuera del camino.',danger:'Bajo',reward:'Oro de expedición',asset:'nodo-tesoro-v2.webp'},
    shop:{icon:'⚖',name:'Mercader',text:'Un viajero ofrece cartas que transforman tu mazo.',danger:'Ninguno',reward:'Cartas avanzadas',asset:'nodo-mercader-v2.webp'},
    boss:{icon:'♛',name:'Guardián',text:'El soberano del acto espera al final de la senda.',danger:'Extremo',reward:'Gran botín, experiencia y nuevo acto',asset:'nodo-guardian-v2.webp'}
  };
  const MAP_ASSET_ROOT='assets/images/caceria-map/';
  const HUNT_SCENES = [
    {key:'forest', name:'Bosque del Susurro', asset:'assets/images/caceria-acto-1-bosque-v2.webp', mark:'❧'},
    {key:'crypt', name:'Cripta del Juramento', asset:'assets/images/caceria-acto-2-cripta-v2.webp', mark:'☾'},
    {key:'fortress', name:'Fortaleza de Obsidiana', asset:'assets/images/caceria-acto-3-fortaleza-v2.webp', mark:'♜'},
    {key:'peaks', name:'Corona Helada', asset:'assets/images/caceria-acto-4-cumbres-v2.webp', mark:'✧'},
    {key:'moonmarsh', name:'Pantano de las Lunas', asset:'assets/images/caceria-acto-5-pantano-lunas-v2.webp', mark:'◐'},
    {key:'crystalwaste', name:'Desierto de Cristal', asset:'assets/images/caceria-acto-6-desierto-cristal-v2.webp', mark:'◇'},
    {key:'drowned', name:'Santuario Sumergido', asset:'assets/images/caceria-acto-7-santuario-sumergido-v2.webp', mark:'≋'},
    {key:'stormvale', name:'Valle de la Tormenta', asset:'assets/images/caceria-acto-8-valle-tormenta-v2.webp', mark:'ϟ'},
    {key:'crimsonabyss', name:'Abismo Carmesí', asset:'assets/images/caceria-acto-9-abismo-carmesi-v2.webp', mark:'◆'}
  ];
  const ENEMY_POOLS = [
    {
      normal:[
        ['Slime Verde','●',52,8,'slime verde sprite.webp','Inestable'],
        ['Lobo Gris','🐺',61,9,'lobo gris sprite.webp','Acechante'],
        ['Araña de Cristal','✥',55,10,'arania de cristal sprite.webp','Blindado'],
        ['Hongo Esporoso','♣',64,9,'hongo esporoso sprite.webp','Venenoso']
      ],
      elite:[
        ['Hidra Joven','♜',102,12,'hidra joven sprite.webp','Furioso'],
        ['Quimera Rúnica','✦',108,14,'quimera runica sprite.webp','Inestable'],
        ['Caballero Revenante','♞',96,14,'caballero revenante sprite.webp','Blindado']
      ],
      boss:[
        ['Reina Araña','♕',132,19,'reina arania sprite.webp','Venenoso'],
        ['Señor Orco','⚔',145,17,'senor orco sprite.webp','Furioso']
      ]
    },
    {
      normal:[
        ['Esqueleto Arquero','☠',58,9,'esqueleto arquero sprite.webp','Acechante'],
        ['Sabueso Sepulcral','☾',72,11,'sabueso sepulcral sprite.webp','Acechante'],
        ['Bruja del Pantano','♧',68,11,'bruja del pantano sprite.webp','Venenoso'],
        ['Basilisco del Pantano','◉',76,10,'basilisco del pantano sprite.webp','Blindado']
      ],
      elite:[
        ['Caballero Maldito','♞',104,15,'caballero maldito sprite.webp','Blindado'],
        ['Liche Carmesí','☥',98,16,'liche carmesi sprite.webp','Inestable'],
        ['Quimera Rúnica','✦',108,14,'quimera runica sprite.webp','Inestable']
      ],
      boss:[
        ['Liche Carmesí','☥',148,20,'liche carmesi jefe sprite.webp','Inestable'],
        ['Guardián Rúnico','♛',152,19,'guardian runico sprite.webp','Blindado']
      ]
    },
    {
      normal:[
        ['Orco Chamán','♟',78,12,'orco chaman sprite.webp','Inestable'],
        ['Autómata de Bronce','⚙',86,11,'automata de bronce sprite.webp','Blindado'],
        ['Gólem Musgoso','◆',92,10,'golem musgoso sprite.webp','Blindado'],
        ['Demonio Menor','♠',74,14,'demonio menor sprite.webp','Furioso']
      ],
      elite:[
        ['Gárgola de Obsidiana','◈',112,15,'gargola de obsidiana sprite.webp','Blindado'],
        ['Centinela de Obsidiana','♜',122,16,'centinela de obsidiana sprite.webp','Blindado'],
        ['Autómata de Bronce','⚙',118,15,'automata de bronce sprite.webp','Furioso']
      ],
      boss:[
        ['Señor Orco','⚔',158,20,'senor orco sprite.webp','Furioso'],
        ['Dragón de Ceniza','♛',168,21,'dragon de ceniza sprite.webp','Inestable'],
        ['Guardián Rúnico','♜',162,20,'guardian runico sprite.webp','Blindado']
      ]
    },
    {
      normal:[
        ['Elemental de Escarcha','❄',82,12,'elemental de escarcha sprite.webp','Inestable'],
        ['Yeti de Escarcha','❅',96,14,'yeti de escarcha sprite.webp','Furioso'],
        ['Dragón Azul','♛',92,15,'dragon azul sprite.webp','Acechante'],
        ['Lobo Gris','🐺',72,12,'lobo gris sprite.webp','Acechante']
      ],
      elite:[
        ['Yeti de Escarcha','❅',128,17,'yeti de escarcha sprite.webp','Furioso'],
        ['Quimera Rúnica','✦',126,17,'quimera runica sprite.webp','Inestable'],
        ['Centinela de Obsidiana','♜',132,16,'centinela de obsidiana sprite.webp','Blindado']
      ],
      boss:[
        ['Dragón Azul','♛',176,22,'dragon azul sprite.webp','Furioso'],
        ['Dragón de Ceniza','♚',182,23,'dragon de ceniza sprite.webp','Inestable'],
        ['Guardián Rúnico','♜',172,21,'guardian runico sprite.webp','Blindado']
      ]
    },
    {
      normal:[
        ['Bruja del Pantano','♧',84,13,'bruja del pantano sprite.webp','Venenoso'],
        ['Basilisco del Pantano','◉',92,13,'basilisco del pantano sprite.webp','Blindado'],
        ['Hongo Esporoso','♣',88,12,'hongo esporoso sprite.webp','Venenoso'],
        ['Slime Verde','●',82,14,'slime verde sprite.webp','Inestable']
      ],
      elite:[
        ['Hidra Joven','♜',142,18,'hidra joven sprite.webp','Furioso'],
        ['Caballero Maldito','♞',138,19,'caballero maldito sprite.webp','Blindado'],
        ['Liche Carmesí','☥',132,20,'liche carmesi sprite.webp','Inestable']
      ],
      boss:[
        ['Reina Araña','♕',194,25,'reina arania sprite.webp','Venenoso'],
        ['Liche Carmesí','☥',188,26,'liche carmesi jefe sprite.webp','Inestable']
      ]
    },
    {
      normal:[
        ['Araña de Cristal','✥',96,15,'arania de cristal sprite.webp','Blindado'],
        ['Autómata de Bronce','⚙',104,15,'automata de bronce sprite.webp','Blindado'],
        ['Gólem Musgoso','◆',112,14,'golem musgoso sprite.webp','Blindado'],
        ['Demonio Menor','♠',94,17,'demonio menor sprite.webp','Furioso']
      ],
      elite:[
        ['Guardián Rúnico','♜',154,20,'guardian runico sprite.webp','Blindado'],
        ['Quimera Rúnica','✦',148,21,'quimera runica sprite.webp','Inestable'],
        ['Centinela de Obsidiana','♜',160,20,'centinela de obsidiana sprite.webp','Blindado']
      ],
      boss:[
        ['Guardián Rúnico','♛',208,27,'guardian runico sprite.webp','Blindado'],
        ['Dragón Azul','♛',212,28,'dragon azul sprite.webp','Furioso']
      ]
    },
    {
      normal:[
        ['Basilisco del Pantano','◉',106,16,'basilisco del pantano sprite.webp','Blindado'],
        ['Slime Verde','●',98,16,'slime verde sprite.webp','Inestable'],
        ['Bruja del Pantano','♧',102,17,'bruja del pantano sprite.webp','Venenoso'],
        ['Hidra Joven','♜',118,17,'hidra joven sprite.webp','Furioso']
      ],
      elite:[
        ['Hidra Joven','♜',168,22,'hidra joven sprite.webp','Furioso'],
        ['Quimera Rúnica','✦',164,22,'quimera runica sprite.webp','Inestable'],
        ['Caballero Revenante','♞',158,23,'caballero revenante sprite.webp','Blindado']
      ],
      boss:[
        ['Dragón Azul','♛',224,29,'dragon azul sprite.webp','Acechante'],
        ['Guardián Rúnico','♛',218,29,'guardian runico sprite.webp','Blindado']
      ]
    },
    {
      normal:[
        ['Lobo Gris','🐺',112,18,'lobo gris sprite.webp','Acechante'],
        ['Gárgola de Obsidiana','◈',122,18,'gargola de obsidiana sprite.webp','Blindado'],
        ['Elemental de Escarcha','❄',116,19,'elemental de escarcha sprite.webp','Inestable'],
        ['Yeti de Escarcha','❅',126,20,'yeti de escarcha sprite.webp','Furioso']
      ],
      elite:[
        ['Quimera Rúnica','✦',178,24,'quimera runica sprite.webp','Inestable'],
        ['Dragón Azul','♛',184,25,'dragon azul sprite.webp','Acechante'],
        ['Centinela de Obsidiana','♜',182,24,'centinela de obsidiana sprite.webp','Blindado']
      ],
      boss:[
        ['Dragón Azul','♛',238,31,'dragon azul sprite.webp','Furioso'],
        ['Guardián Rúnico','♜',232,31,'guardian runico sprite.webp','Blindado']
      ]
    },
    {
      normal:[
        ['Demonio Menor','♠',124,21,'demonio menor sprite.webp','Furioso'],
        ['Liche Carmesí','☥',122,22,'liche carmesi sprite.webp','Inestable'],
        ['Centinela de Obsidiana','♜',134,20,'centinela de obsidiana sprite.webp','Blindado'],
        ['Gárgola de Obsidiana','◈',130,21,'gargola de obsidiana sprite.webp','Acechante']
      ],
      elite:[
        ['Caballero Maldito','♞',196,26,'caballero maldito sprite.webp','Blindado'],
        ['Dragón de Ceniza','♚',202,27,'dragon de ceniza sprite.webp','Furioso'],
        ['Quimera Rúnica','✦',194,27,'quimera runica sprite.webp','Inestable']
      ],
      boss:[
        ['Dragón de Ceniza','♚',262,34,'dragon de ceniza sprite.webp','Furioso'],
        ['Liche Carmesí','☥',252,35,'liche carmesi jefe sprite.webp','Inestable'],
        ['Guardián Rúnico','♛',258,33,'guardian runico sprite.webp','Blindado']
      ]
    }
  ];

  // Identidad cerrada por acto. Cada región conserva su propio ecosistema:
  // comunes, élites y un guardián fijo que funciona como cierre temático.
  const ACT_IDENTITIES = [
    {
      theme:'Bestias, esporas y depredadores del bosque',
      warning:'El veneno y los ataques rápidos son la amenaza principal.',
      roster:'Slimes · Lobos · Hongos · Arañas',
      enemies:{
        normal:[
          ['Slime Verde','●',52,8,'slime verde sprite.webp','Inestable'],
          ['Lobo Gris','◆',61,9,'lobo gris sprite.webp','Acechante'],
          ['Hongo Esporoso','♣',64,9,'hongo esporoso sprite.webp','Venenoso']
        ],
        elite:[
          ['Araña de Cristal','✥',102,13,'arania de cristal sprite.webp','Blindado'],
          ['Gólem Musgoso','◆',112,12,'golem musgoso sprite.webp','Blindado']
        ],
        boss:[['Reina Araña','♛',145,19,'reina arania sprite.webp','Venenoso']]
      }
    },
    {
      theme:'No-muertos, maldiciones y guardianes funerarios',
      warning:'Rompé su defensa antes de que las maldiciones se acumulen.',
      roster:'Esqueletos · Sabuesos · Revenantes · Liches',
      enemies:{
        normal:[
          ['Esqueleto Arquero','☠',68,10,'esqueleto arquero sprite.webp','Acechante'],
          ['Sabueso Sepulcral','☾',76,11,'sabueso sepulcral sprite.webp','Acechante'],
          ['Caballero Revenante','♞',84,11,'caballero revenante sprite.webp','Blindado']
        ],
        elite:[
          ['Caballero Maldito','♞',118,16,'caballero maldito sprite.webp','Blindado'],
          ['Liche Carmesí','☥',112,17,'liche carmesi sprite.webp','Inestable']
        ],
        boss:[['Liche Carmesí','☥',164,21,'liche carmesi jefe sprite.webp','Inestable']]
      }
    },
    {
      theme:'Orcos, máquinas de guerra y piedra de obsidiana',
      warning:'Sus armaduras exigen guardia rota y golpes bien preparados.',
      roster:'Orcos · Autómatas · Gárgolas · Centinelas',
      enemies:{
        normal:[
          ['Orco Chamán','♟',82,12,'orco chaman sprite.webp','Inestable'],
          ['Autómata de Bronce','⚙',90,11,'automata de bronce sprite.webp','Blindado'],
          ['Demonio Menor','♠',78,14,'demonio menor sprite.webp','Furioso']
        ],
        elite:[
          ['Gárgola de Obsidiana','◈',126,16,'gargola de obsidiana sprite.webp','Blindado'],
          ['Centinela de Obsidiana','♜',136,17,'centinela de obsidiana sprite.webp','Blindado']
        ],
        boss:[['Señor Orco','⚔',178,22,'senor orco sprite.webp','Furioso']]
      }
    },
    {
      theme:'Depredadores helados y criaturas de las cumbres',
      warning:'Los enemigos furiosos castigan los turnos sin protección.',
      roster:'Lobos · Elementales · Yetis · Dragones',
      enemies:{
        normal:[
          ['Lobo Gris','◆',82,13,'lobo gris sprite.webp','Acechante'],
          ['Elemental de Escarcha','❄',92,13,'elemental de escarcha sprite.webp','Inestable'],
          ['Yeti de Escarcha','❅',104,15,'yeti de escarcha sprite.webp','Furioso']
        ],
        elite:[
          ['Quimera Rúnica','✦',142,18,'quimera runica sprite.webp','Inestable'],
          ['Dragón Azul','♛',148,19,'dragon azul sprite.webp','Acechante']
        ],
        boss:[['Dragón Azul','♛',198,25,'dragon azul sprite.webp','Furioso']]
      }
    },
    {
      theme:'Alimañas tóxicas y hechicería de aguas estancadas',
      warning:'El veneno premia los combates breves y la presión constante.',
      roster:'Brujas · Basiliscos · Hongos · Hidras',
      enemies:{
        normal:[
          ['Bruja del Pantano','♧',92,14,'bruja del pantano sprite.webp','Venenoso'],
          ['Basilisco del Pantano','◉',102,14,'basilisco del pantano sprite.webp','Blindado'],
          ['Hongo Esporoso','♣',96,13,'hongo esporoso sprite.webp','Venenoso']
        ],
        elite:[
          ['Hidra Joven','♜',152,20,'hidra joven sprite.webp','Furioso'],
          ['Araña de Cristal','✥',146,19,'arania de cristal sprite.webp','Blindado']
        ],
        boss:[['Hidra de las Lunas','♜',216,27,'hidra joven sprite.webp','Venenoso']]
      }
    },
    {
      theme:'Constructos rúnicos nacidos entre cristales',
      warning:'La guardia enemiga aumenta cuanto más se prolonga el duelo.',
      roster:'Arañas de cristal · Autómatas · Gólems · Guardianes',
      enemies:{
        normal:[
          ['Araña de Cristal','✥',104,16,'arania de cristal sprite.webp','Blindado'],
          ['Autómata de Bronce','⚙',112,16,'automata de bronce sprite.webp','Blindado'],
          ['Gólem Musgoso','◆',120,15,'golem musgoso sprite.webp','Blindado']
        ],
        elite:[
          ['Quimera Rúnica','✦',164,22,'quimera runica sprite.webp','Inestable'],
          ['Guardián Rúnico','♜',172,21,'guardian runico sprite.webp','Blindado']
        ],
        boss:[['Guardián Rúnico','♛',232,29,'guardian runico sprite.webp','Blindado']]
      }
    },
    {
      theme:'Criaturas anfibias y horrores de las profundidades',
      warning:'Los acechantes alternan defensa y ataques repentinos.',
      roster:'Basiliscos · Slimes · Hidras · Dragones',
      enemies:{
        normal:[
          ['Basilisco del Pantano','◉',114,17,'basilisco del pantano sprite.webp','Blindado'],
          ['Slime Verde','●',106,17,'slime verde sprite.webp','Inestable'],
          ['Hidra Joven','♜',126,18,'hidra joven sprite.webp','Furioso']
        ],
        elite:[
          ['Quimera Rúnica','✦',178,23,'quimera runica sprite.webp','Inestable'],
          ['Dragón Azul','♛',184,24,'dragon azul sprite.webp','Acechante']
        ],
        boss:[['Leviatán Azul','♛',248,31,'dragon azul sprite.webp','Acechante']]
      }
    },
    {
      theme:'Bestias alcanzadas por rayos y vientos eternos',
      warning:'Conservá defensa: los ataques cargados llegan con frecuencia.',
      roster:'Lobos · Gárgolas · Elementales · Quimeras',
      enemies:{
        normal:[
          ['Lobo Gris','◆',120,19,'lobo gris sprite.webp','Acechante'],
          ['Gárgola de Obsidiana','◈',132,19,'gargola de obsidiana sprite.webp','Blindado'],
          ['Elemental de Escarcha','❄',126,20,'elemental de escarcha sprite.webp','Inestable']
        ],
        elite:[
          ['Yeti de Escarcha','❅',188,25,'yeti de escarcha sprite.webp','Furioso'],
          ['Quimera Rúnica','✦',192,25,'quimera runica sprite.webp','Inestable']
        ],
        boss:[['Dragón de la Tormenta','♛',262,33,'dragon azul sprite.webp','Furioso']]
      }
    },
    {
      theme:'Demonios y señores consumidos por la brasa carmesí',
      warning:'Es la región final: cada rival combina daño y resistencia.',
      roster:'Demonios · Liches · Centinelas · Dragones',
      enemies:{
        normal:[
          ['Demonio Menor','♠',134,22,'demonio menor sprite.webp','Furioso'],
          ['Liche Carmesí','☥',132,23,'liche carmesi sprite.webp','Inestable'],
          ['Centinela de Obsidiana','♜',144,22,'centinela de obsidiana sprite.webp','Blindado']
        ],
        elite:[
          ['Caballero Maldito','♞',212,28,'caballero maldito sprite.webp','Blindado'],
          ['Dragón de Ceniza','♚',222,29,'dragon de ceniza sprite.webp','Furioso']
        ],
        boss:[['Dragón de Ceniza','♚',292,37,'dragon de ceniza sprite.webp','Furioso']]
      }
    }
  ];

  function safe(fn, fallback){ try { return fn(); } catch(e) { return fallback; } }
  function hero(){ return safe(()=> state || {}, {}); }
  // currentClass() devuelve el objeto de clase; el mazo necesita su id estable.
  // Leerlo desde el estado evita que el Guerrero caiga por error en el mazo genérico.
  function heroClass(){ return safe(()=> (state && CLASSES[state.characterClass]) ? state.characterClass : 'warrior', 'warrior'); }
  function label(){ return safe(()=> (CLASSES[heroClass()] || CLASSES.warrior).label, 'Aventurero'); }
  function visual(){ return safe(()=>activeHeroVisual(), {}); }
  function n(v, fallback){ return Number.isFinite(Number(v)) ? Number(v) : fallback; }
  function heroMaxHp(){ return Math.max(100, n(safe(()=>maxHP(), 100),100)); }
  function heroMaxMana(){ return Math.max(60, n(safe(()=>maxMana(), 80),80)); }
  function heroAttack(){ return Math.max(9, n(safe(()=>atkDamage(), 10),10)); }
  function shuffle(a){ return [...a].sort(()=>Math.random()-.5); }
  function node(type){ return {type, id:Math.random().toString(36).slice(2)}; }
  function weightedRouteRow(weights, required=[]){
    const chosen=[...new Set(required)].filter(type=>weights[type]>0);
    const available=Object.entries(weights)
      .filter(([type,weight])=>weight>0&&!chosen.includes(type))
      .map(([type,weight])=>({type,weight}));
    while(chosen.length<4&&available.length){
      const total=available.reduce((sum,item)=>sum+item.weight,0);
      let roll=Math.random()*total;
      let index=0;
      for(;index<available.length-1;index++){
        roll-=available[index].weight;
        if(roll<=0) break;
      }
      chosen.push(available.splice(index,1)[0].type);
    }
    return shuffle(chosen.slice(0,4)).map(node);
  }
  function huntScene(){
    const act=Math.max(1,Math.floor(n(hunt?.act,1)));
    const index=(act-1)%HUNT_SCENES.length;
    return {...HUNT_SCENES[index],...ACT_IDENTITIES[index]};
  }

  function currentCharacterId(){ return String(activeCharacterId||''); }
  function makeRunId(){
    return safe(()=>crypto.randomUUID(),`card-hunt-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  }
  function cloneForSave(value){ return JSON.parse(JSON.stringify(value)); }
  function runDepth(){
    if(!hunt) return 0;
    return Math.max(1,((Math.max(1,Math.floor(n(hunt.act,1)))-1)*Math.max(1,Math.floor(n(hunt.maxFloor,5))))+Math.max(0,Math.floor(n(hunt.floor,0)))+1);
  }
  function canRetire(){
    return !!hunt && hunt.status==='active' && hunt.reward>0 && ['map','event','sanctuary','treasure','shop','victory'].includes(hunt.screen);
  }
  function persistedRun(){
    const owner=currentCharacterId();
    if(hunt && hunt.ownerCharacterId===owner && huntStateRef===state) return hunt;
    const snapshot=state?.cardHuntSnapshot;
    if(snapshot?.ownerCharacterId===owner && snapshot.run && typeof snapshot.run==='object') return snapshot.run;
    return null;
  }
  function hasStartedProgress(run=persistedRun()){
    return !!run && ['active','won'].includes(run.status) && !['intro','lost','settled'].includes(run.screen);
  }
  function isFinalVictory(){
    return !!hunt && hunt.screen==='victory' && hunt.act>=HUNT_SCENES.length && hunt.floor>=hunt.maxFloor-1 && hunt.enemy?.type==='boss';
  }
  function evolutionEngine(){ return window.CardEvolution; }
  function evolutionClaimed(act=hunt?.act){ return !!hunt?.evolutionsClaimed?.[String(act)]; }
  function evolutionCard(id){
    return (hunt?.deck||[]).find(card=>card?.id===id)||null;
  }
  function evolutionCandidates(){
    const engine=evolutionEngine();
    if(!engine) return [];
    return (hunt?.deck||[]).filter(card=>card?.id&&!card.evolution&&engine.hasBranches(card));
  }
  function chooseEvolutionCandidates(){
    const available=shuffle(evolutionCandidates());
    const chosen=[];
    const keys=new Set();
    available.forEach(card=>{
      if(chosen.length<3&&!keys.has(card.key)){
        chosen.push(card);
        keys.add(card.key);
      }
    });
    available.forEach(card=>{
      if(chosen.length<3&&!chosen.some(entry=>entry.id===card.id)) chosen.push(card);
    });
    return chosen.slice(0,3).map(card=>card.id);
  }
  function beginEvolution(){
    if(!hunt || hunt.enemy?.type!=='boss' || isFinalVictory() || evolutionClaimed()) return false;
    const candidateIds=chooseEvolutionCandidates();
    if(!candidateIds.length){
      hunt.evolutionsClaimed[String(hunt.act)]={skipped:true,claimedAt:Date.now()};
      note('El Altar no encontró cartas compatibles sin evolucionar en este mazo.');
      return false;
    }
    hunt.pendingEvolution={act:hunt.act,candidateIds,selectedId:null,stage:'select'};
    hunt.screen='evolution';
    safe(()=>window.Sound?.altarReveal ? window.Sound.altarReveal() : window.Sound?.reward?.());
    render();
    focusEvolutionTop();
    return true;
  }
  function replaceEvolvedCard(cardId,evolved){
    ['deck','draw','hand','discard','cardChoice'].forEach(key=>{
      if(Array.isArray(hunt[key])) hunt[key]=hunt[key].map(card=>card?.id===cardId?{...evolved,evolution:{...evolved.evolution}}:card);
    });
  }
  function selectEvolutionCard(cardId){
    const pending=hunt?.pendingEvolution;
    if(hunt?.screen!=='evolution'||pending?.stage!=='select'||!pending.candidateIds.includes(cardId)||!evolutionCard(cardId)) return;
    pending.selectedId=cardId;
    safe(()=>window.Sound?.click?.());
    render();
    focusEvolutionTop();
  }
  function clearEvolutionSelection(){
    if(hunt?.screen!=='evolution'||hunt.pendingEvolution?.stage!=='select') return;
    hunt.pendingEvolution.selectedId=null;
    render();
    focusEvolutionTop();
  }
  function applyEvolution(branchId){
    const pending=hunt?.pendingEvolution;
    if(hunt?.screen!=='evolution'||pending?.stage!=='select'||pending.act!==hunt.act||evolutionClaimed()) return;
    const card=evolutionCard(pending.selectedId);
    const evolved=evolutionEngine()?.evolve(card,branchId);
    if(!card||!evolved) return;
    replaceEvolvedCard(card.id,evolved);
    hunt.evolutionsClaimed[String(hunt.act)]={
      cardId:card.id,
      baseKey:card.key,
      branchId,
      branchName:evolved.evolution.branchName,
      claimedAt:Date.now()
    };
    hunt.pendingEvolution={...pending,stage:'complete',completedCardId:card.id,branchId};
    note(`${card.name} evolucionó en ${evolved.name}.`);
    safe(()=>window.Sound?.cardEvolution ? window.Sound.cardEvolution(evolved.evolution.path) : window.Sound?.reward?.());
    render();
    focusEvolutionTop();
  }
  function focusEvolutionTop(){
    requestAnimationFrame(()=>section?.querySelector('.cardspire-evolution')?.scrollIntoView({block:'start',behavior:'auto'}));
  }
  function snapshotCardHunt(){
    if(!state || !activeCharacterId || !hunt || hunt.ownerCharacterId!==currentCharacterId()) return;
    if(['lost','settled'].includes(hunt.status)){
      state.cardHuntSnapshot=null;
    }else{
      state.cardHuntSnapshot={
        version:SNAPSHOT_VERSION,
        ownerCharacterId:hunt.ownerCharacterId,
        savedAt:Date.now(),
        run:cloneForSave(hunt)
      };
    }
    safe(()=>saveState());
  }
  function restoreCardHunt(snapshot){
    const owner=currentCharacterId();
    if(!owner || !snapshot || ![1,SNAPSHOT_VERSION].includes(Number(snapshot.version)) || snapshot.ownerCharacterId!==owner || !snapshot.run || typeof snapshot.run!=='object') return false;
    const saved=snapshot.run;
    if(['lost','settled'].includes(saved.status)) return false;
    createRun();
    const fallback=hunt;
    hunt={...fallback,...saved};
    hunt.ownerCharacterId=owner;
    hunt.runId=typeof saved.runId==='string' && saved.runId.trim() ? saved.runId.slice(0,120) : fallback.runId;
    hunt.status=['active','won'].includes(saved.status) ? saved.status : 'active';
    hunt.act=Math.max(1,Math.min(HUNT_SCENES.length,Math.floor(n(saved.act,1))));
    hunt.maxFloor=5;
    hunt.floor=Math.max(0,Math.min(hunt.maxFloor-1,Math.floor(n(saved.floor,0))));
    hunt.maxHp=Math.max(1,Math.floor(n(saved.maxHp,fallback.maxHp)));
    hunt.hp=Math.max(1,Math.min(hunt.maxHp,n(saved.hp,hunt.maxHp)));
    hunt.maxMana=Math.max(1,Math.floor(n(saved.maxMana,fallback.maxMana)));
    hunt.mana=Math.max(0,Math.min(hunt.maxMana,n(saved.mana,hunt.maxMana)));
    hunt.reward=Math.max(0,Math.min(1000000,Math.floor(n(saved.reward,0))));
    hunt.defeatedCount=Math.max(0,Math.floor(n(saved.defeatedCount,0)));
    hunt.maxDepth=Math.max(0,Math.floor(n(saved.maxDepth,0)));
    hunt.startedAt=Math.max(0,Math.floor(n(saved.startedAt,Date.now())));
    ['deck','draw','hand','discard','cardPool','shopOffers','unlockedCards','routeHistory','notes','traps'].forEach(key=>{
      hunt[key]=Array.isArray(saved[key]) ? saved[key] : fallback[key];
    });
    hunt.arcane=Math.max(0,Math.min(5,Math.floor(n(saved.arcane,0))));
    hunt.faith=Math.max(0,Math.min(9,Math.floor(n(saved.faith,0))));
    hunt.combo=Math.max(0,Math.min(5,Math.floor(n(saved.combo,0))));
    hunt.bond=Math.max(0,Math.min(5,Math.floor(n(saved.bond,0))));
    const knownPoolKeys=new Set([...(hunt.cardPool||[]),...(hunt.shopOffers||[])].map(card=>card?.key).filter(Boolean));
    const unlockedKeys=new Set(hunt.unlockedCards||[]);
    buildAdvancedPool().forEach(card=>{
      if(!knownPoolKeys.has(card.key)&&!unlockedKeys.has(card.key)) hunt.cardPool.push(card);
    });
    hunt.cardChoice=Array.isArray(saved.cardChoice) ? saved.cardChoice : null;
    hunt.evolutionsClaimed=saved.evolutionsClaimed && typeof saved.evolutionsClaimed==='object' && !Array.isArray(saved.evolutionsClaimed)
      ? saved.evolutionsClaimed
      : {};
    const pending=saved.pendingEvolution && typeof saved.pendingEvolution==='object' ? saved.pendingEvolution : null;
    const candidateIds=Array.isArray(pending?.candidateIds)
      ? pending.candidateIds.filter(id=>typeof id==='string'&&evolutionCard(id)).slice(0,3)
      : [];
    hunt.pendingEvolution=pending && Number(pending.act)===hunt.act && candidateIds.length
      ? {
          act:hunt.act,
          candidateIds,
          selectedId:candidateIds.includes(pending.selectedId)?pending.selectedId:null,
          stage:pending.stage==='complete'?'complete':'select',
          completedCardId:typeof pending.completedCardId==='string'?pending.completedCardId:null,
          branchId:typeof pending.branchId==='string'?pending.branchId:null
        }
      : null;
    const validMap=Array.isArray(saved.map) && saved.map.length===hunt.maxFloor && saved.map.every(row=>Array.isArray(row)&&row.length);
    hunt.map=validMap ? saved.map : fallback.map;
    hunt.enemy=saved.enemy && typeof saved.enemy==='object' ? saved.enemy : null;
    hunt.selectedNode=typeof saved.selectedNode==='string' ? saved.selectedNode : null;
    hunt.routeLane=Number.isInteger(saved.routeLane) ? saved.routeLane : null;
    const allowedScreens=['intro','map','event','sanctuary','treasure','shop','combat','victory','evolution','retire-confirm','complete'];
    hunt.screen=allowedScreens.includes(saved.screen) ? saved.screen : 'map';
    hunt.returnScreen=['map','event','sanctuary','treasure','shop','victory'].includes(saved.returnScreen) ? saved.returnScreen : 'map';
    if(['combat','victory'].includes(hunt.screen) && !hunt.enemy) hunt.screen='map';
    if(hunt.screen==='evolution' && (!hunt.enemy||hunt.enemy.type!=='boss'||!hunt.pendingEvolution)) hunt.screen='map';
    if(hunt.screen==='complete') hunt.status='won';
    if(hunt.status==='won') hunt.screen='complete';
    hunt.settling=false;
    note('Expedición restaurada desde el último punto seguro.');
    return true;
  }
  function syncCardHuntOwner(){
    const owner=currentCharacterId();
    if(hunt?.ownerCharacterId===owner && huntStateRef===state) return;
    hunt=null;
    if(!restoreCardHunt(state?.cardHuntSnapshot)) createRun();
  }

  function createRun(){
    const hp=heroMaxHp(), mana=heroMaxMana();
    huntStateRef=state;
    hunt={screen:'intro', status:'active', ownerCharacterId:currentCharacterId(), runId:makeRunId(), startedAt:Date.now(), act:1, floor:0, maxFloor:5, hp, maxHp:hp, mana, maxMana:mana,
      block:0, strength:0, thorns:0, arcane:0, faith:0, combo:0, bond:0, retainBlock:0, attacksThisTurn:0, defensesThisTurn:0,
      evade:0, nextCritical:false, cardChoice:null, traps:[], trapMastery:0,
      deck:buildDeck(), draw:[], hand:[], discard:[], enemy:null,
      cardPool:buildAdvancedPool(), shopOffers:[], unlockedCards:[], pendingEvolution:null, evolutionsClaimed:{},
      map:makeMap(), selectedNode:null, routeLane:null, routeHistory:[],
      notes:['La senda se abre. Elegí el primer destino.'], reward:0, defeatedCount:0, maxDepth:0, turn:1, lastAction:null};
  }
  function resetHunt(){
    const confirmed=window.confirm(
      '¿Reiniciar la Cacería actual?\n\nPerderás el avance y el botín de esta expedición. Tu personaje, equipo, nivel y progreso permanente se conservarán.'
    );
    if(!confirmed) return;
    createRun();
    render();
    safe(()=>window.Sound?.click?.());
  }
  function finalRunSummary(outcome,reward){
    const completed=outcome==='completed';
    return {
      finishedAt:Date.now(),
      retreated:outcome==='retired',
      completed,
      maxDepth:Math.max(hunt.maxDepth||0,completed?HUNT_SCENES.length*hunt.maxFloor:0),
      enemies:Math.max(0,Math.floor(n(hunt.defeatedCount,0))),
      runGold:reward,
      runGoldClaimed:true,
      routeTaken:(hunt.routeHistory||[]).map(step=>({
        type:step.type||'event',
        icon:TYPES[step.type]?.icon||'✦',
        label:TYPES[step.type]?.name||'Paso'
      })),
      mastery:{},
      evolutions:Object.keys(hunt.evolutionsClaimed||{}).length
    };
  }
  function rememberSettlement(runId,record){
    state.cardHuntSettlements=state.cardHuntSettlements && typeof state.cardHuntSettlements==='object' ? state.cardHuntSettlements : {};
    state.cardHuntSettlements[runId]=record;
    state.cardHuntSettlements=Object.fromEntries(
      Object.entries(state.cardHuntSettlements)
        .sort((a,b)=>(n(b[1]?.settledAt,0)-n(a[1]?.settledAt,0)))
        .slice(0,MAX_SETTLEMENT_HISTORY)
    );
  }
  async function settleCardHunt(outcome){
    if(!hunt || hunt.settling || hunt.ownerCharacterId!==currentCharacterId()) return;
    const completed=outcome==='completed';
    if((completed && hunt.screen!=='complete') || (!completed && hunt.screen!=='retire-confirm')) return;
    const existing=state.cardHuntSettlements?.[hunt.runId];
    if(existing){
      hunt.status='settled';
      hunt.screen='settled';
      hunt.settledOutcome=existing.outcome||outcome;
      hunt.settledReward=Math.max(0,Math.floor(n(existing.gold,0)));
      hunt.settledEssence=Math.max(0,Math.floor(n(existing.essence,0)));
      hunt.reward=0;
      state.cardHuntSnapshot=null;
      await saveState();
      render();
      return;
    }
    hunt.settling=true;
    const reward=Math.max(0,Math.min(1000000,Math.floor(n(hunt.reward,0))));
    const essence=completed?10:0;
    const settledAt=Date.now();
    rememberSettlement(hunt.runId,{outcome,gold:reward,essence,settledAt});
    if(reward>0){
      if(typeof gainGold==='function') gainGold(reward);
      else state.gold=Math.max(0,n(state.gold,0))+reward;
    }
    if(essence>0){
      state.materials=state.materials||{};
      state.materials.essence=Math.max(0,n(state.materials.essence,0))+essence;
      state.campaignWins=Math.max(0,n(state.campaignWins,0))+1;
    }
    const summary=finalRunSummary(outcome,reward);
    state.lastRunSummary=summary;
    const previous=state.bestRunSummary;
    if(!previous || summary.maxDepth>n(previous.maxDepth,0) || (summary.maxDepth===n(previous.maxDepth,0)&&summary.enemies>n(previous.enemies,0))){
      state.bestRunSummary=summary;
    }
    state.cardHuntSnapshot=null;
    hunt.status='settled';
    hunt.screen='settled';
    hunt.settledOutcome=outcome;
    hunt.settledReward=reward;
    hunt.settledEssence=essence;
    hunt.reward=0;
    hunt.settling=false;
    safe(()=>addLog(
      completed
        ? `♛ Completaste la Cacería de cartas y aseguraste ${reward} oro y ${essence} de esencia.`
        : `🏳 Te retiraste de la Cacería de cartas y aseguraste ${reward} oro.`,
      completed?'level':'win'
    ));
    safe(()=>showFeedback('BOTÍN ASEGURADO',`+${reward} oro${essence?` · +${essence} esencia`:''}`,'reward'));
    safe(()=>window.Sound?.reward?.());
    await saveState();
    render();
  }
  function retireCardHunt(){
    if(!hunt || hunt.status!=='active' || hunt.reward<=0) return;
    hunt.returnScreen=hunt.screen;
    hunt.screen='retire-confirm';
    try{
      render();
    }catch(error){
      hunt.screen=hunt.returnScreen||'map';
      console.error('card hunt retirement render failed',error);
    }
  }
  function cancelRetirement(){
    if(hunt?.screen!=='retire-confirm') return;
    hunt.screen=['map','event','sanctuary','treasure','shop','victory'].includes(hunt.returnScreen) ? hunt.returnScreen : 'map';
    hunt.returnScreen=null;
    render();
  }
  function makeMap(){
    return [
      weightedRouteRow({fight:7,event:4,treasure:3,rest:2,elite:1,shop:1},['fight']),
      weightedRouteRow({fight:6,event:4,treasure:3,rest:3,elite:2,shop:2},['fight']),
      weightedRouteRow({fight:5,event:4,treasure:3,rest:3,elite:3,shop:4},['shop']),
      weightedRouteRow({fight:4,event:3,treasure:3,rest:3,elite:6,shop:3},['elite']),
      [node('boss')]
    ];
  }
  function buildDeck(){
    return classStarterDeck(heroClass());
    if(heroClass()==='warrior') return warriorStarterDeck();
    const atk=Math.round(heroAttack()*.8);
    const cards=[
      ...Array.from({length:4},()=>({key:'strike',name:'Golpe',icon:'⚔',cost:1,kind:'attack',value:atk,desc:`Inflige ${atk} de daño.`})),
      ...Array.from({length:3},()=>({key:'guard',name:'Guardia',icon:'⬡',cost:1,kind:'block',value:13,desc:'Obtiene 13 de bloqueo este turno.'})),
      {key:'focus',name:'Concentración',icon:'✦',cost:0,kind:'mana',value:12,desc:'Recupera 12 de maná.'},
      classCard()
    ];
    return cards.map((c,i)=>({...c,id:c.key+'-'+i}));
  }
  function classStarterDeck(id){
    const attack=heroAttack();
    if(id==='warrior'){
      return warriorStarterDeck().map(card=>({
        ...card,
        mana:card.kind==='bash'?10:card.kind==='strength'?8:0,
        fx:card.kind==='block'?'shield':card.kind==='bash'?'breaker':card.kind==='strength'?'warcry':'slash'
      }));
    }
    const decks={
      archer:[
        {copies:3,key:'archer-shot',name:'Disparo Certero',icon:'➹',art:'archer-disparo-certero.webp',cost:1,mana:0,kind:'attack',value:Math.round(attack*.82),tag:'ATAQUE',fx:'arrow',desc:`Inflige ${Math.round(attack*.82)} de daño y desgasta la guardia enemiga.`},
        {copies:2,key:'archer-step',name:'Paso Ligero',icon:'❧',art:'archer-paso-ligero.webp',cost:1,mana:0,kind:'block',value:11,tag:'DEFENSA',fx:'wind',desc:'Obtiene 11 de bloqueo y evita quedar expuesto.'},
        {copies:2,key:'archer-twin',name:'Flecha Gemela',icon:'➶',art:'archer-flecha-gemela.webp',cost:1,mana:0,kind:'attack',value:Math.max(4,Math.round(attack*.45)),hits:2,effect:'multi_hit',tag:'ATAQUE',fx:'twin',desc:`Golpea 2 veces por ${Math.max(4,Math.round(attack*.45))} de daño.`},
        {copies:1,key:'archer-mark',name:'Marca del Cazador',icon:'◎',art:'archer-marca-cazador.webp',cost:1,mana:9,kind:'bash',value:Math.round(attack*.55),vulnerable:2,tag:'TÁCTICA',fx:'mark',desc:`Inflige ${Math.round(attack*.55)} de daño y aplica Vulnerable durante 2 turnos.`},
        {copies:2,key:'archer-volley',name:'Lluvia de Flechas',icon:'➷',art:'archer-lluvia-flechas.webp',cost:2,mana:16,kind:'attack',value:Math.max(4,Math.round(attack*.55)),hits:3,effect:'multi_hit',tag:'TÁCTICA',fx:'volley',desc:`Golpea 3 veces por ${Math.max(4,Math.round(attack*.55))} y castiga la guardia.`}
      ],
      mage:[
        {copies:3,key:'mage-bolt',name:'Misil Arcano',icon:'✦',art:'mage-misil-arcano.webp',cost:1,mana:0,kind:'spell',value:Math.round(attack*.9),tag:'ATAQUE',fx:'arcane',desc:`Inflige ${Math.round(Math.round(attack*.9)*1.1)} de daño con la bonificación arcana.`},
        {copies:2,key:'mage-barrier',name:'Barrera Rúnica',icon:'⬡',art:'mage-barrera-runica.webp',cost:1,mana:0,kind:'block',value:13,tag:'DEFENSA',fx:'rune',desc:'Obtiene 13 de bloqueo mediante una runa protectora.'},
        {copies:2,key:'mage-echoes',name:'Ecos Arcanos',icon:'✧',art:'mage-ecos-arcanos.webp',cost:1,mana:0,kind:'spell',value:Math.max(4,Math.round(attack*.4)),hits:2,effect:'multi_hit',tag:'ATAQUE',fx:'echoes',desc:`Dos proyectiles infligen ${Math.round(Math.max(4,Math.round(attack*.4))*2*1.1)} de daño total.`},
        {copies:1,key:'mage-fracture',name:'Sello de Fractura',icon:'◉',art:'mage-sello-fractura.webp',cost:1,mana:10,kind:'bash',value:Math.round(attack*.6),vulnerable:2,tag:'TÁCTICA',fx:'fracture',desc:`Inflige ${Math.round(attack*.6)} de daño y aplica Vulnerable durante 2 turnos.`},
        {copies:2,key:'mage-nova',name:'Nova Celeste',icon:'✺',art:'mage-nova-celeste.webp',cost:2,mana:18,kind:'spell',value:Math.max(5,Math.round(attack*.5)),hits:3,effect:'multi_hit',tag:'TÁCTICA',fx:'nova',desc:`Tres impactos infligen ${Math.round(Math.max(5,Math.round(attack*.5))*3*1.1)} de daño total.`}
      ],
      priest:[
        {copies:3,key:'priest-smite',name:'Castigo Radiante',icon:'☀',art:'priest-castigo-radiante.webp',cost:1,mana:0,kind:'spell',value:Math.max(7,Math.round(attack*.78)),faithGain:1,tag:'ATAQUE',fx:'holy',desc:`Inflige ${Math.max(7,Math.round(attack*.78))} de daño y genera 1 Fe.`},
        {copies:2,key:'priest-aegis',name:'Égida de Fe',icon:'✙',art:'priest-egida-fe.webp',cost:1,mana:0,kind:'block',value:12,faithGain:1,tag:'DEFENSA',fx:'aegis',desc:'Obtiene 12 de bloqueo y genera 1 Fe.'},
        {copies:2,key:'priest-prayer',name:'Plegaria Serena',icon:'♡',art:'priest-plegaria-serena.webp',cost:1,mana:11,kind:'heal',value:Math.max(8,Math.round(heroMaxHp()*.06)),effect:'faith_heal',faithConsume:3,faithHeal:4,tag:'TÁCTICA',fx:'heal',desc:`Cura ${Math.max(8,Math.round(heroMaxHp()*.06))} de vida +4 por Fe y consume hasta 3 Fe.`},
        {copies:1,key:'priest-sanctuary',name:'Custodia Consagrada',icon:'◉',art:'priest-custodia-consagrada.webp',cost:1,mana:13,kind:'block',value:9,effect:'faith_guard',faithConsume:3,faithBlock:5,tag:'TÁCTICA',fx:'consecration',desc:'Obtiene 9 de bloqueo +5 por Fe y consume hasta 3 Fe.'},
        {copies:2,key:'priest-judgement',name:'Juicio del Alba',icon:'✹',art:'priest-juicio-alba.webp',cost:2,mana:18,kind:'bash',value:Math.max(8,Math.round(attack*.9)),effect:'faith_judgement',faithConsume:3,faithDamage:Math.max(4,Math.round(attack*.34)),faithHeal:3,vulnerable:1,tag:'TÁCTICA',fx:'judgement',desc:`Inflige ${Math.max(8,Math.round(attack*.9))} +${Math.max(4,Math.round(attack*.34))} por Fe, cura 3 por Fe y la consume.`}
      ],
      assassin:[
        {copies:3,key:'assassin-cut',name:'Corte Umbrío',icon:'✦',art:'assassin-corte-umbrio.webp',cost:1,mana:0,kind:'attack',value:Math.max(7,Math.round(attack*.72)),comboGain:1,tag:'ATAQUE',fx:'shadow',desc:`Inflige ${Math.max(7,Math.round(attack*.72))} de daño y genera 1 Combo.`},
        {copies:2,key:'assassin-evade',name:'Paso Fantasma',icon:'☾',art:'assassin-paso-fantasma.webp',cost:1,mana:0,kind:'block',value:11,comboGain:1,tag:'DEFENSA',fx:'smoke',desc:'Obtiene 11 de bloqueo y genera 1 Combo.'},
        {copies:2,key:'assassin-dance',name:'Danza de Dagas',icon:'⚔',art:'assassin-danza-dagas.webp',cost:1,mana:0,kind:'attack',value:Math.max(3,Math.round(attack*.28)),hits:3,effect:'assassin_multi',comboGain:1,tag:'ATAQUE',fx:'daggers',desc:`Golpea 3 veces por ${Math.max(3,Math.round(attack*.28))} y genera 1 Combo.`},
        {copies:2,key:'assassin-poison',name:'Veneno de Medianoche',icon:'☠',art:'assassin-veneno-medianoche.webp',cost:1,mana:11,kind:'attack',value:Math.max(4,Math.round(attack*.38)),poison:3,tag:'TÁCTICA',fx:'poison',desc:`Inflige ${Math.max(4,Math.round(attack*.38))} y aplica 3 de Veneno que ignora la guardia.`},
        {copies:1,key:'assassin-execute',name:'Sentencia Umbría',icon:'◆',art:'assassin-sentencia-umbria.webp',cost:2,mana:18,kind:'attack',value:Math.max(9,Math.round(attack*.95)),effect:'assassin_execute',comboConsume:5,comboDamage:Math.max(4,Math.round(attack*.32)),tag:'TÁCTICA',fx:'execution',desc:`Consume hasta 5 Combo: +${Math.max(4,Math.round(attack*.32))} daño por carga. Devastadora bajo 35% de vida.`}
      ],
      tamer:[
        {copies:3,key:'tamer-whip',name:'Latigazo de Vínculo',icon:'〰',art:'tamer-latigazo-vinculo.webp',cost:1,mana:0,kind:'attack',value:Math.max(7,Math.round(attack*.72)),bondGain:1,tag:'ATAQUE',fx:'whip',desc:`Inflige ${Math.max(7,Math.round(attack*.72))} de daño y genera 1 Vínculo.`},
        {copies:2,key:'tamer-guard',name:'Guardián Bestial',icon:'♞',art:'tamer-guardian-bestial.webp',cost:1,mana:0,kind:'block',value:11,bondGain:1,tag:'DEFENSA',fx:'beastguard',desc:'Obtiene 11 de bloqueo y genera 1 Vínculo.'},
        {copies:2,key:'tamer-bite',name:'Mordida Coordinada',icon:'♞',art:'tamer-mordida-coordinada.webp',cost:1,mana:0,kind:'attack',value:Math.max(3,Math.round(attack*.34)),hits:2,effect:'tamer_multi',bondGain:1,tag:'ATAQUE',fx:'packbite',desc:`Vos y tu bestia golpean 2 veces por ${Math.max(3,Math.round(attack*.34))}. Genera 1 Vínculo.`},
        {copies:2,key:'tamer-howl',name:'Aullido de Manada',icon:'❖',art:'tamer-aullido-manada.webp',cost:1,mana:10,kind:'strength',value:2,bondGain:2,tag:'TÁCTICA',fx:'howl',desc:'Gana +2 Fuerza y genera 2 Vínculo.'},
        {copies:1,key:'tamer-alpha',name:'Embestida Alfa',icon:'◆',art:'tamer-embestida-alfa.webp',cost:2,mana:17,kind:'attack',value:Math.max(9,Math.round(attack*.9)),effect:'tamer_alpha',bondConsume:5,bondDamage:Math.max(4,Math.round(attack*.36)),tag:'TÁCTICA',fx:'alpha-charge',desc:`Consume hasta 5 Vínculo: +${Math.max(4,Math.round(attack*.36))} de daño por carga. Con 5, aplica Vulnerable.`}
      ]
    };
    const source=decks[id]||decks.archer;
    const expanded=[];
    source.forEach(card=>{
      for(let copy=0;copy<card.copies;copy++) expanded.push({...card});
    });
    return expanded.map((card,index)=>{
      const result={...card,id:`${card.key}-${index}`};
      delete result.copies;
      return result;
    });
  }
  /* Mazo base del Guerrero: diez cartas y cinco voces distintas para que
     cada Altar pueda ofrecer fuerza, defensa, control, preparación o ritmo. */
  function warriorStarterDeck(){
    const strike=Math.max(7,Math.round(heroAttack()*.75));
    const deck=[
      ...Array.from({length:3},()=>({key:'warrior-strike',name:'Corte de Acero',icon:'⚔',art:'warrior-corte-acero.jpg',cost:1,kind:'attack',value:strike,tag:'ATAQUE',desc:`Inflige ${strike} de daño.`})),
      ...Array.from({length:3},()=>({key:'warrior-guard',name:'Guardia de Escudo',icon:'⬡',art:'warrior-guardia-escudo.jpg',cost:1,kind:'block',value:12,tag:'DEFENSA',desc:'Obtiene 12 de bloqueo este turno.'})),
      {key:'warrior-bash',name:'Rompeguardia',icon:'✹',art:'warrior-rompeguardia.jpg',cost:2,kind:'bash',value:Math.round(strike*1.35),vulnerable:2,tag:'TÁCTICA',desc:`Inflige ${Math.round(strike*1.35)} de daño y deja al enemigo Vulnerable durante 2 turnos.`},
      {key:'warrior-rally',name:'Grito de Guerra',icon:'⚑',art:'warrior-grito-guerra.jpg',cost:1,kind:'strength',value:2,tag:'TÁCTICA',desc:'Gana +2 Fuerza para el resto de este combate.'},
      ...Array.from({length:2},()=>({key:'warrior-second-wind',name:'Segundo Aliento',icon:'❧',art:'warrior-segundo-aliento-v1.webp',cost:1,kind:'mana',value:12,tag:'HABILIDAD',desc:'Recupera 12 de maná y prepara la siguiente ofensiva.'}))
    ];
    return deck.map((c,i)=>({...c,id:c.key+'-'+i}));
  }
  function buildAdvancedPool(){
    const classId=heroClass();
    const cards=advancedCardsForClass(classId);
    return cards.map((card,index)=>{
      const price=card.mana>=15?54:card.mana>=11?44:card.mana?36:28;
      const rarity=price>=54?'RARA':price>=44?'POCO COMÚN':'COMÚN';
      return {...card,price,rarity,poolId:`advanced-${index}-${card.key}`};
    });
  }
  function warriorSynergyCards(strike){
    return [
      /* Fortaleza: encadenar defensas convierte el bloqueo en un recurso ofensivo. */
      {key:'warrior-iron-wall',name:'Muralla de Hierro',art:'warrior-muralla-hierro.webp',kind:'block',value:16,tag:'DEFENSA',effect:'guard_chain',desc:'Obtiene 16 de bloqueo. +3 por cada Defensa jugada este turno.'},
      {key:'warrior-riposte',name:'Contraataque',art:'warrior-contraataque.webp',kind:'block',value:10,mana:10,tag:'TÁCTICA',effect:'thorns',thorns:7,desc:'Obtiene 10 de bloqueo. Devuelve 7 de daño al próximo atacante.'},
      {key:'warrior-bastion',name:'Bastión Persistente',art:'warrior-bastion-persistente.webp',kind:'block',value:12,mana:12,tag:'TÁCTICA',effect:'retain_block',retain:.5,desc:'Obtiene 12 de bloqueo y conserva 50% al terminar el turno.'},
      {key:'warrior-shield-rise',name:'Escudo Inquebrantable',art:'warrior-escudo-inquebrantable.webp',kind:'block',value:8,mana:14,tag:'TÁCTICA',effect:'double_block',desc:'Obtiene 8 de bloqueo y luego duplica tu bloqueo actual.'},
      {key:'warrior-tempered-will',name:'Voluntad Templada',art:'warrior-voluntad-templada.webp',kind:'block',value:11,tag:'DEFENSA',effect:'block_strength',desc:'Obtiene 11 de bloqueo. Si ya tenías bloqueo, gana +1 Fuerza.'},

      /* Asalto: cada ataque prepara al siguiente y permite remates explosivos. */
      {key:'warrior-chain-cut',name:'Cadena de Acero',art:'warrior-corte-acero.jpg',kind:'attack',value:strike,tag:'ATAQUE',effect:'attack_chain',desc:`Inflige ${strike} de daño. +3 por cada Ataque jugado este turno.`},
      {key:'warrior-steel-storm',name:'Tormenta de Acero',art:'warrior-corte-acero.jpg',kind:'attack',value:Math.max(4,Math.round(strike*.58)),hits:3,mana:15,tag:'TÁCTICA',effect:'multi_hit',desc:`Golpea 3 veces por ${Math.max(4,Math.round(strike*.58))}. La Fuerza mejora cada golpe.`},
      {key:'warrior-execution',name:'Golpe del Verdugo',art:'warrior-rompeguardia.jpg',kind:'attack',value:Math.round(strike*1.25),mana:13,tag:'TÁCTICA',effect:'execute',desc:`Inflige ${Math.round(strike*1.25)} de daño; se duplica bajo 35% de vida enemiga.`},
      {key:'warrior-overpower',name:'Fuerza Abrumadora',art:'warrior-rompeguardia.jpg',kind:'attack',value:Math.round(strike*1.1),mana:11,tag:'TÁCTICA',effect:'strength_strike',desc:`Inflige ${Math.round(strike*1.1)} de daño y aplica tu Fuerza dos veces.`},
      {key:'warrior-shield-ram',name:'Ariete de Escudo',art:'warrior-rompeguardia.jpg',kind:'attack',value:Math.round(strike*.8),tag:'ATAQUE',effect:'spend_block',desc:`Inflige ${Math.round(strike*.8)} y consume hasta 10 de bloqueo para sumar el doble como daño.`},

      /* Dominio: reducir la respuesta rival abre una ventana para el remate. */
      {key:'warrior-hamstring',name:'Corte de Tendón',art:'warrior-corte-acero.jpg',kind:'attack',value:Math.round(strike*.65),mana:9,tag:'TÁCTICA',effect:'weak',weak:2,desc:`Inflige ${Math.round(strike*.65)} y aplica Debilidad durante 2 turnos.`},
      {key:'warrior-armor-break',name:'Quebrar Armadura',art:'warrior-rompeguardia.jpg',kind:'bash',value:Math.round(strike*.75),mana:12,vulnerable:3,tag:'TÁCTICA',effect:'armor_break',desc:`Inflige ${Math.round(strike*.75)} y aplica Vulnerable durante 3 turnos.`},
      {key:'warrior-disarm',name:'Desarmar',art:'warrior-guardia-escudo.jpg',kind:'attack',value:Math.round(strike*.45),mana:13,tag:'TÁCTICA',effect:'disarm',attackDown:2,desc:`Inflige ${Math.round(strike*.45)} y reduce 2 el daño enemigo por todo el combate.`},
      {key:'warrior-concussion',name:'Golpe Conmocionante',art:'warrior-rompeguardia.jpg',kind:'attack',value:Math.round(strike*.9),mana:16,tag:'TÁCTICA',effect:'stun',desc:`Inflige ${Math.round(strike*.9)}. Si no tiene guardia, el enemigo pierde su próximo turno.`},
      {key:'warrior-intimidate',name:'Intimidación',art:'warrior-grito-guerra.jpg',kind:'debuff',value:0,mana:10,tag:'TÁCTICA',effect:'intimidate',weak:1,vulnerable:1,desc:'Aplica Debilidad y Vulnerable durante 1 turno.'}
    ];
  }
  function archerSynergyCards(attack){
    const shot=Math.max(6,Math.round(attack*.72));
    return [
      {key:'archer-corrosive-arrow',name:'Flecha Corrosiva',art:'archer-flecha-corrosiva.webp',kind:'attack',value:shot,acid:1,tag:'ATAQUE',effect:'acid_apply',fx:'acid-arrow',desc:`Inflige ${shot} de daño y aplica 1 de Ácido.`},
      {key:'archer-poison-needles',name:'Agujas Envenenadas',art:'archer-agujas-envenenadas.webp',kind:'attack',value:Math.max(3,Math.round(attack*.3)),hits:4,acid:2,mana:11,tag:'TÁCTICA',effect:'acid_multi',fx:'needles',desc:'Golpea 4 veces y aplica 2 de Ácido.'},
      {key:'archer-caustic-rain',name:'Lluvia Cáustica',art:'archer-lluvia-caustica.webp',kind:'attack',value:Math.max(4,Math.round(attack*.38)),hits:3,acid:3,mana:14,tag:'TÁCTICA',effect:'acid_rain',fx:'acid-rain',desc:'Golpea 3 veces y aplica 3 de Ácido.'},
      {key:'archer-catalyst-shot',name:'Disparo Catalizador',art:'archer-disparo-catalizador.webp',kind:'attack',value:Math.max(7,Math.round(attack*.7)),mana:15,tag:'TÁCTICA',effect:'acid_detonate',fx:'catalyst',desc:'Detona todo el Ácido: +3 de daño por carga y lo consume.'},
      {key:'archer-emerald-storm',name:'Tormenta Esmeralda',art:'archer-tormenta-esmeralda.webp',kind:'attack',value:Math.max(3,Math.round(attack*.26)),hits:5,acid:1,mana:18,tag:'TÁCTICA',effect:'acid_storm',fx:'acid-storm',desc:'Golpea 5 veces. Cada carga de Ácido potencia todos los impactos.'}
    ];
  }
  function archerHunterCards(attack){
    const shot=Math.max(7,Math.round(attack*.76));
    return [
      {key:'archer-hunter-mark',name:'Marca de Presa',art:'archer-marca-presa.webp',kind:'utility',value:0,mana:10,turns:3,tag:'TÁCTICA',effect:'hunter_mark',fx:'prey-mark',desc:'Marca al enemigo 3 turnos. Tus ataques le infligen +25% de daño.'},
      {key:'archer-hunter-eye',name:'Ojo de Halcón',art:'archer-ojo-halcon.webp',kind:'utility',value:0,mana:8,tag:'TÁCTICA',effect:'hunter_eye',fx:'hawk-eye',desc:'Revela 3 cartas: elegí 1. Tu próximo ataque será crítico.'},
      {key:'archer-hunter-pierce',name:'Flecha Perforante',art:'archer-flecha-perforante.webp',kind:'attack',value:shot,tag:'ATAQUE',effect:'hunter_pierce',fx:'piercing-arrow',desc:`Inflige ${shot} de daño. Contra una presa marcada ignora toda su guardia.`},
      {key:'archer-hunter-shadow',name:'Paso entre Sombras',art:'archer-paso-sombras.webp',kind:'block',value:7,tag:'DEFENSA',effect:'hunter_evade',fx:'shadow-step',desc:'Obtiene 7 de bloqueo, roba 1 carta y evade el próximo ataque enemigo.'},
      {key:'archer-hunter-sentence',name:'Sentencia del Cazador',art:'archer-sentencia-cazador.webp',kind:'attack',value:Math.round(attack*1.35),mana:18,tag:'TÁCTICA',effect:'hunter_sentence',fx:'hunter-sentence',desc:'Consume Marca para un gran remate. Devastadora bajo 35% de vida.'}
    ];
  }
  function archerTrapCards(attack){
    const trapHit=Math.max(8,Math.round(attack*.86));
    return [
      {key:'archer-trap-spikes',name:'Trampa de Pinchos',art:'archer-trampa-pinchos.webp',kind:'utility',value:0,mana:9,trapDamage:trapHit,tag:'TÁCTICA',effect:'trap_spikes',fx:'trap-spikes',desc:`Prepara una trampa. Al actuar el enemigo, recibe ${trapHit} de daño que ignora guardia.`},
      {key:'archer-trap-snare',name:'Cepo de Hierro',art:'archer-cepo-hierro.webp',kind:'utility',value:0,mana:12,trapDamage:Math.max(5,Math.round(attack*.48)),tag:'TÁCTICA',effect:'trap_snare',fx:'trap-snare',desc:'Prepara un cepo. Daña y cancela la próxima acción enemiga.'},
      {key:'archer-trap-net',name:'Red Enmarañante',art:'archer-red-enmaranante.webp',kind:'utility',value:0,mana:10,trapDamage:Math.max(3,Math.round(attack*.3)),tag:'TÁCTICA',effect:'trap_net',fx:'trap-net',desc:'Prepara una red. Al activarse aplica Debilidad 2 y Vulnerable 1.'},
      {key:'archer-trap-decoy',name:'Señuelo Explosivo',art:'archer-senuelo-explosivo.webp',kind:'utility',value:0,mana:15,trapDamage:Math.max(12,Math.round(attack*1.18)),tag:'TÁCTICA',effect:'trap_decoy',fx:'trap-decoy',desc:'Prepara un señuelo. Al activarse destruye la guardia enemiga y explota.'},
      {key:'archer-trap-mastery',name:'Preparación Magistral',art:'archer-preparacion-magistral.webp',kind:'utility',value:0,mana:18,tag:'TÁCTICA',effect:'trap_mastery',fx:'trap-mastery',desc:'Las próximas 2 trampas se preparan mejoradas: duplican su daño y control.'}
    ];
  }
  function mageAdvancedCards(attack){
    const bolt=Math.max(7,Math.round(attack*.78));
    return [
      {key:'mage-arcane-spark',name:'Chispa Arcana',art:'mage-misil-arcano.webp',kind:'spell',value:bolt,arcaneGain:1,tag:'ATAQUE',fx:'arcane',desc:`Inflige ${Math.round(bolt*1.1)} de daño arcano y genera 1 Carga.`},
      {key:'mage-arcane-orbit',name:'Órbita de Cristal',art:'mage-ecos-arcanos.webp',kind:'spell',value:Math.max(4,Math.round(attack*.34)),hits:3,mana:10,arcaneGain:1,tag:'TÁCTICA',fx:'echoes',desc:'Golpea 3 veces y genera 1 Carga Arcana.'},
      {key:'mage-arcane-channel',name:'Canalizar el Éter',art:'mage-barrera-runica.webp',kind:'mana',value:16,arcaneGain:2,tag:'HABILIDAD',fx:'rune',desc:'Recupera 16 de maná y genera 2 Cargas Arcanas.'},
      {key:'mage-arcane-overload',name:'Sobrecarga Astral',art:'mage-nova-celeste.webp',kind:'spell',value:Math.round(attack*.8),mana:14,arcaneConsume:3,arcaneDamage:Math.max(5,Math.round(attack*.4)),tag:'TÁCTICA',fx:'nova',desc:`Consume hasta 3 Cargas: +${Math.max(5,Math.round(attack*.4))} de daño por cada una.`},
      {key:'mage-arcane-singularity',name:'Singularidad Celeste',art:'mage-nova-celeste.webp',kind:'spell',value:Math.round(attack*1.05),mana:18,arcaneConsume:5,arcaneDamage:Math.max(6,Math.round(attack*.48)),vulnerable:2,tag:'TÁCTICA',fx:'nova',desc:'Consume hasta 5 Cargas para causar daño masivo y aplica Vulnerable 2.'},

      {key:'mage-rune-shield',name:'Escudo de Glifos',art:'mage-barrera-runica.webp',kind:'block',value:14,arcaneGain:1,tag:'DEFENSA',fx:'rune',desc:'Obtiene 14 de bloqueo y genera 1 Carga Arcana.'},
      {key:'mage-rune-mirror',name:'Espejo Rúnico',art:'mage-barrera-runica.webp',kind:'block',value:9,mana:10,thorns:8,tag:'TÁCTICA',fx:'rune',desc:'Obtiene 9 de bloqueo y devuelve 8 de daño al próximo atacante.'},
      {key:'mage-rune-ward',name:'Runa Persistente',art:'mage-barrera-runica.webp',kind:'block',value:12,mana:12,retain:.5,tag:'TÁCTICA',fx:'rune',desc:'Obtiene 12 de bloqueo y conserva 50% al terminar el turno.'},
      {key:'mage-rune-expansion',name:'Geometría Imposible',art:'mage-sello-fractura.webp',kind:'block',value:7,mana:14,doubleBlock:true,tag:'TÁCTICA',fx:'fracture',desc:'Obtiene 7 de bloqueo y luego duplica el bloqueo actual.'},
      {key:'mage-rune-fortress',name:'Fortaleza Astral',art:'mage-barrera-runica.webp',kind:'block',value:8,mana:16,arcaneConsume:5,arcaneBlock:5,tag:'TÁCTICA',fx:'rune',desc:'Obtiene 8 de bloqueo +5 por cada Carga consumida.'},

      {key:'mage-control-needle',name:'Aguja Temporal',art:'mage-misil-arcano.webp',kind:'spell',value:Math.round(bolt*.72),mana:9,weak:2,tag:'TÁCTICA',fx:'arcane',desc:'Inflige daño arcano y aplica Debilidad durante 2 turnos.'},
      {key:'mage-control-fracture',name:'Fractura de Maná',art:'mage-sello-fractura.webp',kind:'bash',value:Math.round(bolt*.86),mana:12,vulnerable:3,tag:'TÁCTICA',fx:'fracture',desc:'Inflige daño y aplica Vulnerable durante 3 turnos.'},
      {key:'mage-control-spellbind',name:'Sello de Silencio',art:'mage-sello-fractura.webp',kind:'spell',value:Math.round(bolt*.7),mana:15,stun:true,tag:'TÁCTICA',fx:'fracture',desc:'Inflige daño. Si el enemigo no tiene guardia, pierde su próximo turno.'},
      {key:'mage-control-gravity',name:'Pozo Gravitatorio',art:'mage-nova-celeste.webp',kind:'debuff',value:0,mana:13,weak:2,vulnerable:1,tag:'TÁCTICA',fx:'nova',desc:'Aplica Debilidad 2 y Vulnerable 1.'},
      {key:'mage-control-meteor',name:'Meteorito del Vacío',art:'mage-nova-celeste.webp',kind:'spell',value:Math.round(attack*1.75),mana:18,tag:'TÁCTICA',fx:'nova',desc:`Inflige ${Math.round(Math.round(attack*1.75)*1.1)} de daño arcano.`}
    ];
  }
  function priestAdvancedCards(attack){
    const light=Math.max(7,Math.round(attack*.74));
    const heal=Math.max(7,Math.round(heroMaxHp()*.055));
    return [
      {key:'priest-devotion-verse',name:'Versículo Radiante',art:'priest-castigo-radiante.webp',kind:'spell',value:light,faithGain:2,tag:'ATAQUE',fx:'holy',desc:'Inflige daño sagrado y genera 2 Fe.'},
      {key:'priest-devotion-hymn',name:'Himno Reparador',art:'priest-plegaria-serena.webp',kind:'heal',value:heal,faithGain:2,tag:'HABILIDAD',fx:'heal',desc:`Cura ${heal} de vida y genera 2 Fe.`},
      {key:'priest-devotion-communion',name:'Comunión Serena',art:'priest-plegaria-serena.webp',kind:'mana',value:14,faithGain:2,tag:'HABILIDAD',fx:'heal',desc:'Recupera 14 de maná y genera 2 Fe.'},
      {key:'priest-devotion-vow',name:'Voto del Alba',art:'priest-egida-fe.webp',kind:'block',value:11,faithGain:2,tag:'DEFENSA',fx:'aegis',desc:'Obtiene 11 de bloqueo y genera 2 Fe.'},
      {key:'priest-devotion-miracle',name:'Milagro de Renovación',art:'priest-plegaria-serena.webp',kind:'heal',value:heal,mana:18,faithConsume:6,faithHeal:6,tag:'TÁCTICA',fx:'heal',desc:`Cura ${heal} +6 por cada Fe consumida, hasta 6.`},

      {key:'priest-guardian-aegis',name:'Égida Solar',art:'priest-egida-fe.webp',kind:'block',value:16,faithGain:1,tag:'DEFENSA',fx:'aegis',desc:'Obtiene 16 de bloqueo y genera 1 Fe.'},
      {key:'priest-guardian-reprisal',name:'Halo de Reprensión',art:'priest-custodia-consagrada.webp',kind:'block',value:10,mana:10,thorns:8,faithGain:1,tag:'TÁCTICA',fx:'consecration',desc:'Obtiene 10 de bloqueo, genera 1 Fe y devuelve 8 de daño.'},
      {key:'priest-guardian-sanctuary',name:'Santuario Persistente',art:'priest-custodia-consagrada.webp',kind:'block',value:13,mana:12,retain:.5,tag:'TÁCTICA',fx:'consecration',desc:'Obtiene 13 de bloqueo y conserva 50% al terminar el turno.'},
      {key:'priest-guardian-providence',name:'Providencia',art:'priest-egida-fe.webp',kind:'block',value:9,mana:14,faithConsume:4,faithBlock:6,tag:'TÁCTICA',fx:'aegis',desc:'Obtiene 9 de bloqueo +6 por cada Fe consumida, hasta 4.'},
      {key:'priest-guardian-bastion',name:'Bastión Consagrado',art:'priest-custodia-consagrada.webp',kind:'block',value:8,mana:16,doubleBlock:true,tag:'TÁCTICA',fx:'consecration',desc:'Obtiene 8 de bloqueo y luego duplica el bloqueo actual.'},

      {key:'priest-judgement-lance',name:'Lanza del Alba',art:'priest-castigo-radiante.webp',kind:'spell',value:Math.round(light*1.05),faithGain:1,tag:'ATAQUE',fx:'holy',desc:'Inflige daño sagrado y genera 1 Fe.'},
      {key:'priest-judgement-purge',name:'Palabra de Expiación',art:'priest-castigo-radiante.webp',kind:'spell',value:Math.round(light*.7),mana:10,weak:2,faithGain:1,tag:'TÁCTICA',fx:'holy',desc:'Inflige daño, aplica Debilidad 2 y genera 1 Fe.'},
      {key:'priest-judgement-sentence',name:'Sentencia Solar',art:'priest-juicio-alba.webp',kind:'bash',value:Math.round(light*.9),mana:13,faithConsume:3,faithDamage:Math.max(4,Math.round(attack*.35)),faithHeal:2,vulnerable:2,tag:'TÁCTICA',fx:'judgement',desc:'Consume hasta 3 Fe para sumar daño, curarte y aplicar Vulnerable 2.'},
      {key:'priest-judgement-revelation',name:'Revelación',art:'priest-juicio-alba.webp',kind:'spell',value:Math.round(light*.8),mana:15,faithConsume:5,faithDamage:Math.max(5,Math.round(attack*.4)),healPerResource:2,tag:'TÁCTICA',fx:'judgement',desc:'Consume hasta 5 Fe: suma daño y cura 2 de vida por cada una.'},
      {key:'priest-judgement-apocalypse',name:'Juicio Final',art:'priest-juicio-alba.webp',kind:'bash',value:Math.round(attack*1.15),mana:18,faithConsume:9,faithDamage:Math.max(4,Math.round(attack*.3)),faithHeal:2,vulnerable:3,tag:'TÁCTICA',fx:'judgement',desc:'Consume toda la Fe para un gran juicio, curarte y aplicar Vulnerable 3.'}
    ];
  }
  function assassinAdvancedCards(attack){
    const cut=Math.max(7,Math.round(attack*.7));
    return [
      {key:'assassin-combo-feint',name:'Finta Encadenada',art:'assassin-corte-umbrio.webp',kind:'attack',value:cut,comboGain:2,tag:'ATAQUE',fx:'shadow',desc:'Inflige daño y genera 2 Combo.'},
      {key:'assassin-combo-flurry',name:'Ráfaga de Dagas',art:'assassin-danza-dagas.webp',kind:'attack',value:Math.max(3,Math.round(attack*.25)),hits:4,mana:10,comboGain:2,tag:'TÁCTICA',fx:'daggers',desc:'Golpea 4 veces y genera 2 Combo.'},
      {key:'assassin-combo-opening',name:'Apertura Mortal',art:'assassin-paso-fantasma.webp',kind:'block',value:9,comboGain:2,draw:1,tag:'DEFENSA',fx:'smoke',desc:'Obtiene 9 de bloqueo, roba 1 carta y genera 2 Combo.'},
      {key:'assassin-combo-rend',name:'Desgarro Preciso',art:'assassin-corte-umbrio.webp',kind:'attack',value:Math.round(cut*.8),mana:13,comboConsume:3,comboDamage:Math.max(5,Math.round(attack*.4)),tag:'TÁCTICA',fx:'daggers',desc:'Consume hasta 3 Combo para sumar daño.'},
      {key:'assassin-combo-finale',name:'Final de las Cien Hojas',art:'assassin-sentencia-umbria.webp',kind:'attack',value:Math.round(attack*1.05),mana:18,comboConsume:5,comboDamage:Math.max(6,Math.round(attack*.45)),effect:'assassin_execute',tag:'TÁCTICA',fx:'execution',desc:'Consume hasta 5 Combo. Devastadora contra enemigos bajo 35% de vida.'},

      {key:'assassin-poison-fang',name:'Colmillo Tóxico',art:'assassin-veneno-medianoche.webp',kind:'attack',value:Math.round(cut*.7),poison:3,tag:'ATAQUE',fx:'poison',desc:'Inflige daño y aplica 3 de Veneno.'},
      {key:'assassin-poison-needles',name:'Agujas Negras',art:'assassin-danza-dagas.webp',kind:'attack',value:Math.max(3,Math.round(attack*.23)),hits:4,poison:2,mana:11,tag:'TÁCTICA',fx:'poison',desc:'Golpea 4 veces y aplica 2 de Veneno.'},
      {key:'assassin-poison-cloud',name:'Nube de Belladona',art:'assassin-veneno-medianoche.webp',kind:'debuff',value:0,mana:10,poison:4,weak:2,tag:'TÁCTICA',fx:'poison',desc:'Aplica 4 de Veneno y Debilidad durante 2 turnos.'},
      {key:'assassin-poison-catalyst',name:'Catalizador Umbrío',art:'assassin-veneno-medianoche.webp',kind:'attack',value:Math.round(cut*.6),mana:14,effect:'poison_detonate',poisonMultiplier:3,tag:'TÁCTICA',fx:'poison',desc:'Consume todo el Veneno y suma 3 de daño por cada carga.'},
      {key:'assassin-poison-plague',name:'Plaga de Medianoche',art:'assassin-veneno-medianoche.webp',kind:'attack',value:Math.round(cut*.75),poison:7,mana:18,vulnerable:1,tag:'TÁCTICA',fx:'poison',desc:'Inflige daño, aplica 7 de Veneno y Vulnerable 1.'},

      {key:'assassin-shadow-step',name:'Paso entre Sombras',art:'assassin-paso-fantasma.webp',kind:'block',value:8,evade:1,comboGain:1,tag:'DEFENSA',fx:'smoke',desc:'Obtiene 8 de bloqueo, evade el próximo ataque y genera 1 Combo.'},
      {key:'assassin-shadow-focus',name:'Ojo del Verdugo',art:'assassin-sentencia-umbria.webp',kind:'utility',value:0,mana:10,nextCritical:true,draw:1,tag:'TÁCTICA',fx:'execution',desc:'Roba 1 carta y hace crítico tu próximo ataque.'},
      {key:'assassin-shadow-veil',name:'Velo Impenetrable',art:'assassin-paso-fantasma.webp',kind:'block',value:11,mana:12,retain:.5,comboGain:1,tag:'TÁCTICA',fx:'smoke',desc:'Obtiene 11 de bloqueo, conserva 50% y genera 1 Combo.'},
      {key:'assassin-shadow-terror',name:'Terror Silencioso',art:'assassin-corte-umbrio.webp',kind:'debuff',value:0,mana:13,weak:2,vulnerable:2,tag:'TÁCTICA',fx:'shadow',desc:'Aplica Debilidad 2 y Vulnerable 2.'},
      {key:'assassin-shadow-eclipse',name:'Eclipse Letal',art:'assassin-sentencia-umbria.webp',kind:'attack',value:Math.round(attack*1.5),mana:18,nextCritical:true,tag:'TÁCTICA',fx:'execution',desc:'Inflige un golpe devastador y prepara un crítico para el próximo ataque.'}
    ];
  }
  function tamerAdvancedCards(attack){
    const strike=Math.max(7,Math.round(attack*.72));
    return [
      {key:'tamer-bond-call',name:'Llamado del Compañero',art:'tamer-latigazo-vinculo.webp',kind:'attack',value:strike,bondGain:2,tag:'ATAQUE',fx:'whip',desc:'Inflige daño junto a tu bestia y genera 2 Vínculo.'},
      {key:'tamer-bond-guard',name:'Pacto Protector',art:'tamer-guardian-bestial.webp',kind:'block',value:12,bondGain:2,tag:'DEFENSA',fx:'beastguard',desc:'Obtiene 12 de bloqueo y genera 2 Vínculo.'},
      {key:'tamer-bond-howl',name:'Aullido de Unión',art:'tamer-aullido-manada.webp',kind:'strength',value:2,mana:10,bondGain:2,tag:'TÁCTICA',fx:'howl',desc:'Gana +2 Fuerza y genera 2 Vínculo.'},
      {key:'tamer-bond-fortress',name:'Lazo Inquebrantable',art:'tamer-guardian-bestial.webp',kind:'block',value:8,mana:14,bondConsume:4,bondBlock:6,tag:'TÁCTICA',fx:'beastguard',desc:'Consume hasta 4 Vínculo: +6 de bloqueo por cada uno.'},
      {key:'tamer-bond-alpha',name:'Juramento Alfa',art:'tamer-embestida-alfa.webp',kind:'attack',value:Math.round(attack*.95),mana:18,bondConsume:5,bondDamage:Math.max(6,Math.round(attack*.45)),vulnerable:2,tag:'TÁCTICA',fx:'alpha-charge',desc:'Consume hasta 5 Vínculo para sumar daño y aplicar Vulnerable 2.'},

      {key:'tamer-pack-pounce',name:'Salto de la Manada',art:'tamer-mordida-coordinada.webp',kind:'attack',value:Math.max(3,Math.round(attack*.3)),hits:3,bondGain:1,tag:'ATAQUE',fx:'packbite',desc:'La manada golpea 3 veces y genera 1 Vínculo.'},
      {key:'tamer-pack-frenzy',name:'Frenesí Bestial',art:'tamer-mordida-coordinada.webp',kind:'attack',value:Math.max(3,Math.round(attack*.25)),hits:5,mana:12,bondGain:1,tag:'TÁCTICA',fx:'packbite',desc:'La manada golpea 5 veces y genera 1 Vínculo.'},
      {key:'tamer-pack-intercept',name:'Intercepción Feral',art:'tamer-guardian-bestial.webp',kind:'block',value:10,mana:10,thorns:7,bondGain:1,tag:'TÁCTICA',fx:'beastguard',desc:'Obtiene 10 de bloqueo, genera 1 Vínculo y devuelve 7 de daño.'},
      {key:'tamer-pack-hunt',name:'Caza Coordinada',art:'tamer-mordida-coordinada.webp',kind:'attack',value:Math.round(strike*.8),mana:13,weak:2,bondGain:1,tag:'TÁCTICA',fx:'packbite',desc:'Inflige daño, aplica Debilidad 2 y genera 1 Vínculo.'},
      {key:'tamer-pack-onslaught',name:'Asalto de la Manada',art:'tamer-embestida-alfa.webp',kind:'attack',value:Math.max(4,Math.round(attack*.36)),hits:4,mana:18,bondConsume:3,bondDamage:Math.max(4,Math.round(attack*.28)),tag:'TÁCTICA',fx:'alpha-charge',desc:'Golpea 4 veces y consume hasta 3 Vínculo para sumar daño.'},

      {key:'tamer-command-track',name:'Orden: Rastrear',art:'tamer-latigazo-vinculo.webp',kind:'utility',value:0,draw:2,bondGain:1,tag:'HABILIDAD',fx:'whip',desc:'Roba 2 cartas y genera 1 Vínculo.'},
      {key:'tamer-command-harass',name:'Orden: Hostigar',art:'tamer-mordida-coordinada.webp',kind:'debuff',value:0,mana:10,weak:2,bondGain:1,tag:'TÁCTICA',fx:'packbite',desc:'Aplica Debilidad 2 y genera 1 Vínculo.'},
      {key:'tamer-command-shelter',name:'Orden: Refugio',art:'tamer-guardian-bestial.webp',kind:'block',value:13,mana:12,retain:.5,bondGain:1,tag:'TÁCTICA',fx:'beastguard',desc:'Obtiene 13 de bloqueo, conserva 50% y genera 1 Vínculo.'},
      {key:'tamer-command-maul',name:'Orden: Desgarrar',art:'tamer-mordida-coordinada.webp',kind:'bash',value:Math.round(strike*.9),mana:14,vulnerable:3,bondGain:1,tag:'TÁCTICA',fx:'packbite',desc:'Inflige daño, aplica Vulnerable 3 y genera 1 Vínculo.'},
      {key:'tamer-command-primal',name:'Dominio Primordial',art:'tamer-embestida-alfa.webp',kind:'strength',value:4,mana:18,bondGain:3,tag:'TÁCTICA',fx:'howl',desc:'Gana +4 Fuerza y genera 3 Vínculo.'}
    ];
  }
  function advancedCardsForClass(classId){
    const attack=heroAttack();
    const pools={
      warrior:()=>warriorSynergyCards(Math.max(7,Math.round(attack*.75))),
      archer:()=>[...archerSynergyCards(attack),...archerHunterCards(attack),...archerTrapCards(attack)],
      mage:()=>mageAdvancedCards(attack),
      priest:()=>priestAdvancedCards(attack),
      assassin:()=>assassinAdvancedCards(attack),
      tamer:()=>tamerAdvancedCards(attack)
    };
    return pools[classId]?.()||[];
  }
  function uniqueCards(cards){
    const found=new Map();
    (cards||[]).forEach(card=>{
      if(card?.key && !found.has(card.key)) found.set(card.key,{...card});
    });
    return [...found.values()];
  }
  function cardFamily(card,starter=false){
    if(starter) return 'INICIAL';
    if(card?.kind==='block') return 'FORTALEZA';
    if(card?.kind==='debuff' || ['weak','armor_break','disarm','stun','intimidate'].includes(card?.effect)) return 'DOMINIO';
    return 'ASALTO';
  }
  function advancedCardFamily(classId,card){
    const key=String(card?.key||'');
    const classFamilies={
      archer:[['archer-hunter-','ACECHO DEL CAZADOR'],['archer-trap-','MAESTRO DE TRAMPAS'],['archer-','ALQUIMIA DE CAZA']],
      mage:[['mage-arcane-','DOMINIO ARCANO'],['mage-rune-','ESCUELA RÚNICA'],['mage-control-','CONTROL DEL ÉTER']],
      priest:[['priest-devotion-','DEVOCIÓN'],['priest-guardian-','CUSTODIA SAGRADA'],['priest-judgement-','JUICIO SOLAR']],
      assassin:[['assassin-combo-','CADENA LETAL'],['assassin-poison-','ALQUIMIA UMBRÍA'],['assassin-shadow-','ARTE DE LAS SOMBRAS']],
      tamer:[['tamer-bond-','VÍNCULO PRIMORDIAL'],['tamer-pack-','FUERZA DE MANADA'],['tamer-command-','DOMINIO BESTIAL']]
    };
    const match=(classFamilies[classId]||[]).find(([prefix])=>key.startsWith(prefix));
    return match?.[1]||cardFamily(card);
  }
  function catalogForClass(classId){
    const starter=uniqueCards(classStarterDeck(classId)).map(card=>({...card,family:'INICIAL',rarity:'INICIAL',starter:true}));
    const advancedSource=advancedCardsForClass(classId);
    if(!advancedSource.length) return starter;
    const advanced=advancedSource.map(card=>{
      const mana=Math.max(0,n(card.mana,0));
      return {
        ...card,
        family:advancedCardFamily(classId,card),
        rarity:mana>=15?'RARA':mana>=11?'POCO COMÚN':'COMÚN',
        starter:false
      };
    });
    return uniqueCards([...starter,...advanced]);
  }
  function discoveredKeys(classId=heroClass()){
    if(!state) return [];
    state.cardCodex=state.cardCodex && typeof state.cardCodex==='object' ? state.cardCodex : {};
    state.cardCodex[classId]=Array.isArray(state.cardCodex[classId]) ? state.cardCodex[classId] : [];
    return state.cardCodex[classId];
  }
  function discoverCards(cards,classId=heroClass()){
    if(!state || !Array.isArray(cards)) return;
    const bucket=discoveredKeys(classId);
    let changed=false;
    cards.forEach(card=>{
      const key=String(card?.key||'').trim();
      if(key && !bucket.includes(key)){ bucket.push(key); changed=true; }
    });
    if(changed) safe(()=>saveState());
  }
  window.CardCodex={
    catalog(classId){ return catalogForClass(classId||heroClass()).map(card=>({...card})); },
    discovered(classId){ return [...discoveredKeys(classId||heroClass())]; },
    discover(cards,classId){ discoverCards(cards,classId||heroClass()); }
  };
  function classCard(){
    const cards={
      warrior:['Embate del Acero','🛡',2,'attack',Math.round(heroAttack()*1.9),'Daño pesado y +8 bloqueo.'],
      archer:['Tiro Perforante','➹',2,'attack',Math.round(heroAttack()*1.75),'Daño preciso. Ignora la guardia enemiga.'],
      mage:['Rayo Arcano','✧',2,'spell',Math.round(heroAttack()*2.1),'Consume 20 maná e inflige daño arcano.'],
      priest:['Luz del Alba','☀',2,'heal',Math.round(heroMaxHp()*.16),'Consume 18 maná y cura vida.'],
      assassin:['Danza de Dagas','✦',2,'attack',Math.round(heroAttack()*2.25),'Ataque letal. Puede ser crítico.'],
      tamer:['Llamado de la Manada','♞',2,'attack',Math.round(heroAttack()*1.85),'Tu compañero ataca junto a vos.']
    };
    const c=cards[heroClass()]||cards.warrior;
    return {key:'class',name:c[0],icon:c[1],cost:c[2],kind:c[3],value:c[4],mana:c[3]==='spell'?20:(c[3]==='heal'?18:0),desc:c[5],classCard:true};
  }
  function enemyFor(type){
    const f=hunt.floor+((hunt.act-1)*5);
    const region=(Math.max(1,Math.floor(n(hunt.act,1)))-1)%ENEMY_POOLS.length;
    const scene=huntScene();
    const group=scene.enemies||ENEMY_POOLS[region];
    const pool=type==='boss' ? group.boss : type==='elite' ? group.elite : group.normal;
    const e=pool[Math.floor(Math.random()*pool.length)];
    const scale=1+f*.12+(type==='elite'?.34:0)+(type==='boss'?.66:0);
    const enemy={name:e[0],icon:e[1],image:e[4],type, regionKey:scene.key,regionName:scene.name,maxHp:Math.round(e[2]*scale),hp:Math.round(e[2]*scale),damage:Math.round(e[3]*scale),intent:'Atacar', intentText:'', guard:0, acid:0, poison:0, marked:0, affinity:e[5] || (type==='elite'?'Blindado':type==='boss'?'Furioso':'Inestable')};
    rollIntent(enemy);
    return enemy;
  }
  function rollIntent(enemy){
    const pool=enemy.type==='boss' ? ['attack','attack','charge','guard'] : enemy.type==='elite' ? ['attack','charge','guard'] : ['attack','attack','guard'];
    const kind=pool[Math.floor(Math.random()*pool.length)];
    enemy.intentKind=kind;
    if(kind==='guard'){ enemy.intent='Fortificarse'; enemy.intentText=`+${Math.ceil(enemy.damage*.8)} guardia`; }
    else if(kind==='charge'){ enemy.intent='Golpe cargado'; enemy.intentText=`${Math.ceil(enemy.damage*1.55)} daño`; }
    else { enemy.intent='Atacar'; enemy.intentText=`${enemy.damage} daño`; }
  }
  function draw(count){
    for(let i=0;i<count;i++){
      if(!hunt.draw.length){ hunt.draw=shuffle(hunt.discard); hunt.discard=[]; }
      if(hunt.draw.length) hunt.hand.push(hunt.draw.pop());
    }
    discoverCards(hunt.hand);
  }
  function revealHunterChoices(){
    const choices=[];
    while(choices.length<3){
      if(!hunt.draw.length){
        if(!hunt.discard.length) break;
        hunt.draw=shuffle(hunt.discard);
        hunt.discard=[];
      }
      const candidate=hunt.draw.pop();
      if(candidate) choices.push(candidate);
    }
    hunt.nextCritical=true;
    hunt.cardChoice=choices.length?choices:null;
    if(!choices.length) note('Ojo de Halcón prepara un crítico, pero no quedan cartas para revelar.');
  }
  function chooseHunterCard(id){
    if(!hunt.cardChoice?.length) return;
    const selected=hunt.cardChoice.find(card=>card.id===id);
    if(!selected) return;
    hunt.hand.push(selected);
    hunt.discard.push(...hunt.cardChoice.filter(card=>card.id!==id));
    hunt.cardChoice=null;
    discoverCards([selected]);
    note(`Ojo de Halcón elige ${selected.name}. Tu próximo ataque será crítico.`);
    safe(()=>window.Sound?.click?.());
    render();
  }
  function startFight(choice){
    hunt.enemy=enemyFor(choice.type); hunt.screen='combat'; hunt.block=0; hunt.arcane=0; hunt.faith=0; hunt.combo=0; hunt.bond=0;
    hunt.evade=0; hunt.nextCritical=false; hunt.cardChoice=null; hunt.traps=[]; hunt.trapMastery=0;
    hunt.draw=shuffle(hunt.deck); hunt.hand=[]; hunt.discard=[]; draw(5);
    note(`${hunt.enemy.name} bloquea el camino.`, 'danger');
    safe(()=>window.Sound?.setScene?.(choice.type==='boss'?'boss':'battle'));
    render();
    safe(()=>window.Sound?.cardDraw?.(5));
    safe(()=>window.setTimeout(()=>window.Sound?.warning?.(),240));
    flashCombat('enter');
  }
  function note(text){ hunt.notes.unshift(text); hunt.notes=hunt.notes.slice(0,5); }
  function flashCombat(kind,fx){
    requestAnimationFrame(()=>{
      const combat=document.querySelector('#secCardHunt .cardspire-combat');
      if(!combat) return;
      combat.classList.remove('hero-action','enemy-action','enter-action');
      combat.classList.add(`${kind}-action`);
      if(fx) combat.classList.add(`skill-${fx}`);
      window.setTimeout(()=>{
        combat.classList.remove(`${kind}-action`);
        if(fx) combat.classList.remove(`skill-${fx}`);
      },680);
    });
  }
  function chooseNode(id){
    const options=hunt.map[hunt.floor]||[]; const chosen=options.find(x=>x.id===id); if(!chosen) return;
    if(['fight','elite','boss'].includes(chosen.type)) return startFight(chosen);
    if(chosen.type==='rest'){
      hunt.screen='sanctuary';
      note('El Santuario ofrece dos bendiciones para esta expedición.');
      render();
      return;
    }
    if(chosen.type==='treasure'){
      const base=18+(hunt.act*6)+(hunt.floor*3);
      const ancient=Math.random()<.12;
      const gold=Math.round((base+Math.floor(Math.random()*11))*(ancient?1.65:1));
      hunt.treasure={opened:false,gold,ancient};
      hunt.screen='treasure';
      note('Encontraste un cofre sellado en la senda.');
      render();
      return;
    }
    if(chosen.type==='shop'){
      hunt.shopOffers=makeShopOffers();
      hunt.screen='shop';
      render();
      return;
    }
    hunt.screen='event'; hunt.event=chosen; render();
  }
  function reachableNodeIndexes(floor=hunt?.floor){
    const row=hunt?.map?.[floor]||[];
    if(!row.length) return [];
    if(floor<=0||hunt.routeLane===null||hunt.routeLane===undefined){
      return row.map((_,index)=>index);
    }
    const previous=hunt.map[floor-1]||[];
    if(row.length===1||previous.length===1) return row.map((_,index)=>index);
    const previousLane=Math.max(0,Math.min(previous.length-1,Math.floor(n(hunt.routeLane,0))));
    const previousX=mapRouteX(previousLane,previous.length);
    return row
      .map((_,index)=>index)
      .filter(index=>Math.abs(mapRouteX(index,row.length)-previousX)<=245);
  }
  function chooseReachableNode(id){
    const options=hunt.map[hunt.floor]||[];
    const lane=options.findIndex(x=>x.id===id);
    if(lane<0||!reachableNodeIndexes().includes(lane)) return;
    hunt.routeLane=lane;
    hunt.routeHistory=Array.isArray(hunt.routeHistory)?hunt.routeHistory.filter(step=>step.floor!==hunt.floor):[];
    hunt.routeHistory.push({floor:hunt.floor,lane,id,type:options[lane]?.type||'event'});
    hunt.selectedNode=null;
    safe(()=>window.Sound?.nodeSelect?.(options[lane]?.type||'event'));
    chooseNode(id);
  }
  function resolveEvent(kind){
    if(kind==='clarity'){
      hunt.mana=Math.min(hunt.maxMana,hunt.mana+30);
      note('La fuente rúnica restauró 30 de maná.');
      safe(()=>window.Sound?.sanctuary?.('mana'));
    }
    else {
      hunt.maxHp+=12; hunt.hp+=12;
      note('Una reliquia menor elevó tu vida máxima en 12.');
      safe(()=>window.Sound?.sanctuary?.('life'));
    }
    advance();
  }
  function resolveSanctuary(kind){
    if(hunt.screen!=='sanctuary') return;
    if(kind==='life'){
      hunt.maxHp+=15;
      hunt.hp+=15;
      note('Bendición de Vitalidad: +15 de vida máxima durante esta cacería.');
    }else if(kind==='mana'){
      hunt.maxMana+=12;
      hunt.mana+=12;
      note('Bendición del Éter: +12 de maná máximo durante esta cacería.');
    }else{
      return;
    }
    safe(()=>window.Sound?.sanctuary?.(kind));
    advance();
  }
  function openTreasure(){
    const treasure=hunt.treasure;
    if(!treasure||treasure.opened) return;
    treasure.opened=true;
    hunt.reward+=Math.max(0,Math.round(n(treasure.gold,0)));
    note(`${treasure.ancient?'Cofre antiguo':'Tesoro'}: +${treasure.gold} oro de expedición.`);
    safe(()=>window.Sound?.treasureOpen?.(treasure.ancient));
    render();
  }
  function makeShopOffers(){
    const available=(hunt.cardPool||[]).filter(card=>!(hunt.unlockedCards||[]).includes(card.key));
    const offers=shuffle(available).slice(0,3);
    discoverCards(offers);
    return offers;
  }
  function buyShopCard(poolId){
    const card=(hunt.shopOffers||[]).find(item=>item.poolId===poolId);
    if(!card || hunt.reward<card.price) return;
    hunt.reward-=card.price;
    const bought={...card,id:`${card.key}-shop-${Date.now()}-${Math.random().toString(36).slice(2,7)}`};
    delete bought.price;
    delete bought.rarity;
    delete bought.poolId;
    hunt.deck.push(bought);
    hunt.unlockedCards.push(card.key);
    hunt.shopOffers=hunt.shopOffers.filter(item=>item.poolId!==poolId);
    note(`Mercader: ${card.name} se unió a tu mazo por ${card.price} de oro.`);
    safe(()=>window.Sound?.shopBuy?.());
    render();
  }
  function rerollShop(){
    const cost=12;
    if(hunt.reward<cost) return;
    hunt.reward-=cost;
    hunt.shopOffers=makeShopOffers();
    note(`El Mercader renovó sus ofertas por ${cost} de oro.`);
    safe(()=>window.Sound?.cardDraw?.(3));
    render();
  }
  function advance(){
    if(isFinalVictory()){
      hunt.status='won';
      hunt.screen='complete';
      hunt.maxDepth=HUNT_SCENES.length*hunt.maxFloor;
      note('El Abismo Carmesí cayó. Tu expedición está completa y el botín espera ser asegurado.');
      safe(()=>window.Sound?.setScene?.('hunt'));
      render();
      return;
    }
    if(hunt.screen==='victory'&&hunt.enemy?.type==='boss'&&!evolutionClaimed()&&beginEvolution()) return;
    if(hunt.screen==='evolution'){
      if(hunt.pendingEvolution?.stage!=='complete') return;
      hunt.pendingEvolution=null;
    }
    hunt.floor++;
    if(hunt.floor>=hunt.maxFloor){
      hunt.act++; hunt.floor=0; hunt.map=makeMap(); hunt.routeLane=null; hunt.routeHistory=[];
      note(`Entrás al Acto ${hunt.act}. La senda se vuelve más cruel.`);
    }
    hunt.screen='map'; hunt.enemy=null; hunt.selectedNode=null;
    safe(()=>window.Sound?.setScene?.('hunt'));
    safe(()=>window.setTimeout(()=>window.Sound?.routeReveal?.(),180));
    render();
  }
  function cardManaCost(card){
    const tactical=String(card?.tag||'').toUpperCase()==='TÁCTICA';
    return tactical ? Math.max(1,n(card.mana,8)) : 0;
  }
  function cardSideStat(card){
    if(['attack','spell','bash'].includes(card?.kind)){
      let total=Math.max(0,Math.round(n(card.value,0)))*Math.max(1,Math.round(n(card.hits,1)));
      if(heroClass()==='mage'&&card.kind==='spell') total=Math.round(total*1.1);
      return `<span class="card-side-stat damage" title="${card?.hits>1?`${card.hits} impactos · `:''}Daño base total">${total}</span>`;
    }
    if(card?.kind==='block'){
      return `<span class="card-side-stat defense" title="Bloqueo"><i>🛡</i><b>${Math.max(0,Math.round(n(card.value,0)))}</b></span>`;
    }
    if(card?.kind==='heal'){
      return `<span class="card-side-stat healing" title="Curación"><i>♥</i><b>${Math.max(0,Math.round(n(card.value,0)))}</b></span>`;
    }
    if(n(card?.trapDamage,0)>0){
      return `<span class="card-side-stat damage" title="Daño al activarse">${Math.max(0,Math.round(n(card.trapDamage,0)))}</span>`;
    }
    return '';
  }
  function armTrap(card){
    const empowered=(hunt.trapMastery||0)>0;
    const trap={
      effect:card.effect,
      name:card.name,
      damage:Math.max(0,Math.round(n(card.trapDamage,0)))*(empowered?2:1),
      empowered
    };
    if(empowered) hunt.trapMastery=Math.max(0,hunt.trapMastery-1);
    hunt.traps=Array.isArray(hunt.traps)?hunt.traps:[];
    hunt.traps.push(trap);
    hunt.lastAction={icon:'⌁',text:`TRAMPA PREPARADA · ${hunt.traps.length} LISTA${hunt.traps.length===1?'':'S'}`,kind:'hero'};
    note(`${card.name} queda oculta en el terreno${empowered?' · preparación perfecta':''}.`);
  }
  function triggerTrap(enemy){
    hunt.traps=Array.isArray(hunt.traps)?hunt.traps:[];
    const trap=hunt.traps.shift();
    if(!trap) return false;
    let cancelled=false;
    let detail='';
    const damage=Math.max(0,Math.round(n(trap.damage,0)));
    if(trap.effect==='trap_spikes'){
      enemy.hp=Math.max(0,enemy.hp-damage);
      detail=`${damage} de daño directo`;
    } else if(trap.effect==='trap_snare'){
      enemy.hp=Math.max(0,enemy.hp-damage);
      cancelled=true;
      if(trap.empowered) enemy.vulnerable=Math.max(enemy.vulnerable||0,1);
      detail=`${damage} de daño · acción cancelada${trap.empowered?' · Vulnerable 1':''}`;
    } else if(trap.effect==='trap_net'){
      enemy.hp=Math.max(0,enemy.hp-damage);
      enemy.weak=Math.max(enemy.weak||0,trap.empowered?3:2);
      enemy.vulnerable=Math.max(enemy.vulnerable||0,trap.empowered?2:1);
      detail=`Debilidad ${trap.empowered?3:2} · Vulnerable ${trap.empowered?2:1}`;
    } else if(trap.effect==='trap_decoy'){
      const broken=Math.max(0,enemy.guard||0);
      enemy.guard=0;
      enemy.hp=Math.max(0,enemy.hp-damage);
      detail=`${damage} de daño · ${broken?`${broken} de guardia destruida`:'sin guardia que destruir'}`;
    }
    hunt.pendingTrapFx=trap.effect.replaceAll('_','-');
    hunt.lastAction={icon:'⌁',text:`${trap.name.toUpperCase()} · ACTIVADA`,kind:'hero',fx:hunt.pendingTrapFx};
    note(`${trap.name} se activa: ${detail}.`);
    return cancelled;
  }
  function playCard(id){
    if(hunt.cardChoice?.length) return;
    const card=hunt.hand.find(c=>c.id===id);
    if(!card) return;
    const manaCost=cardManaCost(card);
    if(manaCost>hunt.mana){
      safe(()=>window.Sound?.miss?.());
      return;
    }
    let cardWasCritical=false;
    const comboBefore=Math.max(0,Math.round(n(hunt.combo,0)));
    const comboSpent=heroClass()==='assassin'&&card.comboConsume
      ?Math.min(comboBefore,Math.max(0,Math.round(n(card.comboConsume,0))))
      :0;
    const faithBefore=Math.max(0,Math.round(n(hunt.faith,0)));
    const faithSpent=heroClass()==='priest'&&card.faithConsume
      ?Math.min(faithBefore,Math.max(0,Math.round(n(card.faithConsume,0))))
      :0;
    const bondBefore=Math.max(0,Math.round(n(hunt.bond,0)));
    const bondSpent=heroClass()==='tamer'&&card.bondConsume
      ?Math.min(bondBefore,Math.max(0,Math.round(n(card.bondConsume,0))))
      :0;
    const arcaneBefore=Math.max(0,Math.round(n(hunt.arcane,0)));
    const arcaneSpent=heroClass()==='mage'&&card.arcaneConsume
      ?Math.min(arcaneBefore,Math.max(0,Math.round(n(card.arcaneConsume,0))))
      :0;
    hunt.mana-=manaCost;
    if(card.kind==='attack'||card.kind==='spell'){
      let dmg=card.value+(hunt.strength||0);
      const markTurns=Math.max(0,hunt.enemy.marked||0);
      let critical=false;
      if(card.effect==='attack_chain') dmg+=(hunt.attacksThisTurn||0)*3;
      if((card.hits||1)>1) dmg=(card.value*(card.hits||1))+((hunt.strength||0)*(card.hits||1));
      if(card.effect==='acid_storm') dmg+=Math.max(0,hunt.enemy.acid||0)*(card.hits||1);
      if(card.effect==='acid_detonate'){
        dmg+=Math.max(0,hunt.enemy.acid||0)*3;
        hunt.enemy.acid=0;
      }
      if(card.effect==='hunter_sentence'){
        dmg+=markTurns*Math.max(4,Math.round(heroAttack()*.34));
        if(hunt.enemy.hp/hunt.enemy.maxHp<=.35) dmg=Math.round(dmg*1.7);
        hunt.enemy.marked=0;
      } else if(markTurns>0) dmg=Math.round(dmg*1.25);
      if(comboSpent) dmg+=comboSpent*Math.max(0,n(card.comboDamage,0));
      if(faithSpent) dmg+=faithSpent*Math.max(0,n(card.faithDamage,0));
      if(bondSpent) dmg+=bondSpent*Math.max(0,n(card.bondDamage,0));
      if(arcaneSpent) dmg+=arcaneSpent*Math.max(0,n(card.arcaneDamage,0));
      if(card.effect==='assassin_execute'){
        if(hunt.enemy.hp/hunt.enemy.maxHp<=.35) dmg=Math.round(dmg*1.75);
      }
      if(card.effect==='poison_detonate'){
        dmg+=Math.max(0,hunt.enemy.poison||0)*Math.max(1,n(card.poisonMultiplier,3));
        hunt.enemy.poison=0;
      }
      if(hunt.nextCritical){
        dmg=Math.round(dmg*1.75);
        hunt.nextCritical=false;
        critical=true;
        cardWasCritical=true;
      }
      if(card.effect==='execute' && hunt.enemy.hp/hunt.enemy.maxHp<=.35) dmg*=2;
      if(card.effect==='strength_strike') dmg+=(hunt.strength||0);
      if(card.effect==='spend_block'){
        const spent=Math.min(10,hunt.block);
        hunt.block-=spent;
        dmg+=spent*2;
      }
      if(heroClass()==='assassin'&&!critical&&Math.random()<.28){
        dmg=Math.round(dmg*1.7);
        critical=true;
        cardWasCritical=true;
      }
      if(heroClass()==='mage'&&card.kind==='spell') dmg=Math.round(dmg*1.1);
      if(heroClass()==='tamer'&&['whip','packbite','alpha-charge'].includes(card.fx)) dmg+=Math.max(2,Math.round(heroAttack()*.22));
      if(heroClass()==='archer'&&['arrow','twin','volley'].includes(card.fx)&&hunt.enemy.guard>0){
        hunt.enemy.guard=Math.max(0,hunt.enemy.guard-Math.ceil(dmg*.35));
      }
      if(hunt.enemy.vulnerable>0) dmg=Math.round(dmg*1.5);
      const pierces=card.effect==='hunter_pierce'&&markTurns>0;
      const guardPierce=Math.max(0,Math.min(1,n(card.guardPierce,0)));
      const effectiveGuard=Math.max(0,Math.ceil(hunt.enemy.guard*(1-guardPierce)));
      const absorbed=pierces?0:Math.min(effectiveGuard,dmg);
      if(!pierces) hunt.enemy.guard-=absorbed;
      dmg-=absorbed;
      hunt.enemy.hp=Math.max(0,hunt.enemy.hp-dmg);
      if(card.vulnerable) hunt.enemy.vulnerable=Math.max(hunt.enemy.vulnerable||0,card.vulnerable);
      if(card.acid) hunt.enemy.acid=Math.max(0,hunt.enemy.acid||0)+card.acid;
      if(card.poison) hunt.enemy.poison=Math.max(0,hunt.enemy.poison||0)+card.poison;
      if(heroClass()==='warrior') hunt.block+=2;
      if(card.key==='class'&&heroClass()==='warrior') hunt.block+=8;
      if(card.weak) hunt.enemy.weak=Math.max(hunt.enemy.weak||0,card.weak);
      if(card.effect==='disarm') hunt.enemy.attackDown=(hunt.enemy.attackDown||0)+(card.attackDown||2);
      if((card.stun||card.effect==='stun') && hunt.enemy.guard<=0) hunt.enemy.stunned=Math.max(hunt.enemy.stunned||0,1);
      if(card.blockOnHit) hunt.block+=Math.max(0,Math.round(n(card.blockOnHit,0)));
      if(card.healPerResource){
        const healed=(arcaneSpent+faithSpent+comboSpent+bondSpent)*Math.max(0,n(card.healPerResource,0));
        hunt.hp=Math.min(hunt.maxHp,hunt.hp+healed);
      }
      hunt.attacksThisTurn=(hunt.attacksThisTurn||0)+1;
      hunt.lastAction={icon:card.icon||'⚔',text:dmg?`${critical?'CRÍTICO · ':''}${dmg} DE DAÑO${comboSpent?` · COMBO ×${comboSpent}`:''}${bondSpent?` · VÍNCULO ×${bondSpent}`:''}`:`GUARDIA ROTA`,kind:'hero'};
      note(`${card.name}: ${critical?'crítico de ':''}${dmg} de daño${pierces?' · atraviesa la guardia':absorbed?` · ${absorbed} absorbido`:''}${card.poison?` · Veneno +${card.poison}`:''}${arcaneSpent?` · consumís ${arcaneSpent} Carga${arcaneSpent===1?'':'s'}`:''}${faithSpent?` · consumís ${faithSpent} Fe`:''}${comboSpent?` · consumís ${comboSpent} Combo`:''}${bondSpent?` · consumís ${bondSpent} Vínculo`:''}${card.vulnerable?` · aplica Vulnerable ${card.vulnerable}`:''}.`);
    } else if(card.kind==='bash'){
      let dmg=card.value+(hunt.strength||0);
      if(card.faithDamage) dmg+=faithSpent*Math.max(0,n(card.faithDamage,0));
      if(hunt.enemy.vulnerable>0) dmg=Math.round(dmg*1.5);
      const absorbed=Math.min(hunt.enemy.guard,dmg); hunt.enemy.guard-=absorbed; dmg-=absorbed;
      hunt.enemy.hp=Math.max(0,hunt.enemy.hp-dmg); hunt.enemy.vulnerable=card.vulnerable||2;
      if(card.stun&&hunt.enemy.guard<=0) hunt.enemy.stunned=Math.max(hunt.enemy.stunned||0,1);
      if(card.faithHeal&&faithSpent){
        hunt.hp=Math.min(hunt.maxHp,hunt.hp+(faithSpent*Math.max(0,n(card.faithHeal,0))));
      }
      hunt.attacksThisTurn=(hunt.attacksThisTurn||0)+1;
      hunt.lastAction={icon:'✹',text:`${dmg} · JUICIO${faithSpent?` · FE ${faithSpent}`:''}`,kind:'hero'};
      note(`${card.name}: ${dmg} de daño. ${hunt.enemy.name} queda Vulnerable${faithSpent?` · consumís ${faithSpent} Fe y recuperás ${faithSpent*Math.max(0,n(card.faithHeal,0))} de vida`:''}.`);
    } else if(card.kind==='block'){
      let gained=card.value;
      if(card.arcaneBlock) gained+=arcaneSpent*Math.max(0,n(card.arcaneBlock,0));
      if(card.effect==='faith_guard') gained+=faithSpent*Math.max(0,n(card.faithBlock,0));
      else if(card.faithBlock) gained+=faithSpent*Math.max(0,n(card.faithBlock,0));
      if(card.comboBlock) gained+=comboSpent*Math.max(0,n(card.comboBlock,0));
      if(card.bondBlock) gained+=bondSpent*Math.max(0,n(card.bondBlock,0));
      if(card.effect==='guard_chain') gained+=(hunt.defensesThisTurn||0)*3;
      const hadBlock=hunt.block>0;
      hunt.block+=gained;
      if(card.doubleBlock||card.effect==='double_block') hunt.block*=2;
      if(card.thorns||card.effect==='thorns') hunt.thorns=Math.max(hunt.thorns||0,card.thorns||7);
      if(card.retain||card.effect==='retain_block') hunt.retainBlock=Math.max(hunt.retainBlock||0,card.retain||.5);
      if(card.effect==='block_strength'&&hadBlock) hunt.strength+=1;
      if(card.evade||card.effect==='hunter_evade') hunt.evade=Math.max(hunt.evade||0,card.evade||1);
      if(card.draw||card.effect==='hunter_evade') draw(card.draw||1);
      hunt.defensesThisTurn=(hunt.defensesThisTurn||0)+1;
      hunt.lastAction={icon:'⬡',text:`+${gained} BLOQUEO`,kind:'hero'};
      note(`${card.name}: Guardia +${gained}${faithSpent?` · consumís ${faithSpent} Fe`:''}${card.effect==='double_block'?' · bloqueo duplicado':''}${card.effect==='hunter_evade'?' · próximo ataque evadido · roba 1':''}.`);
    }
    else if(card.kind==='utility'){
      if(card.effect==='hunter_mark'){
        hunt.enemy.marked=Math.max(hunt.enemy.marked||0,card.turns||3);
        hunt.lastAction={icon:'◎',text:`PRESA MARCADA · ${hunt.enemy.marked} TURNOS`,kind:'hero'};
        note(`${card.name}: ${hunt.enemy.name} queda marcado. Tus ataques infligen +25% de daño.`);
      } else if(card.effect==='hunter_eye'){
        revealHunterChoices();
        hunt.lastAction={icon:'◉',text:'PRÓXIMO ATAQUE CRÍTICO',kind:'hero'};
        note('Ojo de Halcón revela tres posibilidades.');
      } else if(card.effect==='trap_mastery'){
        hunt.trapMastery=2;
        hunt.lastAction={icon:'⚙',text:'PREPARACIÓN MAGISTRAL · 2 TRAMPAS',kind:'hero'};
        note('Preparación Magistral: tus próximas 2 trampas duplican su daño y control.');
      } else if(String(card.effect||'').startsWith('trap_')){
        armTrap(card);
      }
      if(card.draw) draw(card.draw);
      if(card.nextCritical) hunt.nextCritical=true;
    }
    else if(card.kind==='debuff'){
      hunt.enemy.weak=Math.max(hunt.enemy.weak||0,card.weak||1);
      hunt.enemy.vulnerable=Math.max(hunt.enemy.vulnerable||0,card.vulnerable||1);
      if(card.poison) hunt.enemy.poison=Math.max(0,hunt.enemy.poison||0)+card.poison;
      hunt.lastAction={icon:'◉',text:'ENEMIGO DEBILITADO',kind:'hero'};
      note(`${card.name}: aplica Debilidad ${card.weak||1} y Vulnerable ${card.vulnerable||1}.`);
    }
    else if(card.kind==='mana'){ hunt.mana=Math.min(hunt.maxMana,hunt.mana+card.value); note(`Maná +${card.value}.`); }
    else if(card.kind==='heal'){
      const healed=card.value+(faithSpent*Math.max(0,n(card.faithHeal,0)))+(bondSpent*Math.max(0,n(card.bondHeal,0)));
      hunt.hp=Math.min(hunt.maxHp,hunt.hp+healed);
      note(`${card.name}: curás ${healed}${faithSpent?` y consumís ${faithSpent} Fe`:''}.`);
      hunt.lastAction={icon:card.icon,text:`+${healed} VIDA${faithSpent?` · FE ${faithSpent}`:''}`,kind:'hero'};
    }
    else if(card.kind==='strength'){ hunt.strength+=card.value; hunt.lastAction={icon:'⚑',text:`FUERZA +${card.value}`,kind:'hero'}; note(`${card.name}: Fuerza +${card.value} durante este combate.`); }
    if(card.kind==='mana') hunt.lastAction={icon:card.icon,text:`+${card.value} MANÁ`,kind:'hero'};
    if(card.draw&&!['block','utility'].includes(card.kind)) draw(card.draw);
    if(card.nextCritical&&card.kind!=='utility') hunt.nextCritical=true;
    if(arcaneSpent) hunt.arcane=Math.max(0,arcaneBefore-arcaneSpent);
    if(card.arcaneGain){
      const gained=Math.max(0,Math.round(n(card.arcaneGain,0)));
      hunt.arcane=Math.min(5,Math.max(0,n(hunt.arcane,arcaneBefore))+gained);
      note(`${card.name} genera ${gained} Carga${gained===1?'':'s'} Arcana${gained===1?'':'s'}. Cargas actuales: ${hunt.arcane}/5.`);
    }
    if(comboSpent) hunt.combo=Math.max(0,comboBefore-comboSpent);
    if(card.comboGain){
      const gained=Math.max(0,Math.round(n(card.comboGain,0)));
      hunt.combo=Math.min(5,Math.max(0,n(hunt.combo,comboBefore))+gained);
      note(`${card.name} genera ${gained} Combo. Combo actual: ${hunt.combo}/5.`);
    }
    if(faithSpent) hunt.faith=Math.max(0,faithBefore-faithSpent);
    if(card.faithGain){
      const gained=Math.max(0,Math.round(n(card.faithGain,0)));
      hunt.faith=Math.min(9,Math.max(0,n(hunt.faith,faithBefore))+gained);
      note(`${card.name} genera ${gained} Fe. Fe actual: ${hunt.faith}/9.`);
    }
    if(bondSpent) hunt.bond=Math.max(0,bondBefore-bondSpent);
    if(card.bondGain){
      const gained=Math.max(0,Math.round(n(card.bondGain,0)));
      hunt.bond=Math.min(5,Math.max(0,n(hunt.bond,bondBefore))+gained);
      note(`${card.name} genera ${gained} Vínculo. Vínculo actual: ${hunt.bond}/5.`);
    }
    if(hunt.lastAction) hunt.lastAction.fx=card.fx||card.kind;
    safe(()=>window.Sound?.cardPlay?.(card,heroClass(),cardWasCritical));
    hunt.hand=hunt.hand.filter(c=>c.id!==id); hunt.discard.push(card);
    if(hunt.enemy.hp<=0){ victory(); return; }
    render(); flashCombat('hero',card.fx||card.kind);
  }
  function victory(){
    if(hunt.enemy.victoryResolved) return;
    hunt.enemy.victoryResolved=true;
    const reward=12+hunt.floor*5+(hunt.enemy.type==='elite'?22:0)+(hunt.enemy.type==='boss'?45:0);
    const finalBoss=hunt.enemy.type==='boss'&&hunt.act>=HUNT_SCENES.length&&hunt.floor>=hunt.maxFloor-1;
    const exp=typeof cardHuntExperienceReward==='function'
      ? cardHuntExperienceReward(hunt.enemy.type,hunt.act,finalBoss)
      : Math.max(1,Math.floor(expToNext(state.level)*({fight:.04,elite:.10,boss:.20}[hunt.enemy.type]||.04)));
    hunt.enemy.goldReward=reward;
    hunt.enemy.experienceReward=exp;
    if(exp>0){
      if(typeof gainExp==='function') gainExp(exp);
      else state.exp=Math.max(0,n(state.exp,0))+exp;
    }
    hunt.mana=Math.min(hunt.maxMana,hunt.mana+Math.max(8,Math.round(hunt.maxMana*.12)));
    hunt.reward+=reward; note(`Victoria sobre ${hunt.enemy.name}. +${reward} oro de expedición${exp?` y +${exp} EXP permanente`:''}.`);
    hunt.defeatedCount=Math.max(0,Math.floor(n(hunt.defeatedCount,0)))+1;
    hunt.maxDepth=Math.max(Math.floor(n(hunt.maxDepth,0)),runDepth());
    state.totalWins=Math.max(0,n(state.totalWins,0))+1;
    if(hunt.enemy.type==='boss') state.totalBossWins=Math.max(0,n(state.totalBossWins,0))+1;
    state.maxHuntDepth=Math.max(Math.floor(n(state.maxHuntDepth,0)),hunt.maxDepth);
    state.missions.day.hunts=Math.max(0,n(state.missions.day.hunts,0))+1;
    state.missions.week.wins=Math.max(0,n(state.missions.week.wins,0))+1;
    safe(()=>addLog(`Venciste a ${hunt.enemy.name} en Cacería: +${exp} EXP y +${reward} oro de expedición.`,'win'));
    hunt.screen='victory';
    safe(()=>window.setTimeout(()=>{
      window.Sound?.setScene?.('hunt');
      window.Sound?.victory?.();
    },300));
    render();
  }
  function endTurn(){
    if(!hunt.enemy) return;
    if(hunt.cardChoice?.length) return;
    safe(()=>window.Sound?.turnEnd?.());
    const e=hunt.enemy;
    if(e.acid>0){
      const corrosion=Math.max(1,Math.round(e.acid));
      e.hp=Math.max(0,e.hp-corrosion);
      note(`Ácido: ${e.name} recibe ${corrosion} de daño que ignora su guardia.`);
      e.acid=Math.max(0,e.acid-1);
      if(e.hp<=0){ victory(); return; }
    }
    if(e.poison>0){
      const toxicDamage=Math.max(1,Math.round(e.poison));
      e.hp=Math.max(0,e.hp-toxicDamage);
      note(`Veneno: ${e.name} recibe ${toxicDamage} de daño que ignora su guardia.`);
      e.poison=Math.max(0,e.poison-1);
      hunt.lastAction={icon:'☠',text:`VENENO · ${toxicDamage} DE DAÑO`,kind:'hero',fx:'poison'};
      if(e.hp<=0){ victory(); return; }
    }
    const trapCancelled=triggerTrap(e);
    if(e.hp<=0){ victory(); return; }
    if(trapCancelled){
      hunt.lastAction={icon:'⌁',text:`${e.name.toUpperCase()} CAE EN EL CEPO`,kind:'hero',fx:'trap-snare'};
      note(`${e.name} pierde su acción por la trampa.`);
      safe(()=>window.setTimeout(()=>window.Sound?.breakSound?.(),170));
    } else if(e.stunned>0){
      e.stunned--;
      hunt.lastAction={icon:'✦',text:`${e.name.toUpperCase()} PIERDE EL TURNO`,kind:'enemy'};
      note(`${e.name} está Aturdido y no puede actuar.`);
      safe(()=>window.setTimeout(()=>window.Sound?.miss?.(),170));
    } else if(e.intentKind==='guard'){
      const gained=Math.ceil(e.damage*.8); e.guard+=gained; hunt.lastAction={icon:'⬡',text:`${e.name.toUpperCase()} SE PROTEGE`,kind:'enemy'}; note(`${e.name} gana ${gained} de guardia.`);
      safe(()=>window.setTimeout(()=>window.Sound?.huntEnemyAction?.('guard',0,true,false),170));
    } else {
      let raw=e.intentKind==='charge'?Math.ceil(e.damage*1.55):e.damage;
      raw=Math.max(0,raw-(e.attackDown||0));
      if(e.weak>0) raw=Math.max(0,Math.round(raw*.75));
      const evaded=(hunt.evade||0)>0;
      const blockedAmount=evaded?0:Math.min(raw,hunt.block);
      const dmg=evaded?0:Math.max(0,raw-hunt.block);
      if(evaded) hunt.evade=Math.max(0,hunt.evade-1);
      hunt.hp=Math.max(0,hunt.hp-dmg);
      if(hunt.thorns>0){
        e.hp=Math.max(0,e.hp-hunt.thorns);
        note(`Contraataque devuelve ${hunt.thorns} de daño a ${e.name}.`);
        hunt.thorns=0;
      }
      hunt.lastAction={icon:e.intentKind==='charge'?'✹':'⚔',text:`RECIBÍS ${dmg} DE DAÑO`,kind:'enemy'};
      note(evaded?`Paso entre Sombras: evadís por completo ${e.intent} de ${e.name}.`:`${e.name} usa ${e.intent}: recibís ${dmg}.`);
      safe(()=>window.setTimeout(()=>window.Sound?.huntEnemyAction?.(e.intentKind,dmg,blockedAmount>0,evaded),170));
    }
    if(e.marked>0) e.marked--;
    if(e.hp<=0){ victory(); return; }
    if(hunt.hp<=0){
      hunt.screen='defeat';
      hunt.status='lost';
      const lostReward=Math.max(0,Math.floor(n(hunt.reward,0)));
      hunt.reward=0;
      state.cardHuntSnapshot=null;
      state.missions.day.hunts=Math.max(0,n(state.missions.day.hunts,0))+1;
      safe(()=>addLog(`☠ La Cacería de cartas terminó: perdiste ${lostReward} oro de expedición.`, 'lose'));
      safe(()=>window.Sound?.setScene?.('danger'));
      safe(()=>window.setTimeout(()=>window.Sound?.defeat?.(),260));
      render();
      return;
    }
    hunt.block=hunt.retainBlock>0?Math.floor(hunt.block*hunt.retainBlock):0;
    hunt.retainBlock=0;
    hunt.attacksThisTurn=0;
    hunt.defensesThisTurn=0;
    hunt.turn++; hunt.discard.push(...hunt.hand); hunt.hand=[]; draw(5);
    hunt.mana=Math.min(hunt.maxMana,hunt.mana+Math.max(3,Math.round(hunt.maxMana*.04)));
    if(e.vulnerable>0) e.vulnerable--;
    if(e.weak>0) e.weak--;
    const triggeredTrapFx=hunt.pendingTrapFx;
    hunt.pendingTrapFx='';
    rollIntent(e); render();
    safe(()=>window.setTimeout(()=>window.Sound?.cardDraw?.(5),430));
    if(triggeredTrapFx){
      flashCombat('hero',triggeredTrapFx);
      if(!trapCancelled) window.setTimeout(()=>flashCombat('enemy'),720);
    } else {
      flashCombat('enemy');
    }
  }
  function pct(value,max){ return `${Math.max(0,Math.min(100,(value/max)*100))}%`; }
  function show(){
    syncCardHuntOwner();
    const localPreview=location.protocol==='file:'||['localhost','127.0.0.1'].includes(location.hostname);
    if(!evolutionPreviewConsumed&&localPreview&&new URLSearchParams(location.search).has('previewAltar')){
      evolutionPreviewConsumed=true;
      createRun();
      hunt.floor=hunt.maxFloor-1;
      hunt.enemy={type:'boss',name:'Guardián del Altar de Prueba',goldReward:0,experienceReward:0};
      note('Vista de prueba del Altar: esta expedición local fue reiniciada.');
      beginEvolution();
    }
    document.body.classList.remove('profile-screen-open');
    document.body.classList.add('card-hunt-open');
    document.querySelectorAll('.nav-btn[data-sec]').forEach(x=>x.classList.remove('active'));
    cardNav.classList.add('active'); section.classList.add('active');
    safe(()=>window.Sound?.setScene?.(hunt.screen==='combat'?(hunt.enemy?.type==='boss'?'boss':'battle'):'hunt'));
    safe(()=>window.Sound?.huntOpen?.());
    render();
  }
  function back(){ snapshotCardHunt(); document.body.classList.remove('card-hunt-open','card-evolution-open'); document.querySelector('.nav-btn[data-sec="secHero"]')?.click(); }
  function escape(v){ return String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function render(){
    const app=document.getElementById('cardSpireApp'); if(!app||!hunt) return;
    document.body.classList.toggle('card-evolution-open',hunt.screen==='evolution');
    const vis=visual(), img=vis.image ? `<img src="${escape(vis.image)}" alt="">` : '<span>⚔</span>';
    const scene=huntScene();
    const retireButton=canRetire()?`<button data-action="restart" data-hunt-command="retire" class="cardspire-retire" title="Terminar la expedición y guardar el oro acumulado">⚑ Guardar botín</button>`:'';
    const hud=`<header class="cardspire-hud"><div class="cardspire-hud-actions"><button data-action="back" class="cardspire-back">← Santuario</button><button data-action="reset-hunt" class="cardspire-reset" title="Reiniciar la expedición si quedó trabada" aria-label="Reiniciar Cacería">↻ Reiniciar</button></div><div class="cardspire-title"><small>${scene.mark} ${escape(scene.name.toUpperCase())}</small><b>ACTO ${hunt.act} · SENDA ${hunt.floor+1}/${hunt.maxFloor}</b></div><div class="cardspire-resources"><span>♥ ${Math.ceil(hunt.hp)}/${hunt.maxHp}</span><span>✦ ${Math.ceil(hunt.mana)}/${hunt.maxMana}</span><span>◈ ${hunt.reward}</span></div></header>`;
    let content='';
    if(hunt.screen==='intro') content=`<section class="cardspire-intro"><div class="cardspire-seal">✦</div><p class="cardspire-kicker">LA SENDA DEL ABISMO</p><h2>Una expedición.<br>Un mazo. Mil decisiones.</h2><p>Elegí tu ruta, usá las cartas con inteligencia y llevá el botín hasta el final.</p><button data-action="begin" class="cardspire-primary">COMENZAR EXPEDICIÓN <b>→</b></button><div class="cardspire-features"><span>⚔ Combate por turnos</span><span>◇ Rutas cambiantes</span><span>✦ Recompensas de run</span></div></section>`;
    else if(hunt.screen==='map') content=mapMarkup();
    else if(hunt.screen==='event') content=eventMarkup();
    else if(hunt.screen==='sanctuary') content=sanctuaryMarkup();
    else if(hunt.screen==='treasure') content=treasureMarkup();
    else if(hunt.screen==='shop') content=shopMarkup();
    else if(hunt.screen==='combat') content=combatMarkup(img);
    else if(hunt.screen==='victory') content=`<section class="cardspire-result win"><div class="result-icon">✦</div><p>VICTORIA</p><h2>${escape(hunt.enemy.name)} cayó</h2><span>+${Math.max(0,Math.floor(n(hunt.enemy.goldReward,0)))} oro de expedición · +${Math.max(0,Math.floor(n(hunt.enemy.experienceReward,0)))} EXP permanente</span><button data-action="advance" class="cardspire-primary">${isFinalVictory()?'CULMINAR EXPEDICIÓN':hunt.enemy?.type==='boss'&&!evolutionClaimed()?'DESPERTAR UNA CARTA':'SEGUIR POR LA SENDA'} →</button></section>`;
    else if(hunt.screen==='evolution') content=evolutionMarkup();
    else if(hunt.screen==='retire-confirm') content=`<section class="cardspire-result cardspire-retirement"><div class="result-icon">⚑</div><p>REGRESAR CON VIDA</p><h2>¿Asegurar el botín?</h2><span>La expedición terminará y ${escape(hero().name||'tu héroe')} conservará todo el oro acumulado.</span><div class="cardspire-payout"><b>◈ ${hunt.reward} oro</b></div><div class="cardspire-result-actions"><button data-action="begin" data-hunt-command="cancel-retire" class="cardspire-secondary">CONTINUAR CACERÍA</button><button data-action="restart" data-hunt-command="confirm-retire" class="cardspire-primary">RETIRARSE Y COBRAR →</button></div></section>`;
    else if(hunt.screen==='complete') content=`<section class="cardspire-result win cardspire-complete"><div class="result-icon">♛</div><p>ABISMO CONQUISTADO</p><h2>La senda es tuya</h2><span>Completaste los nueve actos. Asegurá ahora todo el botín de la campaña.</span><div class="cardspire-payout"><b>◈ ${hunt.reward} oro</b><b>✦ 10 esencia</b></div><button data-action="restart" data-hunt-command="settle-complete" class="cardspire-primary">ASEGURAR RECOMPENSAS →</button></section>`;
    else if(hunt.screen==='settled') content=`<section class="cardspire-result win cardspire-complete"><div class="result-icon">${hunt.settledOutcome==='completed'?'♛':'⚑'}</div><p>BOTÍN ASEGURADO</p><h2>${hunt.settledOutcome==='completed'?'Cacería completada':'Regresaste con vida'}</h2><span>La recompensa ya fue sumada al progreso permanente de ${escape(hero().name||'tu héroe')}.</span><div class="cardspire-payout"><b>◈ +${hunt.settledReward||0} oro</b>${hunt.settledEssence?`<b>✦ +${hunt.settledEssence} esencia</b>`:''}</div><button data-action="restart" class="cardspire-primary">NUEVA EXPEDICIÓN →</button></section>`;
    else content=`<section class="cardspire-result loss"><div class="result-icon">☾</div><p>LA SENDA TE RECHAZÓ</p><h2>La expedición terminó</h2><span>El oro de expedición se perdió, pero tu leyenda continúa.</span><button data-action="restart" class="cardspire-primary">INTENTAR OTRA VEZ →</button></section>`;
    if(retireButton) content=`<div class="cardspire-retire-row">${retireButton}</div>${content}`;
    app.innerHTML=`<main class="cardspire-shell scene-${scene.key}" style="--cardspire-scene:url('/${scene.asset}')">${hud}<div class="cardspire-main">${content}</div></main>`;
    bind();
    snapshotCardHunt();
  }
  function mapRouteX(index,count){
    return count<=1 ? 450 : ((index+.5)/count)*900;
  }
  function mapRoutesMarkup(displayRows){
    const top=43;
    const step=118.5;
    const layers=[];
    for(let rowIndex=0;rowIndex<displayRows.length-1;rowIndex++){
      const fromRow=displayRows[rowIndex];
      const toRow=displayRows[rowIndex+1];
      const fromY=top+(rowIndex*step);
      const toY=top+((rowIndex+1)*step);
      const middle=(fromY+toY)/2;
      const segments=[];
      fromRow.forEach((_,fromIndex)=>{
        const fromX=mapRouteX(fromIndex,fromRow.length);
        let targets=toRow.map((__,toIndex)=>({
          toIndex,
          toX:mapRouteX(toIndex,toRow.length)
        })).filter(target=>
          fromRow.length===1||
          toRow.length===1||
          Math.abs(target.toX-fromX)<=245
        );
        if(!targets.length){
          targets=toRow.map((__,toIndex)=>({
            toIndex,
            toX:mapRouteX(toIndex,toRow.length)
          })).sort((a,b)=>Math.abs(a.toX-fromX)-Math.abs(b.toX-fromX)).slice(0,1);
        }
        targets.forEach(target=>{
          segments.push(`M${fromX} ${fromY} C${fromX} ${middle},${target.toX} ${middle},${target.toX} ${toY}`);
        });
      });
      layers.push(`<path data-route-layer="${rowIndex}" d="${segments.join(' ')}"/>`);
    }
    return `<svg class="cardspire-map-routes" viewBox="0 0 900 590" preserveAspectRatio="none" aria-hidden="true">${layers.join('')}</svg>`;
  }
  function mapMarkup(){
    const scene=huntScene();
    const current=hunt.map[hunt.floor]||[];
    const reachableIndexes=reachableNodeIndexes();
    const displayRows=[...hunt.map].reverse();
    const rows=displayRows.map((row,index)=>{
      const real=hunt.map.length-1-index;
      const active=real===hunt.floor;
      const passed=real<hunt.floor;
      const future=real>hunt.floor;
      const activeLane=hunt.routeLane===null||hunt.routeLane===undefined?null:Math.floor(n(hunt.routeLane,0));
      const safeLane=activeLane===null?null:Math.max(0,Math.min(current.length-1,activeLane));
      const travelerX=active&&current.length>1&&safeLane!==null
        ? ((safeLane+.5)/current.length)*100
        : 50;
      const traveler=active?`<span class="route-traveler" style="--traveler-x:${travelerX}%"><i>✦</i><small>VOS</small></span>`:'';
      const visitedStep=(hunt.routeHistory||[]).find(step=>step.floor===real);
      const nodes=row.map((x,lane)=>{
        const type=TYPES[x.type]||TYPES.event;
        const reachable=!active||reachableIndexes.includes(lane);
        const visited=passed&&visitedStep?.id===x.id;
        const unavailable=active&&!reachable;
        const status=active
          ? (reachable?'ENTRAR':'SIN CONEXIÓN')
          : (passed?(visited?'RECORRIDO':'DESCARTADO'):'OCULTO');
        return `<button class="cardspire-node ${x.type} ${future?'veiled':''} ${unavailable?'unreachable':''} ${visited?'visited':''} ${passed&&!visited?'abandoned':''}" data-node="${x.id}" ${active&&reachable?'':'disabled'} aria-disabled="${active&&reachable?'false':'true'}">
          <span class="node-portrait"><img src="${MAP_ASSET_ROOT}${type.asset}" alt="" loading="lazy"><i>${type.icon}</i></span>
          <b>${type.name}</b><small>${status}</small>
        </button>`;
      }).join('');
      return `<div class="cardspire-map-row ${row.length===1?'single':''} ${active?'current':''} ${passed?'passed':''} ${future?'future':''}" style="--route-columns:${row.length}">${traveler}${nodes}</div>`;
    }).join('');
    return `<section class="cardspire-map-view">
      <div class="cardspire-region"><i>${scene.mark}</i><span>REGIÓN ACTUAL</span><b>${escape(scene.name)}</b><small>${escape(scene.roster||'')}</small></div>
      <div class="cardspire-map-copy"><p>RUTA DE EXPEDICIÓN</p><h2>Elegí tu camino</h2><span>${escape(scene.theme||'Solo podés avanzar por las líneas conectadas a tu posición.')}</span><em>${escape(scene.warning||'')}</em></div>
      <div class="cardspire-map-board">
        ${mapRoutesMarkup(displayRows)}
        <div class="cardspire-map">${rows}</div>
      </div>
      <aside class="cardspire-legend">${Object.values(TYPES).map(x=>`<span><img src="${MAP_ASSET_ROOT}${x.asset}" alt=""> ${x.name}</span>`).join('')}</aside>
    </section>`;
  }
  function eventMarkup(){ return `<section class="cardspire-event"><div class="event-mark">?</div><p>ENCUENTRO MISTERIOSO</p><h2>El manantial susurra</h2><span>Una luz antigua ofrece ayuda, pero solo podés pedir una cosa.</span><div class="cardspire-choice-grid"><button data-event="clarity"><i>✦</i><b>Beber claridad</b><small>Recuperás 30 de maná</small></button><button data-event="vigor"><i>♥</i><b>Aceptar vigor</b><small>+12 vida máxima esta run</small></button></div></section>`; }
  function sanctuaryMarkup(){
    return `<section class="cardspire-event cardspire-sanctuary" aria-live="polite">
      <div class="event-mark">✦</div>
      <p>SANTUARIO DE LA SENDA</p>
      <h2>Elegí una bendición</h2>
      <span>Su poder dura hasta que termine esta cacería. Solo podés recibir una.</span>
      <div class="cardspire-choice-grid sanctuary-choices">
        <button data-sanctuary="life">
          <i class="sanctuary-life">♥</i>
          <b>Bendición de Vitalidad</b>
          <strong>+15 VIDA MÁXIMA</strong>
          <small>También recuperás esos 15 puntos de vida.</small>
        </button>
        <button data-sanctuary="mana">
          <i class="sanctuary-mana">✦</i>
          <b>Bendición del Éter</b>
          <strong>+12 MANÁ MÁXIMO</strong>
          <small>También recuperás esos 12 puntos de maná.</small>
        </button>
      </div>
    </section>`;
  }
  function treasureMarkup(){
    const treasure=hunt.treasure||{opened:false,gold:0,ancient:false};
    if(!treasure.opened){
      return `<section class="cardspire-treasure" aria-live="polite">
        <div class="treasure-glow"></div>
        <p>HALLAZGO EN LA SENDA</p>
        <h2>${treasure.ancient?'Cofre antiguo':'Tesoro sellado'}</h2>
        <span>El cierre conserva el botín de otra expedición. Abrilo para descubrir cuánto oro contiene.</span>
        <button class="treasure-chest" data-action="open-treasure" aria-label="Abrir el cofre">
          <img src="${MAP_ASSET_ROOT}nodo-tesoro-v2.webp" alt="Cofre de tesoro cerrado">
          <b>ABRIR COFRE</b>
        </button>
      </section>`;
    }
    return `<section class="cardspire-treasure opened" aria-live="polite">
      <div class="treasure-burst"><i>✦</i><i>✦</i><i>✦</i></div>
      <p>TESORO REVELADO</p>
      <h2>${treasure.ancient?'¡Hallazgo excepcional!':'El cofre se abre'}</h2>
      <div class="treasure-reward"><small>ORO DE EXPEDICIÓN</small><strong>◈ ${Math.round(n(treasure.gold,0))}</strong><span>Total de la run: ◈ ${Math.round(n(hunt.reward,0))}</span></div>
      <span>Este oro se conserva solamente si terminás la expedición o te retirás con el botín.</span>
      <button data-action="leave-treasure" class="cardspire-primary">CONTINUAR POR LA SENDA <b>→</b></button>
    </section>`;
  }
  function shopMarkup(){
    const offers=hunt.shopOffers||[];
    const cards=offers.map(card=>{
      const manaCost=cardManaCost(card);
      const canBuy=hunt.reward>=card.price;
      return `<article class="cardspire-shop-card ${escape(card.kind||'skill')}">
        <div class="shop-card-top"><span>${escape(card.rarity||'COMÚN')}</span><i>${manaCost?`${manaCost}✦`:'GRATIS'}</i></div>
        <div class="shop-card-art"><img src="assets/images/cards/${escape(card.art||'warrior-corte-acero.jpg')}" alt="" loading="lazy"></div>
        <small>${escape(card.tag||'HABILIDAD')}</small>
        <h3>${escape(card.name)}</h3>
        <p>${escape(card.desc)}</p>
        <button data-buy-card="${escape(card.poolId)}" ${canBuy?'':'disabled'}><b>COMPRAR</b><span>◈ ${card.price}</span></button>
      </article>`;
    }).join('');
    const empty=`<div class="cardspire-shop-empty"><i>✓</i><b>Dominaste este arsenal</b><span>Ya compraste todas las cartas avanzadas disponibles.</span></div>`;
    return `<section class="cardspire-shop">
      <header><div><p>MERCADER DE CARTAS</p><h2>El Archivo del Acero</h2><span>Estas cartas están bloqueadas hasta que las compres. Cada adquisición se suma al mazo solo durante esta expedición.</span></div><strong><small>ORO DE RUN</small>◈ ${hunt.reward}</strong></header>
      <div class="cardspire-shop-grid">${cards||empty}</div>
      <footer><button data-action="shop-reroll" ${hunt.reward<12||!offers.length?'disabled':''}>↻ RENOVAR OFERTAS · ◈ 12</button><button data-action="leave-shop" class="cardspire-primary">CONTINUAR POR LA SENDA →</button></footer>
    </section>`;
  }
  function evolutionPathClass(value){
    const path=typeof value==='string' ? value : value?.evolution?.path;
    return String(path||'').toUpperCase()==='SINERGIA' ? 'synergy' : String(path||'').toUpperCase()==='PODER' ? 'power' : 'neutral';
  }
  function evolutionAtmosphere(theme='neutral'){
    return `<div class="evolution-atmosphere theme-${escape(theme)}" aria-hidden="true"><span class="altar-halo"></span><span class="altar-ring ring-one"></span><span class="altar-ring ring-two"></span><i></i><i></i><i></i><i></i><i></i><i></i><b>ᚨ</b><b>ᛟ</b><b>ᛉ</b><b>ᛏ</b></div>`;
  }
  function evolutionCardFace(card,variant=''){
    if(!card) return '';
    const manaCost=cardManaCost(card);
    const theme=evolutionPathClass(card);
    return `<article class="evolution-card-face ${escape(card.kind||'skill')} ${card.evolution?'is-evolved':''} theme-${theme} ${escape(variant)}">
      <span class="evolution-card-shine" aria-hidden="true"></span>
      <div class="evolution-card-top"><span>${escape(card.tag||'HABILIDAD')}</span><b>${manaCost?`${manaCost}✦`:'0'}</b></div>
      <div class="evolution-card-art">${card.art?`<img src="assets/images/cards/${escape(card.art)}" alt="">`:`<i>${card.icon||'✦'}</i>`}<span class="evolution-art-runes" aria-hidden="true">✦ ◇ ✦</span></div>
      ${card.evolution?`<small class="evolution-awakened">✦ ${escape(card.evolution.path)} · EVOLUCIONADA</small>`:''}
      <h3>${escape(card.name||'Carta')}</h3>
      <p>${escape(card.desc||'')}</p>
      ${card.evolution?`<span class="evolution-card-seal" aria-hidden="true">${theme==='power'?'◆':'✦'}</span>`:''}
    </article>`;
  }
  function evolutionDiffMarkup(line){
    const parts=String(line||'').split('→').map(part=>part.trim());
    if(parts.length===2) return `<li class="stat-change"><span>${escape(parts[0])}</span><i>→</i><b>${escape(parts[1])}</b></li>`;
    return `<li class="trait-gain"><i>+</i><b>${escape(parts[0])}</b></li>`;
  }
  function evolutionMarkup(){
    const pending=hunt.pendingEvolution;
    if(!pending) return `<section class="cardspire-evolution theme-neutral">${evolutionAtmosphere()}<h2>El Altar permanece en silencio</h2><button data-action="advance" class="cardspire-primary">SEGUIR POR LA SENDA →</button></section>`;
    if(pending.stage==='complete'){
      const evolved=evolutionCard(pending.completedCardId);
      const theme=evolutionPathClass(evolved);
      return `<section class="cardspire-evolution evolution-complete theme-${theme}" aria-live="polite">
        ${evolutionAtmosphere(theme)}
        <div class="evolution-burst" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><span></span></div>
        <header><span class="evolution-sigil">${theme==='power'?'◆':'✦'}</span><p>${theme==='power'?'PODER DESATADO':'SINERGIA DESPERTADA'}</p><h2>${escape(evolved?.name||'Carta evolucionada')}</h2><small>La evolución quedó grabada en esta copia durante toda la expedición.</small></header>
        <div class="evolution-complete-card">${evolutionCardFace(evolved,'ceremony-card')}</div>
        <div class="evolution-complete-path"><span>${theme==='power'?'CAMINO DEL PODER':'CAMINO DE LA SINERGIA'}</span><b>${theme==='power'?'Fuerza inmediata y decisiva':'Una nueva conexión con tu estrategia'}</b></div>
        <button data-action="advance" class="cardspire-primary">ENTRAR AL SIGUIENTE ACTO →</button>
      </section>`;
    }
    const selected=evolutionCard(pending.selectedId);
    if(!selected){
      const candidates=pending.candidateIds.map(evolutionCard).filter(Boolean);
      return `<section class="cardspire-evolution evolution-awakening theme-neutral">
        ${evolutionAtmosphere()}
        <header><span class="evolution-sigil">✦</span><p>ALTAR DE EVOLUCIÓN · ACTO ${hunt.act}</p><h2>Una carta puede despertar</h2><small>El Altar reveló tres voces de tu mazo. Elegí cuál cambiará para siempre.</small></header>
        <div class="evolution-candidates">${candidates.map((card,index)=>`<button style="--reveal-order:${index}" data-evolution-card="${escape(card.id)}" aria-label="Elegir ${escape(card.name)}"><span class="candidate-aura" aria-hidden="true"></span>${evolutionCardFace(card,'candidate-card')}<span class="evolution-select"><small>DESPERTAR</small>ELEGIR ESTA CARTA <b>→</b></span></button>`).join('')}</div>
        <p class="evolution-rule"><span>✦</span> Una sola elección por acto · la evolución pertenece a esta copia <span>✦</span></p>
      </section>`;
    }
    const engine=evolutionEngine();
    const branches=engine?.branchesFor(selected)||[];
    return `<section class="cardspire-evolution evolution-branches theme-split">
      ${evolutionAtmosphere('split')}
      <header><span class="evolution-sigil split-sigil">◆<i></i>✦</span><p>EL DESTINO DE ${escape(selected.name).toUpperCase()}</p><h2>Dos caminos. Una decisión.</h2><small>Observá la carta final y compará exactamente qué cambia antes de confirmar.</small></header>
      <div class="evolution-choice-layout">
        <div class="evolution-original"><small>ESTADO ACTUAL</small>${evolutionCardFace(selected,'original-card')}<span class="evolution-origin-line">BASE</span></div>
        <div class="evolution-branch-grid">${branches.map(branch=>{
          const evolved=engine.evolve(selected,branch.id);
          const theme=evolutionPathClass(branch.path);
          return `<button class="evolution-branch path-${theme}" data-evolution-branch="${escape(branch.id)}" aria-label="Evolucionar ${escape(selected.name)} como ${escape(branch.name)}">
            <span class="branch-energy" aria-hidden="true"></span>
            <div class="branch-heading"><span class="evolution-path">${theme==='power'?'◆':'✦'} ${escape(branch.path)}</span><small>${theme==='power'?'IMPACTO INMEDIATO':'COMBINACIONES Y RECURSOS'}</small></div>
            <div class="branch-card-preview">${evolutionCardFace(evolved,'branch-preview-card')}</div>
            <div class="branch-details"><p>${escape(branch.description)}</p><ul>${(branch.preview||[]).map(evolutionDiffMarkup).join('')}</ul></div>
            <b>CONFIRMAR ${escape(branch.name).toUpperCase()} <span>→</span></b>
          </button>`;
        }).join('')}</div>
      </div>
      <button data-evolution-back class="evolution-back">← VOLVER A LAS TRES CARTAS</button>
    </section>`;
  }
  function combatMarkupV2(img){
    const e=hunt.enemy;
    const heroClassId=heroClass();
    const scene=huntScene();
    const cards=hunt.hand.map(c=>{ const manaCost=cardManaCost(c); const evolutionTheme=evolutionPathClass(c); return `<button class="cardspire-card ${c.kind} ${c.art?'illustrated':''} ${c.evolution?`evolved evolved-${evolutionTheme}`:''} ${manaCost?'tactical-card':'free-card'} ${manaCost>hunt.mana?'locked':''}" data-card="${c.id}"><span class="card-cost">${manaCost?`${manaCost}✦`:'0'}</span>${cardSideStat(c)}<span class="card-tag">${escape(c.tag||'HABILIDAD')}</span>${c.evolution?`<span class="card-evolution-badge">${evolutionTheme==='power'?'◆':'✦'} ${escape(c.evolution.path)}</span>`:''}${c.art?`<span class="card-art"><img src="assets/images/cards/${escape(c.art)}" alt="" loading="lazy"></span>`:`<i>${c.icon}</i>`}<b>${escape(c.name)}</b><small>${escape(c.desc)}</small></button>`; }).join('');
    const hunterChoice=hunt.cardChoice?.length?`<div class="hunter-choice-backdrop"><section class="hunter-choice-panel"><span class="hunter-choice-eye">◉</span><small>OJO DE HALCÓN</small><h3>Elegí el futuro de tu mano</h3><p>Una carta irá a tu mano. Las otras dos pasan al descarte.<br>Tu próximo ataque será crítico.</p><div class="hunter-choice-cards">${hunt.cardChoice.map(c=>`<button class="hunter-choice-card" data-hunter-choice="${escape(c.id)}">${c.art?`<img src="assets/images/cards/${escape(c.art)}" alt="">`:`<i>${c.icon||'✦'}</i>`}<b>${escape(c.name)}</b><small>${escape(c.desc)}</small></button>`).join('')}</div></section></div>`:'';
    const enemyArt=e.image ? `<img src="assets/images/${escape(e.image)}" alt="${escape(e.name)}">` : e.icon;
    const last=hunt.lastAction?`<div class="cardspire-impact ${hunt.lastAction.kind} fx-${escape(hunt.lastAction.fx||'impact')}"><span class="skill-fx-layer"></span><i>${hunt.lastAction.icon}</i><b>${escape(hunt.lastAction.text)}</b></div>`:'';
    const heroStates=[
      hunt.block&&`⬡ Bloqueo ${hunt.block}`,
      heroClassId==='mage'&&`✦ Cargas ${hunt.arcane||0}/5`,
      heroClassId==='priest'&&`☀ Fe ${hunt.faith||0}/9`,
      heroClassId==='assassin'&&`✦ Combo ${hunt.combo||0}/5`,
      heroClassId==='tamer'&&`♞ Vínculo ${hunt.bond||0}/5`,
      hunt.strength&&`⚑ Fuerza +${hunt.strength}`,
      hunt.thorns&&`✦ Contraataque ${hunt.thorns}`,
      hunt.evade&&`☾ Evasión preparada`,
      hunt.nextCritical&&`◉ Próximo ataque crítico`,
      hunt.traps?.length&&`⌁ Trampas listas ${hunt.traps.length}`,
      hunt.trapMastery>0&&`⚙ Preparación ${hunt.trapMastery}`,
      hunt.retainBlock>0&&`◈ Conserva ${Math.round(hunt.retainBlock*100)}%`
    ].filter(Boolean).map(x=>`<span class="${String(x).startsWith('✦ Cargas')?'arcane-state':String(x).startsWith('☀ Fe')?'faith-state':String(x).startsWith('✦ Combo')?'combo-state':String(x).startsWith('♞ Vínculo')?'bond-state':''}">${x}</span>`).join('');
    const enemyStates=[
      e.acid>0&&`☣ Ácido ${e.acid}`,
      e.poison>0&&`☠ Veneno ${e.poison}`,
      e.marked>0&&`◎ Presa marcada ${e.marked}`,
      e.guard&&`⬡ Guardia ${e.guard}`,
      e.vulnerable>0&&`✹ Vulnerable ${e.vulnerable}`,
      e.weak>0&&`↓ Debilidad ${e.weak}`,
      e.attackDown>0&&`⚔ Desarmado -${e.attackDown}`,
      e.stunned>0&&`✦ Aturdido`
    ].filter(Boolean).map(x=>`<span class="${String(x).startsWith('☣')?'acid-state':String(x).startsWith('☠')?'poison-state':String(x).startsWith('◎')?'marked-state':''}">${x}</span>`).join('');
    const heroData=CLASSES[heroClassId]||CLASSES.warrior;
    const enemyRank=e.type==='boss'?'GUARDIAN':e.type==='elite'?'ELITE':'CRIATURA';
    const affinityTips={
      Blindado:'Quebrá su guardia antes de gastar tus golpes fuertes.',
      Furioso:'Prepará bloqueo: sus ataques aumentan con la presión.',
      Venenoso:'No alargues el combate o el veneno te desgastará.',
      Acechante:'Puede atacar con rapidez; conservá una defensa.',
      Inestable:'Alterna entre atacar y protegerse.'
    };
    const affinityTip=affinityTips[e.affinity]||affinityTips.Inestable;
    return `<section class="cardspire-combat">
      <div class="cardspire-battle-top">
        <span class="battle-round"><i>RONDA</i><b>${hunt.turn}</b></span>
        <span class="battle-deck-summary"><small>${escape(scene.name)}</small>MAZO <b>${hunt.draw.length}</b><i></i> DESCARTE <b>${hunt.discard.length}</b></span>
        <span class="affinity"><b>✦ ${escape(e.affinity||'Inestable')}</b><small>${escape(affinityTip)}</small></span>
      </div>
      <div class="cardspire-fighters">
        <div class="cardspire-scene-backdrop" aria-hidden="true"><img src="${escape(scene.asset)}" alt=""></div>
        <div class="cardspire-arena-decor" aria-hidden="true"><i></i><i></i><i></i><span></span></div>
        <article class="fighter hero fighter-card class-${escape(heroClassId)}">
          <div class="fighter-art fighter-portrait">${img}<span class="fighter-frame-label">HÉROE</span></div>
          <div class="fighter-sheet">
            <div class="fighter-kicker"><small>${escape(label()).toUpperCase()}</small><span class="fighter-role">${escape(heroData.weapon||'Arma')}</span></div>
            <b>${escape(hero().name||'Aventurero')}</b>
            <div class="bar hp"><i style="width:${pct(hunt.hp,hunt.maxHp)}"></i></div>
            <span class="fighter-health">${Math.ceil(hunt.hp)} / ${hunt.maxHp} VIDA</span>
            <div class="combat-states hero-states">${heroStates}</div>
            <div class="fighter-readiness"><span>MANO <b>${hunt.hand.length}</b></span><span>PROTECCIÓN <b>${hunt.block||0}</b></span>${heroClassId==='mage'?`<span class="arcane-readiness">CARGAS <b>${hunt.arcane||0}/5</b></span>`:''}${heroClassId==='priest'?`<span class="faith-readiness">FE <b>${hunt.faith||0}/9</b></span>`:''}${heroClassId==='assassin'?`<span class="combo-readiness">COMBO <b>${hunt.combo||0}/5</b></span>`:''}${heroClassId==='tamer'?`<span class="bond-readiness">VÍNCULO <b>${hunt.bond||0}/5</b></span>`:''}</div>
          </div>
        </article>
        <div class="cardspire-versus"><span>⚔</span><b>VS</b><small>TURNO ${hunt.turn}</small></div>
        <article class="fighter enemy fighter-card enemy-card ${escape(e.type||'normal')}">
          <div class="fighter-sheet">
            <div class="fighter-kicker"><small>${enemyRank}</small><span class="fighter-role threat-${escape(e.type||'normal')}">${escape(e.affinity||'Inestable')}</span></div>
            <b>${escape(e.name)}</b>
            <div class="bar enemyhp"><i style="width:${pct(e.hp,e.maxHp)}"></i></div>
            <span class="fighter-health">${Math.ceil(e.hp)} / ${e.maxHp} VIDA</span>
            <div class="combat-states enemy-states">${enemyStates}</div>
            <em class="intent-${e.intentKind}"><span>PRÓXIMA INTENCIÓN</span><b>⚠ ${escape(e.intent)} · ${escape(e.intentText)}</b></em>
          </div>
          <div class="enemy-symbol"><span class="fighter-frame-label">${enemyRank}</span>${enemyArt}</div>
        </article>
        ${last}
      </div>
      <div class="cardspire-command-dock">
        <div class="cardspire-pile draw-pile" aria-label="${hunt.draw.length} cartas en el mazo"><i></i><span><small>MAZO</small><b>${hunt.draw.length}</b></span></div>
        <div class="cardspire-turn">
          <span class="mana-orb"><i>✦</i><small>MANÁ</small><b>${Math.ceil(hunt.mana)}/${hunt.maxMana}</b></span>
          <div class="turn-focus"><small>TU TURNO</small><b>Elegí una carta o cedé la iniciativa</b></div>
          <button data-action="end" class="cardspire-end" ${hunt.cardChoice?.length?'disabled':''}>TERMINAR TURNO <b>→</b></button>
        </div>
        <div class="cardspire-pile discard-pile" aria-label="${hunt.discard.length} cartas descartadas"><i></i><span><small>DESCARTE</small><b>${hunt.discard.length}</b></span></div>
      </div>
      <p class="cardspire-hand-label"><span>ATAQUE Y DEFENSA GRATIS</span><i>◆</i><span>LAS TÁCTICAS CONSUMEN MANÁ</span></p>
      <div class="cardspire-hand-wrap"><div class="cardspire-hand">${cards||'<p>Sin cartas: terminá el turno.</p>'}</div></div>
      <div class="cardspire-notes">${hunt.notes.slice(0,2).map(x=>`<span>${escape(x)}</span>`).join('')}</div>
      ${hunterChoice}
    </section>`;
  }
  function combatMarkup(img){
    return combatMarkupV2(img);
    const e=hunt.enemy;
    const cards=hunt.hand.map(c=>{ const manaCost=cardManaCost(c); return `<button class="cardspire-card ${c.kind} ${c.art?'illustrated':''} ${manaCost?'tactical-card':'free-card'} ${manaCost>hunt.mana?'locked':''}" data-card="${c.id}"><span class="card-cost">${manaCost?`${manaCost}✦`:'0'}</span>${cardSideStat(c)}<span class="card-tag">${escape(c.tag||'HABILIDAD')}</span>${c.art?`<span class="card-art"><img src="assets/images/cards/${escape(c.art)}" alt="" loading="lazy"></span>`:`<i>${c.icon}</i>`}<b>${escape(c.name)}</b><small>${escape(c.desc)}</small></button>`; }).join('');
    const enemyArt=e.image ? `<img src="assets/images/${escape(e.image)}" alt="${escape(e.name)}">` : e.icon;
    const last=hunt.lastAction?`<div class="cardspire-impact ${hunt.lastAction.kind} fx-${escape(hunt.lastAction.fx||'impact')}"><span class="skill-fx-layer"></span><i>${hunt.lastAction.icon}</i><b>${escape(hunt.lastAction.text)}</b></div>`:'';
    const heroStates=[hunt.block&&`⬡ Bloqueo ${hunt.block}`,hunt.strength&&`⚑ Fuerza +${hunt.strength}`].filter(Boolean).map(x=>`<span>${x}</span>`).join('');
    const enemyStates=[e.guard&&`⬡ Guardia ${e.guard}`,e.vulnerable>0&&`✹ Vulnerable ${e.vulnerable}`].filter(Boolean).map(x=>`<span>${x}</span>`).join('');
    return `<section class="cardspire-combat"><div class="cardspire-battle-top"><span>COMBATE · TURNO ${hunt.turn}</span><span>MAZO ${hunt.draw.length} · DESCARTE ${hunt.discard.length}</span><span class="affinity">✦ ${escape(e.affinity)} <small>${e.affinity==='Blindado'?'Rompé su guardia antes de gastar cartas fuertes.':e.affinity==='Furioso'?'Sus golpes cargados hacen mucho más daño.':'Alterna entre atacar y protegerse.'}</small></span></div><div class="cardspire-fighters"><article class="fighter hero"><div class="fighter-art">${img}</div><div class="fighter-sheet"><small>${escape(label()).toUpperCase()}</small><b>${escape(hero().name||'Aventurero')}</b><div class="bar hp"><i style="width:${pct(hunt.hp,hunt.maxHp)}"></i></div><span>${Math.ceil(hunt.hp)} / ${hunt.maxHp}</span><div class="combat-states hero-states">${heroStates}</div></div></article><div class="cardspire-versus">VS<small>TURNO ${hunt.turn}</small></div><article class="fighter enemy"><div class="fighter-sheet"><small>${e.type==='boss'?'GUARDIÁN':e.type==='elite'?'ÉLITE':'CRIATURA'}</small><b>${escape(e.name)}</b><div class="bar enemyhp"><i style="width:${pct(e.hp,e.maxHp)}"></i></div><span>${Math.ceil(e.hp)} / ${e.maxHp}</span><div class="combat-states enemy-states">${enemyStates}</div><em class="intent-${e.intentKind}">⚠ ${e.intent}: ${e.intentText}</em></div><div class="enemy-symbol">${enemyArt}</div></article>${last}</div><div class="cardspire-turn"><span>MANÁ <b>${Math.ceil(hunt.mana)}/${hunt.maxMana}</b></span><button data-action="end" class="cardspire-end">TERMINAR TURNO →</button></div><p class="cardspire-hand-label">ATAQUE Y DEFENSA GRATIS · LAS TÁCTICAS CONSUMEN MANÁ</p><div class="cardspire-hand-wrap"><div class="cardspire-hand">${cards||'<p>Sin cartas: terminá el turno.</p>'}</div></div><div class="cardspire-notes">${hunt.notes.slice(0,2).map(x=>`<span>${escape(x)}</span>`).join('')}</div></section>`;
  }
  function bind(){
    section.querySelector('[data-action="back"]')?.addEventListener('click',back);
    section.querySelector('[data-action="reset-hunt"]')?.addEventListener('click',resetHunt);
    section.querySelector('[data-action="begin"]')?.addEventListener('click',event=>{
      const command=event.currentTarget.dataset.huntCommand;
      if(command==='cancel-retire'){ cancelRetirement(); return; }
      hunt.screen='map';
      safe(()=>window.Sound?.routeReveal?.());
      render();
    });
    section.querySelector('[data-action="advance"]')?.addEventListener('click',advance);
    section.querySelector('[data-action="restart"]')?.addEventListener('click',event=>{
      const command=event.currentTarget.dataset.huntCommand;
      if(command==='retire'){ retireCardHunt(); return; }
      if(command==='confirm-retire'){ settleCardHunt('retired'); return; }
      if(command==='settle-complete'){ settleCardHunt('completed'); return; }
      createRun(); show();
    });
    section.querySelector('[data-action="end"]')?.addEventListener('click',endTurn);
    section.querySelectorAll('[data-node]').forEach(b=>b.addEventListener('click',()=>chooseReachableNode(b.dataset.node)));
    section.querySelectorAll('[data-event]').forEach(b=>b.addEventListener('click',()=>resolveEvent(b.dataset.event)));
    section.querySelectorAll('[data-sanctuary]').forEach(b=>b.addEventListener('click',()=>resolveSanctuary(b.dataset.sanctuary)));
    section.querySelector('[data-action="open-treasure"]')?.addEventListener('click',openTreasure);
    section.querySelector('[data-action="leave-treasure"]')?.addEventListener('click',advance);
    section.querySelectorAll('[data-card]').forEach(b=>b.addEventListener('click',()=>playCard(b.dataset.card)));
    section.querySelectorAll('[data-hunter-choice]').forEach(b=>b.addEventListener('click',()=>chooseHunterCard(b.dataset.hunterChoice)));
    section.querySelectorAll('[data-buy-card]').forEach(b=>b.addEventListener('click',()=>buyShopCard(b.dataset.buyCard)));
    section.querySelector('[data-action="shop-reroll"]')?.addEventListener('click',rerollShop);
    section.querySelector('[data-action="leave-shop"]')?.addEventListener('click',advance);
    section.querySelectorAll('[data-evolution-card]').forEach(b=>b.addEventListener('click',()=>selectEvolutionCard(b.dataset.evolutionCard)));
    section.querySelectorAll('[data-evolution-branch]').forEach(b=>b.addEventListener('click',()=>applyEvolution(b.dataset.evolutionBranch)));
    section.querySelector('[data-evolution-back]')?.addEventListener('click',clearEvolutionSelection);
  }
  const cardNav=document.querySelector(`.nav-btn[data-sec="${SECTION_ID}"]`);
  const section=document.getElementById(SECTION_ID);
  if(!cardNav || !section) return;

  window.CardHunt={
    open:show,
    isOpen:()=>document.body.classList.contains('card-hunt-open') && section.classList.contains('active'),
    isProgressLocked:()=>hasStartedProgress(),
    snapshot:snapshotCardHunt,
    summary:()=>{
      const run=persistedRun();
      const calculatedDepth=run
        ? ((Math.max(1,Math.floor(n(run.act,1)))-1)*Math.max(1,Math.floor(n(run.maxFloor,5))))+Math.max(0,Math.floor(n(run.floor,0)))+1
        : 0;
      return {
        active:hasStartedProgress(run),
        depth:run ? Math.max(calculatedDepth,Math.floor(n(run.maxDepth,0))) : 0,
        reward:run ? Math.max(0,Math.floor(n(run.reward,0))) : 0,
        screen:run?.screen || 'intro'
      };
    },
    prepareCharacterSwitch:()=>{
      snapshotCardHunt();
      document.body.classList.remove('card-hunt-open');
      hunt=null;
      huntStateRef=null;
    },
    restoreResources:()=>{
      syncCardHuntOwner();
      if(!hasStartedProgress(hunt)) return false;
      hunt.hp=hunt.maxHp;
      hunt.mana=hunt.maxMana;
      snapshotCardHunt();
      if(section.classList.contains('active')) render();
      return true;
    },
    previewEvolution:()=>{
      const local=location.protocol==='file:'||['localhost','127.0.0.1'].includes(location.hostname);
      if(!local) return false;
      createRun();
      if(!evolutionCandidates().length) return false;
      hunt.floor=hunt.maxFloor-1;
      hunt.enemy={type:'boss',name:'Guardián del Altar de Prueba',goldReward:0,experienceReward:0};
      note('Vista de prueba del Altar: esta expedición local fue reiniciada.');
      if(!beginEvolution()) return false;
      show();
      return true;
    },
    previewMageEvolution:()=>window.CardHunt?.previewEvolution?.()
  };
  cardNav.addEventListener('click',show);
  document.querySelectorAll('.nav-btn[data-sec]').forEach(btn=>{ if(btn!==cardNav) btn.addEventListener('click',()=>{ snapshotCardHunt(); document.body.classList.remove('card-hunt-open','card-evolution-open'); }); });
  window.addEventListener('pagehide',snapshotCardHunt);
  document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='hidden') snapshotCardHunt(); });
})();
