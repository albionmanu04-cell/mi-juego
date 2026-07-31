/* ================= SCRIPT-SHOP.JS =================
   Tienda y equipamiento. Sexta parte de lo que antes era script.js.
   ================================================================= */

/* ================= TIENDA Y EQUIPAMIENTO ================= */
function ensureShop(){
  const now = Date.now();
  if(!state.shop || state.shop.version !== 5 || now - state.shop.generatedAt >= SHOP_ROTATION_MS){
    const inStock = {};
    const activeSetId = state.subclass ? `subclass-${state.characterClass}-${state.subclass}` : `class-${state.characterClass}`;
    const classItems = SHOP_EQUIPMENT_ITEMS.filter(it=>it.setId===activeSetId);
    const offered = {};
    Object.keys(CLASS_EQUIPMENT_SLOTS[state.characterClass] || {}).forEach(slot=>{
      const universalItems = UNIVERSAL_EQUIPMENT_ITEMS.filter(item=>item.type===slot);
      const specialistItems = classItems.filter(item=>item.type===slot);
      const candidates = Math.random()<.26 ? universalItems : specialistItems;
      if(!candidates.length) return;
      let roll = Math.random();
      let rarityKey = 'common';
      for(const key of RARITY_PROGRESS_ORDER){
        roll -= ITEM_RARITIES[key].chance;
        if(roll<=0){ rarityKey = key; break; }
      }
      const item = candidates.find(entry=>entry.rarityKey===rarityKey) || candidates.find(entry=>entry.rarityKey==='common') || candidates[0];
      offered[slot] = item.id;
      inStock[item.id] = true;
    });
    state.shop = { version:5, generatedAt: now, inStock, offered };
    saveState();
  }
}

/* ================= OPCIONES Y AJUSTES VISUALES ================= */
function applyVisualSettings(){
  const settings = state.settings || {};
  document.body.classList.toggle('graphics-medium', settings.graphics === 'medium');
  document.body.classList.toggle('graphics-low', settings.graphics === 'low');
  document.body.classList.toggle('reduce-motion', !!settings.reducedMotion);
  if(Sound){
    Sound.musicEnabled = !!settings.musicEnabled;
    Sound.applyVolumes();
    Sound.updateMusicControl();
  }
}

/**
 * Punto de entrada de la pestaña de Opciones: delega todo el renderizado a
 * `renderOptionsHub()` (el hub por categorías: audio/imagen/sistema, abajo
 * en este archivo). Se mantiene como función separada solo porque el resto
 * del código llama a `renderOptions()` por nombre.
 */
function renderOptions(){
  return renderOptionsHub();
}

/* ================= AUXILIARES DEL HUB DE PERFIL =================
   Estas funciones vivían solo en el script.js viejo (monolítico) y se
   habían perdido al dividir el archivo: renderProfileHub() las necesita
   para calcular antigüedad del aventurero, nivel de prestigio, el marco
   decorativo del retrato y los anillos de progreso (logros/colección). */
function adventurerDaysSince(){
  const started = finiteNumber(state.createdAt, Date.now());
  const days = Math.floor((Date.now() - started) / 86400000);
  return Math.max(0, days);
}
function adventurerTenureLabel(){
  const days = adventurerDaysSince();
  if(days <= 0) return 'Aventurero desde hoy';
  if(days === 1) return 'Aventurero desde hace 1 día';
  return `Aventurero desde hace ${days} días`;
}
function profileHubStats(){
  const catalog = bestiaryCatalog();
  const completed = ACHIEVEMENTS.filter(a=>a.check(state));
  return {
    catalog,
    completed,
    discovered:catalog.filter(form=>state.bestiary && state.bestiary[form.type || form.name]).length,
    equipped:Object.values(state.equipment||{}).filter(Boolean).length,
    expNeed:expToNext(state.level),
    runActive:!!(runState && runState.phase!=='ended')
  };
}

const PRESTIGE_TITLES = [
  { key:'common',    min:0,  label:'Aventurero Novato',       frameLevel:1 },
  { key:'uncommon',  min:12, label:'Explorador del Bastión',  frameLevel:1 },
  { key:'rare',      min:28, label:'Caza-Recompensas',        frameLevel:2 },
  { key:'epic',      min:45, label:'Guardián Temido',         frameLevel:2 },
  { key:'legendary', min:62, label:'Azote del Bastión',       frameLevel:3 },
  { key:'mythic',    min:78, label:'Leyenda Viviente',        frameLevel:3 },
  { key:'unique',    min:90, label:'Campeón Eterno',          frameLevel:4 },
  { key:'ancestral', min:97, label:'Leyenda Ancestral',       frameLevel:4 }
];
function playerPrestigeTier(){
  const levelPct = Math.min(1, (state.maxLevelEver||state.level||0) / LEVEL_CAP);
  const resetPct = Math.min(1, (state.resets||0) / 10);
  const completedCount = ACHIEVEMENTS.filter(a=>a.check(state)).length;
  const achPct = ACHIEVEMENTS.length ? completedCount / ACHIEVEMENTS.length : 0;
  const score = (levelPct*0.4 + resetPct*0.3 + achPct*0.3) * 100;
  let tier = PRESTIGE_TITLES[0];
  for(const t of PRESTIGE_TITLES){ if(score >= t.min) tier = t; }
  const meta = ITEM_RARITIES[tier.key] || ITEM_RARITIES.common;
  return { key:tier.key, label:tier.label, color:meta.color, glow:meta.glow, score, frameLevel:tier.frameLevel };
}

