/* =========================================================================
   SCRIPT.JS — Archivo principal: guardado/almacenamiento local, ranking
   global, cálculo de stats compartidos, asignación de puntos, renderizado
   de toda la UI e inicialización del juego (boot).
   Debe cargarse ÚLTIMO, después de sound.js, classes.js, combat.js,
   forge.js y fishing.js — coordina y usa todo lo definido en esos archivos.
   ========================================================================= */

/* ================= DATE KEYS ================= */
function localDateKey(date=new Date()){
  const y = date.getFullYear();
  const m = String(date.getMonth()+1).padStart(2,'0');
  const d = String(date.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}
function todayKey(){ return localDateKey(); }
function weekKey(){
  const d=new Date(); const t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));
  const dayNum=(t.getUTCDay()+6)%7; t.setUTCDate(t.getUTCDate()-dayNum+3);
  const firstThu=new Date(Date.UTC(t.getUTCFullYear(),0,4));
  const week=1+Math.round(((t-firstThu)/86400000-3+((firstThu.getUTCDay()+6)%7))/7);
  return `${t.getUTCFullYear()}-W${week}`;
}
function monthKey(){ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }
function yesterdayKey(){ const d=new Date(); d.setDate(d.getDate()-1); return localDateKey(d); }

function checkDailyLogin(){
  const today = todayKey();
  if(state.lastLoginDay === today) return;
  state.loginStreak = (state.lastLoginDay === yesterdayKey()) ? (state.loginStreak % 7) + 1 : 1;
  state.lastLoginDay = today;
  const reward = 40 + state.loginStreak*30;
  gainGold(reward);
  addLog(`🎁 Recompensa diaria (día ${state.loginStreak}/7): +${reward} oro`, 'level');
  showDailyToast(state.loginStreak, reward);
  saveState();
}
function showDailyToast(day, reward){
  const el = document.createElement('div');
  el.className = 'daily-toast';
  el.innerHTML = `<div class="daily-toast-title">🎁 Racha de ingreso: día ${day}/7</div><div class="daily-toast-sub">+${reward} oro</div>`;
  document.body.appendChild(el);
  setTimeout(()=> el.classList.add('show'), 30);
  setTimeout(()=>{ el.classList.remove('show'); setTimeout(()=>el.remove(), 500); }, 4000);
  Sound.reward();
}

/* ================= STATE ================= */
function defaultState(name, classId='warrior') {
  return {
    name: name,
    characterClass: CLASSES[classId] ? classId : 'warrior',
    subclass: null,
    createdAt: Date.now(),
    level: 1,
    resets: 0,
    exp: 0,
    gold: 150,
    guildMarks: 30,
    statPoints: 0,
    stats: { ataque: 1, vida: 1, mana: 1, agilidad: 0, rapidez: 0 },
    allocatedPoints: { ataque:0, vida:0, mana:0, agilidad:0, rapidez:0, robustez:0, percepcion:0, critRate:0, critDmg:0 },
    pendingPoints: { ataque:0, vida:0, mana:0, agilidad:0, rapidez:0, robustez:0, percepcion:0, critRate:0, critDmg:0 },
    robustness: 0,
    perception: 0,
    statResetsUsed: 0,
    statResetsEarned: 0,
    strength: 5,
    critRateStat: 0, 
    critDmgStat: 0,  
    equipment: {
      helmet: null,
      chest: null,
      gloves: null,
      boots: null,
      weapon: null,
      shield: null,
      ring: null
    },
    ownedEquipment: [
      { id: 'rusty_sword', type: 'weapon', name: 'Espada Oxidada', bonusAtk: 4, bonusCrit: 2, icon: '⚔️' }
    ],
    lastLoginDay: null,
    loginStreak: 0,
    maxLevelEver: 1,
    totalWins: 0,
    totalBossWins: 0,
    maxHuntDepth: 0,
    totalGoldEarnedLifetime: 0,
    achievementsClaimed: {},
    bestiary: {},
    tutorialSeen: false,
    companion: null,
    missions: {
      day: { claimed: [] },
      week: { claimed: [] },
      month: { claimed: [] }
    },
    shop: null,
    ownedItems: {},
    materials: { essence: 0, bossCore: 0, bossTrophies: {}, scale: 0 },
    fishing: { totalCaught: 0, rodLevel: 1, bestRarity: null, tameCharm: false, dex:{}, streak:0, bestStreak:0, bestWeight:{}, zone:'pond', baits:{}, activeBait:null, dexRewardClaimed:false },
    campaignWins: 0,
    weeklyChallenge: { key:null, wins:0, claimed:false },
    lastRunSummary: null,
    bestRunSummary: null,
    settings: { musicVolume:100, sfxVolume:100, musicEnabled:false, sfxEnabled:true, graphics:'high', reducedMotion:false, performanceMode:'auto' },
    log: []
  };
}
function getStorage(){
  return window.storage && typeof window.storage.get === 'function' ? window.storage : null;
}
/* Reinicio global de temporada: cambiar este identificador invalida partidas locales anteriores
   sin cerrar las cuentas de Supabase ni conservar personajes de la temporada previa. */
const STORAGE_NAMESPACE = 'forja-eterna:temporada-2:';
function namespacedStorageKey(key){ return `${developerMode ? 'forja-eterna:desarrollo-local:' : STORAGE_NAMESPACE}${key}`; }
function purgeLegacyLocalProgress(){
  const marker='forja-eterna:temporada-2:legacy-purged';
  try{
    if(localStorage.getItem(marker)==='1') return;
    const removable=[];
    for(let index=0;index<localStorage.length;index++){
      const key=localStorage.key(index)||'';
      if(key==='forja-eterna:characters' || key==='forja-eterna:player-save' || key.startsWith('forja-eterna:character-save:') || key.startsWith('forja-eterna:run-save:')) removable.push(key);
    }
    removable.forEach(key=>localStorage.removeItem(key));
    localStorage.setItem(marker,'1');
  }catch(error){ console.warn('No se pudo limpiar el progreso de la temporada anterior.',error); }
}
function loadLocal(key){
  try { return localStorage.getItem(key); } catch(e) { return null; }
}
function saveLocal(key, value){
  try { localStorage.setItem(key, value); return true; } catch(e) { console.warn('local save failed', e); return false; }
}
async function readStored(key){
  try{
    const storage = getStorage();
    return storage ? (await storage.get(namespacedStorageKey(key))).value : loadLocal(namespacedStorageKey(key));
  }catch(e){ console.warn('load failed', e); }
  return null;
}
async function writeStored(key, value){
  const storage = getStorage();
  if(storage){
    await storage.set(namespacedStorageKey(key), value);
    return true;
  }
  if(!saveLocal(namespacedStorageKey(key), value)) throw new Error('local-save-failed');
  return true;
}
async function removeStored(key){
  try{
    const storage = getStorage();
    if(storage && typeof storage.delete === 'function') await storage.delete(namespacedStorageKey(key));
    else if(storage) await storage.set(namespacedStorageKey(key), null);
    else localStorage.removeItem(namespacedStorageKey(key));
  }catch(e){ console.error('delete failed', e); }
}
function characterKey(id){ return `character-save:${id}`; }
function runKey(id){ return `run-save:${id}`; }
function characterSummary(character){ return { id:character.id, name:character.name, level:character.level, resets:character.resets, characterClass:character.characterClass || 'warrior', updatedAt:Date.now() }; }
async function loadRoster(){
  try{
    const raw = await readStored('characters');
    if(raw) return JSON.parse(raw);
    const legacy = await readStored('player-save');
    if(legacy){
      const saved = JSON.parse(legacy);
      const id = `legacy-${Date.now()}`;
      await writeStored(characterKey(id), legacy);
      const roster = [characterSummary({ ...saved, id })];
      await writeStored('characters', JSON.stringify(roster));
      return roster;
    }
  }catch(e){ console.warn('roster load failed', e); }
  return [];
}
async function saveRoster(roster){ await writeStored('characters', JSON.stringify(roster)); }
async function loadState(id){
  try{
    const raw = await readStored(characterKey(id));
    return raw ? JSON.parse(raw) : null;
  }catch(e){ console.warn('character load failed', e); }
  return null;
}
function activeRunSnapshot(){
  if(!runState || runState.phase==='ended') return null;
  return {
    version: 1,
    savedAt: Date.now(),
    run: runState,
    battle: battle && battle.isRun ? battle : null
  };
}
async function loadRunSnapshot(id){
  try{
    const raw = await readStored(runKey(id));
    return raw ? JSON.parse(raw) : null;
  }catch(e){ console.warn('run load failed', e); }
  return null;
}
async function clearRunSnapshot(id){
  if(id) await removeStored(runKey(id));
}
function restoreRunSnapshot(snapshot){
  if(!snapshot || !snapshot.run || typeof snapshot.run!=='object') return false;
  const restored = snapshot.run;
  restored.depth = Math.max(1, Math.floor(finiteNumber(restored.depth, 1)));
  restored.phase = typeof restored.phase==='string' ? restored.phase : 'map';
  restored.relics = Array.isArray(restored.relics) ? restored.relics : [];
  restored.tempStats = restored.tempStats && typeof restored.tempStats==='object' ? restored.tempStats : {};
  restored.routePlan = Array.isArray(restored.routePlan) ? restored.routePlan : [];
  restored.routeHistory = Array.isArray(restored.routeHistory) ? restored.routeHistory : [];
  restored.runGold = Math.max(0, finiteNumber(restored.runGold, 0));
  restored.runGoldClaimed = !!restored.runGoldClaimed;
  restored.hp = Math.max(1, finiteNumber(restored.hp, maxHP()));
  restored.mana = Math.max(0, finiteNumber(restored.mana, maxMana()));
  runState = restored;
  ensureRunTelemetry(runState);
  ensureRoutePlan();
  purgeRemovedRunRelics();
  syncRunResources();

  const savedBattle = snapshot.battle;
  if(savedBattle && savedBattle.isRun && savedBattle.monster && Number.isFinite(Number(savedBattle.playerHp))){
    battle = savedBattle;
    battle.busy = false;
    battle.finishing = false;
    battle.playerStatus = { ...newPlayerStatus(), ...(battle.playerStatus || {}) };
    battle.playerHp = Math.max(0, finiteNumber(battle.playerHp, runState.hp));
    battle.playerMana = Math.max(0, finiteNumber(battle.playerMana, runState.mana));
    battle.playerMaxHp = Math.max(1, finiteNumber(battle.playerMaxHp, runState.maxHp));
    battle.playerMaxMana = Math.max(1, finiteNumber(battle.playerMaxMana, runState.maxMana));
    battle.healingUsed = !!battle.healingUsed;
    battle.masteryClaims = battle.masteryClaims && typeof battle.masteryClaims==='object' ? battle.masteryClaims : {};
    prepareMonster(battle.monster);
    runState.phase = 'fight';
  }else{
    battle = null;
    if(runState.phase==='fight'){
      runState.phase = 'map';
      runState.currentNode = null;
      runState.pendingNode = null;
    }
  }
  return true;
}
let saveWriteQueue = Promise.resolve();
let saveRevision = 0;
let runCheckpointTimer = null;
function scheduleRunCheckpoint(){
  if(runCheckpointTimer || !runState || !activeCharacterId) return;
  runCheckpointTimer = setTimeout(()=>{
    runCheckpointTimer = null;
    saveState();
  }, 320);
}
async function saveState(){
  if(!state || !activeCharacterId) return;
  const revision = ++saveRevision;
  const characterId = activeCharacterId;
  const snapshot = JSON.stringify(state);
  const runSnapshot = activeRunSnapshot();
  updateSaveIndicator('saving');
  saveWriteQueue = saveWriteQueue.catch(()=>{}).then(async()=>{
    try{
      const savedState = JSON.parse(snapshot);
      await writeStored(characterKey(characterId), snapshot);
      if(runSnapshot) await writeStored(runKey(characterId), JSON.stringify(runSnapshot));
      else await clearRunSnapshot(characterId);
      const roster = await loadRoster();
      const summary = characterSummary({ ...savedState, id:characterId });
      const index = roster.findIndex(character => character.id===characterId);
      if(index >= 0) roster[index] = summary; else roster.push(summary);
      await saveRoster(roster.slice(0,3));
      if(revision === saveRevision){
        updateSaveIndicator('saved');
        setTimeout(()=>{ if(revision === saveRevision) updateSaveIndicator('idle'); }, 1800);
      }
      scheduleLeaderboardSync();
    }catch(error){ if(revision === saveRevision) updateSaveIndicator('error'); }
  });
  return saveWriteQueue;
}
function updateSaveIndicator(status){
  const el = document.getElementById('saveIndicator');
  if(!el) return;
  el.className = `save-indicator ${status==='idle'?'':status}`;
  if(developerMode && status==='idle'){ el.textContent='Modo desarrollador · guardado aislado'; return; }
  el.textContent = status==='saving' ? 'Guardando…' : status==='saved' ? 'Progreso guardado' : status==='error' ? 'No se pudo guardar' : accountSession ? 'Protegido local + nube' : 'Progreso local';
}

/* Ranking global: datos publicos del proyecto Supabase. */
const SUPABASE_URL = 'https://oyavyaoklewafurcyinj.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_FEFV1g_M2x1L56fLAEBA7g_DGlq4s0J';
const SUPABASE_SESSION_KEY = 'forja-eterna:supabase-session';
const CLOUD_SYNC_INTERVAL = 12 * 60 * 1000;
let accountSession = null;
let developerMode = false;
function isLocalDeveloperEnvironment(){
  const host=location.hostname;
  return location.protocol==='file:' || host==='localhost' || host==='127.0.0.1' || host==='[::1]';
}
let cloudSyncInterval = null;
let cloudSyncInFlight = null;
let gamePortalBooted = false;
let leaderboardEntries = [];
let leaderboardSyncTimer = null;
let leaderboardSyncInFlight = null;
const LEADERBOARD_CLASSES = {
  warrior:{label:'Guerrero',icon:'⚔',image:'assets/images/clase guerrero sprite.webp',color:'#e6a85e'}, archer:{label:'Arquero',icon:'🏹',image:'assets/images/clase arquero sprite.webp',color:'#75cf83'}, mage:{label:'Mago',icon:'✦',image:'assets/images/clase mago sprite.webp',color:'#8baeff'}, priest:{label:'Sacerdote',icon:'✚',image:'assets/images/clase sacerdote sprite.webp',color:'#f4d784'}, assassin:{label:'Asesino',icon:'🗡',image:'assets/images/clase asesino sprite.webp',color:'#dc7dca'}, tamer:{label:'Domador',icon:'🪢',image:'assets/images/clase domador sprite.webp',color:'#58d2a1'}
};
function leaderboardClassInfo(key){ const classKey=LEADERBOARD_CLASSES[key] ? key : 'warrior'; return { key:classKey, ...(LEADERBOARD_CLASSES[classKey] || {label:'Aventurero',icon:'✦',image:'assets/images/clase guerrero sprite.webp'}) }; }
function leaderboardProfile(){ return { class_key:state.characterClass || 'warrior', attack:Math.round(atkDamage()), defense:Math.round(totalDefense()), crit_chance:Math.round(critChance()) }; }
function scheduleLeaderboardSync(){
  if(developerMode) return;
  clearTimeout(leaderboardSyncTimer);
  leaderboardSyncTimer = setTimeout(()=>{ leaderboardSyncTimer = null; syncLeaderboard(); }, 1400);
}

