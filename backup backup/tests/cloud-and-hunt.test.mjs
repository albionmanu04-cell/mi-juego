import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root=dirname(dirname(fileURLToPath(import.meta.url)));
const stateSource=readFileSync(join(root,'js','script-state.js'),'utf8');

function json(value){ return JSON.parse(JSON.stringify(value)); }

function response(status,body){
  return {
    ok:status>=200&&status<300,
    status,
    async text(){ return typeof body==='string' ? body : JSON.stringify(body); },
    async json(){ return typeof body==='string' ? JSON.parse(body) : body; }
  };
}

function createRuntime(fetchImpl=async()=>response(200,[])){
  const values=new Map();
  const localStorage={
    get length(){ return values.size; },
    key(index){ return [...values.keys()][index]??null; },
    getItem(key){ return values.has(key)?values.get(key):null; },
    setItem(key,value){ values.set(String(key),String(value)); },
    removeItem(key){ values.delete(String(key)); }
  };
  const context={
    console:{log(){},warn(){},error(){}},
    localStorage,
    navigator:{onLine:true},
    location:{hostname:'localhost',protocol:'http:'},
    crypto:{randomUUID:()=> 'device-test-0001'},
    fetch:fetchImpl,
    setTimeout:()=>1,
    clearTimeout(){},
    setInterval:()=>1,
    clearInterval(){},
    confirm:()=>true,
    CLASSES:{warrior:{},archer:{},mage:{},priest:{},assassin:{},tamer:{}},
    activeCharacterId:null,
    state:null,
    runState:null,
    window:{addEventListener(){}},
    document:{
      visibilityState:'visible',
      addEventListener(){},
      getElementById(){ return null; },
      createElement(){ return {classList:{add(){},remove(){}},remove(){}}; },
      body:{appendChild(){},classList:{add(){},remove(){}}}
    },
    Sound:{reward(){}},
    URLSearchParams
  };
  context.window.window=context.window;
  context.window.localStorage=localStorage;
  vm.createContext(context);
  vm.runInContext(stateSource,context,{filename:'js/script-state.js'});
  return {context,values,run:code=>vm.runInContext(code,context)};
}

function cloudHero(id,mutationId,modifiedAt,name=`Héroe ${id}`){
  const saved={
    id,name,characterClass:'warrior',level:3,resets:0,
    syncMeta:{version:1,mutationId,deviceId:'device-source',modifiedAt}
  };
  return {
    summary:{id,name,characterClass:'warrior',level:3,resets:0,syncMutation:mutationId,syncVersion:1,updatedAt:modifiedAt},
    saved
  };
}

function payload(ownerId,heroes=[],tombstones={}){
  return {
    version:3,season:'temporada-2',ownerId,
    roster:heroes.map(hero=>hero.summary),
    characters:Object.fromEntries(heroes.map(hero=>[hero.summary.id,hero.saved])),
    tombstones,conflicts:[],savedAt:1,deviceId:'device-source'
  };
}

test('el guardado local queda aislado por cuenta',()=>{
  const runtime=createRuntime();
  runtime.run("accountSession={user:{id:'cuenta-a'}}; developerMode=false;");
  const keyA=runtime.run("namespacedStorageKey('characters')");
  runtime.run("accountSession={user:{id:'cuenta-b'}};");
  const keyB=runtime.run("namespacedStorageKey('characters')");
  assert.notEqual(keyA,keyB);
  assert.match(keyA,/cuenta:cuenta-a:characters$/);
  assert.match(keyB,/cuenta:cuenta-b:characters$/);
});

test('la combinación conserva cambios distintos de dos dispositivos',()=>{
  const runtime=createRuntime();
  runtime.run("accountSession={user:{id:'cuenta-a'}};");
  const local=payload('cuenta-a',[cloudHero('hero-a','mut-a',100)]);
  const remote=payload('cuenta-a',[cloudHero('hero-b','mut-b',110)]);
  runtime.context.localPayload=local;
  runtime.context.remotePayload=remote;
  const merged=json(runtime.run('mergeCloudPayloads(localPayload,remotePayload,{})'));
  assert.deepEqual(merged.roster.map(hero=>hero.id).sort(),['hero-a','hero-b']);
});

