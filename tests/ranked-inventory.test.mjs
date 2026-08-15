import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const root=dirname(dirname(fileURLToPath(import.meta.url)));
const sandbox={Date,Math};
vm.runInNewContext(readFileSync(join(root,'js','ranked-inventory-core.js'),'utf8'),sandbox);
const Core=sandbox.RankedInventoryCore;

test('la mochila Ranked es una cuadrícula de 4 por 4',()=>{
  assert.equal(Core.WIDTH,4);
  assert.equal(Core.HEIGHT,4);
  assert.equal(Core.SECURE_SLOTS,2);
  assert.equal(Core.createDefault().secure.length,2);
  assert.equal(Core.createDefault().loadout.weapon.templateId,'handmade_dagger');
});

test('el equipamiento acepta únicamente arma, armadura y reliquia en su ranura',()=>{
  const clean=Core.normalize({
    backpack:[],secure:[],stash:[],
    loadout:{weapon:Core.makeItem('alpha_armor'),armor:Core.makeItem('alpha_armor'),relic:Core.makeItem('matriarch_charm')}
  });
  assert.equal(clean.loadout.weapon,null);
  assert.equal(clean.loadout.armor.templateId,'alpha_armor');
  assert.equal(clean.loadout.relic.templateId,'matriarch_charm');
  assert.equal(Core.equipmentSlot('venom_blades'),'weapon');
});

test('las estadísticas Ranked salen solamente de las tres ranuras equipadas',()=>{
  const data=Core.createDefault();
  data.loadout={weapon:Core.makeItem('venom_blades'),armor:Core.makeItem('alpha_armor'),relic:Core.makeItem('matriarch_charm')};
  data.backpack.push(Core.makeItem('fang_blade'));
  const stats=Core.loadoutStats(data);
  assert.equal(stats.attackBonus,16);
  assert.equal(stats.hpBonus,54);
  assert.equal(stats.guardBonus,12);
});

test('los objetos no se superponen ni salen de la mochila',()=>{
  const armor=Core.makeItem('leather_armor',1,{x:0,y:0});
  const dagger=Core.makeItem('handmade_dagger',1);
  assert.equal(Core.canPlace([armor],dagger,0,1,false),false);
  assert.equal(Core.canPlace([armor],dagger,2,0,false),true);
  assert.equal(Core.canPlace([],armor,3,0,false),false);
  assert.equal(Core.canPlace([],armor,2,1,false),true);
});

test('girar cambia el espacio ocupado y permite encontrar lugar',()=>{
  const hide=Core.makeItem('wolf_hide');
  assert.equal(Core.dimensions(hide,false).w,2);
  assert.equal(Core.dimensions(hide,false).h,1);
  assert.equal(Core.dimensions(hide,true).w,1);
  assert.equal(Core.dimensions(hide,true).h,2);
  const blockers=[
    Core.makeItem('leather_armor',1,{x:0,y:0}),
    Core.makeItem('leather_armor',1,{x:2,y:0})
  ];
  const spot=Core.firstFit(blockers,hide);
  assert.equal(spot.y,3);
});

test('el autoorden nunca deja objetos superpuestos',()=>{
  const items=['leather_armor','field_potion','wolf_hide','spider_silk','slime_core','wolf_fang'].map(id=>Core.makeItem(id));
  const result=Core.autoSort(items);
  result.placed.forEach((item,index)=>{
    assert.equal(Core.canPlace(result.placed,item,item.x,item.y,item.rotated,item.uid),true,`objeto ${index}`);
  });
  assert.equal(result.placed.length+result.overflow.length,items.length);
});

test('Apilar todo combina el alijo sin superar el máximo de cada material',()=>{
  const stash=[Core.makeItem('slime_core',3),Core.makeItem('slime_core',6),Core.makeItem('slime_core',4),Core.makeItem('venom_gland',2),Core.makeItem('venom_gland',3)];
  const result=Core.stackAll(stash);
  assert.equal(result.removed,1);
  assert.equal(result.items.filter(item=>item.templateId==='slime_core').length,2);
  assert.equal(result.items.filter(item=>item.templateId==='slime_core').reduce((sum,item)=>sum+item.qty,0),13);
  assert.equal(result.items.every(item=>item.qty<=Core.template(item.templateId).maxStack),true);
});

test('un guardado inválido se sanea sin habilitar más de dos seguros',()=>{
  const raw={
    secure:[Core.makeItem('alpha_heart'),Core.makeItem('venom_gland'),Core.makeItem('slime_core')],
    backpack:[Core.makeItem('leather_armor',1,{x:99,y:99})],
    stash:[{templateId:'objeto_inventado',qty:999}]
  };
  const clean=Core.normalize(raw);
  assert.equal(clean.secure.length,2);
  assert.equal(clean.stash.some(item=>item.templateId==='objeto_inventado'),false);
  assert.equal(clean.backpack[0].x<=2,true);
  assert.equal(clean.backpack[0].y<=1,true);
});

test('el taller ofrece trece recetas distribuidas por progreso de sector',()=>{
  assert.equal(Object.keys(Core.RECIPES).length,13);
  assert.deepEqual([0,1,2,3,4,5].map(sector=>Object.values(Core.RECIPES).filter(recipe=>recipe.unlockSector===sector).length),[1,1,2,3,3,3]);
  const data=Core.createDefault();
  assert.equal(Core.canCraft(data,'field_potion').ok,true);
  assert.equal(Core.canCraft(data,'fang_blade').reason,'locked');
});

test('fabricar consume el alijo, apila el resultado y registra maestría',()=>{
  const data=Core.createDefault();
  const slimeBefore=Core.countInStash(data,'slime_core');
  const gelBefore=Core.countInStash(data,'refined_gel');
  const result=Core.craftRecipe(data,'field_potion',2);
  assert.equal(result.ok,true);
  assert.equal(result.outputQty,2);
  assert.equal(Core.countInStash(data,'slime_core'),slimeBefore-6);
  assert.equal(Core.countInStash(data,'refined_gel'),gelBefore-4);
  assert.equal(Core.countInStash(data,'field_potion'),2);
  assert.equal(data.crafting.crafted,2);
  assert.equal(data.crafting.mastery,2);
  assert.equal(data.crafting.discovered.join(','),'field_potion');
});

test('una fabricación imposible es atómica y no pierde materiales',()=>{
  const data=Core.createDefault();
  data.stats.bestSector=5;
  const before=JSON.stringify(data);
  const result=Core.craftRecipe(data,'matriarch_charm',1);
  assert.equal(result.ok,false);
  assert.equal(result.reason,'missing_materials');
  assert.equal(JSON.stringify(data),before);
});

