/* ================= SCRIPT-STATE.JS =================
   Claves de fecha (rachas diarias) y STATE: defaultState, guardado
   local/nube (Supabase), ranking global, snapshot de run. Primera parte de
   lo que antes era script.js. Debe cargarse despues de fishing.js.
   ================================================================= */

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
function starterEquipmentForClass(classId='warrior'){
  const starters = {
    warrior:{ id:'rusty_sword', type:'weapon', name:'Espada Oxidada', bonusAtk:4, bonusCrit:2, image:'assets/images/warrior_weapon_icon.webp' },
    archer:{ id:'worn_training_bow', type:'weapon', name:'Arco de Entrenamiento', bonusAtk:4, bonusCrit:2, image:'assets/images/archer_bow_icon.webp' },
    mage:{ id:'worn_apprentice_staff', type:'weapon', name:'Báculo de Aprendiz', bonusAtk:3, bonusMana:6, image:'assets/images/mage_weapon_icon.webp' },
    priest:{ id:'worn_novice_scepter', type:'weapon', name:'Cetro de Novicio', bonusAtk:3, bonusMana:5, bonusHp:3, image:'assets/images/priest_weapon_icon.webp' },
    assassin:{ id:'worn_training_daggers', type:'weapon', name:'Dagas de Entrenamiento', bonusAtk:4, bonusCrit:2, image:'assets/images/assassin_weapon_icon.webp' },
    tamer:{ id:'worn_binding_whip', type:'weapon', name:'Látigo Gastado', bonusAtk:3, bonusHp:4, bonusCrit:1, image:'assets/images/tamer_weapon_icon.webp' }
  };
  const safeClass = CLASSES[classId] ? classId : 'warrior';
  return {
    ...starters[safeClass],
    classOnly:safeClass,
    rarity:'Común',
    rarityKey:'common',
    equipmentTier:'class',
    starterItem:true
  };
}
/**
 * Crea un personaje nuevo con TODOS los campos que puede tener `state`.
 * Esta función es la fuente de verdad de la forma de `state`: si agregás un
 * campo nuevo acá, agregale también un default en normalizeState() (más abajo
 * en este archivo) para que los personajes guardados antes de este cambio no
 * rompan al cargar. Ver MAPA-PARA-IA.md sección 3.1 para el resumen de campos.
 */
function defaultState(name, classId='warrior') {
  return {
    name: name,
    characterClass: CLASSES[classId] ? classId : 'warrior',
    subclass: null,
    createdAt: Date.now(),
    syncMeta: { version:0, mutationId:'', deviceId:'', modifiedAt:0 },
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
    ownedEquipment: [starterEquipmentForClass(classId)],
    lastLoginDay: null,
    loginStreak: 0,
    maxLevelEver: 1,
    totalWins: 0,
    totalBossWins: 0,
    maxHuntDepth: 0,
    totalGoldEarnedLifetime: 0,
    achievementsClaimed: {},
    bestiary: {},
    cardCodex: {},
    cardHuntSnapshot: null,
    cardHuntSettlements: {},
    legacyHuntMigration: null,
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
    settlement: null,
    settings: { musicVolume:100, sfxVolume:100, musicEnabled:false, sfxEnabled:true, graphics:'high', reducedMotion:false },
    log: []
  };
}
/* ================= PERSISTENCIA LOCAL (guardado, roster, checkpoints) ================= */
function getStorage(){
  return window.storage && typeof window.storage.get === 'function' ? window.storage : null;
}
/* Reinicio global de temporada: cambiar este identificador invalida partidas locales anteriores
   sin cerrar las cuentas de Supabase ni conservar personajes de la temporada previa. */