test('un conflicto conserva el cambio ganador y una copia recuperable',()=>{
  const runtime=createRuntime();
  runtime.run("accountSession={user:{id:'cuenta-a'}};");
  const local=payload('cuenta-a',[cloudHero('hero-a','mut-local',200,'Local')]);
  const remote=payload('cuenta-a',[cloudHero('hero-a','mut-remote',100,'Remoto')]);
  runtime.context.localPayload=local;
  runtime.context.remotePayload=remote;
  const merged=json(runtime.run("mergeCloudPayloads(localPayload,remotePayload,{'hero-a':'mut-base'})"));
  assert.equal(merged.characters['hero-a'].name,'Local');
  assert.equal(merged.conflicts.length,1);
  assert.equal(merged.conflicts[0].snapshot.name,'Remoto');
});

test('los borrados sincronizados no resucitan personajes antiguos',()=>{
  const runtime=createRuntime();
  runtime.run("accountSession={user:{id:'cuenta-a'}};");
  const local=payload('cuenta-a',[],{'hero-a':{mutationId:'delete-a',modifiedAt:300,deviceId:'device-local'}});
  const remote=payload('cuenta-a',[cloudHero('hero-a','old-a',100)]);
  runtime.context.localPayload=local;
  runtime.context.remotePayload=remote;
  const merged=json(runtime.run("mergeCloudPayloads(localPayload,remotePayload,{'hero-a':'old-a'})"));
  assert.equal(merged.roster.length,0);
  assert.equal(merged.tombstones['hero-a'].mutationId,'delete-a');
});

test('la sincronización lee la revisión remota antes de escribir',async()=>{
  const calls=[];
  const runtime=createRuntime(async(url,options={})=>{
    calls.push({url,method:options.method||'GET',body:options.body});
    if(url.includes('/rpc/sync_player_save')) return response(200,{applied:true,revision:1});
    return response(200,[]);
  });
  runtime.run(`accountSession={
    user:{id:'cuenta-a',email:'hero@example.com',is_anonymous:false},
    access_token:'token',expires_at:${Math.floor(Date.now()/1000)+3600}
  };`);
  assert.equal(await runtime.run('pushCloudProgress(true)'),true);
  const rpcIndex=calls.findIndex(call=>call.url.includes('/rpc/sync_player_save'));
  assert.ok(rpcIndex>0);
  assert.ok(calls.slice(0,rpcIndex).some(call=>call.url.includes('/player_saves?select=')));
  const rpcBody=JSON.parse(calls[rpcIndex].body);
  assert.equal(rpcBody.expected_revision,0);
  assert.equal(rpcBody.next_payload.ownerId,'cuenta-a');
});

test('si no puede comprobar la nube, no intenta sobrescribirla',async()=>{
  const calls=[];
  const runtime=createRuntime(async(url)=>{
    calls.push(url);
    return response(503,{message:'offline'});
  });
  runtime.run(`accountSession={
    user:{id:'cuenta-a',email:'hero@example.com',is_anonymous:false},
    access_token:'token',expires_at:${Math.floor(Date.now()/1000)+3600}
  };`);
  assert.equal(await runtime.run('pushCloudProgress(true)'),false);
  assert.equal(calls.some(url=>url.includes('/rpc/sync_player_save')),false);
});

test('una Cacería activa bloquea cambios peligrosos del personaje',()=>{
  const runtime=createRuntime();
  runtime.context.activeCharacterId='hero-a';
  runtime.context.state={cardHuntSnapshot:{ownerCharacterId:'hero-a',run:{status:'active',screen:'map'}}};
  assert.equal(runtime.run('isHuntProgressLocked()'),true);
  runtime.context.state.cardHuntSnapshot.run.screen='settled';
  assert.equal(runtime.run('isHuntProgressLocked()'),false);
  runtime.context.state.cardHuntSnapshot.ownerCharacterId='hero-b';
  runtime.context.state.cardHuntSnapshot.run.screen='map';
  assert.equal(runtime.run('isHuntProgressLocked()'),false);
});