test('el cálculo de espacio contempla pilas consumidas durante la receta',()=>{
  const data=Core.createDefault();
  data.stash=[Core.makeItem('slime_core',3),Core.makeItem('refined_gel',2)];
  while(data.stash.length<120) data.stash.push(Core.makeItem('handmade_dagger'));
  assert.equal(Core.canCraft(data,'field_potion').ok,true);
  assert.equal(Core.craftRecipe(data,'field_potion').ok,true);
  assert.equal(data.stash.length,119);
});

test('las piezas del taller incluyen estadísticas reales de incursión',()=>{
  assert.equal(Core.template('fang_blade').attackBonus,9);
  assert.equal(Core.template('venom_blades').attackBonus,13);
  assert.equal(Core.template('alpha_armor').hpBonus,42);
  assert.equal(Core.template('matriarch_charm').guardBonus,12);
  assert.equal(Core.template('obsidian_plate').thorns,5);
  assert.equal(Core.template('witch_reliquary').statusResist,1);
  assert.equal(Core.template('bronze_coil').openingGuard,true);
  assert.equal(Core.template('storm_cleaver').enemyGuardPierce,.8);
});

test('los nuevos materiales provienen del botín y alimentan recetas válidas',()=>{
  const materialIds=['spore_cap','moss_plate','grave_dust','witch_ichor','bronze_core','obsidian_shard','basilisk_eye','crystal_carapace','runic_scale','storm_scale'];
  const lootIds=new Set(Core.ENCOUNTER_POOLS.flat().flatMap(enemy=>enemy.loot.map(drop=>drop[0])));
  materialIds.forEach(id=>{
    assert.equal(Core.template(id).kind,'material',id);
    assert.equal(lootIds.has(id),true,`${id} no tiene origen enemigo`);
    assert.equal(Object.values(Core.RECIPES).some(recipe=>Object.hasOwn(recipe.inputs,id)),true,`${id} no se usa`);
  });
  Object.values(Core.RECIPES).forEach(recipe=>{
    assert.ok(Core.template(recipe.output),recipe.output);
    Object.keys(recipe.inputs).forEach(id=>assert.ok(Core.template(id),id));
  });
});

test('materiales y equipo nuevo usan atlas ilustrados exclusivos',()=>{
  const ids=['mossguard_plate','crypt_bow','witch_reliquary','bronze_coil','basilisk_blade','obsidian_plate','runic_prism','storm_cleaver'];
  ids.forEach(id=>{
    const spec=Core.template(id);
    assert.match(spec.rankedArt,/^equipment-/,id);
  });
  for(const id of ['spore_cap','moss_plate','grave_dust','witch_ichor','bronze_core','obsidian_shard','basilisk_eye','crystal_carapace','runic_scale','storm_scale']) assert.match(Core.template(id).rankedArt,/^material-/,id);
  assert.equal(existsSync(join(root,'assets','images','ranked-materials-atlas-v1.webp')),true);
  assert.equal(existsSync(join(root,'assets','images','ranked-equipment-atlas-v2.webp')),true);
  const rankedCss=readFileSync(join(root,'css','sections','18-caceria-ranked.css'),'utf8');
  assert.match(rankedCss,/ranked-materials-atlas-v1\.webp/);
  assert.match(rankedCss,/ranked-equipment-atlas-v2\.webp/);
  const data=Core.createDefault();
  data.loadout={weapon:Core.makeItem('storm_cleaver'),armor:Core.makeItem('obsidian_plate'),relic:Core.makeItem('bronze_coil')};
  const stats=Core.loadoutStats(data);
  assert.equal(stats.thorns,5);
  assert.equal(stats.openingGuard,true);
  assert.equal(stats.guardBonus,20);
});

test('Ranked permanece fuera de la carga inicial y se carga bajo demanda',()=>{
  const html=readFileSync(join(root,'index.html'),'utf8');
  const loader=readFileSync(join(root,'js','feature-loader.js'),'utf8');
  assert.doesNotMatch(html,/<script[^>]+caceria-ranked/);
  assert.doesNotMatch(html,/<link[^>]+18-caceria-ranked/);
  assert.ok(loader.includes('ranked-inventory-core.js'));
  assert.ok(loader.includes('18-caceria-ranked.css'));
});

test('el santuario Ranked integra taller, cantidades y fabricación persistente',()=>{
  const rankedUi=readFileSync(join(root,'js','caceria-ranked.js'),'utf8');
  assert.match(rankedUi,/TALLER DE EXTRACCIÓN/);
  assert.match(rankedUi,/data-craft-qty/);
  assert.match(rankedUi,/Core\.craftRecipe/);
  assert.match(rankedUi,/saveState\(\)/);
  assert.match(rankedUi,/ranked-craft-reveal/);
  assert.match(rankedUi,/data-craft-filter/);
  assert.match(rankedUi,/Object\.keys\(Core\.RECIPES\)\.length/);
});

test('los efectos avanzados modifican el combate y se explican al jugador',()=>{
  const rankedUi=readFileSync(join(root,'js','caceria-ranked.js'),'utf8');
  for(const contract of ['statusResist','openingGuard','enemyGuardPierce','executeBonus','thorns','REPRESALIA','COBERTURA INICIAL']) assert.match(rankedUi,new RegExp(contract));
  assert.match(rankedUi,/Tu armadura respondió/);
  assert.match(rankedUi,/loadoutPerksMarkup/);
  assert.match(rankedUi,/ranked-item-art-image/);
});

test('el inventario integra ranuras, comparación y banco de pruebas',()=>{
  const rankedUi=readFileSync(join(root,'js','caceria-ranked.js'),'utf8');
  assert.match(rankedUi,/EQUIPAMIENTO ACTIVO/);
  assert.match(rankedUi,/comparisonMarkup/);
  assert.match(rankedUi,/data-action="equip"/);
  assert.match(rankedUi,/BANCO DE PRUEBAS/);
  assert.match(rankedUi,/bench-attack/);
  assert.match(rankedUi,/bench-defense/);
});