const STORAGE_NAMESPACE = 'forja-eterna:temporada-2:';
const DEVICE_ID_KEY = 'forja-eterna:device-id';
function safeStorageSegment(value){ return String(value||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,120); }
function currentStoragePrefix(){
  if(developerMode) return 'forja-eterna:desarrollo-local:';
  const accountId=safeStorageSegment(accountSession?.user?.id);
  return accountId ? `${STORAGE_NAMESPACE}cuenta:${accountId}:` : `${STORAGE_NAMESPACE}sin-cuenta:`;
}
function namespacedStorageKey(key){ return `${currentStoragePrefix()}${key}`; }
function currentDeviceId(){
  let id=loadLocal(DEVICE_ID_KEY);
  if(!/^[a-zA-Z0-9_-]{8,120}$/.test(id||'')){
    id=typeof crypto?.randomUUID==='function' ? crypto.randomUUID() : `device-${Date.now()}-${Math.random().toString(36).slice(2,12)}`;
    saveLocal(DEVICE_ID_KEY,id);
  }
  return id;
}
function newMutationId(){
  return `${currentDeviceId()}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;
}
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
async function readLegacySeasonStored(key){
  const legacyKey=`${STORAGE_NAMESPACE}${key}`;
  try{
    const storage=getStorage();
    return storage ? (await storage.get(legacyKey)).value : loadLocal(legacyKey);
  }catch(_error){ return null; }
}
async function migrateLegacyStorageForRestoredAccount(accountId){
  const safeId=safeStorageSegment(accountId);
  if(!safeId) return false;
  const marker=`forja-eterna:account-scope-migrated:${safeId}`;
  if(loadLocal(marker)==='1' || await readStored('characters')) return false;
  const rawRoster=await readLegacySeasonStored('characters');
  if(!rawRoster) return false;
  let roster;
  try{ roster=JSON.parse(rawRoster); }catch(_error){ return false; }
  if(!Array.isArray(roster)) return false;
  const safeRoster=roster.filter(hero=>hero && /^[a-zA-Z0-9_-]{1,120}$/.test(String(hero.id||''))).slice(0,3);
  for(const hero of safeRoster){
    const saved=await readLegacySeasonStored(characterKey(hero.id));
    if(saved) await writeStored(characterKey(hero.id),saved);
    const run=await readLegacySeasonStored(runKey(hero.id));
    if(run) await writeStored(runKey(hero.id),run);
  }
  await saveRoster(safeRoster);
  saveLocal(marker,'1');
  return true;
}
function characterKey(id){ return `character-save:${id}`; }
function runKey(id){ return `run-save:${id}`; }
function characterSummary(character){
  const meta=character.syncMeta && typeof character.syncMeta==='object' ? character.syncMeta : {};
  return {
    id:character.id,
    name:String(character.name||'Héroe').slice(0,32),
    level:Math.max(1,Math.floor(Number(character.level)||1)),
    resets:Math.max(0,Math.floor(Number(character.resets)||0)),
    characterClass:CLASSES[character.characterClass] ? character.characterClass : 'warrior',
    syncMutation:String(meta.mutationId||''),
    syncVersion:Math.max(0,Math.floor(Number(meta.version)||0)),
    updatedAt:Math.max(0,Math.floor(Number(meta.modifiedAt)||Date.now()))
  };
}
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
/* Compatibilidad de lectura para convertir, una sola vez, expediciones del
   sistema anterior. Las nuevas Cacerías se guardan dentro del personaje. */
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
function isHuntProgressLocked(){
  if(window.CardHunt?.isProgressLocked) return !!window.CardHunt.isProgressLocked();
  const snapshot=typeof state!=='undefined' ? state?.cardHuntSnapshot : null;
  const run=snapshot?.run;
  return !!run
    && snapshot.ownerCharacterId===String(activeCharacterId||'')
    && ['active','won'].includes(run.status)
    && !['intro','lost','settled'].includes(run.screen);
}
async function migrateLegacyHuntSnapshot(id){
  const snapshot=await loadRunSnapshot(id);
  if(!snapshot) return null;
  const legacyRun=snapshot.run;
  if(!legacyRun || typeof legacyRun!=='object'){
    await clearRunSnapshot(id);
    return { migrated:false, invalid:true, reward:0 };
  }
  const sourceSavedAt=Math.max(0,Math.floor(finiteNumber(snapshot.savedAt,0)));
  const reward=legacyRun.runGoldClaimed ? 0 : Math.max(0,Math.min(1000000,Math.floor(finiteNumber(legacyRun.runGold,0))));
  const depth=Math.max(0,Math.floor(finiteNumber(legacyRun.maxDepth,0)),Math.floor(finiteNumber(legacyRun.depth,0)));
  const defeated=Math.max(0,Math.floor(finiteNumber(legacyRun.monstersDefeated,0)));
  const previousMigration=state.legacyHuntMigration;
  const alreadyMigrated=previousMigration?.migrated===true
    && previousMigration.sourceSavedAt===sourceSavedAt
    && previousMigration.depth===depth
    && previousMigration.defeated===defeated
    && previousMigration.reward===reward;
  if(alreadyMigrated){
    await clearRunSnapshot(id);
    return { ...previousMigration, alreadyMigrated:true };
  }
  if(reward>0) gainGold(reward);
  state.maxHuntDepth=Math.max(Math.floor(finiteNumber(state.maxHuntDepth,0)),depth);
  state.legacyHuntMigration={
    migrated:true,
    migratedAt:Date.now(),
    sourceSavedAt,
    depth,
    defeated,
    reward
  };
  addLog(`↻ Cacería anterior consolidada: profundidad ${depth}${reward ? ` · +${reward} oro asegurado` : ''}.`, reward ? 'level' : 'reset');
  await saveState();
  await clearRunSnapshot(id);
  return state.legacyHuntMigration;
}
let saveWriteQueue = Promise.resolve();
let saveRevision = 0;
let runCheckpointTimer = null;
// La copia local se escribe siempre al instante. La nube se agrupa unos
// segundos para no mandar una petición por cada punto asignado, pero nunca
// queda esperando los 12 minutos del respaldo periódico.
let cloudBackupTimer = null;
let cloudBackupListenersBound = false;
function scheduleRunCheckpoint(){
  if(runCheckpointTimer || !runState || !activeCharacterId) return;
  runCheckpointTimer = setTimeout(()=>{
    runCheckpointTimer = null;
    saveState();
  }, 320);
}
async function saveState(){
  if(!state || !activeCharacterId) return;
  const previousSync=state.syncMeta && typeof state.syncMeta==='object' ? state.syncMeta : {};
  state.syncMeta={
    version:Math.max(0,Math.floor(Number(previousSync.version)||0))+1,
    mutationId:newMutationId(),
    deviceId:currentDeviceId(),
    modifiedAt:Date.now()
  };
  const revision = ++saveRevision;
  const characterId = activeCharacterId;
  const snapshot = JSON.stringify(state);
  updateSaveIndicator('saving');
  saveWriteQueue = saveWriteQueue.catch(()=>{}).then(async()=>{
    try{
      const savedState = JSON.parse(snapshot);
      await writeStored(characterKey(characterId), snapshot);
      const roster = await loadRoster();
      const summary = characterSummary({ ...savedState, id:characterId });
      const index = roster.findIndex(character => character.id===characterId);
      if(index >= 0) roster[index] = summary; else roster.push(summary);
      await saveRoster(roster.slice(0,3));
      const syncControl=await loadCloudSyncControl();
      if(syncControl.tombstones[characterId]){
        delete syncControl.tombstones[characterId];
        await saveCloudSyncControl(syncControl);
      }
      if(revision === saveRevision){
        updateSaveIndicator('saved');
        setTimeout(()=>{ if(revision === saveRevision) updateSaveIndicator('idle'); }, 1800);
      }
      scheduleLeaderboardSync();
      scheduleCloudBackup();
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
const SESSION_HEARTBEAT_INTERVAL = 25 * 1000;
let accountSession = null;
let developerMode = false;
let sessionHeartbeatInterval = null;
let sessionTakenOver = false;
function isLocalDeveloperEnvironment(){
  const host=location.hostname;
  return location.protocol==='file:' || host==='localhost' || host==='127.0.0.1' || host==='[::1]';
}
let cloudSyncInterval = null;
let cloudSyncInFlight = null;
let cloudSyncReadyAccountId = null;
let gamePortalBooted = false;
let leaderboardEntries = [];
let leaderboardSyncTimer = null;
let leaderboardSyncInFlight = null;
const LEADERBOARD_CLASSES = {
  warrior:{label:'Guerrero',icon:'⚔',image:'assets/images/clase guerrero sprite v2.webp',color:'#e6a85e'}, archer:{label:'Arquero',icon:'🏹',image:'assets/images/clase arquero sprite v2.webp',color:'#75cf83'}, mage:{label:'Mago',icon:'✦',image:'assets/images/clase mago sprite v2.webp',color:'#8baeff'}, priest:{label:'Sacerdote',icon:'✚',image:'assets/images/clase sacerdote sprite v2.webp',color:'#f4d784'}, assassin:{label:'Asesino',icon:'🗡',image:'assets/images/clase asesino sprite v2.webp',color:'#dc7dca'}, tamer:{label:'Domador',icon:'🪢',image:'assets/images/clase domador sprite v2.webp',color:'#58d2a1'}
};
/* ================= CUENTA, NUBE (SUPABASE) Y RANKING ================= */
function leaderboardClassInfo(key){ const classKey=LEADERBOARD_CLASSES[key] ? key : 'warrior'; return { key:classKey, ...(LEADERBOARD_CLASSES[classKey] || {label:'Aventurero',icon:'✦',image:'assets/images/clase guerrero sprite v2.webp'}) }; }
function leaderboardProfile(){ return { class_key:state.characterClass || 'warrior', attack:Math.round(atkDamage()), defense:Math.round(totalDefense()), crit_chance:Math.round(critChance()) }; }
function scheduleLeaderboardSync(){
  if(developerMode) return;
  clearTimeout(leaderboardSyncTimer);
  leaderboardSyncTimer = setTimeout(()=>{ leaderboardSyncTimer = null; syncLeaderboard(); }, 1400);
}

function scheduleCloudBackup(delay=6500){
  if(developerMode || !accountSession || !navigator.onLine) return;
  clearTimeout(cloudBackupTimer);
  cloudBackupTimer = setTimeout(()=>{
    cloudBackupTimer = null;
    pushCloudProgress(true);
  }, Math.max(0, Number(delay)||0));
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
  if(accountSession) await migrateLegacyStorageForRestoredAccount(accountSession.user.id);
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
  else if(status==='upgrade'){ el.className='save-indicator error'; el.textContent='Nube pendiente · actualizar seguridad'; }
  else if(status==='offline'){ el.className='save-indicator error'; el.textContent='Guardado local · nube pendiente'; }
}
const CLOUD_PAYLOAD_VERSION=3;
const CLOUD_MAX_RESPONSE_BYTES=2*1024*1024;
const CLOUD_SYNC_CONTROL_KEY='cloud-sync-control';
function emptyCloudSyncControl(accountId=accountSession?.user?.id){
  return {version:1,accountId:String(accountId||''),remoteRevision:0,baseMutations:{},tombstones:{},conflicts:[]};
}
function cleanMutationMap(value){
  const clean={};
  if(!value || typeof value!=='object' || Array.isArray(value)) return clean;
  Object.entries(value).slice(0,100).forEach(([id,token])=>{
    if(/^[a-zA-Z0-9_-]{1,120}$/.test(id) && typeof token==='string') clean[id]=token.slice(0,180);
  });
  return clean;
}
function cleanTombstones(value){
  const clean={};
  if(!value || typeof value!=='object' || Array.isArray(value)) return clean;
  Object.entries(value).slice(0,100).forEach(([id,record])=>{
    if(!/^[a-zA-Z0-9_-]{1,120}$/.test(id) || !record || typeof record!=='object') return;
    const mutationId=String(record.mutationId||'').slice(0,180);
    if(!mutationId) return;
    clean[id]={mutationId,modifiedAt:Math.max(0,Math.floor(Number(record.modifiedAt)||0)),deviceId:String(record.deviceId||'').slice(0,120)};
  });
  return clean;
}
function cleanConflicts(value){
  if(!Array.isArray(value)) return [];
  return value.filter(record=>record && typeof record==='object' && record.snapshot && typeof record.snapshot==='object')
    .slice(-3).map(record=>({
      id:String(record.id||'').slice(0,120),mutationId:String(record.mutationId||'').slice(0,180),
      capturedAt:Math.max(0,Math.floor(Number(record.capturedAt)||0)),sourceDevice:String(record.sourceDevice||'').slice(0,120),
      reason:String(record.reason||'concurrent-update').slice(0,80),snapshot:record.snapshot
    }));
}
async function loadCloudSyncControl(){
  const accountId=String(accountSession?.user?.id||'');
  try{
    const raw=await readStored(CLOUD_SYNC_CONTROL_KEY), parsed=raw ? JSON.parse(raw) : null;
    if(!parsed || parsed.accountId!==accountId) return emptyCloudSyncControl(accountId);
    return {version:1,accountId,remoteRevision:Math.max(0,Math.floor(Number(parsed.remoteRevision)||0)),baseMutations:cleanMutationMap(parsed.baseMutations),tombstones:cleanTombstones(parsed.tombstones),conflicts:cleanConflicts(parsed.conflicts)};
  }catch(_error){ return emptyCloudSyncControl(accountId); }
}
async function saveCloudSyncControl(control){
  const safe={...emptyCloudSyncControl(),...control,accountId:String(accountSession?.user?.id||''),remoteRevision:Math.max(0,Math.floor(Number(control?.remoteRevision)||0)),baseMutations:cleanMutationMap(control?.baseMutations),tombstones:cleanTombstones(control?.tombstones),conflicts:cleanConflicts(control?.conflicts)};
  await writeStored(CLOUD_SYNC_CONTROL_KEY,JSON.stringify(safe));
  return safe;
}
async function markCloudTombstone(characterId){
  const id=String(characterId||'');
  if(!/^[a-zA-Z0-9_-]{1,120}$/.test(id)) return false;
  await saveWriteQueue.catch(()=>{});
  const control=await loadCloudSyncControl();
  control.tombstones[id]={mutationId:newMutationId(),modifiedAt:Date.now(),deviceId:currentDeviceId()};
  await saveCloudSyncControl(control);
  return true;
}
function cloneCloudValue(value){ return JSON.parse(JSON.stringify(value)); }
function safeCloudHero(hero,saved,fallbackTime=0){
  const id=String(hero?.id||'');
  if(!/^[a-zA-Z0-9_-]{1,120}$/.test(id) || !saved || typeof saved!=='object' || Array.isArray(saved)) return null;
  const meta=saved.syncMeta && typeof saved.syncMeta==='object' ? saved.syncMeta : {};
  const modifiedAt=Math.max(0,Math.floor(Number(meta.modifiedAt)||Number(hero.updatedAt)||fallbackTime||0));
  const mutationId=String(meta.mutationId||hero.syncMutation||`legacy-${id}-${modifiedAt}`).slice(0,180);
  const character=cloneCloudValue(saved);
  character.name=String(character.name||hero.name||'Héroe').slice(0,32);
  character.characterClass=CLASSES[character.characterClass] ? character.characterClass : 'warrior';
  character.syncMeta={version:Math.max(0,Math.floor(Number(meta.version)||Number(hero.syncVersion)||0)),mutationId,deviceId:String(meta.deviceId||'legacy').slice(0,120),modifiedAt};
  const summary=characterSummary({...character,id});
  return {summary,character};
}
function sanitizeCloudPayload(raw,ownerId){
  if(!raw || typeof raw!=='object' || Array.isArray(raw)) return null;
  const version=Math.floor(Number(raw.version)||0);
  if(![2,CLOUD_PAYLOAD_VERSION].includes(version) || raw.season!=='temporada-2' || !Array.isArray(raw.roster)) throw new Error('Formato de guardado remoto inválido.');
  if(version===CLOUD_PAYLOAD_VERSION && raw.ownerId!==ownerId) throw new Error('El guardado remoto pertenece a otra cuenta.');
  const sourceCharacters=raw.characters && typeof raw.characters==='object' && !Array.isArray(raw.characters) ? raw.characters : {};
  const roster=[], characters={}, seen=new Set();
  for(const candidate of raw.roster.slice(0,12)){
    const id=String(candidate?.id||'');
    if(seen.has(id)) continue;
    const safe=safeCloudHero(candidate,sourceCharacters[id],Number(raw.savedAt)||0);
    if(!safe) continue;
    seen.add(id); roster.push(safe.summary); characters[id]=safe.character;
  }
  roster.sort((a,b)=>b.updatedAt-a.updatedAt);
  const limitedRoster=roster.slice(0,3), limitedCharacters=Object.fromEntries(limitedRoster.map(hero=>[hero.id,characters[hero.id]]));
  return {version:CLOUD_PAYLOAD_VERSION,season:'temporada-2',ownerId,roster:limitedRoster,characters:limitedCharacters,tombstones:version===CLOUD_PAYLOAD_VERSION?cleanTombstones(raw.tombstones):{},conflicts:version===CLOUD_PAYLOAD_VERSION?cleanConflicts(raw.conflicts):[],savedAt:Math.max(0,Math.floor(Number(raw.savedAt)||0)),deviceId:String(raw.deviceId||'legacy').slice(0,120),legacyRuns:version===2&&raw.runs&&typeof raw.runs==='object'?raw.runs:{}};
}
async function buildCloudPayload(){
  await saveWriteQueue.catch(()=>{});
  const roster=await loadRoster(), characters={}, safeRoster=[];
  for(const hero of roster.slice(0,3)){
    const safe=safeCloudHero(hero,await loadState(hero.id),Date.now());
    if(!safe) continue;
    safeRoster.push(safe.summary); characters[hero.id]=safe.character;
  }
  const control=await loadCloudSyncControl();
  return {version:CLOUD_PAYLOAD_VERSION,season:'temporada-2',ownerId:String(accountSession?.user?.id||''),roster:safeRoster,characters,tombstones:control.tombstones,conflicts:control.conflicts,savedAt:Date.now(),deviceId:currentDeviceId()};
}
function payloadRecords(payload){
  const records=new Map();
  if(!payload) return records;
  for(const hero of payload.roster||[]){
    const saved=payload.characters?.[hero.id];
    if(saved) records.set(hero.id,{kind:'character',token:String(hero.syncMutation||''),modifiedAt:Number(hero.updatedAt)||0,hero,saved});
  }
  Object.entries(payload.tombstones||{}).forEach(([id,tombstone])=>{
    const current=records.get(id);
    if(!current || Number(tombstone.modifiedAt)>=current.modifiedAt) records.set(id,{kind:'tombstone',token:String(tombstone.mutationId||''),modifiedAt:Number(tombstone.modifiedAt)||0,tombstone});
  });
  return records;
}
function payloadMutationMap(payload){ const map={}; payloadRecords(payload).forEach((record,id)=>{if(record.token)map[id]=record.token;}); return map; }
function rememberCloudConflict(conflicts,id,loser,reason){
  if(!loser || loser.kind!=='character' || conflicts.some(record=>record.id===id&&record.mutationId===loser.token)) return;
  conflicts.push({id,mutationId:loser.token,capturedAt:Date.now(),sourceDevice:String(loser.saved?.syncMeta?.deviceId||''),reason,snapshot:cloneCloudValue(loser.saved)});
}
function mergeCloudPayloads(local,remote,baseMutations={}){
  const localRecords=payloadRecords(local), remoteRecords=payloadRecords(remote), ids=new Set([...localRecords.keys(),...remoteRecords.keys()]);
  const chosen=[], conflicts=cleanConflicts([...(remote?.conflicts||[]),...(local?.conflicts||[])]);
  ids.forEach(id=>{
    const left=localRecords.get(id), right=remoteRecords.get(id); let winner;
    if(!left) winner=right;
    else if(!right) winner=left;
    else if(left.token===right.token) winner=left.modifiedAt>=right.modifiedAt?left:right;
    else {
      const base=String(baseMutations[id]||''), leftChanged=left.token!==base, rightChanged=right.token!==base;
      if(leftChanged&&!rightChanged) winner=left;
      else if(rightChanged&&!leftChanged) winner=right;
      else {
        winner=id===activeCharacterId&&state ? left : (left.modifiedAt>=right.modifiedAt?left:right);
        rememberCloudConflict(conflicts,id,winner===left?right:left,'concurrent-update');
      }
    }
    if(winner) chosen.push([id,winner]);
  });
  const active=chosen.filter(([,record])=>record.kind==='character').sort((a,b)=>b[1].modifiedAt-a[1].modifiedAt);
  active.slice(3).forEach(([id,record])=>rememberCloudConflict(conflicts,id,record,'roster-capacity'));
  const roster=[], characters={};
  active.slice(0,3).forEach(([id,record])=>{roster.push(cloneCloudValue(record.hero));characters[id]=cloneCloudValue(record.saved);});
  const activeIds=new Set(roster.map(hero=>hero.id)), tombstones={};
  chosen.forEach(([id,record])=>{if(record.kind==='tombstone'&&!activeIds.has(id))tombstones[id]=cloneCloudValue(record.tombstone);});
  return {version:CLOUD_PAYLOAD_VERSION,season:'temporada-2',ownerId:String(accountSession?.user?.id||''),roster,characters,tombstones:cleanTombstones(tombstones),conflicts:cleanConflicts(conflicts),savedAt:Date.now(),deviceId:currentDeviceId(),legacyRuns:{...(remote?.legacyRuns||{}),...(local?.legacyRuns||{})}};
}
async function applyCloudPayload(payload){
  if(!payload) return;
  const previous=await loadRoster(), nextIds=new Set(payload.roster.map(hero=>hero.id));
  for(const hero of previous){if(!nextIds.has(hero.id)){await removeStored(characterKey(hero.id));await clearRunSnapshot(hero.id);}}
  for(const hero of payload.roster){
    const saved=payload.characters[hero.id]; if(saved) await writeStored(characterKey(hero.id),JSON.stringify(saved));
    const legacyRun=payload.legacyRuns?.[hero.id]; if(legacyRun) await writeStored(runKey(hero.id),JSON.stringify(legacyRun));
  }
  await saveRoster(payload.roster.slice(0,3));
}
function assertSameCloudAccount(userId){if(!accountSession||accountSession.user?.id!==userId)throw new Error('La cuenta cambió durante la sincronización.');}
async function readCloudRecord(){
  if(!await ensureRegisteredAccount()) throw new Error('Cuenta no disponible.');
  const userId=accountSession.user.id, token=accountSession.access_token;
  const response=await fetch(`${SUPABASE_URL}/rest/v1/player_saves?select=payload,revision,updated_at&player_id=eq.${encodeURIComponent(userId)}&limit=1`,{headers:supabaseHeaders(token),cache:'no-store'});
  assertSameCloudAccount(userId);
  if(!response.ok) throw new Error(`Nube ${response.status}`);
  const text=await response.text();
  if(text.length>CLOUD_MAX_RESPONSE_BYTES) throw new Error('El guardado remoto supera el límite seguro.');
  const rows=JSON.parse(text||'[]'), row=rows?.[0];
  return {revision:Math.max(0,Math.floor(Number(row?.revision)||0)),payload:row?.payload?sanitizeCloudPayload(row.payload,userId):null};
}
async function pullCloudProgress(){
  if(!navigator.onLine||!await ensureRegisteredAccount()) return false;
  const userId=accountSession.user.id, record=await readCloudRecord(), local=await buildCloudPayload(), control=await loadCloudSyncControl();
  const merged=mergeCloudPayloads(local,record.payload,control.baseMutations);
  await applyCloudPayload(merged);
  control.remoteRevision=record.revision;
  control.baseMutations=payloadMutationMap(record.payload);
  control.tombstones=merged.tombstones;
  control.conflicts=merged.conflicts;
  await saveCloudSyncControl(control);
  cloudSyncReadyAccountId=userId;
  return true;
}
async function pushCloudProgress(silent=false){
  if(sessionTakenOver) return false;
  if(!await ensureRegisteredAccount()||!navigator.onLine){if(!silent)updateCloudIndicator('offline');return false;}
  if(cloudSyncInFlight) return cloudSyncInFlight;
  cloudSyncInFlight=(async()=>{
    const userId=accountSession.user.id;
    if(!silent) updateCloudIndicator('syncing');
    if(cloudSyncReadyAccountId!==userId&&!(await pullCloudProgress())) throw new Error('No se pudo verificar la copia remota.');
    for(let attempt=0;attempt<3;attempt++){
      const record=await readCloudRecord(), local=await buildCloudPayload(), control=await loadCloudSyncControl();
      const merged=mergeCloudPayloads(local,record.payload,control.baseMutations), serialized=JSON.stringify(merged);
      if(serialized.length>CLOUD_MAX_RESPONSE_BYTES) throw new Error('El guardado local supera el límite seguro de nube.');
      const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/sync_player_save`,{method:'POST',headers:supabaseHeaders(accountSession.access_token),body:JSON.stringify({expected_revision:record.revision,next_payload:merged,device_id:currentDeviceId()})});
      assertSameCloudAccount(userId);
      const text=await response.text();
      if(text.length>CLOUD_MAX_RESPONSE_BYTES) throw new Error('La respuesta de nube supera el límite seguro.');
      if(!response.ok){const error=new Error(`Nube segura no disponible (${response.status})`);error.requiresCloudUpgrade=response.status===404||response.status===400;throw error;}
      const result=JSON.parse(text||'{}');
      if(!result.applied) continue;
      await applyCloudPayload(merged);
      control.remoteRevision=Math.max(0,Math.floor(Number(result.revision)||record.revision+1));
      control.baseMutations=payloadMutationMap(merged);control.tombstones=merged.tombstones;control.conflicts=merged.conflicts;
      await saveCloudSyncControl(control);cloudSyncReadyAccountId=userId;
      if(!silent) updateCloudIndicator('synced');
      return true;
    }
    throw new Error('Otro dispositivo modificó la partida repetidamente. Se reintentará.');
  })();
  try{return await cloudSyncInFlight;}catch(error){console.warn('Cloud sync failed',error);if(!silent)updateCloudIndicator(error.requiresCloudUpgrade?'upgrade':'offline');return false;}finally{cloudSyncInFlight=null;}
}
function startCloudBackup(){
  clearInterval(cloudSyncInterval);
  cloudSyncInterval=setInterval(()=>pushCloudProgress(),CLOUD_SYNC_INTERVAL);
  if(cloudBackupListenersBound) return;
  cloudBackupListenersBound = true;
  window.addEventListener('online',()=>pushCloudProgress());
  document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='hidden') pushCloudProgress(true); });
  // pagehide cubre móvil y cierre de pestaña mejor que beforeunload. El
  // guardado local ya ocurrió; esta llamada intenta enviar el último estado.
  window.addEventListener('pagehide',()=>pushCloudProgress(true));
}

