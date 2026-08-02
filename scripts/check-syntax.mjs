import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=dirname(dirname(fileURLToPath(import.meta.url)));
const jsRoot=join(root,'js');

function javascriptFiles(directory){
  return readdirSync(directory,{withFileTypes:true}).flatMap(entry=>{
    const path=join(directory,entry.name);
    return entry.isDirectory() ? javascriptFiles(path) : entry.isFile()&&entry.name.endsWith('.js') ? [path] : [];
  });
}

const failures=[];
const files=javascriptFiles(jsRoot);
for(const file of files){
  const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  if(result.status!==0) failures.push(`${relative(root,file)}\n${result.stderr||result.stdout}`);
}

if(failures.length){
  console.error(`Falló la sintaxis en ${failures.length} archivo(s):\n${failures.join('\n')}`);
  process.exit(1);
}

console.log(`Sintaxis válida: ${files.length} archivos JavaScript.`);