test('las herramientas de prueba sólo aparecen y funcionan en desarrollo local',()=>{
  const rankedUi=readFileSync(join(root,'js','caceria-ranked.js'),'utf8');
  assert.match(rankedUi,/function developerToolsEnabled\(\)/);
  assert.match(rankedUi,/developerMode===true/);
  assert.match(rankedUi,/isLocalDeveloperEnvironment\(\)/);
  assert.match(rankedUi,/developerToolsEnabled\(\)\?'<button type="button" class="ranked-test-loot"/);
  assert.match(rankedUi,/developerToolsEnabled\(\)\?benchMarkup\(data\):''/);
  assert.match(rankedUi,/\['test-loot','test-defeat','confirm-defeat','bench-attack','bench-defense'\]\.includes\(action\) && !developerToolsEnabled\(\)/);
});

test('la actualización táctica expone intenciones, estados e informe detallado',()=>{
  const rankedUi=readFileSync(join(root,'js','caceria-ranked.js'),'utf8');
  for(const contract of ['EN SU PRÓXIMO TURNO','RESPUESTA','Golpe devastador','Mordida venenosa','SANGRADO','ATURDIDO','REGENERACIÓN','BOTÍN RECUPERADO','EQUIPO QUE SOBREVIVIÓ']) assert.match(rankedUi,new RegExp(contract));
  assert.match(rankedUi,/tickOngoingStatuses/);
  assert.match(rankedUi,/lootManifest/);
  assert.match(rankedUi,/stack-stash/);
});

test('las ilustraciones propias del botín no pueden tapar sus acciones',()=>{
  const rankedCss=readFileSync(join(root,'css','sections','18-caceria-ranked.css'),'utf8');
  assert.match(rankedCss,/\.ranked-drop-visual\.ranked-item-art-image\{[^}]*width:38px[^}]*height:38px[^}]*max-width:38px[^}]*max-height:38px/);
});

test('las cuatro piezas fabricadas usan el atlas ilustrado propio',()=>{
  for(const id of ['fang_blade','venom_blades','alpha_armor','matriarch_charm']) assert.ok(Core.template(id).art,id);
  assert.equal(existsSync(join(root,'assets','images','ranked-crafted-equipment-atlas-v1.webp')),true);
  const rankedCss=readFileSync(join(root,'css','sections','18-caceria-ranked.css'),'utf8');
  assert.match(rankedCss,/ranked-crafted-equipment-atlas-v1\.webp/);
});

test('la derrota usa una confirmación dentro del juego y protege los sellos',()=>{
  const rankedUi=readFileSync(join(root,'js','caceria-ranked.js'),'utf8');
  assert.doesNotMatch(rankedUi,/window\.confirm/);
  assert.match(rankedUi,/CONFIRMAR PÉRDIDA/);
  assert.match(rankedUi,/data\.backpack=\[\]/);
  assert.doesNotMatch(rankedUi,/data\.secure=\[\]/);
});

test('una incursión activa se sanea y puede reanudarse',()=>{
  const saved=Core.normalize({
    activeRun:{id:'run-prueba',phase:'encounter',sector:99,hp:-20,maxHp:0,enemy:{id:'wolf',name:'Lobo',tier:'inventado',hp:40,maxHp:50,atk:9},pendingLoot:[Core.makeItem('wolf_fang',3)],log:['entrada']},
    backpack:[],secure:[],stash:[]
  });
  assert.equal(saved.activeRun.id,'run-prueba');
  assert.equal(saved.activeRun.sector,4);
  assert.equal(saved.activeRun.hp,0);
  assert.equal(saved.activeRun.maxHp,1);
  assert.equal(saved.activeRun.enemy.tier,'comun');
  assert.equal(saved.activeRun.pendingLoot[0].templateId,'wolf_fang');
});

test('intenciones, estados y manifiesto sobreviven al guardado',()=>{
  const saved=Core.normalize({
    activeRun:{id:'run-tactica',phase:'encounter',sector:2,hp:40,maxHp:80,turn:4,statuses:{bleed:3,poison:2,stun:1,regen:2},enemy:{id:'spider',name:'Araña',tier:'raro',hp:30,maxHp:60,atk:12,statuses:{poison:3},intent:{type:'poison',label:'Mordida venenosa',icon:'✦',power:.7}},lootManifest:[{templateId:'spider_silk',qty:5}]},
    backpack:[],secure:[],stash:[]
  });
  assert.equal(saved.activeRun.turn,4);
  assert.equal(saved.activeRun.statuses.bleed,3);
  assert.equal(saved.activeRun.enemy.intent.type,'poison');
  assert.equal(saved.activeRun.enemy.statuses.poison,3);
  assert.equal(saved.activeRun.lootManifest[0].qty,5);
});

test('una partida reanudada adopta el arte y la rareza actuales del enemigo',()=>{
  const saved=Core.normalize({
    activeRun:{id:'run-migrada',phase:'encounter',territory:1,sector:1,hp:60,maxHp:76,enemy:{id:'eclipse_wolf',name:'Lobo antiguo',image:'assets/images/lobo gris sprite.webp',tier:'comun',hp:31,maxHp:68,atk:13},pendingLoot:[],log:[]},
    backpack:[],secure:[],stash:[]
  });
  assert.equal(saved.activeRun.enemy.name,'Lobo del Eclipse');
  assert.equal(saved.activeRun.enemy.tier,'epico');
  assert.match(saved.activeRun.enemy.image,/ranked-wolves\/lobo-eclipse-epico-v2\.webp$/);
  assert.equal(saved.activeRun.enemy.hp,31);
});

test('una partida anterior sin territorio vuelve a la ruta inicial de slimes',()=>{
  const saved=Core.normalize({activeRun:{id:'run-anterior',phase:'encounter',sector:1,hp:50,maxHp:76,enemy:{id:'grave_hound',name:'Sabueso',tier:'comun_plus',hp:42,maxHp:51,atk:10}},backpack:[],secure:[],stash:[]});
  assert.equal(saved.activeRun.territory,0);
  assert.equal(saved.activeRun.enemy.id,'slime_corrosive');
  assert.match(saved.activeRun.enemy.image,/ranked-slimes/);
  assert.equal(saved.activeRun.enemy.hp,42);
});

test('el informe final conserva botín, equipo y sellos protegidos',()=>{
  const saved=Core.normalize({
    lastRun:{result:'extracted',sector:3,lootValue:382,mobsDefeated:3,loot:[{templateId:'wolf_fang',qty:6}],survived:['venom_blades','alpha_armor'],protected:['alpha_heart']},
    backpack:[],secure:[],stash:[]
  });
  assert.equal(saved.lastRun.loot[0].qty,6);
  assert.equal(saved.lastRun.survived.join(','),'venom_blades,alpha_armor');
  assert.equal(saved.lastRun.protected[0],'alpha_heart');
});

