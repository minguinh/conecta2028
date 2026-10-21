import {test} from 'node:test';
import assert from 'node:assert/strict';
import {body,readJsonBody,sameOrigin,failure,HttpError,email,password} from '../src/lib/http';
const request=(text:string,headers:Record<string,string>={})=>new Request('https://app.invalid/api/contacts',{method:'POST',headers,body:text});
test('JSON accepts objects and rejects malformed, scalar and array bodies',async()=>{
 assert.deepEqual(await body(request('{"name":"Pessoa"}')),{name:'Pessoa'});
 for(const input of ['', 'null','[]','1','true','{'])await assert.rejects(body(request(input)),(e:unknown)=>e instanceof HttpError&&e.status===400);
});
test('JSON byte limit catches multibyte data and cancels a chunked stream early',async()=>{
 await assert.rejects(readJsonBody(request('{"x":"éééé"}'),15),(e:unknown)=>e instanceof HttpError&&e.status===413);
 let cancelled=false,pulls=0;
 const stream=new ReadableStream<Uint8Array<ArrayBuffer>>({pull(c){pulls++;c.enqueue(new Uint8Array(5000));},cancel(){cancelled=true;}});
 await assert.rejects(readJsonBody({headers:new Headers(),body:stream}), (e:unknown)=>e instanceof HttpError&&e.status===413);
 assert.ok(cancelled);assert.ok(pulls<=4);
 await assert.rejects(body(request('{}',{'content-length':'9000'})),(e:unknown)=>e instanceof HttpError&&e.status===413);
});
test('origin and content type fail closed',()=>{
 const original=process.env.BETTER_AUTH_URL;process.env.BETTER_AUTH_URL='https://app.invalid';
 try{assert.doesNotThrow(()=>sameOrigin(request('{}',{origin:'https://app.invalid','content-type':'application/json; charset=utf-8'})));
 for(const origin of ['https://evil.invalid','https://app.invalid.evil.invalid','null',''])assert.throws(()=>sameOrigin(request('{}',{origin,'content-type':'application/json'})),(e:unknown)=>e instanceof HttpError&&e.status===403);
 for(const type of ['text/plain','application/json-evil'])assert.throws(()=>sameOrigin(request('{}',{origin:'https://app.invalid','content-type':type})),(e:unknown)=>e instanceof HttpError&&e.status===415);
 delete process.env.BETTER_AUTH_URL;assert.throws(()=>sameOrigin(request('{}')));
 }finally{if(original===undefined)delete process.env.BETTER_AUTH_URL;else process.env.BETTER_AUTH_URL=original;}
});
test('unexpected errors never expose infrastructure secrets or stack traces',async()=>{
 const response=failure(new Error('postgres://private:secret@host/db'));
 assert.equal(response.status,503);assert.equal(response.headers.get('cache-control'),'private, no-store');
 const result=await response.json();assert.match(result.requestId,/^[\da-f-]{36}$/);assert.doesNotMatch(JSON.stringify(result),/postgres|secret|stack/);
 assert.equal(failure(new HttpError(409,'Registro alterado.')).status,409);
});
test('identity input validates email and password boundaries',()=>{
 assert.equal(email(' Pessoa@Example.com '),'pessoa@example.com');
 for(const v of ['x','x@','x x@a.com'])assert.throws(()=>email(v));
 for(const v of ['', 'x'.repeat(11),'x'.repeat(129),42])assert.throws(()=>password(v));
 assert.equal(password('x'.repeat(12)).length,12);
});
