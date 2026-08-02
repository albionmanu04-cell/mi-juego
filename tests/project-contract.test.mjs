import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
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

test('la carga inicial respeta el presupuesto de 600 KB',()=>{
  const refs=new Set();
  for(const match of html.matchAll(/(?<![-\w])(?:src|href)="([^"]+)"/g)){
    if(!/^(?:https?:|data:|#)/.test(match[1])) refs.add(match[1].split('?')[0]);
  }
  const bytes=[...refs].reduce((sum,ref)=>sum+statSync(join(root,ref)).size,0);
  assert.ok(bytes<=600*1024,`Carga inicial: ${(bytes/1024).toFixed(1)} KB`);
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
