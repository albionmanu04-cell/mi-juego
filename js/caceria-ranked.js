(function(){
  'use strict';
  const Core=window.RankedInventoryCore;
  const app=document.getElementById('rankedHuntApp');
  if(!Core || !app) return;

  let selectedUid='';
  let notice='Elegí un objeto para inspeccionarlo o moverlo.';
  let normalizedSource;
  let defeatArmed=false;
  let resultVisible=false;
  let combatFeedback=null;
  let feedbackTimer=null;
  let recoveryMessage='';
  let recoveryTimer=null;
  let interactionLocked=false;
  let sanctuaryView='inventory';
  const craftQuantities={};
  let recipeFilter='all';
  let craftFeedback=null;
  let craftFeedbackTimer=null;
  let benchResult=null;
  let tutorialStep=-1;
  let publicLeaderboard=[];
  let publicLeaderboardStatus='idle';
  let publicLeaderboardError='';
  let publicRunStartPromise=null;
  const RANKED_TUTORIAL=[
    {eyebrow:'PASO 1 DE 3',icon:'▦',title:'EL CICLO DE EXTRACCIÓN',body:'El alijo es permanente. La mochila y el equipo entran a la incursión y se pierden si caés. Los dos sellos seguros siempre sobreviven.',points:['ALIJO = SEGURO','MOCHILA = EN RIESGO','SELLOS = PROTEGIDOS']},
    {eyebrow:'PASO 2 DE 3',icon:'◈',title:'PR = TU RANGO',body:'Cada incursión nueva calcula Puntos Ranked. Extraerte, avanzar, abatir criaturas y recuperar valor suma PR; caer puede restarlos.',points:['PR SUBE TU DIVISIÓN','HIERRO → ETERNO','NUNCA BAJA DE 0']},
    {eyebrow:'PASO 3 DE 3',icon:'✦',title:'XP = RECOMPENSAS',body:'La XP de temporada se obtiene jugando, fabricando y completando misiones. No se gasta: al alcanzar cada nivel reclamás su recompensa.',points:['XP NO ES PR','LA XP NO SE GASTA','RECOMPENSAS AL ALIJO']}
  ];
  const SECTOR_META=[
    {name:'La Ciénaga del Núcleo',shortName:'Ciénaga del Núcleo',hint:'Territorio de limos · observá su rareza y patrón',icon:'◉',theme:'slime'},
    {name:'El Bosque Sepulcral',shortName:'Bosque Sepulcral',hint:'Territorio de lobos · controlá el sangrado y sus emboscadas',icon:'⌁',theme:'wolf'},
    {name:'El Nido de Cristal',shortName:'Nido de Cristal',hint:'Territorio de arañas · anticipá veneno, redes y control',icon:'⌘',theme:'spider'},
    {name:'El Santuario de la Raíz Pétrea',shortName:'Santuario Pétreo',hint:'Territorio de gólems · quebrá su guardia antes del golpe pesado',icon:'◆',theme:'golem'},
    {name:'La Aguja de la Tormenta',shortName:'Aguja de la Tormenta',hint:'Territorio de dragones · sobreviví a la ofensiva final',icon:'ϟ',theme:'dragon'}
  ];
  const RANKED_HERO_ART={
    warrior:'assets/images/clase guerrero sprite v2.webp',
    archer:'assets/images/clase arquero sprite v2.webp',
    mage:'assets/images/clase mago sprite v2.webp',
    priest:'assets/images/clase sacerdote sprite v2.webp',
    assassin:'assets/images/clase asesino sprite v2.webp',
    tamer:'assets/images/clase domador sprite v2.webp'
  };
  const RANKED_CLASS_KITS={
    warrior:{label:'GUERRERO',attack:'TAJO FIRME',skill:'BASTIÓN',icon:'🛡',hint:'Reduce daño y devuelve un contraataque.',cooldown:3},
    archer:{label:'ARQUERO',attack:'DISPARO',skill:'RÁFAGA',icon:'➶',hint:'Tres flechas precisas atraviesan la guardia.',cooldown:3},
    mage:{label:'MAGO',attack:'CANALIZAR',skill:'NOVA',icon:'✦',hint:'Acumula hasta 3 cargas y las consume para causar daño arcano.',cooldown:3}
  };
  const RANKED_LEVEL_ABILITIES={
    warrior:[
      {key:'warrior-shield-bash',level:5,icon:'◈',label:'Golpe de Escudo',cooldown:2,hint:'Golpea, aturde y prepara cobertura.',effect:'shieldBash'},
      {key:'warrior-iron-fury',level:15,icon:'🔥',label:'Furia de Hierro',cooldown:4,hint:'Regenera vida y prepara un contraataque.',effect:'ironFury'},
      {key:'warrior-colossus',level:25,icon:'⚒',label:'Veredicto del Coloso',cooldown:5,hint:'Impacto brutal que ejecuta objetivos heridos.',effect:'colossus'}
    ],
    archer:[
      {key:'archer-piercing-arrow',level:5,icon:'➶',label:'Flecha Perforante',cooldown:2,hint:'Ignora por completo la guardia enemiga.',effect:'piercingArrow'},
      {key:'archer-blood-trap',level:15,icon:'⌁',label:'Trampa de Sangre',cooldown:4,hint:'Aturde y aplica Sangrado prolongado.',effect:'bloodTrap'},
      {key:'archer-arrow-storm',level:25,icon:'☄',label:'Tormenta de Flechas',cooldown:5,hint:'Cinco impactos rápidos sobre el objetivo.',effect:'arrowStorm'}
    ],
    mage:[
      {key:'mage-runic-bolt',level:5,icon:'✦',label:'Proyectil Rúnico',cooldown:2,hint:'Inflige daño y genera una carga arcana.',effect:'runicBolt'},
      {key:'mage-frost-prison',level:15,icon:'❄',label:'Prisión de Escarcha',cooldown:4,hint:'Aturde al enemigo y concede cobertura.',effect:'frostPrison'},
      {key:'mage-cataclysm',level:25,icon:'✺',label:'Cataclismo Astral',cooldown:5,hint:'Consume cargas para causar daño masivo.',effect:'cataclysm'}
    ]
  };
  function rankedClassKit(){ return RANKED_CLASS_KITS[state.characterClass]||null; }
  function rankedLevelAbilities(){ return RANKED_LEVEL_ABILITIES[state.characterClass]||[]; }
  function enemyDefinition(id){ return Core.encounterById(id); }
  function rankedHeroImage(){
    try{return battleClassStyle()?.image||RANKED_HERO_ART[state.characterClass]||RANKED_HERO_ART.warrior;}
    catch{return RANKED_HERO_ART[state.characterClass]||RANKED_HERO_ART.warrior;}
  }

  function rankedState(){
    if(state.rankedExtraction!==normalizedSource){
      state.rankedExtraction=Core.normalize(state.rankedExtraction);
      normalizedSource=state.rankedExtraction;
    }
    return state.rankedExtraction;
  }
  function publicApiReady(){
    return typeof SUPABASE_URL==='string' && typeof supabaseHeaders==='function' && typeof ensureRegisteredAccount==='function';
  }
  function publicIdentity(){
    const classKey=['warrior','archer','mage','priest','assassin','tamer'].includes(state.characterClass)?state.characterClass:'warrior';
    return {characterId:String(state.id||state.characterId||'hero-local').slice(0,90),displayName:String(state.name||'Aventurero').trim().slice(0,20),classKey};
  }
  async function startPublicRankedRun(run){
    run.publicEligible=false;
    if(!publicApiReady() || (typeof developerMode!=='undefined'&&developerMode) || !navigator.onLine) return false;
    try{
      const session=await ensureRegisteredAccount();
      if(!session?.access_token) return false;
      const identity=publicIdentity();
      const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/start_ranked_run`,{
        method:'POST',headers:supabaseHeaders(session.access_token),
        body:JSON.stringify({p_character_id:identity.characterId,p_display_name:identity.displayName,p_class_key:identity.classKey})
      });
      if(!response.ok) throw new Error(`inicio público ${response.status}`);
      const receipt=await response.json();
      if(!/^[0-9a-f-]{36}$/i.test(String(receipt?.run_id||''))) throw new Error('recibo público inválido');
      run.publicRunId=receipt.run_id;
      run.publicStartedAt=Date.parse(receipt.started_at)||Date.now();
      run.publicEligible=true;
      saveState();
      return true;
    }catch(error){
      console.warn('La incursión continuará solamente en la clasificación local.',error);
      return false;
    }
  }
  function updateLocalFromPublicResult(data,lastRun,accepted){
    const rating=Math.max(0,Number(accepted.rating_after)||0);
    const delta=Math.max(-36,Math.min(150,Number(accepted.rank_delta)||0));
    data.competition.rating=rating;
    data.competition.peakRating=Math.max(data.competition.peakRating,rating);
    const history=data.competition.history.find(entry=>entry.id===lastRun.id)||data.competition.history.at(-1);
    if(history){history.rankDelta=delta;history.ratingAfter=rating;history.division=accepted.division||history.division;}
    lastRun.rankDelta=delta;
    lastRun.ratingAfter=rating;
    lastRun.division=accepted.division||lastRun.division;
    lastRun.publicStatus='accepted';
    lastRun.publicRankDelta=delta;
    lastRun.publicRatingAfter=rating;
  }
  async function submitPublicRankedResult(run,lastRun){
    try{
      if(publicRunStartPromise) await publicRunStartPromise;
      if(!run.publicEligible || !run.publicRunId || !publicApiReady()){
        lastRun.publicStatus='local';
        return false;
      }
      const session=await ensureRegisteredAccount();
      if(!session?.access_token) throw new Error('sesión no disponible');
      const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/submit_ranked_run`,{
        method:'POST',headers:supabaseHeaders(session.access_token),
        body:JSON.stringify({p_run_id:run.publicRunId,p_result:lastRun.result,p_sector:lastRun.sector,p_mobs_defeated:lastRun.mobsDefeated,p_loot_value:lastRun.lootValue})
      });
      if(!response.ok) throw new Error(`resultado público ${response.status}`);
      const accepted=await response.json();
      if(accepted?.accepted!==true) throw new Error('resultado público rechazado');
      const data=rankedState();
      updateLocalFromPublicResult(data,lastRun,accepted);
      notice='Resultado verificado por Supabase y publicado en la clasificación global.';
      publicLeaderboardStatus='idle';
      await saveState();
      if(resultVisible||sanctuaryView==='rank') render();
      return true;
    }catch(error){
      lastRun.publicStatus='rejected';
      publicLeaderboardError='El resultado quedó solamente en tu historial local.';
      console.warn('Supabase no aceptó el resultado Ranked.',error);
      saveState();
      if(resultVisible||sanctuaryView==='rank') render();
      return false;
    }finally{
      publicRunStartPromise=null;
    }
  }
  async function loadPublicRankedLeaderboard(force=false){
    if(publicLeaderboardStatus==='loading'||(publicLeaderboardStatus==='ready'&&!force)) return;
    publicLeaderboardStatus='loading';publicLeaderboardError='';
    if(sanctuaryView==='rank') render();
    try{
      if(!publicApiReady()) throw new Error('API pública no disponible');
      const session=await ensureRegisteredAccount().catch(()=>null);
      const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_ranked_leaderboard`,{
        method:'POST',headers:supabaseHeaders(session?.access_token),body:JSON.stringify({p_limit:50}),cache:'no-store'
      });
      if(!response.ok) throw new Error(`clasificación pública ${response.status}`);
      const rows=await response.json();
      publicLeaderboard=Array.isArray(rows)?rows:[];
      publicLeaderboardStatus='ready';
    }catch(error){
      publicLeaderboard=[];publicLeaderboardStatus='error';
      publicLeaderboardError='Ejecutá supabase-ranked-publico.sql o revisá la conexión para activar el ranking público.';
      console.warn('No se pudo cargar el ranking público.',error);
    }
    if(sanctuaryView==='rank') render();
  }
  function rankedSound(method,...args){
    try{ window.Sound?.[method]?.(...args); }catch(error){ console.warn('No se pudo reproducir el efecto Ranked.',error); }
  }
  function queueCombatFeedback(type,details={}){
    combatFeedback={type,...details,id:Date.now()};
    interactionLocked=true;
    clearTimeout(feedbackTimer);
    feedbackTimer=setTimeout(()=>{
      combatFeedback=null;
      interactionLocked=false;
      app.querySelector('.ranked-battlefield')?.classList.remove('is-feedback-active',`fx-${type}`);
      app.querySelectorAll('.ranked-float-number,.ranked-impact-label,.ranked-impact-ring').forEach(element=>element.remove());
    },state.settings?.reducedMotion?420:900);
  }
  function rankedDamageNumber(value){
    const amount=Math.max(0,Math.round(Math.abs(Number(value)||0)));
    if(amount<1000) return String(amount);
    const suffixes=['','K','M','B','T'];
    const tier=Math.min(suffixes.length-1,Math.floor(Math.log10(amount)/3));
    const scaled=amount/Math.pow(1000,tier);
    const digits=scaled>=100?0:scaled>=10?1:2;
    const compact=digits?scaled.toFixed(digits).replace(/\.?0+$/,''):scaled.toFixed(0);
    return `${compact}${suffixes[tier]}`;
  }
  function feedbackMarkup(target){
    const fx=combatFeedback;
    if(!fx) return '';
    if(target==='enemy' && fx.enemyDamage) return `<span class="ranked-float-number is-enemy class-${state.characterClass}" title="${Math.round(fx.enemyDamage).toLocaleString('es-AR')} de daño">−${rankedDamageNumber(fx.enemyDamage)}</span><span class="ranked-impact-ring class-${state.characterClass}" aria-hidden="true"></span><i class="ranked-class-impact class-${state.characterClass}" aria-hidden="true"><i></i><i></i><i></i></i>${fx.statusLabel?`<span class="ranked-status-proc is-enemy">${fx.statusLabel}</span>`:''}`;
    if(target==='player') return `${fx.playerDamage?`<span class="ranked-float-number is-player" title="${Math.round(fx.playerDamage).toLocaleString('es-AR')} de daño recibido">−${rankedDamageNumber(fx.playerDamage)}</span>`:''}${fx.heal?`<span class="ranked-float-number is-heal" title="${Math.round(fx.heal).toLocaleString('es-AR')} de curación">+${rankedDamageNumber(fx.heal)}</span>`:''}${fx.playerStatusLabel?`<span class="ranked-status-proc is-player">${fx.playerStatusLabel}</span>`:''}${fx.blocked?'<i class="ranked-block-confirm" aria-hidden="true">◆</i>':''}`;
    return '';
  }
  function commit(message){
    rankedState().updatedAt=Date.now();
    notice=message;
    saveState();
    render(!rankedState().activeRun&&!resultVisible);
  }
  function locate(uid){
    const data=rankedState();
    const backpackIndex=data.backpack.findIndex(item=>item.uid===uid);
    if(backpackIndex>=0) return {container:'backpack',index:backpackIndex,item:data.backpack[backpackIndex]};
    const stashIndex=data.stash.findIndex(item=>item.uid===uid);
    if(stashIndex>=0) return {container:'stash',index:stashIndex,item:data.stash[stashIndex]};
    const secureIndex=data.secure.findIndex(item=>item?.uid===uid);
    if(secureIndex>=0) return {container:'secure',index:secureIndex,item:data.secure[secureIndex]};
    const loadoutSlot=Core.EQUIPMENT_SLOTS.find(slot=>data.loadout?.[slot]?.uid===uid);
    if(loadoutSlot) return {container:'loadout',slot:loadoutSlot,item:data.loadout[loadoutSlot]};
    return null;
  }
  function removeLocated(found){
    const data=rankedState();
    if(found.container==='secure') data.secure[found.index]=null;
    else if(found.container==='loadout') data.loadout[found.slot]=null;
    else data[found.container].splice(found.index,1);
  }
  function selected(){ return locate(selectedUid); }
  function tierLabel(tier){ return {comun:'COMÚN',comun_plus:'COMÚN+',poco_comun:'POCO COMÚN',raro:'RARO',epico:'ÉPICO',legendario:'LEGENDARIO',jefe:'LEGENDARIO'}[tier] || tier; }
  function itemVisualMarkup(spec,className='ranked-item-icon'){
    if(spec.artImage) return `<img class="${className} ranked-item-art-image" src="${spec.artImage}" alt="" aria-hidden="true" loading="lazy" decoding="async">`;
    if(spec.rankedArt) return `<span class="${className} ranked-atlas-art art-${spec.rankedArt}" aria-hidden="true"></span>`;
    return spec.art?`<span class="${className} ranked-generated-art art-${spec.art}" aria-hidden="true"></span>`:`<span class="${className}">${spec.icon}</span>`;
  }
  function sanctuaryTabsMarkup(active){
    return `<nav class="ranked-sanctuary-tabs" aria-label="Secciones del santuario Ranked"><button type="button" class="${active==='inventory'?'is-active':''}" data-action="view-inventory"><span>▦</span> MOCHILA Y ALIJO</button><button type="button" class="${active==='workshop'?'is-active':''}" data-action="view-workshop"><span>⚒</span> TALLER DE EXTRACCIÓN</button><button type="button" class="${active==='rank'?'is-active':''}" data-action="view-rank"><span>◈</span> CLASIFICACIÓN</button></nav>`;
  }
  function tutorialMarkup(){
    if(tutorialStep<0) return '';
    const step=RANKED_TUTORIAL[tutorialStep]||RANKED_TUTORIAL[0];
    const last=tutorialStep===RANKED_TUTORIAL.length-1;
    return `<div class="ranked-tutorial-backdrop" role="presentation"><section class="ranked-tutorial" role="dialog" aria-modal="true" aria-labelledby="rankedTutorialTitle"><button type="button" class="ranked-tutorial-skip" data-action="tutorial-close">OMITIR GUÍA</button><div class="ranked-tutorial-dots">${RANKED_TUTORIAL.map((_,index)=>`<i class="${index===tutorialStep?'is-active':index<tutorialStep?'is-done':''}"></i>`).join('')}</div><small>${step.eyebrow}</small><span class="ranked-tutorial-icon">${step.icon}</span><h2 id="rankedTutorialTitle">${step.title}</h2><p>${step.body}</p><div class="ranked-tutorial-points">${step.points.map(point=>`<b>✓ ${point}</b>`).join('')}</div><button type="button" class="ranked-tutorial-next" data-action="${last?'tutorial-close':'tutorial-next'}">${last?'ENTENDIDO · EMPEZAR':'SIGUIENTE →'}</button></section></div>`;
  }
  function mountTutorial(){ if(tutorialStep>=0) app.insertAdjacentHTML('beforeend',tutorialMarkup()); }
  function itemMarkup(item,context='stash'){
    const spec=Core.template(item.templateId);
    const size=Core.dimensions(item);
    const style=context==='backpack'
      ? `--x:${item.x};--y:${item.y};--w:${size.w};--h:${size.h};--tier:${spec.tier}`
      : `--tier:${spec.tier}`;
    return `<button class="ranked-item ranked-item--${context} ${selectedUid===item.uid?'is-selected':''}" type="button" draggable="true" data-uid="${item.uid}" style="${style}" aria-label="${spec.name}, cantidad ${item.qty}">
      ${itemVisualMarkup(spec)}<span class="ranked-item-name">${spec.name}</span>${item.qty>1?`<b class="ranked-item-qty">×${item.qty}</b>`:''}
    </button>`;
  }
  function gridMarkup(data){
    const cells=[];
    for(let y=0;y<Core.HEIGHT;y++) for(let x=0;x<Core.WIDTH;x++) cells.push(`<button type="button" class="ranked-cell" data-x="${x}" data-y="${y}" aria-label="Casilla ${x+1}, ${y+1}"></button>`);
    return `<div class="ranked-grid" aria-label="Mochila de 4 por 4 casillas"><div class="ranked-cells">${cells.join('')}</div><div class="ranked-grid-items">${data.backpack.map(item=>itemMarkup(item,'backpack')).join('')}</div></div>`;
  }
  function equipmentLabel(slot){ return {weapon:'ARMA',armor:'ARMADURA',relic:'RELIQUIA'}[slot]||slot; }
  function comparisonMarkup(found,spec){
    const slot=Core.equipmentSlot(found.item);
    if(!slot) return '';
    const current=rankedState().loadout?.[slot];
    const currentSpec=current?Core.template(current.templateId):null;
    const rows=[['DAÑO','attackBonus'],['VIDA','hpBonus'],['COBERTURA','guardBonus']].filter(([,key])=>(Number(spec[key])||0)||(Number(currentSpec?.[key])||0));
    return `<div class="ranked-comparison"><small>COMPARACIÓN · ${equipmentLabel(slot)}</small><div class="ranked-comparison-current"><span>EQUIPADO</span><b>${currentSpec?.name||'Ranura vacía'}</b></div>${rows.map(([label,key])=>{const next=Number(spec[key])||0;const previous=Number(currentSpec?.[key])||0;const delta=next-previous;return `<div><span>${label}</span><b>${next}${key==='guardBonus'?'%':''}</b><em class="${delta>0?'is-positive':delta<0?'is-negative':''}">${delta===0?'—':`${delta>0?'+':''}${delta}${key==='guardBonus'?'%':''}`}</em></div>`;}).join('')}</div>`;
  }
  function detailMarkup(found){
    if(!found) return `<div class="ranked-empty-detail"><span>◇</span><h3>Ningún objeto seleccionado</h3><p>Tocá un objeto para ver su tamaño, origen y acciones.</p></div>`;
    const spec=Core.template(found.item.templateId);
    const size=Core.dimensions(found.item);
    return `<div class="ranked-detail-card tier-${spec.tier}">
      <div class="ranked-detail-icon">${itemVisualMarkup(spec,'ranked-detail-visual')}</div><small>${tierLabel(spec.tier)} · ${spec.kind.toUpperCase()}</small><h3>${spec.name}</h3>
      <p>Recuperado de <b>${spec.source}</b>. Ocupa ${size.w}×${size.h} ${size.w*size.h===1?'casilla':'casillas'} y vale ${spec.value*found.item.qty} marcas de extracción.</p>${craftedStatsMarkup(spec)}${comparisonMarkup(found,spec)}
      <div class="ranked-actions">
        ${found.container==='backpack'?'<button type="button" data-action="rotate">Girar 90°</button><button type="button" data-action="to-stash">Enviar al alijo</button>':''}
        ${found.container==='stash'?'<button type="button" data-action="to-backpack">Guardar en mochila</button>':''}
        ${found.container==='secure'?'<button type="button" data-action="to-stash">Sacar del seguro</button>':''}${found.container==='loadout'?'<button type="button" data-action="to-stash">Desequipar al alijo</button>':''}
        ${Core.equipmentSlot(found.item)&&found.container!=='loadout'?`<button type="button" class="equip-action" data-action="equip">Equipar como ${equipmentLabel(Core.equipmentSlot(found.item)).toLowerCase()}</button>`:''}
        ${spec.secure && found.container!=='secure'?'<button type="button" class="secure-action" data-action="to-secure">Proteger objeto</button>':''}
      </div>
    </div>`;
  }
  function routeMarkup(run){
    const territory=SECTOR_META[Math.max(0,Math.min(SECTOR_META.length-1,Number(run.territory)||0))];
    return `<div class="ranked-route" aria-label="Ruta de cinco sectores de ${territory.shortName}">${Array.from({length:5},(_,index)=>`<div class="ranked-route-node ${index<run.sector?'is-cleared':index===run.sector?'is-current':''}" title="${territory.shortName} · sector ${index+1}"><span>${index<run.sector?'✓':index===run.sector?(run.enemy?.icon||territory.icon):territory.icon}</span><small>0${index+1}</small></div>`).join('<i></i>')}</div>`;
  }
  const STATUS_META={bleed:{label:'SANGRADO',icon:'⌁'},poison:{label:'VENENO',icon:'✦'},stun:{label:'ATURDIDO',icon:'◈'},regen:{label:'REGENERACIÓN',icon:'✚'}};
  function statusMarkup(statuses){
    const active=Object.entries(STATUS_META).filter(([key])=>(Number(statuses?.[key])||0)>0);
    return active.length?`<div class="ranked-status-row">${active.map(([key,meta])=>`<span class="status-${key}"><i>${meta.icon}</i>${meta.label}<b>${statuses[key]}</b></span>`).join('')}</div>`:'';
  }
  function runLoadoutMarkup(data){
    const equipped=Core.EQUIPMENT_SLOTS.map(slot=>({slot,item:data.loadout?.[slot]})).filter(entry=>entry.item);
    if(!equipped.length) return '';
    return `<div class="ranked-run-loadout">${equipped.map(({slot,item})=>{const spec=Core.template(item.templateId);return `<div title="${spec.name}">${itemVisualMarkup(spec,'ranked-run-gear-visual')}<span><small>${equipmentLabel(slot)}</small><b>${spec.name}</b></span></div>`;}).join('')}</div>`;
  }
  function intentMarkup(enemy,run){
    const intent=enemy?.intent;
    if(!intent) return '';
    const attacks=['attack','heavy','poison','bleed','stun'].includes(intent.type);
    const min=attacks?Math.max(1,Math.floor(enemy.atk*intent.power)):0;
    const max=attacks?min+4:0;
    const category={attack:'ATAQUE',heavy:'ATAQUE FUERTE',poison:'ATAQUE + VENENO',bleed:'ATAQUE + SANGRADO',stun:'ATAQUE + CONTROL',guard:'DEFENSA',regen:'CURACIÓN'}[intent.type]||'ACCIÓN';
    const result=attacks?`${min}–${max} DAÑO`:intent.type==='guard'?'REDUCE TU PRÓXIMO GOLPE':`RECUPERA ${10+(run?.sector||0)*2} VIDA`;
    const effect={attack:'Sin efectos adicionales.',heavy:'Daño muy alto: no conviene recibirlo sin cobertura.',poison:'Si impacta, aplica Veneno durante varios turnos.',bleed:'Si impacta, aplica Sangrado durante varios turnos.',stun:'Si impacta, puede hacerte perder la próxima acción.',guard:'El enemigo quedará protegido después de actuar.',regen:'Además obtiene Regeneración para el próximo turno.'}[intent.type]||'';
    const response={attack:'Atacá o cubrite según tu vida.',heavy:'CUBRIRSE reduce fuertemente este golpe.',poison:'CUBRIRSE evita gran parte del daño; la resistencia acorta el Veneno.',bleed:'CUBRIRSE reduce el impacto antes del Sangrado.',stun:'Priorizá daño o CUBRIRSE antes de perder una acción.',guard:'Usá una habilidad perforante o prepará tu siguiente turno.',regen:'Atacá ahora para limitar la curación.'}[intent.type]||'Elegí tu respuesta.';
    return `<section class="ranked-intent intent-${intent.type}" aria-label="Próxima acción enemiga: ${intent.label}"><div class="ranked-intent-head"><small>EN SU PRÓXIMO TURNO</small><span>${category}</span></div><div class="ranked-intent-main"><i>${intent.icon}</i><div><b>${intent.label}</b><strong>${result}</strong></div></div><p>${effect}</p><em><span>RESPUESTA</span>${response}</em></section>`;
  }
  function activeEnemyPattern(enemy){
    const definition=enemyDefinition(enemy?.id);
    const phaseTwo=definition?.phasePattern&&enemy.hp<=enemy.maxHp*.5;
    return phaseTwo?definition.phasePattern:(definition?.pattern||['attack','heavy']);
  }
  function enemyTraitMarkup(enemy){
    const definition=enemyDefinition(enemy?.id);
    if(!definition) return '';
    const phaseTwo=Boolean(definition.phasePattern&&enemy.hp<=enemy.maxHp*.5);
    const pattern=activeEnemyPattern(enemy);
    return `<div class="ranked-enemy-profile ${phaseTwo?'is-phase-two':''}"><div><small>${definition.role}</small><b>${definition.trait.name}</b>${definition.phasePattern?`<em class="ranked-phase-badge">FASE ${phaseTwo?'II':'I'}</em>`:''}</div><p>${definition.trait.description}</p><div class="ranked-pattern-preview" aria-label="Patrón de acciones">${pattern.map((type,index)=>{const intent=INTENT_DATA[type];return `<span class="intent-${type} ${index===(enemy.turnPatternIndex||0)?'is-next':''}" title="${intent.label}">${intent.icon}</span>`;}).join('')}</div></div>`;
  }
  function levelSkillsMarkup(run){
    const cooldowns=run.levelSkillCooldowns||{};
    const abilities=rankedLevelAbilities().filter(ability=>state.level>=ability.level);
    if(!abilities.length) return '';
    return `<section class="ranked-level-skills"><div><small>TÉCNICAS DESBLOQUEADAS</small><b>Dominio de clase</b></div><div>${abilities.map(ability=>{const cooldown=Math.max(0,Number(cooldowns[ability.key])||0);const ready=cooldown===0;const status=cooldown?`RECARGA ${cooldown}`:'LISTA';return `<button type="button" class="class-${state.characterClass} is-unlocked ${ready?'is-ready':''}" data-level-skill="${ability.key}" ${ready?'':'disabled'} title="${ability.hint}"><span>${ability.icon}</span><b>${ability.label}</b><small>${status}</small></button>`;}).join('')}</div></section>`;
  }
  function runLogMarkup(run){
    return `<div class="ranked-combat-log">${run.log.slice().reverse().map(entry=>`<p>${entry}</p>`).join('') || '<p>La incursión acaba de comenzar.</p>'}</div>`;
  }
  function lootMarkup(run){
    if(!run.pendingLoot.length) return `<div class="ranked-loot-empty"><span>✓</span><b>BOTÍN ASEGURADO EN LA MOCHILA</b><small>Elegí si avanzás o te extraés.</small></div>`;
    return `<div class="ranked-field-loot">${run.pendingLoot.map((item,index)=>{const spec=Core.template(item.templateId);const size=Core.dimensions(item);return `<article class="ranked-drop tier-${spec.tier}">${itemVisualMarkup(spec,'ranked-drop-visual')}<div><small>${tierLabel(spec.tier)} · ${size.w}×${size.h}</small><b>${spec.name}</b><em>×${item.qty} · ${spec.value*item.qty} valor</em></div><button type="button" data-loot-action="collect" data-loot-index="${index}">RECOGER</button><button type="button" class="discard" data-loot-action="discard" data-loot-index="${index}">DEJAR</button></article>`;}).join('')}</div>`;
  }
  function renderExpedition(data){
    const run=data.activeRun;
    const enemy=run.enemy;
    if(run.phase==='encounter'&&enemy&&!enemy.intent) enemy.intent=chooseEnemyIntent(enemy,run.turn||0);
    const enemyDef=enemyDefinition(enemy?.id);
    const playerPct=Math.max(0,Math.min(100,run.hp/run.maxHp*100));
    const enemyPct=enemy?Math.max(0,Math.min(100,enemy.hp/enemy.maxHp*100)):0;
    const potion=data.backpack.find(item=>item.templateId==='field_potion');
    const occupied=data.backpack.reduce((sum,item)=>{const size=Core.dimensions(item);return sum+size.w*size.h;},0);
    const extractionPreview=Core.calculateRankResult({result:'extracted',sector:run.sector+1,mobsDefeated:run.mobsDefeated,lootValue:run.lootValue});
    const defeatPreview=Core.calculateRankResult({result:'defeated',sector:run.sector+1,mobsDefeated:run.mobsDefeated,lootValue:run.lootValue});
    const possibleLoss=Math.min(data.competition.rating,Math.abs(Math.min(0,defeatPreview.rankDelta)));
    const fieldValue=Core.totalValue({backpack:data.backpack,secure:[],stash:[]});
    const classKit=rankedClassKit();
    const classSkillDetail=classKit ? (run.classSkillCooldown>0?`RECARGA ${run.classSkillCooldown}`:state.characterClass==='mage'?`NOVA · ${run.arcaneCharges||0}/3 CARGAS`:classKit.hint) : '';
    const sectorMeta=SECTOR_META[Math.max(0,Math.min(SECTOR_META.length-1,Number(run.territory)||0))];
    const sceneName=sectorMeta.name.toUpperCase();
    const sceneHint=sectorMeta.hint;
    app.innerHTML=`<div class="ranked-shell ranked-shell--expedition">
      <header class="ranked-header ranked-run-header"><div class="ranked-run-tools"><button type="button" class="ranked-back" data-action="back">← SANTUARIO</button><button type="button" class="ranked-run-recover" data-action="run-recover" title="Recarga la incursión guardada sin extraerte ni modificar tu progreso">↻ RECUPERAR</button></div><div><small>INCURSIÓN ${run.id.slice(-6).toUpperCase()} · SECTOR ${run.sector+1}/5</small><h1>${sceneName}</h1><p>${sceneHint}</p></div><div class="ranked-header-value"><small>BOTÍN EN CAMPO</small><b>${run.lootValue}</b></div></header>
      <main class="ranked-expedition ranked-expedition--focused">
        ${routeMarkup(run)}
        <section class="ranked-battlefield ranked-battlefield--focused sector-${sectorMeta.theme} phase-${run.phase} ${combatFeedback?`is-feedback-active fx-${combatFeedback.type}`:''}">
          <div class="ranked-fighter ranked-player-card">${feedbackMarkup('player')}<small>TU AVENTURERO</small><h2>${state.name||'Aventurero'}</h2><div class="ranked-hp"><i style="width:${playerPct}%"></i></div><b>${run.hp} / ${run.maxHp} VIDA</b>${statusMarkup(run.statuses)}${runLoadoutMarkup(data)}<div class="ranked-player-portrait"><img src="${rankedHeroImage()}" alt="${CLASSES[state.characterClass]?.label||'Aventurero'}" decoding="async"></div></div>
          <div class="ranked-encounter-center">
            ${combatFeedback?.label?`<span class="ranked-impact-label">${combatFeedback.label}</span>`:''}${feedbackMarkup('enemy')}
            ${run.phase==='encounter'?`<small class="ranked-threat">${enemyDef?.phasePattern?'GUARDIÁN DE EXTRACCIÓN':'AMENAZA DEL SECTOR'} · ${enemyDef?.role||'CRIATURA'}</small><em class="ranked-enemy-rarity tier-${enemy.tier}">${tierLabel(enemy.tier)}</em>${intentMarkup(enemy,run)}<div class="ranked-enemy-portrait tier-${enemy.tier}"><img src="${enemy.image}" alt="${enemy.name}" decoding="async"></div><h2>${enemy.name}</h2><div class="ranked-hp enemy"><i style="width:${enemyPct}%"></i></div><b>${enemy.hp} / ${enemy.maxHp} VIDA</b>${statusMarkup(enemy.statuses)}${enemyTraitMarkup(enemy)}<div class="ranked-combat-actions"><button type="button" data-action="run-attack">${classKit?.attack||'ATACAR'}</button><button type="button" data-action="run-defend">CUBRIRSE</button>${classKit?`<button type="button" class="ranked-class-skill" data-action="run-class-skill" ${run.classSkillCooldown>0?'disabled':''}>${classKit.icon} ${classKit.skill}<small>${classSkillDetail}</small></button>`:''}<button type="button" data-action="run-potion" ${potion?'':'disabled'}>POCIÓN ${potion?`×${potion.qty}`:'—'}</button></div>${levelSkillsMarkup(run)}`:`<small class="ranked-threat">SECTOR DESPEJADO</small><div class="ranked-victory-sigil"><span>✦</span></div><h2>BOTÍN RECUPERADO</h2>${lootMarkup(run)}<div class="ranked-run-decisions">${run.pendingLoot.length?'':run.sector===4?`<button type="button" class="risk" data-action="run-extract">COMPLETAR · +${extractionPreview.rankDelta} PR</button>`:`<button type="button" data-action="run-extract">EXTRAER AHORA · +${extractionPreview.rankDelta} PR</button><button type="button" class="risk" data-action="run-advance">ARRIESGAR Y AVANZAR</button>`}</div>`}
          </div>
        </section>
        <section class="ranked-run-overview">
          <div><small>MOCHILA</small><b>${occupied}/16</b><span>${fieldValue} de valor</span></div>
          <div><small>${run.phase==='encounter'?'SI GANÁS ESTE COMBATE':'RESULTADO SI EXTRAÉS AHORA'}</small><b class="is-positive">+${extractionPreview.rankDelta} PR</b><span>${run.phase==='encounter'?'La extracción se habilita al derrotar al enemigo':`+${extractionPreview.seasonXpEarned} XP · ${possibleLoss?`riesgo −${possibleLoss} PR`:'Tu rango no puede bajar de 0 PR'}`}</span></div>
        </section>
        ${run.phase==='loot'?`<section class="ranked-run-lower ranked-run-lower--loot"><div class="ranked-field-pack"><div class="ranked-panel-title"><div><small>ORGANIZAR BOTÍN</small><h2>MOCHILA ${occupied}/16</h2></div><b>${fieldValue} VALOR</b></div>${gridMarkup(data)}<small class="ranked-field-pack-note">Las piezas necesitan espacio real antes de avanzar.</small></div><div class="ranked-run-journal"><small>REGISTRO DE INCURSIÓN</small><h2>ÚLTIMOS EVENTOS</h2>${runLogMarkup(run)}</div></section>`:''}
      </main>${recoveryMessage?`<div class="ranked-recovery-toast" role="status">✓ ${recoveryMessage}</div>`:''}<div class="ranked-sr-live" aria-live="assertive">${combatFeedback?.announcement||recoveryMessage}</div>
    </div>`;
  }
  function reportItemsMarkup(entries,emptyText){
    if(!entries?.length) return `<span class="ranked-report-empty">${emptyText}</span>`;
    return entries.map(entry=>{const templateId=typeof entry==='string'?entry:entry.templateId;const qty=typeof entry==='string'?1:entry.qty;const spec=Core.template(templateId);return `<div class="ranked-report-item">${itemVisualMarkup(spec,'ranked-report-visual')}<span>${spec.name}</span>${qty>1?`<b>×${qty}</b>`:''}</div>`;}).join('');
  }
  function publicStatusMarkup(result){
    const status=result?.publicStatus||'local';
    if(status==='accepted') return '<div class="ranked-public-verdict is-accepted"><span>✓</span><div><b>RESULTADO VERIFICADO</b><p>Supabase recalculó los PR y publicó esta incursión.</p></div></div>';
    if(status==='pending') return '<div class="ranked-public-verdict is-pending"><span>◌</span><div><b>VERIFICANDO RESULTADO</b><p>El servidor está validando el recibo de esta incursión.</p></div></div>';
    if(status==='rejected') return '<div class="ranked-public-verdict is-rejected"><span>◇</span><div><b>SOLO HISTORIAL LOCAL</b><p>Supabase no aceptó o no pudo verificar este resultado.</p></div></div>';
    return '<div class="ranked-public-verdict"><span>⌁</span><div><b>PARTIDA LOCAL</b><p>Iniciá sesión y jugá online para participar del ranking público.</p></div></div>';
  }
  function renderResult(data){
    const result=data.lastRun;
    const extracted=result?.result==='extracted';
    const division=Core.DIVISIONS.find(entry=>entry.id===result?.division)||Core.DIVISIONS[0];
    const delta=Number(result?.rankDelta)||0;
    const progress=Core.rankProgress(result?.ratingAfter||0);
    const availableMissions=Core.MISSION_DEFS.map(mission=>Core.missionProgress(data,mission.id)).filter(mission=>mission.complete&&!mission.claimed);
    const availableRewards=Core.REWARD_TRACK.filter(reward=>data.competition.seasonXp>=reward.xp&&!data.competition.claimedRewards.includes(reward.level));
    const unlockedTerritory=extracted&&result?.sector===5&&Number(result?.territory)<data.stats.unlockedTerritory?SECTOR_META[data.stats.unlockedTerritory]?.name:'';
    const unlockMessages=[unlockedTerritory?`Nueva ruta desbloqueada: ${unlockedTerritory}`:'',availableMissions.length?`${availableMissions.length} misión${availableMissions.length===1?'':'es'} lista${availableMissions.length===1?'':'s'} para reclamar`:'',availableRewards.length?`${availableRewards.length} recompensa${availableRewards.length===1?'':'s'} disponible${availableRewards.length===1?'':'s'}`:''].filter(Boolean);
    app.innerHTML=`<div class="ranked-shell ranked-shell--result"><div class="ranked-result-card ${extracted?'is-success':'is-defeat'}"><small>CACERÍA RANKED · INFORME DE INCURSIÓN</small><div class="ranked-result-sigil">${extracted?'✦':'◇'}</div><h1>${extracted?'EXTRACCIÓN COMPLETADA':'AVENTURERO CAÍDO'}</h1><p>${extracted?'Todo lo recuperado y el equipamiento activo permanecen con vos. Organizalos antes de volver a entrar.':'La mochila y las tres ranuras de equipamiento en riesgo se perdieron. Los dos sellos seguros y el alijo permanecen intactos.'}</p>${publicStatusMarkup(result)}<div class="ranked-result-stats"><div><small>SECTOR</small><b>${result?.sector||0}/5</b></div><div><small>ABATIDOS</small><b>${result?.mobsDefeated||0}</b></div><div><small>VALOR EXTRAÍDO</small><b>${extracted?result?.lootValue||0:0}</b></div><div class="ranked-result-rating"><small>RANGO COMPETITIVO</small><b class="${delta>=0?'is-positive':'is-negative'}">${delta>=0?'+':''}${delta} PR</b><em>${division.name} · ahora tenés ${result?.ratingAfter||0} PR</em></div></div><section class="ranked-result-progression" style="--division:${progress.current.color}"><div><small>PROGRESO DE ESTA PARTIDA</small><h2>${progress.current.name} · ${progress.rating} PR</h2><div class="ranked-result-progress-bar"><i style="width:${Math.round(progress.progress*100)}%"></i></div><p>${progress.next?`${progress.next.floor-progress.rating} PR para llegar a ${progress.next.name}.`:'Alcanzaste la división máxima.'}</p></div><aside><small>PASE DE TEMPORADA</small><b>+${result?.seasonXpEarned||0} XP</b><span>Total acumulado: ${data.competition.seasonXp} XP</span></aside>${unlockMessages.length?`<strong>✦ ${unlockMessages.join(' · ')}</strong>`:'<strong>Seguí avanzando para desbloquear nuevas recompensas.</strong>'}</section><div class="ranked-result-report"><section><small>BOTÍN RECUPERADO</small>${reportItemsMarkup(extracted?result?.loot:[],'No se extrajeron materiales.')}</section><section><small>EQUIPO QUE SOBREVIVIÓ</small>${reportItemsMarkup(extracted?result?.survived:[],'El equipo de riesgo se perdió.')}</section><section><small>SELLOS PROTEGIDOS</small>${reportItemsMarkup(result?.protected||[],'Los sellos estaban vacíos.')}</section></div><div class="ranked-result-actions"><button type="button" data-action="result-rank">VER PROGRESIÓN Y RECOMPENSAS</button><button type="button" data-action="result-inventory">VOLVER AL INVENTARIO</button></div></div></div>`;
  }
  function craftedStatsMarkup(spec){
    const stats=[];
    if(spec.attackBonus) stats.push(`+${spec.attackBonus} DAÑO`);
    if(spec.hpBonus) stats.push(`+${spec.hpBonus} VIDA`);
    if(spec.guardBonus) stats.push(`+${spec.guardBonus}% COBERTURA`);
    if(spec.heal) stats.push(`+${spec.heal} CURACIÓN`);
    if(spec.thorns) stats.push(`${spec.thorns} REPRESALIA`);
    if(spec.enemyGuardPierce) stats.push(`${Math.round(spec.enemyGuardPierce*100)}% VS GUARDIA`);
    if(spec.statusResist) stats.push(`−${spec.statusResist} TURNO DE ESTADOS`);
    if(spec.openingGuard) stats.push('COBERTURA INICIAL');
    if(spec.executeBonus) stats.push(`+${Math.round(spec.executeBonus*100)}% EJECUCIÓN`);
    return stats.length?`<div class="ranked-crafted-stats">${stats.map(stat=>`<span>${stat}</span>`).join('')}</div>`:'';
  }
  function craftReason(check){
    if(check.reason==='locked') return 'RECETA BLOQUEADA';
    if(check.reason==='stash_full') return 'EL ALIJO NO TIENE ESPACIO';
    if(check.reason==='missing_materials') return 'FALTAN MATERIALES';
    return 'LISTO PARA FORJAR';
  }
  function recipeMarkup(data,recipeId,recipe){
    const quantity=Math.max(1,Math.min(10,craftQuantities[recipeId]||1));
    const check=Core.canCraft(data,recipeId,quantity);
    const spec=Core.template(recipe.output);
    const size=Core.dimensions(Core.makeItem(recipe.output));
    const unlocked=data.stats.bestSector>=recipe.unlockSector;
    return `<article class="ranked-recipe-card tier-${spec.tier} ${unlocked?'':'is-locked'}">
      <div class="ranked-recipe-output"><div class="ranked-recipe-icon">${itemVisualMarkup(spec,'ranked-recipe-visual')}</div><div><small>${tierLabel(spec.tier)} · ${size.w}×${size.h}</small><h3>${recipe.name}</h3><p>${recipe.description}</p>${craftedStatsMarkup(spec)}</div></div>
      <div class="ranked-recipe-materials"><small>MATERIALES DEL ALIJO</small>${Object.entries(recipe.inputs).map(([templateId,needed])=>{const material=Core.template(templateId);const owned=Core.countInStash(data,templateId);const total=needed*quantity;return `<div class="${owned<total?'is-missing':''}"><span>${itemVisualMarkup(material,'ranked-material-visual')}${material.name}</span><b>${owned} / ${total}</b></div>`;}).join('')}</div>
      <div class="ranked-craft-controls"><div class="ranked-craft-quantity"><button type="button" data-craft-qty="-1" data-recipe-id="${recipeId}" ${quantity<=1?'disabled':''}>−</button><span><small>FABRICAR</small><b>×${quantity}</b></span><button type="button" data-craft-qty="1" data-recipe-id="${recipeId}" ${quantity>=10?'disabled':''}>+</button></div><button type="button" class="ranked-craft-button" data-craft-action="craft" data-recipe-id="${recipeId}" ${check.ok?'':'disabled'}>${check.ok?'FORJAR PIEZA':craftReason(check)}</button></div>
      ${unlocked?'':`<div class="ranked-recipe-lock"><span>◇</span><b>SUPERÁ EL SECTOR ${recipe.unlockSector}</b><small>La criatura de ese sector revela esta receta.</small></div>`}
    </article>`;
  }
  function renderWorkshop(data){
    const materialIds=[...new Set(Object.values(Core.RECIPES).flatMap(recipe=>Object.keys(recipe.inputs)))];
    const unlocked=Object.values(Core.RECIPES).filter(recipe=>data.stats.bestSector>=recipe.unlockSector).length;
    const recipeEntries=Object.entries(Core.RECIPES);
    const filteredRecipes=recipeFilter==='all'?recipeEntries:recipeEntries.filter(([,recipe])=>Core.template(recipe.output).kind===recipeFilter);
    const filters=[['all','TODAS'],['arma','ARMAS'],['armadura','ARMADURAS'],['reliquia','RELIQUIAS'],['consumible','CONSUMIBLES']];
    const reveal=craftFeedback?(()=>{const spec=Core.template(craftFeedback.output);return `<div class="ranked-craft-reveal tier-${spec.tier}" role="status"><div><small>PIEZA TERMINADA</small>${itemVisualMarkup(spec,'ranked-craft-reveal-visual')}<h2>${spec.name}</h2><b>×${craftFeedback.outputQty} ENVIADO AL ALIJO</b></div></div>`;})():'';
    app.innerHTML=`<div class="ranked-shell ranked-shell--workshop">
      <header class="ranked-header"><button type="button" class="ranked-back" data-action="back">← SANTUARIO</button><div><small>${seasonEyebrow()}</small><h1>TALLER DE EXTRACCIÓN</h1><p>Transformá restos de criaturas en equipo que modifica la próxima incursión</p></div><div class="ranked-header-value"><small>MAESTRÍA</small><b>${data.crafting.mastery}</b></div></header>
      ${sanctuaryTabsMarkup('workshop')}
      <div class="ranked-notice" role="status">${notice}</div>
      <nav class="ranked-recipe-filters" aria-label="Filtrar recetas">${filters.map(([id,label])=>`<button type="button" class="${recipeFilter===id?'is-active':''}" data-craft-filter="${id}">${label}<b>${id==='all'?recipeEntries.length:recipeEntries.filter(([,recipe])=>Core.template(recipe.output).kind===id).length}</b></button>`).join('')}</nav>
      <main class="ranked-workshop">
        <aside class="ranked-workshop-ledger ranked-panel"><small>MAESTRO DE CAMPAÑA</small><h2>REGISTRO DE FORJA</h2><p>Las recetas consumen únicamente materiales del alijo. La mochila y los sellos seguros nunca se tocan.</p><div class="ranked-workshop-stats"><div><span>RECETAS</span><b>${unlocked}/${Object.keys(Core.RECIPES).length}</b></div><div><span>PIEZAS CREADAS</span><b>${data.crafting.crafted}</b></div><div><span>SECTOR RÉCORD</span><b>${data.stats.bestSector}/5</b></div></div><small>RESERVA DE MATERIALES</small><div class="ranked-material-reserve">${materialIds.map(id=>{const spec=Core.template(id);return `<div>${itemVisualMarkup(spec,'ranked-material-visual')}<span>${spec.name}</span><b>×${Core.countInStash(data,id)}</b></div>`;}).join('')}</div></aside>
        <section class="ranked-recipe-grid" aria-label="Recetas del taller">${filteredRecipes.map(([id,recipe])=>recipeMarkup(data,id,recipe)).join('')}</section>
      </main>${reveal}
    </div>`;
  }
  function loadoutPerksMarkup(data){
    const equipped=Core.EQUIPMENT_SLOTS.map(slot=>Core.template(data.loadout?.[slot]?.templateId)).filter(Boolean);
    const perks=[];
    const total=(key)=>equipped.reduce((sum,spec)=>sum+(Number(spec[key])||0),0);
    if(total('thorns')) perks.push(`REPRESALIA ${total('thorns')}`);
    if(total('statusResist')) perks.push(`ESTADOS −${Math.min(2,total('statusResist'))} TURNO`);
    if(equipped.some(spec=>spec.openingGuard)) perks.push('COBERTURA INICIAL');
    if(Math.max(0,...equipped.map(spec=>Number(spec.enemyGuardPierce)||0))) perks.push(`PERFORACIÓN ${Math.round(Math.max(...equipped.map(spec=>Number(spec.enemyGuardPierce)||0))*100)}%`);
    if(Math.max(0,...equipped.map(spec=>Number(spec.executeBonus)||0))) perks.push(`EJECUCIÓN +${Math.round(Math.max(...equipped.map(spec=>Number(spec.executeBonus)||0))*100)}%`);
    return perks.length?`<div class="ranked-build-perks">${perks.map(perk=>`<span>${perk}</span>`).join('')}</div>`:'';
  }
  function loadoutMarkup(data){
    const stats=playerRunStats(data);
    return `<section class="ranked-loadout-rig"><div class="ranked-rig-heading"><div><small>ARSENAL DE INCURSIÓN</small><h3>EQUIPAMIENTO ACTIVO</h3></div><span>TODO ESTE EQUIPO SE PIERDE AL CAER</span></div><div class="ranked-equipment-slots">${Core.EQUIPMENT_SLOTS.map(slot=>{const item=data.loadout?.[slot];return `<div class="ranked-equipment-slot ${item?'is-filled':''}"><small>${equipmentLabel(slot)}</small>${item?itemMarkup(item,'loadout'):`<span class="ranked-slot-empty">${slot==='weapon'?'†':slot==='armor'?'♜':'✥'}<b>RANURA VACÍA</b></span>`}</div>`;}).join('')}</div><div class="ranked-build-summary"><div><span>DAÑO</span><b>${stats.attack}–${stats.attack+5}</b></div><div><span>VIDA</span><b>${stats.maxHp}</b></div><div><span>DAÑO EN COBERTURA</span><b>${Math.round(stats.guardFactor*100)}%</b></div></div>${loadoutPerksMarkup(data)}</section>`;
  }
  function benchMarkup(data){
    const stats=playerRunStats(data);
    const result=benchResult?`<div class="ranked-bench-result is-${benchResult.type}" role="status"><span>${benchResult.icon}</span><div><small>${benchResult.label}</small><b>${benchResult.primary}</b><em>${benchResult.detail}</em></div></div>`:`<div class="ranked-bench-idle"><span>◇</span><p>Probá la build equipada sin arriesgar objetos ni consumir recursos.</p></div>`;
    return `<section class="ranked-test-bench"><div><small>CÁMARA DE ENSAYO</small><h3>BANCO DE PRUEBAS</h3><p>El maniquí usa las mismas cifras que el combate Ranked.</p></div><div class="ranked-bench-actions"><button type="button" data-action="bench-attack"><span>⚔</span><b>PROBAR ATAQUE</b><small>${stats.attack}–${stats.attack+5} daño posible</small></button><button type="button" data-action="bench-defense"><span>⬡</span><b>PROBAR COBERTURA</b><small>${Math.round((1-stats.guardFactor)*100)}% mitigación</small></button></div>${result}</section>`;
  }
  function escapePublicText(value){ return String(value??'').replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character])); }
  function seasonEyebrow(){ return `CACERÍA RANKED · TEMPORADA ${Core.SEASON.number} · ${Core.SEASON.name.toUpperCase()}`; }
  function seasonRemaining(){
    const remaining=Date.parse(Core.SEASON.endsAt)-Date.now();
    if(remaining<=0) return 'TEMPORADA FINALIZADA';
    const days=Math.ceil(remaining/86400000);
    return days===1?'ÚLTIMO DÍA':`${days} DÍAS RESTANTES`;
  }
  function seasonOverviewMarkup(){
    const start=new Intl.DateTimeFormat('es-AR',{day:'numeric',month:'short'}).format(new Date(Core.SEASON.startsAt));
    const end=new Intl.DateTimeFormat('es-AR',{day:'numeric',month:'short',year:'numeric'}).format(new Date(Core.SEASON.endsAt));
    return `<section class="ranked-season-overview"><div><small>TEMPORADA ${Core.SEASON.number} · ${start} — ${end}</small><h2>${Core.SEASON.name}</h2><p>La primera competencia oficial de extracción. Tu alijo permanece, pero PR, XP, misiones e historial competitivo comenzaron desde cero.</p></div><strong>${seasonRemaining()}</strong><div class="ranked-season-rules"><span><b>CLASIFICACIÓN</b>Top público validado por Supabase</span><span><b>RUTA GRATUITA</b>10 niveles · 3400 XP</span><span><b>CIERRE</b>Tu mejor división queda registrada</span></div></section>`;
  }
  function publicLeaderboardMarkup(){
    let content='';
    if(publicLeaderboardStatus==='loading') content='<div class="ranked-public-empty"><span>◌</span><b>CONSULTANDO EL SANTUARIO</b><p>Cargando resultados verificados…</p></div>';
    else if(publicLeaderboardStatus==='error') content=`<div class="ranked-public-empty is-error"><span>◇</span><b>RANKING PÚBLICO PENDIENTE</b><p>${escapePublicText(publicLeaderboardError)}</p></div>`;
    else if(publicLeaderboardStatus==='ready'&&!publicLeaderboard.length) content='<div class="ranked-public-empty"><span>✦</span><b>TODAVÍA NO HAY RESULTADOS VERIFICADOS</b><p>La primera incursión aceptada por Supabase inaugurará la tabla.</p></div>';
    else if(publicLeaderboard.length) content=`<div class="ranked-public-list">${publicLeaderboard.map(row=>{
      const division=Core.DIVISIONS.find(entry=>entry.id===row.division)||Core.divisionForRating(row.rating);
      const classLabel=typeof CLASSES!=='undefined'&&CLASSES[row.class_key]?.label?CLASSES[row.class_key].label:row.class_key;
      return `<article class="${row.is_current?'is-current':''}" style="--public-division:${division.color}"><strong>#${Number(row.rank_position)||'—'}</strong><span><b>${escapePublicText(row.display_name)}</b><small>${escapePublicText(classLabel)} · ${division.name}</small></span><em>${Number(row.best_sector)||0}/5 mejor sector · ${Number(row.extractions)||0} extracciones</em><div><b>${Number(row.rating)||0} PR</b><small>${Number(row.mobs_defeated)||0} abatidos</small></div></article>`;
    }).join('')}</div>`;
    else content='<div class="ranked-public-empty"><span>◈</span><b>LISTO PARA CONECTAR</b><p>Actualizá la tabla para consultar el ranking público.</p></div>';
    return `<section class="ranked-public-panel"><div class="ranked-section-heading"><div><small>SUPABASE · RESULTADOS VALIDADOS</small><h2>CLASIFICACIÓN PÚBLICA</h2></div><button type="button" data-action="public-rank-refresh">ACTUALIZAR</button></div><p class="ranked-public-security">Las tablas no aceptan puntuaciones directas. Cada partida necesita un recibo del servidor y los PR se vuelven a calcular al finalizar.</p>${content}</section>`;
  }
  function renderRankedProgress(data){
    const rank=Core.rankProgress(data.competition.rating);
    const missions=Core.MISSION_DEFS.map(mission=>Core.missionProgress(data,mission.id));
    const history=data.competition.history.slice().reverse();
    const nextLabel=rank.next?`${rank.next.floor-rank.rating} PR para ${rank.next.name}`:'Rango máximo alcanzado';
    const migratedFromPreseason=data.competition.archives.length>0;
    app.innerHTML=`<div class="ranked-shell ranked-shell--progress">
      <header class="ranked-header"><button type="button" class="ranked-back" data-action="back">← SANTUARIO</button><div><small>${seasonEyebrow()}</small><h1>CENTRO DE PROGRESIÓN</h1><p>Rango competitivo, misiones y recompensas en un solo lugar</p></div><div class="ranked-header-value"><small>RANGO COMPETITIVO</small><b>${rank.rating} PR</b></div></header>
      ${sanctuaryTabsMarkup('rank')}
      <div class="ranked-notice" role="status">${notice}</div>
      <main class="ranked-progress-layout">
        ${seasonOverviewMarkup()}
        <section class="ranked-rank-hero" style="--division:${rank.current.color}"><div class="ranked-rank-emblem"><span>◈</span><small>DIVISIÓN COMPETITIVA</small><h2>${rank.current.name}</h2></div><div class="ranked-rank-summary"><div><small>RANGO COMPETITIVO · PR</small><b>${rank.rating} PR</b><em>Mejor marca: ${data.competition.peakRating} PR</em></div><div class="ranked-rank-bar" aria-label="${Math.round(rank.progress*100)}% hacia ${rank.next?.name||'el rango máximo'}"><i style="width:${Math.round(rank.progress*100)}%"></i></div><p><b>${nextLabel}.</b> Ganás PR al extraerte; más sectores, abatidos y botín aumentan el resultado. Caer puede restar PR.</p></div><aside><small>PASE DE TEMPORADA · XP</small><b>${data.competition.seasonXp} XP</b><span>La XP no se gasta al reclamar</span></aside></section>
        <section class="ranked-system-guide"><article><span>◈</span><div><b>PR = DIVISIÓN</b><p>Decide si sos Hierro, Bronce, Plata, Oro, Obsidiana o Eterno.</p></div></article><article><span>✦</span><div><b>XP = RECOMPENSAS</b><p>Sube jugando y completando misiones. No reemplaza los PR.</p></div></article><article><span>▦</span><div><b>BOTÍN = FABRICACIÓN</b><p>Los materiales extraídos sirven para crear equipo en el taller.</p></div></article><button type="button" data-action="tutorial-open">VER GUÍA COMPLETA</button></section>
        ${migratedFromPreseason?'<p class="ranked-migration-note"><b>PRETEMPORADA ARCHIVADA</b> Conservaste tu alijo, equipo, recetas y maestría. PR, XP, misiones e historial competitivo se reiniciaron para que todos comiencen la Temporada 1 en igualdad.</p>':''}
        <section class="ranked-season-panel"><div class="ranked-section-heading"><div><small>XP ADICIONAL · NO OTORGAN PR</small><h2>MISIONES DE FRONTERA</h2></div><span>${missions.filter(mission=>mission.claimed).length}/${missions.length} reclamadas</span></div><div class="ranked-mission-grid">${missions.map(mission=>{const pct=Math.min(100,mission.value/mission.goal*100);const remaining=Math.max(0,mission.goal-mission.value);return `<article class="ranked-mission ${mission.complete?'is-complete':''} ${mission.claimed?'is-claimed':''}"><small>${mission.name}</small><p>${mission.description}</p><div><i style="width:${pct}%"></i></div><span>${Math.min(mission.value,mission.goal)}/${mission.goal} · RECOMPENSA ${mission.rewardXp} XP</span><button type="button" data-mission-id="${mission.id}" ${!mission.complete||mission.claimed?'disabled':''}>${mission.claimed?'✓ XP RECLAMADA':mission.complete?`RECLAMAR +${mission.rewardXp} XP`:`FALTAN ${remaining}`}</button></article>`;}).join('')}</div></section>
        <section class="ranked-season-panel"><div class="ranked-section-heading"><div><small>PASE DE TEMPORADA · LA XP NO SE GASTA</small><h2>RECOMPENSAS GRATUITAS</h2></div><span>${data.competition.claimedRewards.length}/${Core.REWARD_TRACK.length} obtenidas</span></div><div class="ranked-reward-track">${Core.REWARD_TRACK.map(reward=>{const spec=Core.template(reward.templateId);const claimed=data.competition.claimedRewards.includes(reward.level);const unlocked=data.competition.seasonXp>=reward.xp;const missing=Math.max(0,reward.xp-data.competition.seasonXp);return `<article class="tier-${spec.tier} ${claimed?'is-claimed':''}"><small>NIVEL ${reward.level} · REQUIERE ${reward.xp} XP</small>${itemVisualMarkup(spec,'ranked-reward-visual')}<b>${spec.name}</b><span>×${reward.qty}</span><button type="button" data-reward-level="${reward.level}" ${!unlocked||claimed?'disabled':''}>${claimed?'✓ EN EL ALIJO':unlocked?'RECLAMAR':`FALTAN ${missing} XP`}</button></article>`;}).join('')}</div></section>
        ${publicLeaderboardMarkup()}
        <section class="ranked-history-panel"><div class="ranked-section-heading"><div><small>REGISTRO DEL DISPOSITIVO</small><h2>HISTORIAL LOCAL DE INCURSIONES</h2></div><span>Últimas 12 partidas</span></div>${history.length?`<div class="ranked-history-list">${history.map(entry=>{const division=Core.DIVISIONS.find(item=>item.id===entry.division)||Core.DIVISIONS[0];return `<article><span class="${entry.result==='extracted'?'is-win':'is-loss'}">${entry.result==='extracted'?'EXTRACCIÓN':'DERROTA'}</span><b>Sector ${entry.sector}/5</b><em>${entry.mobsDefeated} abatidos · ${entry.lootValue} valor</em><strong class="${entry.rankDelta>=0?'is-positive':'is-negative'}">${entry.rankDelta>=0?'+':''}${entry.rankDelta} PR</strong><small>${division.name} · ${entry.ratingAfter} PR</small></article>`;}).join('')}</div>`:'<div class="ranked-history-empty"><span>◇</span><b>TODAVÍA NO HAY INCURSIONES REGISTRADAS</b><p>Tu primera extracción nueva aparecerá acá con su puntuación y resultado.</p></div>'}</section>
        <p class="ranked-preseason-note">Temporada 1 oficial: el historial local funciona sin conexión, pero sólo las incursiones iniciadas con una cuenta registrada y aceptadas por Supabase modifican la clasificación pública.</p>
      </main>
    </div>`;
    mountTutorial();
  }
  function render(preserveScroll=false){
    const previousScroll=preserveScroll?(app.querySelector('.ranked-shell')?.scrollTop||0):0;
    const restoreScroll=()=>{
      if(!preserveScroll||previousScroll<=0) return;
      requestAnimationFrame(()=>{const shell=app.querySelector('.ranked-shell');if(shell) shell.scrollTop=previousScroll;});
    };
    const data=rankedState();
    if(resultVisible && data.lastRun){ renderResult(data); restoreScroll(); return; }
    if(data.activeRun){ renderExpedition(data); restoreScroll(); return; }
    if(sanctuaryView==='workshop'){ renderWorkshop(data); restoreScroll(); return; }
    if(sanctuaryView==='rank'){ renderRankedProgress(data); restoreScroll(); return; }
    const found=selected();
    if(selectedUid && !found) selectedUid='';
    const occupied=data.backpack.reduce((sum,item)=>{const size=Core.dimensions(item);return sum+size.w*size.h;},0);
    const equippedCount=Core.EQUIPMENT_SLOTS.filter(slot=>data.loadout?.[slot]).length;
    const activeTerritory=SECTOR_META[data.stats.unlockedTerritory]||SECTOR_META[0];
    app.innerHTML=`<div class="ranked-shell">
      <header class="ranked-header">
        <button type="button" class="ranked-back" data-action="back">← SANTUARIO</button>
        <div><small>${seasonEyebrow()}</small><h1>INVENTARIO DE EXTRACCIÓN</h1><p>Competencia oficial · clasificación pública y progreso estacional</p></div>
        <div class="ranked-header-value"><small>VALOR TOTAL</small><b>${Core.totalValue(data)}</b></div>
      </header>
      ${sanctuaryTabsMarkup('inventory')}
      <div class="ranked-notice" role="status">${notice}</div>
      <main class="ranked-layout">
        <section class="ranked-panel ranked-stash" data-drop-container="stash">
          <div class="ranked-panel-title"><div><small>RESERVA PERMANENTE</small><h2>ALIJO DE TEMPORADA</h2></div><b>${data.stash.length}/120</b></div>
          <p>Lo almacenado acá no entra a la expedición y no se pierde.</p>
          <button type="button" class="ranked-stack-all" data-action="stack-stash"><span>≋</span><b>APILAR TODO</b><small>Unir materiales compatibles</small></button>
          <div class="ranked-stash-list">${data.stash.map(item=>itemMarkup(item,'stash')).join('') || '<div class="ranked-empty">El alijo está vacío.</div>'}</div>
          <button type="button" class="ranked-test-loot" data-action="test-loot">+ BOTÍN DE PRUEBA</button>
        </section>
        <section class="ranked-panel ranked-loadout">
          <div class="ranked-panel-title"><div><small>EQUIPO EN RIESGO</small><h2>MOCHILA 4×4</h2></div><b>${occupied}/16</b></div>
          <p>Todo lo que llevás puede perderse al caer. Ordená, girá y apilá antes de entrar.</p>
          ${loadoutMarkup(data)}
          ${gridMarkup(data)}
          <div class="ranked-pack-actions"><button type="button" data-action="auto-sort">ORDENAR AUTOMÁTICO</button><button type="button" class="danger ${defeatArmed?'is-armed':''}" data-action="${defeatArmed?'confirm-defeat':'test-defeat'}">${defeatArmed?'CONFIRMAR PÉRDIDA':'SIMULAR DERROTA'}</button></div>
          <div class="ranked-secure-title"><span>SELLOS SEGUROS</span><small>2 espacios protegidos incluso al caer</small></div>
          <div class="ranked-secure">${data.secure.map((item,index)=>`<div class="ranked-secure-slot" data-secure-index="${index}"><span class="ranked-secure-number">0${index+1}</span>${item?itemMarkup(item,'secure'):'<span class="ranked-secure-empty">SOLTÁ UN MATERIAL 1×1</span>'}</div>`).join('')}</div>
          <button type="button" class="ranked-deploy" data-action="run-start"><small>RUTA ${data.stats.unlockedTerritory+1}/5 · ${activeTerritory.shortName.toUpperCase()} · 5 SECTORES</small><b>INICIAR INCURSIÓN RANKED →</b><span>En esta ruta sólo aparecen ${data.stats.unlockedTerritory===0?'limos':data.stats.unlockedTerritory===1?'lobos':data.stats.unlockedTerritory===2?'arañas':data.stats.unlockedTerritory===3?'gólems':'dragones'} · ${occupied}/16 casillas · ${equippedCount}/3 piezas equipadas</span></button>
          ${benchMarkup(data)}
        </section>
        <aside class="ranked-panel ranked-details"><div class="ranked-panel-title"><div><small>LECTURA TÁCTICA</small><h2>OBJETO</h2></div></div>${detailMarkup(found)}</aside>
      </main>
    </div>`;
    mountTutorial();
    restoreScroll();
  }
  function selectItem(uid){ selectedUid=uid;notice='Objeto seleccionado. Elegí una acción o una casilla libre.';rankedSound('click');render(true); }
  function moveToBackpack(found,x=null,y=null){
    const data=rankedState();
    const item=found.item;
    if(x===null || y===null){
      const spot=Core.firstFit(data.backpack,item);
      if(!spot){ commit('La mochila no tiene espacio para ese objeto.'); return; }
      x=spot.x;y=spot.y;item.rotated=spot.rotated;
    }
    if(!Core.canPlace(data.backpack,item,x,y,item.rotated,item.uid)){ commit('Esa posición está ocupada o queda fuera de la mochila.'); return; }
    removeLocated(found);
    item.x=x;item.y=y;
    data.backpack.push(item);
    rankedSound('click');
    commit(`${Core.template(item.templateId).name} ahora está en la mochila.`);
  }
  function moveToStash(found){
    const data=rankedState();
    if(found.container!=='stash'&&data.stash.length>=120){ rankedSound('warning');commit('El alijo está completo. Liberá una ranura antes de guardar ese objeto.');return; }
    removeLocated(found);
    found.item.x=0;found.item.y=0;
    data.stash.push(found.item);
    rankedSound('click');
    commit(`${Core.template(found.item.templateId).name} ahora está en el alijo.`);
  }
  function moveToSecure(found,index=null){
    const data=rankedState();
    const spec=Core.template(found.item.templateId);
    if(!spec.secure){ commit('Los sellos sólo aceptan materiales compactos de 1×1.'); return; }
    const target=index===null ? data.secure.findIndex(item=>!item) : index;
    if(target<0 || data.secure[target]){ commit('Los dos sellos seguros están ocupados.'); return; }
    removeLocated(found);
    data.secure[target]=found.item;
    rankedSound('reward');
    commit(`Se protegió ${spec.name} en el sello ${target+1}.`);
  }
  function equipSelected(found){
    const data=rankedState();
    const slot=Core.equipmentSlot(found.item);
    if(!slot || found.container==='loadout'){ commit('Ese objeto no puede equiparse en una ranura Ranked.'); return; }
    const nextItem=found.item;
    const previous=data.loadout?.[slot]||null;
    let backpackSpot=null;
    if(previous && found.container==='backpack'){
      const withoutNext=data.backpack.filter(item=>item.uid!==nextItem.uid);
      backpackSpot=Core.firstFit(withoutNext,previous);
      if(!backpackSpot && data.stash.length>=120){ rankedSound('warning');commit('No hay espacio para guardar la pieza que ya estaba equipada.');return; }
    }
    if(previous && found.container==='stash') data.stash[found.index]=previous;
    else if(previous && found.container==='secure') data.secure[found.index]=previous;
    else{
      removeLocated(found);
      if(previous){
        if(backpackSpot) data.backpack.push({...previous,...backpackSpot});
        else data.stash.unshift(previous);
      }
    }
    nextItem.x=0;nextItem.y=0;nextItem.rotated=false;
    data.loadout[slot]=nextItem;
    selectedUid=nextItem.uid;
    benchResult=null;
    const equippedSpec=Core.template(nextItem.templateId);
    rankedSound('rankedEquip',equippedSpec.kind);
    commit(`Se equipó ${equippedSpec.name} como ${equipmentLabel(slot).toLowerCase()}. Recordá que se perderá si caés.`);
  }
  function rotateSelected(found){
    if(found.container!=='backpack') return;
    const next=!found.item.rotated;
    if(!Core.canPlace(rankedState().backpack,found.item,found.item.x,found.item.y,next,found.item.uid)){ commit('No hay espacio para girar el objeto en esa posición.'); return; }
    found.item.rotated=next;
    rankedSound('click');
    commit(`Se giró ${Core.template(found.item.templateId).name}.`);
  }
  function stackInto(source,target){
    if(!source || !target || source.item.templateId!==target.item.templateId || source.item.uid===target.item.uid) return false;
    const spec=Core.template(target.item.templateId);
    const room=spec.maxStack-target.item.qty;
    if(room<=0) return false;
    const moved=Math.min(room,source.item.qty);
    target.item.qty+=moved;
    source.item.qty-=moved;
    if(source.item.qty<=0){ removeLocated(source); selectedUid=target.item.uid; }
    rankedSound('reward');
    commit(`${moved} unidad${moved===1?'':'es'} apilada${moved===1?'':'s'} en ${spec.name}.`);
    return true;
  }
  function stackStash(){
    const data=rankedState();
    const result=Core.stackAll(data.stash);
    data.stash=result.items;
    if(selectedUid&&!locate(selectedUid)) selectedUid='';
    rankedSound(result.removed?'reward':'click');
    commit(result.removed?`Se liberaron ${result.removed} ranura${result.removed===1?'':'s'} al combinar materiales del alijo.`:'El alijo ya estaba apilado al máximo.');
  }
  function addTestLoot(){
    const ids=Object.keys(Core.TEMPLATES);
    const templateId=ids[Math.floor(Math.random()*ids.length)];
    const item=Core.makeItem(templateId,1+Math.floor(Math.random()*Math.min(3,Core.template(templateId).maxStack)));
    rankedState().stash.unshift(item);
    selectedUid=item.uid;
    rankedSound('treasureOpen',Core.template(templateId).tier==='raro');
    commit(`${Core.template(templateId).name} apareció en el alijo de pruebas.`);
  }
  function simulateDefeat(){
    const data=rankedState();
    const equipped=Core.EQUIPMENT_SLOTS.filter(slot=>data.loadout?.[slot]).length;
    if(!data.backpack.length&&!equipped){ commit('La mochila y el equipamiento de riesgo ya están vacíos. Los sellos siguen protegidos.'); return; }
    const lost=data.backpack.length+equipped;
    data.backpack=[];
    data.loadout={weapon:null,armor:null,relic:null};
    data.stats.failedRuns+=1;
    defeatArmed=false;
    selectedUid='';
    rankedSound('defeat');
    commit(`Derrota simulada: se perdieron ${lost} objetos entre mochila y equipamiento. Los sellos sobrevivieron.`);
  }
  const INTENT_DATA={
    attack:{label:'Ataque directo',icon:'⚔',power:1},heavy:{label:'Golpe devastador',icon:'✹',power:1.55},
    poison:{label:'Mordida venenosa',icon:'✦',power:.7},bleed:{label:'Desgarro sangrante',icon:'⌁',power:.9},
    stun:{label:'Embate aturdidor',icon:'◈',power:.65},guard:{label:'Caparazón defensivo',icon:'⬡',power:0},
    regen:{label:'Regeneración oscura',icon:'✚',power:0}
  };
  function chooseEnemyIntent(enemy,turn=0){
    const definition=enemyDefinition(enemy.id);
    const pattern=activeEnemyPattern(enemy);
    const patternIndex=Math.max(0,turn)%pattern.length;
    const type=pattern[patternIndex];
    enemy.turnPatternIndex=patternIndex;
    const intent={type,...INTENT_DATA[type]};
    const trait=definition?.trait||{};
    if(type==='heavy'&&enemy.hp<=enemy.maxHp*.5&&trait.frenzyPower) intent.power+=trait.frenzyPower;
    if(type==='heavy'&&trait.executePower) intent.executePower=trait.executePower;
    return intent;
  }
  function createEnemy(territory,sector){
    const pool=Core.encountersForTerritory(territory);
    const totalWeight=pool.reduce((sum,entry)=>sum+(Number(entry.weight)||1),0);
    let roll=Math.random()*totalWeight;
    const base=pool.find(entry=>(roll-=Number(entry.weight)||1)<=0)||pool[0];
    const difficulty=Core.difficultyForSector(sector);
    const levelPressure=Math.min(18,Math.max(0,(Number(state.level)||1)-1));
    const hp=base.hp+levelPressure*2+difficulty.hpBonus;
    const enemy={id:base.id,name:base.name,icon:base.icon,image:base.image,tier:base.tier,hp,maxHp:hp,atk:base.atk+Math.floor(levelPressure/4)+difficulty.attackBonus,guard:Boolean(base.trait?.openingGuard),statuses:{bleed:0,poison:0,stun:0,regen:0}};
    enemy.intent=chooseEnemyIntent(enemy,0);
    return enemy;
  }
  function playerRunStats(data){
    const bonuses=Core.loadoutStats(data);
    return {maxHp:76+bonuses.hpBonus,attack:10+bonuses.attackBonus+Math.min(8,Math.floor((Number(state.level)||1)/5)),guardFactor:Math.max(.15,.35-bonuses.guardBonus/100),thorns:bonuses.thorns||0,statusResist:bonuses.statusResist||0,openingGuard:bonuses.openingGuard===true};
  }
  function appendRunLog(run,message){ run.log.push(message);run.log=run.log.slice(-8); }
  function startRun(){
    const data=rankedState();
    const combat=playerRunStats(data);
    const territory=Math.max(0,Math.min(SECTOR_META.length-1,Number(data.stats.unlockedTerritory)||0));
    resultVisible=false;
    defeatArmed=false;
    data.activeRun={id:`run-${Date.now().toString(36)}`,phase:'encounter',territory,sector:0,turn:0,hp:combat.maxHp,maxHp:combat.maxHp,guard:combat.openingGuard,classSkillCooldown:0,levelSkillCooldowns:{},arcaneCharges:0,counterReady:false,statuses:{bleed:0,poison:0,stun:0,regen:0},enemy:createEnemy(territory,0),pendingLoot:[],lootValue:0,lootManifest:[],mobsDefeated:0,publicRunId:'',publicStartedAt:0,publicEligible:false,log:[combat.openingGuard?`Ingresaste protegido a ${SECTOR_META[territory].shortName}.`:`Ingresaste a ${SECTOR_META[territory].name}.`],startedAt:Date.now()};
    publicRunStartPromise=startPublicRankedRun(data.activeRun);
    rankedSound('setScene','battle');
    rankedSound('huntOpen');
    setTimeout(()=>rankedSound('enemyIntent',data.activeRun?.enemy?.intent?.type||'attack'),420);
    if(combat.openingGuard) setTimeout(()=>rankedSound('perkProc','ward'),80);
    queueCombatFeedback('deploy',{label:'INCURSIÓN INICIADA',announcement:'Incursión iniciada'});
    commit('Incursión iniciada. Todo lo que está en la mochila queda en riesgo.');
  }
  function finishRun(result){
    const data=rankedState();
    const run=data.activeRun;
    if(!run) return;
    if(result==='extracted' && run.phase!=='loot'){
      rankedSound('warning');
      recoveryMessage='NO PODÉS EXTRAER DURANTE UN COMBATE';
      clearTimeout(recoveryTimer);
      recoveryTimer=setTimeout(()=>{recoveryMessage='';if(rankedState().activeRun)render(false);},1800);
      render(false);
      return;
    }
    const extracted=result==='extracted';
    const sector=run.sector+1;
    const survived=extracted?Core.EQUIPMENT_SLOTS.map(slot=>data.loadout?.[slot]?.templateId).filter(Boolean):[];
    const protectedItems=data.secure.filter(Boolean).map(item=>item.templateId);
    if(extracted){
      data.stats.extractions+=1;
      data.stats.lootValue+=run.lootValue;
    }else{
      data.backpack=[];
      data.loadout={weapon:null,armor:null,relic:null};
      data.stats.failedRuns+=1;
    }
    data.stats.bestSector=Math.max(data.stats.bestSector,sector);
    data.stats.mobsDefeated+=run.mobsDefeated;
    const rankedResult=Core.recordRankedResult(data,{id:run.id,result,sector,lootValue:run.lootValue,mobsDefeated:run.mobsDefeated,endedAt:Date.now()});
    data.lastRun={id:run.id,result,territory:run.territory||0,sector,lootValue:run.lootValue,mobsDefeated:run.mobsDefeated,loot:run.lootManifest||[],survived,protected:protectedItems,rankDelta:rankedResult.rankDelta,ratingAfter:rankedResult.ratingAfter,division:rankedResult.division,seasonXpEarned:rankedResult.seasonXpEarned,publicStatus:run.publicEligible||publicRunStartPromise?'pending':'local',publicRankDelta:0,publicRatingAfter:0,endedAt:rankedResult.endedAt};
    if(extracted&&run.sector===4&&run.territory===data.stats.unlockedTerritory) data.stats.unlockedTerritory=Math.min(SECTOR_META.length-1,data.stats.unlockedTerritory+1);
    const finishedRun=data.lastRun;
    data.activeRun=null;
    selectedUid='';
    resultVisible=true;
    rankedSound('setScene','hunt');
    if(extracted) rankedSound('victory');
    else rankedSound('defeat');
    commit(extracted?'Extracción completada. El botín y el equipamiento activo permanecen con vos.':'Caíste en la incursión. La mochila y el equipamiento se perdieron; alijo y sellos sobrevivieron.');
    submitPublicRankedResult(run,finishedRun);
  }
  function rollLoot(enemy){
    const encounter=enemyDefinition(enemy?.id)||Core.encountersForSector(0)[0];
    return encounter.loot.flatMap(([templateId,min,max,chance])=>{
      if(Math.random()>chance) return [];
      const qty=min+Math.floor(Math.random()*(max-min+1));
      return [Core.makeItem(templateId,qty)];
    });
  }
  function defeatEnemy(run,damage){
    run.enemy.hp=0;
    run.phase='loot';
    run.pendingLoot=rollLoot(run.enemy);
    run.mobsDefeated+=1;
    if(Core.template(rankedState().loadout?.relic?.templateId)?.regenOnKill) run.statuses.regen=Math.max(run.statuses.regen,Core.template(rankedState().loadout.relic.templateId).regenOnKill);
    appendRunLog(run,`${run.enemy.name} fue derrotado. Revisá el botín.`);
    rankedSound('breakSound');
    setTimeout(()=>rankedSound('reward'),90);
    queueCombatFeedback('enemy-down',{enemyDamage:damage,label:'AMENAZA ABATIDA',announcement:`${run.enemy.name} derrotado`});
    commit(`Sector ${run.sector+1} despejado. Recogé lo que entre o extraete.`);
  }
  function tickOngoingStatuses(run){
    const messages=[];
    const tick=(target,statuses,label,maxHp)=>{
      if(statuses.bleed>0){const damage=3+run.sector;target.hp=Math.max(0,target.hp-damage);statuses.bleed-=1;messages.push(`${label} sufrió ${damage} por sangrado.`);}
      if(statuses.poison>0){const damage=4+Math.floor(run.sector/2);target.hp=Math.max(0,target.hp-damage);statuses.poison-=1;messages.push(`${label} sufrió ${damage} por veneno.`);}
      if(statuses.regen>0){const healed=Math.min(5+run.sector,maxHp-target.hp);target.hp+=healed;statuses.regen-=1;if(healed)messages.push(`${label} regeneró ${healed} de vida.`);}
    };
    tick(run,run.statuses,'El aventurero',run.maxHp);
    tick(run.enemy,run.enemy.statuses,run.enemy.name,run.enemy.maxHp);
    messages.forEach(message=>appendRunLog(run,message));
    if(run.hp<=0){ finishRun('defeated'); return false; }
    if(run.enemy.hp<=0){ defeatEnemy(run,0); return false; }
    if(run.statuses.stun>0){
      run.statuses.stun-=1;
      advanceClassCooldown(run);
      appendRunLog(run,'El aturdimiento te impidió actuar.');
      rankedSound('warning');
      if(!enemyCounter(run,{label:'ATURDIDO'})) commit(`${run.lastEnemyAction} Recuperaste el control.`);
      return false;
    }
    return true;
  }
  function advanceClassCooldown(run){
    run.classSkillCooldown=Math.max(0,(Number(run.classSkillCooldown)||0)-1);
    run.levelSkillCooldowns=run.levelSkillCooldowns||{};
    Object.keys(run.levelSkillCooldowns).forEach(key=>{run.levelSkillCooldowns[key]=Math.max(0,(Number(run.levelSkillCooldowns[key])||0)-1);});
  }
  function enemyCounter(run,details={}){
    if(run.enemy.statuses.stun>0){
      run.enemy.statuses.stun-=1;
      run.turn=(run.turn||0)+1;
      run.enemy.intent=chooseEnemyIntent(run.enemy,run.turn);
      run.lastEnemyAction=`${run.enemy.name} perdió el turno por aturdimiento.`;
      appendRunLog(run,run.lastEnemyAction);
      rankedSound('warning');
      queueCombatFeedback('guard',{...details,label:'ATURDIDO',announcement:run.lastEnemyAction});
      return false;
    }
    const intent=run.enemy.intent||chooseEnemyIntent(run.enemy,run.turn||0);
    const definition=enemyDefinition(run.enemy.id);
    const trait=definition?.trait||{};
    let damage=0;
    let raw=0;
    let actionLabel=intent.label;
    if(intent.type==='guard'){
      run.enemy.guard=true;
      appendRunLog(run,`${run.enemy.name} preparó una defensa para reducir tu próximo golpe.`);
      run.lastEnemyAction=`${run.enemy.name} adoptó una posición defensiva.`;
    }else if(intent.type==='regen'){
      const healed=Math.min(10+run.sector*2+(trait.regenBonus||0),run.enemy.maxHp-run.enemy.hp);
      run.enemy.hp+=healed;
      run.enemy.statuses.regen=Math.max(run.enemy.statuses.regen,1);
      appendRunLog(run,`${run.enemy.name} recuperó ${healed} de vida y comenzó a regenerarse.`);
      run.lastEnemyAction=`${run.enemy.name} recuperó ${healed} de vida.`;
    }else{
      const blocked=run.guard;
      raw=Math.max(1,Math.floor(run.enemy.atk*intent.power)+Math.floor(Math.random()*5));
      const afflicted=run.statuses.bleed>0||run.statuses.poison>0;
      if(intent.executePower&&afflicted) raw=Math.max(1,Math.floor(raw*(1+intent.executePower)));
      const guardFactor=playerRunStats(rankedState()).guardFactor;
      const bossPhaseTwo=Boolean(definition?.phasePattern&&run.enemy.hp<=run.enemy.maxHp*.5);
      const activePierce=definition?.phasePattern&&!bossPhaseTwo?0:trait.pierceGuard;
      const blockedFactor=activePierce?Math.max(guardFactor,activePierce):guardFactor;
      damage=blocked?Math.max(1,Math.floor(raw*blockedFactor)):raw;
      run.guard=false;
      run.hp=Math.max(0,run.hp-damage);
      const equippedStats=playerRunStats(rankedState());
      const statusDuration=Math.max(1,3+(trait.statusBonus||0)-equippedStats.statusResist);
      if(intent.type==='poison') run.statuses.poison=Math.max(run.statuses.poison,statusDuration);
      if(intent.type==='bleed') run.statuses.bleed=Math.max(run.statuses.bleed,statusDuration);
      if(['poison','bleed'].includes(intent.type)&&equippedStats.statusResist>0) rankedSound('perkProc','resist');
      if(intent.type==='stun') run.statuses.stun=Math.max(run.statuses.stun,1);
      if(['poison','bleed','stun'].includes(intent.type)) rankedSound('statusProc',intent.type);
      appendRunLog(run,`${run.enemy.name} usó ${intent.label.toLowerCase()} y causó ${damage} de daño${damage<raw?' tras tu cobertura':''}${intent.executePower&&afflicted?'; su rasgo castigó tus estados activos':''}.`);
      run.lastEnemyAction=`${intent.label}: recibiste ${damage} de daño${damage<raw?' con cobertura':''}.`;
      if(damage>0&&equippedStats.thorns>0){
        const reflected=Math.min(equippedStats.thorns,run.enemy.hp);
        run.enemy.hp=Math.max(0,run.enemy.hp-reflected);
        appendRunLog(run,`Tu armadura respondió con ${reflected} de daño de represalia.`);
        rankedSound('perkProc','thorns');
        if(run.enemy.hp<=0){
          if(run.hp<=0){finishRun('defeated');return true;}
          defeatEnemy(run,reflected);return true;
        }
      }
      if(damage>0&&run.counterReady){
        const counterDamage=Math.max(3,Math.round(equippedStats.attack*.72));
        run.counterReady=false;
        run.enemy.hp=Math.max(0,run.enemy.hp-counterDamage);
        appendRunLog(run,`Bloqueaste el impacto y contraatacaste por ${counterDamage} de daño.`);
        rankedSound('perkProc','thorns');
        if(run.enemy.hp<=0){
          if(run.hp<=0){finishRun('defeated');return true;}
          defeatEnemy(run,counterDamage);return true;
        }
      }
    }
    run.turn=(run.turn||0)+1;
    run.enemy.intent=chooseEnemyIntent(run.enemy,run.turn);
    const archetype=run.enemy.id.includes('spider')?'venom':run.enemy.id.includes('wolf')?'swift':run.enemy.tier==='jefe'?'charger':'normal';
    if(damage) rankedSound('enemyAttack',{archetype:{key:archetype}},damage<raw);
    else rankedSound(intent.type==='guard'?'block':'heal');
    setTimeout(()=>rankedSound('enemyIntent',run.enemy.intent?.type||'attack'),260);
    if(run.hp<=0){ finishRun('defeated'); return true; }
    queueCombatFeedback(damage<raw&&damage?'guard':details.heal?'heal-exchange':'exchange',{
      ...details,
      playerDamage:damage,
      blocked:Boolean(damage&&damage<raw),
      playerStatusLabel:['poison','bleed','stun'].includes(intent.type)?STATUS_META[intent.type].label.toUpperCase():'',
      label:details.label||actionLabel.toUpperCase(),
      announcement:`${details.enemyDamage?`Causaste ${details.enemyDamage} de daño. `:''}${run.lastEnemyAction}`
    });
    return false;
  }
  function runAttack(){
    const data=rankedState();const run=data.activeRun;
    if(!run || run.phase!=='encounter') return;
    if(!tickOngoingStatuses(run)) return;
    const stats=playerRunStats(data);
    const weapon=Core.template(data.loadout?.weapon?.templateId);
    const guarded=run.enemy.guard;
    const enemyBeforeHit=run.enemy.hp;
    const afflicted=run.enemy.statuses.bleed>0||run.enemy.statuses.poison>0;
    const classKey=state.characterClass;
    let rawDamage=stats.attack+Math.floor(Math.random()*6);
    let classDetail='';
    if(classKey==='warrior'){
      rawDamage=Math.round(rawDamage*1.10);
      classDetail=' con un tajo firme';
    }else if(classKey==='archer'&&Math.random()<.28){
      rawDamage=Math.round(rawDamage*1.65);
      classDetail=' con un disparo preciso';
      rankedSound('perkProc','execute');
    }else if(classKey==='mage'){
      run.arcaneCharges=Math.min(3,(run.arcaneCharges||0)+1);
      classDetail=` y canalizaste una carga arcana (${run.arcaneCharges}/3)`;
    }
    if(afflicted&&weapon?.executeBonus) rawDamage=Math.max(1,Math.floor(rawDamage*(1+weapon.executeBonus)));
    const guardedFactor=weapon?.enemyGuardPierce||.5;
    const damage=guarded?Math.max(1,Math.floor(rawDamage*guardedFactor)):rawDamage;
    run.enemy.guard=false;
    run.enemy.hp=Math.max(0,run.enemy.hp-damage);
    appendRunLog(run,`Golpeaste por ${damage} de daño${guarded?' contra su defensa':''}${classDetail}.`);
    rankedSound('classAttack',state.characterClass);
    rankedSound('impactAccent',state.characterClass,classKey==='warrior'?'heavy':'normal',1);
    if(guarded&&guardedFactor>.5) rankedSound('perkProc','pierce');
    if(afflicted&&weapon?.executeBonus) rankedSound('perkProc','execute');
    if(run.enemy.hp<=0){ defeatEnemy(run,damage); return; }
    const definition=enemyDefinition(run.enemy.id);
    const phaseShifted=Boolean(definition?.phasePattern&&enemyBeforeHit>run.enemy.maxHp*.5&&run.enemy.hp<=run.enemy.maxHp*.5);
    if(phaseShifted){
      run.turn=0;
      run.enemy.intent=chooseEnemyIntent(run.enemy,0);
      appendRunLog(run,`${run.enemy.name} entró en su segunda fase: ${definition.trait.name}. Su patrón cambió.`);
      rankedSound('warning');
    }
    let appliedStatus='';
    if(weapon?.onHitStatus&&Math.random()<(weapon.statusChance||0)){
      run.enemy.statuses[weapon.onHitStatus]=Math.max(run.enemy.statuses[weapon.onHitStatus],3);
      appliedStatus=weapon.onHitStatus;
      appendRunLog(run,`${weapon.name} aplicó ${STATUS_META[weapon.onHitStatus].label.toLowerCase()}.`);
      rankedSound('statusProc',weapon.onHitStatus);
    }
    advanceClassCooldown(run);
    if(!enemyCounter(run,{enemyDamage:damage,statusLabel:appliedStatus?STATUS_META[appliedStatus].label.toUpperCase():'',label:phaseShifted?'FASE II DESATADA':undefined})) commit(`${phaseShifted?'El jefe cambió de patrón. ':''}${run.lastEnemyAction} Enemigo ${run.enemy.hp}/${run.enemy.maxHp}, vos ${run.hp}/${run.maxHp}.`);
  }
  function runDefend(){
    const run=rankedState().activeRun;
    if(!run || run.phase!=='encounter') return;
    if(!tickOngoingStatuses(run)) return;
    run.guard=true;
    if(state.characterClass==='warrior'){
      run.counterReady=true;
      appendRunLog(run,'Alzaste la guardia del Guerrero: el próximo impacto será contraatacado.');
    }else appendRunLog(run,'Adoptaste una posición defensiva.');
    advanceClassCooldown(run);
    if(!enemyCounter(run)) commit(`${run.lastEnemyAction} Te quedan ${run.hp} puntos de vida.`);
  }
  function runClassSkill(){
    const data=rankedState();const run=data.activeRun;
    const kit=rankedClassKit();
    if(!run||run.phase!=='encounter'||!kit||run.classSkillCooldown>0) return;
    if(!tickOngoingStatuses(run)) return;
    const stats=playerRunStats(data);
    const classKey=state.characterClass;
    let damage=0;
    if(classKey==='warrior'){
      run.guard=true;
      run.counterReady=true;
      run.statuses.regen=Math.max(run.statuses.regen,1);
      appendRunLog(run,'Activaste Bastión: guardia, contraataque y regeneración breve.');
      rankedSound('classSkill','warrior');
    }else if(classKey==='archer'){
      const guarded=run.enemy.guard;
      for(let shot=0;shot<3;shot++) damage+=Math.max(1,Math.round((stats.attack+Math.floor(Math.random()*4))*.68));
      if(guarded) damage=Math.max(1,Math.floor(damage*.82));
      run.enemy.guard=false;
      run.enemy.hp=Math.max(0,run.enemy.hp-damage);
      run.enemy.statuses.bleed=Math.max(run.enemy.statuses.bleed,2);
      appendRunLog(run,`Ráfaga impactó tres veces por ${damage} de daño total y aplicó sangrado.`);
      rankedSound('classSkill','archer');
    }else if(classKey==='mage'){
      const charges=run.arcaneCharges||0;
      damage=Math.max(1,Math.round((stats.attack+3)*(1.55+charges*.40)));
      run.arcaneCharges=0;
      run.enemy.guard=false;
      run.enemy.hp=Math.max(0,run.enemy.hp-damage);
      if(charges>=3) run.enemy.statuses.stun=Math.max(run.enemy.statuses.stun,1);
      appendRunLog(run,`Nova Astral consumió ${charges} carga${charges===1?'':'s'} e infligió ${damage} de daño${charges>=3?'; el enemigo quedó aturdido':''}.`);
      rankedSound('classSkill','mage');
    }
    advanceClassCooldown(run);
    run.classSkillCooldown=kit.cooldown;
    rankedSound('impactAccent',state.characterClass,'heavy',classKey==='archer'?3:1);
    queueCombatFeedback('perk',{enemyDamage:damage,label:`${kit.icon} ${kit.skill}`,announcement:`${kit.skill} activada`});
    if(run.enemy.hp<=0){defeatEnemy(run,damage);return;}
    if(!enemyCounter(run,{enemyDamage:damage,label:kit.skill})) commit(`${run.lastEnemyAction} ${kit.skill} entra en recarga por ${run.classSkillCooldown} turnos.`);
  }
  function runLevelSkill(key){
    const data=rankedState();const run=data.activeRun;
    const ability=rankedLevelAbilities().find(entry=>entry.key===key);
    if(!run||run.phase!=='encounter'||!ability||state.level<ability.level) return;
    run.levelSkillCooldowns=run.levelSkillCooldowns||{};
    if((run.levelSkillCooldowns[key]||0)>0||interactionLocked) return;
    if(!tickOngoingStatuses(run)) return;
    const stats=playerRunStats(data);
    const guarded=run.enemy.guard;
    let damage=0;
    const hit=(power,ignoreGuard=false)=>{
      const raw=Math.max(1,Math.round((stats.attack+Math.floor(Math.random()*5))*power));
      const dealt=guarded&&!ignoreGuard?Math.max(1,Math.floor(raw*.5)):raw;
      run.enemy.hp=Math.max(0,run.enemy.hp-dealt);
      damage+=dealt;
      return dealt;
    };
    if(ability.effect==='shieldBash'){
      hit(.9);run.enemy.guard=false;run.enemy.statuses.stun=Math.max(run.enemy.statuses.stun,1);run.guard=true;appendRunLog(run,`Golpe de Escudo causó ${damage} de daño, aturdió y preparó cobertura.`);
    }else if(ability.effect==='ironFury'){
      run.guard=true;run.counterReady=true;run.statuses.regen=Math.max(run.statuses.regen,2);appendRunLog(run,'Furia de Hierro preparó cobertura, contraataque y 2 turnos de regeneración.');
    }else if(ability.effect==='colossus'){
      const execute=run.enemy.hp<=run.enemy.maxHp*.35;hit(execute?3.05:2.2,true);run.enemy.guard=false;appendRunLog(run,`Veredicto del Coloso causó ${damage} de daño${execute?' y ejecutó al objetivo debilitado':''}.`);
    }else if(ability.effect==='piercingArrow'){
      hit(1.3,true);run.enemy.guard=false;appendRunLog(run,`Flecha Perforante atravesó la defensa por ${damage} de daño.`);
    }else if(ability.effect==='bloodTrap'){
      hit(.72);run.enemy.statuses.stun=Math.max(run.enemy.statuses.stun,1);run.enemy.statuses.bleed=Math.max(run.enemy.statuses.bleed,4);appendRunLog(run,`Trampa de Sangre causó ${damage} de daño, aturdió y aplicó 4 turnos de sangrado.`);
    }else if(ability.effect==='arrowStorm'){
      for(let arrow=0;arrow<5;arrow++) hit(.46,arrow>0);run.enemy.guard=false;appendRunLog(run,`Tormenta de Flechas impactó 5 veces por ${damage} de daño total.`);
    }else if(ability.effect==='runicBolt'){
      hit(1.02);run.arcaneCharges=Math.min(3,(run.arcaneCharges||0)+1);appendRunLog(run,`Proyectil Rúnico causó ${damage} de daño y generó una carga arcana (${run.arcaneCharges}/3).`);
    }else if(ability.effect==='frostPrison'){
      hit(1.08);run.enemy.statuses.stun=Math.max(run.enemy.statuses.stun,1);run.guard=true;appendRunLog(run,`Prisión de Escarcha causó ${damage} de daño, aturdió y preparó cobertura.`);
    }else if(ability.effect==='cataclysm'){
      const charges=run.arcaneCharges||0;hit(2.15+charges*.55,true);run.arcaneCharges=0;run.enemy.guard=false;appendRunLog(run,`Cataclismo Astral consumió ${charges} carga${charges===1?'':'s'} y causó ${damage} de daño.`);
    }
    if(damage>0) run.enemy.guard=false;
    advanceClassCooldown(run);
    run.levelSkillCooldowns[key]=ability.cooldown;
    rankedSound('classSkill',state.characterClass);
    const skillHits=ability.effect==='arrowStorm'?5:1;
    const skillStatus=['shieldBash','bloodTrap','frostPrison'].includes(ability.effect)?'ATURDIDO':ability.effect==='bloodTrap'?'SANGRADO':'';
    rankedSound('impactAccent',state.characterClass,'heavy',skillHits);
    if(skillStatus) rankedSound('statusProc',ability.effect==='bloodTrap'?'bleed':'stun');
    queueCombatFeedback('perk',{enemyDamage:damage,statusLabel:ability.effect==='bloodTrap'?'ATURDIDO · SANGRADO':skillStatus,label:`${ability.icon} ${ability.label.toUpperCase()}`,announcement:`${ability.label}: ${damage} de daño`});
    if(run.enemy.hp<=0){defeatEnemy(run,damage);return;}
    if(!enemyCounter(run,{enemyDamage:damage,label:ability.label})) commit(`${run.lastEnemyAction} ${ability.label} entra en recarga por ${ability.cooldown} turnos.`);
  }
  function runPotion(){
    const data=rankedState();const run=data.activeRun;
    if(!run || run.phase!=='encounter') return;
    if(!tickOngoingStatuses(run)) return;
    const potionIndex=data.backpack.findIndex(item=>item.templateId==='field_potion');
    if(potionIndex<0){ commit('No llevás una Poción de campaña.'); return; }
    const potion=data.backpack[potionIndex];
    potion.qty-=1;
    if(potion.qty<=0) data.backpack.splice(potionIndex,1);
    const healed=Math.min(Core.template('field_potion').heal||34,run.maxHp-run.hp);
    run.hp+=healed;
    run.statuses.regen=Math.max(run.statuses.regen,2);
    appendRunLog(run,`Consumiste una poción y recuperaste ${healed} de vida.`);
    rankedSound('heal');
    advanceClassCooldown(run);
    if(!enemyCounter(run,{heal:healed})) commit(`${run.lastEnemyAction} La poción dejó regeneración activa. Vida: ${run.hp}/${run.maxHp}.`);
  }
  function collectFieldLoot(index){
    const data=rankedState();const run=data.activeRun;
    if(!run || run.phase!=='loot') return;
    const item=run.pendingLoot[index];
    if(!item) return;
    const spec=Core.template(item.templateId);
    let remaining=item.qty;
    let collected=0;
    data.backpack.filter(stack=>stack.templateId===item.templateId).forEach(stack=>{
      if(remaining<=0) return;
      const moved=Math.min(spec.maxStack-stack.qty,remaining);
      if(moved>0){stack.qty+=moved;remaining-=moved;collected+=moved;}
    });
    if(remaining>0){
      const fieldItem={...item,qty:remaining};
      const spot=Core.firstFit(data.backpack,fieldItem);
      if(spot){data.backpack.push({...fieldItem,...spot});collected+=remaining;remaining=0;}
    }
    run.lootValue+=collected*spec.value;
    if(collected>0){
      const manifestEntry=run.lootManifest.find(entry=>entry.templateId===item.templateId);
      if(manifestEntry) manifestEntry.qty+=collected;
      else run.lootManifest.push({templateId:item.templateId,qty:collected});
    }
    if(remaining<=0) run.pendingLoot.splice(index,1);
    else item.qty=remaining;
    if(collected<=0){ rankedSound('warning');commit(`No hay espacio para ${spec.name}. Reordená la mochila o dejalo atrás.`); return; }
    appendRunLog(run,`Recogiste ${collected} × ${spec.name}.`);
    if(spec.rankedArt?.startsWith('material-')) rankedSound('materialPickup',spec.rankedArt,spec.tier);
    else rankedSound('treasureOpen',spec.tier==='raro'||spec.tier==='epico');
    queueCombatFeedback('loot',{label:`+${collected} ${spec.name.toUpperCase()}`,announcement:`Recogiste ${collected} ${spec.name}`});
    commit(remaining>0?`Recogiste una parte; quedaron ${remaining} unidades sin espacio.`:`${spec.name} quedó guardado en la mochila.`);
  }
  function discardFieldLoot(index){
    const run=rankedState().activeRun;
    if(!run || run.phase!=='loot' || !run.pendingLoot[index]) return;
    const item=run.pendingLoot.splice(index,1)[0];
    appendRunLog(run,`Dejaste atrás ${Core.template(item.templateId).name}.`);
    rankedSound('click');
    commit('Objeto descartado. Ahora podés seguir organizando o decidir tu salida.');
  }
  function advanceRun(){
    const run=rankedState().activeRun;
    if(!run || run.phase!=='loot' || run.pendingLoot.length || run.sector>=4) return;
    run.sector+=1;
    run.turn=0;
    run.phase='encounter';
    run.enemy=createEnemy(run.territory,run.sector);
    appendRunLog(run,`Entraste al sector ${run.sector+1}: ${run.enemy.name}.`);
    rankedSound('routeReveal');
    if(run.sector===4){rankedSound('setScene','boss');rankedSound('bossPhase');}
    queueCombatFeedback('advance',{label:`SECTOR ${run.sector+1}`,announcement:`Avanzaste al sector ${run.sector+1}`});
    const definition=enemyDefinition(run.enemy.id);
    commit(`Sector ${run.sector+1}/5: ${run.enemy.name} · ${definition?.role||'criatura'}. Revisá su rasgo y anticipá el patrón.`);
  }
  function recoverActiveRun(){
    const current=state.rankedExtraction;
    if(!current?.activeRun) return;
    clearTimeout(feedbackTimer);
    combatFeedback=null;
    interactionLocked=false;
    state.rankedExtraction=Core.normalize(current);
    normalizedSource=state.rankedExtraction;
    recoveryMessage='PARTIDA RECUPERADA · TU PROGRESO NO CAMBIÓ';
    rankedSound('click');
    saveState();
    render(false);
    clearTimeout(recoveryTimer);
    recoveryTimer=setTimeout(()=>{
      recoveryMessage='';
      if(rankedState().activeRun) render(false);
    },1800);
  }
  function changeCraftQuantity(recipeId,delta){
    if(!Core.RECIPES[recipeId]) return;
    craftQuantities[recipeId]=Math.max(1,Math.min(10,(craftQuantities[recipeId]||1)+delta));
    rankedSound('click');
    render(true);
  }
  function performCraft(recipeId){
    const data=rankedState();
    const quantity=Math.max(1,Math.min(10,craftQuantities[recipeId]||1));
    const result=Core.craftRecipe(data,recipeId,quantity);
    if(!result.ok){
      rankedSound('warning');
      notice=result.reason==='locked'?'Todavía no descubriste esta receta.':result.reason==='stash_full'?'El alijo necesita espacio para recibir la pieza.':'No alcanzan los materiales del alijo para esa cantidad.';
      render(true);
      return;
    }
    const spec=Core.template(result.output);
    data.competition.seasonXp+=result.quantity*6;
    craftFeedback=result;
    clearTimeout(craftFeedbackTimer);
    rankedSound('forgeCraft',spec.kind,spec.tier);
    data.updatedAt=Date.now();
    notice=`Se fabricó ${result.outputQty} × ${spec.name} y el resultado fue enviado al alijo.`;
    saveState();
    render(true);
    craftFeedbackTimer=setTimeout(()=>{
      craftFeedback=null;
      app.querySelector('.ranked-craft-reveal')?.remove();
    },state.settings?.reducedMotion?700:1250);
  }
  function runBenchTest(type){
    const stats=playerRunStats(rankedState());
    if(type==='attack'){
      const average=(stats.attack+2.5).toFixed(1).replace('.0','');
      benchResult={type:'attack',icon:'⚔',label:'IMPACTO SOBRE EL MANIQUÍ',primary:`${stats.attack}–${stats.attack+5} DAÑO`,detail:`Promedio esperado: ${average} por ataque`};
      rankedSound('classAttack',state.characterClass);
    }else{
      const incoming=20;
      const received=Math.max(1,Math.floor(incoming*stats.guardFactor));
      benchResult={type:'defense',icon:'⬡',label:'PRUEBA DE COBERTURA',primary:`20 → ${received} DAÑO`,detail:`Mitigaste ${incoming-received} puntos · Vida total ${stats.maxHp}`};
      rankedSound('block');
    }
    render(true);
  }
  function handleAction(action){
    if(interactionLocked && action.startsWith('run-')) return;
    const found=selected();
    if(action==='back'){
      rankedSound('click');
      rankedSound('setScene','menu');
      document.body.classList.remove('ranked-hunt-open');
      document.querySelector('.nav-btn[data-sec="secHero"]')?.click();
    }else if(action==='view-inventory'){
      sanctuaryView='inventory';
      craftFeedback=null;
      notice='Inventario abierto. Prepará el equipo que vas a arriesgar.';
      rankedSound('click');
      render();
    }else if(action==='view-workshop'){
      sanctuaryView='workshop';
      selectedUid='';
      notice='Elegí una receta. Los materiales se descuentan del alijo al confirmar.';
      rankedSound('shopOpen');
      render();
    }else if(action==='view-rank'){
      sanctuaryView='rank';
      selectedUid='';
      notice='Progresión actualizada. Los resultados públicos se validan por separado en Supabase.';
      rankedSound('routeReveal');
      render();
      loadPublicRankedLeaderboard();
    }else if(action==='public-rank-refresh'){
      rankedSound('click');
      loadPublicRankedLeaderboard(true);
    }else if(action==='tutorial-open'){
      tutorialStep=0;
      rankedSound('click');
      render();
    }else if(action==='tutorial-next'){
      tutorialStep=Math.min(RANKED_TUTORIAL.length-1,tutorialStep+1);
      rankedSound('routeReveal');
      render();
    }else if(action==='tutorial-close'){
      tutorialStep=-1;
      rankedState().competition.tutorialSeen=true;
      rankedSound('reward');
      commit('Guía completada. Recordá: PR sube tu división; XP desbloquea recompensas y no se gasta.');
    }else if(action==='auto-sort'){
      const result=Core.autoSort(rankedState().backpack);
      rankedState().backpack=result.placed;
      rankedState().stash.push(...result.overflow);
      rankedSound('roll');
      commit(result.overflow.length?'Mochila ordenada; lo que no entró volvió al alijo.':'Mochila ordenada por tamaño y valor.');
    }else if(action==='stack-stash') stackStash();
    else if(action==='bench-attack') runBenchTest('attack');
    else if(action==='bench-defense') runBenchTest('defense');
    else if(action==='run-start') startRun();
    else if(action==='run-attack') runAttack();
    else if(action==='run-class-skill') runClassSkill();
    else if(action==='run-defend') runDefend();
    else if(action==='run-potion') runPotion();
    else if(action==='run-advance') advanceRun();
    else if(action==='run-extract') finishRun('extracted');
    else if(action==='run-recover') recoverActiveRun();
    else if(action==='result-inventory'){ resultVisible=false;sanctuaryView='inventory';notice='Inventario recuperado. Prepará la próxima incursión.';rankedSound('click');rankedSound('setScene','hunt');render(); }
    else if(action==='result-rank'){ resultVisible=false;sanctuaryView='rank';notice='Resultado aplicado. Revisá el estado de validación y la clasificación pública.';rankedSound('routeReveal');rankedSound('setScene','hunt');render();loadPublicRankedLeaderboard(); }
    else if(action==='test-loot') addTestLoot();
    else if(action==='test-defeat'){
      defeatArmed=true;
      notice='Advertencia: la mochila en riesgo se perderá. Tocá CONFIRMAR PÉRDIDA para simular la derrota.';
      render();
    }
    else if(action==='confirm-defeat') simulateDefeat();
    else if(!found) commit('Primero seleccioná un objeto.');
    else if(action==='equip') equipSelected(found);
    else if(action==='rotate') rotateSelected(found);
    else if(action==='to-stash') moveToStash(found);
    else if(action==='to-backpack') moveToBackpack(found);
    else if(action==='to-secure') moveToSecure(found);
  }
  app.addEventListener('click',event=>{
    const filterButton=event.target.closest('[data-craft-filter]');
    if(filterButton){recipeFilter=filterButton.dataset.craftFilter;rankedSound('click');render(true);return;}
    const missionButton=event.target.closest('[data-mission-id]');
    if(missionButton){
      const result=Core.claimMission(rankedState(),missionButton.dataset.missionId);
      if(result.ok){rankedSound('reward');commit(`Misión completada: +${result.rewardXp} XP de temporada.`);}
      else{rankedSound('warning');notice='Esa misión todavía no se puede reclamar.';render(true);}
      return;
    }
    const rewardButton=event.target.closest('[data-reward-level]');
    if(rewardButton){
      const result=Core.claimSeasonReward(rankedState(),Number(rewardButton.dataset.rewardLevel));
      if(result.ok){const spec=Core.template(result.reward.templateId);rankedSound('treasureOpen',spec.tier==='raro');commit(`Recompensa obtenida: ${result.reward.qty} × ${spec.name}. Se guardó en el alijo.`);}
      else{rankedSound('warning');notice=result.reason==='stash_full'?'El alijo necesita espacio para recibir esta recompensa.':'Esa recompensa todavía está bloqueada.';render(true);}
      return;
    }
    const craftQuantityButton=event.target.closest('[data-craft-qty]');
    if(craftQuantityButton){ changeCraftQuantity(craftQuantityButton.dataset.recipeId,Number(craftQuantityButton.dataset.craftQty));return; }
    const craftButton=event.target.closest('[data-craft-action="craft"]');
    if(craftButton){ performCraft(craftButton.dataset.recipeId);return; }
    const lootButton=event.target.closest('[data-loot-action]');
    if(lootButton){
      if(interactionLocked) return;
      const index=Number(lootButton.dataset.lootIndex);
      if(lootButton.dataset.lootAction==='collect') collectFieldLoot(index);
      else discardFieldLoot(index);
      return;
    }
    const levelSkillButton=event.target.closest('[data-level-skill]');
    if(levelSkillButton){runLevelSkill(levelSkillButton.dataset.levelSkill);return;}
    const action=event.target.closest('[data-action]')?.dataset.action;
    if(action){ handleAction(action); return; }
    const itemButton=event.target.closest('[data-uid]');
    if(itemButton){
      const target=locate(itemButton.dataset.uid);
      const source=selected();
      if(source && stackInto(source,target)) return;
      selectItem(itemButton.dataset.uid);return;
    }
    const cell=event.target.closest('.ranked-cell');
    if(cell){
      const found=selected();
      if(found) moveToBackpack(found,Number(cell.dataset.x),Number(cell.dataset.y));
    }
  });
  app.addEventListener('dragstart',event=>{
    const item=event.target.closest('[data-uid]');
    if(!item) return;
    selectedUid=item.dataset.uid;
    event.dataTransfer.setData('text/plain',selectedUid);
    event.dataTransfer.effectAllowed='move';
  });
  app.addEventListener('dragover',event=>{
    if(event.target.closest('.ranked-cell,[data-drop-container="stash"],[data-secure-index]')) event.preventDefault();
  });
  app.addEventListener('drop',event=>{
    const uid=event.dataTransfer.getData('text/plain') || selectedUid;
    const found=locate(uid);
    if(!found) return;
    event.preventDefault();
    const targetItem=event.target.closest('[data-uid]');
    if(targetItem && stackInto(found,locate(targetItem.dataset.uid))) return;
    const cell=event.target.closest('.ranked-cell');
    if(cell) moveToBackpack(found,Number(cell.dataset.x),Number(cell.dataset.y));
    else if(event.target.closest('[data-secure-index]')) moveToSecure(found,Number(event.target.closest('[data-secure-index]').dataset.secureIndex));
    else if(event.target.closest('[data-drop-container="stash"]')) moveToStash(found);
  });
  document.querySelectorAll('.nav-btn[data-sec]').forEach(button=>button.addEventListener('click',()=>{
    if(button.dataset.sec!=='secRankedHunt') document.body.classList.remove('ranked-hunt-open');
  }));

  function open(){
    document.body.classList.add('ranked-hunt-open');
    const data=rankedState();
    if(!data.activeRun&&!data.competition.tutorialSeen) tutorialStep=0;
    rankedSound('setScene',data.activeRun?(data.activeRun.sector===4?'boss':'battle'):'hunt');
    rankedSound('huntOpen');
    render();
  }
  window.RankedHunt={open,render};
})();