function supabaseHeaders(token){
  const headers = { apikey:SUPABASE_PUBLISHABLE_KEY, 'Content-Type':'application/json' };
  if(token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function storedSupabaseSession(){
  try { return JSON.parse(loadLocal(SUPABASE_SESSION_KEY) || 'null'); } catch(_error) { return null; }
}
function persistSupabaseSession(session){
  if(session) saveLocal(SUPABASE_SESSION_KEY,JSON.stringify(session));
  else try{ localStorage.removeItem(SUPABASE_SESSION_KEY); }catch(_error){}
}
function isRegisteredSession(session){ return !!(session && session.user && session.access_token && !session.user.is_anonymous && session.user.email); }
async function refreshSupabaseSession(session){
  if(!session || !session.refresh_token) return null;
  try{
    const response=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:supabaseHeaders(),body:JSON.stringify({refresh_token:session.refresh_token})});
    if(!response.ok) return null;
    const refreshed=await response.json(); persistSupabaseSession(refreshed); return refreshed;
  }catch(_error){ return null; }
}
async function restoreRegisteredAccount(){
  let session=storedSupabaseSession();
  if(!isRegisteredSession(session)) return null;
  if(session.expires_at <= Math.floor(Date.now()/1000)+45) session=await refreshSupabaseSession(session);
  accountSession=isRegisteredSession(session)?session:null;
  return accountSession;
}
async function ensureRegisteredAccount(){
  if(!accountSession) return null;
  if(accountSession.expires_at <= Math.floor(Date.now()/1000)+45){
    accountSession=await refreshSupabaseSession(accountSession);
    if(!accountSession) persistSupabaseSession(null);
  }
  return accountSession;
}
async function authenticateAccount(mode,email,password,username){
  const endpoint=mode==='register'?'signup':'token?grant_type=password';
  const body=mode==='register'?{email,password,data:{username}}:{email,password};
  const response=await fetch(`${SUPABASE_URL}/auth/v1/${endpoint}`,{method:'POST',headers:{...supabaseHeaders(),Authorization:`Bearer ${SUPABASE_PUBLISHABLE_KEY}`},body:JSON.stringify(body)});
  const data=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(data.msg||data.error_description||data.message||'No se pudo acceder a la cuenta.');
  if(mode==='register' && !data.access_token) return {confirmationRequired:true};
  if(!isRegisteredSession(data)) throw new Error('El servidor no devolvió una sesión válida.');
  persistSupabaseSession(data); accountSession=data; return data;
}
function accountDisplayName(){ return accountSession?.user?.user_metadata?.username || accountSession?.user?.email?.split('@')[0] || 'Aventurero'; }
function updateAccountChip(){
  const chip=document.getElementById('accountChip');
  if(!chip) return;
  chip.hidden=!accountSession;
  const name=document.getElementById('accountChipName'); if(name) name.textContent=accountDisplayName();
}
function updateCloudIndicator(status){
  const el=document.getElementById('saveIndicator'); if(!el) return;
  if(status==='syncing'){ el.className='save-indicator saving'; el.textContent='Sincronizando nube…'; }
  else if(status==='synced'){ el.className='save-indicator saved'; el.textContent='Nube actualizada'; setTimeout(()=>updateSaveIndicator('idle'),1800); }
  else if(status==='offline'){ el.className='save-indicator error'; el.textContent='Guardado local · nube pendiente'; }
}
async function buildCloudPayload(){
  await saveWriteQueue.catch(()=>{});
  const roster=await loadRoster();
  const characters={}; const runs={};
  for(const hero of roster){
    const saved=await loadState(hero.id); if(saved) characters[hero.id]=saved;
    const run=await loadRunSnapshot(hero.id); if(run) runs[hero.id]=run;
  }
  return {version:2,season:'temporada-2',roster,characters,runs,savedAt:Date.now()};
}
async function pullCloudProgress(){
  if(!await ensureRegisteredAccount()) return false;
  const response=await fetch(`${SUPABASE_URL}/rest/v1/player_saves?select=payload,updated_at&player_id=eq.${accountSession.user.id}&limit=1`,{headers:supabaseHeaders(accountSession.access_token),cache:'no-store'});
  if(!response.ok) throw new Error(`Nube ${response.status}`);
  const rows=await response.json(); const remote=rows?.[0]?.payload;
  if(!remote || remote.version!==2 || remote.season!=='temporada-2' || !Array.isArray(remote.roster)) return false;
  const localRoster=await loadRoster(); const localMap=new Map(localRoster.map(hero=>[hero.id,hero]));
  const merged=[...localRoster];
  for(const remoteHero of remote.roster){
    const local=localMap.get(remoteHero.id);
    if(!local){ merged.push(remoteHero); }
    else if(finiteNumber(remoteHero.updatedAt)>finiteNumber(local.updatedAt)) merged[merged.findIndex(hero=>hero.id===remoteHero.id)]=remoteHero;
    if((!local || finiteNumber(remoteHero.updatedAt)>finiteNumber(local.updatedAt)) && remote.characters?.[remoteHero.id]) await writeStored(characterKey(remoteHero.id),JSON.stringify(remote.characters[remoteHero.id]));
    if(remote.runs?.[remoteHero.id]) await writeStored(runKey(remoteHero.id),JSON.stringify(remote.runs[remoteHero.id]));
  }
  merged.sort((a,b)=>finiteNumber(b.updatedAt)-finiteNumber(a.updatedAt));
  await saveRoster(merged.slice(0,3));
  return true;
}
async function pushCloudProgress(silent=false){
  if(!await ensureRegisteredAccount() || !navigator.onLine) { if(!silent) updateCloudIndicator('offline'); return false; }
  if(cloudSyncInFlight) return cloudSyncInFlight;
  cloudSyncInFlight=(async()=>{
    if(!silent) updateCloudIndicator('syncing');
    const payload=await buildCloudPayload();
    const response=await fetch(`${SUPABASE_URL}/rest/v1/player_saves?on_conflict=player_id`,{method:'POST',headers:{...supabaseHeaders(accountSession.access_token),Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({player_id:accountSession.user.id,payload,updated_at:new Date().toISOString()})});
    if(!response.ok) throw new Error(`Nube ${response.status}`);
    if(!silent) updateCloudIndicator('synced');
    return true;
  })();
  try{return await cloudSyncInFlight;}catch(error){console.warn('Cloud sync failed',error);if(!silent)updateCloudIndicator('offline');return false;}finally{cloudSyncInFlight=null;}
}
function startCloudBackup(){
  clearInterval(cloudSyncInterval);
  cloudSyncInterval=setInterval(()=>pushCloudProgress(),CLOUD_SYNC_INTERVAL);
  window.addEventListener('online',()=>pushCloudProgress());
  document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='hidden') pushCloudProgress(true); });
}
async function enterAuthenticatedWorld(){
  document.getElementById('accountGate').hidden=true; document.body.classList.remove('account-locked');
  updateAccountChip();
  try{ await pullCloudProgress(); }catch(error){ console.warn('Cloud restore unavailable',error); }
  await launchGamePortal();
  startCloudBackup();
  pushCloudProgress(true);
}
function updateDeveloperPanel(){
  const readout=document.getElementById('developerHeroReadout');
  if(!readout) return;
  readout.textContent=state ? `${state.name} · Nv. ${state.level} · ${state.gold} oro` : 'Elegí o creá un personaje';
}
async function applyDeveloperAction(action,value){
  if(!developerMode || !state) { updateDeveloperPanel(); return; }
  const amount=Math.max(0,Number(value)||0);
  if(action==='level'){
    state.level=Math.max(1,state.level+amount);
    state.maxLevelEver=Math.max(state.maxLevelEver||1,state.level);
    state.statPoints=(state.statPoints||0)+(amount*5);
    state.exp=0;
    showFeedback('NIVEL DE PRUEBA ACTUALIZADO', `Nivel ${state.level} · +${amount*5} puntos`, 'reward');
  }else if(action==='gold'){
    state.gold=(state.gold||0)+amount;
    showFeedback('ORO DE PRUEBA', `+${amount} oro`, 'reward');
  }else if(action==='points'){
    state.statPoints=(state.statPoints||0)+amount;
    showFeedback('PUNTOS DE PRUEBA', `+${amount} puntos disponibles`, 'reward');
  }else if(action==='restore'){
    if(runState){ runState.hp=maxHP(); runState.mana=maxMana(); }
    if(battle){ battle.playerHp=battle.playerMaxHp||maxHP(); battle.playerMana=battle.playerMaxMana||maxMana(); }
    showFeedback('RECURSOS RESTAURADOS', 'Vida y maná al máximo', 'heal');
  }
  await saveState(); render(); updateDeveloperPanel();
}
async function enterDeveloperWorld(){
  if(!isLocalDeveloperEnvironment()) return;
  developerMode=true;
  accountSession=null;
  document.getElementById('accountGate').hidden=true;
  document.body.classList.remove('account-locked');
  document.getElementById('developerPanel').hidden=false;
  const saveIndicator=document.getElementById('saveIndicator');
  if(saveIndicator) saveIndicator.textContent='Modo desarrollador · guardado local';
  await launchGamePortal();
  updateDeveloperPanel();
}
function setAccountMode(mode){
  const gate=document.getElementById('accountGate'); gate.dataset.mode=mode;
  gate.querySelectorAll('[data-auth-mode]').forEach(button=>button.classList.toggle('active',button.dataset.authMode===mode));
  const submit=document.getElementById('accountSubmit'); submit.querySelector('span').textContent=mode==='register'?'CREAR MI CUENTA':'ENTRAR AL SANTUARIO';
  document.getElementById('accountPassword').autocomplete=mode==='register'?'new-password':'current-password';
  document.getElementById('accountStatus').textContent='';
}
async function initializeAccountGate(){
  purgeLegacyLocalProgress();
  document.body.classList.add('account-locked'); setAccountMode('login');
  document.querySelectorAll('[data-auth-mode]').forEach(button=>button.addEventListener('click',()=>setAccountMode(button.dataset.authMode)));
  document.getElementById('toggleAccountPassword').addEventListener('click',()=>{ const input=document.getElementById('accountPassword'); input.type=input.type==='password'?'text':'password'; });
  const developerEntry=document.getElementById('developerEntry');
  if(isLocalDeveloperEnvironment()){
    developerEntry.hidden=false;
    developerEntry.addEventListener('click',enterDeveloperWorld);
  }
  document.getElementById('developerPanelToggle').addEventListener('click',()=>document.getElementById('developerPanel').classList.toggle('minimized'));
  document.querySelectorAll('[data-dev-action]').forEach(button=>button.addEventListener('click',()=>applyDeveloperAction(button.dataset.devAction,button.dataset.value)));
  document.getElementById('accountForm').addEventListener('submit',async event=>{
    event.preventDefault(); const gate=document.getElementById('accountGate'), mode=gate.dataset.mode||'login';
    const email=document.getElementById('accountEmail').value.trim().toLowerCase(); const password=document.getElementById('accountPassword').value; const username=document.getElementById('accountName').value.trim().slice(0,20); const status=document.getElementById('accountStatus'); const submit=document.getElementById('accountSubmit');
    status.className='account-status';
    if(!/^\S+@\S+\.\S+$/.test(email)){status.className+=' error';status.textContent='Ingresá un correo válido.';return;}
    if(password.length<6){status.className+=' error';status.textContent='La contraseña necesita al menos 6 caracteres.';return;}
    if(mode==='register' && username.length<3){status.className+=' error';status.textContent='El nombre de cuenta necesita al menos 3 caracteres.';return;}
    submit.disabled=true;status.textContent=mode==='register'?'Creando tu sello…':'Abriendo el santuario…';
    try{const result=await authenticateAccount(mode,email,password,username);if(result.confirmationRequired){setAccountMode('login');status.className='account-status success';status.textContent='Cuenta creada. Revisá tu correo para confirmarla y luego iniciá sesión.';return;}status.className='account-status success';status.textContent='Cuenta conectada. Recuperando tu progreso…';await enterAuthenticatedWorld();}
    catch(error){status.className='account-status error';status.textContent=String(error.message||'No se pudo ingresar.').replace('Invalid login credentials','Correo o contraseña incorrectos.').replace('User already registered','Ese correo ya está registrado.');}
    finally{submit.disabled=false;}
  });
  document.getElementById('accountLogoutBtn').addEventListener('click',async()=>{ if(!confirm('¿Cerrar sesión? Tu progreso local no se borrará.'))return;await pushCloudProgress(true);try{await fetch(`${SUPABASE_URL}/auth/v1/logout`,{method:'POST',headers:supabaseHeaders(accountSession?.access_token)});}catch(_error){}accountSession=null;persistSupabaseSession(null);location.reload(); });
  const restored=await restoreRegisteredAccount(); if(restored){await enterAuthenticatedWorld();return true;} return false;
}

async function getSupabaseSession(){
  if(accountSession){ const registered=await ensureRegisteredAccount(); if(registered) return registered; }
  let saved = storedSupabaseSession();
  if(saved && saved.access_token && saved.expires_at > Math.floor(Date.now()/1000) + 30) return saved;

  let response;
  if(saved && saved.refresh_token){
    response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method:'POST', headers:supabaseHeaders(), body:JSON.stringify({refresh_token:saved.refresh_token})
    });
  }
  if(!response || !response.ok){
    response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method:'POST',
      headers:{ ...supabaseHeaders(), Authorization:`Bearer ${SUPABASE_PUBLISHABLE_KEY}` },
      body:JSON.stringify({data:{}})
    });
  }
  if(!response.ok) throw new Error('No se pudo iniciar sesion para el ranking.');
  const session = await response.json();
  if(!session.user || !session.access_token) throw new Error('Sesion de ranking invalida.');
  saveLocal(SUPABASE_SESSION_KEY, JSON.stringify(session));
  return session;
}

