/* ================= CARD-EVOLUTION.JS =================
   Motor de evoluciones de cartas. Las definiciones son inmutables; la
   evolucion se aplica a una copia concreta del mazo y queda serializada en
   la propia carta para que el snapshot de Caceria pueda restaurarla.
   ================================================================= */
(function(global){
  'use strict';

  const integer=value=>Math.max(0,Math.round(Number(value)||0));
  const scaled=(value,multiplier)=>Math.max(1,Math.round(integer(value)*multiplier));
  const branch=(id,name,path,description,preview,apply)=>({id,name,path,description,preview,apply});

  const DEFINITIONS={
    'mage-bolt':[
      branch(
        'astral-lance','Lanza Astral','PODER',
        'El proyectil atraviesa la mitad de la guardia y concentra más poder.',
        card=>[`Daño ${integer(card.value)} → ${scaled(card.value,1.35)}`,'Ignora 50% de la guardia'],
        card=>({...card,name:'Lanza Astral',art:'mage-lanza-astral-v1.webp',value:scaled(card.value,1.35),guardPierce:.5,fx:'arcane',desc:'Inflige 35% más daño e ignora la mitad de la guardia enemiga.'})
      ),
      branch(
        'arcane-catalyst','Catalizador Arcano','SINERGIA',
        'Convierte cada impacto en combustible para los grandes hechizos.',
        card=>[`Daño ${integer(card.value)} → ${scaled(card.value,1.10)}`,'Genera 1 Carga Arcana'],
        card=>({...card,name:'Catalizador Arcano',art:'mage-catalizador-arcano-v1.webp',value:scaled(card.value,1.10),arcaneGain:1,fx:'arcane',desc:'Inflige un poco más de daño y genera 1 Carga Arcana.'})
      )
    ],
    'mage-barrier':[
      branch(
        'prismatic-bastion','Bastión Prismático','PODER',
        'Una defensa directa para sobrevivir a golpes cargados y guardianes.',
        card=>[`Bloqueo ${integer(card.value)} → ${integer(card.value)+7}`],
        card=>({...card,name:'Bastión Prismático',art:'mage-bastion-prismatico-v1.webp',value:integer(card.value)+7,fx:'rune',desc:`Obtiene ${integer(card.value)+7} de bloqueo.`})
      ),
      branch(
        'living-rune','Runa Viviente','SINERGIA',
        'La runa pierde fuerza inmediata, pero permanece y alimenta tu magia.',
        card=>[`Bloqueo ${integer(card.value)} → 11`,'Conserva 50%','Genera 1 Carga Arcana'],
        card=>({...card,name:'Runa Viviente',art:'mage-runa-viviente-v1.webp',value:11,retain:.5,arcaneGain:1,fx:'rune',desc:'Obtiene 11 de bloqueo, conserva 50% al terminar el turno y genera 1 Carga Arcana.'})
      )
    ],
    'mage-echoes':[
      branch(
        'perfect-replica','Réplica Perfecta','PODER',
        'El eco se divide una vez más y aprovecha tres veces la Fuerza.',
        card=>[`Impactos ${integer(card.hits)||2} → 3`],
        card=>({...card,name:'Réplica Perfecta',art:'mage-replica-perfecta-v1.webp',hits:3,effect:'multi_hit',fx:'echoes',desc:`Golpea 3 veces por ${integer(card.value)} de daño.`})
      ),
      branch(
        'ethereal-resonance','Resonancia Etérea','SINERGIA',
        'Los ecos revelan una nueva posibilidad mientras acumulan energía.',
        ()=>['Roba 1 carta','Genera 1 Carga Arcana'],
        card=>({...card,name:'Resonancia Etérea',art:'mage-resonancia-eterea-v1.webp',draw:1,arcaneGain:1,fx:'echoes',desc:'Golpea 2 veces, roba 1 carta y genera 1 Carga Arcana.'})
      )
    ],
    'mage-fracture':[
      branch(
        'dimensional-break','Quiebre Dimensional','PODER',
        'La fractura se profundiza y deja una apertura más duradera.',
        card=>[`Daño ${integer(card.value)} → ${scaled(card.value,1.30)}`,'Vulnerable 2 → 3'],
        card=>({...card,name:'Quiebre Dimensional',art:'mage-quiebre-dimensional-v1.webp',value:scaled(card.value,1.30),vulnerable:3,fx:'fracture',desc:'Inflige 30% más daño y aplica Vulnerable durante 3 turnos.'})
      ),
      branch(
        'silence-seal','Sello de Silencio','SINERGIA',
        'Interrumpe al enemigo cuando su guardia está rota y conserva energía.',
        ()=>['Aturde sin guardia','Genera 1 Carga Arcana','Vulnerable 1'],
        card=>({...card,name:'Sello de Silencio',art:'mage-sello-silencio-v1.webp',value:scaled(card.value,.90),vulnerable:1,stun:true,arcaneGain:1,fx:'fracture',desc:'Inflige daño, genera 1 Carga y, sin guardia enemiga, cancela su próxima acción.'})
      )
    ],
    'mage-nova':[
      branch(
        'supernova','Supernova','PODER',
        'Un cuarto estallido aumenta el daño total a cambio de más maná.',
        card=>[`Impactos ${integer(card.hits)||3} → 4`,`Maná ${integer(card.mana)} → 22`],
        card=>({...card,name:'Supernova',art:'mage-supernova-v1.webp',hits:4,mana:22,effect:'multi_hit',fx:'nova',desc:`Cuatro impactos de ${integer(card.value)} de daño. Consume 22 de maná.`})
      ),
      branch(
        'astral-implosion','Implosión Astral','SINERGIA',
        'Colapsa hasta tres Cargas Arcanas dentro de la nova.',
        card=>[`Maná ${integer(card.mana)} → 16`,'Consume hasta 3 Cargas',`+${Math.max(5,integer(card.value))} daño por Carga`],
        card=>({...card,name:'Implosión Astral',art:'mage-implosion-astral-v1.webp',mana:16,arcaneConsume:3,arcaneDamage:Math.max(5,integer(card.value)),fx:'nova',desc:`Golpea 3 veces y consume hasta 3 Cargas para sumar ${Math.max(5,integer(card.value))} de daño por cada una.`})
      )
    ],
    'warrior-strike':[
      branch(
        'colossal-cleave','Tajo Colosal','PODER',
        'Toda la fuerza del Guerrero cae en un corte capaz de atravesar una defensa cerrada.',
        card=>[`Daño ${integer(card.value)} → ${scaled(card.value,1.40)}`,'Ignora 35% de la guardia'],
        card=>({...card,name:'Tajo Colosal',art:'warrior-tajo-colosal-v2.webp',value:scaled(card.value,1.40),guardPierce:.35,fx:'slash',desc:'Inflige 40% más daño e ignora 35% de la guardia enemiga.'})
      ),
      branch(
        'unstoppable-chain','Cadena Imparable','SINERGIA',
        'Cada ataque abre el espacio para que el siguiente golpe sea más peligroso.',
        card=>[`Daño ${integer(card.value)} → ${scaled(card.value,1.10)}`,'Gana +3 daño por Ataque previo este turno'],
        card=>({...card,name:'Cadena Imparable',art:'warrior-cadena-imparable-v2.webp',value:scaled(card.value,1.10),effect:'attack_chain',fx:'slash',desc:'Inflige 10% más daño y gana +3 por cada Ataque jugado antes este turno.'})
      )
    ],
    'warrior-guard':[
      branch(
        'steel-bulwark','Baluarte de Acero','PODER',
        'El escudo se vuelve una muralla capaz de soportar el golpe más brutal.',
        card=>[`Bloqueo ${integer(card.value)} → ${integer(card.value)+8}`],
        card=>({...card,name:'Baluarte de Acero',art:'warrior-baluarte-acero-v2.webp',value:integer(card.value)+8,fx:'shield',desc:`Obtiene ${integer(card.value)+8} de bloqueo.`})
      ),
      branch(
        'spiked-shield','Escudo Espinado','SINERGIA',
        'Una defensa activa que obliga al enemigo a pagar por su próximo ataque.',
        card=>[`Bloqueo ${integer(card.value)} → 10`,'Devuelve 8 de daño'],
        card=>({...card,name:'Escudo Espinado',art:'warrior-escudo-espinado-v2.webp',value:10,thorns:8,effect:'thorns',fx:'shield',desc:'Obtiene 10 de bloqueo y devuelve 8 de daño al próximo atacante.'})
      )
    ],
    'warrior-bash':[
      branch(
        'worldbreaker','Quebrantamundos','PODER',
        'El impacto abre la armadura y deja al enemigo expuesto durante más tiempo.',
        card=>[`Daño ${integer(card.value)} → ${scaled(card.value,1.35)}`,'Vulnerable 2 → 3'],
        card=>({...card,name:'Quebrantamundos',art:'warrior-quebrantamundos-v2.webp',value:scaled(card.value,1.35),vulnerable:3,fx:'breaker',desc:'Inflige 35% más daño y aplica Vulnerable durante 3 turnos.'})
      ),
      branch(
        'concussive-blow','Golpe Conmocionante','SINERGIA',
        'Sacrifica parte del daño para interrumpir por completo a un enemigo sin guardia.',
        card=>[`Daño ${integer(card.value)} → ${scaled(card.value,.90)}`,'Aturde sin guardia','Vulnerable 1'],
        card=>({...card,name:'Golpe Conmocionante',art:'warrior-golpe-conmocionante-v2.webp',value:scaled(card.value,.90),vulnerable:1,stun:true,fx:'breaker',desc:'Inflige daño, aplica Vulnerable 1 y, sin guardia enemiga, cancela su próxima acción.'})
      )
    ],
    'warrior-rally':[
      branch(
        'conquerors-roar','Clamor del Conquistador','PODER',
        'Un rugido definitivo que convierte la voluntad del Guerrero en fuerza permanente.',
        card=>[`Fuerza ${integer(card.value)} → 4`,`Maná ${integer(card.mana)} → 12`],
        card=>({...card,name:'Clamor del Conquistador',art:'warrior-clamor-conquistador-v2.webp',value:4,mana:12,fx:'warcry',desc:'Consume 12 de maná y gana +4 Fuerza para el resto del combate.'})
      ),
      branch(
        'war-discipline','Disciplina de Guerra','SINERGIA',
        'La formación se ordena: conserva la mejora y encuentra dos opciones nuevas.',
        card=>[`Maná ${integer(card.mana)} → 6`,'Roba 2 cartas'],
        card=>({...card,name:'Disciplina de Guerra',art:'warrior-disciplina-guerra-v2.webp',value:2,mana:6,draw:2,fx:'warcry',desc:'Consume 6 de maná, gana +2 Fuerza y roba 2 cartas.'})
      )
    ],
    'warrior-second-wind':[
      branch(
        'unyielding-pulse','Pulso Indomable','PODER',
        'Una respiración profunda devuelve una gran reserva de energía para el asalto.',
        card=>[`Maná recuperado ${integer(card.value)} → 24`],
        card=>({...card,name:'Pulso Indomable',art:'warrior-pulso-indomable-v2.webp',value:24,fx:'warcry',desc:'Recupera 24 de maná.'})
      ),
      branch(
        'battle-rhythm','Ritmo de Batalla','SINERGIA',
        'El Guerrero recupera el aliento sin perder de vista su próxima decisión.',
        card=>[`Maná recuperado ${integer(card.value)} → 16`,'Roba 1 carta'],
        card=>({...card,name:'Ritmo de Batalla',art:'warrior-ritmo-batalla-v2.webp',value:16,draw:1,fx:'warcry',desc:'Recupera 16 de maná y roba 1 carta.'})
      )
    ],
    'archer-shot':[
      branch(
        'evolved-piercing-arrow','Flecha Perforante','PODER',
        'Una punta reforzada atraviesa la defensa y conserva toda su velocidad.',
        card=>[`Daño ${integer(card.value)} → ${scaled(card.value,1.35)}`,'Ignora 65% de la guardia'],
        card=>({...card,name:'Flecha Perforante',art:'archer-flecha-perforante-v2.webp',value:scaled(card.value,1.35),guardPierce:.65,fx:'piercing-arrow',desc:'Inflige 35% más daño e ignora 65% de la guardia enemiga.'})
      ),
      branch(
        'corrosive-tip','Punta Corrosiva','SINERGIA',
        'La flecha sacrifica fuerza inmediata para comenzar a destruir al enemigo desde dentro.',
        card=>[`Daño ${integer(card.value)} → ${scaled(card.value,1.05)}`,'Aplica 2 de Ácido'],
        card=>({...card,name:'Punta Corrosiva',art:'archer-punta-corrosiva-v2.webp',value:scaled(card.value,1.05),acid:2,fx:'acid-arrow',desc:'Inflige un poco más de daño y aplica 2 de Ácido que ignora la guardia.'})
      )
    ],
    'archer-step':[
      branch(
        'gale-step','Paso del Vendaval','PODER',
        'El Cazador desaparece entre hojas y viento antes de que el golpe pueda alcanzarlo.',
        card=>[`Bloqueo ${integer(card.value)} → ${integer(card.value)+7}`],
        card=>({...card,name:'Paso del Vendaval',art:'archer-paso-vendaval-v2.webp',value:integer(card.value)+7,fx:'wind',desc:`Obtiene ${integer(card.value)+7} de bloqueo.`})
      ),
      branch(
        'calculated-retreat','Retirada Calculada','SINERGIA',
        'Cada paso defensivo crea distancia, revela una opción nueva y prepara una evasión.',
        card=>[`Bloqueo ${integer(card.value)} → 9`,'Roba 1 carta','Evade el próximo ataque'],
        card=>({...card,name:'Retirada Calculada',art:'archer-retirada-calculada-v2.webp',value:9,draw:1,evade:1,fx:'wind',desc:'Obtiene 9 de bloqueo, roba 1 carta y evade el próximo ataque enemigo.'})
      )
    ],
    'archer-twin':[
      branch(
        'lethal-triad','Tríada Letal','PODER',
        'Una tercera flecha completa la formación y aprovecha tres veces el Ataque.',
        card=>[`Impactos ${integer(card.hits)||2} → 3`],
        card=>({...card,name:'Tríada Letal',art:'archer-triada-letal-v2.webp',hits:3,effect:'multi_hit',fx:'twin',desc:`Golpea 3 veces por ${integer(card.value)} de daño.`})
      ),
      branch(
        'hawk-rhythm','Ritmo del Halcón','SINERGIA',
        'Las dos flechas encuentran el pulso exacto y revelan el instante del próximo golpe crítico.',
        ()=>['Roba 1 carta','El próximo Ataque será crítico'],
        card=>({...card,name:'Ritmo del Halcón',art:'archer-ritmo-halcon-v2.webp',draw:1,nextCritical:true,fx:'twin',desc:'Golpea 2 veces, roba 1 carta y vuelve crítico tu próximo Ataque.'})
      )
    ],
    'archer-mark':[
      branch(
        'executioners-mark','Marca del Verdugo','PODER',
        'La señal revela una abertura profunda y prolonga la vulnerabilidad de la presa.',
        card=>[`Daño ${integer(card.value)} → ${scaled(card.value,1.30)}`,'Vulnerable 2 → 3'],
        card=>({...card,name:'Marca del Verdugo',art:'archer-marca-verdugo-v2.webp',value:scaled(card.value,1.30),vulnerable:3,fx:'mark',desc:'Inflige 30% más daño y aplica Vulnerable durante 3 turnos.'})
      ),
      branch(
        'marked-prey','Presa Señalada','SINERGIA',
        'El Cazador deja de atacar por un instante para estudiar a su objetivo y preparar toda la mano.',
        ()=>['Marca la presa durante 3 turnos','Tus Ataques infligen +25%','Roba 1 carta'],
        card=>({...card,name:'Presa Señalada',art:'archer-presa-senalada-v2.webp',kind:'utility',value:0,effect:'hunter_mark',turns:3,draw:1,fx:'prey-mark',desc:'Marca al enemigo durante 3 turnos, roba 1 carta y aumenta 25% el daño de tus Ataques.'})
      )
    ],
    'archer-volley':[
      branch(
        'arrow-tempest','Tormenta de Flechas','PODER',
        'Una cuarta flecha convierte la lluvia en un bombardeo capaz de borrar la línea enemiga.',
        card=>[`Impactos ${integer(card.hits)||3} → 4`,`Maná ${integer(card.mana)} → 20`],
        card=>({...card,name:'Tormenta de Flechas',art:'archer-tormenta-flechas-v2.webp',hits:4,mana:20,effect:'multi_hit',fx:'volley',desc:`Golpea 4 veces por ${integer(card.value)} de daño. Consume 20 de maná.`})
      ),
      branch(
        'evolved-caustic-rain','Lluvia Cáustica','SINERGIA',
        'Las flechas cubren el campo con un compuesto que sigue dañando después del impacto.',
        card=>[`Maná ${integer(card.mana)} → 14`,'Aplica 3 de Ácido'],
        card=>({...card,name:'Lluvia Cáustica',art:'archer-lluvia-caustica-evolucion-v2.webp',mana:14,acid:3,effect:'acid_rain',fx:'acid-rain',desc:'Golpea 3 veces, consume 14 de maná y aplica 3 de Ácido.'})
      )
    ]
  };

  function definitionsFor(card){
    if(!card || card.evolution) return [];
    return DEFINITIONS[String(card.key||'')]||[];
  }

  function branchesFor(card){
    return definitionsFor(card).map(entry=>({
      id:entry.id,
      name:entry.name,
      path:entry.path,
      description:entry.description,
      preview:entry.preview(card)
    }));
  }

  function evolve(card,branchId){
    if(!card || card.evolution) return null;
    const entry=definitionsFor(card).find(candidate=>candidate.id===branchId);
    if(!entry) return null;
    const baseName=String(card.name||'Carta');
    const evolved=entry.apply({...card});
    return {
      ...evolved,
      evolution:{
        version:1,
        baseKey:String(card.key||''),
        baseName,
        branch:entry.id,
        branchName:entry.name,
        path:entry.path,
        evolvedAt:Date.now()
      }
    };
  }

  global.CardEvolution={
    hasBranches:card=>definitionsFor(card).length>0,
    branchesFor,
    evolve,
    definedKeys:()=>Object.keys(DEFINITIONS),
    branchCount:()=>Object.values(DEFINITIONS).reduce((sum,entries)=>sum+entries.length,0)
  };
})(window);
