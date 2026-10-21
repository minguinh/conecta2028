import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('grafo dos componentes cliente não importa banco, módulos de servidor nem ambiente privado',async()=>{
 const {checkClientBoundary}=await import('../scripts/client-boundary.mjs');const result=checkClientBoundary();assert.ok(result.roots>=5);assert.deepEqual(result.errors,[]);
});
test('pontos de conexão Neon são exclusivos do servidor e não têm fallback de credenciais',()=>{
 for(const path of ['src/db/client.ts','src/db/write.ts']){const text=readFileSync(path,'utf8');assert.match(text,/import 'server-only'/);assert.doesNotMatch(text,/NEXT_PUBLIC_|postgres(?:ql)?:\/\//);}
});