async function syncLeaderboard(){
  if(developerMode || !state || !state.name) return false;
  if(leaderboardSyncInFlight) return leaderboardSyncInFlight;
  leaderboardSyncInFlight = (async()=>{
  try{
    const session = await getSupabaseSession();
    const entry = {
      player_id:session.user.id,
      name:state.name,
      level:state.level,
      resets:state.resets,
      power:Math.round(power()),
      ...leaderboardProfile(),
      updated_at:new Date().toISOString()
    };
    let response = await fetch(`${SUPABASE_URL}/rest/v1/leaderboard?on_conflict=player_id`, {
      method:'POST',
      headers:{ ...supabaseHeaders(session.access_token), Prefer:'resolution=merge-duplicates,return=minimal' },
      body:JSON.stringify(entry)
    });
    if(!response.ok){
      const { class_key, attack, defense, crit_chance, ...legacyEntry } = entry;
      response = await fetch(`${SUPABASE_URL}/rest/v1/leaderboard?on_conflict=player_id`, { method:'POST', headers:{ ...supabaseHeaders(session.access_token), Prefer:'resolution=merge-duplicates,return=minimal' }, body:JSON.stringify(legacyEntry) });
    }
    if(!response.ok) throw new Error(`Ranking ${response.status}`);
    return true;
  }catch(e){ console.warn('No se pudo sincronizar el ranking global.', e); return false; }
  })();
  try { return await leaderboardSyncInFlight; }
  finally { leaderboardSyncInFlight = null; }
}
async function fetchLeaderboard(){
  try{
    await syncLeaderboard();
    let response = await fetch(`${SUPABASE_URL}/rest/v1/leaderboard?select=name,level,resets,power,class_key,attack,defense,crit_chance,updated_at&order=power.desc,resets.desc,level.desc,updated_at.asc&limit=10`, {
      headers:supabaseHeaders(), cache:'no-store'
    });
    if(!response.ok) response = await fetch(`${SUPABASE_URL}/rest/v1/leaderboard?select=name,level,resets,power,updated_at&order=power.desc,resets.desc,level.desc,updated_at.asc&limit=10`, { headers:supabaseHeaders(), cache:'no-store' });
    if(!response.ok) throw new Error(`Ranking ${response.status}`);
    const entries = await response.json();
    renderLeaderboard(Array.isArray(entries) ? entries : []);
  }catch(e){ renderLeaderboard(null); }
}
function escapeHtml(s){ return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function decorateLeaderboardEntry(entry){
  const isCurrentHero = !!state && String(entry.name)===String(state.name) && Number(entry.level)===Number(state.level) && Number(entry.resets)===Number(state.resets);
  return entry.class_key || !isCurrentHero ? entry : { ...entry, ...leaderboardProfile() };
}
function leaderboardOrder(a,b){
  const byPower=(Number(b.power)||0)-(Number(a.power)||0);
  if(byPower) return byPower;
  const byResets=(Number(b.resets)||0)-(Number(a.resets)||0);
  if(byResets) return byResets;
  const byLevel=(Number(b.level)||0)-(Number(a.level)||0);
  if(byLevel) return byLevel;
  return String(a.updated_at||'').localeCompare(String(b.updated_at||''));
}
function leaderboardCrest(hero){
  const src=(typeof CLASS_EMBLEMS!=='undefined' && CLASS_EMBLEMS[hero.key]) || '';
  return src ? `<img src="${src}" alt="" decoding="async">` : hero.icon;
}
function leaderboardTitle(rank){
  if(rank===1) return 'Campeón del Santuario';
  if(rank===2) return 'Mano derecha del trono';
  if(rank===3) return 'Leyenda en ascenso';
  if(rank<=10) return 'Héroe de la expedición';
  return 'Aventurero del Santuario';
}
function leaderboardTier(powerValue){
  const power=Math.max(0,Number(powerValue)||0);
  if(power>=1500) return 'Mítico';
  if(power>=900) return 'Legendario';
  if(power>=500) return 'Épico';
  if(power>=220) return 'Raro';
  if(power>=80) return 'Poco común';
  return 'Común';
}
function openLeaderboardProfile(index){
  const entry = leaderboardEntries[index]; if(!entry) return;
  const hero = leaderboardClassInfo(entry.class_key);
  const rank=Number(entry.rank)||index+1;
  const powerValue=Number(entry.power)||0;
  const statValue=value=>Number.isFinite(Number(value)) ? Number(value) : '—';
  const leaderPower=Math.max(1,Number(leaderboardEntries[0]?.power)||1);
  const leaderProgress=Math.min(100,Math.round((powerValue/leaderPower)*100));
  const gap=Math.max(0,leaderPower-powerValue);
  const heroDescription=(typeof CLASSES!=='undefined' && CLASSES[hero.key]?.description) || 'Forja su leyenda en las profundidades.';
  document.getElementById('playerProfileBackdrop')?.remove();
  const profile = document.createElement('div'); profile.id='playerProfileBackdrop'; profile.className='player-profile-backdrop';
  profile.innerHTML = `<div class="player-profile-card living-profile" style="--profile-accent:${hero.color||'#e8c477'}" role="dialog" aria-modal="true" aria-label="Ficha pública de ${escapeHtml(entry.name)}"><button class="profile-close" type="button" aria-label="Cerrar">×</button><div class="profile-rank-ribbon">✦ PUESTO GLOBAL #${rank}</div><div class="profile-banner"><div class="profile-avatar-shell"><img class="profile-avatar" src="${hero.image}" alt="${hero.label}" decoding="async"><span class="profile-level-orb">${Number(entry.level)||1}<small>NV.</small></span></div><div class="profile-identity"><small>${hero.icon} ${leaderboardTitle(rank).toUpperCase()}</small><h2>${escapeHtml(entry.name)}</h2><p>${hero.label} · ${leaderboardTier(powerValue)} · ${Number(entry.resets)||0} reset${Number(entry.resets)===1?'':'s'}</p><em class="profile-class-story">${escapeHtml(heroDescription)}</em><div class="profile-power"><span>⚡ PODER TOTAL</span><b>${powerValue.toLocaleString('es-AR')}</b></div></div></div><div class="profile-journey"><div><small>RANGO DE PODER</small><b>${leaderProgress}% del líder</b></div><div class="profile-leader-track"><span style="width:${leaderProgress}%"></span></div><em>${rank===1 ? 'Lidera el santuario.' : `A ${gap.toLocaleString('es-AR')} de alcanzar el primer puesto.`}</em></div><div class="profile-combat-title">ESTADÍSTICAS DE COMBATE</div><div class="profile-stats"><div class="profile-stat attack"><small>ATAQUE</small><b>${statValue(entry.attack)}</b></div><div class="profile-stat defense"><small>DEFENSA</small><b>${statValue(entry.defense)}</b></div><div class="profile-stat crit"><small>CRÍTICO</small><b>${entry.crit_chance == null ? '—' : `${statValue(entry.crit_chance)}%`}</b></div></div><div class="profile-summary"><span><b>NIVEL</b>${Number(entry.level)||1}</span><span><b>RESETS</b>${Number(entry.resets)||0}</span><span><b>CLASE</b>${hero.label}</span></div></div>`;
  profile.addEventListener('click', event=>{ if(event.target===profile || event.target.closest('.profile-close')) profile.remove(); }); document.body.appendChild(profile);
}
function renderLeaderboard(entries){
  const box = document.getElementById('lbTabContent');
  if(!box) return;
  if(!entries){ box.innerHTML = `<div id="lbStatus">No se pudo cargar el ranking global.</div>`; return; }
  if(entries.length===0){ box.innerHTML = `<div id="lbStatus">Todavía no hay nadie en el ranking. ¡Sé el primero!</div>`; return; }
  leaderboardEntries = entries.map(decorateLeaderboardEntry).sort(leaderboardOrder).map((entry,index)=>({ ...entry, rank:index+1 }));
  const leader=leaderboardEntries[0];
  box.innerHTML = `<div class="lb-dashboard"><div><small>CLASIFICACIÓN GLOBAL</small><b>Ordenado por poder</b></div><span>⚡ ${Number(leader.power||0).toLocaleString('es-AR')} <em>líder actual</em></span></div><div class="lb-intro">Tocá un aventurero para inspeccionar su ficha pública.</div>` + leaderboardEntries.map((e,i)=>{
    const hero = leaderboardClassInfo(e.class_key);
    const topClass=i<3 ? ` podium-${i+1}` : '';
    return `<button class="lb-row${topClass} ${e.name===state.name?'me':''}" type="button" onclick="openLeaderboardProfile(${i})" aria-label="Ver perfil de ${escapeHtml(e.name)}"><span class="rank">${i<3 ? ['♛','♜','♞'][i] : e.rank}</span><span class="lb-crest">${leaderboardCrest(hero)}</span><span class="lb-player"><strong>${escapeHtml(e.name)}</strong><small><b>${hero.label}</b> · Nv. ${Number(e.level)||1} · ${Number(e.resets)||0} reset${Number(e.resets)===1?'':'s'}</small></span><span class="lb-power"><b>⚡ ${Number(e.power||0).toLocaleString('es-AR')}</b><span class="lb-view">FICHA ›</span></span></button>`;
  }).join('');
}
function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

/* ================= EQUIP BONUSES ================= */
function equippedSetSummary(){
  const grouped = {};
  Object.values(state?.equipment || {}).filter(Boolean).forEach(item=>{
    const setId = item.setId || (item.classOnly ? `class-${item.classOnly}` : 'traveler');
    (grouped[setId] ||= []).push(item);
  });
  const sets = Object.entries(grouped).map(([id,items])=>{
    const definition = EQUIPMENT_SET_DEFS[id] || { label:items[0]?.setLabel || 'Set desconocido', affinity:'', bonuses:[] };
    const active = (definition.bonuses || []).filter(tier=>items.length>=tier.pieces);
    return { id, items, pieces:items.length, definition, active };
  }).sort((a,b)=>b.pieces-a.pieces);
  return { sets, primary:sets[0] || null };
}

function getEquipmentBonuses() {
  let atk = 0, def = 0, crit = 0, critDmg = 0, hp = 0, mana = 0, speed = 0;
  if (!state.equipment) return { atk, def, crit, critDmg, hp, mana, speed };
  Object.values(state.equipment).forEach(item => {
    if (item) {
      const multiplier = 1 + Math.min(ENHANCE_MAX,finiteNumber(item.enhanceLevel))* .08;
      atk += Math.round(finiteNumber(item.bonusAtk)*multiplier);
      def += Math.round(finiteNumber(item.bonusDef)*multiplier);
      crit += Math.round(finiteNumber(item.bonusCrit)*multiplier);
      critDmg += Math.round(finiteNumber(item.bonusCritDmg)*multiplier);
      hp += Math.round(finiteNumber(item.bonusHp)*multiplier);
      mana += Math.round(finiteNumber(item.bonusMana)*multiplier);
      speed += Math.round(finiteNumber(item.bonusSpeed)*multiplier);
    }
  });
  equippedSetSummary().sets.forEach(set=>set.active.forEach(tier=>{
    atk += finiteNumber(tier.bonuses.atk);
    def += finiteNumber(tier.bonuses.def);
    crit += finiteNumber(tier.bonuses.crit);
    critDmg += finiteNumber(tier.bonuses.critDmg);
    hp += finiteNumber(tier.bonuses.hp);
    mana += finiteNumber(tier.bonuses.mana);
    speed += finiteNumber(tier.bonuses.speed);
  }));
  return { atk, def, crit, critDmg, hp, mana, speed };
}

/* ================= GAME MATH ================= */
function finiteNumber(value, fallback=0){
  const number = Number(value);
  if(Number.isFinite(number)) return number;
  // Conserva la parte válida de una guardada antigua, por ejemplo "1064[object PointerEvent]".
  if(typeof value==='string'){
    const recovered = Number.parseFloat(value);
    if(Number.isFinite(recovered)) return recovered;
  }
  return fallback;
}
function safePositiveInt(value, fallback=1){
  return Math.max(1, Math.round(finiteNumber(value, fallback)));
}
function expToNext(level){
  // El comienzo conserva ritmo, pero cada nivel avanzado requiere un compromiso
  // mayor para que llegar al renacer sea una meta de largo plazo.
  const base = 105 * Math.pow(level, 1.68);
  const resetDiscount = Math.min(0.5, finiteNumber(state.resets) * 0.04);
  return Math.floor(base * (1 - resetDiscount));
}
function currentClass(){ return CLASSES[state.characterClass] || CLASSES.warrior; }
function currentSubclass(){
  const pool = SUBCLASSES[state.characterClass] || {};
  return state.subclass && pool[state.subclass] ? pool[state.subclass] : null;
}
// La subclase no sólo aporta bonos: también pasa a ser la identidad visual activa
// del aventurero en perfil, equipo, combate y herrería.
function activeHeroVisual(){
  const base = battleClassStyle();
  const sub = currentSubclass();
  if(!sub) return { ...base, baseLabel:base.label, isSubclass:false };
  return {
    ...base,
    image: sub.image || base.image,
    icon: sub.icon || base.icon,
    label: sub.label,
    baseLabel: base.label,
    weapon: `${base.weapon} · ${sub.label}`,
    description: sub.description || '',
    isSubclass:true
  };
}
function subclassBonus(key){
  const sub = currentSubclass();
  return sub ? finiteNumber(sub.bonuses && sub.bonuses[key], 0) : 0;
}
// Las mejoras obtenidas dentro de Cacería viven sólo en la expedición actual.
function runStatBonus(key){
  if(!runState || runState.phase==='ended') return 0;
  return Math.max(0, Number((runState.tempStats||{})[key]) || 0);
}
// Cada Renacimiento entrega una Marca Eterna lineal. Es una mejora permanente
// valiosa, pero no crece de forma explosiva en el late game.
function resetStatBonus(){ return Math.max(0, Math.floor(finiteNumber(state.resets))); }
function rebirthStartingPoints(){ return Math.max(0, Math.floor(finiteNumber(state.resets))) * 2; }
function baseStat(key){ return finiteNumber(state.stats[key]) + resetStatBonus() + runStatBonus(key); }
// Curva suave de final de juego: el héroe sigue creciendo, pero los puntos
// extremos ya no multiplican el daño de forma descontrolada.
function softCap(value, threshold, overflowScale){
  const safe = Math.max(0, finiteNumber(value, 0));
  return safe <= threshold ? safe : threshold + (safe-threshold) * overflowScale;
}
// Todas las clases parten exactamente de la misma hoja base. Las diferencias de clase
// provienen de sus habilidades; el crecimiento permanente viene de puntos y equipo.
const HERO_BASE_STATS = Object.freeze({ hp:100, mana:100, attack:10, defense:10, evasion:0 });
function heroGrowth(key){ return Math.max(0,baseStat(key)-(key==='ataque'||key==='vida'||key==='mana'?1:0)); }
function maxHP(){ return HERO_BASE_STATS.hp + subclassBonus('hp') + heroGrowth('vida')*10 + getEquipmentBonuses().hp + runRelicValue('hp'); }
function maxMana(){ return HERO_BASE_STATS.mana + subclassBonus('mana') + heroGrowth('mana')*6 + getEquipmentBonuses().mana + runRelicValue('mana'); }
function atkDamage(){ 
  const eq = getEquipmentBonuses();
  const investedAttack = softCap(heroGrowth('ataque'), 35, .55);
  return (HERO_BASE_STATS.attack + subclassBonus('atk') + investedAttack + eq.atk) * (1+runRelicValue('atk')); 
}
function totalDefense(){ return HERO_BASE_STATS.defense + subclassBonus('def') + finiteNumber(state.robustness) + resetStatBonus() + runStatBonus('robustez') + getEquipmentBonuses().def; }
function damageReduction(){
  return Math.min(.70,totalDefense()*.01);
}
function critChance(){ 
  const eq = getEquipmentBonuses();
  return Math.min(0.75, (finiteNumber(state.critRateStat, 0) + eq.crit + currentClass().crit + subclassBonus('crit') + runRelicValue('crit')) / 100); 
}
function critMultiplier() {
  const eq = getEquipmentBonuses();
  return Math.min(3.2, (200 + finiteNumber(state.critDmgStat, 0) + eq.critDmg + subclassBonus('critDmg')) / 100 + runRelicValue('critDmg'));
}
function dodgeChance(){ return Math.min(0.55, HERO_BASE_STATS.evasion/100 + subclassBonus('dodge')/100 + baseStat('agilidad')*0.004); }
function extraTurnChance(){ return Math.min(0.5, subclassBonus('speed')/100 + baseStat('rapidez')*0.005 + getEquipmentBonuses().speed/100 + runRelicValue('extraTurn')); }

function heroStatBreakdown(){
  const eq=getEquipmentBonuses();
  return {
    hp:{ base:HERO_BASE_STATS.hp, progress:Math.round(heroGrowth('vida')*10+runRelicValue('hp')), equipment:eq.hp, total:Math.round(maxHP()) },
    mana:{ base:HERO_BASE_STATS.mana, progress:Math.round(heroGrowth('mana')*6+runRelicValue('mana')), equipment:eq.mana, total:Math.round(maxMana()) },
    attack:{ base:HERO_BASE_STATS.attack, progress:Math.round(softCap(heroGrowth('ataque'),35,.55)), equipment:eq.atk, total:Math.round(atkDamage()) },
    defense:{ base:HERO_BASE_STATS.defense, progress:Math.round(finiteNumber(state.robustness)+resetStatBonus()+runStatBonus('robustez')), equipment:eq.def, total:Math.round(totalDefense()) },
    evasion:{ base:HERO_BASE_STATS.evasion, progress:Math.round(baseStat('agilidad')*.4*10)/10, equipment:0, total:Math.round(dodgeChance()*1000)/10 }
  };
}

function power(){ 
  const eq = getEquipmentBonuses();
  const value = atkDamage()*1.4 + maxHP()*0.15 + maxMana()*0.1 + baseStat('agilidad') + baseStat('rapidez') + eq.def*0.8 + eq.crit*1.5 + eq.critDmg*0.25;
  return Math.max(12, finiteNumber(value, 35));
}
// El poder mostrado incluye supervivencia; para escalar monstruos usamos una
// amenaza ofensiva separada. Así subir vida o defensa nunca fortalece al rival.
function offensiveThreat(){
  const expectedCrit = 1 + critChance() * Math.max(0, critMultiplier()-1) * 0.7;
  const tempo = 1 + extraTurnChance() * 0.32;
  const classSkill = Math.max(1, finiteNumber(currentClass().skillMult, 1) + subclassBonus('skillMult'));
  return Math.max(18, finiteNumber(atkDamage() * expectedCrit * tempo * classSkill, 35));
}

function rollMissionReset(){
  const m = state.missions;
  if(m.dayKey !== todayKey()){ m.dayKey = todayKey(); m.day = { hunts:0, goldEarned:0, levelsGained:0, fishCaught:0, claimed:[false,false,false,false] }; }
  if(m.weekKeyVal !== weekKey()){ m.weekKeyVal = weekKey(); m.week = { wins:0, resets:0, fishRare:0, claimed:[false,false,false] }; }
  if(m.monthKeyVal !== monthKey()){ m.monthKeyVal = monthKey(); m.month = { resets:0, goldEarned:0, claimed:[false,false] }; }
}
// (damageReduction, la única estadística defensiva, se define más arriba)
// El análisis tiene un techo natural de 100%; el bono de botín sigue creciendo por cada punto.
function perceptionChance(){ return Math.min(100, 1 + (state.perception||0) * 7); }
function perceptionLootBonus(){ return (state.perception||0) * .025; }
function earnedStatResets(){ return Math.max(0, state.statResetsEarned||0); }
function availableStatResets(){ return Math.max(0, earnedStatResets() - (state.statResetsUsed||0)); }

function normalizeState(){
  const fresh = defaultState(state.name || 'Guerrero');
  state = { ...fresh, ...state };
  if(!CLASSES[state.characterClass]) state.characterClass = 'warrior';
  state.stats = { ...fresh.stats, ...(state.stats || {}) };
  state.allocatedPoints = { ...fresh.allocatedPoints, ...(state.allocatedPoints || {}) };
  state.pendingPoints = { ...fresh.pendingPoints, ...(state.pendingPoints || {}) };
  Object.keys(fresh.stats).forEach(key=> state.stats[key] = Math.max(0, finiteNumber(state.stats[key], fresh.stats[key])));
  ['level','resets','exp','gold','guildMarks','statPoints','strength','critRateStat','critDmgStat'].forEach(key=>{
    state[key] = Math.max(0, finiteNumber(state[key], fresh[key]));
  });
  state.robustness = Number(state.robustness) || 0;
  state.perception = Number(state.perception) || 0;
  state.statResetsUsed = Math.max(0, Number(state.statResetsUsed) || 0);
  state.statResetsEarned = Math.max(Math.floor((state.level||0)/5), Number(state.statResetsEarned) || 0);
  state.equipment = { ...fresh.equipment, ...(state.equipment || {}) };
  state.ownedEquipment = Array.isArray(state.ownedEquipment) ? state.ownedEquipment : [];
  // Migra piezas forjadas de versiones anteriores al nuevo set Ancestral.
  const migrateForgeSet = item => {
    if(!item) return item;
    // Renueva ilustraciones de guardados anteriores: ahora cada ranura usa su propia pieza.
    if(item.equipmentTier === 'base' || item.setId === 'traveler'){
      item.equipmentTier = 'base';
      item.setId = 'traveler';
      item.image = UNIVERSAL_GEAR_ART[item.type] || item.image;
    }
    if(item.equipmentTier === 'subclass' && item.subclassOnly){
      item.image = subclassPieceArt(item.classOnly, item.subclassOnly, item.type);
    }
    if(item && (item.rarityKey==='ancestral' || item.forgeExclusive || String(item.id||'').endsWith('_forjado')) && item.classOnly){
      item.setId = `ancestral-${item.classOnly}`;
      item.setLabel = `Legado Ancestral de ${(CLASSES[item.classOnly] || {}).label || item.classOnly}`;
      item.image = ANCESTRAL_FORGE_ART[item.classOnly] || item.image;
      item.equipmentTier = 'forge';
      item.forgeExclusive = true;
    }
    return item;
  };
  state.ownedEquipment.forEach(migrateForgeSet);
  Object.values(state.equipment).forEach(migrateForgeSet);
  Object.keys(state.equipment).forEach(slot=>{
    const item = state.equipment[slot];
    if(item && !itemFitsCurrentClass(item)){
      state.ownedEquipment.push(item);
      state.equipment[slot] = null;
    }
  });
  state.ownedItems = state.ownedItems || {};
  state.materials = { ...fresh.materials, ...(state.materials || {}) };
  state.materials.essence = Math.max(0, finiteNumber(state.materials.essence));
  state.materials.bossCore = Math.max(0, finiteNumber(state.materials.bossCore));
  state.materials.bossTrophies = state.materials.bossTrophies || {};
  state.materials.scale = Math.max(0, finiteNumber(state.materials.scale));
  state.fishing = { ...fresh.fishing, ...(state.fishing || {}) };
  state.fishing.totalCaught = Math.max(0, finiteNumber(state.fishing.totalCaught));
  state.fishing.rodLevel = Math.max(1, finiteNumber(state.fishing.rodLevel, 1));
  state.fishing.tameCharm = !!state.fishing.tameCharm;
  state.fishing.dex = { ...fresh.fishing.dex, ...(state.fishing.dex || {}) };
  state.fishing.bestWeight = { ...(state.fishing.bestWeight || {}) };
  Object.keys(state.fishing.bestWeight).forEach(key=>{ state.fishing.bestWeight[key] = Math.max(0, finiteNumber(state.fishing.bestWeight[key])); });
  Object.keys(state.fishing.dex).forEach(key=>{ state.fishing.dex[key] = Math.max(0, finiteNumber(state.fishing.dex[key])); });
  state.fishing.streak = Math.max(0, finiteNumber(state.fishing.streak));
  state.fishing.bestStreak = Math.max(0, finiteNumber(state.fishing.bestStreak));
  state.campaignWins = Math.max(0, Number(state.campaignWins)||0);
  state.weeklyChallenge = { ...fresh.weeklyChallenge, ...(state.weeklyChallenge || {}) };
  state.lastRunSummary = state.lastRunSummary && typeof state.lastRunSummary==='object' ? state.lastRunSummary : null;
  state.bestRunSummary = state.bestRunSummary && typeof state.bestRunSummary==='object' ? state.bestRunSummary : null;
  state.settings = { ...fresh.settings, ...(state.settings || {}) };
  state.settings.musicVolume = Math.max(0, Math.min(100, Number(state.settings.musicVolume)));
  state.settings.sfxVolume = Math.max(0, Math.min(100, Number(state.settings.sfxVolume)));
  state.settings.musicEnabled = !!state.settings.musicEnabled;
  state.settings.sfxEnabled = state.settings.sfxEnabled !== false;
  state.settings.graphics = ['high','medium','low'].includes(state.settings.graphics) ? state.settings.graphics : 'high';
  state.settings.reducedMotion = !!state.settings.reducedMotion;
  state.settings.performanceMode = ['auto','on','off'].includes(state.settings.performanceMode) ? state.settings.performanceMode : 'auto';
  state.log = Array.isArray(state.log) ? state.log : [];
  state.achievementsClaimed = state.achievementsClaimed || {};
  state.bestiary = state.bestiary || {};
  state.tutorialSeen = !!state.tutorialSeen;
  state.companion = state.companion || null;
  state.missions = { ...fresh.missions, ...(state.missions || {}) };
  ['day','week','month'].forEach(period => {
    state.missions[period] = { ...fresh.missions[period], ...(state.missions[period] || {}) };
    state.missions[period].claimed = Array.isArray(state.missions[period].claimed) ? state.missions[period].claimed : [];
  });
  rollMissionReset();
}


/* ================= SCRIPT PRINCIPAL (continuación: asignación de stats, UI, render, inicialización) ================= */
const ALLOCATION_STATS = [
  { key:'ataque', group:'Combate', icon:'⚔\ufe0e', label:'Ataque', description:'Aumenta el daño base de todos tus golpes.', value:()=>Math.round(atkDamage()), add:1 },
  { key:'critRate', group:'Combate', icon:'✹', label:'Prob. critica', description:'Posibilidad de convertir un golpe en crítico. Máximo efectivo: 75%.', value:()=>Math.round(critChance()*100)+'%', add:1, critical:true },
  { key:'critDmg', group:'Combate', icon:'◎', label:'Daño critico', description:'Potencia adicional de los golpes críticos. Máximo efectivo: 320%.', value:()=>Math.round(critMultiplier()*100)+'%', add:5, critical:true },
  { key:'vida', group:'Supervivencia', icon:'♥', label:'Vida', description:'Aumenta tu vida máxima durante la expedición.', value:()=>maxHP(), add:1 },
  { key:'mana', group:'Supervivencia', icon:'✦', label:'Mana', description:'Aumenta el mana disponible para habilidades.', value:()=>maxMana(), add:1 },
  { key:'robustez', group:'Supervivencia', icon:'⬡', label:'Defensa', description:'Suma defensa sobre la base universal de 10 y reduce el daño recibido.', value:()=>`${Math.round(totalDefense())} · ${Math.round(damageReduction()*100)}% reducción`, add:1 },
  { key:'agilidad', group:'Supervivencia', icon:'↝', label:'Evasión', description:'Parte de 0% y mejora la posibilidad de esquivar por completo un ataque.', value:()=>Math.round(dodgeChance()*1000)/10+'%', add:1 },
  { key:'rapidez', group:'Supervivencia', icon:'⌁', label:'Rapidez', description:'Mejora la probabilidad de obtener un golpe extra.', value:()=>Math.round(extraTurnChance()*100)+'%', add:1 },
  { key:'percepcion', group:'Exploración', icon:'◉', label:'Percepción', description:'Puede revelar la vida exacta del enemigo. También aumenta el botín de élites y jefes.', value:()=>`${Math.round(perceptionChance())}% análisis · botín +${Math.round(perceptionLootBonus()*100)}%`, add:1 },
];

function canRespecPoints(){ return availableStatResets()>0 && !battle && !(runState && runState.phase!=='ended'); }
function allocationTotal(){ return Object.values(state.allocatedPoints || {}).reduce((sum, value)=>sum+(Number(value)||0),0); }
function pendingTotal(){ return Object.values(state.pendingPoints || {}).reduce((sum, value)=>sum+(Number(value)||0),0); }
function emptyPointMap(){ return { ataque:0, vida:0, mana:0, agilidad:0, rapidez:0, robustez:0, percepcion:0, critRate:0, critDmg:0 }; }
function applyStatDelta(key, points){
  const conf = ALLOCATION_STATS.find(stat=>stat.key===key);
  if(!conf || !points) return;
  if(key==='critRate') state.critRateStat = Math.max(0, state.critRateStat + points*conf.add);
  else if(key==='critDmg') state.critDmgStat = Math.max(0, state.critDmgStat + points*conf.add);
  else if(key==='robustez') state.robustness = Math.max(0, state.robustness + points*conf.add);
  else if(key==='percepcion') state.perception = Math.max(0, state.perception + points*conf.add);
  else state.stats[key] = Math.max(1, (state.stats[key]||1) + points*conf.add);
}
function statJuice(key, direction, investedPoints){
  const card = document.querySelector(`.stat-card[data-stat-key="${key}"]`);
  const valEl = document.getElementById(`val-${key}`);
  const countEl = document.getElementById(`count-${key}`);
  const iconEl = document.getElementById(`icon-${key}`);
  const stepper = document.getElementById(`stepper-${key}`);
  const isMilestone = direction>0 && investedPoints>0 && investedPoints%5===0;
  if(card){
    card.classList.remove('card-pulse','card-pulse-out','milestone-flash');
    void card.offsetWidth;
    card.classList.add(isMilestone ? 'milestone-flash' : (direction>0 ? 'card-pulse' : 'card-pulse-out'));
  }
  if(iconEl && direction>0){ iconEl.classList.remove('icon-pop'); void iconEl.offsetWidth; iconEl.classList.add('icon-pop'); }
  [valEl,countEl].forEach(el=>{ if(!el) return; el.classList.remove('value-pop'); void el.offsetWidth; el.classList.add('value-pop'); });
  if(stepper){
    const float = document.createElement('span');
    float.className = 'stat-gain-float' + (direction>0?'':' lose') + (isMilestone?' milestone':'');
    float.textContent = isMilestone ? `¡RACHA x${investedPoints}!` : (direction>0?'+1':'−1');
    stepper.appendChild(float);
    setTimeout(()=>float.remove(), 900);
  }
  if(isMilestone && iconEl){
    for(let i=0;i<6;i++){
      const spark = document.createElement('i');
      const angle = Math.random()*Math.PI*2, dist = 14+Math.random()*16;
      spark.className = 'stat-mini-spark';
      spark.style.left = '50%'; spark.style.top = '50%';
      spark.style.setProperty('--x', `${Math.cos(angle)*dist}px`);
      spark.style.setProperty('--y', `${Math.sin(angle)*dist}px`);
      iconEl.appendChild(spark);
      setTimeout(()=>spark.remove(), 600);
    }
  }
}
function celebrateStatSave(){
  const box = document.getElementById('statAllocList');
  const board = box && box.querySelector('.stat-board');
  if(!board) return;
  board.classList.remove('board-flash');
  void board.offsetWidth;
  board.classList.add('board-flash');
}
function editPendingAllocation(key, direction){
  const conf = ALLOCATION_STATS.find(stat=>stat.key===key);
  if(!conf || battle) return;
  if(direction>0){
    if(state.statPoints<=0) return;
    state.pendingPoints[key] = (state.pendingPoints[key]||0) + 1;
    state.statPoints--;
    applyStatDelta(key, 1);
  } else {
    if(!(state.pendingPoints[key]||0)) return;
    state.pendingPoints[key]--;
    state.statPoints++;
    applyStatDelta(key, -1);
  }
  const investedPoints = (state.allocatedPoints[key]||0) + (state.pendingPoints[key]||0);
  Sound.click(); render();
  statJuice(key, direction, investedPoints);
}
function savePendingPoints(){
  const amount = pendingTotal();
  if(!amount) return;
  Object.keys(state.pendingPoints).forEach(key=>{ state.allocatedPoints[key] = (state.allocatedPoints[key]||0) + (state.pendingPoints[key]||0); });
  state.pendingPoints = emptyPointMap();
  Sound.reward(); showFeedback('ESTADISTICAS GUARDADAS', `${amount} punto${amount===1?'':'s'} confirmado${amount===1?'':'s'}`); render(); saveState();
  celebrateStatSave();
}
function resetAllocatedPoints(){
  if(!canRespecPoints() || !allocationTotal() || pendingTotal()) return;
  if(!confirm(`Restablecer ${allocationTotal()} puntos distribuidos?`)) return;
  Object.entries(state.allocatedPoints).forEach(([key, points])=>{
    const amount = Number(points)||0;
    if(!amount) return;
    applyStatDelta(key, -amount);
  });
  state.statPoints += allocationTotal();
  state.allocatedPoints = emptyPointMap();
  state.statResetsUsed = (state.statResetsUsed||0) + 1;
  Sound.reward(); showFeedback('PUNTOS RESTABLECIDOS', `Distribuilos como quieras · ${availableStatResets()} disponible${availableStatResets()===1?'':'s'}`); render(); saveState();
}
function renderStatPips(saved, pending){
  saved = Math.max(0, Number(saved)||0);
  pending = Math.max(0, Number(pending)||0);
  const total = saved + pending;
  // Como máximo se muestran 36 puntos (tres filas). Al superar el tablero
  // comienza una nueva vuelta de color en lugar de alargar la tarjeta.
  const cycleSize = 36;
  const cycle = total > 0 ? Math.floor((total-1) / cycleSize) : 0;
  const cycleStart = cycle * cycleSize;
  const visibleTotal = total > 0 ? total - cycleStart : 0;
  const rowCount = Math.max(1, Math.min(3, Math.ceil(visibleTotal / 12)));
  return Array.from({length:rowCount}, (_, row)=>{
    const pips = Array.from({length:12}, (_, slot)=>{
      const index = cycleStart + row*12 + slot;
      let kind = index<saved ? 'filled' : index<total ? 'pending' : '';
      if(kind && index===total-1) kind += ' pip-new';
      return `<i class="${kind}"></i>`;
    }).join('');
    return `<div class="stat-pip-row cycle-${cycle%4}">${pips}</div>`;
  }).join('') + (cycle>0 ? `<span class="stat-pip-cycle">CICLO ${cycle+1} · ${cycleStart+1}–${cycleStart+36}</span>` : '');
}

function bindStatHoldControl(button, key, direction){
  if(!button) return;
  let delayTimer = null;
  let repeatTimer = null;
  let pointerStarted = false;
  const stop = ()=>{
    clearTimeout(delayTimer);
    clearInterval(repeatTimer);
    delayTimer = repeatTimer = null;
    window.removeEventListener('pointerup', stop);
    window.removeEventListener('pointercancel', stop);
    window.removeEventListener('blur', stop);
  };
  button.addEventListener('pointerdown', event=>{
    if(button.disabled || event.button>0) return;
    event.preventDefault();
    pointerStarted = true;
    editPendingAllocation(key, direction);
    delayTimer = setTimeout(()=>{
      repeatTimer = setInterval(()=>editPendingAllocation(key, direction), 85);
    }, 330);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    window.addEventListener('blur', stop);
  });
  // Mantiene accesibilidad por teclado sin duplicar el click del puntero.
  button.addEventListener('click', event=>{
    if(pointerStarted){ pointerStarted=false; event.preventDefault(); return; }
    editPendingAllocation(key, direction);
  });
}
const STAT_GROUP_SLUG = { 'Combate':'combate', 'Supervivencia':'supervivencia', 'Exploración':'exploracion' };
const STAT_GROUP_ICON = { 'Combate':'⚔\ufe0e', 'Supervivencia':'♥', 'Exploración':'◉' };
const STAT_EQ_FIELD = { ataque:'atk', critRate:'crit', critDmg:'critDmg', vida:'hp', mana:'mana', rapidez:'speed', robustez:'def' };
const STAT_EQ_SUFFIX = { critRate:'%', critDmg:'%', rapidez:'%' };
function statAllocList(){
  const box = document.getElementById('statAllocList');
  if(!box) return;
  const canSpend = state.statPoints>0 && !battle;
  const hasPending = pendingTotal()>0;
  const respecReady = canRespecPoints() && allocationTotal()>0 && !hasPending;
  let lastGroup = '';
  const rows = ALLOCATION_STATS.map(stat=>{
    const groupSlug = STAT_GROUP_SLUG[stat.group] || 'combate';
    const group = stat.group!==lastGroup ? `<div class="stat-category group-${groupSlug}"><span class="stat-category-icon">${STAT_GROUP_ICON[stat.group]||'✦'}</span>${stat.group}</div>` : '';
    lastGroup = stat.group;
    const saved = state.allocatedPoints[stat.key]||0;
    const pending = state.pendingPoints[stat.key]||0;
    const pips = renderStatPips(saved, pending);
    const investedPoints = saved + pending;
    const eqField = STAT_EQ_FIELD[stat.key];
    const eqValue = eqField ? (getEquipmentBonuses()[eqField]||0) : 0;
    const eqNote = eqValue>0 ? `<span class="val-bonus">+${eqValue}${STAT_EQ_SUFFIX[stat.key]||''} equipo</span>` : '';
    const valueText = String(stat.value());
    const isLongValue = valueText.length > 8;
    return `${group}<div class="stat-card group-${groupSlug} ${investedPoints>0?'invested':''} ${stat.critical?'critical':''}" data-stat-key="${stat.key}">
      <div class="stat-card-top">
        <span class="stat-card-icon" id="icon-${stat.key}">${stat.icon}</span>
        <div class="stat-card-heading">
          <span class="stat-card-name">${stat.label}</span>
          <span class="stat-card-desc">${stat.description}</span>
        </div>
        ${isLongValue ? '' : `<div class="stat-card-value"><b id="val-${stat.key}">${valueText}</b><small>Valor final</small>${eqNote}</div>`}
      </div>
      ${isLongValue ? `<div class="stat-card-value wide"><small>Valor final</small><b id="val-${stat.key}">${valueText}</b>${eqNote}</div>` : ''}
      <div class="stat-card-bottom"><div class="stat-pips">${pips}</div><div class="stat-stepper" id="stepper-${stat.key}"><button class="stat-control" data-remove-stat="${stat.key}" ${pending?'':'disabled'}>−</button><span class="stat-stepper-count" id="count-${stat.key}">${investedPoints}</span><button class="stat-control add" data-add-stat="${stat.key}" ${canSpend?'':'disabled'}>+</button></div></div>
    </div>`;
  }).join('');
  const availableResets = availableStatResets();
  const resetText = hasPending ? 'Guarda los cambios antes de restablecer.' : (respecReady ? `Listo para redistribuir tus puntos · ${availableResets} disponible${availableResets===1?'':'s'}.` : `Restablecimientos: ${availableResets} disponible${availableResets===1?'':'s'} · ganás 1 cada 5 niveles.`);
  box.innerHTML = `<div class="respec-panel"><small>${hasPending ? `${pendingTotal()} punto${pendingTotal()===1?'':'s'} sin guardar.<br>` : ''}${resetText}</small><div class="stat-controls"><button class="respec-btn" id="saveStatsBtn" ${hasPending?'':'disabled'}>▣ GUARDAR</button><button class="respec-btn" id="respecBtn" ${respecReady?'':'disabled'}>↻ RESTABLECER</button></div></div><div class="stat-board">${rows}</div>`;
  box.querySelectorAll('[data-add-stat]').forEach(button=>bindStatHoldControl(button, button.dataset.addStat, 1));
  box.querySelectorAll('[data-remove-stat]').forEach(button=>bindStatHoldControl(button, button.dataset.removeStat, -1));
  document.getElementById('saveStatsBtn').addEventListener('click', savePendingPoints);
  document.getElementById('respecBtn').addEventListener('click', resetAllocatedPoints);
}

const CLASS_BATTLE_STYLE = {
  warrior:{ icon:'⚔', label:'Guerrero', weapon:'Espada del Juramento', robe:'#a84f37', trim:'#f1b95a', hair:'#382017', glow:'#e08146', image:'assets/images/clase guerrero sprite.webp' },
  archer:{ icon:'🏹', label:'Arquero', weapon:'Arco de Hoja Lunar', robe:'#38735b', trim:'#b7df80', hair:'#563523', glow:'#66bf7e', image:'assets/images/clase arquero sprite.webp' },
  mage:{ icon:'✦', label:'Mago', weapon:'Baston Astral', robe:'#3c4d9e', trim:'#93c8ff', hair:'#d6d9ec', glow:'#669deb', image:'assets/images/clase mago sprite.webp' },
  priest:{ icon:'✚', label:'Sacerdote', weapon:'Cetro de Aurora', robe:'#d6c29a', trim:'#fff0a6', hair:'#72563f', glow:'#eccf7e', image:'assets/images/clase sacerdote sprite.webp' },
  assassin:{ icon:'🗡', label:'Asesino', weapon:'Dagas Gemelas', robe:'#613769', trim:'#ef9bff', hair:'#19141e', glow:'#b968c2', image:'assets/images/clase asesino sprite.webp' },
  tamer:{ icon:'🪢', label:'Domador', weapon:'Látigo de Vínculo', robe:'#287b6c', trim:'#7ce3bd', hair:'#3c2d20', glow:'#48d0ad', image:'assets/images/clase domador sprite.webp' }
};
function battleClassStyle(){ return CLASS_BATTLE_STYLE[state.characterClass] || CLASS_BATTLE_STYLE.warrior; }
function playerArt(){
  const style = activeHeroVisual();
  return style.image ? `<img class="hero-art" src="${style.image}" alt="${style.label}" decoding="async">` : playerSVG();
}
function playerSVG(){
  const style = battleClassStyle();
  const weapons = {
    warrior:`<path d="M74 60 L94 25 L90 20 L68 57" fill="#e7edf6" stroke="#684625" stroke-width="2"/><path d="M68 55 L82 64" stroke="${style.trim}" stroke-width="5"/><circle cx="70" cy="59" r="4" fill="${style.trim}"/>`,
    archer:`<path d="M79 27 Q99 56 79 86" fill="none" stroke="#d6a75c" stroke-width="4"/><path d="M79 27 L79 86" stroke="#eee1b3" stroke-width="1.4"/><path d="M74 54 L96 43" stroke="#d7dce4" stroke-width="2"/><path d="M92 41 L98 42 L94 47" fill="#d7dce4"/>`,
    mage:`<path d="M79 82 L88 27" stroke="#61422d" stroke-width="5" stroke-linecap="round"/><circle cx="89" cy="22" r="8" fill="${style.glow}" stroke="#dcecff" stroke-width="2"/><circle cx="89" cy="22" r="3" fill="#fff"/>`,
    priest:`<path d="M80 84 L85 28" stroke="#9a7045" stroke-width="5" stroke-linecap="round"/><path d="M85 20 V35 M78 27 H92" stroke="${style.trim}" stroke-width="4" stroke-linecap="round"/><circle cx="85" cy="27" r="9" fill="none" stroke="#fff0aa" stroke-width="1"/>`,
    assassin:`<path d="M70 60 L94 34" stroke="#d9dce9" stroke-width="5" stroke-linecap="round"/><path d="M72 63 L64 73" stroke="${style.trim}" stroke-width="4"/><path d="M75 67 L96 57" stroke="#d9dce9" stroke-width="4" stroke-linecap="round"/>`
  };
  const hood = state.characterClass==='mage' || state.characterClass==='assassin'
    ? `<path d="M30 38 Q50 5 70 38 L66 52 L34 52Z" fill="${style.robe}" stroke="${style.trim}" stroke-width="1.4"/>` : '';
  return `<svg viewBox="0 0 100 120" aria-label="${style.label}">
    <defs><linearGradient id="heroRobe" x1="0" x2="1"><stop stop-color="${style.robe}"/><stop offset="1" stop-color="#171018"/></linearGradient></defs>
    <ellipse cx="51" cy="108" rx="31" ry="6" fill="rgba(0,0,0,.5)"/>
    <path d="M31 52 L22 94 L43 92 L50 100 L58 92 L79 94 L68 52 Q50 62 31 52" fill="#221714" opacity=".9"/>
    <path d="M34 48 L66 48 L75 93 L25 93Z" fill="url(#heroRobe)" stroke="${style.trim}" stroke-width="1.3"/>
    <path d="M40 92 L39 108 M60 92 L63 108" stroke="#2b211e" stroke-width="9" stroke-linecap="round"/>
    <circle cx="50" cy="34" r="16" fill="#f1d4b5" stroke="#6e4936" stroke-width="1.1"/>
    <path d="M35 32 Q40 13 58 18 Q67 21 67 34 Q59 25 50 28 Q41 26 35 37" fill="${style.hair}"/>
    <circle cx="44" cy="35" r="1.8" fill="#261a18"/><circle cx="56" cy="35" r="1.8" fill="#261a18"/>
    <path d="M45 43 Q50 46 55 43" fill="none" stroke="#a45c56" stroke-width="1.2"/>
    ${hood}
    <path d="M36 57 L23 69" stroke="#f1d4b5" stroke-width="8" stroke-linecap="round"/>
    <g id="playerArmGroup"><path d="M64 57 L76 62" stroke="#f1d4b5" stroke-width="8" stroke-linecap="round"/>${weapons[state.characterClass] || weapons.warrior}</g>
    <path d="M42 52 L58 52" stroke="${style.trim}" stroke-width="2"/>
  </svg>`;
}
function monsterSVG(monster){
  const form = MONSTER_FORMS[monster.tier] || MONSTER_FORMS.facil;
  const type = monster.visualType || form.type;
  const boss = !!(monster.visualBoss || monster.isBoss);
  const color = monster.color || (boss ? form.bossColor : form.color);
  const eye = type==='wolf' && boss ? '#ff3c3c' : type==='dragon' && boss ? '#4fb9ff' : '#fff6d5';
  const eyes = `<circle cx="42" cy="49" r="6" fill="#15120f"/><circle cx="61" cy="49" r="6" fill="#15120f"/><circle cx="43" cy="48" r="2" fill="${eye}"/><circle cx="62" cy="48" r="2" fill="${eye}"/>`;
  if(type==='wolf') return `<svg viewBox="0 0 110 105" aria-label="${form.name}">
    <ellipse cx="56" cy="69" rx="34" ry="20" fill="${color}" stroke="#24252b" stroke-width="2"/>
    <path d="M30 67 L16 53 L28 46 L39 56 M77 65 L96 51 L92 67" fill="${color}" stroke="#24252b" stroke-width="2"/>
    <path d="M32 53 L37 18 L53 43 L70 18 L80 54" fill="${color}" stroke="#24252b" stroke-width="2"/>
    <path d="M36 50 Q55 35 76 52 L70 72 Q55 81 40 71Z" fill="${color}" stroke="#24252b" stroke-width="2"/>
    ${eyes}<path d="M46 63 L54 67 L62 63" stroke="#17120f" stroke-width="2.5" fill="none"/><path d="M42 82 L40 96 M68 82 L71 96" stroke="#252126" stroke-width="7" stroke-linecap="round"/>
  </svg>`;
  if(type==='minotaur') return `<svg viewBox="0 0 110 110" aria-label="${form.name}">
    <path d="M30 35 Q15 12 30 10 Q40 12 43 26 M72 27 Q78 10 91 11 Q102 18 80 38" fill="none" stroke="#e8d1a1" stroke-width="7" stroke-linecap="round"/>
    <ellipse cx="55" cy="48" rx="28" ry="26" fill="${color}" stroke="#4c281e" stroke-width="2"/>
    <path d="M29 71 L18 95 M80 71 L93 95" stroke="${color}" stroke-width="15" stroke-linecap="round"/>
    <path d="M39 69 L35 103 M70 69 L75 103" stroke="#392319" stroke-width="15" stroke-linecap="round"/>
    ${eyes}<path d="M47 61 L55 66 L63 61" stroke="#24140f" stroke-width="3" fill="none"/><path d="M25 80 L12 63 M84 79 L100 61" stroke="#7b5a35" stroke-width="5"/>
  </svg>`;
  if(type==='dragon') return `<svg viewBox="0 0 115 108" aria-label="${form.name}">
    <path d="M50 65 L13 36 L22 74 L5 80 L45 87 M67 60 L103 27 L96 69 L111 78 L72 86" fill="${color}" opacity=".72" stroke="#27466d" stroke-width="2"/>
    <path d="M36 79 Q43 42 59 31 Q76 40 82 74 Q76 94 56 96 Q39 93 36 79Z" fill="${color}" stroke="#254b76" stroke-width="2"/>
    <path d="M47 37 L45 17 L57 31 L68 16 L70 40" fill="${color}" stroke="#254b76" stroke-width="2"/>
    ${eyes}<path d="M43 63 Q55 73 68 62" stroke="#1d3350" stroke-width="2.5" fill="none"/><path d="M42 87 L35 103 M70 87 L78 103" stroke="#254b76" stroke-width="7" stroke-linecap="round"/>
  </svg>`;
  return `<svg viewBox="0 0 100 100" aria-label="${form.name}">
    <ellipse cx="50" cy="63" rx="35" ry="27" fill="${color}" stroke="#376d35" stroke-width="2"/>
    <path d="M25 45 Q28 28 39 38 Q44 19 51 36 Q60 18 65 38 Q77 27 77 47" fill="${color}" stroke="#376d35" stroke-width="2"/>
    ${eyes}<path d="M36 72 Q50 82 66 71" stroke="#173018" stroke-width="2.5" fill="none"/>
    ${boss?'<path d="M38 31 L50 16 L62 31" fill="none" stroke="#ffd56c" stroke-width="4" stroke-linecap="round"/>':''}
  </svg>`;
}
function monsterArt(monster){
  const form = MONSTER_FORMS[monster.tier] || MONSTER_FORMS.facil;
  const image = monster.image || form.image;
  if(!image) return monsterSVG(monster);
  return `<img class="monster-art" src="${image}" alt="${escapeHtml(monster.name)}" decoding="async"><span class="boss-eyes" aria-hidden="true"></span>`;
}

function renderArena(fresh){
  const arena = document.getElementById('arena');
  const biome = biomeForDepth(runState ? runState.depth : 1);
  BIOMES.forEach(entry=>arena.classList.remove(`biome-${entry.key}`));
  arena.classList.add(`biome-${biome.key}`);
  if(!battle){
    arena.innerHTML = `<div class="arena-idle" id="arenaIdle">Elegí una dificultad y salí a cazar</div>`;
    return;
  }
  if(fresh){
    const style = battleClassStyle();
    const visual = activeHeroVisual();
    arena.innerHTML = `
      <div class="fighter player class-${state.characterClass}">
        <div class="name">${escapeHtml(state.name)}</div>
        <div class="class-tag"><span>${visual.icon}</span>${style.label}${visual.isSubclass?` · ${visual.label}`:''}</div>
        <div class="mini-bar"><div class="mini-bar-ghost" id="arenaPlayerHpGhost" style="width:100%"></div><div id="arenaPlayerHp" style="width:100%"></div></div>
        <div class="sprite-box">${playerArt()}<span class="weapon-label">${visual.weapon}</span>${state.companion ? `<span class="companion-tag">✦ ${escapeHtml(state.companion.name)}</span>` : ''}</div>
      </div>
      ${state.characterClass==='tamer' && state.companion ? `<div class="companion-fighter"><img src="${state.companion.image}" alt="${escapeHtml(state.companion.name)}" decoding="async"><b>${escapeHtml(state.companion.name)}</b><small>COMPAÑERO</small></div>` : ''}
      <div class="vs">VS</div>
      <div class="fighter monster monster-${battle.monster.visualType || 'slime'} ${battle.monster.isBoss?'boss':''} ${battle.monster.phaseTwo?'phase-two':''}">
        <div class="name">${escapeHtml(battle.monster.name)}</div>
        <div class="mini-bar"><div class="mini-bar-ghost" id="arenaMonsterHpGhost" style="width:100%"></div><div id="arenaMonsterHp" style="width:100%"></div></div>
        ${monsterAffinityMarkup(battle.monster)}
        <div class="monster-analysis ${battle.monster.analyzed?'revealed':'hidden'}" id="monsterAnalysis">${battle.monster.analyzed ? `🔎 ${battle.monster.hp}/${battle.monster.maxHp} vida` : `🔍 Análisis fallido · ${Math.round(battle.monster.analysisChance)}%`}</div>
        <div class="break-meter" id="breakMeter"><span>RUPTURA</span><div class="break-track"><div class="break-fill" id="breakFill"></div></div><span class="break-value" id="breakValue">0%</span></div>
        <div class="enemy-intent" id="enemyIntent"></div>
        <div class="sprite-box">${monsterArt(battle.monster)}</div>
      </div>
      <div class="ground"></div>`;
    if(battle.monster.isBoss){
      arena.classList.remove('boss-arrival'); void arena.offsetWidth; arena.classList.add('boss-arrival');
      setTimeout(()=>arena.classList.remove('boss-arrival'),800);
    }
  }
  renderArenaBars();
  renderMonsterIntent();
}
function renderArenaBars(){
  if(!battle) return;
  const php = document.getElementById('arenaPlayerHp');
  const mhp = document.getElementById('arenaMonsterHp');
  const phpGhost = document.getElementById('arenaPlayerHpGhost');
  const mhpGhost = document.getElementById('arenaMonsterHpGhost');
  const breakFill = document.getElementById('breakFill');
  const breakValue = document.getElementById('breakValue');
  const breakMeter = document.getElementById('breakMeter');
  const analysis = document.getElementById('monsterAnalysis');
  const playerPct = Math.max(0, Math.min(100, finiteNumber(battle.playerHp) / Math.max(1, finiteNumber(battle.playerMaxHp, 1)) * 100));
  const monsterPct = Math.max(0, Math.min(100, finiteNumber(battle.monster.hp) / Math.max(1, finiteNumber(battle.monster.maxHp, 1)) * 100));
  if(php) php.style.width = playerPct+'%';
  if(mhp) mhp.style.width = monsterPct+'%';
  // La barra "fantasma" comparte destino pero tiene una transición más lenta y con retraso,
  // así que se queda un instante atrás mostrando el golpe recién recibido.
  if(phpGhost) phpGhost.style.width = playerPct+'%';
  if(mhpGhost) mhpGhost.style.width = monsterPct+'%';
  const breakPct = Math.max(0, Math.min(100, Math.round(finiteNumber(battle.monster.breakMeter) / Math.max(1, finiteNumber(battle.monster.breakMax, 1)) * 100)));
  if(breakFill) breakFill.style.width = breakPct+'%';
  if(breakValue) breakValue.textContent = breakPct+'%';
  if(breakMeter) breakMeter.classList.toggle('is-broken', !!(battle.monster.status && battle.monster.status.stunnedTurns>0));
  if(analysis && battle.monster.analyzed) analysis.textContent = `🔎 ${safePositiveInt(battle.monster.hp, 1)}/${safePositiveInt(battle.monster.maxHp, 1)} vida`;
}

function syncBattleUi(){
  if(!battle) return;
  if(battle.isRun && runState){
    runState.hp = battle.playerHp;
    runState.mana = battle.playerMana;
    renderRunStatusBar();
  }
  renderArenaBars();
  if(battle && battle.isRun) scheduleRunCheckpoint();
  updateCombatTension();
  const box = document.getElementById('actionBtns');
  const labels = box ? box.querySelectorAll('.bar-label span:last-child') : [];
  const hpLabel = labels[0];
  const mpLabel = labels[1];
  const hpFill = box ? box.querySelector('.bar.hp div') : null;
  const mpFill = box ? box.querySelector('.bar.mp div') : null;
  if(hpLabel) hpLabel.textContent = `${battle.playerHp}/${battle.playerMaxHp}`;
  if(mpLabel) mpLabel.textContent = `${battle.playerMana}/${battle.playerMaxMana}`;
  if(hpFill) hpFill.style.width = `${Math.max(0, battle.playerHp / battle.playerMaxHp * 100)}%`;
  if(mpFill) mpFill.style.width = `${Math.max(0, battle.playerMana / battle.playerMaxMana * 100)}%`;
  const attack = document.getElementById('attackBtn');
  const skill = document.getElementById('skillBtn');
  const rawCost = Math.round(battle.playerMaxMana * currentClass().manaCost * (1-subclassBonus('manaDiscount')));
  const cost = visibleSkillCost(rawCost);
  if(attack) attack.disabled = battle.busy;
  if(skill) skill.disabled = battle.busy || battle.playerMana < cost;
  renderMonsterIntent();
  renderCombatStatus();
}

function updateCombatTension(){
  if(!battle || !battle.monster) return;
  const monster = battle.monster;
  const arena = document.getElementById('arena');
  const ratio = monster.maxHp ? monster.hp / monster.maxHp : 1;
  const lowHealth = monster.hp>0 && ratio<=.30;
  if(arena) arena.classList.toggle('last-stand', lowHealth);
  if(lowHealth && !monster.tensionTriggered){
    monster.tensionTriggered = true;
    if(!(monster.isBoss && monster.phaseTwo)) Sound.setScene('danger');
    showCombatWarning('⚠ ÚLTIMA RESISTENCIA','El enemigo pelea con todo lo que le queda', monster.isBoss);
    spawnFloatText('monster','¡FURIA FINAL!','crit');
  }

  const playerRatio = battle.playerMaxHp ? battle.playerHp / battle.playerMaxHp : 1;
  const playerCritical = battle.playerHp>0 && playerRatio<=.25;
  if(arena) arena.classList.toggle('player-danger', playerCritical);
  if(playerCritical && !battle.playerTensionTriggered){
    battle.playerTensionTriggered = true;
    Sound.setScene('danger');
    Sound.dangerPulse();
    showCombatWarning('☠ AL BORDE DE LA MUERTE','Un golpe más y podrías caer');
  } else if(!playerCritical && playerRatio>.4){
    battle.playerTensionTriggered = false;
  }
}

function renderActionButtons(){
  const box = document.getElementById('actionBtns');
  if(!box) return;
  // El mapa, la pantalla de recompensa y el cierre de la expedición no son
  // combates: ocultamos acciones antiguas para no dar la impresión de que se
  // puede atacar sin un enemigo delante.
  if(huntMode==='run' && (!runState || runState.phase==='ended')){
    box.innerHTML = `<div class="hunt-ready-panel"><b>✦ LA SENDA ESTÁ LISTA</b><small>Iniciá una expedición para elegir tu primer camino.</small><button id="beginRunBtn">COMENZAR EXPEDICIÓN</button></div>`;
    document.getElementById('beginRunBtn').addEventListener('click', ()=>startRun());
    return;
  }
  if(huntMode==='run' && !battle){
    box.innerHTML = '';
    return;
  }
  if(battle){
    const rawCost = Math.round(battle.playerMaxMana*currentClass().manaCost*(1-subclassBonus('manaDiscount')));
    const cost = visibleSkillCost(rawCost);
    const moves = classMoveNames();
    const moveInfo = classMoveInfo();
    const attackPreview = combatDamageEstimate(false);
    const skillPreview = combatDamageEstimate(true);
    const signature = classAbility();
    const signatureCost = classAbilityCost();
    const signatureReady = !battle.busy && battle.playerStatus.classCooldown===0 && battle.playerMana>=signatureCost && !(state.characterClass==='tamer' && !state.companion);
    const signatureSub = state.characterClass==='tamer' && !state.companion ? 'Requiere un compañero domado' : battle.playerStatus.classCooldown>0 ? `Recarga: ${battle.playerStatus.classCooldown}` : `${signatureCost} maná`;
    const subclassAbilities = subclassAbilityDefinitions();
    const subclassButtons = subclassAbilities.map(ability=>{
      const rawAbilityCost = subclassAbilityCost(ability);
      const abilityCost = visibleSkillCost(rawAbilityCost);
      const cooldown = battle.playerStatus.cooldowns[ability.key]||0;
      const blocked = ability.requiresCompanion && !state.companion;
      const ready = !battle.busy && cooldown===0 && battle.playerMana>=abilityCost && !blocked;
      const detail = blocked ? 'Requiere compañero domado' : cooldown>0 ? `Recarga: ${cooldown}` : abilityCost===0 ? 'GRATIS ✧' : `${abilityCost} maná`;
      return `<button class="ability-btn subclass-ability-btn ${ready?'ready':''}" data-subclass-ability="${ability.key}" ${ready?'':'disabled'} title="${ability.hint}"><strong>${ability.icon} ${ability.label}</strong><small>${ability.hint} · ${detail}</small></button>`;
    }).join('');
    const momentum = combatMomentum();
    const tactical = monsterTacticalReadout();
    const affinity = monsterAffinity(battle.monster);
    const breakCurrent = Math.max(0,Math.round(finiteNumber(battle.monster.breakMeter)));
    const breakMax = Math.max(1,Math.round(finiteNumber(battle.monster.breakMax,1)));
    const breakRemaining = Math.max(0,breakMax-breakCurrent);
    const canTame = state.characterClass==='tamer' && battle.isRun && !battle.monster.isBoss && battle.monster.hp<=battle.monster.maxHp*.5 && !battle.busy;
    const tameHint = state.characterClass==='tamer' ? (!battle.isRun ? 'Solo durante una expedición' : battle.monster.isBoss ? 'Los jefes no pueden domarse' : battle.monster.hp>battle.monster.maxHp*.5 ? 'Debilitá al enemigo al 50%' : `Domar (${Math.round(tamingChance())}% chance)`) : '';
    box.innerHTML = `
      <section class="combat-intel intent-${tactical.key}">
        <div class="combat-intel-title"><span>◈ INFORME TÁCTICO</span><b>${tactical.icon} ${tactical.label}</b></div>
        <div class="combat-intel-grid">
          <article><small>DAÑO PREVISTO</small><strong>${tactical.damageText}</strong><em>Ya considera tu postura y defensa</em></article>
          <article><small>RUPTURA</small><strong>${breakCurrent} / ${breakMax}</strong><em>Faltan ${breakRemaining} puntos para aturdir</em></article>
          <article><small>RASGO ENEMIGO</small><strong>${affinity ? `${affinity.icon} ${affinity.label}` : `${battle.monster.archetype.icon} ${battle.monster.archetype.label}`}</strong><em>${affinity ? affinity.hint : battle.monster.archetype.hint}</em></article>
        </div>
        ${tactical.effects.length ? `<div class="combat-intel-effects">${tactical.effects.map(effect=>`<span>⚠ ${escapeHtml(effect)}</span>`).join('')}</div>` : ''}
        <div class="combat-intel-advice"><b>JUGADA RECOMENDADA</b><span>${escapeHtml(tactical.response)}</span></div>
      </section>
      <button id="attackBtn" title="${moveInfo.attack}"><strong>${moves.attack}</strong><small>${moveInfo.attack} · Daño ${attackPreview.min}–${attackPreview.max}${critChance()>0 ? ` · crítico ${attackPreview.critMin}–${attackPreview.critMax}` : ''}</small></button>
      <button id="skillBtn" ${battle.playerMana<cost?'disabled':''}>${moves.skill} (${cost===0?'GRATIS ✧':cost+' maná'})</button>
      <button id="classAbilityBtn" class="ability-btn ${signatureReady?'ready':''}" ${signatureReady?'':'disabled'}><strong>${signature.icon} ${signature.label}</strong><small>Habilidad única · ${signatureSub}</small></button>
      ${subclassButtons}
      <div class="combat-momentum ${momentum>=100?'ready':''}">
        <div class="combat-momentum-head"><strong>✦ ÍMPETU TÁCTICO</strong><span>${Math.round(momentum)} / 100</span></div>
        <div class="combat-momentum-track"><i style="width:${momentum}%"></i></div>
        <small>${momentum>=100?'REMATE LISTO · próximo ataque +50% de daño':'Alterná ataque, habilidad y técnica de clase para cargarlo más rápido'}</small>
      </div>
      <div class="stance-row">
        ${Object.entries(COMBAT_STANCES).map(([key,stance])=>`<button class="stance-btn ${battle.playerStatus.stance===key?'active':''}" data-stance="${key}" ${battle.busy?'disabled':''} title="${stance.hint}"><span>${stance.icon}</span>${stance.label}<small>${key==='offensive'?'+25% daño':key==='defensive'?'-30% recibido':'Sin cambios'}</small></button>`).join('')}
      </div>
      ${state.characterClass==='tamer' ? `<button id="tameBtn" class="ability-btn ${canTame?'ready':''}" ${canTame?'':'disabled'}>🪢 ${tameHint}</button>` : ''}
      ${state.companion ? `<div class="status-badge shield" style="grid-column:1/-1;justify-self:start;">✦ Compañero: ${state.companion.name}</div>` : ''}
      <div class="combat-vitals">
        <div class="bar-label"><span>Tu vida</span><span>${battle.playerHp}/${battle.playerMaxHp}</span></div>
        <div class="bar hp"><div style="width:${(battle.playerHp/battle.playerMaxHp)*100}%"></div></div>
        <div class="bar-label"><span>Tu maná</span><span>${battle.playerMana}/${battle.playerMaxMana}</span></div>
        <div class="bar mp"><div style="width:${(battle.playerMana/battle.playerMaxMana)*100}%"></div></div>
      </div>
    `;
    const attackButton = document.getElementById('attackBtn');
    const skillButton = document.getElementById('skillBtn');
    const classButton = document.getElementById('classAbilityBtn');
    attackButton.title = moveInfo.attack;
    attackButton.innerHTML = `<strong>${moves.attack}</strong><small>${moveInfo.attack} · Daño ${attackPreview.min}–${attackPreview.max}${critChance()>0 ? ` · crítico ${attackPreview.critMin}–${attackPreview.critMax}` : ''}</small>`;
    skillButton.title = moveInfo.skill;
    skillButton.innerHTML = `<strong>${moves.skill}</strong><small>${moveInfo.skill} · Daño ${skillPreview.min}–${skillPreview.max} · ${cost===0?'GRATIS ✧':cost+' maná'}</small>`;
    classButton.title = signature.hint;
    classButton.innerHTML = `<strong>${signature.icon} ${signature.label}</strong><small>Habilidad única · ${signature.hint} · ${signatureSub}</small>`;
    document.getElementById('attackBtn').addEventListener('click', ()=>playerAttack(false));
    document.getElementById('skillBtn').addEventListener('click', ()=>playerAttack(true));
    document.getElementById('classAbilityBtn').addEventListener('click', useClassAbility);
    box.querySelectorAll('[data-subclass-ability]').forEach(button=>button.addEventListener('click',()=>useSubclassAbility(button.dataset.subclassAbility)));
    box.querySelectorAll('[data-stance]').forEach(button=>button.addEventListener('click',()=>setCombatStance(button.dataset.stance)));
    if(document.getElementById('tameBtn')) document.getElementById('tameBtn').addEventListener('click', tryTameMonster);
    renderAbilityButtons(box);
    renderCombatStatus();
  } else {
    box.innerHTML = `
      <button id="findBtn">Buscar monstruo</button>
      <button id="trainBtn">Entrenar (seguro, +exp)</button>
    `;
    document.getElementById('findBtn').addEventListener('click', startBattle);
    document.getElementById('trainBtn').addEventListener('click', doTrain);
  }
}

function buildTierGrid(){
  const grid = document.getElementById('tierGrid');
  if(!grid) return;
  grid.innerHTML = Object.entries(TIERS).map(([key,t])=>`
    <div class="tier-btn ${key===selectedTier?'selected':''}" data-tier="${key}" ${battle?'style="pointer-events:none;opacity:.4"':''}>
      ${t.label}<small>x${t.reward}</small>
    </div>`).join('');
  if(!battle){
    grid.querySelectorAll('.tier-btn').forEach(btn=>{
      btn.addEventListener('click', ()=>{ Sound.click(); selectedTier = btn.dataset.tier; buildTierGrid(); });
    });
  }
}

/* ================= CONTROL DE VISTAS PRINCIPALES ================= */
document.querySelectorAll('.nav-btn[data-sec]').forEach(btn => {
    btn.addEventListener('click', () => {
      Sound.click();
      if(btn.dataset.sec==='secProfile') activeProfileView = 'home';
      if(btn.dataset.sec==='secOptions') activeOptionsView = 'home';
      document.querySelectorAll('.nav-btn[data-sec]').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.game-section').forEach(sec => sec.classList.remove('active'));
    
    btn.classList.add('active');
    document.getElementById(btn.dataset.sec).classList.add('active');
    const btnLabelEl = btn.querySelector('.btn-label');
    document.getElementById('navCurrentLabel').textContent = (btnLabelEl ? btnLabelEl.textContent : btn.textContent.trim().replace(/^\S+\s*/, '')).toUpperCase();
    document.getElementById('mainNav').classList.remove('menu-open');
    document.getElementById('navMenuToggle').setAttribute('aria-expanded','false');
    render();
  });
});

document.getElementById('navMenuToggle').addEventListener('click', ()=>{
  const nav = document.getElementById('mainNav');
  const isOpen = nav.classList.toggle('menu-open');
  document.getElementById('navMenuToggle').setAttribute('aria-expanded', String(isOpen));
  Sound.click();
});

document.addEventListener('click', event=>{
  const nav = document.getElementById('mainNav');
  if(nav && nav.classList.contains('menu-open') && !nav.contains(event.target)){
    nav.classList.remove('menu-open');
    document.getElementById('navMenuToggle').setAttribute('aria-expanded','false');
  }
});

document.getElementById('charactersBtn').addEventListener('click', async ()=>{
  if(battle || (runState && runState.phase!=='ended')){
    showFeedback('EXPEDICION ACTIVA', 'Termina la caceria antes de cambiar de personaje.', 'danger');
    return;
  }
  Sound.click();
  document.getElementById('mainNav').classList.remove('menu-open');
  document.getElementById('navMenuToggle').setAttribute('aria-expanded','false');
  state = null;
  activeCharacterId = null;
  document.getElementById('game').classList.remove('active');
  document.getElementById('mainNav').classList.remove('active');
  document.getElementById('nameGate').style.display = 'grid';
  renderCharacterGate(await loadRoster());
});

document.querySelectorAll('#huntModeToggle .mode-btn').forEach(btn=>{
  btn.addEventListener('click', ()=> switchHuntMode(btn.dataset.mode));
});

document.getElementById('huntResetBtn')?.addEventListener('click', ()=> resetHuntState());

/* Botón de emergencia: fuerza la limpieza del estado de cacería (combate/expedición)
   por si un bug deja los botones o la arena trabados. Borra el progreso de la
   expedición en curso (profundidad, reliquias sin cobrar, batalla activa), pero
   NO toca el personaje, nivel, equipo, oro ni inventario. */
function resetHuntState(){
  if(!state) return;
  const enExpedicion = !!(battle || (runState && runState.phase!=='ended'));
  const confirmado = confirm(enExpedicion
    ? '¿Reiniciar la cacería?\n\nSe perderá el progreso de la expedición actual (profundidad, reliquias y botín sin cobrar). Tu personaje, nivel, equipo y oro NO se ven afectados.\n\nUsá esto si el combate quedó trabado.'
    : 'Esto limpia el estado interno de la cacería por si quedó trabado. ¿Continuar?');
  if(!confirmado) return;
  if(runCheckpointTimer){ clearTimeout(runCheckpointTimer); runCheckpointTimer = null; }
  battle = null;
  runState = null;
  huntMode = 'run';
  activeHuntTab = 'combat';
  Sound.click();
  addLog('⟳ Cacería reiniciada manualmente para destrabar el combate.', 'reset');
  render();
  saveState();
}

function initTabListeners() {
  if(tabListenersInitialized) return;
  tabListenersInitialized = true;
  document.getElementById('resetBtn')?.addEventListener('click', doReset);
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      Sound.click();
      const parent = tab.parentElement;
      parent.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      const tabGroup = tab.dataset.tab;
      if (['gear', 'detailed_stats'].includes(tabGroup)) {
        activeHeroTab = tabGroup;
      } else if (['shop', 'day', 'week', 'month', 'logros', 'bestiary', 'trade'].includes(tabGroup)) {
        activeGuildTab = tabGroup;
      } else if (['lb'].includes(tabGroup)) {
        activeLbTab = tabGroup;
      }
      renderActiveSubTabs();
    });
  });
  document.querySelectorAll('#huntSubtabs [data-hunt-tab]').forEach(tab=>{
    tab.onclick = ()=>{
      activeHuntTab = tab.dataset.huntTab;
      Sound.click();
      renderHuntSubTabs();
    };
  });
}