test('la expedición ofrece cinco sectores, combate, botín y extracción',()=>{
  const rankedUi=readFileSync(join(root,'js','caceria-ranked.js'),'utf8');
  assert.equal(Core.ENCOUNTER_POOLS.length,5);
  assert.equal(Core.ENCOUNTER_POOLS.flat().length,25);
  Core.ENCOUNTER_POOLS.forEach(sector=>assert.equal(sector.length,5));
  assert.notEqual(Core.encountersForSector(0),Core.encountersForSector(4));
  assert.match(rankedUi,/run-attack/);
  assert.match(rankedUi,/run-defend/);
  assert.match(rankedUi,/run-extract/);
  assert.match(rankedUi,/collectFieldLoot/);
  Core.ENCOUNTER_POOLS.flat().forEach(enemy=>assert.equal(existsSync(join(root,enemy.image)),true,enemy.image));
});

test('cada ruta mantiene una sola familia y la siguiente se desbloquea al completar 5 de 5',()=>{
  const rankedUi=readFileSync(join(root,'js','caceria-ranked.js'),'utf8');
  assert.equal(Core.createDefault().stats.unlockedTerritory,0);
  assert.equal(Core.encountersForTerritory(0).every(enemy=>enemy.image.includes('/ranked-slimes/')),true);
  assert.equal(Core.encountersForTerritory(1).every(enemy=>enemy.image.includes('/ranked-wolves/')),true);
  const createEnemy=rankedUi.slice(rankedUi.indexOf('function createEnemy'),rankedUi.indexOf('function playerRunStats'));
  const finishRun=rankedUi.slice(rankedUi.indexOf('function finishRun'),rankedUi.indexOf('function rollLoot'));
  const advanceRun=rankedUi.slice(rankedUi.indexOf('function advanceRun'),rankedUi.indexOf('function collect')>rankedUi.indexOf('function advanceRun')?rankedUi.indexOf('function collect'):rankedUi.length);
  assert.match(createEnemy,/encountersForTerritory\(territory\)/);
  assert.match(advanceRun,/createEnemy\(run\.territory,run\.sector\)/);
  assert.match(finishRun,/extracted&&run\.sector===4&&run\.territory===data\.stats\.unlockedTerritory/);
});

test('cada criatura tiene identidad, patrón válido y botín propio',()=>{
  const allowed=new Set(['attack','heavy','poison','bleed','stun','guard','regen']);
  const enemies=Core.ENCOUNTER_POOLS.flat();
  assert.equal(new Set(enemies.map(enemy=>enemy.id)).size,enemies.length);
  enemies.forEach(enemy=>{
    assert.ok(enemy.role);
    assert.ok(enemy.trait?.name);
    assert.ok(enemy.trait?.description);
    assert.ok(enemy.pattern.length>=3);
    assert.equal(enemy.pattern.every(intent=>allowed.has(intent)),true,enemy.id);
    assert.ok(enemy.loot.length);
  });
});

test('cada territorio contiene cinco evoluciones y respeta la escala de rareza',()=>{
  const slimeSector=Core.encountersForSector(0);
  const rankedUi=readFileSync(join(root,'js','caceria-ranked.js'),'utf8');
  const rankedCss=readFileSync(join(root,'css','sections','18-caceria-ranked.css'),'utf8');
  assert.equal(slimeSector.map(enemy=>enemy.id).join(','),'slime_marsh,slime_corrosive,slime_crystal,slime_runic,slime_primordial');
  Core.ENCOUNTER_POOLS.forEach(sector=>{
    assert.equal(sector.map(enemy=>enemy.tier).join(','),'comun,comun_plus,poco_comun,epico,legendario');
    assert.equal(sector.map(enemy=>enemy.weight).join(','),'52,27,13,6,2');
    assert.equal(sector.reduce((sum,enemy)=>sum+enemy.weight,0),100);
    assert.ok(sector.at(-1).phasePattern?.length>=5);
    assert.match(sector.at(-1).role,/JEF[EA]/);
  });
  assert.equal(slimeSector.every(enemy=>enemy.image.includes('/ranked-slimes/')),true);
  assert.match(rankedUi,/La Ciénaga del Núcleo/);
  assert.match(rankedUi,/ranked-enemy-rarity/);
  for(const map of ['sector-cienaga-del-nucleo-v1.webp','sector-bosque-sepulcral-v1.webp','sector-nido-de-cristal-v1.webp','sector-santuario-raiz-petrea-v1.webp','sector-aguja-de-la-tormenta-v1.webp']) assert.match(rankedCss,new RegExp(map.replace('.','\\.')));
  assert.match(rankedCss,/tier-comun_plus/);
  assert.match(rankedCss,/tier-legendario/);
});

test('los cinco jefes cambian a una segunda fase diferente',()=>{
  const bosses=Core.ENCOUNTER_POOLS.map(sector=>sector.at(-1));
  assert.equal(bosses.length,5);
  bosses.forEach(boss=>{
    assert.ok(boss.phasePattern?.length>=5,boss.id);
    assert.notDeepEqual(boss.phasePattern,boss.pattern,boss.id);
  });
  assert.ok(new Set(bosses.map(boss=>boss.phasePattern.join(','))).size>=3);
});

test('la interfaz comunica rasgos, patrones, roles y segunda fase',()=>{
  const rankedUi=readFileSync(join(root,'js','caceria-ranked.js'),'utf8');
  const rankedCss=readFileSync(join(root,'css','sections','18-caceria-ranked.css'),'utf8');
  assert.match(rankedUi,/enemyTraitMarkup/);
  assert.match(rankedUi,/FASE II DESATADA/);
  assert.match(rankedUi,/Core\.encountersForSector/);
  assert.match(rankedUi,/pierceGuard/);
  assert.match(rankedUi,/executePower/);
  assert.match(rankedCss,/ranked-pattern-preview/);
  assert.match(rankedCss,/is-phase-two/);
});

test('caer pierde la mochila pero nunca elimina alijo ni sellos',()=>{
  const rankedUi=readFileSync(join(root,'js','caceria-ranked.js'),'utf8');
  const finishRun=rankedUi.slice(rankedUi.indexOf('function finishRun'),rankedUi.indexOf('function rollLoot'));
  assert.match(finishRun,/data\.backpack=\[\]/);
  assert.match(finishRun,/data\.loadout=\{weapon:null,armor:null,relic:null\}/);
  assert.doesNotMatch(finishRun,/data\.(secure|stash)=/);
  assert.match(finishRun,/failedRuns\+=1/);
});