function classFrameOrnaments(level){
  const gems = level>=2 ? `<span class="frame-gem tl"></span><span class="frame-gem tr"></span><span class="frame-gem bl"></span><span class="frame-gem br"></span>` : '';
  const ring = level>=3 ? `<svg class="frame-ring" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="47"></circle>${Array.from({length:16}).map((_,i)=>`<line x1="50" y1="2" x2="50" y2="7" transform="rotate(${i*22.5} 50 50)"></line>`).join('')}</svg>` : '';
  return ring + gems;
}

function hubProgressRing(current,total,icon){
  const pct = total>0 ? Math.max(0,Math.min(100, current/total*100)) : 0;
  const r = 27, c = 2*Math.PI*r;
  const offset = c * (1 - pct/100);
  return `<span class="hub-ring"><svg viewBox="0 0 64 64" aria-hidden="true"><circle class="ring-track" cx="32" cy="32" r="${r}"></circle><circle class="ring-fill" cx="32" cy="32" r="${r}" style="stroke-dasharray:${c.toFixed(2)};stroke-dashoffset:${offset.toFixed(2)};--ring-offset:${offset.toFixed(2)};--ring-c:${c.toFixed(2)}"></circle></svg><span class="hub-icon">${icon}</span><span class="hub-ring-pct">${Math.round(pct)}%</span></span>`;
}

const HUB_PARTICLES = [
  {x:'6%',y:'82%',size:'3px',dur:'8.5s',delay:'0s'},
  {x:'17%',y:'22%',size:'2px',dur:'10s',delay:'1.2s'},
  {x:'32%',y:'68%',size:'3px',dur:'9.5s',delay:'2.8s'},
  {x:'48%',y:'12%',size:'2px',dur:'11s',delay:'.4s'},
  {x:'63%',y:'75%',size:'2px',dur:'9s',delay:'3.6s'},
  {x:'78%',y:'30%',size:'3px',dur:'10.5s',delay:'1.9s'},
  {x:'90%',y:'60%',size:'2px',dur:'8s',delay:'2.3s'}
];
function hubParticlesHTML(){
  return `<div class="hub-particles" aria-hidden="true">${HUB_PARTICLES.map(p=>`<span style="--x:${p.x};--y:${p.y};--size:${p.size};--dur:${p.dur};--delay:${p.delay}"></span>`).join('')}</div>`;
}

/**
 * Dibuja el panel de perfil (hub) del héroe: resumen de nivel/clase/gremio,
 * antigüedad, prestigio, y accesos a las sub-vistas de perfil
 * (`activeProfileView`: home/detailed_stats/achievements/etc.) dentro de
 * #profileContent. `renderProfile()` en script-views.js es solo un
 * delegador de una línea a esta función — llamalas indistintamente.
 */
