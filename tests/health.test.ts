import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assertHealthAccess,assertHealthPolicy,assertLegalBasis,assertAdministrativeTransition,retentionDeadline,newHealthProtocol,type HealthPrincipal,type HealthPolicy} from '../modules/health/policy';
import {validateDocument,uploadPrivateDocument,readPrivateDocument,type PrivateBucket} from '../modules/health/private-documents';
import {executeErasure} from '../modules/health/retention';
const actor:HealthPrincipal={subjectId:'health-test-subject',role:'atendente_saude',active:true,authenticated:true};
const record={assignedTo:actor.subjectId,restricted:false,expiresAt:'2099-01-01T00:00:00Z'};
const policy:HealthPolicy={version:'test-only',approvedAt:'2026-01-01T00:00:00Z',approvedBy:'privacy-test',retentionDays:30,auditRetentionDays:60,backupRetentionDays:15};
test('health grants no automatic access to general roles and enforces assignment, restriction and expiry',()=>{
 for(const role of ['administrador_geral','coordenador','assessor','analista','constructor',''])assert.throws(()=>assertHealthAccess({...actor,role},'document.read',record));
 assert.doesNotThrow(()=>assertHealthAccess(actor,'request.read',record));
 assert.throws(()=>assertHealthAccess(actor,'request.read',{...record,assignedTo:'other'}));
 assert.throws(()=>assertHealthAccess(actor,'document.read',{...record,restricted:true}));
 assert.throws(()=>assertHealthAccess(actor,'request.read',{...record,expiresAt:'2020-01-01'}));
 assert.throws(()=>assertHealthAccess({...actor,active:false},'request.read',record));
 assert.throws(()=>assertHealthAccess({...actor,role:'encarregado_privacidade_saude'},'document.read',record));
});
test('health requires approved retention and an explicit valid basis without presumed consent',()=>{
 assert.throws(()=>assertHealthPolicy(undefined));assert.throws(()=>assertHealthPolicy({...policy,retentionDays:0}));
 assert.equal(retentionDeadline(new Date('2026-01-01T00:00:00Z'),policy).toISOString(),'2026-01-31T00:00:00.000Z');
 const basis={kind:'consentimento' as const,purpose:'Teste isolado',reference:'Evidência fictícia',noticeVersion:'v1',recordedAt:'2026-01-01T00:00:00Z',approvedBy:'test',consented:false,revokedAt:null};
 assert.throws(()=>assertLegalBasis(basis));assert.doesNotThrow(()=>assertLegalBasis({...basis,consented:true}));assert.throws(()=>assertLegalBasis({...basis,consented:true,revokedAt:'2026-01-02'}));
 assert.throws(()=>assertLegalBasis({...basis,kind:'outra_base_aprovada',reference:''}));
});
test('health protocols contain no personal identifier and statuses cannot alter official queues',()=>{
 assert.match(newHealthProtocol(new Date('2026-01-01')),/^SAU-2026-[A-F0-9]{32}$/);
 assert.notEqual(newHealthProtocol(),newHealthProtocol());
 assert.doesNotThrow(()=>assertAdministrativeTransition('recebida','documentacao_pendente'));
 for(const status of ['prioridade_clinica','agendamento_oficial','fila_oficial'])assert.throws(()=>assertAdministrativeTransition('recebida',status));
 assert.throws(()=>assertAdministrativeTransition('encerrada','encaminhada'));
});
test('private documents stay quarantined and logging failures prevent download',async()=>{
 let reads=0;const bucket:PrivateBucket={put:async()=>{},get:async()=>{reads++;return {body:new ReadableStream()};},delete:async()=>{}};
 const bytes=new TextEncoder().encode('%PDF-test-only');
 assert.throws(()=>validateDocument(bytes,'image/png'));assert.throws(()=>validateDocument(new Uint8Array(8*1024*1024+1),'application/pdf'));
 const doc=await uploadPrivateDocument(bucket,actor,record,'test-request',bytes,'application/pdf',async()=>{});assert.equal(doc.scanStatus,'quarentena');assert.match(doc.objectKey,/^quarantine\/[a-f0-9-]{36}$/);
 await assert.rejects(readPrivateDocument(bucket,actor,record,doc,async()=>{}));assert.equal(reads,0);
 await assert.rejects(readPrivateDocument(bucket,actor,record,{...doc,scanStatus:'disponivel'},async()=>{throw Error('audit down');}));assert.equal(reads,0);
 const response=await readPrivateDocument(bucket,actor,record,{...doc,scanStatus:'disponivel'},async()=>{});assert.equal(reads,1);assert.equal(response.headers.get('cache-control'),'private, no-store');assert.match(response.headers.get('content-disposition')!,/attachment/);
});
test('retention restricts access first and never erases database references after object deletion failure',async()=>{
 const officer={...actor,role:'encarregado_privacidade_saude'},job={id:'job',requestId:'request',expiresAt:new Date('2026-01-01'),holdUntil:null};const events:string[]=[];
 const adapters={claimAndRestrict:async()=>{events.push('restrict');return {objectKeys:['private-key']};},deletePrivateObject:async()=>{events.push('delete-object');throw Error('storage unavailable');},eraseRowsAndComplete:async()=>{events.push('erase-db');},recordFailure:async()=>{events.push('retry');}};
 await assert.rejects(executeErasure(officer,policy,job,adapters,new Date('2026-02-01')));assert.deepEqual(events,['restrict','delete-object','retry']);
 events.length=0;await assert.rejects(executeErasure(officer,policy,{...job,holdUntil:new Date('2099-01-01')},adapters));assert.equal(events.length,0);
 assert.equal(await executeErasure(officer,policy,job,{...adapters,deletePrivateObject:async()=>{events.push('delete-object');}},new Date('2026-02-01')),true);assert.deepEqual(events,['restrict','delete-object','erase-db']);
});
