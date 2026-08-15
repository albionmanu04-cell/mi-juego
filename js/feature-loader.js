/* Recursos pesados que no hacen falta para mostrar el acceso inicial. */
(function(){
  'use strict';
  /* La detección temprana evita que la pantalla de acceso pinte efectos caros
     antes de que se haya cargado la partida y su configuración. */
  const earlyMemory=Number(navigator.deviceMemory)||0;
  const earlyCores=Number(navigator.hardwareConcurrency)||0;
  const earlyLowEnd=!!(navigator.connection&&navigator.connection.saveData)
    || !!(window.matchMedia&&window.matchMedia('(update: slow)').matches)
    || (earlyMemory>0&&earlyMemory<=4)
    || (earlyCores>0&&earlyCores<=4);
  document.body.classList.toggle('performance-mode',earlyLowEnd);
  const GAME_STYLES=[
    'css/sections/03-navegacion.css',
    'css/sections/04-estructura-perfil-opciones.css',
    'css/sections/05-heroe-stats.css',
    'css/sections/06-combate-arena-caceria.css',
    'css/sections/07-pesca.css',
    'css/sections/08-equipo-inventario.css?v=2.20.16',
    'css/sections/09-combate-extra.css',
    'css/sections/10-combate-presentacion.css',
    'css/sections/11-gremio.css',
    'css/sections/13-optimizacion-rendimiento.css',
    'css/sections/16-asentamiento.css?v=2.20.16'
  ];
  const GAME_SCRIPTS=[
    'js/combat-loot.js?v=2.20.16',
    'js/combat-battle-monsters.js?v=2.20.16',
    'js/combat-battle-core.js?v=2.20.16',
    'js/combat-battle-vfx.js?v=2.20.16',
    'js/combat-battle-abilities.js?v=2.20.16',
    'js/combat-battle-turns.js?v=2.20.16',
    'js/combat-deck.js?v=2.20.16',
    'js/combat-run.js?v=2.20.16',
    'js/combat-run-render.js?v=2.20.16',
    'js/combat-render.js?v=2.20.16',
    'js/forge.js',
    'js/fishing.js',
    'js/settlement.js?v=2.20.16',
    'js/script-ui-core.js?v=2.20.16',
    'js/script-views.js?v=2.20.16',
    'js/script-trade.js?v=2.20.16',
    'js/script-shop.js?v=2.20.16',
    'js/script-render.js?v=2.20.16'
  ];
  let gameStylesPromise=null;
  let gameScriptsPromise=null;
  let cardHuntPromise=null;
  let rankedHuntPromise=null;

  function loadStyle(href,id){
    const existing=document.getElementById(id);
    if(existing) return existing.dataset.loaded==='true'
      ? Promise.resolve(existing)
      : new Promise((resolve,reject)=>{
          existing.addEventListener('load',()=>resolve(existing),{once:true});
          existing.addEventListener('error',reject,{once:true});
        });
    return new Promise((resolve,reject)=>{
      const link=document.createElement('link');
      link.id=id;
      link.rel='stylesheet';
      link.href=href;
      link.addEventListener('load',()=>{link.dataset.loaded='true';resolve(link);},{once:true});
      link.addEventListener('error',()=>{link.remove();reject(new Error(`No se pudo cargar ${href}`));},{once:true});
      document.head.appendChild(link);
    });
  }

  function loadScript(src,id){
    const existing=document.getElementById(id);
    if(existing) return existing.dataset.loaded==='true'
      ? Promise.resolve(existing)
      : new Promise((resolve,reject)=>{
          existing.addEventListener('load',()=>resolve(existing),{once:true});
          existing.addEventListener('error',reject,{once:true});
        });
    return new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.id=id;
      script.src=src;
      script.async=false;
      script.addEventListener('load',()=>{script.dataset.loaded='true';resolve(script);},{once:true});
      script.addEventListener('error',()=>{script.remove();reject(new Error(`No se pudo cargar ${src}`));},{once:true});
      document.body.appendChild(script);
    });
  }

  function loadGameStyles(){
    if(!gameStylesPromise){
      gameStylesPromise=Promise.all(GAME_STYLES.map((href,index)=>loadStyle(href,`game-style-${index}`)))
        .catch(error=>{gameStylesPromise=null;throw error;});
    }
    return gameStylesPromise;
  }

  function loadGameplayScripts(){
    if(!gameScriptsPromise){
      gameScriptsPromise=(async()=>{
        for(let index=0;index<GAME_SCRIPTS.length;index++){
          await loadScript(GAME_SCRIPTS[index],`game-script-${index}`);
        }
        return true;
      })().catch(error=>{gameScriptsPromise=null;throw error;});
    }
    return gameScriptsPromise;
  }

  function loadCardHunt(){
    if(window.CardHunt) return Promise.resolve(window.CardHunt);
    if(!cardHuntPromise){
      cardHuntPromise=Promise.all([
        loadStyle('css/sections/17-caceria-cartas.css?v=2.20.16','card-hunt-styles'),
        (async()=>{
          await loadScript('js/card-evolution.js?v=2.20.16','card-evolution-script');
          await loadScript('js/caceria-spire.js?v=2.20.16','card-hunt-script');
        })()
      ]).then(()=>{
        if(!window.CardHunt) throw new Error('Cacería no pudo inicializarse.');
        return window.CardHunt;
      }).catch(error=>{cardHuntPromise=null;throw error;});
    }
    return cardHuntPromise;
  }

  function loadRankedHunt(){
    if(window.RankedHunt) return Promise.resolve(window.RankedHunt);
    if(!rankedHuntPromise){
      rankedHuntPromise=Promise.all([
        loadStyle('css/sections/18-caceria-ranked.css?v=2.20.16','ranked-hunt-styles'),
        (async()=>{
          await loadScript('js/ranked-inventory-core.js?v=2.20.16','ranked-inventory-core-script');
          await loadScript('js/caceria-ranked.js?v=2.20.16','ranked-hunt-script');
        })()
      ]).then(()=>{
        if(!window.RankedHunt) throw new Error('Cacería Ranked no pudo inicializarse.');
        return window.RankedHunt;
      }).catch(error=>{rankedHuntPromise=null;throw error;});
    }
    return rankedHuntPromise;
  }

  window.FeatureLoader={loadGameStyles,loadGameplayScripts,loadCardHunt,loadRankedHunt};
  const cardNav=document.querySelector('.nav-btn[data-sec="secCardHunt"]');
  cardNav?.addEventListener('click',async()=>{
    cardNav.setAttribute('aria-busy','true');
    try{
      const feature=await loadCardHunt();
      feature?.open?.();
    }catch(error){
      console.error('No se pudo abrir Cacería.',error);
      const app=document.getElementById('cardSpireApp');
      if(app) app.innerHTML='<div class="panel"><h3>Cacería no disponible</h3><p>No se pudo cargar este modo. Revisá tu conexión e intentá nuevamente.</p></div>';
    }finally{
      cardNav.removeAttribute('aria-busy');
    }
  });
  const rankedNav=document.querySelector('.nav-btn[data-sec="secRankedHunt"]');
  rankedNav?.addEventListener('click',async()=>{
    rankedNav.setAttribute('aria-busy','true');
    try{
      const feature=await loadRankedHunt();
      feature?.open?.();
    }catch(error){
      console.error('No se pudo abrir Cacería Ranked.',error);
      const rankedApp=document.getElementById('rankedHuntApp');
      if(rankedApp) rankedApp.innerHTML='<div class="panel"><h3>Cacería Ranked no disponible</h3><p>No se pudo cargar el inventario de extracción. Intentá nuevamente.</p></div>';
    }finally{
      rankedNav.removeAttribute('aria-busy');
    }
  });
})();