function renderProfileHub(){
  const box=document.getElementById('profileContent');
  if(!box || !state) return;
  const hero=currentClass();
  const style=activeHeroAppearance();
  const data=profileHubStats();
  const prestige = playerPrestigeTier();
  const cardCatalog=window.CardCodex?.catalog?.(state.characterClass)||[];
  const cardDiscovered=new Set(window.CardCodex?.discovered?.(state.characterClass)||[]);
  const cardFound=cardCatalog.filter(card=>cardDiscovered.has(card.key)).length;
  const home = activeProfileView==='home';
  box.className='panel hub-shell profile-hall profile-v2-root';
  box.style.setProperty('--profile-glow', style.glow || '#e8c477');
  const particles = hubParticlesHTML();
  const head = `<div class="hub-head"><div class="hub-emblem ${style.isSubclass?'has-subclass-art':''}">${style.isSubclass&&style.image?`<img src="${style.image}" alt="${style.label}" decoding="async">`:hero.icon}</div><h2>${home?'EL SANTUARIO DEL AVENTURERO':escapeHtml(state.name)}</h2><p>${home?'Elegí qué parte de tu leyenda querés consultar. Cada registro tiene su propio espacio.':`${style.baseLabel} · ${style.label} · Nivel ${state.level} · ${style.weapon}`}</p>${home?`<span class="hub-identity" style="--prestige-color:${prestige.color}">${classEmblem(state.characterClass)} ${escapeHtml(state.name)} · <b>${style.isSubclass?style.label+' · ':''}${prestige.label}</b> · Poder ${Math.round(power())}</span>`:''}</div>`;
  if(home){
    const expPct=state.level>=LEVEL_CAP?100:Math.max(0,Math.min(100,finiteNumber(state.exp)/Math.max(1,data.expNeed)*100));
    const portrait=style.image||hero.image||'';
    box.innerHTML = `${particles}<section class="profile-v2-home">
      <header class="profile-v2-topbar">
        <div><small>ARCHIVO PERSONAL</small><strong>SANTUARIO DEL AVENTURERO</strong></div>
        <div class="profile-v2-top-actions">
          <span class="profile-v2-save">◆ PROGRESO PROTEGIDO</span>
          <button type="button" data-profile-action="hero">VOLVER AL JUEGO →</button>
        </div>
      </header>
      <div class="profile-v2-stage">
        <article class="profile-v2-showcase">
          <div class="profile-v2-aura" aria-hidden="true"></div>
          <div class="profile-v2-character">
            ${portrait?`<img class="${style.paperDoll?'paperdoll-profile-art':''}" src="${portrait}" alt="${escapeHtml(style.label)}" decoding="async">`:`<span>${hero.icon}</span>`}
            ${(style.paperDollLayers||[]).map(layer=>`<img class="profile-paperdoll-layer profile-paperdoll-layer-${layer.slot}" src="${layer.image}" alt="" decoding="async">`).join('')}
            <i class="profile-v2-level">${state.level}</i>
          </div>
          <div class="profile-v2-legend">
            <span class="profile-v2-kicker">✦ ${escapeHtml(style.baseLabel)}${style.isSubclass?` · ${escapeHtml(style.label)}`:''}</span>
            <span class="profile-appearance-tag"><small>ASPECTO ACTUAL</small><b>${escapeHtml(style.appearanceLabel)}</b></span>
            <h1>${escapeHtml(state.name)}</h1>
            <p>${escapeHtml(style.isSubclass?style.description:hero.description)}</p>
            <div class="profile-v2-exp-head"><span>NIVEL ${state.level}</span><b>${state.level>=LEVEL_CAP?'NIVEL MÁXIMO':`${Math.floor(finiteNumber(state.exp))} / ${data.expNeed} EXP`}</b></div>
            <div class="profile-v2-exp"><i style="width:${expPct}%"></i></div>
            <div class="profile-v2-quickstats">
              <span><small>PODER</small><b>${Math.round(power())}</b></span>
              <span><small>ORO</small><b>${Math.floor(finiteNumber(state.gold))}</b></span>
              <span><small>RENACERES</small><b>${state.resets||0}</b></span>
            </div>
          </div>
        </article>
        <nav class="profile-v2-destinations" aria-label="Apartados del perfil">
          <button class="profile-v2-destination featured" data-profile-view="identity" style="--profile-accent:#e6b958">
            <span class="profile-v2-dest-icon">♜</span><span><small>IDENTIDAD</small><b>MI FICHA</b><em>Clase, historia, nivel y equipamiento característico.</em></span><i>01</i>
          </button>
          <button class="profile-v2-destination featured" data-profile-view="progress" style="--profile-accent:#e87943">
            <span class="profile-v2-dest-icon">✦</span><span><small>TRAYECTORIA</small><b>PROGRESO</b><em>Victorias, profundidad, racha y próximos objetivos.</em></span><i>${state.totalWins||0}</i>
          </button>
          <button class="profile-v2-destination" data-profile-view="achievements" style="--profile-accent:#e9c963">
            ${hubProgressRing(data.completed.length,ACHIEVEMENTS.length,'♛')}<span><small>LEGADO</small><b>LOGROS</b><em>${data.completed.length} de ${ACHIEVEMENTS.length} hitos completados.</em></span><i>03</i>
          </button>
          <button class="profile-v2-destination" data-profile-view="collection" style="--profile-accent:#62c99a">
            ${hubProgressRing(data.discovered,data.catalog.length,'◈')}<span><small>ARCHIVO</small><b>COLECCIÓN</b><em>${data.discovered} de ${data.catalog.length} criaturas registradas.</em></span><i>04</i>
          </button>
          <button class="profile-v2-destination card-codex-entry" data-profile-view="cards" style="--profile-accent:#c38cff">
            ${hubProgressRing(cardFound,Math.max(1,cardCatalog.length),'✦')}<span><small>ARSENAL DE ${escapeHtml(style.baseLabel)}</small><b>CÓDICE DE CARTAS</b><em>${cardFound} de ${cardCatalog.length} cartas descubiertas durante tus cacerías.</em></span><i>05</i>
          </button>
          <button class="profile-v2-destination compact" data-profile-action="hero" style="--profile-accent:#6aaed1">
            <span class="profile-v2-dest-icon">🛡</span><span><b>HÉROE Y EQUIPO</b><em>${data.equipped}/7 piezas equipadas.</em></span><i>→</i>
          </button>
          <button class="profile-v2-destination compact" data-profile-action="characters" style="--profile-accent:#b889e4">
            <span class="profile-v2-dest-icon">♟</span><span><b>PERSONAJES</b><em>Administrá tus aventureros.</em></span><i>→</i>
          </button>
        </nav>
      </div>
      <footer class="profile-v2-footer"><span>ARMA CARACTERÍSTICA · <b>${escapeHtml(style.weapon)}</b></span><span>${escapeHtml(prestige.label)} · ${adventurerTenureLabel()}</span></footer>
    </section>`;
  } else if(activeProfileView==='identity'){
    const pct=state.level>=LEVEL_CAP?100:Math.max(0,Math.min(100,finiteNumber(state.exp)/Math.max(1,data.expNeed)*100));
    box.innerHTML=`${particles}${head}<section class="hub-detail"><button class="hub-back" data-profile-back>← VOLVER AL PERFIL</button><div class="hub-detail-portrait"><div class="class-frame frame-lv${prestige.frameLevel}" style="--prestige-color:${prestige.color}">${classFrameOrnaments(prestige.frameLevel)}<img src="${style.image}" alt="${style.label}" decoding="async"><span class="class-frame-level" title="Nivel">${state.level}</span></div><div class="hub-detail-copy"><b>${escapeHtml(state.name)}</b><div class="prestige-title" style="--prestige-color:${prestige.color}">✦ ${style.isSubclass?`${style.baseLabel} · ${style.label} · `:''}${prestige.label}</div><p>${style.isSubclass?style.description:hero.description}</p><p>Arma característica: <b>${style.weapon}</b></p><p class="hub-tenure">⏳ ${adventurerTenureLabel()}</p><div class="profile-exp"><span>NIVEL ${state.level}</span><span>${state.level>=LEVEL_CAP?'NIVEL MÁXIMO':`${Math.floor(finiteNumber(state.exp))} / ${data.expNeed} EXP`}</span><div class="bar exp"><div style="width:${pct}%"></div></div></div></div></div><div class="hub-detail-grid"><div class="hub-detail-stat" style="--stat-color:#e8622c"><small>PODER</small><b>${Math.round(power())}</b></div><div class="hub-detail-stat" style="--stat-color:#e8c477"><small>ORO</small><b>${Math.floor(finiteNumber(state.gold))}</b></div><div class="hub-detail-stat" style="--stat-color:#5fb0dd"><small>RESETS</small><b>${state.resets||0}</b></div></div><div class="hub-action-row"><button data-profile-action="hero">ABRIR HÉROE Y EQUIPO</button><button class="profile-secondary" data-profile-action="characters">CAMBIAR PERSONAJE</button></div></section>`;
  } else if(activeProfileView==='progress'){
    const pendingAch = ACHIEVEMENTS.filter(a=>!a.check(state)).slice(0,3);
    const nextQuestHTML = pendingAch.length
      ? `<div class="next-quest-panel"><h4>✦ PRÓXIMA LEYENDA</h4><div class="next-quest-list">${pendingAch.map(a=>`<div class="next-quest-item"><span class="next-quest-mark">${achievementGlyph(a.id)}</span><span>${escapeHtml(a.label)}</span></div>`).join('')}</div></div>`
      : `<div class="next-quest-panel done"><h4>✦ PRÓXIMA LEYENDA</h4><p>Completaste todos los hitos disponibles. Tu leyenda no tiene techo.</p></div>`;
    box.innerHTML=`${particles}${head}<section class="hub-detail"><button class="hub-back" data-profile-back>← VOLVER AL PERFIL</button><h3 class="hub-detail-title">PROGRESO DE EXPEDICIÓN</h3><p class="hub-detail-sub">Los hitos que definen el camino de tu aventurero.</p><div class="hub-detail-grid"><div class="hub-detail-stat" style="--stat-color:#e8622c"><small>VICTORIAS</small><b>${state.totalWins||0}</b></div><div class="hub-detail-stat" style="--stat-color:#ef6666"><small>GUARDIANES</small><b>${state.totalBossWins||0}</b></div><div class="hub-detail-stat" style="--stat-color:#7bc9c9"><small>MEJOR PROFUNDIDAD</small><b>${state.maxHuntDepth||0}</b></div><div class="hub-detail-stat" style="--stat-color:#5fb0dd"><small>RESETS</small><b>${state.resets||0}</b></div><div class="hub-detail-stat" style="--stat-color:#7bc981"><small>DISPONIBLES</small><b>${availableStatResets()}</b></div><div class="hub-detail-stat" style="--stat-color:#ff8445"><small>RACHA</small><b>${winStreak}</b></div></div>${nextQuestHTML}<div class="profile-run-badge">${data.runActive?`⚔ Expedición en curso · profundidad ${runState.depth}`:'✦ No hay expedición activa. Podés preparar una nueva cacería.'}</div><div class="hub-action-row"><button data-profile-action="hunt">IR A CACERÍA</button></div></section>`;
  } else if(activeProfileView==='achievements'){
    box.innerHTML=`${particles}${head}<section class="hub-detail"><button class="hub-back" data-profile-back>← VOLVER AL PERFIL</button><h3 class="hub-detail-title">SALÓN DE LOGROS</h3><p class="hub-detail-sub">${data.completed.length} de ${ACHIEVEMENTS.length} hitos completados.</p><div class="hub-detail-list">${ACHIEVEMENTS.map(a=>{const done=a.check(state),claimed=!!state.achievementsClaimed[a.id];return `<div class="profile-achievement ${done?'done':''}"><span class="achievement-mark">${achievementGlyph(a.id)}</span><div><b>${escapeHtml(a.label)}</b><small>${done?(claimed?'Recompensa reclamada':'Disponible para reclamar en Gremio'):'Aún no completado'}</small></div><span class="achievement-status">${done?'✓':'—'}</span></div>`;}).join('')}</div><div class="hub-action-row"><button data-profile-action="guild">ABRIR LOGROS DEL GREMIO</button></div></section>`;
  } else if(activeProfileView==='collection'){
    const materials=state.materials||{};
    box.innerHTML=`${particles}${head}<section class="hub-detail"><button class="hub-back" data-profile-back>← VOLVER AL PERFIL</button><h3 class="hub-detail-title">COLECCIÓN DEL VIAJERO</h3><p class="hub-detail-sub">Registros de criaturas, piezas equipadas y materiales de forja.</p><div class="hub-detail-grid"><div class="hub-detail-stat" style="--stat-color:#7bc981"><small>BESTIARIO</small><b>${data.discovered}/${data.catalog.length}</b></div><div class="hub-detail-stat" style="--stat-color:#b9c4d6"><small>EQUIPO</small><b>${data.equipped}/7</b></div><div class="hub-detail-stat" style="--stat-color:#9fd3f0"><small>ESENCIA</small><b>${Math.floor(finiteNumber(materials.essence))}</b></div><div class="hub-detail-stat" style="--stat-color:#c58bff"><small>NÚCLEOS</small><b>${Math.floor(finiteNumber(materials.bossCore))}</b></div><div class="hub-detail-stat" style="--stat-color:#e8c477"><small>PIEZAS</small><b>${(state.ownedEquipment||[]).length}</b></div><div class="hub-detail-stat" style="--stat-color:#e0796a"><small>TROFEOS</small><b>${Object.keys(materials.bossTrophies||{}).length}</b></div></div><div class="hub-action-row"><button data-profile-action="guild">ABRIR BESTIARIO</button><button data-profile-action="hero">VER EQUIPO</button><button data-profile-action="forge">IR A HERRERÍA</button></div></section>`;
  } else {
    const families=['TODAS',...new Set(cardCatalog.map(card=>card.family||'OTRAS'))];
    const classLabel=escapeHtml(style.baseLabel||hero.label||'AVENTURERO');
    const percent=cardCatalog.length?Math.round(cardFound/cardCatalog.length*100):0;
    const cardsHTML=cardCatalog.map((card,index)=>{
      const found=cardDiscovered.has(card.key);
      const family=escapeHtml(card.family||'OTRAS');
      const art=card.art?`<img src="assets/images/cards/${escapeHtml(card.art)}" alt="${found?escapeHtml(card.name):'Carta desconocida'}" loading="lazy" decoding="async">`:`<span class="card-codex-glyph">${found?escapeHtml(card.icon||'✦'):'?'}</span>`;
      return `<article class="card-codex-card ${found?'discovered':'locked'}" data-card-family="${family}" style="--card-index:${index}">
        <div class="card-codex-art">${art}<span class="card-codex-lock">${found?'':'◆'}</span></div>
        <div class="card-codex-meta"><span>${found?escapeHtml(card.rarity||card.family||'CARTA'):'REGISTRO OCULTO'}</span><i>${String(index+1).padStart(2,'0')}</i></div>
        <h4>${found?escapeHtml(card.name):'CARTA DESCONOCIDA'}</h4>
        <p>${found?escapeHtml(card.desc||'Carta registrada.'):'Encontrala en una mano, recompensa o tienda de la Cacería.'}</p>
        <footer><b>${found?family:'???'}</b><em>${found?(card.mana?`${Math.round(card.mana)} MANÁ`:(String(card.tag||'').toUpperCase()==='TÁCTICA'?'TÁCTICA':'GRATIS')):'BLOQUEADA'}</em></footer>
      </article>`;
    }).join('');
    box.innerHTML=`${particles}${head}<section class="hub-detail card-codex-view">
      <button class="hub-back" data-profile-back>← VOLVER AL PERFIL</button>
      <header class="card-codex-header">
        <div><small>ARCHIVO DE COMBATE · ${classLabel}</small><h3>CÓDICE DE CARTAS</h3><p>Las cartas toman color al encontrarlas por primera vez en una cacería.</p></div>
        <div class="card-codex-progress"><strong>${cardFound}<span>/${cardCatalog.length}</span></strong><small>DESCUBIERTAS</small></div>
      </header>
      <div class="card-codex-meter"><i style="width:${percent}%"></i><span>${percent}% COMPLETADO</span></div>
      <nav class="card-codex-filters" aria-label="Filtrar cartas">${families.map((family,index)=>`<button class="${index===0?'active':''}" data-card-filter="${escapeHtml(family)}">${escapeHtml(family)}</button>`).join('')}</nav>
      <div class="card-codex-grid">${cardsHTML||'<div class="card-codex-empty">Esta clase todavía no posee cartas registradas.</div>'}</div>
      <aside class="card-codex-hint"><span>◆</span><div><b>¿CÓMO SE DESCUBREN?</b><p>Entrá a Cacería. Una carta queda registrada al aparecer en tu mano o entre las ofertas del Mercader.</p></div></aside>
      <div class="hub-action-row"><button data-profile-action="hunt">EXPLORAR EN CACERÍA →</button></div>
    </section>`;
  }
  const frameEl = box.querySelector('.class-frame');
  if(frameEl){
    const canParallax = window.matchMedia('(pointer:fine)').matches && !document.body.classList.contains('reduce-motion') && !document.body.classList.contains('graphics-low');
    if(canParallax){
      frameEl.addEventListener('mousemove', event=>{
        const rect = frameEl.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width - 0.5;
        const py = (event.clientY - rect.top) / rect.height - 0.5;
        frameEl.style.transform = `rotateY(${(px*14).toFixed(2)}deg) rotateX(${(-py*14).toFixed(2)}deg)`;
      });
      frameEl.addEventListener('mouseleave', ()=>{ frameEl.style.transform = ''; });
    }
  }
  box.querySelectorAll('[data-profile-view]').forEach(button=>button.addEventListener('click',()=>{ activeProfileView=button.dataset.profileView; Sound.click(); renderProfileHub(); }));
  box.querySelectorAll('[data-card-filter]').forEach(button=>button.addEventListener('click',()=>{
    const filter=button.dataset.cardFilter;
    box.querySelectorAll('[data-card-filter]').forEach(item=>item.classList.toggle('active',item===button));
    box.querySelectorAll('[data-card-family]').forEach(card=>card.hidden=filter!=='TODAS' && card.dataset.cardFamily!==filter);
    Sound.click();
  }));
  box.querySelectorAll('[data-profile-back]').forEach(button=>button.addEventListener('click',()=>{ activeProfileView='home'; Sound.click(); renderProfileHub(); }));
  box.querySelectorAll('[data-profile-action]').forEach(button=>button.addEventListener('click',()=>{ const action=button.dataset.profileAction; if(action==='characters'){ document.getElementById('charactersBtn').click(); return; } const section={hero:'secHero',guild:'secGuild',forge:'secForge',hunt:'secCardHunt'}[action]; if(section) document.querySelector(`.nav-btn[data-sec="${section}"]`)?.click(); }));
}