function renderHuntSubTabs(){
  const active = ['combat','progress'].includes(activeHuntTab) ? activeHuntTab : 'combat';
  activeHuntTab = active;
  document.querySelectorAll('#huntSubtabs [data-hunt-tab]').forEach(tab=>tab.classList.toggle('active', tab.dataset.huntTab===active));
  const views = { combat:'huntViewCombat', progress:'huntViewProgress' };
  Object.entries(views).forEach(([key,id])=>document.getElementById(id)?.classList.toggle('active', key===active));
}

function renderActiveSubTabs() {
  const profileActive = document.getElementById('secProfile').classList.contains('active');
  const heroActive = document.getElementById('secHero').classList.contains('active');
  const guildActive = document.getElementById('secGuild').classList.contains('active');
  const forgeActive = document.getElementById('secForge').classList.contains('active');
  const optionsActive = document.getElementById('secOptions').classList.contains('active');
  const fishingActive = document.getElementById('secFishing').classList.contains('active');
  if(profileActive) renderProfile();
  if(heroActive) renderHeroSubTab();
  if(forgeActive) renderForge();
  if(optionsActive) renderOptions();
  if(fishingActive) renderFishing();
  if(guildActive){
    renderGuildSubTab();
    renderLbSubTab();
  }
}

function renderHeroSubTab() {
  const box = document.getElementById('heroTabContent');
  if (!box) return;

  if (activeHeroTab === 'detailed_stats') {
    const eq = getEquipmentBonuses();
    const playerName = typeof escapeHtml !== 'undefined' ? escapeHtml(state.name) : state.name;
    const heroClass = currentClass();
    const activeSetId = state.subclass ? `subclass-${state.characterClass}-${state.subclass}` : `class-${state.characterClass}`;
    const activeSet = EQUIPMENT_SET_DEFS[activeSetId];
    const effectiveCrit = Math.round(critChance()*100);
    const sheet = heroStatBreakdown();

    box.innerHTML = `
      <div class="stats-detailed">
        <h4>Estadísticas Detalladas</h4>
        <div class="stat-row-detail">
          <span class="label">Nombre:</span>
          <span class="val" style="color: var(--gold-bright);">${playerName}</span>
        </div>
        <div class="stat-row-detail">
          <span class="label">Título:</span>
          <span class="val" style="color: var(--mana);">${playerTitle()}</span>
        </div>
        <div class="stat-row-detail">
          <span class="label">Clase:</span>
          <span class="val" style="color: var(--gold);">${heroClass.icon} ${heroClass.label}${currentSubclass()?` · ${currentSubclass().icon} ${currentSubclass().label}`:''}</span>
        </div>
        <div class="stat-row-detail">
          <span class="label">Marcas Eternas:</span>
          <span class="val">${state.resets || 0} <span class="val-bonus">+${resetStatBonus()} progreso base · +${Math.min(50,(state.resets||0)*4)}% EXP</span></span>
        </div>
        <div class="stat-row-detail">
          <span class="label">Ataque Total:</span>
          <span class="val" style="color: var(--ember);">
            ${sheet.attack.total}
            <span class="val-bonus">Base ${sheet.attack.base} · +${sheet.attack.progress} progreso · +${sheet.attack.equipment} equipo</span>
          </span>
        </div>
        <div class="stat-row-detail">
          <span class="label">Vida Total:</span>
          <span class="val" style="color:#72d892;">${sheet.hp.total}<span class="val-bonus">Base ${sheet.hp.base} · +${sheet.hp.progress} progreso · +${sheet.hp.equipment} equipo</span></span>
        </div>
        <div class="stat-row-detail">
          <span class="label">Maná Total:</span>
          <span class="val" style="color:var(--mana);">${sheet.mana.total}<span class="val-bonus">Base ${sheet.mana.base} · +${sheet.mana.progress} progreso · +${sheet.mana.equipment} equipo</span></span>
        </div>
        <div class="stat-row-detail">
          <span class="label">Defensa Total:</span>
          <span class="val" style="color: var(--steel);">
            ${sheet.defense.total} <small>(${Math.round(damageReduction()*100)}% reducción)</small>
            <span class="val-bonus">Base ${sheet.defense.base} · +${sheet.defense.progress} progreso · +${sheet.defense.equipment} equipo</span>
          </span>
        </div>
        <div class="stat-row-detail">
          <span class="label">Evasión:</span>
          <span class="val">${sheet.evasion.total}%<span class="val-bonus">Base ${sheet.evasion.base}% · +${sheet.evasion.progress}% progreso · +${sheet.evasion.equipment}% equipo</span></span>
        </div>
        <div class="stat-row-detail">
          <span class="label">Prob. Crítica:</span>
          <span class="val" style="color: var(--gold);">
            ${effectiveCrit}% <span class="val-bonus">+${eq.crit} equipo</span>
          </span>
        </div>
        <div class="stat-row-detail">
          <span class="label">Daño Crítico:</span>
          <span class="val">
            ${Math.round(critMultiplier()*100)}% <span class="val-bonus">+${eq.critDmg}% equipo</span>
          </span>
        </div>
        <div class="stat-row-detail">
          <span class="label">Oro Total:</span>
          <span class="val" style="color: #ffd700;">${state.gold} 🪙</span>
        </div>
      </div>
    `;
  } else if (activeHeroTab === 'gear') {
    const eq = state.equipment;
    const style = activeHeroVisual();
    const loadoutEmblem = equipmentHeroEmblem(state.characterClass, state.subclass);
    const slotMeta = key => equipmentSlotMeta(key);
    const gearSlotMarkup = slot => {
      const item = eq[slot];
      const rarity = item ? itemRarityMeta(item) : null;
      const rarityStyle = rarity ? `style="--slot-rarity-color:${rarity.color};--slot-rarity-glow:${rarity.glow}"` : '';
      return `<div class="eq-slot slot-${slot} ${item ? 'equipped' : ''} ${rarity ? `rarity-${rarity.key}` : ''}" ${rarityStyle} data-slot="${slot}" title="${slotMeta(slot).label}">${equipmentVisual(item,slot)}</div>`;
    };
    const sets = equippedSetSummary().sets;
    const setProgressMarkup = sets.length ? `<section class="equipment-set-panel">
      <div class="set-panel-title"><span>✦</span><div><small>SINERGIA DE EQUIPO</small><b>Bonificaciones activas</b></div></div>
      <div class="set-cards">${sets.map(set=>{
        const next = (set.definition.bonuses || []).find(tier=>tier.pieces>set.pieces);
        return `<article class="set-card ${set.active.length?'set-active':''}">
          <div class="set-card-head"><strong>${escapeHtml(set.definition.label)}</strong><b>${set.pieces}/7</b></div>
          <small>${escapeHtml(set.definition.affinity || 'Conjunto de aventura')}</small>
          <div class="set-milestones">${(set.definition.bonuses || []).map(tier=>`<span class="${set.pieces>=tier.pieces?'unlocked':''}">${tier.pieces}p · ${tier.label}</span>`).join('')}</div>
          ${next ? `<em>Próximo: ${next.pieces} piezas · ${next.label}</em>` : '<em class="set-complete">✦ Set completo</em>'}
        </article>`;
      }).join('')}</div>
    </section>` : `<section class="equipment-set-panel equipment-set-empty"><b>✦ Armá un conjunto</b><span>Equipá 2 piezas del mismo set para desbloquear su primer bono.</span></section>`;
    
    box.innerHTML = `
      <div class="equipment-tab">
        ${setProgressMarkup}
        <div class="character-doll">
          <div class="loadout-title"><span><img class="subclass-loadout-emblem" src="${loadoutEmblem}" alt="Emblema de ${style.label}" decoding="async"></span><div><small>VESTIDURA ACTIVA · ${style.baseLabel}</small><strong>${style.label}</strong><em>${style.weapon}</em></div></div>
          <img class="equipment-sanctum-rune" src="assets/images/inventory_sanctum_rune.webp" alt="" decoding="async">
          <img class="equipment-hero-art ${style.isSubclass?'subclass-hero-art':''}" src="${style.image}" alt="${style.label}" decoding="async">
          
          ${gearSlotMarkup('helmet')}
          ${gearSlotMarkup('chest')}
          ${gearSlotMarkup('weapon')}
          ${gearSlotMarkup('shield')}
          ${gearSlotMarkup('gloves')}
          ${gearSlotMarkup('ring')}
          ${gearSlotMarkup('boots')}
          <div class="loadout-hint">Tocá una pieza equipada para devolverla a la mochila</div>
        </div>

        <div class="inventory-list">
          <div class="backpack-head"><span>◈</span><div><small>INVENTARIO DEL VIAJERO</small><h4>Tu Mochila</h4></div><b>${state.ownedEquipment.length}</b></div>
          ${state.ownedEquipment.length === 0 ? `<div class="empty-backpack-state"><img src="assets/images/inventory_empty_satchel.webp" alt="Mochila del viajero" decoding="async"><b>MOCHILA A LA ESPERA</b><p>Consigue piezas en la caceria, el gremio o la herreria para preparar a tu aventurero.</p><small>BOTIN · TIENDA · HERRERIA</small></div>` : ''}
          ${state.ownedEquipment.map((item, idx) => {
            const rarity = itemRarityMeta(item);
            return `
            <div class="inv-item rarity-${rarity.key}" style="--rarity-color:${rarity.color};--rarity-glow:${rarity.glow};border-left-color:${rarity.color}">
              ${item.image ? `<img class="inv-item-art" src="${item.image}" alt="" decoding="async" loading="lazy">` : ''}<div class="inv-item-info">
                <span class="inv-item-name">${item.name}</span>
                <span class="inv-rarity" style="--rarity-color:${rarity.color}">${rarity.label}</span>
                ${item.forgeLabel ? `<span class="inv-forge-quality quality-${item.forgeOutcome||'stable'}">⚒ ${escapeHtml(item.forgeLabel)}${item.forgeMultiplier>1?` · +${Math.round((item.forgeMultiplier-1)*100)}% base`:''}</span>` : ''}
                <span class="inv-item-stats">
                  ${item.bonusAtk ? `+${item.bonusAtk} Atk ` : ''}
                  ${item.bonusDef ? `+${item.bonusDef}% Robustez ` : ''}
                  ${item.bonusCrit ? `+${item.bonusCrit}% C. ` : ''}
                  ${item.bonusCritDmg ? `+${item.bonusCritDmg}% D.C.` : ''}
                  ${item.bonusHp ? `+${item.bonusHp} Vida ` : ''}
                  ${item.bonusMana ? `+${item.bonusMana} Mana ` : ''}
                  ${item.bonusSpeed ? `+${item.bonusSpeed}% Rapidez` : ''}
                </span>
              </div>
              <div class="inv-actions"><button class="claim-btn ready" style="padding: 4px 10px; width:auto; font-size:10px; font-family:'Cinzel';" onclick="equipItemFromInventory(${idx})">Equipar</button><button class="delete-item-btn" onclick="deleteItemFromInventory(${idx})">Eliminar</button></div>
            </div>
          `}).join('')}
        </div>
      </div>
    `;

    box.querySelectorAll('.eq-slot').forEach(slot => {
      slot.addEventListener('click', () => {
        const slotName = slot.dataset.slot;
        if (state.equipment[slotName]) {
          unequipItem(slotName);
        }
      });
    });
  }
}

