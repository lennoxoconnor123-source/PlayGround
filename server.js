const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8'};
const server = http.createServer((req,res)=>{
  const pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const requested = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const file = path.resolve(root, requested);
  if (!file.startsWith(root + path.sep) && file !== path.join(root,'index.html')) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(file,(err,data)=>{ if(err){res.writeHead(404);return res.end('Not found');} res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data); });
});
server.listen(process.env.PORT||3000,'0.0.0.0',()=>console.log(`OVERDRIVE running at http://localhost:${process.env.PORT||3000}`));