function renderOptionsHub(){
  const box=document.getElementById('settingsContent');
  if(!box || !state) return;
  const s=state.settings||{};
  const home=activeOptionsView==='home';
  const head=`<div class="hub-head"><div class="hub-emblem">⚙</div><h2>${home?'OPCIONES':activeOptionsView==='audio'?'AUDIO':activeOptionsView==='visual'?'IMAGEN Y COMODIDAD':'SISTEMA'}</h2><p>${home?'Configurá tu experiencia por categorías, sin llenar una sola pantalla de controles.':'Ajustes guardados para este personaje.'}</p></div>`;
  if(home){
    box.innerHTML=`${head}<div class="hub-menu"><button class="hub-tile primary" data-options-view="audio" style="--hub-color:#c9954e"><span class="hub-icon">♫</span><b>AUDIO</b><small>Música de ambiente, efectos de combate y volumen general.</small><span class="hub-pill">${s.musicEnabled?'MÚSICA ACTIVA':'MÚSICA EN PAUSA'}</span></button><button class="hub-tile primary" data-options-view="visual" style="--hub-color:#d5af60"><span class="hub-icon">✦</span><b>IMAGEN Y COMODIDAD</b><small>Calidad gráfica, rendimiento y reducción de animaciones.</small><span class="hub-pill">CALIDAD ${String(s.graphics||'high').toUpperCase()}</span></button><button class="hub-tile" data-options-view="system" style="--hub-color:#a97c4d"><span class="hub-icon">⛶</span><b>MODO JUEGO</b><small>Vista amplia y prueba de sonido</small></button><button class="hub-tile" data-options-view="system" style="--hub-color:#bf7042"><span class="hub-icon">↺</span><b>RESTAURAR</b><small>Volvé a la configuración original</small></button></div>`;
  } else if(activeOptionsView==='audio'){
    const musicOn=!!s.musicEnabled, sfxOn=s.sfxEnabled!==false;
    box.innerHTML=`${head}<section class="hub-detail settings-detail"><button class="hub-back" data-options-back>← VOLVER A OPCIONES</button><section class="settings-group"><h4>Audio</h4><div class="setting-row"><div class="setting-label"><b>♫ Música</b><small>Ambiente del menú y combate</small></div><input class="settings-range" id="musicVolume" type="range" min="0" max="100" value="${s.musicVolume}"><output id="musicVolumeValue">${s.musicVolume}%</output></div><div class="setting-row"><div class="setting-label"><b>✦ Efectos</b><small>Golpes, recompensas y avisos</small></div><input class="settings-range" id="sfxVolume" type="range" min="0" max="100" value="${s.sfxVolume}"><output id="sfxVolumeValue">${s.sfxVolume}%</output></div><div class="settings-switch"><span>Música en segundo plano</span><button id="musicEnabledBtn" class="${musicOn?'active':''}">${musicOn?'ACTIVADA':'SILENCIADA'}</button></div><div class="settings-switch"><span>Efectos de sonido</span><button id="sfxEnabledBtn" class="${sfxOn?'active':''}">${sfxOn?'ACTIVADOS':'SILENCIADOS'}</button></div></section><div class="hub-action-row"><button id="testSoundBtn">✦ PROBAR SONIDO</button></div></section>`;
  } else if(activeOptionsView==='visual'){
    box.innerHTML=`${head}<section class="hub-detail settings-detail"><button class="hub-back" data-options-back>← VOLVER A OPCIONES</button><section class="settings-group"><h4>Imagen y comodidad</h4><div class="setting-label" style="margin-bottom:9px"><b>Calidad gráfica</b><small>Reducila si el juego va lento.</small></div><div class="quality-grid">${[['high','Alta','Efectos completos'],['medium','Media','Menos partículas'],['low','Baja','Mayor fluidez']].map(([id,title,detail])=>`<button class="quality-btn ${s.graphics===id?'active':''}" data-quality="${id}">${title}<small style="display:block;font:8px 'JetBrains Mono';margin-top:4px;color:var(--parchment-dim)">${detail}</small></button>`).join('')}</div><div class="settings-switch"><span>Reducir animaciones</span><button id="motionBtn" class="${s.reducedMotion?'active':''}">${s.reducedMotion?'ACTIVADO':'DESACTIVADO'}</button></div></section></section>`;
  } else {
    box.innerHTML=`${head}<section class="hub-detail settings-detail"><button class="hub-back" data-options-back>← VOLVER A OPCIONES</button><section class="settings-group"><h4>Sistema</h4><p class="settings-intro">Probá la respuesta del juego, alterná la vista amplia o restaurá todos los ajustes de este personaje.</p><div class="hub-action-row"><button id="testSoundBtn">✦ PROBAR SONIDO</button><button id="optionsFullscreenBtn">⛶ ALTERNAR MODO JUEGO</button><button class="settings-action danger" id="resetOptionsBtn">↺ RESTAURAR OPCIONES</button></div></section></section>`;
  }
  box.querySelectorAll('[data-options-view]').forEach(button=>button.addEventListener('click',()=>{activeOptionsView=button.dataset.optionsView;Sound.click();renderOptionsHub();}));
  box.querySelectorAll('[data-options-back]').forEach(button=>button.addEventListener('click',()=>{activeOptionsView='home';Sound.click();renderOptionsHub();}));
  const update=(key,output)=>event=>{state.settings[key]=Number(event.target.value);const out=box.querySelector(output);if(out)out.textContent=`${event.target.value}%`;Sound.applyVolumes();saveState();};
  box.querySelector('#musicVolume')?.addEventListener('input',update('musicVolume','#musicVolumeValue'));
  box.querySelector('#sfxVolume')?.addEventListener('input',update('sfxVolume','#sfxVolumeValue'));
  box.querySelector('#musicEnabledBtn')?.addEventListener('click',()=>{state.settings.musicEnabled=!state.settings.musicEnabled;Sound.musicEnabled=state.settings.musicEnabled;if(Sound.musicEnabled){Sound.init();if(Sound.scene==='menu'&&Sound.menuAudioEl){Sound.syncMenuAudio();}else{Sound.playNextNote();}}else{Sound.syncMenuAudio();}Sound.applyVolumes();saveState();renderOptionsHub();});
  box.querySelector('#sfxEnabledBtn')?.addEventListener('click',()=>{state.settings.sfxEnabled=!state.settings.sfxEnabled;Sound.applyVolumes();Sound.click();saveState();renderOptionsHub();});
  box.querySelectorAll('[data-quality]').forEach(button=>button.addEventListener('click',()=>{state.settings.graphics=button.dataset.quality;applyVisualSettings();saveState();renderOptionsHub();}));
  box.querySelector('#motionBtn')?.addEventListener('click',()=>{state.settings.reducedMotion=!state.settings.reducedMotion;applyVisualSettings();saveState();renderOptionsHub();});
  box.querySelector('#testSoundBtn')?.addEventListener('click',()=>Sound.preview());
  box.querySelector('#optionsFullscreenBtn')?.addEventListener('click',()=>toggleGameMode());
  box.querySelector('#resetOptionsBtn')?.addEventListener('click',()=>{state.settings={musicVolume:100,sfxVolume:100,musicEnabled:false,sfxEnabled:true,graphics:'high',reducedMotion:false};Sound.musicEnabled=false;applyVisualSettings();saveState();activeOptionsView='home';renderOptionsHub();});
}