/* ================= SESIÓN ÚNICA POR CUENTA =================
   Evita que la misma cuenta juegue en dos navegadores/dispositivos a la
   vez. Requiere supabase-sesion-unica.sql; si esas funciones no existen
   todavía en el proyecto de Supabase (404), el juego sigue funcionando
   igual que antes (fallback silencioso) para no romper cuentas ya en uso. */
async function callSessionRpc(name,body){
  const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`,{method:'POST',headers:supabaseHeaders(accountSession.access_token),body:JSON.stringify(body)});
  if(response.status===404) return {unavailable:true};
  if(!response.ok) throw new Error(`Sesión ${response.status}`);
  return JSON.parse(await response.text()||'{}');
}
async function claimPlayerSession(force){
  return callSessionRpc('claim_player_session',{device_id:currentDeviceId(),force:!!force});
}
async function releasePlayerSession(){
  if(!accountSession) return;
  try{ await callSessionRpc('release_player_session',{device_id:currentDeviceId()}); }catch(_error){ /* best effort */ }
}
function showSessionTakenOverOverlay(){
  if(document.getElementById('sessionTakenOverOverlay')) return;
  clearInterval(sessionHeartbeatInterval); clearInterval(cloudSyncInterval);
  const overlay=document.createElement('div');
  overlay.id='sessionTakenOverOverlay';
  overlay.style.cssText='position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(9,7,5,.92);backdrop-filter:blur(3px);';
  overlay.innerHTML=`
    <div style="max-width:420px;text-align:center;padding:28px 26px;border:1px solid var(--gold,#c89b3c);border-radius:10px;background:linear-gradient(180deg,#1c1610,#120f0c);box-shadow:0 20px 50px rgba(0,0,0,.6);">
      <div style="font-family:'Cinzel',serif;font-size:13px;letter-spacing:2px;color:var(--gold-bright,#e8c477);text-transform:uppercase;margin-bottom:10px;">Sesión abierta en otro lugar</div>
      <p style="color:var(--parchment,#e9dfc9);font-size:14px;line-height:1.5;margin-bottom:20px;">Esta cuenta se abrió en otro navegador o dispositivo, así que esta pestaña dejó de guardar progreso para no pisar el tuyo.</p>
      <button id="sessionTakenOverReload" style="padding:12px 22px;border:0;border-radius:6px;background:linear-gradient(#f1c65b,#b8751d);color:#1d1209;font:800 12px 'Cinzel',serif;letter-spacing:1px;text-transform:uppercase;cursor:pointer;">Recargar</button>
    </div>`;
  document.body.appendChild(overlay);
  document.getElementById('sessionTakenOverReload').addEventListener('click',()=>location.reload());
}
function startSessionHeartbeat(){
  clearInterval(sessionHeartbeatInterval);
  if(developerMode || !accountSession) return;
  sessionHeartbeatInterval=setInterval(async()=>{
    if(sessionTakenOver || !accountSession || !navigator.onLine) return;
    try{
      const result=await callSessionRpc('heartbeat_player_session',{device_id:currentDeviceId()});
      if(result.unavailable) return; // SQL de sesión única no instalado: no bloquear el juego.
      if(result.active===false){ sessionTakenOver=true; showSessionTakenOverOverlay(); }
    }catch(_error){ /* fallo de red puntual: se reintenta en el próximo latido */ }
  },SESSION_HEARTBEAT_INTERVAL);
}
/* Se llama una sola vez, justo después de autenticarse y antes de entrar
   al juego. Devuelve false si el jugador prefiere cancelar en vez de
   cerrar la sesión activa en el otro dispositivo. */
async function ensureSingleSession(){
  if(developerMode || !accountSession) return true;
  try{
    let result=await claimPlayerSession(false);
    if(result.unavailable) return true; // SQL no instalado todavía: no bloquear.
    if(!result.claimed){
      const minutesAgo=Math.max(0,Math.round((Date.now()-new Date(result.last_seen).getTime())/60000));
      const when=minutesAgo<=0?'hace instantes':`hace ${minutesAgo} min`;
      const proceed=confirm(`Esta cuenta ya está jugando en otro dispositivo (actividad ${when}).\n\n¿Cerrar esa sesión y continuar en este navegador?`);
      if(!proceed) return false;
      result=await claimPlayerSession(true);
      if(result.unavailable||result.claimed) return true;
      alert('No se pudo tomar el control de la sesión. Probá de nuevo en unos segundos.');
      return false;
    }
    return true;
  }catch(_error){ return true; } // fallo de red: no bloquear el acceso por esto.
}

async function enterAuthenticatedWorld(){
  sessionTakenOver=false;
  if(!await ensureSingleSession()){
    accountSession=null; persistSupabaseSession(null);
    const status=document.getElementById('accountStatus');
    if(status){status.className='account-status';status.textContent='Iniciá sesión cuando la otra pestaña se haya cerrado.';}
    return false;
  }
  updateAccountChip();
  const stylesReady=window.FeatureLoader?.loadGameStyles?.();
  const gameplayReady=window.FeatureLoader?.loadGameplayScripts?.();
  let cloudVerified=false;
  try{ cloudVerified=await pullCloudProgress(); }
  catch(error){ console.warn('Cloud restore unavailable',error); updateCloudIndicator('offline'); }
  try{ await Promise.all([stylesReady,gameplayReady]); }
  catch(error){
    console.error('Game resources unavailable',error);
    const status=document.getElementById('accountStatus');
    if(status){status.className='account-status error';status.textContent='No se pudieron cargar los recursos del juego. Revisá tu conexión e intentá nuevamente.';}
    return false;
  }
  document.getElementById('accountGate').hidden=true; document.body.classList.remove('account-locked');
  await launchGamePortal();
  startCloudBackup();
  startSessionHeartbeat();
  if(cloudVerified) pushCloudProgress(true);
  return true;
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
    await window.FeatureLoader?.loadCardHunt?.();
    const restored=window.CardHunt?.restoreResources?.();
    showFeedback(restored?'RECURSOS RESTAURADOS':'SIN CACERÍA ACTIVA', restored?'Vida y maná al máximo':'Comenzá una expedición para restaurar sus recursos.', restored?'heal':'reward');
  }else if(action==='altar'){
    await window.FeatureLoader?.loadCardHunt?.();
    const opened=window.CardHunt?.previewEvolution?.();
    showFeedback(opened?'ALTAR DE PRUEBA ABIERTO':'SIN EVOLUCIONES DISPONIBLES',opened?'Elegí una carta y revisá sus dos caminos.':'La clase elegida todavía no tiene cartas evolucionables.',opened?'reward':'danger');
    if(opened){ updateDeveloperPanel(); return; }
  }
  await saveState(); render(); updateDeveloperPanel();
}
async function enterDeveloperWorld(){
  if(!isLocalDeveloperEnvironment()) return;
  developerMode=true;
  accountSession=null;
  try{
    await Promise.all([
      window.FeatureLoader?.loadGameStyles?.(),
      window.FeatureLoader?.loadGameplayScripts?.()
    ]);
  }catch(error){console.error('Game resources unavailable',error);return;}
  document.getElementById('accountGate').hidden=true;
  document.body.classList.remove('account-locked');
  document.body.classList.add('developer-local');
  const developerPanel=document.getElementById('developerPanel');
  developerPanel.hidden=false;
  developerPanel.classList.add('minimized');
  const panelToggle=document.getElementById('developerPanelToggle');
  if(panelToggle){
    panelToggle.textContent='+';
    panelToggle.setAttribute('aria-label','Abrir panel del creador');
    panelToggle.setAttribute('aria-expanded','false');
  }
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
  const developerPanel=document.getElementById('developerPanel');
  if(isLocalDeveloperEnvironment()){
    developerEntry.hidden=false;
    developerEntry.addEventListener('click',enterDeveloperWorld);
  }else{
    // En una versión publicada las herramientas locales no permanecen en el DOM.
    developerEntry?.remove();
    developerPanel?.remove();
  }
  document.getElementById('developerPanelToggle')?.addEventListener('click',event=>{
    const panel=document.getElementById('developerPanel');
    if(!panel) return;
    const minimized=panel.classList.toggle('minimized');
    event.currentTarget.textContent=minimized?'+':'−';
    event.currentTarget.setAttribute('aria-label',minimized?'Abrir panel del creador':'Minimizar panel del creador');
    event.currentTarget.setAttribute('aria-expanded',String(!minimized));
  });
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
  document.getElementById('accountLogoutBtn').addEventListener('click',async()=>{ if(!confirm('¿Cerrar sesión? Tu progreso local no se borrará.'))return;await pushCloudProgress(true);await releasePlayerSession();try{await fetch(`${SUPABASE_URL}/auth/v1/logout`,{method:'POST',headers:supabaseHeaders(accountSession?.access_token)});}catch(_error){}accountSession=null;persistSupabaseSession(null);location.reload(); });
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
/* ================= RENDERIZADO DEL RANKING ================= */
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
    return `<button class="lb-row${topClass} ${e.name===state.name?'me':''}" type="button" data-leaderboard-index="${i}" aria-label="Ver perfil de ${escapeHtml(e.name)}"><span class="rank">${i<3 ? ['♛','♜','♞'][i] : e.rank}</span><span class="lb-crest">${leaderboardCrest(hero)}</span><span class="lb-player"><strong>${escapeHtml(e.name)}</strong><small><b>${hero.label}</b> · Nv. ${Number(e.level)||1} · ${Number(e.resets)||0} reset${Number(e.resets)===1?'':'s'}</small></span><span class="lb-power"><b>⚡ ${Number(e.power||0).toLocaleString('es-AR')}</b><span class="lb-view">FICHA ›</span></span></button>`;
  }).join('');
  box.querySelectorAll('[data-leaderboard-index]').forEach(button=>button.addEventListener('click',()=>openLeaderboardProfile(Number(button.dataset.leaderboardIndex))));
}
function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