test('cada acción Ranked tiene una señal sonora diferenciada',()=>{
  const rankedUi=readFileSync(join(root,'js','caceria-ranked.js'),'utf8');
  for(const cue of ['classAttack','enemyAttack','heal','treasureOpen','routeReveal','victory','defeat']){
    assert.match(rankedUi,new RegExp(`rankedSound\\('${cue}'`),cue);
  }
  const renderSlice=rankedUi.slice(rankedUi.indexOf('function renderExpedition'),rankedUi.indexOf('function renderResult'));
  assert.doesNotMatch(renderSlice,/rankedSound\(/,'renderizar no debe volver a reproducir sonidos');
});

test('materiales, forja y efectos avanzados tienen firmas sonoras propias',()=>{
  const rankedUi=readFileSync(join(root,'js','caceria-ranked.js'),'utf8');
  const soundSource=readFileSync(join(root,'js','sound.js'),'utf8');
  for(const cue of ['materialPickup','forgeCraft','rankedEquip','perkProc']){
    assert.match(soundSource,new RegExp(`${cue}\\(`),cue);
    assert.match(rankedUi,new RegExp(`rankedSound\\('${cue}'`),cue);
  }
  for(const perk of ['thorns','resist','pierce','execute','ward']) assert.match(rankedUi,new RegExp(`'${perk}'`),perk);
});

test('el feedback visual informa impactos y respeta movimiento reducido',()=>{
  const rankedUi=readFileSync(join(root,'js','caceria-ranked.js'),'utf8');
  const rankedCss=readFileSync(join(root,'css','sections','18-caceria-ranked.css'),'utf8');
  assert.match(rankedUi,/ranked-float-number/);
  assert.match(rankedUi,/aria-live="assertive"/);
  assert.match(rankedCss,/@keyframes ranked-enemy-hit/);
  assert.match(rankedCss,/body\.reduce-motion/);
  assert.match(rankedCss,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(rankedUi,/function rankedDamageNumber/);
  for(const classId of ['warrior','archer','mage']) assert.match(rankedCss,new RegExp(`ranked-float-number\\.is-enemy\\.class-${classId}`));
});

test('impactos, estados e intenciones tienen confirmación audiovisual propia',()=>{
  const rankedUi=readFileSync(join(root,'js','caceria-ranked.js'),'utf8');
  const rankedCss=readFileSync(join(root,'css','sections','18-caceria-ranked.css'),'utf8');
  const soundSource=readFileSync(join(root,'js','sound.js'),'utf8');
  for(const cue of ['impactAccent','enemyIntent','statusProc']){
    assert.match(soundSource,new RegExp(`${cue}\\(`),cue);
    assert.match(rankedUi,new RegExp(`rankedSound\\('${cue}'`),cue);
  }
  for(const classId of ['warrior','archer','mage']) assert.match(rankedCss,new RegExp(`ranked-class-impact\\.class-${classId}`));
  assert.match(rankedUi,/ranked-status-proc/);
  assert.match(rankedUi,/ranked-block-confirm/);
  assert.match(rankedCss,/body\.performance-mode \.ranked-class-impact/);
});

test('el feedback de combate no altera la geometría visible',()=>{
  const rankedCss=readFileSync(join(root,'css','sections','18-caceria-ranked.css'),'utf8');
  const stableStart=rankedCss.lastIndexOf('/* El feedback de combate');
  const stableFeedback=rankedCss.slice(stableStart,rankedCss.indexOf('/* Confirmaciones de impacto',stableStart));
  assert.match(stableFeedback,/scrollbar-gutter:stable/);
  assert.match(stableFeedback,/contain:layout paint/);
  assert.match(stableFeedback,/ranked-encounter-center>\.ranked-impact-label[\s\S]*?\{position:absolute/);
  assert.doesNotMatch(stableFeedback,/scale\(4\.2\)/);
  assert.doesNotMatch(stableFeedback,/translateX\([^)]+\)/);
});

test('la rareza enemiga no encierra ni tapa la ilustración',()=>{
  const rankedUi=readFileSync(join(root,'js','caceria-ranked.js'),'utf8');
  const rankedCss=readFileSync(join(root,'css','sections','18-caceria-ranked.css'),'utf8');
  const renderSlice=rankedUi.slice(rankedUi.indexOf('function renderExpedition'),rankedUi.indexOf('function renderResult'));
  const rarityPolish=rankedCss.slice(rankedCss.lastIndexOf('/* La rareza acompaña'));
  assert.doesNotMatch(renderSlice,/<span>\$\{enemy\.icon\}<\/span>/);
  assert.match(rarityPolish,/background:linear-gradient\(90deg,transparent,var\(--enemy-tier-color\),transparent\)/);
  assert.match(rarityPolish,/border:0;background:none;box-shadow:none/);
});

test('la incursión muestra el personaje activo en lugar de su emblema',()=>{
  const rankedUi=readFileSync(join(root,'js','caceria-ranked.js'),'utf8');
  const rankedCss=readFileSync(join(root,'css','sections','18-caceria-ranked.css'),'utf8');
  for(const classId of ['warrior','archer','mage','priest','assassin','tamer']){
    assert.match(rankedUi,new RegExp(`${classId}:'assets/images/clase [^']+ sprite v2\\.webp'`),classId);
  }
  const renderSlice=rankedUi.slice(rankedUi.indexOf('function renderExpedition'),rankedUi.indexOf('function renderResult'));
  assert.match(renderSlice,/class="ranked-player-portrait"/);
  assert.doesNotMatch(renderSlice,/class="ranked-player-emblem"/);
  assert.match(rankedCss,/\.ranked-player-portrait img\{[^}]*object-fit:contain/);
});

test('la cabina Ranked prioriza información útil y aprovecha el ancho disponible',()=>{
  const rankedUi=readFileSync(join(root,'js','caceria-ranked.js'),'utf8');
  const rankedCss=readFileSync(join(root,'css','sections','18-caceria-ranked.css'),'utf8');
  const expedition=rankedUi.slice(rankedUi.indexOf('function renderExpedition'),rankedUi.indexOf('function reportItemsMarkup'));
  assert.doesNotMatch(rankedUi,/SIN ESTADOS/);
  assert.match(rankedUi,/rankedLevelAbilities\(\)\.filter\(ability=>state\.level>=ability\.level\)/);
  assert.doesNotMatch(expedition,/ranked-run-events/);
  assert.doesNotMatch(expedition,/<small>AHORA<\/small>/);
  assert.match(rankedCss,/\.ranked-expedition--focused\{width:min\(1440px/);
  assert.match(rankedCss,/grid-template-columns:290px minmax\(650px,1fr\)/);
});

test('las tres clases originales tienen habilidades tácticas distintas en Ranked',()=>{
  const rankedUi=readFileSync(join(root,'js','caceria-ranked.js'),'utf8');
  assert.match(rankedUi,/warrior:\{label:'GUERRERO'.*skill:'BASTIÓN'/);
  assert.match(rankedUi,/archer:\{label:'ARQUERO'.*skill:'RÁFAGA'/);
  assert.match(rankedUi,/mage:\{label:'MAGO'.*skill:'NOVA'/);
  assert.match(rankedUi,/function runClassSkill\(\)/);
  assert.match(rankedUi,/run\.counterReady=true/);
  assert.match(rankedUi,/run\.enemy\.statuses\.bleed=Math\.max/);
  assert.match(rankedUi,/run\.arcaneCharges=0/);
  assert.match(rankedUi,/data-action="run-class-skill"/);
});

test('guerrero, arquero y mago desbloquean tres dominios propios',()=>{
  const rankedUi=readFileSync(join(root,'js','caceria-ranked.js'),'utf8');
  const battleAbilities=readFileSync(join(root,'js','combat-battle-abilities.js'),'utf8');
  for(const source of [rankedUi,battleAbilities]){
    for(const name of ['Golpe de Escudo','Furia de Hierro','Veredicto del Coloso','Flecha Perforante','Trampa de Sangre','Tormenta de Flechas','Proyectil Rúnico','Prisión de Escarcha','Cataclismo Astral']) assert.match(source,new RegExp(name));
    for(const level of [5,15,25]) assert.match(source,new RegExp(`level:${level}`));
  }
  assert.match(rankedUi,/data-level-skill/);
  assert.match(rankedUi,/function runLevelSkill\(key\)/);
  assert.match(battleAbilities,/data-level-ability/);
  assert.match(battleAbilities,/function useAbility\(key\)/);
});

test('la recarga y las cargas arcanas sobreviven al guardado Ranked',()=>{
  const data=Core.createDefault();
  data.activeRun={id:'class-run',phase:'encounter',territory:0,sector:0,hp:50,maxHp:76,guard:false,classSkillCooldown:2,levelSkillCooldowns:{'warrior-shield-bash':2,'clave-invalida':5},arcaneCharges:3,counterReady:true,statuses:{},enemy:{id:'slime_common',hp:10,maxHp:10,atk:2,statuses:{}},log:[]};
  const clean=Core.normalize(data).activeRun;
  assert.equal(clean.classSkillCooldown,2);
  assert.equal(clean.levelSkillCooldowns['warrior-shield-bash'],2);
  assert.equal(clean.levelSkillCooldowns['clave-invalida'],undefined);
  assert.equal(clean.arcaneCharges,3);
  assert.equal(clean.counterReady,true);
});

test('el arte individual nunca expande ingredientes ni recompensas',()=>{
  const rankedCss=readFileSync(join(root,'css','sections','18-caceria-ranked.css'),'utf8');
  assert.match(rankedCss,/\.ranked-material-visual\{[^}]*width:24px[^}]*height:24px[^}]*max-width:24px[^}]*max-height:24px/);
  assert.match(rankedCss,/\.ranked-reward-visual\{[^}]*width:42px[^}]*height:42px[^}]*max-width:42px[^}]*max-height:42px/);
  assert.match(rankedCss,/\.ranked-recipe-visual\{[^}]*max-width:100%[^}]*max-height:100%[^}]*object-fit:contain/);
  assert.match(rankedCss,/\.ranked-reward-track article\{min-width:0;overflow:hidden\}/);
});