/* ================= COMPRA Y EQUIPAMIENTO ================= */
function buyItem(id){
  ensureShop();
  const item = SHOP_EQUIPMENT_ITEMS.find(i=>i.id===id);
  if(!item || !itemFitsCurrentClass(item) || !state.shop.inStock[id] || state.gold < item.price) return;
  Sound.click();
  
  state.gold -= item.price;
  state.ownedEquipment.push({...item});
  state.ownedItems[id] = (state.ownedItems[id]||0) + 1;
  Sound.reward();
  showFeedback('COMPRA REALIZADA', `${item.name} anadido al inventario`, 'reward');
  addLog(`Compraste: ${item.name}. ¡Va directo a tu mochila!`, 'level');
  render();
  saveState();
}

window.equipItemFromInventory = function(index) {
  if (battle) {
    addLog("No puedes equipar objetos durante una cacería.", "lose");
    return;
  }
  Sound.click();
  const item = state.ownedEquipment[index];
  if(!item || !itemFitsCurrentClass(item)){
    showFeedback('EQUIPO INCOMPATIBLE', 'Esta pieza no pertenece a la clase actual', 'danger');
    return;
  }
  const slot = item.type;

  const before = heroPowerSnapshot();
  if (state.equipment[slot]) {
    state.ownedEquipment.push(state.equipment[slot]);
  }

  state.equipment[slot] = item;
  state.ownedEquipment.splice(index, 1);

  addLog(`Te equipaste: ${item.name}`, 'level');
  showStatDelta(before, heroPowerSnapshot(), `⚔ Equipaste: ${item.name}`);
  saveState();
  render();
}

