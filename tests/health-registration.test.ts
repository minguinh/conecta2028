import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registration,patientInput,sixYearDeadline,validCpf} from '../modules/health/registration';
import {seal,open,identifierHash} from '../modules/health/service/crypto';
import {sanitizePreview} from '../modules/health/service/documents';
import {PNG} from 'pngjs';
const patient={name:'Paciente fictício',phone:'',cpf:'',sus:'',identity:'',birthDate:'',identifierPurpose:''};
const input={patient,kind:'exame',details:{items:['Hemograma completo','Raio-X'],description:'',administrativeNote:''},basis:{kind:'consentimento',purpose:'Atendimento assistencial fictício',reference:'Evidência fictícia',consented:true}};
test('health registration requires explicit basis, rejects political links and unknown examinations',()=>{
 assert.equal(registration(input).details.items.length,2);
 for(const value of [{...input,basis:{...input.basis,consented:false}},{...input,contactId:'primary-id'},{...input,details:{...input.details,items:['qualquer procedimento']}},{...input,kind:'cirurgia'}])assert.throws(()=>registration(value));
 assert.throws(()=>patientInput({...patient,birthDate:'2025-02-30',identifierPurpose:'Fixture'}));
 assert.throws(()=>patientInput({...patient,birthDate:'2099-01-01',identifierPurpose:'Fixture'}));
 assert.throws(()=>patientInput({...patient,cpf:'11111111111',identifierPurpose:'Fixture'}));
 assert.equal(validCpf('52998224725'),true);
 assert.throws(()=>patientInput({...patient,cpf:'52998224725'}));
 assert.equal(sixYearDeadline(new Date('2026-10-22T12:00:00Z')).toISOString(),'2032-10-22T12:00:00.000Z');
});
test('health encryption authenticates the record context, rejects tampering and hides identifiers',async()=>{
 const key=Buffer.alloc(32,7).toString('base64'),bytes=new TextEncoder().encode('fixture private bytes');
 const value=await seal(key,bytes,'record/1');assert.notDeepEqual(value,bytes);
 assert.deepEqual(await open(key,value,'record/1'),bytes);
 await assert.rejects(open(key,value,'record/2'));value[value.length-1]^=1;await assert.rejects(open(key,value,'record/1'));
 assert.notEqual(await identifierHash(key,'12345'),'12345');assert.equal(await identifierHash(key,''),null);
});
test('visual previews are decoded and re-encoded; invalid or oversized PNGs fail closed',()=>{
 const png=new PNG({width:8,height:6});png.data.fill(255);const bytes=PNG.sync.write(png),result=PNG.sync.read(sanitizePreview(bytes));
 assert.equal(result.width,8);assert.equal(result.height,6);
 assert.throws(()=>sanitizePreview(Buffer.from('%PDF-1.7')));
 const oversized=Buffer.from(bytes);oversized.writeUInt32BE(50000,16);assert.throws(()=>sanitizePreview(oversized));
 const corrupt=Buffer.from(bytes);corrupt[corrupt.length-1]^=1;assert.throws(()=>sanitizePreview(corrupt));
});