test('las seis divisiones respetan sus umbrales exactos',()=>{
  assert.equal(Core.DIVISIONS.length,6);
  assert.equal(Core.divisionForRating(0).id,'iron');
  assert.equal(Core.divisionForRating(249).id,'iron');
  assert.equal(Core.divisionForRating(250).id,'bronze');
  assert.equal(Core.divisionForRating(1499).id,'gold');
  assert.equal(Core.divisionForRating(1500).id,'obsidian');
  assert.equal(Core.divisionForRating(2200).id,'eternal');
});

test('el puntaje recompensa extracción, profundidad, caza y valor',()=>{
  const shallow=Core.calculateRankResult({result:'extracted',sector:1,mobsDefeated:1,lootValue:50});
  const deep=Core.calculateRankResult({result:'extracted',sector:5,mobsDefeated:5,lootValue:1000});
  const defeat=Core.calculateRankResult({result:'defeated',sector:1,mobsDefeated:0,lootValue:0});
  assert.ok(shallow.rankDelta>0);
  assert.ok(deep.rankDelta>shallow.rankDelta);
  assert.ok(defeat.rankDelta<0);
  assert.ok(deep.seasonXpEarned>shallow.seasonXpEarned);
});

test('caer siempre resta PR y una extracción completa respeta el ritmo de rango',()=>{
  for(let sector=1;sector<=5;sector++){
    const defeat=Core.calculateRankResult({result:'defeated',sector,mobsDefeated:sector-1,lootValue:3000});
    assert.ok(defeat.rankDelta<0,`sector ${sector} no debe premiar una derrota`);
  }
  const complete=Core.calculateRankResult({result:'extracted',sector:5,mobsDefeated:5,lootValue:1000});
  assert.ok(complete.rankDelta>=120);
  assert.ok(complete.rankDelta<=150);
  assert.ok(complete.seasonXpEarned<=120);
});

test('la presión por sector crece sin picos injustos de ataque',()=>{
  assert.equal(Core.DIFFICULTY_CURVE.length,5);
  for(let sector=1;sector<Core.DIFFICULTY_CURVE.length;sector++){
    const previous=Core.difficultyForSector(sector-1);
    const current=Core.difficultyForSector(sector);
    assert.ok(current.hpBonus>previous.hpBonus);
    assert.ok(current.attackBonus>=previous.attackBonus);
    assert.ok(current.attackBonus-previous.attackBonus<=1);
  }
  assert.equal(Core.difficultyForSector(4).label,'LETAL');
});