function guildSummaryMarkup(){
  const missionReady = ['day','week','month'].reduce((total, tab)=>{
    const data = state.missions[tab];
    return total + MISSION_DEFS[tab].filter((def, index)=> (data[def.key]||0) >= def.target && !data.claimed[index]).length;
  }, 0);
  const achievementReady = ACHIEVEMENTS.filter(a=>a.check(state) && !state.achievementsClaimed[a.id]).length;
  const ready = missionReady + achievementReady;
  const labels = {shop:'Mercado del bastion', day:'Ordenes del dia', week:'Campana semanal', month:'Campana mensual', logros:'Salon de leyendas', bestiary:'Archivo de criaturas', trade:'Lonja de aventureros'};
  const note = ready
    ? `<b>${ready} recompensa${ready===1?'':'s'} lista${ready===1?'':'s'}.</b> Reclama tus avances para fortalecer al heroe.`
    : 'Completa encargos y grandes hitos para ganar oro y experiencia.';
  return `
    <div class="guild-command">
      <div><span>TESORO</span><strong>${state.gold}</strong><small>oro disponible</small></div>
      <div class="guild-marks"><span>SELLOS</span><strong>✦ ${Math.floor(finiteNumber(state.guildMarks))}</strong><small>moneda de comercio</small></div>
      <div><span>ENCARGOS</span><strong>${missionReady}</strong><small>por reclamar</small></div>
      <div><span>LOGROS</span><strong>${achievementReady}/${ACHIEVEMENTS.length}</strong><small>premios listos</small></div>
    </div>
    <div class="guild-note"><span>✦</span><span><b>${labels[activeGuildTab]}</b> — ${note}</span></div>`;
}

