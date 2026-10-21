import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseDemand,demandDate} from '../src/lib/demand-input';
const valid={title:'Reparo na praça',description:'Encaminhamento administrativo',category:'Infraestrutura',status:'em_andamento',priority:'normal',assignedTo:'advisor-id',communityId:'',dueDate:'',resolution:''};
test('demands accept documented categories and priorities, reject extra fields and invalid links',()=>{
 assert.equal(parseDemand(valid).communityId,null);assert.equal(parseDemand(valid).version,1);
 for(const input of [{...valid,title:' '},{...valid,title:'x'.repeat(181)},{...valid,category:'__proto__'},{...valid,priority:'constructor'},{...valid,communityId:'not-a-uuid'},{...valid,politicalPreference:'blocked'}])assert.throws(()=>parseDemand(input));
});
test('demand deadlines reject invalid dates without timezone shifts',()=>{
 assert.equal(demandDate('2028-02-29'),'2028-02-29');assert.equal(demandDate(''),null);
 for(const value of ['2027-02-29','2028-04-31','2028-1-01','2101-01-01',true])assert.throws(()=>demandDate(value));
});
test('closing demands requires a resolution, editing requires a version, creation cannot bypass lifecycle',()=>{
 assert.throws(()=>parseDemand({...valid,status:'concluida',resolution:'Resolvida'}));
 assert.throws(()=>parseDemand({...valid,version:1,status:'cancelada'},true));
 assert.throws(()=>parseDemand(valid,true));
 assert.equal(parseDemand({...valid,version:2,status:'concluida',resolution:'Reparo realizado'},true).resolution,'Reparo realizado');
 assert.equal(parseDemand({...valid,version:2,status:'aguardando_retorno',resolution:'Discarded'},true).resolution,null);
});