test('consumibles y equipo final requieren una inversión sostenible',()=>{
  assert.equal(Core.template('field_potion').heal,34);
  assert.equal(Core.RECIPES.field_potion.inputs.slime_core,3);
  assert.equal(Core.RECIPES.field_potion.inputs.refined_gel,2);
  for(const [recipeId,signature] of [['matriarch_charm','crystal_carapace'],['runic_prism','runic_scale'],['storm_cleaver','storm_scale']]){
    assert.ok(Core.RECIPES[recipeId].inputs[signature]>=3);
    const encounter=Core.ENCOUNTER_POOLS[4].find(enemy=>enemy.loot.some(drop=>drop[0]===signature));
    const signatureDrop=encounter.loot.find(drop=>drop[0]===signature);
    assert.ok(signatureDrop[2]<=2,`${recipeId} no debe salir de una sola recompensa garantizada`);
  }
  assert.equal(Core.MISSION_DEFS.find(mission=>mission.id==='wealth').goal,4000);
  assert.equal(Core.REWARD_TRACK.at(-1).xp,3400);
});

test('registrar una incursión actualiza rango, pico, XP e historial',()=>{
  const data=Core.createDefault();
  const result=Core.recordRankedResult(data,{id:'run-1',result:'extracted',sector:3,mobsDefeated:3,lootValue:400,endedAt:123});
  assert.equal(data.competition.rating,result.ratingAfter);
  assert.equal(data.competition.peakRating,result.ratingAfter);
  assert.equal(data.competition.seasonXp,result.seasonXpEarned);
  assert.equal(data.competition.history[0].id,'run-1');
  for(let index=0;index<15;index++) Core.recordRankedResult(data,{id:`run-${index+2}`,result:'defeated',sector:1,mobsDefeated:0,lootValue:0});
  assert.equal(data.competition.history.length,12);
});

test('la competición malformada se sanea sin inventar reclamos',()=>{
  const data=Core.normalize({backpack:[],secure:[],stash:[],competition:{rating:-90,peakRating:-5,seasonXp:-1,claimedMissions:['fake'],claimedRewards:[99],history:[{result:'otro',sector:99,rankDelta:999}]}});
  assert.equal(data.version,9);
  assert.equal(data.competition.rating,0);
  assert.equal(data.competition.claimedMissions.length,0);
  assert.equal(data.competition.claimedRewards.length,0);
  assert.equal(data.competition.history[0].sector,5);
  assert.equal(data.competition.history[0].rankDelta,250);
});

test('las misiones derivan progreso real y se reclaman una sola vez',()=>{
  const data=Core.createDefault();
  data.competition.seasonStats.extractions=3;
  const progress=Core.missionProgress(data,'extractor');
  assert.equal(progress.complete,true);
  assert.equal(Core.claimMission(data,'extractor').ok,true);
  assert.equal(data.competition.seasonXp,110);
  assert.equal(Core.claimMission(data,'extractor').reason,'claimed');
  assert.equal(data.competition.seasonXp,110);
});

test('una recompensa se acredita de forma atómica y respeta el alijo lleno',()=>{
  const data=Core.createDefault();
  data.competition.seasonXp=125;
  const before=Core.countInStash(data,'slime_core');
  assert.equal(Core.claimSeasonReward(data,1).ok,true);
  assert.equal(Core.countInStash(data,'slime_core'),before+4);
  assert.equal(Core.claimSeasonReward(data,1).reason,'claimed');
  const full=Core.createDefault();
  full.competition.seasonXp=125;
  full.stash=Array.from({length:120},()=>Core.makeItem('handmade_dagger'));
  const snapshot=JSON.stringify(full.stash);
  assert.equal(Core.claimSeasonReward(full,1).reason,'stash_full');
  assert.equal(JSON.stringify(full.stash),snapshot);
  assert.equal(full.competition.claimedRewards.length,0);
});

test('la pantalla de clasificación integra misiones, ruta e historial',()=>{
  const rankedUi=readFileSync(join(root,'js','caceria-ranked.js'),'utf8');
  for(const contract of ['CLASIFICACIÓN','CENTRO DE PROGRESIÓN','MISIONES DE FRONTERA','RECOMPENSAS GRATUITAS','HISTORIAL LOCAL']) assert.match(rankedUi,new RegExp(contract));
  assert.match(rankedUi,/Core\.claimMission/);
  assert.match(rankedUi,/Core\.claimSeasonReward/);
  assert.match(rankedUi,/Core\.recordRankedResult/);
});

test('el informe final muestra puntos Ranked y XP obtenida',()=>{
  const rankedUi=readFileSync(join(root,'js','caceria-ranked.js'),'utf8');
  const resultSlice=rankedUi.slice(rankedUi.indexOf('function renderResult'),rankedUi.indexOf('function craftedStatsMarkup'));
  assert.match(resultSlice,/RANGO COMPETITIVO/);
  assert.match(resultSlice,/rankDelta/);
  assert.match(resultSlice,/seasonXpEarned/);
});

test('la guía inicial explica riesgo, PR y XP y recuerda su cierre',()=>{
  const fresh=Core.createDefault();
  assert.equal(fresh.competition.tutorialSeen,false);
  fresh.competition.tutorialSeen=true;
  assert.equal(Core.normalize(fresh).competition.tutorialSeen,true);
  const rankedUi=readFileSync(join(root,'js','caceria-ranked.js'),'utf8');
  for(const message of ['EL CICLO DE EXTRACCIÓN','PR = TU RANGO','XP = RECOMPENSAS','XP NO SE GASTA']) assert.match(rankedUi,new RegExp(message));
  assert.match(rankedUi,/tutorialSeen=true/);
  assert.match(rankedUi,/VER GUÍA COMPLETA/);
});

test('la incursión anticipa recompensa y riesgo antes de extraerse',()=>{
  const rankedUi=readFileSync(join(root,'js','caceria-ranked.js'),'utf8');
  const expedition=rankedUi.slice(rankedUi.indexOf('function renderExpedition'),rankedUi.indexOf('function reportItemsMarkup'));
  assert.match(expedition,/calculateRankResult/);
  assert.match(expedition,/RESULTADO SI EXTRAÉS AHORA/);
  assert.match(expedition,/EXTRAER AHORA · \+\$\{extractionPreview\.rankDelta\} PR/);
  assert.match(expedition,/Tu rango no puede bajar de 0 PR/);
});