function renderProfile(){
  return renderProfileHub();
  const box = document.getElementById('profileContent');
  if(!box || !state) return;
  const hero = currentClass();
  const style = battleClassStyle();
  const need = expToNext(state.level);
  const expPct = state.level>=LEVEL_CAP ? 100 : Math.max(0, Math.min(100, finiteNumber(state.exp)/Math.max(1,need)*100));
  const completed = ACHIEVEMENTS.filter(a=>a.check(state));
  const claimed = completed.filter(a=>state.achievementsClaimed[a.id]).length;
  const equipmentCount = Object.values(state.equipment||{}).filter(Boolean).length;
  const catalog = bestiaryCatalog();
  const discovered = catalog.filter(form=>state.bestiary && state.bestiary[form.type || form.name]).length;
  const runActive = runState && runState.phase!=='ended';
  const recentAchievements = ACHIEVEMENTS.slice(0,5);
  box.style.setProperty('--profile-glow', style.glow || '#e8c477');
  box.innerHTML = `
    <section class="profile-hero">
      <div class="profile-portrait"><img src="${style.image}" alt="${hero.label}" decoding="async"></div>
      <div class="profile-summary">
        <span class="profile-kicker">✦ REGISTRO DEL BASTIÓN · AVENTURERO ACTIVO</span>
        <h2 class="profile-name">${escapeHtml(state.name)}</h2>
        <div class="profile-classline">${classEmblem(state.characterClass)} <span>${hero.label}</span><small>· ${style.weapon}</small></div>
        <p class="profile-description">${hero.description} Tu leyenda se construye en cada expedición, reliquia y guardián derrotado.</p>
        <div class="profile-exp"><span>NIVEL ${state.level}</span><span>${state.level>=LEVEL_CAP?'NIVEL MÁXIMO':`${Math.floor(finiteNumber(state.exp))} / ${need} EXP`}</span><div class="bar exp"><div style="width:${expPct}%"></div></div></div>
        <div class="profile-actions"><button id="profileHeroBtn">VER HÉROE Y EQUIPO</button><button id="profileCharactersBtn" class="profile-secondary">CAMBIAR PERSONAJE</button></div>
      </div>
    </section>
    <section class="profile-metrics">
      <article class="profile-metric"><small>⚡ PODER</small><b>${Math.round(power())}</b><em>fuerza actual</em></article>
      <article class="profile-metric"><small>♛ RESETS</small><b>${state.resets || 0}</b><em>${availableStatResets()} disponible${availableStatResets()===1?'':'s'}</em></article>
      <article class="profile-metric"><small>⚔ VICTORIAS</small><b>${state.totalWins || 0}</b><em>${state.totalBossWins || 0} guardianes</em></article>
      <article class="profile-metric"><small>◉ TESORO</small><b>${Math.floor(finiteNumber(state.gold))}</b><em>oro disponible</em></article>
    </section>
    <section class="profile-columns">
      <article class="profile-block"><h4>✦ HITOS DE TU LEYENDA</h4><div class="profile-achievements">${recentAchievements.map(a=>{ const done=a.check(state); const isClaimed=!!state.achievementsClaimed[a.id]; return `<div class="profile-achievement ${done?'done':''}"><span class="achievement-mark">${achievementGlyph(a.id)}</span><div><b>${escapeHtml(a.label)}</b><small>${done?(isClaimed?'Recompensa reclamada':'Listo para reclamar en el Gremio'):'Todavía en progreso'}</small></div><span class="achievement-status">${done?'✓':'—'}</span></div>`; }).join('')}</div></article>
      <article class="profile-block"><h4>◈ PROGRESO DEL VIAJERO</h4><div class="profile-progress-list"><div class="profile-progress-row"><span>Mejor profundidad</span><b>⛏ ${state.maxHuntDepth || 0}</b></div><div class="profile-progress-row"><span>Bestiario descubierto</span><b>${discovered} / ${catalog.length}</b></div><div class="profile-progress-row"><span>Equipo equipado</span><b>${equipmentCount} / 7 piezas</b></div><div class="profile-progress-row"><span>Logros completados</span><strong>${completed.length} / ${ACHIEVEMENTS.length}</strong></div><div class="profile-progress-row"><span>Recompensas reclamadas</span><b>${claimed}</b></div></div><div class="profile-run-badge">${runActive ? `⚔ Expedición activa · profundidad ${runState.depth}` : '✦ Sin expedición activa · listo para cazar'}</div></article>
    </section>`;
  box.querySelector('#profileHeroBtn').addEventListener('click',()=>document.querySelector('.nav-btn[data-sec="secHero"]').click());
  box.querySelector('#profileCharactersBtn').addEventListener('click',()=>document.getElementById('charactersBtn').click());
}

