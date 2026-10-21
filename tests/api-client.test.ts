import {test} from 'node:test';
import assert from 'node:assert/strict';
import {api} from '../src/lib/api-client';
test('browser transport handles expired sessions, unavailable proxies and offline errors',async()=>{
 const original=globalThis.fetch;
 try{
 globalThis.fetch=async()=>new Response('<html>proxy</html>',{status:502});await assert.rejects(api('/api/contacts'),/Tente novamente/);
 globalThis.fetch=async()=>new Response('{}',{status:401});await assert.rejects(api('/api/contacts'),/sessão expirou/);
 globalThis.fetch=async()=>{throw new TypeError('network');};await assert.rejects(api('/api/contacts'),/Sem conexão/);
 globalThis.fetch=async()=>new Response('{"id":"saved"}');assert.deepEqual(await api('/api/contacts','POST',{}),{id:'saved'});
 }finally{globalThis.fetch=original;}
});