test('la extracción sólo está disponible entre combates y la recuperación conserva la incursión',()=>{
  const rankedUi=readFileSync(join(root,'js','caceria-ranked.js'),'utf8');
  const expedition=rankedUi.slice(rankedUi.indexOf('function renderExpedition'),rankedUi.indexOf('function reportItemsMarkup'));
  const finishRun=rankedUi.slice(rankedUi.indexOf('function finishRun'),rankedUi.indexOf('function rollLoot'));
  const recovery=rankedUi.slice(rankedUi.indexOf('function recoverActiveRun'),rankedUi.indexOf('function changeCraftQuantity'));
  assert.doesNotMatch(expedition,/run\.phase==='encounter'&&run\.sector>0/);
  assert.doesNotMatch(expedition,/ranked-emergency-extract/);
  assert.match(expedition,/run\.phase==='loot'/);
  assert.match(finishRun,/result==='extracted' && run\.phase!=='loot'/);
  assert.match(rankedUi,/data-action="run-recover"/);
  assert.match(recovery,/Core\.normalize\(current\)/);
  assert.match(recovery,/saveState\(\)/);
});

test('la nueva interfaz diferencia explícitamente PR, XP y botín',()=>{
  const rankedUi=readFileSync(join(root,'js','caceria-ranked.js'),'utf8');
  const rankedCss=readFileSync(join(root,'css','sections','18-caceria-ranked.css'),'utf8');
  for(const contract of ['PR = DIVISIÓN','XP = RECOMPENSAS','BOTÍN = FABRICACIÓN','PRETEMPORADA ARCHIVADA','LA XP NO SE GASTA']) assert.match(rankedUi,new RegExp(contract));
  assert.match(rankedCss,/ranked-system-guide/);
  assert.match(rankedCss,/ranked-migration-note/);
  assert.match(rankedCss,/ranked-result-progression/);
});

test('el ranking público usa recibos y puntuación calculada por Supabase',()=>{
  const rankedUi=readFileSync(join(root,'js','caceria-ranked.js'),'utf8');
  const sql=readFileSync(join(root,'supabase-ranked-publico.sql'),'utf8');
  for(const rpc of ['start_ranked_run','submit_ranked_run','get_ranked_leaderboard']){
    assert.match(rankedUi,new RegExp(`/rpc/${rpc}`));
    assert.match(sql,new RegExp(`function public\\.${rpc}`));
  }
  assert.doesNotMatch(rankedUi,/rest\/v1\/ranked_public_(profiles|runs)\?/);
  assert.match(sql,/security definer\s+set search_path = ''/i);
  assert.match(sql,/revoke all on public\.ranked_public_profiles from anon, authenticated/i);
  assert.match(sql,/revoke all on public\.ranked_public_runs from anon, authenticated/i);
  assert.match(sql,/ranked run already closed/i);
  assert.match(sql,/implausible ranked duration/i);
  assert.match(sql,/implausible ranked loot/i);
  assert.match(sql,/20 \+ p_sector\*15 \+ p_mobs_defeated\*8/i);
});

test('el estado público sobrevive al guardado sin aceptar datos arbitrarios',()=>{
  const runId='123e4567-e89b-12d3-a456-426614174000';
  const data=Core.normalize({activeRun:{id:'run-publica',phase:'encounter',sector:1,hp:50,maxHp:80,enemy:{id:'ash_wolf',name:'Lobo',tier:'poco_comun',hp:40,maxHp:48,atk:10},publicRunId:runId,publicStartedAt:123,publicEligible:true},lastRun:{id:'last-publica',result:'extracted',sector:2,publicStatus:'accepted',publicRankDelta:52,publicRatingAfter:302}});
  assert.equal(data.activeRun.publicRunId,runId);
  assert.equal(data.activeRun.publicEligible,true);
  assert.equal(data.lastRun.publicStatus,'accepted');
  assert.equal(data.lastRun.publicRatingAfter,302);
  const unsafe=Core.normalize({activeRun:{id:'x',enemy:{id:'x'},publicRunId:'no-es-uuid',publicEligible:true},lastRun:{publicStatus:'inventado',publicRankDelta:999}});
  assert.equal(unsafe.activeRun.publicRunId,'');
  assert.equal(unsafe.lastRun.publicStatus,'local');
  assert.equal(unsafe.lastRun.publicRankDelta,150);
});

test('la Temporada 1 reinicia sólo la competencia y conserva el inventario',()=>{
  const previous=Core.createDefault();
  previous.season='pretemporada-0';
  previous.competition.rating=720;
  previous.competition.peakRating=800;
  previous.competition.seasonXp=1100;
  previous.competition.history=[{id:'old',result:'extracted',sector:4,mobsDefeated:4,lootValue:900,rankDelta:100,ratingAfter:720,division:'silver',endedAt:1}];
  const stashSnapshot=previous.stash.map(item=>item.templateId);
  const migrated=Core.normalize(previous);
  assert.equal(migrated.season,Core.SEASON.id);
  assert.equal(migrated.competition.rating,0);
  assert.equal(migrated.competition.seasonXp,0);
  assert.equal(migrated.competition.history.length,0);
  assert.equal(migrated.competition.archives.at(-1).season,'pretemporada-0');
  assert.deepEqual(migrated.stash.map(item=>item.templateId),stashSnapshot);
});

test('la temporada oficial tiene calendario, misiones y diez niveles',()=>{
  assert.equal(Core.SEASON.number,1);
  assert.equal(Core.SEASON.name,'La Frontera Quebrada');
  assert.ok(Date.parse(Core.SEASON.endsAt)>Date.parse(Core.SEASON.startsAt));
  assert.equal(Core.MISSION_DEFS.length,8);
  assert.equal(Core.REWARD_TRACK.length,10);
  const rankedUi=readFileSync(join(root,'js','caceria-ranked.js'),'utf8');
  assert.match(rankedUi,/TEMPORADA \$\{Core\.SEASON\.number\}/);
  assert.match(rankedUi,/10 niveles · 3400 XP/);
});

test('Supabase separa perfiles y recibos por temporada oficial',()=>{
  const sql=readFileSync(join(root,'supabase-ranked-publico.sql'),'utf8');
  assert.match(sql,/season-1-frontera-quebrada/g);
  assert.match(sql,/primary key\(player_id,season_id\)/i);
  assert.match(sql,/on conflict \(player_id,season_id\)/i);
  assert.match(sql,/where profile\.season_id = 'season-1-frontera-quebrada'/i);
  assert.match(sql,/ranked season is not active/i);
});