function achievementGlyph(id){
  if(id.indexOf('boss')===0) return '♛';
  if(id.indexOf('win')===0) return '⚔';
  if(id.indexOf('reset')===0) return '↻';
  if(id.indexOf('gold')===0) return '◈';
  if(id.indexOf('reach')===0) return '✦';
  return '✧';
}

/* ================= COMERCIO ENTRE AVENTUREROS =================
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

function detectLowEndDevice(){
  const memory = Number(navigator.deviceMemory) || 0;
  const cores = Number(navigator.hardwareConcurrency) || 0;
  const saveData = !!(navigator.connection && navigator.connection.saveData);
  const slowUpdates = !!(window.matchMedia && window.matchMedia('(update: slow)').matches);
  return saveData || slowUpdates || (memory > 0 && memory <= 4) || (cores > 0 && cores <= 4);
}
function performanceModeActive(){
  const mode = state?.settings?.performanceMode || 'auto';
  return mode === 'on' || (mode === 'auto' && detectLowEndDevice());
}
function applyVisualSettings(){
  const settings = state.settings || {};
  document.body.classList.toggle('graphics-medium', settings.graphics === 'medium');
  document.body.classList.toggle('graphics-low', settings.graphics === 'low');
  document.body.classList.toggle('reduce-motion', !!settings.reducedMotion);
  document.body.classList.toggle('performance-mode', performanceModeActive());
  if(Sound){
    Sound.musicEnabled = !!settings.musicEnabled;
    Sound.applyVolumes();
    Sound.updateMusicControl();
  }
}

function renderOptions(){
  return renderOptionsHub();
  const box = document.getElementById('settingsContent');
  if(!box) return;
  const s = state.settings || {};
  const musicOn = !!s.musicEnabled;
  const sfxOn = s.sfxEnabled !== false;
  box.innerHTML = `
    <p class="settings-intro">Ajustá la experiencia a tu gusto. Estos cambios se guardan para este personaje.</p>
    <section class="settings-group">
      <h4>Audio</h4>
      <div class="setting-row">
        <div class="setting-label"><b>♫ Música</b><small>Ambiente del menú y combate</small></div>
        <input class="settings-range" id="musicVolume" type="range" min="0" max="100" value="${s.musicVolume}" aria-label="Volumen de música">
        <output id="musicVolumeValue">${s.musicVolume}%</output>
      </div>
      <div class="setting-row">
        <div class="setting-label"><b>✦ Efectos</b><small>Golpes, recompensas y avisos</small></div>
        <input class="settings-range" id="sfxVolume" type="range" min="0" max="100" value="${s.sfxVolume}" aria-label="Volumen de efectos">
        <output id="sfxVolumeValue">${s.sfxVolume}%</output>
      </div>
      <div class="settings-switch"><span>Música en segundo plano</span><button type="button" id="musicEnabledBtn" class="${musicOn?'active':''}">${musicOn?'ACTIVADA':'SILENCIADA'}</button></div>
      <div class="settings-switch"><span>Efectos de sonido</span><button type="button" id="sfxEnabledBtn" class="${sfxOn?'active':''}">${sfxOn?'ACTIVADOS':'SILENCIADOS'}</button></div>
    </section>
    <section class="settings-group">
      <h4>Imagen y comodidad</h4>
      <div class="setting-label" style="margin-bottom:9px"><b>Calidad gráfica</b><small>Reducíla si el juego va lento.</small></div>
      <div class="quality-grid">
        ${[['high','Alta','Efectos completos'],['medium','Media','Menos partículas'],['low','Baja','Mayor fluidez']].map(([id,title,detail])=>`<button type="button" class="quality-btn ${s.graphics===id?'active':''}" data-quality="${id}">${title}<small style="display:block;font:8px 'JetBrains Mono';margin-top:4px;color:var(--parchment-dim)">${detail}</small></button>`).join('')}
      </div>
      <div class="settings-switch"><span>Reducir animaciones</span><button type="button" id="motionBtn" class="${s.reducedMotion?'active':''}">${s.reducedMotion?'ACTIVADO':'DESACTIVADO'}</button></div>
    </section>
    <div class="settings-actions">
      <button type="button" class="settings-action" id="testSoundBtn">✦ Probar sonido</button>
      <button type="button" class="settings-action" id="optionsFullscreenBtn">⛶ Alternar modo juego</button>
      <button type="button" class="settings-action danger" id="resetOptionsBtn">↺ Restaurar opciones</button>
    </div>`;

  const updateRange = (key, outputId) => event => {
    state.settings[key] = Number(event.target.value);
    document.getElementById(outputId).textContent = `${event.target.value}%`;
    Sound.applyVolumes(); saveState();
  };
  box.querySelector('#musicVolume').addEventListener('input', updateRange('musicVolume','musicVolumeValue'));
  box.querySelector('#sfxVolume').addEventListener('input', updateRange('sfxVolume','sfxVolumeValue'));
  box.querySelector('#musicEnabledBtn').addEventListener('click', ()=>{ state.settings.musicEnabled=!state.settings.musicEnabled; Sound.musicEnabled=state.settings.musicEnabled; if(Sound.musicEnabled){ Sound.init(); if(Sound.scene==='menu' && Sound.menuAudioEl){ Sound.syncMenuAudio(); } else { Sound.playNextNote(); } } else { Sound.syncMenuAudio(); } Sound.applyVolumes(); saveState(); renderOptions(); });
  box.querySelector('#sfxEnabledBtn').addEventListener('click', ()=>{ state.settings.sfxEnabled=!state.settings.sfxEnabled; Sound.applyVolumes(); Sound.click(); saveState(); renderOptions(); });
  box.querySelectorAll('[data-quality]').forEach(btn=>btn.addEventListener('click',()=>{ state.settings.graphics=btn.dataset.quality; applyVisualSettings(); saveState(); renderOptions(); }));
  box.querySelector('#motionBtn').addEventListener('click',()=>{ state.settings.reducedMotion=!state.settings.reducedMotion; applyVisualSettings(); saveState(); renderOptions(); });
  box.querySelector('#testSoundBtn').addEventListener('click',()=>Sound.preview());
  box.querySelector('#optionsFullscreenBtn').addEventListener('click',()=>toggleGameMode());
  box.querySelector('#resetOptionsBtn').addEventListener('click',()=>{ state.settings={musicVolume:100,sfxVolume:100,musicEnabled:false,sfxEnabled:true,graphics:'high',reducedMotion:false,performanceMode:'auto'}; Sound.musicEnabled=false; applyVisualSettings(); saveState(); renderOptions(); });
}

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
  return `<span class="hub-ring"><svg viewBox="0 0 64 64" aria-hidden="true"><circle class="ring-track" cx="32" cy="32" r="${r}"></circle><circle class="ring-fill" cx="32" cy="32" r="${r}" style="stroke-dasharray:${c.toFixed(2)};stroke-dashoffset:${offset.toFixed(2)}"></circle></svg><span class="hub-icon">${icon}</span><span class="hub-ring-pct">${Math.round(pct)}%</span></span>`;
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
  if(performanceModeActive()) return '';
  return `<div class="hub-particles" aria-hidden="true">${HUB_PARTICLES.map(p=>`<span style="--x:${p.x};--y:${p.y};--size:${p.size};--dur:${p.dur};--delay:${p.delay}"></span>`).join('')}</div>`;
}

function renderProfileHub(){
  const box=document.getElementById('profileContent');
  if(!box || !state) return;
  const hero=currentClass();
  const style=activeHeroVisual();
  const data=profileHubStats();
  const prestige = playerPrestigeTier();
  const home = activeProfileView==='home';
  box.className='panel hub-shell profile-hall';
  box.style.setProperty('--profile-glow', style.glow || '#e8c477');
  const particles = hubParticlesHTML();
  const head = `<div class="hub-head"><div class="hub-emblem ${style.isSubclass?'has-subclass-art':''}">${style.isSubclass&&style.image?`<img src="${style.image}" alt="${style.label}" decoding="async">`:hero.icon}</div><h2>${home?'EL SANTUARIO DEL AVENTURERO':escapeHtml(state.name)}</h2><p>${home?'Elegí qué parte de tu leyenda querés consultar. Cada registro tiene su propio espacio.':`${style.baseLabel} · ${style.label} · Nivel ${state.level} · ${style.weapon}`}</p>${home?`<span class="hub-identity" style="--prestige-color:${prestige.color}">${classEmblem(state.characterClass)} ${escapeHtml(state.name)} · <b>${style.isSubclass?style.label+' · ':''}${prestige.label}</b> · Poder ${Math.round(power())}</span>`:''}</div>`;
  if(home){
    box.innerHTML = `${particles}${head}<div class="hub-menu">
      <button class="hub-tile primary" data-profile-view="identity" style="--hub-color:${style.glow}"><span class="hub-icon ${style.isSubclass?'hub-subclass-icon':''}">${style.isSubclass&&style.image?`<img src="${style.image}" alt="">`:hero.icon}</span><b>MI FICHA</b><small>Nombre, clase, nivel, experiencia y el poder actual de tu aventurero.</small><span class="hub-pill">${style.isSubclass?style.label:'VER PERFIL'}</span></button>
      <button class="hub-tile primary" data-profile-view="progress" style="--hub-color:#d7a64d"><span class="hub-icon">✦</span><b>PROGRESO</b><small>Victorias, profundidad alcanzada, resets y camino de la expedición.</small><span class="hub-pill">${state.totalWins||0} VICTORIAS</span></button>
      <button class="hub-tile has-ring" data-profile-view="achievements" style="--hub-color:#e7c05e">${hubProgressRing(data.completed.length,ACHIEVEMENTS.length,'♛')}<b>LOGROS</b><small>${data.completed.length}/${ACHIEVEMENTS.length} hitos completados</small></button>
      <button class="hub-tile has-ring" data-profile-view="collection" style="--hub-color:#b8954c">${hubProgressRing(data.discovered,data.catalog.length,'◈')}<b>COLECCIÓN</b><small>${data.discovered}/${data.catalog.length} criaturas registradas</small></button>
      <button class="hub-tile" data-profile-action="hero" style="--hub-color:#cf8a69"><span class="hub-icon">🛡</span><b>HÉROE</b><small>Equipo, mochila y estadísticas</small></button>
      <button class="hub-tile" data-profile-action="characters" style="--hub-color:#c49355"><span class="hub-icon">👥</span><b>PERSONAJES</b><small>Elegí o administrá tus héroes</small></button>
    </div>`;
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
  } else {
    const materials=state.materials||{};
    box.innerHTML=`${particles}${head}<section class="hub-detail"><button class="hub-back" data-profile-back>← VOLVER AL PERFIL</button><h3 class="hub-detail-title">COLECCIÓN DEL VIAJERO</h3><p class="hub-detail-sub">Registros de criaturas, piezas equipadas y materiales de forja.</p><div class="hub-detail-grid"><div class="hub-detail-stat" style="--stat-color:#7bc981"><small>BESTIARIO</small><b>${data.discovered}/${data.catalog.length}</b></div><div class="hub-detail-stat" style="--stat-color:#b9c4d6"><small>EQUIPO</small><b>${data.equipped}/7</b></div><div class="hub-detail-stat" style="--stat-color:#9fd3f0"><small>ESENCIA</small><b>${Math.floor(finiteNumber(materials.essence))}</b></div><div class="hub-detail-stat" style="--stat-color:#c58bff"><small>NÚCLEOS</small><b>${Math.floor(finiteNumber(materials.bossCore))}</b></div><div class="hub-detail-stat" style="--stat-color:#e8c477"><small>PIEZAS</small><b>${(state.ownedEquipment||[]).length}</b></div><div class="hub-detail-stat" style="--stat-color:#e0796a"><small>TROFEOS</small><b>${Object.keys(materials.bossTrophies||{}).length}</b></div></div><div class="hub-action-row"><button data-profile-action="guild">ABRIR BESTIARIO</button><button data-profile-action="hero">VER EQUIPO</button><button data-profile-action="forge">IR A HERRERÍA</button></div></section>`;
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
  box.querySelectorAll('[data-profile-back]').forEach(button=>button.addEventListener('click',()=>{ activeProfileView='home'; Sound.click(); renderProfileHub(); }));
  box.querySelectorAll('[data-profile-action]').forEach(button=>button.addEventListener('click',()=>{ const action=button.dataset.profileAction; if(action==='characters'){ document.getElementById('charactersBtn').click(); return; } const section={hero:'secHero',hunt:'secHunt',guild:'secGuild',forge:'secForge'}[action]; if(section) document.querySelector(`.nav-btn[data-sec="${section}"]`).click(); }));
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
    const performanceStatus=performanceModeActive()?'ACTIVO':'INACTIVO';
    box.innerHTML=`${head}<section class="hub-detail settings-detail"><button class="hub-back" data-options-back>← VOLVER A OPCIONES</button><section class="settings-group"><h4>Imagen y comodidad</h4><div class="setting-label" style="margin-bottom:9px"><b>Calidad gráfica</b><small>Reducila si el juego va lento.</small></div><div class="quality-grid">${[['high','Alta','Efectos completos'],['medium','Media','Menos partículas'],['low','Baja','Mayor fluidez']].map(([id,title,detail])=>`<button class="quality-btn ${s.graphics===id?'active':''}" data-quality="${id}">${title}<small style="display:block;font:8px 'JetBrains Mono';margin-top:4px;color:var(--parchment-dim)">${detail}</small></button>`).join('')}</div><div class="setting-label performance-label"><b>Modo rendimiento</b><small>Reduce desenfoques, partículas y efectos temporales. En Automático se activa solo en equipos modestos.</small></div><div class="quality-grid performance-grid">${[['auto','Automático',performanceStatus],['on','Activado','Máxima fluidez'],['off','Desactivado','Calidad elegida']].map(([id,title,detail])=>`<button class="quality-btn ${s.performanceMode===id?'active':''}" data-performance="${id}">${title}<small>${detail}</small></button>`).join('')}</div><div class="settings-switch"><span>Reducir animaciones</span><button id="motionBtn" class="${s.reducedMotion?'active':''}">${s.reducedMotion?'ACTIVADO':'DESACTIVADO'}</button></div></section></section>`;
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
  box.querySelectorAll('[data-performance]').forEach(button=>button.addEventListener('click',()=>{state.settings.performanceMode=button.dataset.performance;applyVisualSettings();saveState();renderOptionsHub();}));
  box.querySelector('#motionBtn')?.addEventListener('click',()=>{state.settings.reducedMotion=!state.settings.reducedMotion;applyVisualSettings();saveState();renderOptionsHub();});
  box.querySelector('#testSoundBtn')?.addEventListener('click',()=>Sound.preview());
  box.querySelector('#optionsFullscreenBtn')?.addEventListener('click',()=>toggleGameMode());
  box.querySelector('#resetOptionsBtn')?.addEventListener('click',()=>{state.settings={musicVolume:100,sfxVolume:100,musicEnabled:false,sfxEnabled:true,graphics:'high',reducedMotion:false,performanceMode:'auto'};Sound.musicEnabled=false;applyVisualSettings();saveState();activeOptionsView='home';renderOptionsHub();});
}

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

  if (state.equipment[slot]) {
    state.ownedEquipment.push(state.equipment[slot]);
  }

  state.equipment[slot] = item;
  state.ownedEquipment.splice(index, 1);

  addLog(`Te equipaste: ${item.name}`, 'level');
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

  state.ownedEquipment.push(item);
  state.equipment[slotName] = null;

  addLog(`Te quitaste: ${item.name}`, 'level');
  saveState();
  render();
}

/* ================= ACTUALIZACIÓN DE PANTALLA ================= */
let lastRenderedLevel = null;
let lastRenderedGold = null;
function pulseSealLevel(){
  const lvlText = document.getElementById('sealLevelText');
  if(!lvlText) return;
  lvlText.classList.remove('level-pulse');
  requestAnimationFrame(()=> lvlText.classList.add('level-pulse'));
}
function updateGoldDisplay(newGold){
  const el = document.getElementById('statGold');
  if(!el) return;
  const prev = lastRenderedGold===null ? newGold : lastRenderedGold;
  const increased = newGold > prev;
  lastRenderedGold = newGold;
  if(prev === newGold){ el.textContent = newGold; return; }
  const start = performance.now();
  const duration = 550;
  (function step(now){
    const t = Math.min(1, (now-start)/duration);
    const eased = 1 - Math.pow(1-t, 3);
    el.textContent = Math.round(prev + (newGold-prev)*eased);
    if(t<1) requestAnimationFrame(step);
    else el.textContent = newGold;
  })(start);
  if(increased){
    el.classList.remove('gold-flash');
    requestAnimationFrame(()=> el.classList.add('gold-flash'));
  }
}
function render(){
  applyVisualSettings();
  syncMusicScene();
  document.getElementById('pName').textContent = state.name;
  const heroClass = currentClass();
  const subclass = currentSubclass();
  document.getElementById('heroClassTitle').textContent = `${heroClass.icon} ${heroClass.label}${subclass?` · ${subclass.icon} ${subclass.label}`:''}`;
  const availableResets = availableStatResets();
  document.getElementById('pResets').textContent = `${availableResets} RESTABLECIMIENTO${availableResets===1?'':'S'} DISP.`;
  document.getElementById('sealLevelText').textContent = state.level;
  if(lastRenderedLevel !== null && state.level > lastRenderedLevel) pulseSealLevel();
  lastRenderedLevel = state.level;
  renderSealRings();

  const need = expToNext(state.level);
  const pct = state.level>=LEVEL_CAP ? 100 : Math.min(100, (state.exp/need)*100);
  document.getElementById('expBar').style.width = pct+'%';
  document.getElementById('expLabel').textContent = state.level>=LEVEL_CAP ? 'NIVEL MÁXIMO' : `${state.exp} / ${need}`;
  updateGoldDisplay(state.gold);
  document.getElementById('powerLabel').textContent = `Poder ${Math.round(power())}` + (winStreak>0 ? ` · 🔥 Racha ${winStreak}` : '');

  document.getElementById('pointsBanner').className = 'points-banner' + (state.statPoints>0?'':' empty');
  document.getElementById('pointsBanner').textContent = state.statPoints>0 ? `${state.statPoints} puntos para asignar` : 'Sin puntos para asignar';
  statAllocList();

  const runLocked = battle || (runState && runState.phase!=='ended');
  const resetBtn = document.getElementById('resetBtn');
  if(state.level >= LEVEL_CAP && !runLocked){
    resetBtn.disabled = false;
    resetBtn.textContent = `RENACER · MARCA ETERNA #${state.resets+1}`;
  } else {
    resetBtn.disabled = true;
    resetBtn.textContent = state.level>=LEVEL_CAP ? 'Terminá la cacería para renacer' : `Renacimiento disponible al nivel ${LEVEL_CAP}`;
  }

  huntMode = 'run';
  renderRunMode();
  renderLog();
  renderHuntSubTabs();
  renderActiveSubTabs();
}

