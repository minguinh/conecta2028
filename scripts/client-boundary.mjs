import {readFileSync,readdirSync,existsSync,statSync} from 'node:fs';
import path from 'node:path';
export function filesIn(dir){if(!existsSync(dir))return [];return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?filesIn(path.join(dir,e.name)):[path.join(dir,e.name)]);}
export function checkClientBoundary(root=process.cwd()){
 const source=path.join(root,'src'),visited=new Set(),errors=[];
 function walk(file){if(visited.has(file))return;visited.add(file);const text=readFileSync(file,'utf8');
  if(file.startsWith(path.join(source,'db')+path.sep)||/^\s*import\s+['"]server-only['"]/m.test(text))errors.push('Módulo exclusivo do servidor no grafo cliente: '+path.relative(root,file));
  for(const m of text.matchAll(/process\.env(?:\.([A-Z0-9_]+)|\[)/g)){if(!m[1]||!['NODE_ENV','NEXT_PUBLIC_MAP_STYLE_URL'].includes(m[1]))errors.push('Variável privada ou acesso dinâmico ao ambiente: '+path.relative(root,file));}
  const imports=[...text.matchAll(/\b(?:import|export)\s+(?!type\b)[^;]*?\bfrom\s*['"]([^'"]+)['"]/g),...text.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g)];
  for(const match of imports){const spec=match[1];if(/^(?:@neondatabase\/|drizzle-orm(?:\/|$)|node:|server-only$|better-auth$)/.test(spec))errors.push('Dependência de servidor no cliente: '+path.relative(root,file));
   if(!spec.startsWith('.')&&!spec.startsWith('@/'))continue;
   const base=spec.startsWith('@/')?path.join(source,spec.slice(2)):path.resolve(path.dirname(file),spec);
   const resolved=['','.ts','.tsx','.js','.mjs','/index.ts','/index.tsx'].map(ext=>base+ext).find(p=>existsSync(p)&&statSync(p).isFile());if(resolved&&/\.(?:tsx?|m?js)$/.test(resolved))walk(resolved);
  }
 }
 const roots=filesIn(source).filter(f=>/\.[jt]sx?$/.test(f)&&/^\s*['"]use client['"]/.test(readFileSync(f,'utf8')));roots.forEach(walk);return {roots:roots.length,modules:visited.size,errors:[...new Set(errors)]};
}