window.deleteItemFromInventory = function(index) {
  if (battle) {
    showFeedback('MOCHILA BLOQUEADA', 'No podés eliminar objetos durante una cacería', 'danger');
    return;
  }
  const item = state.ownedEquipment[index];
  if(!item) return;
  if(!confirm(`¿Eliminar ${item.name}? Esta pieza se perderá para siempre.`)) return;
  state.ownedEquipment.splice(index,1);
  if(item.id && state.ownedItems && state.ownedItems[item.id]){
    state.ownedItems[item.id]--;
    if(state.ownedItems[item.id] <= 0) delete state.ownedItems[item.id];
  }
  Sound.click();
  addLog(`Eliminaste ${item.name} de la mochila.`, 'lose');
  showFeedback('OBJETO ELIMINADO', item.name, 'danger');
  saveState();
  render();
}

function unequipItem(slotName) {
  if (battle) {
    addLog("No puedes quitarte el equipo en pleno combate.", "lose");
    return;
  }
  Sound.click();
  const item = state.equipment[slotName];
  if (!item) return;

  const before = heroPowerSnapshot();
  state.ownedEquipment.push(item);
  state.equipment[slotName] = null;

  addLog(`Te quitaste: ${item.name}`, 'level');
  showStatDelta(before, heroPowerSnapshot(), `Te quitaste: ${item.name}`);
  saveState();
  render();
}
