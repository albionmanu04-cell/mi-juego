import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root=dirname(dirname(fileURLToPath(import.meta.url)));
const read=path=>readFileSync(join(root,path),'utf8');
const html=read('index.html');
const version=read('VERSION').trim();

test('la versión pública coincide con el paquete',()=>{
  const packageJson=JSON.parse(read('package.json'));
  assert.match(version,/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);
  assert.equal(packageJson.version,version);
  assert.match(html,new RegExp(`application-version" content="${version.replaceAll('.','\\.')}`));
  assert.ok(html.includes(`FORJA ETERNA · v${version}`));
});

test('Cacería permanece fuera de la carga inicial',()=>{
  assert.doesNotMatch(html,/<script[^>]+caceria-spire/);
  assert.doesNotMatch(html,/<link[^>]+17-caceria-cartas/);
  const loader=read('js/feature-loader.js');
  assert.ok(loader.includes('caceria-spire.js'));
  assert.ok(loader.includes('17-caceria-cartas.css'));
});

test('los módulos diferidos no duplican el estado global de subclase',()=>{
  const loader=read('js/feature-loader.js');
  const loadedScripts=[...loader.matchAll(/['"](js\/[^?'"\n]+\.js)(?:\?[^'"\n]*)?['"]/g)]
    .map(match=>match[1]);
  const declarations=loadedScripts.reduce((total,path)=>{
    const source=read(path);
    return total+(source.match(/^\s*(?:let|const)\s+subclassChoiceOpen\b/gm)||[]).length;
  },0);
  assert.equal(declarations,1,'subclassChoiceOpen debe pertenecer a un solo módulo diferido');
});

test('la carga inicial respeta el presupuesto de 600 KB',()=>{
  const refs=new Set();
  for(const match of html.matchAll(/(?<![-\w])(?:src|href)="([^"]+)"/g)){
    if(!/^(?:https?:|data:|#)/.test(match[1])) refs.add(match[1].split('?')[0]);
  }
  const bytes=[...refs].reduce((sum,ref)=>sum+statSync(join(root,ref)).size,0);
  assert.ok(bytes<=600*1024,`Carga inicial: ${(bytes/1024).toFixed(1)} KB`);
});

test('las imágenes publicadas usan formatos web optimizados',()=>{
  const imageRoot=join(root,'assets','images');
  const files=[];
  const visit=directory=>{
    for(const entry of readdirSync(directory,{withFileTypes:true})){
      const path=join(directory,entry.name);
      if(entry.isDirectory()) visit(path);
      else files.push(path);
    }
  };
  visit(imageRoot);
  const pngFiles=files.filter(path=>path.toLowerCase().endsWith('.png'));
  const imageBytes=files.reduce((sum,path)=>sum+statSync(path).size,0);
  assert.deepEqual(pngFiles,[],`Quedan PNG sin optimizar: ${pngFiles.join(', ')}`);
  assert.ok(imageBytes<=35*1024*1024,`Imágenes publicadas: ${(imageBytes/1024/1024).toFixed(1)} MB`);
});

test('el modo rendimiento protege a los equipos modestos',()=>{
  const stateSource=read('js/script-state.js');
  const mathSource=read('js/script-math.js');
  const optionsSource=read('js/script-shop.js');
  const loaderSource=read('js/feature-loader.js');
  const performanceCss=read('css/sections/13-optimizacion-rendimiento.css');
  const combatVfx=read('js/combat-battle-vfx.js');
  assert.match(stateSource,/performanceMode:'auto'/);
  assert.match(mathSource,/\['auto','on','off'\]\.includes\(state\.settings\.performanceMode\)/);
  assert.match(optionsSource,/navigator\.deviceMemory/);
  assert.match(optionsSource,/data-performance/);
  assert.match(optionsSource,/classList\.toggle\('performance-mode'/);
  assert.match(loaderSource,/earlyLowEnd/);
  assert.match(performanceCss,/body\.performance-mode \.combat-vfx/);
  assert.match(performanceCss,/backdrop-filter:none !important/);
  assert.match(combatVfx,/classList\.contains\('performance-mode'\)/);
});

test('Guerrero, Arquero y Mago tienen ritmos de combate y armas propios',()=>{
  const combatVfx=read('js/combat-battle-vfx.js');
  const turns=read('js/combat-battle-turns.js');
  const classes=read('js/classes.js');
  const math=read('js/script-math.js');
  const loader=read('js/feature-loader.js');
  assert.match(combatVfx,/warrior:\{\s*attack:\{hits:1,damage:1\.05,mana:4\}/);
  assert.match(combatVfx,/archer:\{\s*attack:\{hits:2,damage:\.60,mana:4\}/);
  assert.match(combatVfx,/mage:\{\s*attack:\{hits:1,damage:\.92,mana:8,grantArcaneAfter:1\}/);
  assert.match(turns,/action\.bleedTurns/);
  assert.match(turns,/action\.consumedCharges/);
  assert.match(classes,/Espada del Juramento[^\n]+bonusDef:11/);
  assert.match(classes,/Arco de Hoja Lunar[^\n]+bonusCrit:21/);
  assert.match(classes,/Baculo Astral[^\n]+bonusMana:42/);
  assert.match(math,/const refreshStarter = item=>/);
  for(const module of ['combat-battle-monsters','combat-battle-core','combat-battle-abilities','combat-battle-turns','combat-run']) assert.match(loader,new RegExp(module));
});

test('los números de daño tienen escala incremental y personalidad por clase',()=>{
  const combatVfx=read('js/combat-battle-vfx.js');
  const turns=read('js/combat-battle-turns.js');
  const combatCss=read('css/sections/09-combate-extra.css');
  const performanceCss=read('css/sections/13-optimizacion-rendimiento.css');
  assert.match(combatVfx,/COMBAT_NUMBER_SUFFIXES=\['','K','M','B','T','Qa','Qi'\]/);
  assert.match(combatVfx,/function showActionDamageTotal/);
  assert.match(turns,/action\.totalDamage/);
  for(const classId of ['warrior','archer','mage']) assert.match(combatCss,new RegExp(`dmg-float\\.damage-${classId}`));
  assert.match(combatCss,/damage-total-banner/);
  assert.match(performanceCss,/performance-mode \.damage-total-banner/);
});

test('la herramienta de publicación incrementa y propaga la versión',()=>{
  const temporaryRoot=mkdtempSync(join(tmpdir(),'forja-version-'));
  try{
    mkdirSync(join(temporaryRoot,'scripts'));
    mkdirSync(join(temporaryRoot,'js'));
    for(const file of ['VERSION','package.json','index.html','README.md','CHANGELOG.md']) copyFileSync(join(root,file),join(temporaryRoot,file));
    copyFileSync(join(root,'js','feature-loader.js'),join(temporaryRoot,'js','feature-loader.js'));
    copyFileSync(join(root,'scripts','bump-version.mjs'),join(temporaryRoot,'scripts','bump-version.mjs'));

    const [major,minor,patch]=version.split('.').map(Number);
    const expected=`${major}.${minor}.${patch+1}`;
    const result=spawnSync(process.execPath,[join(temporaryRoot,'scripts','bump-version.mjs'),'patch'],{encoding:'utf8'});
    assert.equal(result.status,0,result.stderr);
    assert.equal(readFileSync(join(temporaryRoot,'VERSION'),'utf8').trim(),expected);
    assert.equal(JSON.parse(readFileSync(join(temporaryRoot,'package.json'),'utf8')).version,expected);
    const updatedHtml=readFileSync(join(temporaryRoot,'index.html'),'utf8');
    assert.ok(updatedHtml.includes(`content="${expected}"`));
    assert.ok(updatedHtml.includes(`?v=${expected}`));
  }finally{
    rmSync(temporaryRoot,{recursive:true,force:true});
  }
});
