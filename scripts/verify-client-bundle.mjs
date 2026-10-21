import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {checkClientBoundary,filesIn} from './client-boundary.mjs';
const graph=checkClientBoundary();assert.deepEqual(graph.errors,[],'Há código de banco/servidor no grafo cliente.');
const secretKeys=['DATABASE_URL','DATABASE_URL_UNPOOLED','BETTER_AUTH_SECRET','CLOUDFLARE_API_TOKEN','NEON_API_KEY','GITHUB_TOKEN'];
const environments=[process.env];for(const file of ['.env.local','.env.production.local','.dev.vars.production'])if(existsSync(file)){const raw=readFileSync(file,'utf8');environments.push(raw.trim().startsWith('{')?JSON.parse(raw):parseEnv(raw));}
const secrets=[...new Set(environments.flatMap(e=>secretKeys.map(k=>e[k]).filter(v=>typeof v==='string'&&v.length>=12)))];
const directory=process.argv[2]||'.next/static',assets=filesIn(directory).filter(f=>/\.(?:js|css|json|map|html|txt)$/.test(f));assert.ok(assets.length,'Nenhum artefato cliente encontrado para inspeção.');
for(const file of assets){const text=readFileSync(file,'utf8');assert.ok(!secrets.some(s=>text.includes(s)),'Credencial detectada em artefato cliente; conteúdo não exibido.');assert.ok(!/postgres(?:ql)?:\/\/[^\s'"`<>]+:[^\s'"`<>]+@/i.test(text),'Conexão PostgreSQL detectada em artefato cliente; conteúdo não exibido.');}
console.log(`PASS: ${graph.roots} entradas cliente, ${graph.modules} módulos e ${assets.length} artefatos verificados; nenhuma conexão ou credencial de infraestrutura exposta.`);
