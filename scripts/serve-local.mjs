import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {extname,resolve,sep} from 'node:path';

const root=resolve(process.cwd());
const port=Math.max(1024,Number(process.argv[2])||4173);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};

createServer(async(request,response)=>{
  try{
    const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
    const target=resolve(root,pathname==='/'?'index.html':pathname.slice(1));
    if(target!==root && !target.startsWith(`${root}${sep}`)) throw new Error('Ruta inválida');
    const data=await readFile(target);
    response.writeHead(200,{'Content-Type':mime[extname(target)]||'application/octet-stream','Cache-Control':'no-store'});
    response.end(data);
  }catch{
    response.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});
    response.end('No encontrado');
  }
}).listen(port,'127.0.0.1',()=>console.log(`Forja Eterna disponible en http://127.0.0.1:${port}`));
