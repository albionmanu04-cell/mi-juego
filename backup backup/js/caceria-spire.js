/* Cacería de cartas: modo independiente, táctil y de pantalla completa. */
(function(){
  'use strict';
  const SECTION_ID = 'secCardHunt';
  let hunt = null;
  const TYPES = {
    fight:{icon:'⚔',name:'Combate',text:'Una criatura bloquea la senda.',danger:'Moderado',reward:'Oro de run y progreso',asset:'nodo-combate-v2.webp'},
    elite:{icon:'✦',name:'Élite',text:'Un rival fortalecido protege una recompensa superior.',danger:'Alto',reward:'Más oro y botín especial',asset:'nodo-elite-v2.webp'},
    rest:{icon:'✚',name:'Santuario',text:'Un refugio seguro para recuperar fuerzas.',danger:'Ninguno',reward:'Recupera 30% de vida',asset:'nodo-santuario-v2.webp'},
    event:{icon:'?',name:'Misterio',text:'Una decisión desconocida puede cambiar la expedición.',danger:'Variable',reward:'Efecto o mejora temporal',asset:'nodo-misterio-v2.webp'},
    treasure:{icon:'◇',name:'Tesoro',text:'Un escondite de riquezas aguarda fuera del camino.',danger:'Bajo',reward:'Oro de expedición',asset:'nodo-tesoro-v2.webp'},
    shop:{icon:'⚖',name:'Mercader',text:'Un viajero ofrece cartas que transforman tu mazo.',danger:'Ninguno',reward:'Cartas avanzadas',asset:'nodo-mercader-v2.webp'},
    boss:{icon:'♛',name:'Guardián',text:'El soberano del acto espera al final de la senda.',danger:'Extremo',reward:'Gran botín y nuevo acto',asset:'nodo-guardian-v2.webp'}
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

  function createRun(){
    const hp=heroMaxHp(), mana=heroMaxMana();
    hunt={screen:'intro', act:1, floor:0, maxFloor:5, hp, maxHp:hp, mana, maxMana:mana,
      block:0, strength:0, thorns:0, faith:0, combo:0, bond:0, retainBlock:0, attacksThisTurn:0, defensesThisTurn:0,
      evade:0, nextCritical:false, cardChoice:null, traps:[], trapMastery:0,
      deck:buildDeck(), draw:[], hand:[], discard:[], enemy:null,
      cardPool:buildAdvancedPool(), shopOffers:[], unlockedCards:[],
      map:makeMap(), selectedNode:null, routeLane:null, routeHistory:[],
      notes:['La senda se abre. Elegí el primer destino.'], reward:0, turn:1, lastAction:null};
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
  /* Mazo base del Guerrero: diez cartas sencillas para aprender el ciclo
     de ataque, defensa y preparación antes de desbloquear cartas avanzadas. */
  function warriorStarterDeck(){
    const strike=Math.max(7,Math.round(heroAttack()*.75));
    const deck=[
      ...Array.from({length:4},()=>({key:'warrior-strike',name:'Corte de Acero',icon:'⚔',art:'warrior-corte-acero.jpg',cost:1,kind:'attack',value:strike,tag:'ATAQUE',desc:`Inflige ${strike} de daño.`})),
      ...Array.from({length:4},()=>({key:'warrior-guard',name:'Guardia de Escudo',icon:'⬡',art:'warrior-guardia-escudo.jpg',cost:1,kind:'block',value:12,tag:'DEFENSA',desc:'Obtiene 12 de bloqueo este turno.'})),
      {key:'warrior-bash',name:'Rompeguardia',icon:'✹',art:'warrior-rompeguardia.jpg',cost:2,kind:'bash',value:Math.round(strike*1.35),vulnerable:2,tag:'TÁCTICA',desc:`Inflige ${Math.round(strike*1.35)} de daño y deja al enemigo Vulnerable durante 2 turnos.`},
      {key:'warrior-rally',name:'Grito de Guerra',icon:'⚑',art:'warrior-grito-guerra.jpg',cost:1,kind:'strength',value:2,tag:'TÁCTICA',desc:'Gana +2 Fuerza para el resto de este combate.'}
    ];
    return deck.map((c,i)=>({...c,id:c.key+'-'+i}));
  }
  function buildAdvancedPool(){
    const classId=heroClass();
    const cards=classId==='warrior'
      ? warriorSynergyCards(Math.max(7,Math.round(heroAttack()*.75)))
      : classId==='archer'
        ? [...archerSynergyCards(heroAttack()),...archerHunterCards(heroAttack()),...archerTrapCards(heroAttack())]
        : [];
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
  function catalogForClass(classId){
    const starter=uniqueCards(classStarterDeck(classId)).map(card=>({...card,family:'INICIAL',rarity:'INICIAL',starter:true}));
    const advancedSource=classId==='warrior'
      ? warriorSynergyCards(Math.max(7,Math.round(heroAttack()*.75)))
      : classId==='archer'
        ? [...archerSynergyCards(heroAttack()),...archerHunterCards(heroAttack()),...archerTrapCards(heroAttack())]
        : [];
    if(!advancedSource.length) return starter;
    const advanced=advancedSource.map(card=>{
      const mana=Math.max(0,n(card.mana,0));
      return {
        ...card,
        family:classId==='archer'
          ? (String(card.key).startsWith('archer-hunter-')
              ? 'ACECHO DEL CAZADOR'
              : String(card.key).startsWith('archer-trap-')
                ? 'MAESTRO DE TRAMPAS'
                : 'ALQUIMIA DE CAZA')
          : cardFamily(card),
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
    hunt.enemy=enemyFor(choice.type); hunt.screen='combat'; hunt.block=0; hunt.faith=0; hunt.combo=0; hunt.bond=0;
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
  function selectNode(id){
    const options=hunt.map[hunt.floor]||[];
    const lane=options.findIndex(x=>x.id===id);
    if(lane<0||!reachableNodeIndexes().includes(lane)) return;
    hunt.selectedNode=id;
    safe(()=>window.Sound?.nodeSelect?.(options[lane]?.type||'event'));
    render();
  }
  function enterSelectedNode(){
    if(!hunt.selectedNode) return;
    const id=hunt.selectedNode;
    const options=hunt.map[hunt.floor]||[];
    const lane=options.findIndex(x=>x.id===id);
    if(lane<0||!reachableNodeIndexes().includes(lane)) return;
    hunt.routeLane=lane;
    hunt.routeHistory=Array.isArray(hunt.routeHistory)?hunt.routeHistory.filter(step=>step.floor!==hunt.floor):[];
    hunt.routeHistory.push({floor:hunt.floor,lane,id,type:options[lane]?.type||'event'});
    hunt.selectedNode=null;
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
    const manaCost=cardManaCost(card);
    if(!card) return;
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
    hunt.mana-=manaCost;
    if(card.kind==='attack'||card.kind==='spell'){
      let dmg=card.value+(hunt.strength||0);
      const markTurns=Math.max(0,hunt.enemy.marked||0);
      let critical=false;
      if(card.effect==='attack_chain') dmg+=(hunt.attacksThisTurn||0)*3;
      if(['multi_hit','acid_multi','acid_rain','acid_storm','assassin_multi','tamer_multi'].includes(card.effect)) dmg=(card.value*(card.hits||1))+((hunt.strength||0)*(card.hits||1));
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
      if(card.effect==='assassin_execute'){
        dmg+=comboSpent*Math.max(0,n(card.comboDamage,0));
        if(hunt.enemy.hp/hunt.enemy.maxHp<=.35) dmg=Math.round(dmg*1.75);
      }
      if(card.effect==='tamer_alpha') dmg+=bondSpent*Math.max(0,n(card.bondDamage,0));
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
      const absorbed=pierces?0:Math.min(hunt.enemy.guard,dmg);
      if(!pierces) hunt.enemy.guard-=absorbed;
      dmg-=absorbed;
      hunt.enemy.hp=Math.max(0,hunt.enemy.hp-dmg);
      if(card.effect==='tamer_alpha'&&bondSpent>=5) hunt.enemy.vulnerable=Math.max(hunt.enemy.vulnerable||0,1);
      if(card.acid) hunt.enemy.acid=Math.max(0,hunt.enemy.acid||0)+card.acid;
      if(card.poison) hunt.enemy.poison=Math.max(0,hunt.enemy.poison||0)+card.poison;
      if(heroClass()==='warrior') hunt.block+=2;
      if(card.key==='class'&&heroClass()==='warrior') hunt.block+=8;
      if(card.effect==='weak') hunt.enemy.weak=Math.max(hunt.enemy.weak||0,card.weak||2);
      if(card.effect==='disarm') hunt.enemy.attackDown=(hunt.enemy.attackDown||0)+(card.attackDown||2);
      if(card.effect==='stun' && hunt.enemy.guard<=0) hunt.enemy.stunned=Math.max(hunt.enemy.stunned||0,1);
      hunt.attacksThisTurn=(hunt.attacksThisTurn||0)+1;
      hunt.lastAction={icon:card.icon||'⚔',text:dmg?`${critical?'CRÍTICO · ':''}${dmg} DE DAÑO${comboSpent?` · COMBO ×${comboSpent}`:''}${bondSpent?` · VÍNCULO ×${bondSpent}`:''}`:`GUARDIA ROTA`,kind:'hero'};
      note(`${card.name}: ${critical?'crítico de ':''}${dmg} de daño${pierces?' · atraviesa la guardia':absorbed?` · ${absorbed} absorbido`:''}${card.poison?` · Veneno +${card.poison}`:''}${comboSpent?` · consumís ${comboSpent} Combo`:''}${bondSpent?` · consumís ${bondSpent} Vínculo`:''}${card.effect==='tamer_alpha'&&bondSpent>=5?' · aplica Vulnerable 1':''}.`);
    } else if(card.kind==='bash'){
      let dmg=card.value+(hunt.strength||0);
      if(card.effect==='faith_judgement') dmg+=faithSpent*Math.max(0,n(card.faithDamage,0));
      if(hunt.enemy.vulnerable>0) dmg=Math.round(dmg*1.5);
      const absorbed=Math.min(hunt.enemy.guard,dmg); hunt.enemy.guard-=absorbed; dmg-=absorbed;
      hunt.enemy.hp=Math.max(0,hunt.enemy.hp-dmg); hunt.enemy.vulnerable=card.vulnerable||2;
      if(card.effect==='faith_judgement'&&faithSpent){
        hunt.hp=Math.min(hunt.maxHp,hunt.hp+(faithSpent*Math.max(0,n(card.faithHeal,0))));
      }
      hunt.attacksThisTurn=(hunt.attacksThisTurn||0)+1;
      hunt.lastAction={icon:'✹',text:`${dmg} · JUICIO${faithSpent?` · FE ${faithSpent}`:''}`,kind:'hero'};
      note(`${card.name}: ${dmg} de daño. ${hunt.enemy.name} queda Vulnerable${faithSpent?` · consumís ${faithSpent} Fe y recuperás ${faithSpent*Math.max(0,n(card.faithHeal,0))} de vida`:''}.`);
    } else if(card.kind==='block'){
      let gained=card.value;
      if(card.effect==='faith_guard') gained+=faithSpent*Math.max(0,n(card.faithBlock,0));
      if(card.effect==='guard_chain') gained+=(hunt.defensesThisTurn||0)*3;
      const hadBlock=hunt.block>0;
      hunt.block+=gained;
      if(card.effect==='double_block') hunt.block*=2;
      if(card.effect==='thorns') hunt.thorns=Math.max(hunt.thorns||0,card.thorns||7);
      if(card.effect==='retain_block') hunt.retainBlock=Math.max(hunt.retainBlock||0,card.retain||.5);
      if(card.effect==='block_strength'&&hadBlock) hunt.strength+=1;
      if(card.effect==='hunter_evade'){
        hunt.evade=Math.max(1,hunt.evade||0);
        draw(1);
      }
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
    }
    else if(card.kind==='debuff'){
      hunt.enemy.weak=Math.max(hunt.enemy.weak||0,card.weak||1);
      hunt.enemy.vulnerable=Math.max(hunt.enemy.vulnerable||0,card.vulnerable||1);
      hunt.lastAction={icon:'◉',text:'ENEMIGO DEBILITADO',kind:'hero'};
      note(`${card.name}: aplica Debilidad ${card.weak||1} y Vulnerable ${card.vulnerable||1}.`);
    }
    else if(card.kind==='mana'){ hunt.mana=Math.min(hunt.maxMana,hunt.mana+card.value); note(`Maná +${card.value}.`); }
    else if(card.kind==='heal'){
      const healed=card.value+(card.effect==='faith_heal'?faithSpent*Math.max(0,n(card.faithHeal,0)):0);
      hunt.hp=Math.min(hunt.maxHp,hunt.hp+healed);
      note(`${card.name}: curás ${healed}${faithSpent?` y consumís ${faithSpent} Fe`:''}.`);
      hunt.lastAction={icon:card.icon,text:`+${healed} VIDA${faithSpent?` · FE ${faithSpent}`:''}`,kind:'hero'};
    }
    else if(card.kind==='strength'){ hunt.strength+=card.value; hunt.lastAction={icon:'⚑',text:`FUERZA +${card.value}`,kind:'hero'}; note(`${card.name}: Fuerza +${card.value} durante este combate.`); }
    if(card.kind==='mana') hunt.lastAction={icon:card.icon,text:`+${card.value} MANÁ`,kind:'hero'};
    if(comboSpent) hunt.combo=Math.max(0,comboBefore-comboSpent);
    if(card.comboGain){
      hunt.combo=Math.min(5,Math.max(0,n(hunt.combo,comboBefore))+Math.max(0,Math.round(n(card.comboGain,0))));
      note(`${card.name} genera 1 Combo. Combo actual: ${hunt.combo}/5.`);
    }
    if(faithSpent) hunt.faith=Math.max(0,faithBefore-faithSpent);
    if(card.faithGain){
      hunt.faith=Math.min(9,Math.max(0,n(hunt.faith,faithBefore))+Math.max(0,Math.round(n(card.faithGain,0))));
      note(`${card.name} genera 1 Fe. Fe actual: ${hunt.faith}/9.`);
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
    const reward=12+hunt.floor*5+(hunt.enemy.type==='elite'?22:0)+(hunt.enemy.type==='boss'?45:0);
    hunt.mana=Math.min(hunt.maxMana,hunt.mana+Math.max(8,Math.round(hunt.maxMana*.12)));
    hunt.reward+=reward; note(`Victoria sobre ${hunt.enemy.name}. +${reward} oro de expedición.`);
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
    if(!hunt) createRun();
    document.body.classList.remove('profile-screen-open');
    document.body.classList.add('card-hunt-open');
    document.querySelectorAll('.nav-btn[data-sec]').forEach(x=>x.classList.remove('active'));
    cardNav.classList.add('active'); section.classList.add('active');
    safe(()=>window.Sound?.setScene?.(hunt.screen==='combat'?(hunt.enemy?.type==='boss'?'boss':'battle'):'hunt'));
    safe(()=>window.Sound?.huntOpen?.());
    render();
  }
  function back(){ document.body.classList.remove('card-hunt-open'); document.querySelector('.nav-btn[data-sec="secHero"]')?.click(); }
  function escape(v){ return String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function render(){
    const app=document.getElementById('cardSpireApp'); if(!app||!hunt) return;
    const vis=visual(), img=vis.image ? `<img src="${escape(vis.image)}" alt="">` : '<span>⚔</span>';
    const scene=huntScene();
    const hud=`<header class="cardspire-hud"><div class="cardspire-hud-actions"><button data-action="back" class="cardspire-back">← Santuario</button><button data-action="reset-hunt" class="cardspire-reset" title="Reiniciar la expedición si quedó trabada" aria-label="Reiniciar Cacería">↻ Reiniciar</button></div><div class="cardspire-title"><small>${scene.mark} ${escape(scene.name.toUpperCase())}</small><b>ACTO ${hunt.act} · SENDA ${hunt.floor+1}/${hunt.maxFloor}</b></div><div class="cardspire-resources"><span>♥ ${Math.ceil(hunt.hp)}/${hunt.maxHp}</span><span>✦ ${Math.ceil(hunt.mana)}/${hunt.maxMana}</span><span>◈ ${hunt.reward}</span></div></header>`;
    let content='';
    if(hunt.screen==='intro') content=`<section class="cardspire-intro"><div class="cardspire-seal">✦</div><p class="cardspire-kicker">LA SENDA DEL ABISMO</p><h2>Una expedición.<br>Un mazo. Mil decisiones.</h2><p>Elegí tu ruta, usá las cartas con inteligencia y llevá el botín hasta el final.</p><button data-action="begin" class="cardspire-primary">COMENZAR EXPEDICIÓN <b>→</b></button><div class="cardspire-features"><span>⚔ Combate por turnos</span><span>◇ Rutas cambiantes</span><span>✦ Recompensas de run</span></div></section>`;
    else if(hunt.screen==='map') content=mapMarkup();
    else if(hunt.screen==='event') content=eventMarkup();
    else if(hunt.screen==='sanctuary') content=sanctuaryMarkup();
    else if(hunt.screen==='treasure') content=treasureMarkup();
    else if(hunt.screen==='shop') content=shopMarkup();
    else if(hunt.screen==='combat') content=combatMarkup(img);
    else if(hunt.screen==='victory') content=`<section class="cardspire-result win"><div class="result-icon">✦</div><p>VICTORIA</p><h2>${escape(hunt.enemy.name)} cayó</h2><span>El botín de expedición crece.</span><button data-action="advance" class="cardspire-primary">SEGUIR POR LA SENDA →</button></section>`;
    else content=`<section class="cardspire-result loss"><div class="result-icon">☾</div><p>LA SENDA TE RECHAZÓ</p><h2>La expedición terminó</h2><span>El oro de expedición se pierde, pero tu leyenda continúa.</span><button data-action="restart" class="cardspire-primary">INTENTAR OTRA VEZ →</button></section>`;
    app.innerHTML=`<main class="cardspire-shell scene-${scene.key}" style="--cardspire-scene:url('${scene.asset}')">${hud}<div class="cardspire-main">${content}</div></main>`;
    bind();
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
    const selected=current.find(x=>x.id===hunt.selectedNode);
    const selectedIndex=current.findIndex(x=>x.id===hunt.selectedNode);
    const displayRows=[...hunt.map].reverse();
    const rows=displayRows.map((row,index)=>{
      const real=hunt.map.length-1-index;
      const active=real===hunt.floor;
      const passed=real<hunt.floor;
      const future=real>hunt.floor;
      const activeLane=selectedIndex>=0?selectedIndex:(hunt.routeLane===null||hunt.routeLane===undefined?null:Math.floor(n(hunt.routeLane,0)));
      const safeLane=activeLane===null?null:Math.max(0,Math.min(current.length-1,activeLane));
      const travelerX=active&&current.length>1&&safeLane!==null
        ? ((safeLane+.5)/current.length)*100
        : 50;
      const traveler=active?`<span class="route-traveler" style="--traveler-x:${travelerX}%"><i>✦</i><small>VOS</small></span>`:'';
      const visitedStep=(hunt.routeHistory||[]).find(step=>step.floor===real);
      const nodes=row.map((x,lane)=>{
        const type=TYPES[x.type]||TYPES.event;
        const chosen=x.id===hunt.selectedNode;
        const reachable=!active||reachableIndexes.includes(lane);
        const visited=passed&&visitedStep?.id===x.id;
        const unavailable=active&&!reachable;
        const status=active
          ? (chosen?'SELECCIONADO':reachable?'INSPECCIONAR':'SIN CONEXIÓN')
          : (passed?(visited?'RECORRIDO':'DESCARTADO'):'OCULTO');
        return `<button class="cardspire-node ${x.type} ${chosen?'selected':''} ${future?'veiled':''} ${unavailable?'unreachable':''} ${visited?'visited':''} ${passed&&!visited?'abandoned':''}" data-node="${x.id}" ${active&&reachable?'':'disabled'} aria-pressed="${chosen?'true':'false'}" aria-disabled="${active&&reachable?'false':'true'}">
          <span class="node-portrait"><img src="${MAP_ASSET_ROOT}${type.asset}" alt="" loading="lazy"><i>${type.icon}</i></span>
          <b>${type.name}</b><small>${status}</small>
        </button>`;
      }).join('');
      return `<div class="cardspire-map-row ${row.length===1?'single':''} ${active?'current':''} ${passed?'passed':''} ${future?'future':''}" style="--route-columns:${row.length}">${traveler}${nodes}</div>`;
    }).join('');
    const info=selected?(()=>{
      const type=TYPES[selected.type]||TYPES.event;
      return `<div class="route-node-info ${selected.type}">
        <img src="${MAP_ASSET_ROOT}${type.asset}" alt="">
        <div><small>DESTINO SELECCIONADO</small><h3>${type.name}</h3><p>${type.text}</p></div>
        <dl><div><dt>PELIGRO</dt><dd>${type.danger}</dd></div><div><dt>POSIBLE RECOMPENSA</dt><dd>${type.reward}</dd></div></dl>
        <button data-action="enter-node">ENTRAR EN ${type.name.toUpperCase()} <b>→</b></button>
      </div>`;
    })():`<div class="route-node-info empty"><span>✦</span><div><small>LA SENDA ESPERA</small><h3>Inspeccioná un destino</h3><p>Los destinos conectados están iluminados. Elegí uno para conocer su peligro y recompensa.</p></div></div>`;
    return `<section class="cardspire-map-view">
      <div class="cardspire-region"><i>${scene.mark}</i><span>REGIÓN ACTUAL</span><b>${escape(scene.name)}</b><small>${escape(scene.roster||'')}</small></div>
      <div class="cardspire-map-copy"><p>RUTA DE EXPEDICIÓN</p><h2>Elegí tu camino</h2><span>${escape(scene.theme||'Solo podés avanzar por las líneas conectadas a tu posición.')}</span><em>${escape(scene.warning||'')}</em></div>
      <div class="cardspire-map-board">
        ${mapRoutesMarkup(displayRows)}
        <div class="cardspire-map">${rows}</div>
      </div>
      ${info}
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
  function combatMarkupV2(img){
    const e=hunt.enemy;
    const heroClassId=heroClass();
    const scene=huntScene();
    const cards=hunt.hand.map(c=>{ const manaCost=cardManaCost(c); return `<button class="cardspire-card ${c.kind} ${c.art?'illustrated':''} ${manaCost?'tactical-card':'free-card'} ${manaCost>hunt.mana?'locked':''}" data-card="${c.id}"><span class="card-cost">${manaCost?`${manaCost}✦`:'0'}</span>${cardSideStat(c)}<span class="card-tag">${escape(c.tag||'HABILIDAD')}</span>${c.art?`<span class="card-art"><img src="assets/images/cards/${escape(c.art)}" alt="" loading="lazy"></span>`:`<i>${c.icon}</i>`}<b>${escape(c.name)}</b><small>${escape(c.desc)}</small></button>`; }).join('');
    const hunterChoice=hunt.cardChoice?.length?`<div class="hunter-choice-backdrop"><section class="hunter-choice-panel"><span class="hunter-choice-eye">◉</span><small>OJO DE HALCÓN</small><h3>Elegí el futuro de tu mano</h3><p>Una carta irá a tu mano. Las otras dos pasan al descarte.<br>Tu próximo ataque será crítico.</p><div class="hunter-choice-cards">${hunt.cardChoice.map(c=>`<button class="hunter-choice-card" data-hunter-choice="${escape(c.id)}">${c.art?`<img src="assets/images/cards/${escape(c.art)}" alt="">`:`<i>${c.icon||'✦'}</i>`}<b>${escape(c.name)}</b><small>${escape(c.desc)}</small></button>`).join('')}</div></section></div>`:'';
    const enemyArt=e.image ? `<img src="assets/images/${escape(e.image)}" alt="${escape(e.name)}">` : e.icon;
    const last=hunt.lastAction?`<div class="cardspire-impact ${hunt.lastAction.kind} fx-${escape(hunt.lastAction.fx||'impact')}"><span class="skill-fx-layer"></span><i>${hunt.lastAction.icon}</i><b>${escape(hunt.lastAction.text)}</b></div>`:'';
    const heroStates=[
      hunt.block&&`⬡ Bloqueo ${hunt.block}`,
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
    ].filter(Boolean).map(x=>`<span class="${String(x).startsWith('☀ Fe')?'faith-state':String(x).startsWith('✦ Combo')?'combo-state':String(x).startsWith('♞ Vínculo')?'bond-state':''}">${x}</span>`).join('');
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
            <div class="fighter-readiness"><span>MANO <b>${hunt.hand.length}</b></span><span>PROTECCIÓN <b>${hunt.block||0}</b></span>${heroClassId==='priest'?`<span class="faith-readiness">FE <b>${hunt.faith||0}/9</b></span>`:''}${heroClassId==='assassin'?`<span class="combo-readiness">COMBO <b>${hunt.combo||0}/5</b></span>`:''}${heroClassId==='tamer'?`<span class="bond-readiness">VÍNCULO <b>${hunt.bond||0}/5</b></span>`:''}</div>
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
    document.querySelector('[data-action="back"]')?.addEventListener('click',back);
    document.querySelector('[data-action="reset-hunt"]')?.addEventListener('click',resetHunt);
    document.querySelector('[data-action="begin"]')?.addEventListener('click',()=>{
      hunt.screen='map';
      safe(()=>window.Sound?.routeReveal?.());
      render();
    });
    document.querySelector('[data-action="advance"]')?.addEventListener('click',advance);
    document.querySelector('[data-action="restart"]')?.addEventListener('click',()=>{createRun();show();});
    document.querySelector('[data-action="end"]')?.addEventListener('click',endTurn);
    document.querySelectorAll('[data-node]').forEach(b=>b.addEventListener('click',()=>selectNode(b.dataset.node)));
    document.querySelector('[data-action="enter-node"]')?.addEventListener('click',enterSelectedNode);
    document.querySelectorAll('[data-event]').forEach(b=>b.addEventListener('click',()=>resolveEvent(b.dataset.event)));
    document.querySelectorAll('[data-sanctuary]').forEach(b=>b.addEventListener('click',()=>resolveSanctuary(b.dataset.sanctuary)));
    document.querySelector('[data-action="open-treasure"]')?.addEventListener('click',openTreasure);
    document.querySelector('[data-action="leave-treasure"]')?.addEventListener('click',advance);
    document.querySelectorAll('[data-card]').forEach(b=>b.addEventListener('click',()=>playCard(b.dataset.card)));
    document.querySelectorAll('[data-hunter-choice]').forEach(b=>b.addEventListener('click',()=>chooseHunterCard(b.dataset.hunterChoice)));
    document.querySelectorAll('[data-buy-card]').forEach(b=>b.addEventListener('click',()=>buyShopCard(b.dataset.buyCard)));
    document.querySelector('[data-action="shop-reroll"]')?.addEventListener('click',rerollShop);
    document.querySelector('[data-action="leave-shop"]')?.addEventListener('click',advance);
  }
  document.querySelector('.nav-btn[data-sec="secHunt"]')?.remove();
  document.getElementById('secHunt')?.remove();
  const cardNav=document.createElement('button');
  cardNav.className='nav-btn group-start'; cardNav.dataset.sec=SECTION_ID; cardNav.style.setProperty('--acc','#e8622c');
  cardNav.innerHTML='<span class="btn-icon">🃏</span><span class="nav-btn-text"><span class="btn-label">Cacería</span><span class="btn-hint">Senda de cartas</span></span>';
  const forge=document.querySelector('.nav-btn[data-sec="secForge"]'); forge?.before(cardNav);
  const section=document.createElement('section'); section.id=SECTION_ID; section.className='game-section cardspire-section'; section.innerHTML='<div id="cardSpireApp"></div>';
  document.getElementById('game')?.append(section);
  cardNav.addEventListener('click',()=>{ if(window.Sound) Sound.click(); show(); });
  document.querySelectorAll('.nav-btn[data-sec]').forEach(btn=>{ if(btn!==cardNav) btn.addEventListener('click',()=>document.body.classList.remove('card-hunt-open')); });
})();
