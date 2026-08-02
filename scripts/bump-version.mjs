import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=dirname(dirname(fileURLToPath(import.meta.url)));
const path=name=>join(root,name);
const read=name=>readFileSync(path(name),'utf8');
const write=(name,value)=>writeFileSync(path(name),value,'utf8');
const current=read('VERSION').trim();
const request=process.argv[2];
const match=current.match(/^(\d+)\.(\d+)\.(\d+)$/);

if(!match) throw new Error(`VERSION inválida: ${current}`);
if(!request) throw new Error('Uso: node scripts/bump-version.mjs patch|minor|major|X.Y.Z');

let [major,minor,patch]=match.slice(1).map(Number);
let next;
if(/^\d+\.\d+\.\d+$/.test(request)) next=request;
else if(request==='patch') next=`${major}.${minor}.${patch+1}`;
else if(request==='minor') next=`${major}.${minor+1}.0`;
else if(request==='major') next=`${major+1}.0.0`;
else throw new Error(`Incremento desconocido: ${request}`);

if(next===current) throw new Error(`La versión ${next} ya es la actual.`);

const packageJson=JSON.parse(read('package.json'));
packageJson.version=next;
write('package.json',`${JSON.stringify(packageJson,null,2)}\n`);
write('VERSION',`${next}\n`);

let html=read('index.html')
  .replace(/(<meta name="application-version" content=")[^"]+(">)/,'$1'+next+'$2')
  .replace(/(FORJA ETERNA · v)\d+\.\d+\.\d+/,'$1'+next)
  .replace(/((?:src|href)="(?:js|css)\/[^"?]+)\?v=[^"]+/g,'$1?v='+next);
write('index.html',html);

let loader=read('js/feature-loader.js')
  .replace(/((?:css|js)\/[^'"?]+)\?v=[^'"]+/g,'$1?v='+next);
write('js/feature-loader.js',loader);

let readme=read('README.md').replace(/Versión actual: \*\*\d+\.\d+\.\d+\*\*/,'Versión actual: **'+next+'**');
write('README.md',readme);

const date=new Date().toISOString().slice(0,10);
let changelog=read('CHANGELOG.md');
const insertion=`\n## [${next}] - ${date}\n\n- Completá aquí los cambios de esta versión.\n`;
const firstRelease=changelog.indexOf('\n## [');
changelog=firstRelease>=0 ? changelog.slice(0,firstRelease)+insertion+changelog.slice(firstRelease) : changelog+insertion;
write('CHANGELOG.md',changelog);

console.log(`Versión preparada: ${current} → ${next}`);
console.log('Completá CHANGELOG.md y ejecutá npm run check antes de publicar.');
