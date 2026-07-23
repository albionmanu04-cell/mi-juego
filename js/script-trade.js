/* ================= SCRIPT-TRADE.JS =================
   Comercio entre aventureros/jugadores. Quinta parte de lo que antes era
   script.js.
   ================================================================= */

/* ================= MERCADO ENTRE JUGADORES =================
   Los Sellos del Gremio son una moneda separada del oro: se ganan al derrotar
   jefes y se usan solamente para intercambiar equipo entre cuentas. */
function marketMarks(amount){
  state.guildMarks = Math.max(0, Math.floor(finiteNumber(state.guildMarks) + finiteNumber(amount)));
}
function tradeItemStats(item){
  const parts=[];
  if(item.bonusAtk) parts.push(`+${item.bonusAtk} Atq`);
  if(item.bonusDef) parts.push(`+${item.bonusDef} Def`);
  if(item.bonusHp) parts.push(`+${item.bonusHp} Vida`);
  if(item.bonusMana) parts.push(`+${item.bonusMana} Maná`);
  if(item.bonusCrit) parts.push(`+${item.bonusCrit}% Crít.`);
  if(item.bonusCritDmg) parts.push(`+${item.bonusCritDmg}% D.C.`);
  if(item.bonusSpeed) parts.push(`+${item.bonusSpeed}% Rapidez`);
  if(item.enhanceLevel) parts.push(`+${item.enhanceLevel} Forja`);
  return parts.join(' · ') || 'Pieza sin bonificaciones';
}
function tradeItemArt(item){
  return item?.image ? `<img src="${item.image}" alt="" decoding="async" loading="lazy">` : `<span>${item?.icon||'✦'}</span>`;
}
async function tradeRequest(name, body={}){
  const session=await ensureRegisteredAccount();
  if(!session) throw new Error('Iniciá sesión para usar el comercio entre jugadores.');
  const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`,{
    method:'POST', headers:supabaseHeaders(session.access_token), body:JSON.stringify(body)
  });
  const data=await response.json().catch(()=>null);
  if(!response.ok) throw new Error(data?.message||data?.hint||`No se pudo completar el comercio (${response.status}).`);
  return data;
}
async function fetchTradeListings(){
  const session=await ensureRegisteredAccount();
  if(!session){ tradeListingsCache=[]; return []; }
  const response=await fetch(`${SUPABASE_URL}/rest/v1/trade_listings?select=id,seller_id,seller_name,item,price,status,created_at&status=eq.active&order=created_at.desc&limit=60`,{
    headers:supabaseHeaders(session.access_token), cache:'no-store'
  });
  if(!response.ok) throw new Error('El mercado todavía no está configurado en el servidor.');
  tradeListingsCache=await response.json();
  tradeListingsLoaded=true;
  return tradeListingsCache;
}
async function publishTradeItem(index, price){
  const item=state.ownedEquipment[index];
  const amount=Math.floor(Number(price));
  if(!item || !Number.isFinite(amount) || amount<5 || amount>99999){ showFeedback('PRECIO INVÁLIDO','Elegí entre 5 y 99.999 sellos.','warning'); return; }
  try{
    await tradeRequest('create_trade_listing',{p_item:item,p_price:amount,p_seller_name:state.name});
    state.ownedEquipment.splice(index,1);
    marketMarks(0);
    addLog(`✦ Publicaste ${item.name} por ${amount} sellos en la Lonja.`, 'level');
    Sound.reward(); showFeedback('PIEZA PUBLICADA',`${item.name} · ${amount} sellos`,'reward');
    activeTradeView='mine'; saveState(); renderGuildSubTab();
  }catch(error){ showFeedback('NO SE PUDO PUBLICAR',error.message,'warning'); }
}
async function buyTradeListing(id){
  const listing=tradeListingsCache.find(entry=>entry.id===id);
  if(!listing) return;
  if(Math.floor(finiteNumber(state.guildMarks))<Math.floor(finiteNumber(listing.price))){ showFeedback('SELLOS INSUFICIENTES','Derrotá jefes para conseguir más sellos.','warning'); return; }
  try{
    const result=await tradeRequest('buy_trade_listing',{p_listing_id:id});
    const soldItem=result?.item || listing.item;
    marketMarks(-listing.price);
    state.ownedEquipment.push({...soldItem, traded:true});
    addLog(`✦ Compraste ${soldItem.name||'una pieza'} por ${listing.price} sellos.`, 'win');
    Sound.reward(); showFeedback('INTERCAMBIO COMPLETADO',`${soldItem.name||'Pieza'} llegó a tu mochila.`,'reward');
    saveState(); await fetchTradeListings(); renderGuildSubTab();
  }catch(error){ showFeedback('PIEZA NO DISPONIBLE',error.message,'warning'); await fetchTradeListings().catch(()=>{}); renderGuildSubTab(); }
}
async function cancelTradeListing(id){
  try{
    const result=await tradeRequest('cancel_trade_listing',{p_listing_id:id});
    if(result?.item) state.ownedEquipment.push({...result.item, returnedFromTrade:true});
    addLog(`↩ Retiraste ${result?.item?.name||'una publicación'} de la Lonja.`, 'level');
    Sound.click(); showFeedback('PUBLICACIÓN RETIRADA','La pieza volvió a tu mochila.','reward');
    saveState(); renderGuildSubTab();
  }catch(error){ showFeedback('NO SE PUDO RETIRAR',error.message,'warning'); }
}
async function claimTradeSales(){
  try{
    const result=await tradeRequest('claim_trade_sales');
    const marks=Math.max(0,Math.floor(finiteNumber(result?.marks)));
    if(!marks){ showFeedback('SIN VENTAS PENDIENTES','Todavía no hay sellos para reclamar.','warning'); return; }
    marketMarks(marks);
    addLog(`✦ Cobraste ${marks} sellos de tus ventas en la Lonja.`, 'win');
    Sound.reward(); showFeedback('VENTA COBRADA',`+${marks} sellos del gremio`,'reward');
    saveState(); renderGuildSubTab();
  }catch(error){ showFeedback('NO SE PUDO COBRAR',error.message,'warning'); }
}
function renderTradeTab(box){
  const signedIn=!!accountSession;
  const ownId=accountSession?.user?.id;
  const active=activeTradeView;
  const content=active==='sell'
    ? `<div class="trade-sell-grid">${state.ownedEquipment.length ? state.ownedEquipment.map((item,index)=>`<article class="trade-card rarity-${item.rarityKey||'common'}" style="--rarity-color:${item.color||'#b9c4d6'}"><div class="trade-art">${tradeItemArt(item)}</div><div class="trade-copy"><small>${item.rarity||'Equipo'} · ${equipmentSlotMeta(item.type).label}</small><b>${escapeHtml(item.name)}</b><span>${tradeItemStats(item)}</span></div><div class="trade-price-input"><label>PRECIO <input type="number" min="5" max="99999" value="${Math.max(10,Math.round((item.price||100)/12))}" data-trade-price="${index}"> ✦</label><button data-trade-publish="${index}">PUBLICAR</button></div></article>`).join('') : `<div class="trade-empty">Tu mochila está vacía. Conseguí una pieza antes de publicarla.</div>`}</div>`
    : active==='mine'
      ? `<div class="trade-mine-note"><span>✦</span><div><b>Ventas y cobros</b><small>Cuando otro aventurero compra tu pieza, reclamá sus sellos aquí.</small></div><button data-trade-claim>COBRAR VENTAS</button></div><div class="trade-list">${tradeListingsCache.filter(entry=>entry.seller_id===ownId).length ? tradeListingsCache.filter(entry=>entry.seller_id===ownId).map(entry=>tradeListingMarkup(entry,true)).join('') : `<div class="trade-empty">No tenés publicaciones activas.</div>`}</div>`
      : `<div class="trade-list">${tradeListingsCache.filter(entry=>entry.seller_id!==ownId).length ? tradeListingsCache.filter(entry=>entry.seller_id!==ownId).map(entry=>tradeListingMarkup(entry,false)).join('') : `<div class="trade-empty">Todavía no hay piezas publicadas por otros aventureros.</div>`}</div>`;
  box.innerHTML=guildSummaryMarkup()+`<section class="trade-hall ${signedIn?'':'trade-locked'}"><div class="trade-hero"><div><span>✦ LONJA DE AVENTUREROS</span><h4>Comercio entre jugadores</h4><p>Usá <b>Sellos del Gremio</b>, una moneda separada del oro. Los jefes entregan sellos y cada compra va directo a tu mochila.</p></div><div class="trade-wallet"><small>TU BOLSILLO</small><b>✦ ${Math.floor(finiteNumber(state.guildMarks))}</b><span>sellos</span></div></div>${signedIn?`<div class="trade-tabs"><button class="${active==='buy'?'active':''}" data-trade-view="buy">EXPLORAR</button><button class="${active==='sell'?'active':''}" data-trade-view="sell">VENDER (${state.ownedEquipment.length})</button><button class="${active==='mine'?'active':''}" data-trade-view="mine">MIS VENTAS</button></div>${content}`:`<div class="trade-signin"><b>🔒 INICIÁ SESIÓN PARA ENTRAR A LA LONJA</b><span>El comercio usa tu cuenta para proteger las piezas y evitar intercambios duplicados.</span></div>`}</section>`;
  box.querySelectorAll('[data-trade-view]').forEach(button=>button.addEventListener('click',()=>{ activeTradeView=button.dataset.tradeView; Sound.click(); renderGuildSubTab(); }));
  box.querySelectorAll('[data-trade-publish]').forEach(button=>button.addEventListener('click',()=>{ const index=Number(button.dataset.tradePublish); const price=box.querySelector(`[data-trade-price="${index}"]`)?.value; publishTradeItem(index,price); }));
  box.querySelectorAll('[data-trade-buy]').forEach(button=>button.addEventListener('click',()=>buyTradeListing(button.dataset.tradeBuy)));
  box.querySelectorAll('[data-trade-cancel]').forEach(button=>button.addEventListener('click',()=>cancelTradeListing(button.dataset.tradeCancel)));
  box.querySelector('[data-trade-claim]')?.addEventListener('click',claimTradeSales);
}
function tradeListingMarkup(entry,mine=false){
  const item=entry.item||{}; const price=Math.floor(finiteNumber(entry.price));
  return `<article class="trade-card rarity-${item.rarityKey||'common'}" style="--rarity-color:${item.color||'#b9c4d6'}"><div class="trade-art">${tradeItemArt(item)}</div><div class="trade-copy"><small>${item.rarity||'Equipo'} · ${mine?'TU PUBLICACIÓN':`DE ${escapeHtml(entry.seller_name||'Aventurero')}`}</small><b>${escapeHtml(item.name||'Pieza desconocida')}</b><span>${tradeItemStats(item)}</span></div><div class="trade-offer"><strong>✦ ${price}</strong><small>SELLOS</small><button ${mine?'data-trade-cancel':'data-trade-buy'}="${entry.id}">${mine?'RETIRAR':'COMPRAR'}</button></div></article>`;
}

/* ================= PESTAÑAS DE GREMIO Y RANKING ================= */
/**
 * Dibuja el contenido de la pestaña de gremio activa (`activeGuildTab`):
 * tienda del gremio, mercado entre jugadores (llama a `renderTradeTab`),
 * o misiones de gremio. No confundir con `renderLbSubTab` (el ranking
 * global), que es una pestaña hermana pero vive en `activeLbTab`.
 */
function renderGuildSubTab() {
  const box = document.getElementById('guildTabContent');
  if (!box) return;

  if (activeGuildTab === 'trade') {
    renderTradeTab(box);
    if(accountSession && !tradeListingsLoaded){
      fetchTradeListings().then(()=>{ if(activeGuildTab==='trade') renderGuildSubTab(); }).catch(error=>{
        showFeedback('MERCADO SIN CONFIGURAR',`${error.message} Ejecutá el SQL de comercio una sola vez.`,'warning');
      });
    }
    return;
  }
  if (activeGuildTab === 'shop') {
    ensureShop();
    const remain = Math.max(0, SHOP_ROTATION_MS - (Date.now()-state.shop.generatedAt));
    const mm = String(Math.floor(remain/60000)).padStart(2,'0');
    const ss = String(Math.floor((remain%60000)/1000)).padStart(2,'0');
    const owned = state.ownedItems || {};
    const summary = guildSummaryMarkup();
    const heroClass = currentClass();
    const activeSetId = state.subclass ? `subclass-${state.characterClass}-${state.subclass}` : `class-${state.characterClass}`;
    const activeSet = EQUIPMENT_SET_DEFS[activeSetId];
    const classItems = Object.values(state.shop.offered || {})
      .map(id=>SHOP_EQUIPMENT_ITEMS.find(item=>item.id===id))
      .filter(Boolean);
    
    box.innerHTML = `<div class="shop-timer" id="shopRotationTimer">Rotación en ${mm}:${ss}</div>` +
      `<div class="guild-note"><span>${heroClass.icon}</span><span><b>${escapeHtml(activeSet?.label || `Armería de ${heroClass.label}`)}</b> — ${state.subclass ? 'piezas de tu subclase y equipo base del viajero.' : 'piezas de tu clase y equipo base del viajero.'}</span></div>` +
      `<div class="quest-label">OFERTAS DE HOY · UNA PIEZA POR RANURA</div>` +
      classItems.map(it=>{
        const stock = state.shop.inStock[it.id];
        const count = owned[it.id] || 0;
        const canBuy = stock && state.gold >= it.price;
        let btnLabel = 'No disponible';
        if(stock) btnLabel = canBuy ? 'Comprar' : 'Oro insuficiente';
        
        let statsTexts = [];
        if (it.bonusAtk) statsTexts.push(`+${it.bonusAtk} Ataque`);
        if (it.bonusDef) statsTexts.push(`+${it.bonusDef}% Robustez`);
        if (it.bonusCrit) statsTexts.push(`+${it.bonusCrit}% Crítico`);
        if (it.bonusCritDmg) statsTexts.push(`+${it.bonusCritDmg}% Daño Crítico`);
        if (it.bonusHp) statsTexts.push(`+${it.bonusHp} Vida`);
        if (it.bonusMana) statsTexts.push(`+${it.bonusMana} Mana`);
        if (it.bonusSpeed) statsTexts.push(`+${it.bonusSpeed}% Rapidez`);
        let statString = statsTexts.join(' · ');

        return `
        <div class="shop-item rarity-${it.rarityKey||'common'} ${stock?'':'locked'}" style="--rarity-color:${it.color};--rarity-glow:${it.glow||'transparent'}">
          <div class="shop-top">
            <span class="iname" style="color:${it.color}">${it.image ? `<img class="shop-item-art" src="${it.image}" alt="" decoding="async" loading="lazy">` : it.icon} ${it.name}</span>
            <span class="irarity" style="color:${it.color}">${it.rarity}</span>
          </div>
          <div class="shop-stat">${statString} &nbsp;·&nbsp; ${it.price} oro</div>
          <div class="shop-owned">${escapeHtml(it.setLabel || 'Equipo del Viajero')} · ${it.equipmentTier==='base'?'BASE':it.equipmentTier==='subclass'?'SUBCLASE':'CLASE'}</div>
          <div class="shop-meta"><span>Chance de esta rareza</span><b>${(it.chance*100).toFixed(it.chance<.01?1:0)}%</b></div>
          ${count>0?`<div class="shop-owned">Comprados: ${count}</div>`:''}
          <button class="claim-btn ${canBuy?'ready':''}" data-buy="${it.id}" ${canBuy?'':'disabled'}>${btnLabel}</button>
        </div>`;
      }).join('');
    box.insertAdjacentHTML('afterbegin', summary);
      
    box.querySelectorAll('[data-buy]').forEach(btn=>{
      btn.addEventListener('click', ()=> buyItem(btn.dataset.buy));
    });
  } else if (activeGuildTab === 'bestiary') {
    const catalog=bestiaryCatalog();
    box.innerHTML = guildSummaryMarkup() + `<div class="bestiary-grid">${catalog.map(form=>{
      const key=form.type || form.name;
      // Cada entrada se descubre por criatura, no por rango. Así vencer un enemigo
      // normal no revela automáticamente a todas las variantes del mismo rango.
      const found=state.bestiary[key] || null;
      const tierName=form.boss ? 'JEFE DE ACTO' : (TIERS[form.tier]?.label || 'Criatura');
      const detail=form.boss ? 'Jefe de dos fases · botín único garantizado.' : `${form.tier==='elite'?'Élite: gran botín y ataque peligroso.':form.tier==='dificil'?'Amenaza alta: preparate para su golpe fuerte.':'Registrá sus ataques y debilidades al vencerlo.'}`;
      return `<article class="bestiary-card ${found?'':'locked'}">
        <span class="bestiary-tier">${tierName.toUpperCase()}</span><strong>${found ? escapeHtml(form.name.replace(/^Jefe:\s*/,'')) : 'Criatura desconocida'}</strong>
        <small>${found ? `${found.wins} victoria${found.wins===1?'':'s'} · ${detail}` : 'Derrotala para revelar vida, botín y comportamiento.'}</small>
        ${found && (found.boss||form.boss) ? `<span class="bestiary-boss">${form.boss?'TROFEO DE JEFE':'JEFE VENCIDO'}</span>` : ''}
        <img src="${form.image}" alt="" aria-hidden="true" decoding="async" loading="lazy"></article>`;
    }).join('')}</div>`;
  } else if (activeGuildTab === 'logros') {
    box.innerHTML = guildSummaryMarkup() + ACHIEVEMENTS.map(a=>{
      const done = a.check(state);
      const claimed = !!state.achievementsClaimed[a.id];
      let btnClass = 'claim-btn', label = done ? 'Reclamar recompensa' : 'Bloqueado';
      if(claimed){ btnClass += ' done'; label = 'Reclamada'; }
      else if(done){ btnClass += ' ready'; }
      return `
        <div class="mission achievement-card ${done?'is-ready':''} ${claimed?'claimed':''}">
          <div class="achievement-layout">
            <div class="achievement-mark">${achievementGlyph(a.id)}</div>
            <div class="mission-top"><span>${a.label}</span><span>${a.reward.gold} oro</span></div>
          </div>
          <button class="${btnClass}" data-ach="${a.id}" ${(!done||claimed)?'disabled':''}>${label}</button>
        </div>`;
    }).join('');
    box.querySelectorAll('[data-ach]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const id = btn.dataset.ach;
        const a = ACHIEVEMENTS.find(x=>x.id===id);
        if(!a || state.achievementsClaimed[id] || !a.check(state)) return;
        Sound.victory();
        state.achievementsClaimed[id] = true;
        gainGold(a.reward.gold);
        showFeedback('LOGRO RECLAMADO', `+${a.reward.gold} oro`, 'reward');
        addLog(`🏆 Logro conseguido: ${a.label} (+${a.reward.gold} oro)`, 'level');
        render();
        saveState();
      });
    });
  } else {
    const defs = MISSION_DEFS[activeGuildTab];
    const data = state.missions[activeGuildTab];
    box.innerHTML = guildSummaryMarkup() + defs.map((d, i) => {
      const val = data[d.key] || 0;
      const pct = Math.min(100, (val / d.target) * 100);
      const done = val >= d.target;
      const claimed = data.claimed[i];
      let btnClass = 'claim-btn', btnLabel = `${Math.min(val, d.target)} / ${d.target}`;
      if (claimed) { btnClass += ' done'; btnLabel = 'Reclamada'; }
      else if (done) { btnClass += ' ready'; btnLabel = 'Reclamar recompensa'; }
      const rewardTxt = [d.reward.gold ? `${d.reward.gold} oro` : null, d.reward.exp ? `${d.reward.exp} exp` : null].filter(Boolean).join(' + ');
      return `
        <div class="mission guild-quest ${done?'complete':''} ${claimed?'claimed':''}">
          <div class="quest-label">${activeGuildTab==='day'?'SOL DEL DIA':activeGuildTab==='week'?'ESTANDAR SEMANAL':'JURAMENTO MENSUAL'}</div>
          <div class="mission-top"><span>${d.label}</span><span>${rewardTxt}</span></div>
          <div class="mbar"><div style="width:${pct}%"></div></div>
          <button class="${btnClass}" data-tab="${activeGuildTab}" data-idx="${i}">${btnLabel}</button>
        </div>`;
    }).join('');

    box.querySelectorAll('.claim-btn.ready').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab, idx = +btn.dataset.idx;
        const def = MISSION_DEFS[tab][idx];
        state.missions[tab].claimed[idx] = true;
        Sound.victory();
        if (def.reward.gold) gainGold(def.reward.gold);
        if (def.reward.exp) gainExp(def.reward.exp);
        showFeedback('RECOMPENSA DEL GREMIO', `+${def.reward.gold||0} oro  +${def.reward.exp||0} exp`, 'reward');
        addLog(`Misión completada: ${def.label}`, 'level');
        render();
        saveState();
      });
    });
  }
}

function renderLbSubTab() {
  if (activeLbTab === 'lb') {
    fetchLeaderboard();
  }
}

