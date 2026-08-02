/* ================= SCRIPT-TRADE.JS =================
   Comercio entre aventureros/jugadores. Quinta parte de lo que antes era
   script.js.
   ================================================================= */

/* ================= MERCADO ENTRE JUGADORES =================
   La Lonja V2 usa una billetera online separada del oro y del guardado local.
   El servidor liquida cada compra de forma atomica y acredita la venta sin un
   paso manual de cobro. */
const TRADE_PROTOCOL_VERSION = 2;
let tradeProtocolStatus = 'idle';
let tradeProtocolError = '';
let tradeWalletBalance = null;

function marketMarks(amount){
  state.guildMarks = Math.max(0, Math.floor(finiteNumber(state.guildMarks) + finiteNumber(amount)));
}

function tradeUuid(){
  if(globalThis.crypto && typeof globalThis.crypto.randomUUID==='function') return globalThis.crypto.randomUUID();
  const bytes=new Uint8Array(16);
  if(globalThis.crypto && typeof globalThis.crypto.getRandomValues==='function') globalThis.crypto.getRandomValues(bytes);
  else for(let index=0;index<bytes.length;index++) bytes[index]=Math.floor(Math.random()*256);
  bytes[6]=(bytes[6]&15)|64; bytes[8]=(bytes[8]&63)|128;
  const hex=[...bytes].map(value=>value.toString(16).padStart(2,'0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

function tradeSafeText(value,maxLength=120){
  return String(value ?? '').replace(/[\u0000-\u001f\u007f<>&"'`]/g,'').trim().slice(0,maxLength);
}

function tradeSafeImage(value){
  const source=String(value||'').trim();
  return /^assets\/images\/[A-Za-z0-9 _./-]+\.(?:webp|png|jpg)$/.test(source) && !source.includes('..') ? source : '';
}

function tradeSafeRarityKey(value){
  const key=String(value||'common').toLowerCase();
  return Object.prototype.hasOwnProperty.call(ITEM_RARITIES,key) ? key : 'common';
}

function tradeSafeNumber(value,min=0,max=2000){
  const number=Number(value);
  return Number.isFinite(number) ? Math.max(min,Math.min(max,Math.round(number))) : 0;
}

function tradeSafeItem(raw){
  const source=raw && typeof raw==='object' && !Array.isArray(raw) ? raw : {};
  const type=['helmet','chest','gloves','boots','weapon','shield','ring'].includes(source.type) ? source.type : 'ring';
  const rarityKey=tradeSafeRarityKey(source.rarityKey);
  const rarity=ITEM_RARITIES[rarityKey] || ITEM_RARITIES.common;
  const item={
    id:/^[A-Za-z0-9_-]{1,120}$/.test(String(source.id||'')) ? String(source.id) : `traded-${tradeUuid()}`,
    type,
    name:tradeSafeText(source.name||'Pieza desconocida',80)||'Pieza desconocida',
    rarityKey,
    rarity:rarity.label,
    color:rarity.color,
    glow:rarity.glow
  };
  const image=tradeSafeImage(source.image); if(image) item.image=image;
  const icon=tradeSafeText(source.icon,24); if(icon) item.icon=icon;
  const classOnly=['warrior','archer','mage','priest','assassin','tamer'].includes(source.classOnly) ? source.classOnly : '';
  if(classOnly) item.classOnly=classOnly;
  const subclassOnly=/^[a-z-]{1,32}$/.test(String(source.subclassOnly||'')) ? String(source.subclassOnly) : '';
  if(subclassOnly) item.subclassOnly=subclassOnly;
  const equipmentTier=['base','class','subclass','forge'].includes(source.equipmentTier) ? source.equipmentTier : '';
  if(equipmentTier) item.equipmentTier=equipmentTier;
  if(/^[A-Za-z0-9_-]{1,100}$/.test(String(source.setId||''))) item.setId=String(source.setId);
  const setLabel=tradeSafeText(source.setLabel,80); if(setLabel) item.setLabel=setLabel;
  ['bonusAtk','bonusDef','bonusHp','bonusMana','bonusCrit','bonusCritDmg','bonusSpeed'].forEach(key=>{
    if(source[key]!==undefined) item[key]=tradeSafeNumber(source[key]);
  });
  if(source.enhanceLevel!==undefined) item.enhanceLevel=tradeSafeNumber(source.enhanceLevel,0,13);
  if(source.price!==undefined) item.price=tradeSafeNumber(source.price,0,100000);
  const forgeOutcome=['stable','refined','masterwork','perfect'].includes(source.forgeOutcome) ? source.forgeOutcome : '';
  if(forgeOutcome) item.forgeOutcome=forgeOutcome;
  const forgeLabel=tradeSafeText(source.forgeLabel,60); if(forgeLabel) item.forgeLabel=forgeLabel;
  if(source.crafted) item.crafted=true;
  if(source.forgeExclusive) item.forgeExclusive=true;
  if(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(source.tradeUid||''))) item.tradeUid=String(source.tradeUid);
  return item;
}

function tradeItemStats(item){
  const parts=[];
  if(item.bonusAtk) parts.push(`+${tradeSafeNumber(item.bonusAtk)} Atq`);
  if(item.bonusDef) parts.push(`+${tradeSafeNumber(item.bonusDef)} Def`);
  if(item.bonusHp) parts.push(`+${tradeSafeNumber(item.bonusHp)} Vida`);
  if(item.bonusMana) parts.push(`+${tradeSafeNumber(item.bonusMana)} Maná`);
  if(item.bonusCrit) parts.push(`+${tradeSafeNumber(item.bonusCrit)}% Crít.`);
  if(item.bonusCritDmg) parts.push(`+${tradeSafeNumber(item.bonusCritDmg)}% D.C.`);
  if(item.bonusSpeed) parts.push(`+${tradeSafeNumber(item.bonusSpeed)}% Rapidez`);
  if(item.enhanceLevel) parts.push(`+${tradeSafeNumber(item.enhanceLevel,0,13)} Forja`);
  return parts.join(' · ') || 'Pieza sin bonificaciones';
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

function syncTradeWallet(balance){
  tradeWalletBalance=Math.max(0,Math.floor(finiteNumber(balance)));
  if(state) state.guildMarks=tradeWalletBalance;
}

async function ensureTradeProtocol(){
  const account=await tradeRequest('trade_v2_account');
  if(Number(account?.protocol)!==TRADE_PROTOCOL_VERSION) throw new Error('El servidor de comercio necesita la migración V2.');
  syncTradeWallet(account.balance);
  return account;
}

async function fetchTradeListings(){
  const session=await ensureRegisteredAccount();
  if(!session){ tradeListingsCache=[]; return []; }
  await ensureTradeProtocol();
  const rows=await tradeRequest('trade_v2_list_market');
  tradeListingsCache=(Array.isArray(rows)?rows:[]).map(entry=>({
    id:tradeSafeText(entry?.id,40),
    seller_id:tradeSafeText(entry?.seller_id,40),
    seller_name:tradeSafeText(entry?.seller_name||'Aventurero',28)||'Aventurero',
    item:tradeSafeItem(entry?.item),
    price:tradeSafeNumber(entry?.price,5,99999),
    created_at:tradeSafeText(entry?.created_at,40)
  })).filter(entry=>/^[0-9a-f-]{36}$/i.test(entry.id));
  tradeListingsLoaded=true;
  return tradeListingsCache;
}

async function loadTradeMarket(){
  if(tradeProtocolStatus==='loading') return;
  tradeProtocolStatus='loading'; tradeProtocolError='';
  try{
    await fetchTradeListings();
    tradeProtocolStatus='ready';
    await saveState();
  }catch(error){
    tradeProtocolStatus='error';
    tradeProtocolError=tradeSafeText(error?.message||'El mercado seguro no está disponible.',180);
    tradeListingsCache=[]; tradeListingsLoaded=false;
  }
  if(activeGuildTab==='trade') renderGuildSubTab();
}

async function publishTradeItem(index, price){
  const item=state.ownedEquipment[index];
  const amount=Math.floor(Number(price));
  if(!item || !Number.isFinite(amount) || amount<5 || amount>99999){ showFeedback('PRECIO INVÁLIDO','Elegí entre 5 y 99.999 sellos.','warning'); return; }
  item.tradeUid=/^[0-9a-f-]{36}$/i.test(String(item.tradeUid||'')) ? item.tradeUid : tradeUuid();
  item.tradePending=true;
  await saveState();
  try{
    await tradeRequest('trade_v2_create_listing',{p_origin_id:item.tradeUid,p_item:tradeSafeItem(item),p_price:amount,p_seller_name:tradeSafeText(state.name,28)});
    const savedIndex=state.ownedEquipment.findIndex(entry=>entry?.tradeUid===item.tradeUid);
    if(savedIndex>=0) state.ownedEquipment.splice(savedIndex,1);
    addLog(`✦ Publicaste ${item.name} por ${amount} sellos en la Lonja.`, 'level');
    Sound.reward(); showFeedback('PIEZA PUBLICADA',`${item.name} · ${amount} sellos`,'reward');
    activeTradeView='mine'; await saveState(); await fetchTradeListings(); renderGuildSubTab();
  }catch(error){ item.tradePending=false; await saveState(); showFeedback('NO SE PUDO PUBLICAR',tradeSafeText(error.message,180),'warning'); renderGuildSubTab(); }
}
async function buyTradeListing(id){
  const listing=tradeListingsCache.find(entry=>entry.id===id);
  if(!listing) return;
  if(Math.floor(finiteNumber(tradeWalletBalance))<listing.price){ showFeedback('SELLOS INSUFICIENTES','Tu saldo online no alcanza para esta pieza.','warning'); return; }
  try{
    const result=await tradeRequest('trade_v2_buy_listing',{p_listing_id:id});
    const soldItem=tradeSafeItem(result?.item || listing.item);
    syncTradeWallet(result?.balance);
    if(!state.ownedEquipment.some(item=>item?.tradeUid && item.tradeUid===soldItem.tradeUid)) state.ownedEquipment.push({...soldItem,traded:true});
    addLog(`✦ Compraste ${soldItem.name||'una pieza'} por ${listing.price} sellos.`, 'win');
    Sound.reward(); showFeedback('INTERCAMBIO COMPLETADO',`${soldItem.name||'Pieza'} llegó a tu mochila.`,'reward');
    await saveState(); await fetchTradeListings(); renderGuildSubTab();
  }catch(error){ showFeedback('PIEZA NO DISPONIBLE',tradeSafeText(error.message,180),'warning'); await fetchTradeListings().catch(()=>{}); renderGuildSubTab(); }
}
async function cancelTradeListing(id){
  try{
    const result=await tradeRequest('trade_v2_cancel_listing',{p_listing_id:id});
    const returnedItem=tradeSafeItem(result?.item);
    if(returnedItem.name && !state.ownedEquipment.some(item=>item?.tradeUid && item.tradeUid===returnedItem.tradeUid)) state.ownedEquipment.push({...returnedItem,returnedFromTrade:true});
    addLog(`↩ Retiraste ${returnedItem.name||'una publicación'} de la Lonja.`, 'level');
    Sound.click(); showFeedback('PUBLICACIÓN RETIRADA','La pieza volvió a tu mochila.','reward');
    await saveState(); await fetchTradeListings(); renderGuildSubTab();
  }catch(error){ showFeedback('NO SE PUDO RETIRAR',tradeSafeText(error.message,180),'warning'); }
}

function tradeElement(tag,className,text){
  const element=document.createElement(tag);
  if(className) element.className=className;
  if(text!==undefined) element.textContent=text;
  return element;
}

function tradeAppendItemArt(container,item){
  const source=tradeSafeImage(item.image);
  if(source){ const image=tradeElement('img'); image.src=source; image.alt=''; image.decoding='async'; image.loading='lazy'; container.appendChild(image); }
  else container.appendChild(tradeElement('span','',tradeSafeText(item.icon,24)||'✦'));
}

function tradeCreateCard(rawItem,options={}){
  const item=tradeSafeItem(rawItem);
  const article=tradeElement('article',`trade-card rarity-${item.rarityKey}`);
  article.style.setProperty('--rarity-color',(ITEM_RARITIES[item.rarityKey]||ITEM_RARITIES.common).color);
  const art=tradeElement('div','trade-art'); tradeAppendItemArt(art,item); article.appendChild(art);
  const copy=tradeElement('div','trade-copy');
  copy.appendChild(tradeElement('small','',`${tradeSafeText(item.rarity,30)} · ${tradeSafeText(options.ownerLabel||equipmentSlotMeta(item.type).label,50)}`));
  copy.appendChild(tradeElement('b','',item.name));
  copy.appendChild(tradeElement('span','',tradeItemStats(item)));
  article.appendChild(copy);
  if(options.mode==='sell'){
    const controls=tradeElement('div','trade-price-input');
    const label=tradeElement('label','',`PRECIO `);
    const input=tradeElement('input'); input.type='number'; input.min='5'; input.max='99999'; input.value=String(Math.max(10,Math.round((item.price||100)/12))); input.dataset.tradePrice=String(options.index);
    label.append(input,document.createTextNode(' ✦')); controls.appendChild(label);
    const button=tradeElement('button','',item.tradePending?'PUBLICANDO…':'PUBLICAR'); button.dataset.tradePublish=String(options.index); button.disabled=!!item.tradePending; controls.appendChild(button);
    article.appendChild(controls);
  }else{
    const offer=tradeElement('div','trade-offer');
    offer.append(tradeElement('strong','',`✦ ${options.price}`),tradeElement('small','','SELLOS'));
    const button=tradeElement('button','',options.mine?'RETIRAR':'COMPRAR');
    button.dataset[options.mine?'tradeCancel':'tradeBuy']=options.listingId; offer.appendChild(button); article.appendChild(offer);
  }
  return article;
}

function renderTradeTab(box){
  const signedIn=!!accountSession;
  const ownId=accountSession?.user?.id;
  box.innerHTML=guildSummaryMarkup();
  const hall=tradeElement('section',`trade-hall ${signedIn?'':'trade-locked'}`);
  const hero=tradeElement('div','trade-hero'); const intro=tradeElement('div');
  intro.append(tradeElement('span','','✦ LONJA DE AVENTUREROS'),tradeElement('h4','','Comercio entre jugadores'),tradeElement('p','','Las compras, ventas y transferencias se liquidan en el servidor dentro de una sola operación.'));
  const wallet=tradeElement('div','trade-wallet'); wallet.append(tradeElement('small','','SALDO ONLINE'),tradeElement('b','',tradeWalletBalance===null?'✦ —':`✦ ${tradeWalletBalance}`),tradeElement('span','','sellos protegidos'));
  hero.append(intro,wallet); hall.appendChild(hero);

  if(!signedIn){ const locked=tradeElement('div','trade-signin'); locked.append(tradeElement('b','','🔒 INICIÁ SESIÓN PARA ENTRAR A LA LONJA'),tradeElement('span','','El mercado seguro requiere una cuenta registrada.')); hall.appendChild(locked); box.appendChild(hall); return; }
  if(tradeProtocolStatus!=='ready'){
    const status=tradeElement('div','trade-signin');
    status.append(tradeElement('b','',tradeProtocolStatus==='error'?'⚠ MERCADO SEGURO NO DISPONIBLE':'VERIFICANDO MERCADO SEGURO…'),tradeElement('span','',tradeProtocolStatus==='error'?`${tradeProtocolError} Ejecutá supabase-comercio-jugadores.sql en Supabase.`:'Comprobando protocolo, saldo e inventario online.'));
    if(tradeProtocolStatus==='error'){ const retry=tradeElement('button','','REINTENTAR'); retry.dataset.tradeRetry='1'; status.appendChild(retry); }
    hall.appendChild(status); box.appendChild(hall);
    hall.querySelector('[data-trade-retry]')?.addEventListener('click',()=>{tradeProtocolStatus='idle';loadTradeMarket();renderGuildSubTab();});
    if(tradeProtocolStatus==='idle') loadTradeMarket();
    return;
  }

  const tabs=tradeElement('div','trade-tabs');
  [['buy','EXPLORAR'],['sell',`VENDER (${state.ownedEquipment.length})`],['mine','MIS VENTAS']].forEach(([id,label])=>{const button=tradeElement('button',activeTradeView===id?'active':'',label);button.dataset.tradeView=id;tabs.appendChild(button);});
  hall.appendChild(tabs);
  if(activeTradeView==='sell'){
    const grid=tradeElement('div','trade-sell-grid');
    if(state.ownedEquipment.length) state.ownedEquipment.forEach((item,index)=>grid.appendChild(tradeCreateCard(item,{mode:'sell',index})));
    else grid.appendChild(tradeElement('div','trade-empty','Tu mochila está vacía. Conseguí una pieza antes de publicarla.'));
    hall.appendChild(grid);
  }else{
    if(activeTradeView==='mine'){
      const note=tradeElement('div','trade-mine-note'); note.append(tradeElement('span','','✦'));
      const copy=tradeElement('div'); copy.append(tradeElement('b','','Ventas automáticas'),tradeElement('small','','El servidor acredita los Sellos en el mismo instante en que se completa una compra.')); note.appendChild(copy); hall.appendChild(note);
    }
    const list=tradeElement('div','trade-list');
    const entries=tradeListingsCache.filter(entry=>activeTradeView==='mine' ? entry.seller_id===ownId : entry.seller_id!==ownId);
    if(entries.length) entries.forEach(entry=>list.appendChild(tradeCreateCard(entry.item,{mine:activeTradeView==='mine',listingId:entry.id,price:entry.price,ownerLabel:activeTradeView==='mine'?'TU PUBLICACIÓN':`DE ${entry.seller_name}`})));
    else list.appendChild(tradeElement('div','trade-empty',activeTradeView==='mine'?'No tenés publicaciones activas.':'Todavía no hay piezas publicadas por otros aventureros.'));
    hall.appendChild(list);
  }
  box.appendChild(hall);
  box.querySelectorAll('[data-trade-view]').forEach(button=>button.addEventListener('click',()=>{ activeTradeView=button.dataset.tradeView; Sound.click(); renderGuildSubTab(); }));
  box.querySelectorAll('[data-trade-publish]').forEach(button=>button.addEventListener('click',()=>{ const index=Number(button.dataset.tradePublish); const price=box.querySelector(`[data-trade-price="${index}"]`)?.value; publishTradeItem(index,price); }));
  box.querySelectorAll('[data-trade-buy]').forEach(button=>button.addEventListener('click',()=>buyTradeListing(button.dataset.tradeBuy)));
  box.querySelectorAll('[data-trade-cancel]').forEach(button=>button.addEventListener('click',()=>cancelTradeListing(button.dataset.tradeCancel)));
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
