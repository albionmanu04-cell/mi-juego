import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=dirname(dirname(fileURLToPath(import.meta.url)));
const read=path=>readFileSync(join(root,path),'utf8');
const fail=message=>{ throw new Error(message); };
const assert=(condition,message)=>{ if(!condition) fail(message); };
const semver=/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

const version=read('VERSION').trim();
const packageJson=JSON.parse(read('package.json'));
const html=read('index.html');
const changelog=read('CHANGELOG.md');
const readme=read('README.md');
const loader=read('js/feature-loader.js');
const cloudSql=read('supabase-cloud-save.sql');
const rankedPublicSql=read('supabase-ranked-publico.sql');

assert(semver.test(version),`VERSION no contiene una versión semántica válida: ${version}`);
assert(packageJson.version===version,'package.json y VERSION no coinciden.');
assert(html.includes(`<meta name="application-version" content="${version}">`),'La versión del HTML no coincide con VERSION.');
assert(html.includes(`FORJA ETERNA · v${version}`),'La versión visible no coincide con VERSION.');
assert(readme.includes(`Versión actual: **${version}**`),'README.md no indica la versión actual.');
assert(changelog.includes(`## [${version}]`),'CHANGELOG.md no contiene la versión actual.');

const htmlCacheVersions=[...html.matchAll(/(?:src|href)="(?:css|js)\/[^"?]+\?v=([^"&]+)"/g)].map(match=>match[1]);
const loaderCacheVersions=[...loader.matchAll(/['"](?:css|js)\/[^'"?]+\?v=([^'"&]+)['"]/g)].map(match=>match[1]);
assert(htmlCacheVersions.length>0&&loaderCacheVersions.length>0,'No se encontraron identificadores de caché versionados.');
assert([...htmlCacheVersions,...loaderCacheVersions].every(value=>value===version),'Los recursos no usan VERSION como identificador de caché.');

const initialRefs=new Set();
for(const match of html.matchAll(/(?<![-\w])(?:src|href)="([^"]+)"/g)){
  const ref=match[1];
  if(/^(?:https?:|data:|#)/.test(ref)) continue;
  initialRefs.add(ref.split('?')[0]);
}
for(const ref of initialRefs){
  assert(existsSync(join(root,normalize(ref))),`Falta un recurso inicial: ${ref}`);
}

const portalRefs=[...html.matchAll(/data-portal-src="([^"]+)"/g)].map(match=>match[1]);
for(const ref of portalRefs) assert(existsSync(join(root,normalize(ref))),`Falta un recurso diferido del portal: ${ref}`);

const loaderRefs=new Set([...loader.matchAll(/['"]((?:css|js)\/[^?'"]+)(?:\?[^'"]*)?['"]/g)].map(match=>match[1]));
for(const ref of loaderRefs) assert(existsSync(join(root,normalize(ref))),`Falta un recurso del cargador: ${ref}`);

const initialBytes=[...initialRefs].reduce((sum,ref)=>sum+statSync(join(root,normalize(ref))).size,0);
const initialScriptCount=(html.match(/<script\s+src=/g)||[]).length;
const localStyleCount=(html.match(/<link\s+rel="stylesheet"\s+href="(?!https?:)/g)||[]).length;
assert(initialBytes<=600*1024,`La carga inicial superó 600 KB: ${(initialBytes/1024).toFixed(1)} KB.`);
assert(initialScriptCount<=7,`Hay demasiados scripts iniciales: ${initialScriptCount}.`);
assert(localStyleCount<=4,`Hay demasiadas hojas de estilo iniciales: ${localStyleCount}.`);
assert(!/<script[^>]+caceria-spire/.test(html),'Cacería volvió a cargarse en el arranque.');
assert(!/<link[^>]+17-caceria-cartas/.test(html),'Los estilos de Cacería volvieron al arranque.');
assert(loader.includes('caceria-spire.js')&&loader.includes('17-caceria-cartas.css'),'El cargador no incluye todos los recursos de Cacería.');

assert(cloudSql.includes('sync_player_save'),'Falta la función atómica de guardado en nube.');
assert(/revoke insert, update, delete on public\.player_saves from authenticated/i.test(cloudSql),'Las escrituras directas de nube no están revocadas.');
assert(cloudSql.includes("jsonb_typeof(next_payload->'roster') is distinct from 'array'"),'Falta validar que el roster remoto sea una lista.');
assert(cloudSql.includes("jsonb_array_length(next_payload->'roster') > 3"),'Falta limitar el roster remoto a tres personajes.');
assert(rankedPublicSql.includes('start_ranked_run'),'Falta emitir recibos para partidas Ranked públicas.');
assert(rankedPublicSql.includes('submit_ranked_run'),'Falta validar resultados Ranked en Supabase.');
assert(rankedPublicSql.includes('get_ranked_leaderboard'),'Falta la lectura saneada del ranking público.');
assert(/revoke all on public\.ranked_public_profiles from anon, authenticated/i.test(rankedPublicSql),'Los perfiles Ranked permiten acceso directo.');
assert(/revoke all on public\.ranked_public_runs from anon, authenticated/i.test(rankedPublicSql),'Los recibos Ranked permiten acceso directo.');
assert(/security definer\s+set search_path = ''/i.test(rankedPublicSql),'Las funciones Ranked seguras necesitan search_path vacío.');

console.log(`Proyecto válido · v${version} · ${initialRefs.size} recursos iniciales · ${(initialBytes/1024).toFixed(1)} KB.`);