/* ================= ARRANQUE ================= */
function renderCharacterGate(roster){
  const list = document.getElementById('characterList');
  const form = document.getElementById('newCharacterForm');
  const rosterCount = document.getElementById('gateRosterCount');
  if(rosterCount) rosterCount.textContent = `${roster.length} / 3 HEROES`;
  list.innerHTML = roster.map(character => `
    <div class="character-card">
      <button class="character-select" data-character="${character.id}">
        <span class="char-icon"></span>
        <span><span class="char-name">${escapeHtml(character.name)}</span><span class="char-meta">Nivel ${character.level} · ${character.resets || 0} resets</span></span>
        <span class="char-play">JUGAR ›</span>
      </button>
      <button class="character-delete" data-delete-character="${character.id}" title="Borrar personaje" aria-label="Borrar ${escapeHtml(character.name)}">×</button>
    </div>`).join('');
  list.querySelectorAll('[data-character]').forEach((button, index) => {
    const character = roster[index];
    const heroClass = CLASSES[character.characterClass] || CLASSES.warrior;
    const subclass = SUBCLASSES[character.characterClass] && SUBCLASSES[character.characterClass][character.subclass];
    const icon = button.querySelector('.char-icon');
    const meta = button.querySelector('.char-meta');
    if(icon) icon.innerHTML = subclass && subclass.image ? `<img class="subclass-roster-art" src="${subclass.image}" alt="${subclass.label}" decoding="async">` : classEmblem(character.characterClass);
    if(meta) meta.textContent = `${heroClass.label}${subclass?` · ${subclass.label}`:''} · Nivel ${character.level} · ${character.resets || 0} resets`;
    button.addEventListener('click', () => activateCharacter(button.dataset.character));
  });
  list.querySelectorAll('[data-delete-character]').forEach(button=>{
    button.addEventListener('click', async ()=>{
      const id = button.dataset.deleteCharacter;
      const character = roster.find(entry=>entry.id===id);
      if(!character || !confirm(`Borrar a ${character.name}? Esta accion no se puede deshacer.`)) return;
      await removeStored(characterKey(id));
      await clearRunSnapshot(id);
      await saveRoster(roster.filter(entry=>entry.id!==id));
      Sound.click();
      showFeedback('PERSONAJE BORRADO', character.name, 'danger');
      renderCharacterGate(await loadRoster());
    });
  });
  form.style.display = roster.length >= 3 ? 'none' : 'block';
  if(roster.length >= 3 && !list.querySelector('.character-limit')){
    list.insertAdjacentHTML('beforeend', '<div class="character-divider character-limit"><span>3/3 PERSONAJES</span></div>');
  }
}

function syncMusicScene(){
  if(!state){ Sound.setScene('menu'); return; }
  if(battle){
    const monster = battle.monster;
    const lowHealth = monster && monster.hp>0 && monster.hp/monster.maxHp<=.30;
    if(lowHealth && !(monster.isBoss && monster.phaseTwo)){ Sound.setScene('danger'); return; }
    Sound.setScene(monster && monster.isBoss ? (monster.phaseTwo ? 'bossPhase' : 'boss') : 'battle');
    return;
  }
  const huntOpen = document.getElementById('secHunt')?.classList.contains('active');
  Sound.setScene(huntOpen ? 'hunt' : 'menu');
}

async function activateCharacter(id){
  const saved = await loadState(id);
  if(!saved) return;
  activeCharacterId = id;
  state = saved;
  normalizeState();
  battle = null;
  runState = null;
  winStreak = 0;
  const savedRun = await loadRunSnapshot(id);
  const resumed = restoreRunSnapshot(savedRun);
  applyVisualSettings();
  Sound.musicEnabled = !!state.settings.musicEnabled;
  Sound.applyVolumes();
  Sound.updateMusicControl();
  Sound.click();
  showGame();
  if(resumed) showFeedback('EXPEDICIÓN RESTAURADA', `Retomaste la profundidad ${runState.depth}`, 'reward');
  checkDailyLogin();
  updateDeveloperPanel();
}

function renderGateClassShowcase(){
  const showcase = document.getElementById('gateClassShowcase');
  const gate = document.getElementById('nameGate');
  if(!showcase || !gate) return;
  const selected = CLASSES[selectedClassId] || CLASSES.warrior;
  const visual = CLASS_BATTLE_STYLE[selectedClassId] || CLASS_BATTLE_STYLE.warrior;
  const traits = [];
  if(selected.hp) traits.push(`+${selected.hp} VIDA`);
  if(selected.mana) traits.push(`+${selected.mana} MANA`);
  if(selected.atk) traits.push(`+${selected.atk} ATAQUE`);
  if(selected.def) traits.push(`+${selected.def} ROBUSTEZ`);
  if(selected.crit) traits.push(`+${selected.crit}% CRITICO`);
  if(selected.dodge) traits.push(`+${Math.round(selected.dodge * 100)}% ESQUIVA`);
  if(selected.skillMult > 1.1) traits.push(`+${Math.round((selected.skillMult - 1) * 100)}% PODER`);
  if(!traits.length) traits.push('COMBATE ADAPTABLE');
  gate.dataset.class = selectedClassId;
  gate.style.setProperty('--class-glow', visual.glow || '#e8c477');
  showcase.innerHTML = `
    <div class="gate-class-artbox">
      <img class="gate-class-art" src="${visual.image}" alt="${selected.label}" decoding="async">
    </div>
    <div class="gate-class-info">
      <span class="gate-class-pill">${classEmblem(selectedClassId)} ${selected.label}</span>
      <h3>${selected.label}</h3>
      <span class="gate-class-weapon">ARMA DISTINTIVA: ${visual.weapon}</span>
      <p>${selected.description}</p>
      <div class="gate-class-traits">${traits.slice(0,3).map(trait=>`<span>${trait}</span>`).join('')}</div>
    </div>`;
}

function renderClassPicker(){
  const description = document.getElementById('classDescription');
  const selected = CLASSES[selectedClassId] || CLASSES.warrior;
  description.textContent = `${selected.icon} ${selected.label}: ${selected.description}`;
  const nameInput = document.getElementById('nameInput');
  if(nameInput) nameInput.placeholder = `Nombre de ${selected.label.toLowerCase()}`;
  renderGateClassShowcase();
  document.querySelectorAll('#classPicker [data-class]').forEach(button => {
    button.classList.toggle('active', button.dataset.class===selectedClassId);
    button.onclick = () => { selectedClassId = button.dataset.class; Sound.click(); renderClassPicker(); };
  });
}

async function createCharacter(){
  const input = document.getElementById('nameInput');
  const name = input.value.trim().slice(0,16);
  if(!name){ input.focus(); return; }
  const roster = await loadRoster();
  if(roster.length >= 3){ renderCharacterGate(roster); return; }
  activeCharacterId = `hero-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
  state = defaultState(name, selectedClassId);
  await saveState();
  Sound.heroBorn();
  showGame();
}

function syncGameMode(){
  const active = !!(document.fullscreenElement || document.webkitFullscreenElement);
  document.body.classList.toggle('immersive-game', active);
  const button = document.getElementById('fullscreenBtn');
  if(button){
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
    button.textContent = active ? '⛶ Salir del modo juego' : '⛶ Modo juego';
  }
}

async function toggleGameMode(){
  const active = !!(document.fullscreenElement || document.webkitFullscreenElement);
  try{
    if(active){
      if(document.exitFullscreen) await document.exitFullscreen();
      else if(document.webkitExitFullscreen) document.webkitExitFullscreen();
    }else{
      const root = document.documentElement;
      if(root.requestFullscreen) await root.requestFullscreen();
      else if(root.webkitRequestFullscreen) root.webkitRequestFullscreen();
      else throw new Error('fullscreen no disponible');
    }
  }catch(_error){
    const cinematic = !document.body.classList.contains('immersive-game');
    document.body.classList.toggle('immersive-game', cinematic);
    const button = document.getElementById('fullscreenBtn');
    if(button){ button.classList.toggle('active', cinematic); button.setAttribute('aria-pressed', String(cinematic)); button.textContent = cinematic ? '⛶ Salir del modo juego' : '⛶ Modo juego'; }
    showFeedback(cinematic ? '⛶ MODO JUEGO ACTIVADO' : '⛶ MODO JUEGO CERRADO', cinematic ? 'Vista ampliada activada' : 'Vista normal restaurada');
  }
}

async function launchGamePortal() {
  if(gamePortalBooted) return;
  gamePortalBooted=true;
  document.getElementById('musicToggle').addEventListener('click', () => {
    Sound.toggleMusic();
  });
  document.getElementById('fullscreenBtn').addEventListener('click', toggleGameMode);
  document.addEventListener('fullscreenchange', syncGameMode);
  document.addEventListener('webkitfullscreenchange', syncGameMode);
  Sound.updateMusicControl();

  const roster = await loadRoster();
  renderCharacterGate(roster);
  renderClassPicker();
  document.getElementById('startBtn').addEventListener('click', createCharacter);
  document.getElementById('nameInput').addEventListener('keydown', event => {
    if(event.key === 'Enter') createCharacter();
  });
  return;

  if (false) {
    state = saved;
    if (state.equipAtk === undefined) state.equipAtk = 0;
    if (!state.ownedItems) state.ownedItems = {};
    if (!state.equipment) {
      state.equipment = { helmet: null, chest: null, gloves: null, boots: null, weapon: null, shield: null, ring: null };
    }
    if (!state.ownedEquipment) state.ownedEquipment = [];
    if (state.critRateStat === undefined) state.critRateStat = 0;
    if (state.critDmgStat === undefined) state.critDmgStat = 0;
    if (state.lastLoginDay === undefined) state.lastLoginDay = null;
    if (state.loginStreak === undefined) state.loginStreak = 0;
    if (state.maxLevelEver === undefined) state.maxLevelEver = state.level;
    if (state.totalWins === undefined) state.totalWins = 0;
    if (state.totalBossWins === undefined) state.totalBossWins = 0;
    if (state.totalGoldEarnedLifetime === undefined) state.totalGoldEarnedLifetime = 0;
    if (state.maxHuntDepth === undefined) state.maxHuntDepth = 0;
    if (!state.achievementsClaimed) state.achievementsClaimed = {};

    normalizeState();
    showGame();
    checkDailyLogin();
    return;
  }
  
  document.getElementById('startBtn').addEventListener('click', async () => {
    const input = document.getElementById('nameInput');
    const name = input.value.trim().slice(0, 16);
    if (!name) { input.focus(); return; }
    state = defaultState(name);
    Sound.victory();
    showGame();
    await saveState();
  });
  document.getElementById('nameInput').addEventListener('keydown', event => {
    if(event.key === 'Enter') document.getElementById('startBtn').click();
  });
}

async function boot(){
  await initializeAccountGate();
}

function showGame(){
  document.getElementById('nameGate').style.display = 'none';
  document.getElementById('mainNav').classList.add('active');
  document.getElementById('game').classList.add('active');
  ensureShop();
  initTabListeners();
  render();
  updateDeveloperPanel();
  showTutorialIfNeeded();
  // Personajes veteranos creados antes del sistema reciben su elección al
  // entrar, sin tener que alcanzar nuevamente el primer Renacimiento.
  if((state.resets||0)>=1 && !state.subclass) setTimeout(()=>openSubclassChoice(false), 450);
}

function showTutorialIfNeeded(){
  if(!state || state.tutorialSeen || document.getElementById('tutorialOverlay')) return;
  const overlay = document.createElement('div');
  overlay.className = 'tutorial-overlay';
  overlay.id = 'tutorialOverlay';
  overlay.innerHTML = `<div class="tutorial-card" role="dialog" aria-modal="true" aria-label="Guía de inicio">
    <header><h2>Tu leyenda comienza ahora</h2><p>Estas cuatro cosas te harán avanzar más rápido.</p></header>
    <div class="tutorial-steps">
      <div class="tutorial-step"><b>1</b><div><strong>Asigná y guardá puntos</strong><span>Probá combinaciones antes de confirmar. Una vez guardados, se restablecen cada 5 niveles.</span></div></div>
      <div class="tutorial-step"><b>2</b><div><strong>Equipá tu botín</strong><span>Visitá Mochila & Equipo y prepará a tu clase antes de una expedición.</span></div></div>
      <div class="tutorial-step"><b>3</b><div><strong>Descendé en Cacería</strong><span>Elegí rutas, usá habilidades y aprendé los patrones de cada enemigo.</span></div></div>
      <div class="tutorial-step"><b>4</b><div><strong>Reclamá avances</strong><span>El Gremio guarda misiones, logros y el bestiario de tus derrotas.</span></div></div>
    </div><button class="claim-btn ready" id="tutorialClose">¡Aventura lista!</button></div>`;
  document.body.appendChild(overlay);
  document.getElementById('tutorialClose').addEventListener('click', ()=>{
    Sound.reward(); state.tutorialSeen = true; overlay.remove(); saveState();
  });
}

function updateGuildRotationClock(){
  const guild = document.getElementById('secGuild');
  const timer = document.getElementById('shopRotationTimer');
  if(document.visibilityState!=='visible' || !state || activeGuildTab!=='shop' || !guild || !guild.classList.contains('active') || !timer) return;
  const remaining = SHOP_ROTATION_MS - (Date.now() - finiteNumber(state.shop && state.shop.generatedAt, 0));
  if(remaining <= 0){ renderGuildSubTab(); return; }
  const mm = String(Math.floor(remaining/60000)).padStart(2,'0');
  const ss = String(Math.floor((remaining%60000)/1000)).padStart(2,'0');
  timer.textContent = `Rotación en ${mm}:${ss}`;
}
setInterval(updateGuildRotationClock, 1000);
boot();
